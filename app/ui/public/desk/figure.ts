export interface ParsedFigure {
  prefix: string
  number: number
  decimals: number
  suffix: string
}

/** "30+" as 30 with suffix "+", "1.5k" as 1.5 with suffix "k". Text with no number returns null. */
export function parseFigure(text: string): ParsedFigure | null {
  let match = /^(\D*?)(\d+(?:\.\d+)?)(.*)$/.exec(text.trim())
  if (!match) return null
  let [, prefix = '', digits = '', suffix = ''] = match
  let number = Number.parseFloat(digits)
  if (!Number.isFinite(number)) return null
  let decimals = digits.includes('.') ? (digits.split('.')[1] ?? '').length : 0
  return { prefix, number, decimals, suffix }
}

export function formatFigure(parsed: ParsedFigure, progress: number): string {
  let value = (parsed.number * progress).toFixed(parsed.decimals)
  return `${parsed.prefix}${value}${parsed.suffix}`
}
