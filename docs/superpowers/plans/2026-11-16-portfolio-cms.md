# Portfolio Site with Private CMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Remix 3 starter into Ali Afthab's animated portfolio, with every piece of public content editable through a private admin area.

**Architecture:** All content lives behind one `ContentStore` interface with a SQLite adapter. Public pages are server-rendered Remix components that read from the store and use the taste skill's kit for layout, type and colour. A browser-side motion layer (GSAP, Lenis) enhances the rendered HTML through `data-*` attributes. The admin is plain server-rendered forms behind a session login.

**Tech Stack:** Remix 3 (`remix` ^3.2.0), Node >= 24.3, TypeScript, SQLite via `remix/data-table/sqlite`, `remix/session`, `remix/auth`, GSAP 3 (ScrollTrigger, SplitText), Lenis, the taste skill kit.

**Spec:** `docs/superpowers/specs/2026-11-16-portfolio-cms-design.md`. Read it before any task.

## Global Constraints

- Remix 3 is not React. No hooks, no `@gsap/react`. Before using a Remix API, read `.agents/skills/remix/SKILL.md`, then find the guide or README through `node_modules/remix/INDEX.md`. Installed docs win over memory.
- Follow `AGENTS.md`: routes in `app/routes.ts`, wiring in `app/router.ts`, root actions in `app/actions/controller.tsx`, nested route maps in `app/actions/<route-key>/controller.tsx`, browser-reachable code only inside `public/` directories.
- The project is not a git repository. There are no commit steps. Every task ends with `npm test` and `npm run typecheck` both passing.
- Taste skill files: `C:\Users\ali\.claude\plugins\marketplaces\taste-skill\skills\taste-skill` (called `<taste>` below). Never edit its files.
- Only facts from the resume (`C:\Users\ali\Downloads\ALI_AFTHAB_Resume_2026.pdf`). No invented figures, customers, quotes or screenshots.
- The phone number never appears in code, seed data or pages.
- Server-rendered content is visible by default. Hidden-then-revealed states are set only by script.
- Under `prefers-reduced-motion: reduce`: native scrolling, no parallax, no text splitting, instant page transitions.
- Nothing tilts. No cards fading in one by one. No parallax on body text. No violet.
- Layout holds at 1440, 1024, 768 and 390 wide.
- `data/` (database and uploads) is never browser-reachable and is not served by `staticFiles`.

## Review Focus

1. A project saved with a slug that is empty, malformed or already used: the form comes back with a field error, never a 500. (Task 8)
2. A project or the site record pointing at media that was deleted: the page renders without that image and without a broken `<img>`. (Tasks 3, 9)
3. No projects, no skill groups or no experience in the store: every public page still renders as a finished page with that section absent. (Task 3)
4. Markup typed into an admin field, such as `<script>alert(1)</script>` in a text block: it appears on the public page as literal text. (Task 8)
5. Back or forward pressed while a page transition is running: the overlay always clears and scroll animations are rebuilt for the page that ends up showing. (Task 5)

---

### Task 1: Content model, store interface and SQLite adapter

**Files:**
- Create: `app/data/content.ts`, `app/data/store.ts`, `app/data/sqlite-store.ts`, `app/data/store-contract.ts`, `app/data/sqlite-store.test.ts`, `db/migrations/0001_create_content/up.sql`, `db/migrations/0001_create_content/down.sql`
- Modify: `server.ts` (open and migrate the store before listening)

**Interfaces:**
- Produces, in `app/data/content.ts`:

