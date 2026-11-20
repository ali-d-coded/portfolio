import type { Handle, RemixNode } from 'remix/component'

import { routes } from '../routes.ts'
import { KINDS, collections, type Field, type Kind, type Row, type Values } from './collections.ts'

interface ShellProps {
  title: string
  /** The nav item to mark as current. */
  active?: Kind | 'home' | 'site'
  flash?: string
  children?: RemixNode
}

export function AdminDocument(handle: Handle<{ title: string; children?: RemixNode }>) {
  return () => (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
        <title>{handle.props.title} · Admin</title>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="stylesheet" href="/admin/admin.css" />
      </head>
      <body>{handle.props.children}</body>
    </html>
  )
}

export function Shell(handle: Handle<ShellProps>) {
  return () => {
    let { title, active, flash, children } = handle.props
    let links: Array<{ id: ShellProps['active']; label: string; href: string }> = [
      { id: 'home', label: 'Overview', href: routes.admin.home.href() },
      { id: 'site', label: 'Site', href: routes.admin.site.href() },
      ...KINDS.map((kind) => ({
        id: kind,
        label: collections[kind].label,
        href: routes.admin.list.href({ kind }),
      })),
    ]
    return (
      <AdminDocument title={title}>
        <div class="shell">
          <aside class="side">
            <a class="side__brand" href={routes.admin.home.href()}>
              Content
            </a>
            <nav aria-label="Admin">
              {links.map((link) => (
                <a key={link.label} href={link.href} aria-current={link.id === active ? 'page' : undefined}>
                  {link.label}
                </a>
              ))}
            </nav>
            <div class="side__foot">
              <a href={routes.home.href()} target="_blank" rel="noopener">
                View the site
              </a>
              <form method="post" action={routes.admin.logout.href()}>
                <button type="submit" class="linkish">
                  Sign out
                </button>
              </form>
            </div>
          </aside>
          <main class="main">
            <h1>{title}</h1>
            {flash ? (
              <p class="flash" role="status">
                {flash}
              </p>
            ) : null}
            {children}
          </main>
        </div>
      </AdminDocument>
    )
  }
}

export function LoginPage(handle: Handle<{ error?: string }>) {
  return () => (
    <AdminDocument title="Sign in">
      <main class="login">
        <form method="post" action={routes.admin.login.action.href()} class="card">
          <h1>Sign in</h1>
          {handle.props.error ? (
            <p class="error" role="alert">
              {handle.props.error}
            </p>
          ) : null}
          <label for="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required autoFocus />
          <button type="submit" class="btn">
            Sign in
          </button>
        </form>
      </main>
    </AdminDocument>
  )
}

