import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import * as THREE from 'three';
import { buildGrid, characteristics, r, U_RANGE, V_RANGE } from '../math/surface';
import { type Vec3, add, cross, dot, normalize, scale, sub } from '../math/vec';

export type ColorMode = 'solid' | 'K' | 'H';

export interface SceneOptions {
  a: number;
  u0: number;
  v0: number;
  colorMode: ColorMode;
  wireframe: boolean;
  showVectors: boolean;
  normalizeVectors: boolean;
  showCoordLines: boolean;
  showOsculating: boolean;
  showTangentPlane: boolean;
}

export const COLORS = {
  ru: '#e8590c',
  rv: '#2f9e44',
  n: '#1c7ed6',
  point: '#d6336c',
  uLine: '#f08c00',
  vLine: '#37b24d',
};

const NEG = new THREE.Color('#2b6cd6');
const MID = new THREE.Color('#f2f2f2');
const POS = new THREE.Color('#d6452b');

function diverging(t: number, out: THREE.Color) {
  const c = Math.max(-1, Math.min(1, t));
  return c < 0 ? out.copy(MID).lerp(NEG, -c) : out.copy(MID).lerp(POS, c);
}

export function typicalScale(values: Float32Array) {
  const abs = Array.from(values, Math.abs).filter(Number.isFinite).sort((x, y) => x - y);
  return abs[Math.floor(abs.length / 2)] || 1;
}

const soft = (x: number, m: number) => x / (Math.abs(x) + m);

function SurfaceMesh({ a, colorMode, wireframe }: Pick<SceneOptions, 'a' | 'colorMode' | 'wireframe'>) {
  const NU = 96, NV = 64;
  const grid = useMemo(() => buildGrid(a, NU, NV), [a]);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(grid.positions, 3));
    g.setIndex(grid.indices);
    g.setAttribute('normal', new THREE.BufferAttribute(grid.normals, 3));
    const colors = new Float32Array(grid.positions.length);
    const tmp = new THREE.Color();
    const vals = colorMode === 'K' ? grid.Kvals : colorMode === 'H' ? grid.Hvals : null;
    const m = vals ? typicalScale(vals) : 1;
    for (let i = 0; i < grid.Kvals.length; i++) {
      if (vals) diverging(1.6 * soft(vals[i], m), tmp);
      else tmp.set('#c9cbc5');
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  }, [grid, colorMode]);

  const wireGeometry = useMemo(() => {
    const w = buildGrid(a, 48, 32);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(w.positions, 3));
    g.setIndex(w.indices);
    return g;
  }, [a]);

  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          vertexColors
          side={THREE.DoubleSide}
          roughness={0.65}
          metalness={0.05}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>
      {wireframe && (
        <mesh geometry={wireGeometry}>
          <meshBasicMaterial color="#0d0d0d" wireframe transparent opacity={0.55} />
        </mesh>
      )}
    </group>
  );
}

