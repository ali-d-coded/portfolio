export interface Figure {
  value: string
  label: string
}

export type Block =
  | { type: 'heading'; text: string }
  | { type: 'text'; text: string }
  | { type: 'image'; mediaId: string }
  | { type: 'figures'; items: Figure[] }

export interface Detail {
  label: string
  value: string
}

/** One thing a client gets from a project, in plain words. */
export interface Gain {
  title: string
  text: string
}

/** One stop on a project's route: where a message goes, and what that protects, in plain words. */
export interface Stage {
  name: string
  line: string
  /** A tool name for the stop's logo. */
  tool: string
  benefit: string
}

/** An app screenshot: a path under `public/` or an uploaded `/media/` link. */
export interface Screen {
  device: 'web' | 'mobile' | 'admin'
  label: string
  image: string
}

export interface Education {
  degree: string
  school: string
  start: string
  end: string | null
}

export interface Site {
  name: string
  role: string
  heroHeadline: string
  summary: string
  about: string
  email: string
  linkedinUrl: string
  githubUrl: string
  /** Absent in content saved before the field existed. */
  instagramUrl?: string
  resumeMediaId: string | null
  education: Education[]
}

export interface Project {
  id: string
  slug: string
  title: string
  tagline: string
  stack: string[]
  summary: string
  figures: Figure[]
  blocks: Block[]
  coverMediaId: string | null
  /** The title on the home page card, when it should read differently from `title`. */
  headline?: string
  /** A short label on the home page card, such as `Flagship SaaS`. */
  badge?: string
  /** Key facts on the home page card, shown as label and value rows. */
  details?: Detail[]
  /** What a business gets, shown as plain rows on the project page. */
  gains?: Gain[]
  /** The route a message takes through the product, drawn as a path with a plane carrying it. */
  stages?: Stage[]
  /** App screenshots, supplied by the owner. */
  screens?: Screen[]
  /** The project's live site, shown as a link with a preview. */
  liveUrl?: string
  /** A line under the live preview saying what the linked site is, when it is not the project itself. */
  liveNote?: string
  /** A screenshot of the live site, a path under `public/`. */
  previewImage?: string
  featured: boolean
  published: boolean
  position: number
}

export interface Experience {
  id: string
  company: string
  role: string
  start: string
  end: string | null // 'YYYY-MM'
  bullets: string[]
  skills: string[]
  position: number
}

export interface SkillGroup {
  id: string
  name: string
  items: string[]
  position: number
}

export interface Media {
  id: string
  key: string
  name: string
  alt: string
  contentType: string
  size: number
  createdAt: string
}

export interface ContentSnapshot {
  version: 1
  site: Site | null
  projects: Project[]
  experience: Experience[]
  skillGroups: SkillGroup[]
  media: Media[]
}
