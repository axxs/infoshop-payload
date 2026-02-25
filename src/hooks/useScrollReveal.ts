'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'

interface UseScrollRevealOptions {
  direction?: 'up' | 'down' | 'left' | 'right'
  delay?: number
  duration?: number
  distance?: number
}

export function useScrollReveal<T extends HTMLElement>(options: UseScrollRevealOptions = {}) {
  const { direction = 'up', delay = 0, duration = 0.8, distance = 40 } = options
  const ref = useRef<T>(null)

  useGSAP(
    () => {
      if (!ref.current) return

      // Respect reduced motion
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const directionMap = {
        up: { y: distance, x: 0 },
        down: { y: -distance, x: 0 },
        left: { x: distance, y: 0 },
        right: { x: -distance, y: 0 },
      }

      const { x, y } = directionMap[direction]

      gsap.fromTo(
        ref.current,
        { opacity: 0, x, y },
        {
          opacity: 1,
          x: 0,
          y: 0,
          duration,
          delay,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: ref.current,
            start: 'top 85%',
            once: true,
          },
        },
      )
    },
    { scope: ref },
  )

  return ref
}
