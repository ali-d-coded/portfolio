---
name: Obsidian Atelier
colors:
  surface: '#131315'
  surface-dim: '#131315'
  surface-bright: '#39393b'
  surface-container-lowest: '#0e0e10'
  surface-container-low: '#1b1b1d'
  surface-container: '#201f21'
  surface-container-high: '#2a2a2c'
  surface-container-highest: '#353437'
  on-surface: '#e5e1e4'
  on-surface-variant: '#d1c6ab'
  inverse-surface: '#e5e1e4'
  inverse-on-surface: '#303032'
  outline: '#9a9078'
  outline-variant: '#4d4632'
  surface-tint: '#eec200'
  primary: '#ffecb9'
  on-primary: '#3c2f00'
  primary-container: '#facc15'
  on-primary-container: '#6c5700'
  inverse-primary: '#735c00'
  secondary: '#7bd0ff'
  on-secondary: '#00354a'
  secondary-container: '#00a6e0'
  on-secondary-container: '#00374d'
  tertiary: '#b3ffbb'
  on-tertiary: '#003915'
  tertiary-container: '#57ec7f'
  on-tertiary-container: '#00682c'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffe083'
  primary-fixed-dim: '#eec200'
  on-primary-fixed: '#231b00'
  on-primary-fixed-variant: '#574500'
  secondary-fixed: '#c4e7ff'
  secondary-fixed-dim: '#7bd0ff'
  on-secondary-fixed: '#001e2c'
  on-secondary-fixed-variant: '#004c69'
  tertiary-fixed: '#6bff8f'
  tertiary-fixed-dim: '#4ae176'
  on-tertiary-fixed: '#002109'
  on-tertiary-fixed-variant: '#005321'
  background: '#131315'
  on-background: '#e5e1e4'
  surface-variant: '#353437'
typography:
  display-lg:
    fontFamily: JetBrains Mono
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.04em
  display-lg-mobile:
    fontFamily: JetBrains Mono
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: JetBrains Mono
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: JetBrains Mono
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: JetBrains Mono
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: JetBrains Mono
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Courier Prime
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 18px
    letterSpacing: 0.05em
  label-md:
    fontFamily: Courier Prime
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.08em
  label-sm:
    fontFamily: Courier Prime
    fontSize: 10px
    fontWeight: '400'
    lineHeight: 14px
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style
This design system embodies the focused, immersive environment of an elite industrial design studio working late into the night. It fuses technical precision with physical studio artifacts: blueprints, drafting mats, matte acrylic fixtures, and illuminated status indicators.

The aesthetic merges **Tactile Studio Functionalism** with **Dark Technical Blueprinting**. It rejects generic flat SaaS tropes in favor of deliberate structure, fine crosshairs, deep obsidian layers, and crisp utilitarian typography. High-contrast legibility guides rapid technical workflows, while warm drafting accents introduce physical tangibility.

## Colors
The palette is rooted in deep obsidian charcoal, accented by functional workshop signals and warm drafting highlights:

- **Base Canvas (`#111113`)**: Obsidian blueprint slate providing maximum dynamic range.
- **Acrylic Panels (`#1c1c20`)**: Matte frosted charcoal surfaces creating tactile structural separation.
- **Primary Accent (`#facc15` / `#fef08a`)**: Studio amber drafting highlight, reminiscent of physical sticky notes and brass workshop tools.
- **Secondary Accent (`#38bdf8`)**: Blueprint cyan for drafting lines, coordinates, and structural markers.
- **System Indicators (`#22c55e`, `#ef4444`, `#facc15`)**: Luminescent diode glows indicating state and live telemetry.
- **Text Tiers**: Pure high-contrast `#ffffff` for active readouts, `#a1a1aa` for secondary specifications, and `#52525b` for grid labels and metadata.

## Typography
Typography is treated as engineering notation. **JetBrains Mono** delivers optical weight and tabular precision across technical metrics, structural headlines, and continuous text readouts.

**Courier Prime** serves as the studio annotation voice—rendered in upper or tracked casing for stamps, metadata keys, coordinate axes, and status flags. Optical hierarchy is reinforced by weight transitions and strict monospaced vertical grid alignment rather than variable font sizing.

