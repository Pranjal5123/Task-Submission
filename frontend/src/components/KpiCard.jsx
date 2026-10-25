/**
 * KPI Card component — displays a single metric with label, value, unit and optional sub-text.
 */
export default function KpiCard({ label, value, unit, sub, accentColor, icon }) {
  return (
    <div
      className="kpi-card"
      style={{ '--accent-gradient': accentColor }}
    >
      <div className="kpi-label">{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span className="kpi-value">
          {value != null ? (typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : value) : '—'}
        </span>
        {unit && <span className="kpi-unit">{unit}</span>}
      </div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}