```ts
export interface Figure { value: string; label: string }
export type Block =
  | { type: 'heading'; text: string }
  | { type: 'text'; text: string }
  | { type: 'image'; mediaId: string }
  | { type: 'figures'; items: Figure[] }
export interface Education { degree: string; school: string; start: string; end: string | null }
export interface Site {
  name: string; role: string; heroHeadline: string; summary: string; about: string
  email: string; linkedinUrl: string; githubUrl: string
  resumeMediaId: string | null; education: Education[]
}
export interface Project {
  id: string; slug: string; title: string; tagline: string; stack: string[]; summary: string
  figures: Figure[]; blocks: Block[]; coverMediaId: string | null
  featured: boolean; published: boolean; position: number
}
export interface Experience {
  id: string; company: string; role: string; start: string; end: string | null // 'YYYY-MM'
  bullets: string[]; skills: string[]; position: number
}
export interface SkillGroup { id: string; name: string; items: string[]; position: number }
export interface Media {
  id: string; key: string; name: string; alt: string; contentType: string; size: number; createdAt: string
}
export interface ContentSnapshot {
  version: 1; site: Site | null; projects: Project[]; experience: Experience[]
  skillGroups: SkillGroup[]; media: Media[]
}
```

- Produces, in `app/data/store.ts`:

```ts
export class StoreNotEmptyError extends Error {}
export class SlugTakenError extends Error {}
export interface ContentStore {
  isEmpty(): Promise<boolean>
  getSite(): Promise<Site | null>
  saveSite(site: Site): Promise<void>
  listProjects(options?: { publishedOnly?: boolean }): Promise<Project[]>   // ordered by position
  getProject(id: string): Promise<Project | null>
  getProjectBySlug(slug: string): Promise<Project | null>
  saveProject(project: Project): Promise<void>      // upsert by id; throws SlugTakenError
  deleteProject(id: string): Promise<void>
  reorderProjects(ids: string[]): Promise<void>     // position = index in ids
  listExperience(): Promise<Experience[]>
  getExperience(id: string): Promise<Experience | null>
  saveExperience(entry: Experience): Promise<void>
  deleteExperience(id: string): Promise<void>
  reorderExperience(ids: string[]): Promise<void>
  listSkillGroups(): Promise<SkillGroup[]>
  getSkillGroup(id: string): Promise<SkillGroup | null>
  saveSkillGroup(group: SkillGroup): Promise<void>
  deleteSkillGroup(id: string): Promise<void>
  reorderSkillGroups(ids: string[]): Promise<void>
  listMedia(): Promise<Media[]>
  getMedia(id: string): Promise<Media | null>
  saveMedia(media: Media): Promise<void>
  deleteMedia(id: string): Promise<void>
  exportAll(): Promise<ContentSnapshot>
  importAll(snapshot: ContentSnapshot): Promise<void>   // throws StoreNotEmptyError
  close(): Promise<void>
}
export function createContentStore(env?: NodeJS.ProcessEnv): Promise<ContentStore>
export const store: ContentStore   // the app-wide instance
```

- `createContentStore` reads `CONTENT_STORE` (default `sqlite`) and `CONTENT_DB_FILE` (default `data/content.sqlite`; tests pass `:memory:`). Any other `CONTENT_STORE` value throws `Error('Unknown CONTENT_STORE: <value>')`.
- Produces, in `app/data/sqlite-store.ts`: `createSqliteContentStore(options: { filename: string }): Promise<ContentStore>`, which runs the migrations in `db/migrations/`.
- Produces, in `app/data/store-contract.ts`: `describeContentStore(name: string, create: () => Promise<ContentStore>): void`, a reusable suite any future adapter runs.

- [ ] **Step 1: Write the contract suite** in `store-contract.ts` using `remix/test` and `remix/assert`, with these tests:
  - `starts empty`: `isEmpty()` is `true`, `getSite()` is `null`, every list is `[]`.
  - `site round trip`: `saveSite(s)` then `getSite()` deep-equals `s`, including `education`.
  - `project round trip`: a project with all four block types and two figures deep-equals after save and `getProjectBySlug`.
  - `publishedOnly filters`: one published and one unpublished project; `listProjects({ publishedOnly: true })` has length 1.
  - `slug is unique`: saving a second project with the same slug rejects with `SlugTakenError`; saving the same project again under its own slug resolves.
  - `reorder`: three projects saved as a, b, c; `reorderProjects([c, a, b])`; list order is c, a, b. Same for experience and skill groups.
  - `delete`: deleted records are gone from get and list.
  - `export then import`: fill store A, `exportAll()`, `importAll()` into empty store B, `B.exportAll()` deep-equals A's snapshot.
  - `import refuses a non-empty store`: rejects with `StoreNotEmptyError`.
