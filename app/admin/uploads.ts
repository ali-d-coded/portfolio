import { mkdirSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

import type { Media } from '../data/content.ts'
import type { ContentStore } from '../data/store.ts'

/** Images only, and never SVG: an SVG can carry script. */
const TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

function directory(env: NodeJS.ProcessEnv = process.env): string {
  let dir = env.UPLOAD_DIR ?? (env.NODE_ENV === 'test' ? join('tmp', 'test-uploads') : join('data', 'uploads'))
  mkdirSync(dir, { recursive: true })
  return dir
}

export type UploadResult = { ok: true; media: Media } | { ok: false; error: string }

export async function saveUpload(store: ContentStore, file: File, alt: string): Promise<UploadResult> {
  let extension = TYPES[file.type]
  if (!extension) return { ok: false, error: 'The image must be a PNG, JPG, WebP or GIF.' }
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: 'The image is larger than 5 MB.' }

  let id = randomUUID()
  let media: Media = {
    id,
    key: `${id}.${extension}`,
    name: file.name.slice(0, 120),
    alt,
    contentType: file.type,
    size: file.size,
    createdAt: new Date().toISOString(),
  }
  await writeFile(join(directory(), media.key), Buffer.from(await file.arrayBuffer()))
  await store.saveMedia(media)
  return { ok: true, media }
}

export async function readUpload(media: Media): Promise<Buffer | null> {
  try {
    return await readFile(join(directory(), media.key))
  } catch {
    return null
  }
}
