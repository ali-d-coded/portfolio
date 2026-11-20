# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Freelance and agency clients: businesses and teams deciding whether to hire Ali Afthab to build or extend a product. They arrive from a link or a submission, often non-engineers or engineering leads, and want to know what Ali has shipped, how it works in plain terms, and whether it can be trusted with their product. A second audience is Awwwards jurors and developer peers judging craft, so the build itself is also evaluated.

## Product Purpose

A personal portfolio for Ali Afthab, a full-stack engineer (Node.js, Bun, TypeScript, microservices, message queues, real-time WebSockets, multi-tenant SaaS). It exists to win client work and to be listed on Awwwards. Success is a visitor emailing through the message form, and a Site of the Day nomination.

## Positioning

The site is a "desk": the work is shown as objects on a desk (ID badge, sticky note, toys, a rocket, a paper plane), with real project case studies behind it. A neighbouring portfolio could not truthfully copy the specific projects (EazyCRM, Restaurant POS, Nanma Charitable Foundation) or the desk world built around them.

## Operating Context

Content lives in a SQLite content store edited through a password-protected admin (site details, projects, experience, skills, uploads, resume). The site is server rendered with Remix, animated with GSAP, and deployed to Render on the free plan. Messages go to Ali's inbox over SMTP.

## Capabilities and Constraints

- EazyCRM: a multi-tenant WhatsApp Business CRM (team inbox, bulk campaigns, WhatsApp Groups, e-commerce automation) with React web, React Native mobile and admin dashboard clients, Shopify and Magento 2 connectors, database-per-tenant isolation, BullMQ ingestion, Redis Streams and Socket.IO delivery.
- Confirmed EazyCRM figures on the site today: 30+ client businesses, 3 client apps (web, mobile, admin), 2 store connectors. Ali will supply any further numbers; none are to be invented.
- App screenshots of EazyCRM are not yet supplied. Ali will provide them (dummy data is fine). Until then no screen mockups are drawn or implied.
- Hosting and a custom domain are being handled by Ali.

## Brand Commitments

The existing desk identity is binding: dark and paper themes, amber accent with cyan secondary, JetBrains Mono, Courier Prime and Caveat doodle type, doodle objects with panel fill and amber outline, the rocket and paper-plane motifs.

## Evidence on Hand

- Real project copy, stacks and figures in `app/data/seed.ts`.
- A live site screenshot for each project in `public/projects/`.
- The EazyCRM message pipeline in the resume's own words (webhook, BullMQ, workers, MongoDB, Redis Streams, Socket.IO, inbox).
- Not on hand: EazyCRM app screenshots, usage metrics beyond the three figures, client testimonials. None may be fabricated.

## Product Principles

- Show real work doing its job; never claim what cannot be evidenced.
- Explain in terms a client cares about (what they get, what stays safe) before the engineering detail.
- One memorable, authored moment per surface instead of scattered effects.
- Every page is a first impression for someone deciding in seconds: clear action, readable, fast.
- Content is editable by the owner without code.