- [ ] **Step 2:** In `sqlite-store.test.ts` call `describeContentStore('sqlite', () => createSqliteContentStore({ filename: ':memory:' }))`. Run `npm test`. Expected: FAIL, module not found.
- [ ] **Step 3:** Read `node_modules/remix/guides/08-data-and-validation.md` and the `data-table` and `data-table-sqlite` READMEs. Write the migration and `sqlite-store.ts`. Store arrays and nested objects as JSON text columns; keep `slug`, `position` and `published` as real columns. Schema details are yours.
- [ ] **Step 4:** Write `store.ts`. Call the store's migration and open from `server.ts` before `server.listen`, and `close()` on shutdown. Create `data/` if missing.
- [ ] **Step 5:** Run `npm test` and `npm run typecheck`. Expected: PASS.

### Task 2: Seed from the resume, and export and import commands

**Files:**
- Create: `app/data/seed.ts`, `app/data/seed.test.ts`, `scripts/content.ts`
- Modify: `server.ts` (seed when empty), `package.json` (scripts `content:export`, `content:import`)

**Interfaces:**
- Consumes: `ContentStore`, `ContentSnapshot` from Task 1.
- Produces: `seedSnapshot: ContentSnapshot` and `seedIfEmpty(store: ContentStore): Promise<boolean>` (returns whether it seeded).
- Produces: `npm run content:export -- <file.json>` and `npm run content:import -- <file.json>`. Both scripts use plain `cross-env`, never `cross-env-shell`.

Seed values, all from the resume:
- Site: name `Ali Afthab`; role `Full-Stack Engineer | Backend & Distributed Systems`; email `aliallu3xa@gmail.com`; LinkedIn `https://linkedin.com/in/ali-afthab`; GitHub `https://github.com/ali-d-coded`; `resumeMediaId: null`; education: BCA, Indira Gandhi National Open University (IGNOU), start `2024-06`, end `null`. `heroHeadline`, `summary` and `about` are written in Task 3 with the taste skill's copy rules; use the resume's summary paragraph until then.
- Projects: `eazycrm` (EazyCRM, Multi-Tenant WhatsApp Business CRM; stack Node.js, Bun, TypeScript, MongoDB, Redis; featured) and `restaurant-pos` (Restaurant POS Platform; stack Node.js, Laravel, PostgreSQL; featured). EazyCRM figures: `30+` client businesses. The POS has no figures and its `figures` is `[]`.
- Experience, four entries in resume order: Ginger Technologies (Full-Stack Engineer, `2025-06`, current), Brixton Corporate and Media (Software Development Engineer (Contract), `2025-02` to `2025-05`), ASHCORP Technologies LLP (Software Development Engineer, `2024-04` to `2025-02`), RootSys International (Software Development Engineer, `2022-01` to `2024-04`). Bullets copied from the resume. `skills` lists the technologies each entry's bullets name.
- Skill groups: the resume's nine, same names and items, same order.

- [ ] **Step 1: Write the failing tests** in `seed.test.ts`:
  - `seeds an empty store`: `seedIfEmpty` returns `true`; 2 projects, 4 experience entries, 9 skill groups; site email is `aliallu3xa@gmail.com`.
  - `never overwrites`: change the site name, call `seedIfEmpty` again; it returns `false` and the changed name is still there.
  - `no phone number`: `JSON.stringify(seedSnapshot)` does not match `/9072283042/`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Write `seed.ts`, call `seedIfEmpty(store)` from `server.ts` after migration, and write `scripts/content.ts` (`export` writes `exportAll()` as indented JSON; `import` reads and calls `importAll()`, printing a clear message on `StoreNotEmptyError` and exiting 1).
- [ ] **Step 4:** Run `npm test`, `npm run typecheck`, then `npm run content:export -- <scratch>/out.json` and confirm the file holds 2 projects. Expected: PASS.

### Task 3: Design system and public pages, without motion

