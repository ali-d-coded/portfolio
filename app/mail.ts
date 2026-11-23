import { createTransport } from 'nodemailer'

import { clientKey } from './admin/auth.ts'

/**
 * Sending a visitor's message to the site owner.
 *
 * SMTP is configured from the environment: `SMTP_HOST`, `SMTP_PORT` (465 is TLS, anything else upgrades with
 * STARTTLS), `SMTP_USER` and `SMTP_PASS`. For Gmail use `smtp.gmail.com`, 465 and an app password. `MAIL_TO`
 * overrides where messages go (the site's email by default) and `MAIL_FROM` the sender (`SMTP_USER` by
 * default). `MAIL_DRY_RUN=1` prints messages to the server log instead of sending, for local work.
 */

export interface OutgoingMail {
  to: string
  from: string
  replyTo: string
  subject: string
  text: string
  /** The same message set in the site's dark theme; `text` stays as the plain fallback. */
  html?: string
}

export interface Mailer {
  /** Whether messages can be sent at all. */
  ready: boolean
  send(mail: OutgoingMail): Promise<void>
}

export function createMailer(env: NodeJS.ProcessEnv = process.env): Mailer {
  if (env.MAIL_DRY_RUN === '1') {
    return {
      ready: true,
      async send(mail) {
        console.log(`[mail dry run] to ${mail.to}, reply-to ${mail.replyTo}, subject "${mail.subject}"\n${mail.text}`)
      },
    }
  }

  let { SMTP_HOST: host, SMTP_USER: user, SMTP_PASS: pass } = env
  if (!host || !user || !pass) {
    return {
      ready: false,
      async send() {
        throw new Error('SMTP is not configured')
      },
    }
  }

  let port = Number.parseInt(env.SMTP_PORT ?? '465', 10)
  let transport = createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  })
  return {
    ready: true,
    async send(mail) {
      await transport.sendMail(mail)
    },
  }
}

let mailer: Mailer = createMailer()

/** Tests swap the mailer for one that records what would be sent. */
export function setMailer(next: Mailer): void {
  mailer = next
}

export function getMailer(): Mailer {
  return mailer
}

// --- The message ---------------------------------------------------------------------------------------

export const MAX_NAME = 80
export const MAX_MESSAGE = 5000
const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/
const CONTROL = /[\x00-\x1f\x7f]+/g

export interface Message {
  name: string
  email: string
  message: string
}

export type Checked = { ok: true; message: Message } | { ok: false; errors: Record<string, string> }

/** Header values never carry a line break, whatever was typed. (`\s` also covers the Unicode separators.) */
export function oneLine(value: string): string {
  return value.replace(CONTROL, ' ').replace(/\s+/g, ' ').trim()
}

export function checkMessage(input: unknown): Checked {
  let body = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {}
  let text = (key: string) => (typeof body[key] === 'string' ? (body[key] as string) : '')
  let errors: Record<string, string> = {}

  let name = oneLine(text('name'))
  let email = text('email').trim()
  let message = text('message').replace(/\r\n/g, '\n').trim()

  if (!name) errors.name = 'Please tell me your name.'
  else if (name.length > MAX_NAME) errors.name = 'That name is a little long.'
  if (!EMAIL.test(email) || email.length > 120) errors.email = 'That email does not look right.'
  if (message.length < 5) errors.message = 'Write a few words first.'
  else if (message.length > MAX_MESSAGE) errors.message = `Keep it under ${MAX_MESSAGE} characters.`

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, message: { name, email, message } }
}

export function buildMail(message: Message, to: string, env: NodeJS.ProcessEnv = process.env): OutgoingMail {
  let from = env.MAIL_FROM || env.SMTP_USER || to
  return {
    to,
    from: `"Portfolio" <${from.replace(/^.*</, '').replace(/>$/, '')}>`,
    // Replying goes straight to the visitor.
    replyTo: `"${message.name.replace(/"/g, '')}" <${message.email}>`,
    subject: `Portfolio message from ${message.name}`,
    text: `${message.message}\n\n--\n${message.name} <${message.email}>\nSent from the contact form on the portfolio.`,
    html: renderHtml(message),
  }
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// The site's dark theme (public/desk/desk.css), inline and table based because mail clients ignore the rest.
const MONO = `'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`
const SANS = `Geist,system-ui,-apple-system,'Segoe UI',Arial,sans-serif`

function renderHtml(message: Message): string {
  let name = escapeHtml(message.name)
  let email = escapeHtml(message.email)
  let body = escapeHtml(message.message).replace(/\n/g, '<br>')
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"></head>
<body style="margin:0;padding:0;background:#111113;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#111113" style="background:#111113;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;border:1px solid #2a2a30;border-radius:4px;background:#1c1c20;">
<tr><td style="padding:14px 20px;border-bottom:1px solid #2a2a30;font-family:${MONO};font-size:13px;color:#8b8b95;"><span style="color:#facc15;">&gt;</span> mail --from ${name.toLowerCase()}</td></tr>
<tr><td style="padding:24px 20px 8px;font-family:${MONO};font-size:20px;font-weight:600;color:#f4f4f6;letter-spacing:-0.02em;">New message from ${name}</td></tr>
<tr><td style="padding:0 20px 20px;font-family:${MONO};font-size:13px;color:#8b8b95;">Reply goes straight to <a href="mailto:${email}" style="color:#7dd3fc;text-decoration:none;">${email}</a></td></tr>
<tr><td style="padding:0 20px 24px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:#232328;border-left:3px solid #facc15;border-radius:2px;padding:16px 18px;font-family:${SANS};font-size:15px;line-height:1.6;color:#f4f4f6;">${body}</td></tr></table></td></tr>
<tr><td style="padding:0 20px 24px;"><a href="mailto:${email}?subject=${encodeURIComponent('Re: your message')}" style="display:inline-block;background:#facc15;color:#111113;font-family:${MONO};font-size:13px;font-weight:600;text-decoration:none;padding:10px 18px;border-radius:4px;">Reply to ${name}</a></td></tr>
<tr><td style="padding:14px 20px;border-top:1px solid #2a2a30;font-family:${MONO};font-size:12px;color:#8b8b95;">Sent from the contact form on aliafthab.me</td></tr>
</table></td></tr></table></body></html>`
}

// --- Slowing spam down -----------------------------------------------------------------------------------

const WINDOW_MS = 60 * 60 * 1000
const MAX_PER_WINDOW = 5
const sent = new Map<string, number[]>()

/** A client may send a handful of messages an hour. */
export function takeSlot(request: Request, now = Date.now()): boolean {
  let client = clientKey(request)
  let times = (sent.get(client) ?? []).filter((time) => now - time <= WINDOW_MS)
  if (times.length >= MAX_PER_WINDOW) {
    sent.set(client, times)
    return false
  }
  times.push(now)
  sent.set(client, times)
  if (sent.size > 5000) sent.delete(sent.keys().next().value!)
  return true
}

export function resetSlots(): void {
  sent.clear()
}
