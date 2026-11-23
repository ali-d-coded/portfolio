import * as assert from 'remix/assert'
import { afterEach, beforeEach, describe, it } from 'remix/test'

import { seedSnapshot } from './data/seed.ts'
import { resetStore } from './data/test-helpers.ts'
import { buildMail, createMailer, getMailer, resetSlots, setMailer, type Mailer, type OutgoingMail } from './mail.ts'
import { router } from './router.ts'

const original = getMailer()

function recorder(): Mailer & { sent: OutgoingMail[] } {
  let sent: OutgoingMail[] = []
  return {
    ready: true,
    sent,
    async send(mail) {
      sent.push(mail)
    },
  }
}

const good = { name: 'Ada Lovelace', email: 'ada@example.com', message: 'Hello, I would like to talk.', website: '', t: 5000 }

function send(body: unknown, headers: HeadersInit = { origin: 'http://localhost' }) {
  return router.fetch(
    new Request('http://localhost/api/mail', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    }),
  )
}

describe('mail body', () => {
  it('sets the message in the themed html and escapes what the visitor typed', () => {
    let mail = buildMail({ name: 'Eve <b>', email: 'eve@example.com', message: '<script>alert(1)</script>\nline two' }, 'ali@example.com')
    assert.ok(mail.html)
    assert.match(mail.html, /#111113/)
    assert.doesNotMatch(mail.html, /<script/)
    assert.match(mail.html, /&lt;script&gt;/)
    assert.match(mail.html, /line two/)
    assert.match(mail.text, /<script>alert\(1\)<\/script>/)
  })

  it('is sent as high priority', () => {
    let mail = buildMail({ name: 'Eve', email: 'eve@example.com', message: 'Hello there' }, 'ali@example.com')
    assert.equal(mail.priority, 'high')
  })
})

describe('contact form', () => {
  beforeEach(async () => {
    resetSlots()
    await resetStore(structuredClone(seedSnapshot))
  })
  afterEach(() => {
    setMailer(original)
  })

  it('mails the message to the site owner, with replies going to the visitor', async () => {
    let mailer = recorder()
    setMailer(mailer)
    let response = await send(good)
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { ok: true })
    assert.equal(mailer.sent.length, 1)
    let mail = mailer.sent[0]!
    assert.equal(mail.to, seedSnapshot.site!.email)
    assert.match(mail.replyTo, /ada@example\.com/)
    assert.match(mail.subject, /Ada Lovelace/)
    assert.match(mail.text, /Hello, I would like to talk\./)
  })

  it('keeps line breaks out of the headers', async () => {
    let mailer = recorder()
    setMailer(mailer)
    await send({ ...good, name: 'Eve\r\nBcc: victim@example.com' })
    let mail = mailer.sent[0]!
    assert.doesNotMatch(mail.subject, /[\r\n]/)
    assert.doesNotMatch(mail.replyTo, /[\r\n]/)
    assert.doesNotMatch(mail.subject + mail.replyTo, /Bcc:.*\n/)
  })

  it('explains what is wrong with a message', async () => {
    let mailer = recorder()
    setMailer(mailer)
    let response = await send({ ...good, name: '', email: 'nope', message: 'hi' })
    assert.equal(response.status, 400)
    let { errors } = (await response.json()) as { errors: Record<string, string> }
    assert.ok(errors.name && errors.email && errors.message)
    assert.equal(mailer.sent.length, 0)
    assert.equal((await send({ ...good, email: 'a@b.co?bcc=x@y.io' })).status, 400)
    assert.equal((await send({ ...good, message: 'x'.repeat(5001) })).status, 400)
  })

  it('quietly drops bots: a filled hidden field or an instant post', async () => {
    let mailer = recorder()
    setMailer(mailer)
    assert.equal((await send({ ...good, website: 'http://spam.example' })).status, 200)
    assert.equal((await send({ ...good, t: 100 })).status, 200)
    assert.equal(mailer.sent.length, 0)
  })

  it('refuses a post from another site or with no origin', async () => {
    setMailer(recorder())
    assert.equal((await send(good, { origin: 'https://evil.example' })).status, 403)
    assert.equal((await send(good, {})).status, 403)
  })

  it('limits how many messages one client can send', async () => {
    let mailer = recorder()
    setMailer(mailer)
    for (let count = 0; count < 5; count++) assert.equal((await send(good)).status, 200)
    assert.equal((await send(good)).status, 429)
    assert.equal(mailer.sent.length, 5)
    // Another client is unaffected.
    assert.equal((await send(good, { origin: 'http://localhost', 'x-forwarded-for': '203.0.113.7' })).status, 200)
  })

  it('says so when mail is not set up, and when sending fails', async () => {
    setMailer(createMailer({}))
    let unset = await send(good)
    assert.equal(unset.status, 503)
    assert.match(((await unset.json()) as { error: string }).error, /cannot be sent/)

    setMailer({
      ready: true,
      async send() {
        throw new Error('smtp down')
      },
    })
    assert.equal((await send(good)).status, 502)
  })

  it('does not accept a body that is not JSON', async () => {
    setMailer(recorder())
    let response = await router.fetch(
      new Request('http://localhost/api/mail', { method: 'POST', headers: { origin: 'http://localhost' }, body: 'not json' }),
    )
    assert.equal(response.status, 400)
  })

  it('every page offers the form and still links the plain email address', async () => {
    for (let path of ['/', '/about', '/contact', '/work']) {
      let html = await (await router.fetch(new Request(`http://localhost${path}`))).text()
      assert.match(html, /data-mailbox/, path)
      assert.match(html, /href="mailto:/, path)
    }
  })
})