**Files:**
- Create: `public/assets/**` (the taste kit, copied), `.taste-skill/**` (its working files), `app/ui/layout.tsx`, `app/ui/blocks.tsx`, `app/actions/work/controller.tsx`, `app/actions/work-page.tsx`, `app/actions/work/project-page.tsx`, `app/actions/about-page.tsx`, `app/actions/contact-page.tsx`, `app/actions/not-found-page.tsx`, `docs/superpowers/plans/copy.md`
- Modify: `app/routes.ts`, `app/router.ts`, `app/actions/controller.tsx`, `app/actions/document.tsx`, `app/actions/home-page.tsx` (replace the starter page), `app/actions/controller.test.ts`
- Delete: `app/actions/public/prompt-button.tsx`

**Interfaces:**
- Consumes: `store` from Task 1.
- Produces, in `app/routes.ts`:

```ts
export const routes = route({
  assets: get('/assets/*path'),
  home: '/',
  work: { index: '/work', show: '/work/:slug' },
  about: '/about',
  contact: '/contact',
  media: get('/media/:id'),
})
```

- Produces: `Layout` in `app/ui/layout.tsx` (nav, `<main>`, footer; props `title`, `description`, `pageType`), used by every public page. `Blocks` in `app/ui/blocks.tsx` renders a `Block[]` as text nodes only.
- Produces the motion hooks later tasks rely on, as attributes on the rendered HTML: `data-split` on headlines, `data-parallax="<speed>"` on visuals, `data-magnetic` on primary buttons, `data-cursor="link|view"` on links and project rows, `data-pipeline`, `data-skills`, `data-project-list`, `data-timeline` on the four interactive components' root elements. They do nothing until Tasks 4 to 6.

- [ ] **Step 1:** Read `<taste>/SKILL.md` and, in full, `references/copy.md`, `copy-voice.md`, `system.md`, `layout-v4.md`, `sections.md`, `motion.md`, `gate.md`. Kind is `software`.
- [ ] **Step 2:** Follow the skill's run steps 1 to 4: arm the gate against the dev server URL (`npm run dev`, port 44100), write all copy to `docs/superpowers/plans/copy.md` and lint it, plan each page as screens, run the deal commands. Record the dealt palette, pairing, hero and moments at the top of `copy.md`. Update the seed's `heroHeadline`, `summary` and `about` with the linted copy.
- [ ] **Step 3: Write the failing router tests** in `controller.test.ts`, each seeding a `:memory:` store:
  - `GET /`, `/work`, `/work/eazycrm`, `/about`, `/contact` return 200 HTML; the home page contains `Ali Afthab`; `/work/eazycrm` contains `EazyCRM`.
  - `GET /work/nope` returns 404 HTML.
  - `an unpublished project is not public`: 404 on its page and absent from `/work`.
  - `empty store sections`: with projects, skill groups and experience all deleted, all five page types still return 200 and contain no empty `<ul></ul>` or section heading for the missing content. (Review Focus 3)
  - `missing media`: a project whose `coverMediaId` and image block point at an unknown id renders 200 with no `<img` for it. (Review Focus 2)
  - `no resume link until uploaded`: `/contact` has no download link while `resumeMediaId` is `null`.
  - `no phone`: no page body matches `/9072283042/`.
- [ ] **Step 4:** Run `npm test`. Expected: FAIL.
- [ ] **Step 5:** Copy the kit to `public/assets` and build the pages per the skill's step 5, as Remix components that render the starter's markup and classes. Home: hero, selected work, skills, experience timeline. Case-study sections are all optional and a short page must look finished. Contact: email, LinkedIn, GitHub. Set `<meta name="robots">` normally on public pages. `media` returns 404 until Task 9.
- [ ] **Step 6:** Run `npm test` and `npm run typecheck`. Expected: PASS. Open each page at 1440 and 390 and confirm it reads as finished with JavaScript disabled.

### Task 4: Motion core: smooth scroll, text reveals, parallax

