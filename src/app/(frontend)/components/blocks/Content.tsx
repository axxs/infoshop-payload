import React from 'react'
import { serializeLexical } from '@/lib/serializeLexical'

interface ContentColumn {
  richText: unknown
  align?: 'left' | 'center' | 'right' | null
  id?: string | null
}

interface ContentProps {
  layout: 'oneColumn' | 'twoColumns' | 'threeColumns'
  columns: ContentColumn[]
  backgroundColor: 'default' | 'muted' | 'accent'
}

const backgroundClasses = {
  default: '',
  muted: 'bg-muted',
  accent: 'bg-accent text-accent-foreground',
}

const layoutGridClasses = {
  oneColumn: 'grid-cols-1',
  twoColumns: 'grid-cols-1 md:grid-cols-2',
  threeColumns: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
}

const alignmentClasses = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}

export function Content({ layout, columns, backgroundColor }: ContentProps) {
  return (
    <section className={`py-16 ${backgroundClasses[backgroundColor]}`}>
      <div className="container mx-auto px-4">
        <div className={`grid gap-8 ${layoutGridClasses[layout]}`}>
          {columns.map((column, index) => {
            const alignment = column.align || 'left'
            const content = serializeLexical(column.richText)

            return (
              <div
                key={column.id || index}
                className={`prose prose-lg max-w-none dark:prose-invert ${alignmentClasses[alignment]}`}
              >
                {content}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
