import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * One owner, one password. `ADMIN_PASSWORD` (at least 12 characters) turns the admin on; without it every
 * admin URL answers 404. A login is a random token held in server memory, so signing out, restarting the
 * server or going idle ends it for good. The cookie carries only the token.
 */

export const MIN_PASSWORD_LENGTH = 12
const IDLE_MS = 2 * 60 * 60 * 1000
const LIFETIME_MS = 12 * 60 * 60 * 1000
const MAX_SESSIONS = 20

function password(env: NodeJS.ProcessEnv = process.env): string | null {
  let value = env.ADMIN_PASSWORD
  return value && value.length >= MIN_PASSWORD_LENGTH ? value : null
}

export function adminEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return password(env) !== null
}

/** Why the admin is off, for the server log. */
export function adminStatus(env: NodeJS.ProcessEnv = process.env): string {
  if (!env.ADMIN_PASSWORD) return 'disabled: set ADMIN_PASSWORD to turn it on'
  if (!password(env)) return `disabled: ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters`
  return 'enabled'
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

export function isSecure(request: Request): boolean {
  return new URL(request.url).protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https'
}

/** In production the admin is https only; a plain http request is sent to the https address. */
export function insecureInProduction(request: Request, env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === 'production' && request.headers.get('x-forwarded-proto') === 'http'
}

// --- Sessions ---------------------------------------------------------------------------------------

interface Session {
  created: number
  seen: number
}

const sessions = new Map<string, Session>()

function key(token: string): string {
  return createHash('sha256').update(token).digest('base64url')
}

/** `__Host-` pins the cookie to this exact host over https; on plain http (local work) it cannot be used. */
function cookieName(request: Request): string {
  return isSecure(request) ? '__Host-admin' : 'admin'
}

function cookieAttributes(request: Request): string {
  return `${isSecure(request) ? 'Path=/; Secure' : 'Path=/admin'}; HttpOnly; SameSite=Strict`
}

function expire(now: number): void {
  for (let [id, session] of sessions) {
    if (now - session.created > LIFETIME_MS || now - session.seen > IDLE_MS) sessions.delete(id)
  }
}

/** Starts a session with a fresh random token and returns the cookie that carries it. */
export function startSession(request: Request, now = Date.now()): string {
  expire(now)
  if (sessions.size >= MAX_SESSIONS) {
    let oldest = [...sessions.entries()].sort((a, b) => a[1].created - b[1].created)[0]
    if (oldest) sessions.delete(oldest[0])
  }
  let token = randomBytes(32).toString('base64url')
  sessions.set(key(token), { created: now, seen: now })
  return `${cookieName(request)}=${token}; ${cookieAttributes(request)}; Max-Age=${LIFETIME_MS / 1000}`
}

function tokenOf(request: Request): string | null {
  let header = request.headers.get('cookie') ?? ''
  let name = cookieName(request)
  let match = header.split(/;\s*/).find((part) => part.startsWith(`${name}=`))
  return match ? match.slice(name.length + 1) : null
}

export function isLoggedIn(request: Request, env: NodeJS.ProcessEnv = process.env, now = Date.now()): boolean {
  if (!adminEnabled(env)) return false
  let token = tokenOf(request)
  if (!token || token.length > 100) return false
  expire(now)
  let session = sessions.get(key(token))
  if (!session) return false
  session.seen = now
  return true
}

/** Ends the session on the server and clears the cookie. */
export function endSession(request: Request): string {
  let token = tokenOf(request)
  if (token) sessions.delete(key(token))
  return `${cookieName(request)}=; ${cookieAttributes(request)}; Max-Age=0`
}

export function endAllSessions(): void {
  sessions.clear()
}

// --- Cross-site requests ------------------------------------------------------------------------------

/**
 * A form post must come from this site: the browser's `Origin` has to match the host, and a browser that
 * reports `Sec-Fetch-Site` must say it is not cross-site. A post with neither header is refused too.
 */
export function sameOrigin(request: Request): boolean {
  let fetchSite = request.headers.get('sec-fetch-site')
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') return false
  let origin = request.headers.get('origin')
  if (!origin) return fetchSite === 'same-origin' || fetchSite === 'none'
  let host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? new URL(request.url).host
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

// --- Guessing the password ----------------------------------------------------------------------------

const WINDOW_MS = 15 * 60 * 1000
const MAX_FAILURES = 5
const failures = new Map<string, number[]>()

/**
 * The client as the host's proxy saw it: the last `X-Forwarded-For` entry is the one our own proxy added, so a
 * visitor cannot choose it. Without a proxy (local work) every request is the same client.
 */
export function clientKey(request: Request): string {
  let forwarded = request.headers.get('x-forwarded-for')
  if (!forwarded) return 'direct'
  return forwarded.split(',').at(-1)!.trim().slice(0, 64) || 'direct'
}

function recent(client: string, now: number): number[] {
  let list = (failures.get(client) ?? []).filter((time) => now - time <= WINDOW_MS)
  if (list.length > 0) failures.set(client, list)
  else failures.delete(client)
  return list
}

/** Too many wrong passwords from one client and its logins pause for a while. */
export function loginBlocked(request: Request, now = Date.now()): boolean {
  return recent(clientKey(request), now).length >= MAX_FAILURES
}

export function recordFailure(request: Request, now = Date.now()): void {
  let client = clientKey(request)
  let list = recent(client, now)
  list.push(now)
  failures.set(client, list)
  // The table never grows without bound, however many clients try.
  if (failures.size > 5000) failures.delete(failures.keys().next().value!)
}

export function clearFailures(): void {
  failures.clear()
}