**Files:**
- Create: `app/ui/public/motion/boot.ts`, `scroll.ts`, `text.ts`, `parallax.ts`, `env.ts`, `env.test.ts` (all under `app/ui/public/motion/`)
- Modify: `package.json` (add `gsap`, `lenis`), `app/assets.ts` (`allowPackages: ['remix', 'gsap', 'lenis']`), `app/actions/public/entry.ts` (call `startMotion()`)

**Interfaces:**
- Produces, in `env.ts`: `prefersReducedMotion(): boolean`, `hasFinePointer(): boolean`, `parseSpeed(value: string | null): number` (number in `[-1, 1]`, `0` for anything else).
- Produces, in `boot.ts`: `startMotion(): void`, called once, and `mountPage(root: ParentNode): () => void`, which sets up every per-page effect inside `root` and returns a teardown that kills its tweens, ScrollTriggers and split text. Later tasks register their effects by adding to the list `mountPage` runs.
- Each effect module exports `(root: ParentNode) => () => void`.

- [ ] **Step 1: Write the failing tests** in `env.test.ts`: `parseSpeed('0.3') === 0.3`, `parseSpeed('-0.5') === -0.5`, `parseSpeed('2') === 0`, `parseSpeed('x') === 0`, `parseSpeed(null) === 0`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Run `npm i gsap lenis`. Read `guides/11-files-and-assets.md` (npm packages in browser code) and confirm both packages load as ES modules through `/assets/npm`.
- [ ] **Step 4:** Implement. `scroll.ts`: Lenis on fine pointers only, driven by `gsap.ticker`, with `ScrollTrigger.update` on its scroll event. `text.ts`: `SplitText` on `[data-split]` into lines and words, revealed once on entry; wait for `document.fonts.ready` first. `parallax.ts`: a scrubbed `y` shift on `[data-parallax]`, never on elements holding body text. When `prefersReducedMotion()` is true, `mountPage` mounts nothing and returns a no-op.
- [ ] **Step 5:** Run `npm test` and `npm run typecheck`. Expected: PASS. In a browser: scrolling is smoothed, headlines reveal, visuals shift; with reduced motion emulated, none of that happens and all text is visible.

### Task 5: Custom cursor, magnetic buttons and page transitions

**Files:**
- Create: `app/ui/public/motion/cursor.ts`, `magnetic.ts`, `transitions.ts`, `transition-state.ts`, `transition-state.test.ts`
- Modify: `app/ui/public/motion/boot.ts`, `app/ui/layout.tsx` (overlay and cursor elements, both `aria-hidden`)

**Interfaces:**
- Consumes: `mountPage`, `prefersReducedMotion`, `hasFinePointer` from Task 4.
- Produces, in `transition-state.ts`, a pure state machine so the hard case is testable without a browser:

```ts
export type Phase = 'idle' | 'covering' | 'covered' | 'revealing'
export type Event = 'navigate' | 'covered' | 'loaded' | 'revealed' | 'abort'
export interface State { phase: Phase; pending: number }   // pending = navigations started and not finished
export function next(state: State, event: Event): State
```

- [ ] **Step 1: Write the failing tests** in `transition-state.test.ts`:
  - `a full navigation returns to idle`: `navigate, covered, loaded, revealed` ends `{ phase: 'idle', pending: 0 }`.
  - `a second navigation while covering does not restart the cover`: `navigate, navigate` stays `covering` with `pending: 2`.
  - `back pressed mid-reveal covers again`: `navigate, covered, loaded, navigate` ends `covering`.
  - `abort always ends idle`: from every phase, `abort` gives `{ phase: 'idle', pending: 0 }`. (Review Focus 5)
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3: Find the navigation hook.** Read `guides/05-interactivity.md` (Client navigation) and the `remix/component` README for a start and finish signal around a top-frame navigation. If Remix exposes none, use the browser Navigation API's `navigate`, `navigatesuccess` and `navigateerror` events. Write down which you used at the top of `transitions.ts`.
- [ ] **Step 4:** Implement. `transitions.ts`: drive the overlay from `next()`; on `covered` run the current page's teardown, on `loaded` call `mountPage` for the new content and reset scroll, on error or abort clear the overlay. `cursor.ts`: fine pointers only; follows with `gsap.quickTo`; grows over `[data-cursor="link"]`, shows a label over `[data-cursor="view"]`; the native cursor is hidden only while the custom one is active. `magnetic.ts`: `[data-magnetic]` elements pull toward the pointer within their own bounds and spring back.
- [ ] **Step 5:** Run `npm test` and `npm run typecheck`. Expected: PASS. In a browser: navigate Home to Work to a case study and back with the Back button, pressing Back once mid-transition; the overlay always clears and headlines on the final page reveal.

