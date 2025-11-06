'use client'

import { useState } from 'react'
import Image from 'next/image'

interface BookCoverImageProps {
  src: string
  alt: string
  fill?: boolean
  className?: string
  sizes?: string
  priority?: boolean
}

export function BookCoverImage({
  src,
  alt,
  fill = false,
  className,
  sizes,
  priority = false,
}: BookCoverImageProps) {
  const [imgSrc, setImgSrc] = useState(src)
  const [hasError, setHasError] = useState(false)

  const handleError = () => {
    if (!hasError) {
      setHasError(true)
      setImgSrc('/placeholder-book.svg')
    }
  }

  // Use regular img tag for SVG fallback (best practice - no optimization needed for SVGs)
  if (hasError && imgSrc.endsWith('.svg')) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imgSrc}
        alt={alt}
        className={className}
        style={fill ? { width: '100%', height: '100%', objectFit: 'cover' } : undefined}
      />
    )
  }

  return (
    <Image
      src={imgSrc}
      alt={alt}
      fill={fill}
      className={className}
      sizes={sizes}
      priority={priority}
      onError={handleError}
    />
  )
}
