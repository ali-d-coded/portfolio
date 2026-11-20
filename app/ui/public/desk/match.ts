/** "Go (Golang) " as "go (golang)". */
function normalize(name: string): string {
  return name.trim().toLowerCase()
}

/** "mongodb (mongoose)" as "mongodb": the name before any bracket. */
function base(name: string): string {
  return normalize(name).replace(/\s*\(.*$/, '')
}

/**
 * True when the two tool lists share a tool. Names match ignoring case and surrounding space, and a name
 * with a bracket ("MongoDB (Mongoose)") also matches its plain name ("MongoDB").
 */
export function matches(left: string[], right: string[]): boolean {
  let keys = new Set<string>()
  for (let name of left) {
    keys.add(normalize(name))
    keys.add(base(name))
  }
  keys.delete('')
  return right.some((name) => keys.has(normalize(name)) || keys.has(base(name)))
}