### Task 6: Interactive components

**Files:**
- Create: `app/ui/public/motion/pipeline.ts`, `skills.ts`, `project-list.ts`, `timeline.ts`, `app/ui/public/skills-match.ts`, `app/ui/public/skills-match.test.ts`
- Modify: `app/ui/public/motion/boot.ts`, the page components from Task 3 that render these four

**Interfaces:**
- Consumes: `mountPage` from Task 4; the `data-pipeline`, `data-skills`, `data-project-list`, `data-timeline` roots from Task 3.
- Produces, in `skills-match.ts`: `matches(groupItems: string[], tags: string[]): boolean`, true when any item equals any tag, ignoring case and surrounding space. Used on the server to mark each project and experience entry with `data-skill-groups="<id> <id>"`, and in the browser to highlight.

- [ ] **Step 1: Write the failing tests** in `skills-match.test.ts`: `matches(['Node.js', 'Bun'], ['bun '])` is `true`; `matches(['React'], ['Redis'])` is `false`; `matches([], ['x'])` is `false`; `matches(['Go (Golang)'], ['go (golang)'])` is `true`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement the four components. Each works as plain readable HTML first.
  - **Pipeline** (on the EazyCRM case study): seven stages in order, `Webhook`, `BullMQ queue`, `Worker`, `MongoDB`, `Redis Streams`, `Socket.IO`, `Inbox`. Clicking or focusing a stage, or pressing a `Send a message` button, runs a pulse along the line to the inbox. Stages are real buttons with visible labels.
  - **Skills panel**: picking a group highlights the projects and experience entries whose `data-skill-groups` holds it and dims the rest; picking it again clears.
  - **Project list**: a preview panel follows the cursor over each row, showing the cover image, or the stack list when there is none. Fine pointers only.
  - **Timeline**: a progress line and the current entry advance with scroll.
- [ ] **Step 4:** Run `npm test` and `npm run typecheck`. Expected: PASS. In a browser, operate each by mouse and by keyboard.

### Task 7: Login, sessions and the admin shell

**Files:**
- Create: `app/middleware/session.ts`, `app/middleware/admin.ts`, `app/config.ts`, `app/actions/admin/controller.tsx`, `app/actions/admin/login-page.tsx`, `app/actions/admin/admin-layout.tsx`, `app/actions/admin/overview-page.tsx`, `app/actions/admin/controller.test.ts`
- Modify: `app/routes.ts`, `app/router.ts`, `server.ts`

**Interfaces:**
- Produces, in `app/config.ts`: `readConfig(env): { adminPassword: string; sessionSecret: string }`. Reads `ADMIN_PASSWORD` and `SESSION_SECRET`. With `NODE_ENV=production` and either missing, it throws `Error('ADMIN_PASSWORD and SESSION_SECRET are required in production')`. Otherwise it falls back to `admin` and a fixed dev secret, and logs one warning.
- Produces, added to `routes`:

```ts
admin: {
  index: '/admin',
  login: { index: get('/admin/login'), action: post('/admin/login') },
  logout: post('/admin/logout'),
}
```

- Produces: `requireAdmin` middleware in `app/middleware/admin.ts`; redirects to `routes.admin.login.index.href()` when there is no admin session. Tasks 8 and 9 put every admin route behind it. Note from the Remix guide: protection on one controller does not flow into controllers mapped for nested route maps, so apply it to each.
- Produces: `signInAs(router): Promise<string>` test helper in `app/actions/admin/test-helpers.ts` (create it; the asset server already denies nothing here because it is outside `public/`), returning a `Cookie` header value for an authenticated admin.

