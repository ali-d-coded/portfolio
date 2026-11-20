import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * One owner, one password. `ADMIN_PASSWORD` turns the admin on; without it every admin URL answers 404.
 * A login is a signed, expiring cookie (`SESSION_SECRET` signs it, falling back to the password itself).
 */

const COOKIE = 'admin'
const LIFETIME_SECONDS = 60 * 60 * 12

function password(env: NodeJS.ProcessEnv = process.env): string | null {
  return env.ADMIN_PASSWORD ? env.ADMIN_PASSWORD : null
}

export function adminEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return password(env) !== null
}

function sign(payload: string, env: NodeJS.ProcessEnv): string {
  let key = env.SESSION_SECRET || password(env) || ''
  return createHmac('sha256', key).update(payload).digest('base64url')
}

function same(a: string, b: string): boolean {
  let left = Buffer.from(a)
  let right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

export function passwordMatches(candidate: string, env: NodeJS.ProcessEnv = process.env): boolean {
  let expected = password(env)
  if (expected === null) return false
  // Compare digests so the check takes the same time whatever the length of the guess.
  let digest = (value: string) => createHmac('sha256', 'admin-login').update(value).digest('base64url')
  return same(digest(candidate), digest(expected))
}

function secure(request: Request): boolean {
  return new URL(request.url).protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https'
}

export function loginCookie(request: Request, env: NodeJS.ProcessEnv = process.env, now = Date.now()): string {
  let expires = Math.floor(now / 1000) + LIFETIME_SECONDS
  let payload = String(expires)
  let value = `${payload}.${sign(payload, env)}`
  return `${COOKIE}=${value}; Path=/admin; HttpOnly; SameSite=Strict; Max-Age=${LIFETIME_SECONDS}${secure(request) ? '; Secure' : ''}`
}

export function logoutCookie(request: Request): string {
  return `${COOKIE}=; Path=/admin; HttpOnly; SameSite=Strict; Max-Age=0${secure(request) ? '; Secure' : ''}`
}

export function isLoggedIn(request: Request, env: NodeJS.ProcessEnv = process.env, now = Date.now()): boolean {
  if (!adminEnabled(env)) return false
  let header = request.headers.get('cookie') ?? ''
  let match = header.split(/;\s*/).find((part) => part.startsWith(`${COOKIE}=`))
  if (!match) return false
  let [payload = '', signature = ''] = match.slice(COOKIE.length + 1).split('.')
  if (!/^\d+$/.test(payload) || !same(signature, sign(payload, env))) return false
  return Number(payload) > Math.floor(now / 1000)
}

/** Browsers send `Origin` on form posts; a post from another site is refused. */
export function sameOrigin(request: Request): boolean {
  let origin = request.headers.get('origin')
  if (!origin) return true
  let host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? new URL(request.url).host
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

/** Too many wrong passwords in a row and logins pause for a while. */
const failures: number[] = []
const WINDOW_MS = 15 * 60 * 1000
const MAX_FAILURES = 10

export function loginBlocked(now = Date.now()): boolean {
  while (failures.length > 0 && now - failures[0]! > WINDOW_MS) failures.shift()
  return failures.length >= MAX_FAILURES
}

export function recordFailure(now = Date.now()): void {
  failures.push(now)
}

export function clearFailures(): void {
  failures.length = 0
}