## Layout & Spacing
The layout adheres to a fixed-modulo drafting canvas overlaid with a 16px modular baseline. 

- **Grid Architecture**: 12-column dynamic framework bordered by structural ruler rules and luminescent crosshairs (`+`) at major quadrant intersections.
- **Breakpoints**: 
  - Mobile (<768px): Single-column stack, outer margin `1rem`, compact header readouts.
  - Tablet (768px–1024px): 6-column fluid canvas with persistent inspector rails.
  - Desktop (>1024px): 12-column rigid canvas framed by coordinates and tool shelves.
- **Density**: High-density rhythm optimized for maximum situational visibility, using tight component padding (`0.5rem` to `1rem`) and distinct outer negative buffers (`1.5rem` to `2.5rem`).

## Elevation & Depth
Depth is realized through physical workbench layering rather than heavy ambient blur:

1. **Floor (Blueprint Grid)**: `#111113` patterned with `rgba(56, 189, 248, 0.05)` coordinate lines and low-intensity intersection crosses.
2. **Plates (Acrylic Workspace)**: `#1c1c20` with a 1px perimeter edge of `rgba(255, 255, 255, 0.08)` and `backdrop-filter: blur(12px)`.
3. **Artifacts (Sticky Notes & Cards)**: Physical paper yellow `#facc15` or matte dense carbon `#232328`, casting hard-edged miniature contact drops: `0 2px 0 0 rgba(0, 0, 0, 0.4), 0 8px 16px -4px rgba(0, 0, 0, 0.6)`.
4. **Signal Diodes**: Active elements utilize a dual-stop radial glow (`box-shadow: 0 0 8px #22c55e, 0 0 16px rgba(34, 197, 94, 0.4)`).

## Shapes
Geometry is disciplined, utilitarian, and micro-machined. 

Standard components utilize a tight `0.25rem` (4px) radius, conveying milled metal and laser-cut acrylic. Technical tags, sticky notes, and status flags retain near-square profiles or subtle chamfered corners, avoiding soft consumer pill silhouettes entirely. Precision dividers and status indicators utilize crisp rectangular or circular micro-geometry.

## Components

### Buttons
- **Primary Studio Button**: Warm amber (`#facc15`) fill with deep obsidian text (`#111113`), bold monospaced typography, 4px corner radii, and a mechanical recessed active state (`translate-y: 1px`).
- **Tactical Secondary**: Matte charcoal surface (`#1c1c20`) with 1px border (`rgba(255, 255, 255, 0.12)`), text in `#ffffff`, accompanied by a trailing technical symbol (`[CMD]`).
- **Ghost Tool**: Transparent base with hairline borders that brighten to blueprint cyan on hover.

### Chips & Status Indicators
- **LED Badges**: Micro-capsules containing a 6px glowing luminescent diode (`#22c55e` for online/nominal, `#facc15` for pending, `#ef4444` for error) flanked by monospaced tracking text.
- **Drafting Chips**: Monospaced tags enclosed in brackets (e.g., `[SPEC_v2.4]`) styled with dark matte acrylic fills and hairline boundaries.

### Input Fields & Controls
- **Input Fields**: Inset dark wells (`#141416`) with a 1px border of `rgba(255, 255, 255, 0.1)`. Focus states trigger a 1px blueprint cyan glow (`#38bdf8`) with zero border expansion.
- **Checkboxes & Radios**: Machined squares and circles with inner micro-tick indicators; activated state renders in primary amber with high-contrast obsidian checks.

### Cards & Studio Surfaces
- **Acrylic Panels**: Frosted charcoal glass base (`#1c1c20` at 90% opacity), crisp 1px top highlight, and technical crosshairs stamped into panel header margins.
- **Sticky Note Callout**: Yellow accent card (`#facc15` base, `#1c1c20` text) featuring offset orientation (`transform: rotate(-0.5deg)`), serving as critical designer annotations and pinned alerts.
- **Ruler Dividers**: Horizontal boundaries styled as calibrated measurement rules with alternating millimeter tick-marks.