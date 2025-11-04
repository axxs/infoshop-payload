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
      setImgSrc('/placeholder-book.png')
    }
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