- [ ] **Step 1: Write the failing tests** in `admin/controller.test.ts`:
  - `GET /admin without a session redirects to /admin/login` (status 302 or 303, `Location` ends `/admin/login`).
  - `wrong password`: `POST /admin/login` with `password=nope` returns the login page with an error and sets no session.
  - `right password`: redirects to `/admin`; following with the cookie returns 200.
  - `logout destroys the session`: after `POST /admin/logout`, `GET /admin` redirects again.
  - `throttle`: the sixth failed login from one address inside 15 minutes returns 429.
  - `cross-site post is refused`: a `POST /admin/logout` with a valid cookie and `Origin: https://evil.example` does not log out and returns 403.
  - `noindex`: the login page contains `<meta name="robots" content="noindex`.
  - `readConfig` throws in production without the two variables.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Read `guides/10-auth-sessions-security.md` and the READMEs for `remix/session`, `remix/middleware/session`, `remix/auth`, `remix/middleware/auth`, `remix/middleware/csrf` and `remix/middleware/cop`. Implement with those: cookie session (`httpOnly`, `sameSite: 'lax'`, `secure` in production), session id regenerated on login, destroyed on logout, constant-time password comparison, request-forgery protection on every non-GET admin request, an in-memory failed-login counter (5 per address per 15 minutes).
- [ ] **Step 4:** Call `readConfig` in `server.ts` before listening. Admin pages use plain styles of their own, not the taste kit, and no motion.
- [ ] **Step 5:** Run `npm test` and `npm run typecheck`. Expected: PASS.

### Task 8: Admin editing for site, skills, experience and projects

**Files:**
- Create: `app/actions/admin/site-page.tsx`, `skills-page.tsx`, `experience-page.tsx`, `projects-page.tsx`, `project-form.tsx`, `app/data/validate.ts`, `app/data/validate.test.ts`, `app/actions/admin/editing.test.ts`
- Modify: `app/routes.ts`, `app/actions/admin/controller.tsx`

**Interfaces:**
- Consumes: `store` (Task 1), `requireAdmin` and `signInAs` (Task 7).
- Produces, in `app/data/validate.ts`, one parser per content type that turns `FormData` into a value or field errors:

```ts
export type Parsed<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> }
export function parseSite(form: FormData, current: Site): Parsed<Site>
export function parseProject(form: FormData, id: string): Parsed<Project>
export function parseExperience(form: FormData, id: string): Parsed<Experience>
export function parseSkillGroup(form: FormData, id: string): Parsed<SkillGroup>
```

- Rules: slug matches `/^[a-z0-9]+(-[a-z0-9]+)*$/` and is at most 80 characters; titles and names are required and at most 120; list fields (stack, items, bullets, skills) are one entry per line with blank lines dropped; `start` and `end` match `YYYY-MM`; URLs must be `https:`; email must contain `@`.
- Produces routes under `admin` for `site`, `skills`, `experience` and `projects`: list, new, edit, save, delete and reorder for the three collections, and edit and save for site. Reorder is a form with an up and a down button per row. Exact route keys are yours; link to them only through `routes`.

- [ ] **Step 1: Write the failing tests.** In `validate.test.ts`:
  - `parseProject` rejects slugs `''`, `Has Space`, `-lead`, `UPPER` with `errors.slug` set, and accepts `eazy-crm-2`.
  - list fields split on lines and drop blanks; `http://x` is rejected as a URL; `2025-13` is rejected as a month.
  In `editing.test.ts`, signed in:
  - `create a project`: POST the form, then `/work/<slug>` returns 200.
  - `duplicate slug comes back as a field error`: status 200 or 422 with the form and the text of the slug error, never 500. (Review Focus 1)
  - `hide a project`: set unpublished; its public page is 404.
  - `reorder`: move the second project up; `/work` lists it first.
  - `delete` each content type; it is gone from the public page.
  - `markup is escaped`: save a text block `<script>alert(1)</script>`; the public page body contains `&lt;script&gt;` and no `<script>alert`. (Review Focus 4)
  - `edit site copy`: change the hero headline; `/` shows it.
  - every one of these routes redirects to login without a session.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Read `guides/09-forms-and-mutations.md`. Implement the parsers and the pages as native forms that work without JavaScript, returning the form with errors and the entered values on failure and redirecting after a successful save. The project form edits blocks as a repeatable list with add, remove, move up and move down, each a submit button.
