import { useMemo, useState } from 'react';
import { SurfaceScene, type ColorMode, COLORS } from './scene/SurfaceScene';
import { characteristics, numericCheck } from './math/surface';
import { Results, fmt } from './components/Results';
import { Tex } from './components/Tex';
import './App.css';

const DEG = Math.PI / 180;
const DEFAULTS = { a: 1, uDeg: 45, vDeg: 30 };

function Slider(props: {
  label: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <label className="slider">
      <span className="slider-label">{props.label}</span>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
      <input
        type="number"
        className="slider-num"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) props.onChange(Math.min(props.max, Math.max(props.min, v)));
        }}
      />
      {props.suffix && <span className="muted">{props.suffix}</span>}
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export default function App() {
  const [a, setA] = useState(DEFAULTS.a);
  const [uDeg, setUDeg] = useState(DEFAULTS.uDeg);
  const [vDeg, setVDeg] = useState(DEFAULTS.vDeg);
  const [colorMode, setColorMode] = useState<ColorMode>('solid');
  const [wireframe, setWireframe] = useState(true);
  const [showVectors, setShowVectors] = useState(true);
  const [normalizeVectors, setNormalizeVectors] = useState(true);
  const [showCoordLines, setShowCoordLines] = useState(true);
  const [showOsculating, setShowOsculating] = useState(false);
  const [showTangentPlane, setShowTangentPlane] = useState(false);

  const u0 = uDeg * DEG, v0 = vDeg * DEG;
  const c = useMemo(() => characteristics(a, u0, v0), [a, u0, v0]);
  const check = useMemo(() => numericCheck(a, u0, v0), [a, u0, v0]);

  return (
    <div className="layout">
      <aside className="panel">
        <section>
          <h2>Параметри</h2>
          <Slider label={<Tex>a</Tex>} value={a} min={0.2} max={3} step={0.1} onChange={setA} />
          <Slider label={<Tex>u_0</Tex>} value={uDeg} min={0} max={360} step={1} onChange={setUDeg} suffix="°" />
          <Slider label={<Tex>v_0</Tex>} value={vDeg} min={-90} max={90} step={1} onChange={setVDeg} suffix="°" />
          <p className="muted small">
            <Tex>{`u_0=${fmt(u0, 4)},\\ v_0=${fmt(v0, 4)}`}</Tex> рад
          </p>
          <div className="seg">
            <button
              onClick={() => {
                setA(DEFAULTS.a);
                setUDeg(DEFAULTS.uDeg);
                setVDeg(DEFAULTS.vDeg);
              }}
            >
              Скинути
            </button>
          </div>
        </section>

        <section>
          <h2>Відображення</h2>
          <div className="seg">
            {(['solid', 'K', 'H'] as ColorMode[]).map((m) => (
              <button key={m} className={colorMode === m ? 'active' : ''} onClick={() => setColorMode(m)}>
                {m === 'solid' ? 'Сіра' : m === 'K' ? 'Карта K' : 'Карта H'}
              </button>
            ))}
          </div>
          {colorMode !== 'solid' && (
            <div className="legend">
              <span>&lt; 0</span>
              <i />
              <span>&gt; 0</span>
            </div>
          )}
          <div className="toggles">
            <Toggle label="Каркасна сітка" checked={wireframe} onChange={setWireframe} />
            <Toggle label="Вектори rᵤ, rᵥ, n" checked={showVectors} onChange={setShowVectors} />
            <Toggle label="Нормувати rᵤ, rᵥ" checked={normalizeVectors} onChange={setNormalizeVectors} />
            <Toggle label="Координатні лінії u, v" checked={showCoordLines} onChange={setShowCoordLines} />
            <Toggle label="Стичні кола ліній u, v" checked={showOsculating} onChange={setShowOsculating} />
            <Toggle label="Дотична площина" checked={showTangentPlane} onChange={setShowTangentPlane} />
          </div>
        </section>

        <section>
          <h2>Результати</h2>
          <Results c={c} check={check} />
        </section>
      </aside>

      <main className="viewport">
        <SurfaceScene
          a={a}
          u0={u0}
          v0={v0}
          colorMode={colorMode}
          wireframe={wireframe}
          showVectors={showVectors}
          normalizeVectors={normalizeVectors}
          showCoordLines={showCoordLines}
          showOsculating={showOsculating}
          showTangentPlane={showTangentPlane}
        />
        <div className="overlay">
          <span><i className="swatch" style={{ background: COLORS.ru }} />rᵤ</span>
          <span><i className="swatch" style={{ background: COLORS.rv }} />rᵥ</span>
          <span><i className="swatch" style={{ background: COLORS.n }} />n</span>
          <span><i className="swatch" style={{ background: COLORS.uLine }} />лінія u (v = v₀)</span>
          <span><i className="swatch" style={{ background: COLORS.vLine }} />лінія v (u = u₀)</span>
        </div>
      </main>
    </div>
  );
}
