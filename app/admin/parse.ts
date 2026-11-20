import type { Block, Detail, Education, Figure, Gain, Screen, Stage } from '../data/content.ts'

/** Plain-text forms of the structured content, so every field in the admin is just text. */

export function parseLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

export function parseTags(text: string): string[] {
  return text
    .split(/[,\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
}

/** One figure per line: `30+ | client businesses`. */
export function parseFigures(text: string): Figure[] {
  let figures: Figure[] = []
  for (let line of parseLines(text)) {
    let [value = '', ...rest] = line.split('|')
    let label = rest.join('|').trim()
    if (value.trim() && label) figures.push({ value: value.trim(), label })
  }
  return figures
}

export function formatFigures(figures: Figure[]): string {
  return figures.map((figure) => `${figure.value} | ${figure.label}`).join('\n')
}

/**
 * Project body blocks:
 *   # A heading
 *   figures: 30+ | clients ; 3 | apps
 *   image: <media id>
 * and anything else is a paragraph, ending at a blank line.
 */
export function parseBlocks(text: string): Block[] {
  let blocks: Block[] = []
  let paragraph: string[] = []

  function flush() {
    if (paragraph.length > 0) blocks.push({ type: 'text', text: paragraph.join('\n') })
    paragraph = []
  }

  for (let raw of text.split(/\r?\n/)) {
    let line = raw.trim()
    if (line === '') {
      flush()
    } else if (line.startsWith('# ')) {
      flush()
      blocks.push({ type: 'heading', text: line.slice(2).trim() })
    } else if (/^figures:/i.test(line)) {
      flush()
      let items = parseFigures(line.replace(/^figures:/i, '').split(';').join('\n'))
      if (items.length > 0) blocks.push({ type: 'figures', items })
    } else if (/^image:/i.test(line)) {
      flush()
      let mediaId = line.replace(/^image:/i, '').trim()
      if (mediaId) blocks.push({ type: 'image', mediaId })
    } else {
      paragraph.push(line)
    }
  }
  flush()
  return blocks
}

export function formatBlocks(blocks: Block[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'heading':
          return `# ${block.text}`
        case 'text':
          return block.text
        case 'image':
          return `image: ${block.mediaId}`
        case 'figures':
          return `figures: ${block.items.map((item) => `${item.value} | ${item.label}`).join(' ; ')}`
      }
    })
    .join('\n\n')
}

/** One entry per line: `Degree | School | 2024-06 | 2027-06` (the end is optional). */
export function parseEducation(text: string): Education[] {
  let entries: Education[] = []
  for (let line of parseLines(text)) {
    let [degree = '', school = '', start = '', end = ''] = line.split('|').map((part) => part.trim())
    if (degree && school) entries.push({ degree, school, start, end: end || null })
  }
  return entries
}

export function formatEducation(entries: Education[]): string {
  return entries
    .map((entry) => [entry.degree, entry.school, entry.start, entry.end ?? ''].join(' | ').replace(/( \| )+$/, ''))
    .join('\n')
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Only web links and paths on this site: nothing like `javascript:` ends up in an href. */
export function isSafeUrl(value: string, options: { allowPath?: boolean } = {}): boolean {
  if (options.allowPath && value.startsWith('/') && !value.startsWith('//')) return true
  try {
    let url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/

export function isMonth(value: string): boolean {
  return MONTH.test(value)
}

/** One row per line: `Architecture | API Gateway + Tenant RBAC`. */
export function parseDetails(text: string): Detail[] {
  let rows: Detail[] = []
  for (let line of parseLines(text)) {
    let [label = '', ...rest] = line.split('|')
    let value = rest.join('|').trim()
    if (label.trim() && value) rows.push({ label: label.trim().replace(/:$/, ''), value })
  }
  return rows.slice(0, 6)
}

export function formatDetails(rows: Detail[]): string {
  return rows.map((row) => `${row.label} | ${row.value}`).join('\n')
}

/** One per line: `One inbox for the team | Customers write on WhatsApp and your team answers from one place.` */
export function parseGains(text: string): Gain[] {
  let gains: Gain[] = []
  for (let line of parseLines(text)) {
    let [title = '', ...rest] = line.split('|')
    let body = rest.join('|').trim()
    if (title.trim() && body) gains.push({ title: title.trim(), text: body })
  }
  return gains.slice(0, 6)
}

export function formatGains(gains: Gain[]): string {
  return gains.map((gain) => `${gain.title} | ${gain.text}`).join('\n')
}

/** One stop per line: `Name | Short line | Tool | What it means for the client`. */
export function parseStages(text: string): Stage[] {
  let stages: Stage[] = []
  for (let line of parseLines(text)) {
    let [name = '', short = '', tool = '', ...rest] = line.split('|').map((part) => part.trim())
    let benefit = rest.join(' | ').trim()
    if (name && benefit) stages.push({ name, line: short, tool, benefit })
  }
  return stages.slice(0, 10)
}

export function formatStages(stages: Stage[]): string {
  return stages.map((stage) => `${stage.name} | ${stage.line} | ${stage.tool} | ${stage.benefit}`).join('\n')
}

const DEVICES: Screen['device'][] = ['web', 'mobile', 'admin']

/** One screenshot per line: `mobile | The agent inbox | /media/<id>`. Only web links and paths on this site are kept. */
export function parseScreens(text: string): Screen[] {
  let screens: Screen[] = []
  for (let line of parseLines(text)) {
    let [device = '', label = '', ...rest] = line.split('|').map((part) => part.trim())
    let image = rest.join('|').trim()
    if ((DEVICES as string[]).includes(device) && image && isSafeUrl(image, { allowPath: true })) {
      screens.push({ device: device as Screen['device'], label, image })
    }
  }
  return screens.slice(0, 12)
}

export function formatScreens(screens: Screen[]): string {
  return screens.map((screen) => `${screen.device} | ${screen.label} | ${screen.image}`).join('\n')
}
