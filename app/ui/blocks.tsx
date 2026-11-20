import type { Handle } from 'remix/component'

import type { Block, Figure, Media } from '../data/content.ts'
import { routes } from '../routes.ts'

export interface BlocksProps {
  blocks: Block[]
  /** The media the store holds, by id. An image block whose id is not here renders nothing. */
  media: Map<string, Media>
}

interface Chapter {
  heading: string | null
  body: Block[]
}

/** Splits blocks into chapters at each heading block. Chapters with nothing to show are dropped. */
export function chapters(blocks: Block[], media: Map<string, Media>): Chapter[] {
  let out: Chapter[] = []
  for (let block of blocks) {
    if (block.type === 'heading') {
      out.push({ heading: block.text.trim() || null, body: [] })
      continue
    }
    if (!isShown(block, media)) continue
    let last = out[out.length - 1]
    if (!last) {
      last = { heading: null, body: [] }
      out.push(last)
    }
    last.body.push(block)
  }
  return out.filter((chapter) => chapter.heading !== null || chapter.body.length > 0)
}

function isShown(block: Block, media: Map<string, Media>): boolean {
  switch (block.type) {
    case 'text':
      return block.text.trim() !== ''
    case 'image':
      return media.has(block.mediaId)
    case 'figures':
      return block.items.some(isFigure)
    case 'heading':
      return block.text.trim() !== ''
  }
}

function isFigure(figure: Figure): boolean {
  return figure.value.trim() !== ''
}

/**
 * A project's body. Every word is rendered as a text node: nothing the admin types can become markup.
 * Headings become h3 (the section's h2 sits above), text becomes paragraphs split on blank lines.
 */
export function Blocks(handle: Handle<BlocksProps>) {
  return () => {
    let { blocks, media } = handle.props
    let list = chapters(blocks, media)
    if (list.length === 0) return null

    return (
      <div class="chapters">
        {list.map((chapter, index) => (
          <div key={index} class="chapter">
            {chapter.heading ? (
              <h3 class="chapter__title" data-split="">
                {chapter.heading}
              </h3>
            ) : null}
            {chapter.body.length > 0 ? (
              <div class="chapter__body">
                {chapter.body.map((block, blockIndex) => (
                  <BlockView key={blockIndex} block={block} media={media} />
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    )
  }
}

function BlockView(handle: Handle<{ block: Block; media: Map<string, Media> }>) {
  return () => {
    let { block, media } = handle.props
    switch (block.type) {
      case 'text':
        return (
          <>
            {paragraphs(block.text).map((text, index) => (
              <p key={index}>{text}</p>
            ))}
          </>
        )
      case 'image': {
        let item = media.get(block.mediaId)
        if (!item) return null
        return (
          <figure class="frame" data-parallax="0.06">
            <img
              class="frame__img"
              src={routes.media.href({ id: item.id })}
              alt={item.alt}
              loading="lazy"
            />
          </figure>
        )
      }
      case 'figures': {
        let items = block.items.filter(isFigure)
        if (items.length === 0) return null
        return (
          <ul class="chapter__figures">
            {items.map((figure, index) => (
              <li key={index}>
                <p class="fig__value" data-count="">{figure.value}</p>
                <p class="fig__label">{figure.label}</p>
              </li>
            ))}
          </ul>
        )
      }
      case 'heading':
        return null
    }
  }
}

/** Plain text split into paragraphs on blank lines. */
export function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean)
}
