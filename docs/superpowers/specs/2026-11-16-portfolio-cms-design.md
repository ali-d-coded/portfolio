# Portfolio site with a private CMS: design

Date: 2026-11-16
Project: `C:\MyFiles\Works\MyWorks\ali-d-coded` (Remix 3 starter, not a git repository)

## Intent

Turn the Remix starter into Ali Afthab's personal portfolio. Its job is to show a worldwide
audience (recruiters, clients, other engineers) what he can do as a full-stack developer. The site
is itself part of the proof: a heavily animated front end, and a working back end in the form of a
private admin area where he edits all the content himself.

Source material: `C:\Users\ali\Downloads\ALI_AFTHAB_Resume_2026.pdf`.

## Goals

- Public portfolio pages built from the resume content, with GSAP-driven motion: smooth scrolling,
  parallax, text animation, a custom cursor, page transitions, and interactive components.
- A private admin area (CMS) where the owner alone edits every piece of public content.
- Content stored in SQLite by default, behind one storage interface so another database (Postgres,
  MySQL, MongoDB) can replace it later.
- Design quality held to the taste skill's rules for copy, layout, type and colour.

## Non-goals

- A contact form (links only).
- A blog, multiple admin users, sign-up, translations, analytics.
- A MongoDB adapter now. It is written when MongoDB is actually chosen.
- Hosting or deployment setup. Hosting is undecided.

## Anti-goals

These make the site a failure even if it works:

- Content that is invisible or unreadable without JavaScript, or under the reduced-motion setting.
- Animation that gets in the way of reading, or makes scrolling feel laggy.
- Invented figures, customers, quotes or screenshots. Only facts from the resume.
- The phone number appearing anywhere public.
- Any admin page or write action reachable without logging in.

## Constraints

- Remix 3 (`remix` ^3.2.0), not React. Components are setup-then-render functions; no React hooks,
  no `@gsap/react`. Read `.agents/skills/remix/SKILL.md` and `node_modules/remix/INDEX.md` before
  using any Remix API. Installed docs are canonical.
- Node >= 24.3. No separate build step. Development on Windows; scripts already use `cross-env`.
- Follow `AGENTS.md` for layout: routes in `app/routes.ts`, wiring in `app/router.ts`, actions in
  `app/actions/`, browser-reachable code in `public/` directories.
- The taste skill is not loaded as a skill in this session. Its files are at
  `C:\Users\ali\.claude\plugins\marketplaces\taste-skill\skills\taste-skill` (`SKILL.md`,
  `references/`, `assets/`, `scripts/`). Read them from disk.
- Not a git repository, so nothing is committed unless the owner asks for one.

## Approaches

### Design and motion (the owner chose option 2)

The taste skill forbids most of the requested motion: nothing may move on scroll outside one or two
set pieces, no parallax on text, no scroll-jacking, motion only from its own kit, and it asks for
placeholder contact details. Its checker fails pages that break these.

1. **Taste skill as written.** Its discipline and a passing check, but no GSAP, smooth scroll,
   cursor or page transitions. Not the site that was asked for.
2. **Taste skill for the design, GSAP for the motion. Chosen.** Its rules govern copy, layout,
   type, palette and section sizing. The requested motion is added on top with GSAP. The checker's
   motion and contact failures are recorded as deliberate waivers with the reason.
3. **No taste skill.** A fully custom GSAP design. Most freedom, nothing checking layout or copy.

Option 2 was chosen because it keeps the quality bar while delivering the motion the owner asked
for.

### Storage (designer's call; the owner asked for SQLite by default with a path to others)

1. **Use Remix's `data-table` directly in actions.** Least code. Postgres and MySQL are a
   configuration change, but MongoDB is impossible without rewriting every action.
2. **A content-store interface with adapters. Chosen.** Actions call one interface. SQLite is the
   implementation, built on `remix/data-table/sqlite`. A JSON export and import command moves
   content between adapters. A MongoDB adapter is a second implementation of the same interface.
3. **Write SQLite and MongoDB adapters both now.** Delivers the option up front, but the MongoDB
   one cannot be tested without a MongoDB instance, so it would ship unverified.

## Site structure

```
Public                              Admin (/admin, owner only)
/              Home                 /admin/login
/work          All projects         /admin                 overview
/work/:slug    Case study           /admin/projects        add, edit, reorder, hide
/about         Story, timeline,     /admin/experience      add, edit, reorder
               education            /admin/skills          groups and items
/contact       Links and email      /admin/site            hero, summary, about copy, links
                                    /admin/media           images and the resume PDF
```

