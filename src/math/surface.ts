import { type Vec3, cross, dot, norm, normalize, scale, sub, add } from './vec';

export const U_RANGE: [number, number] = [0, 2 * Math.PI];
export const V_RANGE: [number, number] = [-Math.PI / 2, Math.PI / 2];

export function r(a: number, u: number, v: number): Vec3 {
  const cu = Math.cos(u), su = Math.sin(u), cv = Math.cos(v), sv = Math.sin(v);
  return [a * cu * cv + a * sv ** 3, a * su * cv, 2 * a * sv];
}

export function rU(a: number, u: number, v: number): Vec3 {
  const cu = Math.cos(u), su = Math.sin(u), cv = Math.cos(v);
  return [-a * su * cv, a * cu * cv, 0];
}
export function rV(a: number, u: number, v: number): Vec3 {
  const cu = Math.cos(u), su = Math.sin(u), cv = Math.cos(v), sv = Math.sin(v);
  return [-a * cu * sv + 3 * a * sv * sv * cv, -a * su * sv, 2 * a * cv];
}

export function rUU(a: number, u: number, v: number): Vec3 {
  const cu = Math.cos(u), su = Math.sin(u), cv = Math.cos(v);
  return [-a * cu * cv, -a * su * cv, 0];
}
export function rUV(a: number, u: number, v: number): Vec3 {
  const cu = Math.cos(u), su = Math.sin(u), sv = Math.sin(v);
  return [a * su * sv, -a * cu * sv, 0];
}
export function rVV(a: number, u: number, v: number): Vec3 {
  const cu = Math.cos(u), su = Math.sin(u), cv = Math.cos(v), sv = Math.sin(v);
  return [
    -a * cu * cv + 3 * a * (2 * sv * cv * cv - sv ** 3),
    -a * su * cv,
    -2 * a * sv,
  ];
}

export interface Characteristics {
  a: number;
  u: number;
  v: number;
  r0: Vec3;
  ru: Vec3;
  rv: Vec3;
  ruu: Vec3;
  ruv: Vec3;
  rvv: Vec3;
  n: Vec3;
  E: number;
  F: number;
  G: number;
  L: number;
  M: number;
  N: number;
  kU: number;
  kV: number;
  knU: number;
  knV: number;
  K: number;
  H: number;
  k1: number;
  k2: number;
  angleUV: number;
  singular: boolean;
}

export function characteristics(a: number, u: number, v: number): Characteristics {
  const r0 = r(a, u, v);
  const ru = rU(a, u, v), rv = rV(a, u, v);
  const ruu = rUU(a, u, v), ruv = rUV(a, u, v), rvv = rVV(a, u, v);

  const E = dot(ru, ru), F = dot(ru, rv), G = dot(rv, rv);
  const nRaw = cross(ru, rv);
  const W = norm(nRaw);
  const singular = W < 1e-9;
  const n = normalize(nRaw);

  const L = dot(ruu, n), M = dot(ruv, n), N = dot(rvv, n);

  const kU = norm(cross(ru, ruu)) / norm(ru) ** 3;
  const kV = norm(cross(rv, rvv)) / norm(rv) ** 3;
  const knU = L / E;
  const knV = N / G;

  const det1 = E * G - F * F;
  const K = (L * N - M * M) / det1;
  const H = (E * N - 2 * F * M + G * L) / (2 * det1);
  const disc = Math.sqrt(Math.max(H * H - K, 0));
  const k1 = H + disc, k2 = H - disc;

  const angleUV = Math.acos(Math.max(-1, Math.min(1, F / Math.sqrt(E * G))));

  return { a, u, v, r0, ru, rv, ruu, ruv, rvv, n, E, F, G, L, M, N, kU, kV, knU, knV, K, H, k1, k2, angleUV, singular };
}

export function numericCheck(a: number, u: number, v: number, h = 1e-4) {
  const f = (uu: number, vv: number) => r(a, uu, vv);
  const ru = scale(sub(f(u + h, v), f(u - h, v)), 1 / (2 * h));
  const rv = scale(sub(f(u, v + h), f(u, v - h)), 1 / (2 * h));
  const c = scale(f(u, v), 2);
  const ruu = scale(sub(add(f(u + h, v), f(u - h, v)), c), 1 / (h * h));
  const rvv = scale(sub(add(f(u, v + h), f(u, v - h)), c), 1 / (h * h));
  const ruv = scale(
    sub(add(f(u + h, v + h), f(u - h, v - h)), add(f(u + h, v - h), f(u - h, v + h))),
    1 / (4 * h * h),
  );
  const n = normalize(cross(ru, rv));
  const E = dot(ru, ru), F = dot(ru, rv), G = dot(rv, rv);
  const L = dot(ruu, n), M = dot(ruv, n), N = dot(rvv, n);
  const det1 = E * G - F * F;
  return {
    K: (L * N - M * M) / det1,
    H: (E * N - 2 * F * M + G * L) / (2 * det1),
    knU: L / E,
    knV: N / G,
    kU: norm(cross(ru, ruu)) / norm(ru) ** 3,
    kV: norm(cross(rv, rvv)) / norm(rv) ** 3,
  };
}

export function buildGrid(a: number, nu: number, nv: number) {
  const positions = new Float32Array((nu + 1) * (nv + 1) * 3);
  const normals = new Float32Array((nu + 1) * (nv + 1) * 3);
  const Kvals = new Float32Array((nu + 1) * (nv + 1));
  const Hvals = new Float32Array((nu + 1) * (nv + 1));
  let p = 0, q = 0;
  const eps = 1e-3;
  for (let j = 0; j <= nv; j++) {
    const v = V_RANGE[0] + eps + ((V_RANGE[1] - V_RANGE[0] - 2 * eps) * j) / nv;
    for (let i = 0; i <= nu; i++) {
      const u = U_RANGE[0] + ((U_RANGE[1] - U_RANGE[0]) * i) / nu;
      const P = r(a, u, v);
      positions[p++] = P[0];
      positions[p++] = P[1];
      positions[p++] = P[2];
      const c = characteristics(a, u, v);
      normals[q * 3] = c.n[0];
      normals[q * 3 + 1] = c.n[1];
      normals[q * 3 + 2] = c.n[2];
      Kvals[q] = c.K;
      Hvals[q] = c.H;
      q++;
    }
  }
  const indices: number[] = [];
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a0 = j * (nu + 1) + i, a1 = a0 + 1, b0 = a0 + nu + 1, b1 = b0 + 1;
      indices.push(a0, a1, b0, a1, b1, b0);
    }
  }
  return { positions, normals, indices, Kvals, Hvals };
}
