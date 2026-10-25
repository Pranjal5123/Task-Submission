/**
 * Custom Recharts tooltip matching the dark design system.
 */
import { format, parseISO } from 'date-fns'

export default function ChartTooltip({ active, payload, label, unit = 'MW' }) {
  if (!active || !payload?.length) return null

  let displayLabel = label
  try {
    displayLabel = format(parseISO(label), 'dd MMM yyyy HH:mm')
  } catch {
    // label might already be formatted
  }

  return (
    <div className="custom-tooltip">
      <div className="tooltip-label">{displayLabel}</div>
      {payload.map((entry, i) => (
        <div className="tooltip-row" key={i}>
          <span className="tooltip-key">
            <span
              className="tooltip-dot"
              style={{ background: entry.color }}
            />
            {entry.name}
          </span>
          <span className="tooltip-val">
            {entry.value != null
              ? `${Number(entry.value).toLocaleString()} ${unit}`
              : '—'}
          </span>
        </div>
      ))}
    </div>
  )
}
