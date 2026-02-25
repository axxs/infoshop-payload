'use client'

import { useRef, useCallback, useEffect } from 'react'
import { gsap } from '@/lib/gsap'

interface MagneticButtonProps {
  children: React.ReactNode
  strength?: number
  className?: string
}

export function MagneticButton({ children, strength = 0.3, className = '' }: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null)
  const rectRef = useRef<DOMRect | null>(null)
  const reducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  // Listen for system reduced-motion preference changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => {
      reducedMotion.current = e.matches
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Clean up any running GSAP tweens on unmount
  useEffect(() => {
    const el = ref.current
    return () => {
      if (el) gsap.killTweensOf(el)
    }
  }, [])

  const handleMouseEnter = useCallback(() => {
    if (ref.current) {
      rectRef.current = ref.current.getBoundingClientRect()
    }
  }, [])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!ref.current || !rectRef.current) return
      if (reducedMotion.current) return

      const rect = rectRef.current
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
    rectRef.current = null

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
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ display: 'inline-block' }}
    >
      {children}
    </div>
  )
}
