/**
 * Date range picker with Apply button.
 */
import { useState } from 'react'
import { Calendar } from 'lucide-react'

export default function DateRangePicker({ from, to, onApply }) {
  const [localFrom, setLocalFrom] = useState(from)
  const [localTo, setLocalTo] = useState(to)

  const handleApply = () => {
    if (localFrom && localTo && localFrom <= localTo) {
      onApply(localFrom, localTo)
    }
  }

  return (
    <div className="date-range-picker">
      <Calendar size={14} style={{ color: 'var(--clr-text-muted)' }} />
      <div className="date-input-group">
        <label htmlFor="date-from">From</label>
        <input
          id="date-from"
          type="date"
          className="date-input"
          value={localFrom}
          onChange={(e) => setLocalFrom(e.target.value)}
        />
      </div>
      <div className="date-input-group">
        <label htmlFor="date-to">To</label>
        <input
          id="date-to"
          type="date"
          className="date-input"
          value={localTo}
          min={localFrom || undefined}
          onChange={(e) => setLocalTo(e.target.value)}
        />
      </div>
      <button id="btn-apply-dates" className="btn btn-primary" onClick={handleApply}>
        Apply
      </button>
    </div>
  )
}