function Label({ position, text, sub, color, italic = true, size = 0.32 }: {
  position: Vec3; text: string; sub?: string; color: string; italic?: boolean; size?: number;
}) {
  const texture = useMemo(() => {
    const W = 256, H = 128;
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext('2d')!;
    const main = `${italic ? 'italic ' : ''}bold 84px 'Times New Roman', serif`;
    const small = `${italic ? 'italic ' : ''}bold 52px 'Times New Roman', serif`;
    ctx.font = main;
    const w1 = ctx.measureText(text).width;
    ctx.font = small;
    const w2 = sub ? ctx.measureText(sub).width : 0;
    const x0 = (W - w1 - w2) / 2;
    ctx.lineWidth = 10;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.fillStyle = color;
    ctx.textBaseline = 'alphabetic';
    ctx.font = main;
    ctx.strokeText(text, x0, 86);
    ctx.fillText(text, x0, 86);
    if (sub) {
      ctx.font = small;
      ctx.strokeText(sub, x0 + w1 + 2, 106);
      ctx.fillText(sub, x0 + w1 + 2, 106);
    }
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [text, sub, color, italic]);
  return (
    <sprite position={position} scale={[size * 2, size, 1]} renderOrder={10}>
      <spriteMaterial map={texture} depthTest={false} depthWrite={false} transparent />
    </sprite>
  );
}

function Arrow({ from, dir, color, label, sub }: { from: Vec3; dir: Vec3; color: string; label: string; sub?: string }) {
  const len = Math.hypot(...dir);
  const arrow = useMemo(() => {
    const d = new THREE.Vector3(...dir).normalize();
    const h = Math.min(0.25 * len, 0.18);
    const obj = new THREE.ArrowHelper(d, new THREE.Vector3(...from), len, color, h, h * 0.45);
    (obj.line.material as THREE.LineBasicMaterial).linewidth = 2;
    return obj;
  }, [from, dir, color, len]);
  const tip = add(from, scale(normalize(dir), len + 0.16));
  return (
    <group>
      <primitive object={arrow} />
      <Label position={tip} text={label} sub={sub} color={color} />
    </group>
  );
}

function CoordinateLines({ a, u0, v0 }: { a: number; u0: number; v0: number }) {
  const uLine = useMemo(() => {
    const pts: Vec3[] = [];
    for (let i = 0; i <= 200; i++) pts.push(r(a, U_RANGE[0] + ((U_RANGE[1] - U_RANGE[0]) * i) / 200, v0));
    return pts;
  }, [a, v0]);
  const vLine = useMemo(() => {
    const pts: Vec3[] = [];
    for (let i = 0; i <= 200; i++) pts.push(r(a, u0, V_RANGE[0] + ((V_RANGE[1] - V_RANGE[0]) * i) / 200));
    return pts;
  }, [a, u0]);
  return (
    <group>
      <Line points={uLine} color={COLORS.uLine} lineWidth={3} />
      <Line points={vLine} color={COLORS.vLine} lineWidth={3} />
    </group>
  );
}

function OsculatingCircle({ p, d1, d2, k, color }: { p: Vec3; d1: Vec3; d2: Vec3; k: number; color: string }) {
  const pts = useMemo(() => {
    if (!(k > 1e-6)) return null;
    const T = normalize(d1);
    const Nn = normalize(sub(d2, scale(T, dot(d2, T))));
    const R = 1 / k;
    const c = add(p, scale(Nn, R));
    const out: Vec3[] = [];
    for (let i = 0; i <= 160; i++) {
      const t = (2 * Math.PI * i) / 160;
      out.push(add(c, add(scale(Nn, -R * Math.cos(t)), scale(T, R * Math.sin(t)))));
    }
    return out;
  }, [p, d1, d2, k]);
  if (!pts) return null;
  return <Line points={pts} color={color} lineWidth={1.5} dashed dashSize={0.08} gapSize={0.05} />;
}

function TangentPlane({ p, ru, rv }: { p: Vec3; ru: Vec3; rv: Vec3 }) {
  const geometry = useMemo(() => {
    const e1 = normalize(ru);
    const e2 = normalize(cross(cross(ru, rv), ru));
    const s = 0.7;
    const corners = [
      add(p, add(scale(e1, -s), scale(e2, -s))),
      add(p, add(scale(e1, s), scale(e2, -s))),
      add(p, add(scale(e1, s), scale(e2, s))),
      add(p, add(scale(e1, -s), scale(e2, s))),
    ];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(corners.flat()), 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    return g;
  }, [p, ru, rv]);
  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial color="#1c7ed6" transparent opacity={0.16} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

function Axes({ size }: { size: number }) {
  const axes: { to: Vec3; label: string }[] = [
    { to: [size, 0, 0], label: 'X' },
    { to: [0, size, 0], label: 'Y' },
    { to: [0, 0, size], label: 'Z' },
  ];
  return (
    <group>
      {axes.map(({ to, label }) => (
        <group key={label}>
          <Line points={[scale(to, -1), to]} color="#111111" lineWidth={1.4} />
          <Label position={scale(to, 1.07)} text={label} color="#111111" italic={false} size={0.28} />
        </group>
      ))}
    </group>
  );
}

export function SurfaceScene(o: SceneOptions) {
  const c = useMemo(() => characteristics(o.a, o.u0, o.v0), [o.a, o.u0, o.v0]);
  const vecScale = o.normalizeVectors ? 0.9 : 0.5;
  const show = (v: Vec3) => (o.normalizeVectors ? scale(normalize(v), vecScale) : scale(v, vecScale));

  return (
    <Canvas
      flat
      gl={{ antialias: true }}
      camera={{ position: [8.6, 3.0, 4.2], up: [0, 0, 1], fov: 38 }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#e9ece5']} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[8, 4, 6]} intensity={0.9} />
      <directionalLight position={[5, -4, 6]} intensity={0.35} />
      <directionalLight position={[-5, 4, -3]} intensity={0.45} />
      <group scale={1 / Math.max(o.a, 0.001)}>
          <SurfaceMesh a={o.a} colorMode={o.colorMode} wireframe={o.wireframe} />
          {o.showCoordLines && <CoordinateLines a={o.a} u0={o.u0} v0={o.v0} />}
          {o.showOsculating && !c.singular && (
            <>
              <OsculatingCircle p={c.r0} d1={c.ru} d2={c.ruu} k={c.kU} color={COLORS.uLine} />
              <OsculatingCircle p={c.r0} d1={c.rv} d2={c.rvv} k={c.kV} color={COLORS.vLine} />
            </>
          )}
      </group>
      <group>
        <mesh position={scale(c.r0, 1 / o.a)}>
          <sphereGeometry args={[0.055, 24, 24]} />
          <meshStandardMaterial color={COLORS.point} />
        </mesh>
        {o.showTangentPlane && !c.singular && <TangentPlane p={scale(c.r0, 1 / o.a)} ru={c.ru} rv={c.rv} />}
        {o.showVectors && !c.singular && (
          <>
            <Arrow from={scale(c.r0, 1 / o.a)} dir={show(scale(c.ru, 1 / o.a))} color={COLORS.ru} label="r" sub="u" />
            <Arrow from={scale(c.r0, 1 / o.a)} dir={show(scale(c.rv, 1 / o.a))} color={COLORS.rv} label="r" sub="v" />
            <Arrow from={scale(c.r0, 1 / o.a)} dir={scale(c.n, 0.9)} color={COLORS.n} label="n" />
          </>
        )}
      </group>
      <Axes size={2.6} />
      <OrbitControls makeDefault enableDamping />
    </Canvas>
  );
}
