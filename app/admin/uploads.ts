import { mkdirSync } from 'node:fs'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

import type { Media } from '../data/content.ts'
import type { ContentStore } from '../data/store.ts'

/** Images (never SVG, which can carry script) and the resume PDF. */
const IMAGE_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

const PDF_TYPES: Record<string, string> = { 'application/pdf': 'pdf' }

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

function directory(env: NodeJS.ProcessEnv = process.env): string {
  let dir = env.UPLOAD_DIR ?? (env.NODE_ENV === 'test' ? join('tmp', 'test-uploads') : join('data', 'uploads'))
  mkdirSync(dir, { recursive: true })
  return dir
}

export type UploadResult = { ok: true; media: Media } | { ok: false; error: string }

export async function saveUpload(
  store: ContentStore,
  file: File,
  alt: string,
  kind: 'image' | 'pdf' = 'image',
): Promise<UploadResult> {
  let extension = (kind === 'pdf' ? PDF_TYPES : IMAGE_TYPES)[file.type]
  if (!extension) {
    return { ok: false, error: kind === 'pdf' ? 'The resume must be a PDF.' : 'The image must be a PNG, JPG, WebP or GIF.' }
  }
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: 'The file is larger than 5 MB.' }
  let bytes = Buffer.from(await file.arrayBuffer())
  if (kind === 'pdf' && bytes.subarray(0, 5).toString('latin1') !== '%PDF-') {
    return { ok: false, error: 'That file is not a real PDF.' }
  }

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
  await writeFile(join(directory(), media.key), bytes)
  await store.saveMedia(media)
  return { ok: true, media }
}

/** Removes an upload and its record, for a file that has been replaced. */
export async function deleteUpload(store: ContentStore, media: Media): Promise<void> {
  await store.deleteMedia(media.id)
  await rm(join(directory(), media.key), { force: true })
}

export async function readUpload(media: Media): Promise<Buffer | null> {
  try {
    return await readFile(join(directory(), media.key))
  } catch {
    return null
  }
}
