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
  /** The project's live site, shown as a link with a preview. */
  liveUrl?: string
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
