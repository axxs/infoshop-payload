'use client'

import { useRef, useCallback, useEffect } from 'react'
import gsap from 'gsap'

interface MagneticButtonProps {
  children: React.ReactNode
  strength?: number
  className?: string
}

export function MagneticButton({ children, strength = 0.3, className = '' }: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useRef(false)

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!ref.current || prefersReducedMotion.current) return

      const rect = ref.current.getBoundingClientRect()
      const x = e.clientX - rect.left - rect.width / 2
      const y = e.clientY - rect.top - rect.height / 2

      gsap.to(ref.current, {
        x: x * strength,
        y: y * strength,
        duration: 0.3,
        ease: 'power2.out',
      })
    },
    [strength],
  )

  const handleMouseLeave = useCallback(() => {
    if (!ref.current) return

    gsap.to(ref.current, {
      x: 0,
      y: 0,
      duration: 0.5,
      ease: 'elastic.out(1, 0.3)',
    })
  }, [])

  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ display: 'inline-block' }}
    >
      {children}
    </div>
  )
}
