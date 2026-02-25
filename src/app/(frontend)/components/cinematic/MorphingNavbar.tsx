'use client'

import { useRef, useState, useEffect } from 'react'

interface MorphingNavbarProps {
  children: React.ReactNode
  className?: string
}

export function MorphingNavbar({ children, className = '' }: MorphingNavbarProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Check initial state
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div
      ref={ref}
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? 'border-b bg-background/80 backdrop-blur-xl shadow-sm'
          : 'border-b border-transparent bg-transparent'
      } ${className}`}
    >
      {children}
    </div>
  )
}