- Home carries the hero, selected work, skills and the experience timeline.
- Case studies are text-first: the problem, the architecture, the numbers from the resume. Images
  are added later through the admin. A case study with no image must still look finished.
- Case-study sections are all optional. The resume gives the Restaurant POS no figures and no
  stated problem, so its page is short until the owner adds more through the admin. A short page
  must still look finished, with no empty slots.
- Contact shows email, LinkedIn and GitHub. No form.
- The resume download appears only once the owner uploads a PDF in the admin. Nothing is seeded,
  because the source PDF prints the phone number. The upload screen says the file will be public.
- `/admin` is never linked from public pages and is marked `noindex`.

## Content model

All public content comes from the store. Shapes are document-like (arrays and nested blocks stored
as JSON) so they map onto both SQL rows and MongoDB documents.

- **Site**: name, role line, hero headline, summary, about text, email, LinkedIn URL, GitHub URL,
  resume file reference, education entries.
- **Project**: slug, title, tagline, stack list, summary, key figures, body blocks, cover image
  reference, featured flag, published flag, order.
- **Body block**: one of heading, text, image, figure list. Plain text only, no raw HTML and no
  Markdown parser, so nothing the admin types can inject markup.
- **Experience**: company, role, start, end (or current), bullet list, order.
- **Skill group**: name, item list, order.
- **Media**: stored file key, original name, alt text, type, size.

Seed content comes from the resume: EazyCRM and the Restaurant POS as projects, four employers,
nine skill groups, the BCA at IGNOU. Seeding runs when the store is empty and never overwrites.

## Storage

- One interface (the content store) with read and write methods per content type, plus export-all
  and import-all. Actions and tests depend only on the interface.
- SQLite adapter on `remix/data-table/sqlite`. The database file and uploads live in a `data/`
  directory that is not browser-reachable.
- The adapter is chosen by an environment variable, defaulting to SQLite.
- A command exports all content to one JSON file and imports it into whichever adapter is
  configured. This is the migration route between databases. The file holds content and media
  metadata; the uploaded files themselves are copied separately. Import is allowed only into an
  empty store.
- A contract test suite runs against the interface, so any future adapter is checked by the same
  tests.

## Admin and security

- One account. The password comes from an environment variable, and a session secret from another.
  The server refuses to start in production without both.
- Cookie session using Remix's session and auth support: HTTP-only, same-site, secure in
  production. Follow `guides/10-auth-sessions-security.md` for request-forgery protection on every
  write.
- Every `/admin` route except login, and every write action, is protected by one middleware.
  Unauthenticated requests redirect to login.
- Failed logins are throttled.
- Uploads: images and one PDF, with a size cap and a type check on the actual bytes. Stored outside
  the public directory and served through a route.
- Admin pages are plain server-rendered forms that work without JavaScript. No animation there.

## Design

- Follow the taste skill's run: write the brief line, write all copy first, plan the page as
  screens, deal the palette, type pairing, hero and moments with its scripts, build with its system
  classes and tokens. Read `copy.md`, `copy-voice.md`, `system.md`, `layout-v4.md`, `sections.md`,
  `motion.md` and `gate.md` first.