- [ ] **Step 4:** Run `npm test` and `npm run typecheck`. Expected: PASS.

### Task 9: Media uploads and the resume download

**Files:**
- Create: `app/data/uploads.ts`, `app/data/uploads.test.ts`, `app/actions/admin/media-page.tsx`, `app/actions/admin/media.test.ts`
- Modify: `app/routes.ts`, `app/actions/admin/controller.tsx`, `app/actions/controller.tsx` (the `media` action), the project form and site page (pick a cover image, block image and resume file from uploaded media), `app/actions/contact-page.tsx`

**Interfaces:**
- Consumes: `store`, `requireAdmin`, `signInAs`.
- Produces, in `app/data/uploads.ts`:

```ts
export const LIMITS = { imageBytes: 5 * 1024 * 1024, pdfBytes: 10 * 1024 * 1024 }
export type Sniffed = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/avif' | 'application/pdf'
export function sniff(bytes: Uint8Array): Sniffed | null   // from magic bytes, never the file name or declared type
export function saveUpload(file: File, alt: string): Promise<Media>   // throws UploadRejectedError
export function openUpload(media: Media): Promise<File | null>
export class UploadRejectedError extends Error {}
```

- Files are stored with `remix/file-storage/fs` under `data/uploads`. SVG is rejected.

- [ ] **Step 1: Write the failing tests.** In `uploads.test.ts`: `sniff` returns the right type for PNG, JPEG, WebP and PDF headers, and `null` for an SVG string, an HTML string and an empty array. In `media.test.ts`, signed in:
  - a PNG upload appears in the media list and `GET /media/<id>` returns it with `Content-Type: image/png`.
  - a file named `a.png` containing HTML is rejected with a message, and nothing is stored.
  - an image over 5 MB is rejected.
  - `GET /media/unknown` is 404.
  - uploading without a session redirects to login.
  - after a PDF is set as the resume, `/contact` has a download link to it; after that media is deleted, the link is gone and `/contact` is still 200. (Review Focus 2)
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Read `guides/11-files-and-assets.md` from "Accept file uploads" to the end. Implement. The media screen states that uploaded files are public. Served media sets `X-Content-Type-Options: nosniff`, and PDFs are served with `Content-Disposition: attachment`.
- [ ] **Step 4:** Run `npm test` and `npm run typecheck`. Expected: PASS.

### Task 10: Whole-site verification and the taste gate

**Files:**
- Create: `.taste-skill/waivers.json` (at most five entries), `docs/superpowers/plans/verification-report.md`
- Modify: whatever the checks show is broken

- [ ] **Step 1:** Run `npm test`, `npm run typecheck` and `remix doctor`. Expected: all pass; review any doctor finding before acting on it.
- [ ] **Step 2:** With `npm run start` running, check in a real browser, for Home, Work, the EazyCRM case study, About and Contact: each animation runs; transitions work forward and back; the page is complete with JavaScript off; the page is complete and still with reduced motion on; the layout holds at 1440, 1024, 768 and 390; there is no sideways scroll at 320.
- [ ] **Step 3:** Run the taste skill's step 6 checks and its gate on each of the five page types. Fix every failure that is not caused by the spec's brief-driven list (scroll-linked motion, scroll reveals, pinning, custom motion scripts, a smooth-scroll library, pointer-following effects, real contact details). Three gate rounds at most per page.
- [ ] **Step 4:** Write `verification-report.md`: the `GATE:` line per page first, every open failure with the brief item that causes it, every waiver with its reason, what was checked, and what could not be checked. A finish of `GATE: OPEN` or `GATE: DONE` is acceptable only if every open failure is on the brief-driven list.
- [ ] **Step 5:** Confirm no file under `app/`, `public/` or `db/` contains `9072283042`.
