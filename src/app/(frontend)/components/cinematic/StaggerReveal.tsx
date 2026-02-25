'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'

interface StaggerRevealProps {
  children: React.ReactNode
  stagger?: number
  duration?: number
  distance?: number
  className?: string
}

export function StaggerReveal({
  children,
  stagger = 0.1,
  duration = 0.7,
  distance = 30,
  className = '',
}: StaggerRevealProps) {
  const ref = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (!ref.current) return

      // Respect reduced motion — show children immediately without animation
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.set(ref.current.children, { opacity: 1 })
        return
      }

      const items = ref.current.children

      // Hide children immediately to prevent FOUC before ScrollTrigger fires
      gsap.set(items, { opacity: 0 })

      gsap.fromTo(
        items,
        { opacity: 0, y: distance },
        {
          opacity: 1,
          y: 0,
          duration,
          stagger,
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

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
