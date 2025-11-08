import React from 'react'
import Image from 'next/image'
import { serializeLexical } from '@/lib/serializeLexical'
import type { Media as MediaType } from '@/payload-types'

interface MediaProps {
  media: number | MediaType
  caption?: unknown
  size: 'small' | 'medium' | 'large' | 'fullWidth'
  aspectRatio: 'auto' | '16:9' | '4:3' | '1:1'
}

const sizeClasses = {
  small: 'max-w-2xl',
  medium: 'max-w-4xl',
  large: 'max-w-6xl',
  fullWidth: 'max-w-full',
}

const aspectRatioClasses = {
  auto: 'aspect-auto',
  '16:9': 'aspect-video',
  '4:3': 'aspect-[4/3]',
  '1:1': 'aspect-square',
}

export function Media({ media, caption, size, aspectRatio }: MediaProps) {
  const mediaObj = typeof media === 'object' ? media : null

  if (!mediaObj || !mediaObj.url) {
    return null
  }

  const captionContent = caption ? serializeLexical(caption) : null
  const isVideo = mediaObj.mimeType?.startsWith('video/')

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className={`mx-auto ${sizeClasses[size]}`}>
          <div
            className={`relative overflow-hidden rounded-lg ${aspectRatio !== 'auto' ? aspectRatioClasses[aspectRatio] : ''}`}
          >
            {isVideo ? (
              <video
                src={mediaObj.url}
                controls
                className="h-full w-full object-cover"
                preload="metadata"
              >
                <track kind="captions" />
              </video>
            ) : (
              <Image
                src={mediaObj.url}
                alt={mediaObj.alt || ''}
                fill={aspectRatio !== 'auto'}
                width={aspectRatio === 'auto' ? mediaObj.width || 1200 : undefined}
                height={aspectRatio === 'auto' ? mediaObj.height || 800 : undefined}
                className={aspectRatio !== 'auto' ? 'object-cover' : 'h-auto w-full'}
              />
            )}
          </div>

          {captionContent && (
            <div className="prose prose-sm mx-auto mt-4 max-w-none text-center dark:prose-invert">
              {captionContent}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
