/**
 * Date range picker with Apply button.
 * - Syncs local state whenever parent `from`/`to` props change.
 * - Displays dates as DD-MM-YYYY while keeping the underlying value as YYYY-MM-DD
 *   (required by <input type="date">).
 */
import { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'

export default function DateRangePicker({ from, to, onApply }) {
  const [localFrom, setLocalFrom] = useState(from)
  const [localTo, setLocalTo] = useState(to)

  // Sync internal state whenever parent-controlled props change.
  // This is the critical fix: without this, clicking Apply and navigating away
  // then back would show stale dates.
  useEffect(() => {
    setLocalFrom(from)
  }, [from])

  useEffect(() => {
    setLocalTo(to)
  }, [to])

  const handleApply = () => {
    if (localFrom && localTo && localFrom <= localTo) {
      onApply(localFrom, localTo)
    }
  }

  // Format YYYY-MM-DD → DD-MM-YYYY for display only.
  const fmtDisplay = (iso) => {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    return `${d}-${m}-${y}`
  }

  return (
    <div className="date-range-picker">
      <Calendar size={14} style={{ color: 'var(--clr-text-muted)' }} />

      <div className="date-input-group">
        <label htmlFor="date-from">From</label>
        <div className="date-input-wrapper">
          <span className="date-display-text">{fmtDisplay(localFrom)}</span>
          <input
            id="date-from"
            type="date"
            className="date-input date-input-hidden"
            value={localFrom}
            max={localTo || undefined}
            onChange={(e) => setLocalFrom(e.target.value)}
            title="Select start date"
          />
          <Calendar size={12} className="date-cal-icon" />
        </div>
      </div>

      <div className="date-input-group">
        <label htmlFor="date-to">To</label>
        <div className="date-input-wrapper">
          <span className="date-display-text">{fmtDisplay(localTo)}</span>
          <input
            id="date-to"
            type="date"
            className="date-input date-input-hidden"
            value={localTo}
            min={localFrom || undefined}
            onChange={(e) => setLocalTo(e.target.value)}
            title="Select end date"
          />
          <Calendar size={12} className="date-cal-icon" />
        </div>
      </div>

      <button
        id="btn-apply-dates"
        className="btn btn-primary"
        onClick={handleApply}
        disabled={!localFrom || !localTo || localFrom > localTo}
      >
        Apply
      </button>
    </div>
  )
}
