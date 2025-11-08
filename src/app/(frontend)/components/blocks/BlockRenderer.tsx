import React from 'react'
import { Hero } from './Hero'
import { BookShowcase } from './BookShowcase'
import { Content } from './Content'
import { CallToAction } from './CallToAction'
import { Media } from './Media'
import { Archive } from './Archive'

type Block =
  | {
      blockType: 'hero'
      id?: string | null
      [key: string]: unknown
    }
  | {
      blockType: 'bookShowcase'
      id?: string | null
      [key: string]: unknown
    }
  | {
      blockType: 'content'
      id?: string | null
      [key: string]: unknown
    }
  | {
      blockType: 'callToAction'
      id?: string | null
      [key: string]: unknown
    }
  | {
      blockType: 'media'
      id?: string | null
      [key: string]: unknown
    }
  | {
      blockType: 'archive'
      id?: string | null
      [key: string]: unknown
    }

interface BlockRendererProps {
  blocks: Block[]
}

export async function BlockRenderer({ blocks }: BlockRendererProps) {
  if (!blocks || blocks.length === 0) {
    return null
  }

  return (
    <>
      {blocks.map((block, index) => {
        const key = block.id || `block-${index}`

        switch (block.blockType) {
          case 'hero':
            return <Hero key={key} {...(block as unknown as Parameters<typeof Hero>[0])} />

          case 'bookShowcase':
            return (
              <BookShowcase
                key={key}
                {...(block as unknown as Parameters<typeof BookShowcase>[0])}
              />
            )

          case 'content':
            return <Content key={key} {...(block as unknown as Parameters<typeof Content>[0])} />

          case 'callToAction':
            return (
              <CallToAction
                key={key}
                {...(block as unknown as Parameters<typeof CallToAction>[0])}
              />
            )

          case 'media':
            return <Media key={key} {...(block as unknown as Parameters<typeof Media>[0])} />

          case 'archive':
            return <Archive key={key} {...(block as unknown as Parameters<typeof Archive>[0])} />

          default:
            return null
        }
      })}
    </>
  )
}
