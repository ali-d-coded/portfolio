// Real tool logos, fetched once with the taste kit's icons.mjs into public/assets/icons.
// Only tools with a square or near-square colour mark are listed: violet marks and wordmarks are left out.

export interface ToolIcon {
  file: string
  /** Black marks that need the kit's ic-ink class to turn white on a dark ground. */
  ink?: boolean
  shape?: 'land' | 'tall'
}

const ICONS: Array<[RegExp, ToolIcon]> = [
  [/^node\.?js\b/, { file: 'nodejs' }],
  [/^bun\b/, { file: 'bun' }],
  [/^typescript\b/, { file: 'typescript' }],
  [/^javascript\b/, { file: 'javascript' }],
  [/^mongodb\b/, { file: 'mongodb', shape: 'tall' }],
  [/^redis\b/, { file: 'redis' }],
  [/^postgres(ql)?\b/, { file: 'postgres' }],
  [/^mysql\b/, { file: 'mysql' }],
  [/^prisma\b/, { file: 'prisma', ink: true }],
  [/^react( native)?\b/, { file: 'react' }],
  [/^next\.?js\b/, { file: 'nextjs' }],
  [/^vue(\.js)?\b/, { file: 'vue' }],
  [/^nuxt(\.js)?\b/, { file: 'nuxt', shape: 'land' }],
  [/^tailwind\b/, { file: 'tailwindcss', shape: 'land' }],
  [/^laravel\b/, { file: 'laravel' }],
  [/^java$/, { file: 'java', shape: 'tall' }],
  [/^python\b/, { file: 'python' }],
  [/^rust\b/, { file: 'rust', ink: true }],
  [/^docker\b/, { file: 'docker', shape: 'land' }],
  [/^nginx\b/, { file: 'nginx' }],
  [/^aws\b/, { file: 'aws', shape: 'land' }],
  [/^fastify\b/, { file: 'fastify', shape: 'land', ink: true }],
  [/^nestjs\b/, { file: 'nestjs' }],
  [/^socket\.io\b/, { file: 'socket.io' }],
  [/^shopify\b/, { file: 'shopify' }],
  [/^whatsapp\b/, { file: 'whatsapp' }],
  [/^(linux \()?ubuntu\b/, { file: 'ubuntu' }],
  [/^prometheus\b/, { file: 'prometheus' }],
  [/^flutter\b/, { file: 'flutter' }],
  [/^expo\b/, { file: 'expo', ink: true }],
  [/^spring\b/, { file: 'spring' }],
  [/^claude\b/, { file: 'claude-code', shape: 'land' }],
  [/^chatgpt\b/, { file: 'openai', ink: true }],
  [/^github copilot\b/, { file: 'github-copilot', ink: true }],
  // Social accounts, as named on the contact page.
  [/^github$/, { file: 'github', ink: true }],
  [/^linkedin$/, { file: 'linkedin' }],
  [/^instagram$/, { file: 'instagram' }],
]

/** The icon for a tool named as the store writes it ("Node.js", "MongoDB (Mongoose)"), or null. */
export function toolIcon(name: string): ToolIcon | null {
  let key = name.trim().toLowerCase()
  for (let [pattern, icon] of ICONS) {
    if (pattern.test(key)) return icon
  }
  return null
}

/** The distinct icons for a list of tools, in order, at most `limit`. */
export function toolIcons(names: string[], limit = Infinity): Array<{ name: string; icon: ToolIcon }> {
  let seen = new Set<string>()
  let out: Array<{ name: string; icon: ToolIcon }> = []
  for (let name of names) {
    let icon = toolIcon(name)
    if (!icon || seen.has(icon.file)) continue
    seen.add(icon.file)
    out.push({ name, icon })
    if (out.length >= limit) break
  }
  return out
}

export function iconClass(icon: ToolIcon, size: number): string {
  return ['ic', `ic-${size}`, icon.shape ? `ic-${icon.shape}` : '', icon.ink ? 'ic-ink' : '']
    .filter(Boolean)
    .join(' ')
}

export function iconSrc(icon: ToolIcon): string {
  return `/assets/icons/${icon.file}.svg`
}
