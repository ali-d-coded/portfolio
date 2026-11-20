const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/** "2025-06" as "June 2025". Anything else is returned as stored. */
export function formatMonth(value: string): string {
  let match = /^(\d{4})-(\d{2})$/.exec(value)
  if (!match) return value
  let month = MONTHS[Number(match[2]) - 1]
  return month ? `${month} ${match[1]}` : value
}

/** "June 2025 to now", "February 2025 to May 2025". */
export function formatSpan(start: string, end: string | null): string {
  return `${formatMonth(start)} to ${end ? formatMonth(end) : 'now'}`
}

/** The year of a stored "YYYY-MM" month. */
export function yearOf(value: string): string {
  return value.slice(0, 4)
}

/** The first word of a name: "Ali" from "Ali Afthab". */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name
}

/** "https://linkedin.com/in/ali-afthab" as "linkedin.com/in/ali-afthab". */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
}

/** "https://github.com/ali-d-coded" as "ali-d-coded": the last path segment of a profile URL. */
export function handleOf(url: string): string {
  let path = url.replace(/^https?:\/\/(www\.)?[^/]+\/?/, '').replace(/\/+$/, '')
  return path.split('/').pop() ?? path
}

/** The last two words of a headline, to set apart; null when the headline is too short to split. */
export function splitTail(text: string): { head: string; tail: string } | null {
  let words = text.trim().split(/\s+/)
  if (words.length < 4) return null
  return { head: words.slice(0, -2).join(' '), tail: words.slice(-2).join(' ') }
}