export function OverviewPage(
  handle: Handle<{ counts: Record<Kind, number>; drafts: number; persistent: boolean }>,
) {
  return () => {
    let { counts, drafts, persistent } = handle.props
    return (
      <Shell title="Overview" active="home">
        <div class="tiles">
          {KINDS.map((kind) => (
            <a key={kind} class="tile" href={routes.admin.list.href({ kind })}>
              <strong>{counts[kind]}</strong>
              <span>{collections[kind].label}</span>
            </a>
          ))}
        </div>
        {drafts > 0 ? <p class="note">{drafts} project{drafts === 1 ? ' is' : 's are'} unpublished and hidden from visitors.</p> : null}
        {!persistent ? (
          <p class="note note--warn">
            Content is kept in a file on this server. On hosting with a temporary disk (such as Render's free plan), changes are lost when the
            server restarts or redeploys. Download a backup after editing, or use a persistent disk.
          </p>
        ) : null}
        <p>
          <a class="btn btn--ghost" href={routes.admin.backup.href()} download>
            Download a backup
          </a>
        </p>
      </Shell>
    )
  }
}

export function ListPage(handle: Handle<{ kind: Kind; rows: Row[]; flash?: string }>) {
  return () => {
    let { kind, rows, flash } = handle.props
    let collection = collections[kind]
    return (
      <Shell title={collection.label} active={kind} flash={flash}>
        <p>
          <a class="btn" href={routes.admin.edit.href({ kind, id: 'new' })}>
            Add a {collection.singular}
          </a>
        </p>
        {rows.length === 0 ? (
          <p class="note">Nothing here yet.</p>
        ) : (
          <ul class="rows">
            {rows.map((row, index) => (
              <li key={row.id} class="row">
                <a class="row__main" href={routes.admin.edit.href({ kind, id: row.id })}>
                  <strong>{row.title}</strong>
                  {row.draft ? <em class="badge">Draft</em> : null}
                  <span>{row.detail}</span>
                </a>
                <div class="row__tools">
                  <Mover kind={kind} id={row.id} dir="up" disabled={index === 0} />
                  <Mover kind={kind} id={row.id} dir="down" disabled={index === rows.length - 1} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Shell>
    )
  }
}

function Mover(handle: Handle<{ kind: Kind; id: string; dir: 'up' | 'down'; disabled: boolean }>) {
  return () => {
    let { kind, id, dir, disabled } = handle.props
    return (
      <form method="post" action={routes.admin.move.href({ kind, id })}>
        <input type="hidden" name="dir" value={dir} />
        <button type="submit" class="icon" disabled={disabled} aria-label={dir === 'up' ? 'Move up' : 'Move down'}>
          {dir === 'up' ? '↑' : '↓'}
        </button>
      </form>
    )
  }
}

interface FormPageProps {
  title: string
  active: ShellProps['active']
  action: string
  fields: Field[]
  values: Values
  errors?: Record<string, string>
  backHref: string
  /** Present when editing an existing entry: where its delete form posts. */
  deleteAction?: string
  flash?: string
}

export function FormPage(handle: Handle<FormPageProps>) {
  return () => {
    let { title, active, action, fields, values, errors = {}, backHref, deleteAction, flash } = handle.props
    return (
      <Shell title={title} active={active} flash={flash}>
        {Object.keys(errors).length > 0 ? (
          <p class="error" role="alert">
            Some fields need attention.
          </p>
        ) : null}
        <form method="post" action={action} enctype="multipart/form-data" class="form">
          {fields.map((field) => (
            <FieldRow key={field.name} field={field} value={values[field.name] ?? ''} error={errors[field.name]} />
          ))}
          <div class="actions">
            <button type="submit" class="btn">
              Save
            </button>
            <a class="btn btn--ghost" href={backHref}>
              Back
            </a>
          </div>
        </form>
        {deleteAction ? (
          <details class="danger">
            <summary>Delete this</summary>
            <form method="post" action={deleteAction}>
              <p>This cannot be undone.</p>
              <button type="submit" class="btn btn--danger">
                Delete for good
              </button>
            </form>
          </details>
        ) : null}
      </Shell>
    )
  }
}

function FieldRow(handle: Handle<{ field: Field; value: string; error?: string }>) {
  return () => {
    let { field, value, error } = handle.props
    let id = `f-${field.name}`
    let describedBy = field.hint ? `${id}-hint` : undefined

    if (field.type === 'checkbox') {
      return (
        <div class="field field--check">
          <label for={id}>
            <input id={id} name={field.name} type="checkbox" checked={value === 'on'} /> {field.label}
          </label>
        </div>
      )
    }

    return (
      <div class={error ? 'field field--bad' : 'field'}>
        <label for={id}>{field.label}</label>
        {field.type === 'textarea' ? (
          <textarea id={id} name={field.name} rows={field.rows ?? 4} aria-describedby={describedBy} aria-invalid={error ? true : undefined} defaultValue={value} />
        ) : field.type === 'pdf' ? null : (
          <input
            id={id}
            name={field.name}
            type={(field.type === 'month' ? 'month' : field.type === 'url' ? 'url' : 'text') as 'text'}
            value={value}
            required={field.required}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
          />
        )}
        {field.type === 'image' ? (
          <div class="upload">
            {value ? <img src={value} alt="" class="upload__thumb" /> : null}
            <input name={`${field.name}Upload`} type="file" accept="image/png,image/jpeg,image/webp,image/gif" aria-label={`Upload ${field.label.toLowerCase()}`} />
          </div>
        ) : null}
        {field.type === 'pdf' ? (
          <div class="upload">
            {value ? (
              <a href={value} target="_blank" rel="noopener">
                View the current resume
              </a>
            ) : null}
            <input name={`${field.name}Upload`} type="file" accept="application/pdf" aria-label="Upload a resume" />
          </div>
        ) : null}
        {field.hint ? (
          <p class="hint" id={describedBy}>
            {field.hint}
          </p>
        ) : null}
        {error ? <p class="error">{error}</p> : null}
      </div>
    )
  }
}