- Kind: **software** (designer's call). The subject is technical, which is the case the skill
  allows dark grounds, diagrams and one effect for.
- Its kit is copied into the project's `public/assets` and loaded as plain files. Remix components
  render the starter's markup and classes.
- Rules kept in full: one section per screen, equal content edges, every visual renders at 1440,
  1024, 768 and 390, no captions under visuals, no violet, plain copy with no invented facts, its
  hover layer.
- Rules knowingly broken because the owner's brief asks for them: scroll-linked motion, scroll
  reveals, pinning, custom motion scripts, a smooth-scroll library, pointer-following effects (the
  custom cursor, the cursor-following preview, magnetic buttons), and real contact details in place
  of `.example` ones. The skill's hover layer stays for everything else.
- **The motion is built to the brief, never trimmed to the checker.** The gate allows at most five
  waivers, one finding each, which cannot cover the list above. So a finish of `GATE: OPEN` or
  `GATE: DONE` is accepted, on one condition: every failure still open is caused by an item in the
  list above and is named in the final report. Every other failure is fixed.
- The gate is run on each public page type: Home, Work, a case study, About and Contact.
- The admin area is outside the taste skill and its check.

## Motion

Libraries: GSAP with ScrollTrigger and SplitText, and Lenis for smooth scrolling, installed from
npm and served through the existing asset pipeline.

- **Smooth scrolling** on fine-pointer devices, driven from GSAP's ticker so scroll-linked
  animation stays in step.
- **Parallax** on visuals and background layers. Never on body text.
- **Text animation**: headlines split into lines and words and revealed on entry.
- **Custom cursor** that follows the pointer and changes over links, project rows and draggable
  things. Fine pointers only; the native cursor stays on touch.
- **Page transitions**: an overlay covers the page on a same-site navigation and uncovers the next
  one. Built on Remix's client navigation. Scroll animations are torn down and rebuilt on each
  navigation.
- **Interactive components**:
  - a diagram of the EazyCRM message pipeline (webhook, queue, worker, database, stream, socket,
    inbox) that steps through a message's journey when clicked or hovered;
  - a skills panel where picking a group highlights the projects and the experience entries that
    use it (two projects alone would leave most groups highlighting nothing);
  - a project list with a preview that follows the cursor;
  - an experience timeline that advances with scroll;
  - buttons that pull slightly toward the cursor.

Rules for all of it:

- Server-rendered content is visible by default. Hidden-then-revealed states are applied only by
  script, so no JavaScript means a complete static page.
- Under `prefers-reduced-motion`, native scrolling, no parallax, no splits, instant transitions.
- Nothing tilts and no cards fade in one by one (taste skill rules kept).

## Verification

- Router tests: every public route renders from seeded content; every admin route and write action
  rejects an unauthenticated request; create, edit, reorder, hide and delete each work; bad uploads
  are rejected.
- Store contract tests against the SQLite adapter, and an export-then-import round trip.
- `npm run typecheck` and `npm test` pass.
- In a real browser: each animation runs, navigation transitions work forward and back, the page is
  complete with JavaScript off and with reduced motion on, and the layout holds at 1440, 1024, 768
  and 390.
- The taste skill's gate on each public page type, finished as described under Design.

## Left to the builder

- File and module layout within the `AGENTS.md` conventions.
- Table schema and migrations behind the store interface.
- The exact palette, type pairing, hero and moments, since the taste skill deals them.
- All copy wording, within the resume's facts.
- Animation timings and easing.
- The exact throttling and upload limits.

## Calls made by the designer, not the owner

- Storage approach 2, with the MongoDB adapter deferred.
- Taste skill kind "software".
- Body blocks instead of Markdown.
- Password from an environment variable, single account.
- Lenis for smooth scrolling.
- No contact form, phone number left off, admin left unanimated.
- No resume PDF seeded; the download appears when the owner uploads one.
- The taste gate may finish open, with only brief-driven motion and contact failures left.
- Case-study sections optional; the skills panel links to experience entries as well as projects.
- Export is one JSON file plus separately copied uploads; import only into an empty store.

## Design update, 2026-11-17: the desk redesign

This supersedes the Design section above wherever they differ. The owner's own design, in
`stitch_portfolio_design/` (`DESIGN.md`, `code.html`, `screen.png`), replaces the taste skill's palette, type
and layout. The taste kit (`public/assets/system.css` and the rest) is removed; nothing is checked against
the taste gate any more.

- **Look**: Obsidian Atelier, a dark drafting desk (the default), with a light "paper" theme behind the
  sun and moon note. Body text is Geist, headings and labels JetBrains Mono, annotations Courier Prime,
  handwriting Caveat. All of it lives in `public/desk/desk.css` as tokens plus plain classes.
- **Doodles** (`app/ui/doodles.tsx`, `app/ui/public/desk/toys.ts`): a badge on a lanyard, a sticky note of
  figures from the store, three sticker links, a mug, gears and a rocket. They are real markup first. On a
  wide screen with a mouse they can be dragged and thrown a short way; Scatter and Tidy move them all. The badge swings
  when brushed or when the page is scrolled fast. Pressing the mug, gears or rocket does something on any screen.
- **Motion** (GSAP, ScrollTrigger, SplitText, Draggable, Inertia, Lenis): headline line reveals, scroll
  reveals, light parallax, counters, a ruler under the header that tracks scroll and the section in view,
  a scrubbed line on the Home experience rail, a sticky role list on About, the EazyCRM pipeline that steps
  through its stages, the Work page's cycling headline word and cursor-following preview, a custom cursor,
  magnetic buttons, and a curtain between pages.
- **No client router.** `app/actions/public/entry.ts` only imports the motion code. Every link is an ordinary
  navigation; the curtain is a flag in `sessionStorage` read by an inline script in the head.
- **Content rules kept**: no phone number, no invented labels or figures, no availability claim, every role
  and project in the HTML. Hidden-then-revealed states are set by script only, and a 2.5 second failsafe in
  the head shows everything if the script never runs. Under `prefers-reduced-motion` there is no smooth
  scroll, no reveal, no parallax and no curtain; dragging and the theme switch still work.
- **Not covered**: the admin area is still unbuilt and unstyled by this design.
