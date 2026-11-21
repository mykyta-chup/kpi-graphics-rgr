import type { Characteristics } from '../math/surface';
import type { Vec3 } from '../math/vec';
import { Tex } from './Tex';
import { COLORS } from '../scene/SurfaceScene';

export const fmt = (x: number, d = 5) => {
  if (!Number.isFinite(x)) return '—';
  const v = Math.abs(x) < 5e-12 ? 0 : x;
  return v.toFixed(d);
};
const vec = (v: Vec3, d = 4) => `(${v.map((x) => fmt(x, d)).join('; ')})`;

interface Row {
  key: string;
  tex: string;
  value: string;
  color?: string;
  check?: number;
  ref?: number;
}

export function Results({ c, check }: { c: Characteristics; check: Record<string, number> }) {
  const rows: Row[] = [
    { key: 'r0', tex: '\\mathbf r_0', value: vec(c.r0) },
    { key: 'ru', tex: '\\mathbf r_u', value: vec(c.ru), color: COLORS.ru },
    { key: 'rv', tex: '\\mathbf r_v', value: vec(c.rv), color: COLORS.rv },
    { key: 'n', tex: '\\mathbf n', value: vec(c.n), color: COLORS.n },
    { key: 'kU', tex: 'k_u', value: fmt(c.kU), color: COLORS.uLine, ref: c.kU, check: check.kU },
    { key: 'kV', tex: 'k_v', value: fmt(c.kV), color: COLORS.vLine, ref: c.kV, check: check.kV },
    { key: 'knU', tex: 'k_{n,u}=L/E', value: fmt(c.knU), ref: c.knU, check: check.knU },
    { key: 'knV', tex: 'k_{n,v}=N/G', value: fmt(c.knV), ref: c.knV, check: check.knV },
    { key: 'K', tex: 'K', value: fmt(c.K), ref: c.K, check: check.K },
    { key: 'H', tex: 'H', value: fmt(c.H), ref: c.H, check: check.H },
  ];

  return (
    <div className="results">
      <table>
        <thead>
          <tr>
            <th>Величина</th>
            <th>Значення</th>
            <th title="Відносна похибка порівняно зі скінченними різницями">Δ (числ.)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td>
                {row.color && <i className="swatch" style={{ background: row.color }} />}
                <Tex>{row.tex}</Tex>
              </td>
              <td className="num">{c.singular && row.key !== 'r0' ? 'особлива точка' : row.value}</td>
              <td className="num muted">
                {row.ref !== undefined && row.check !== undefined && !c.singular
                  ? (Math.abs(row.ref - row.check) / Math.max(Math.abs(row.ref), 1e-9)).toExponential(1)
                  : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Квадратичні форми</h3>
      <div className="forms">
        <div>
          <Tex>{`E=${fmt(c.E, 4)}`}</Tex>
          <Tex>{`F=${fmt(c.F, 4)}`}</Tex>
          <Tex>{`G=${fmt(c.G, 4)}`}</Tex>
        </div>
        <div>
          <Tex>{`L=${fmt(c.L, 4)}`}</Tex>
          <Tex>{`M=${fmt(c.M, 4)}`}</Tex>
          <Tex>{`N=${fmt(c.N, 4)}`}</Tex>
        </div>
      </div>

    </div>
  );
}
