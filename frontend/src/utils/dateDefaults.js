/**
 * Dynamic date defaults — ZERO hardcoded dates in the entire codebase.
 *
 * Default range: last 30 days up to today (UK local date).
 * Every page imports this so there is a single source of truth.
 */

/** Format a Date as YYYY-MM-DD (the format <input type="date"> and our API expect). */
export function toISODate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Today's date as YYYY-MM-DD */
export function today() {
  return toISODate(new Date())
}

/** N days before today as YYYY-MM-DD */
export function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toISODate(d)
}

/**
 * Default "from" date — 30 days ago.
 * Called at component mount time so it is always current.
 */
export function defaultFrom() {
  return daysAgo(30)
}

/**
 * Default "to" date — today.
 * Called at component mount time so it is always current.
 */
export function defaultTo() {
  return today()
}
