import React from 'react'
import { Button } from '../ui/button'
import Image from 'next/image'
import type { Media as MediaType } from '@/payload-types'
import { BookOpen, Library, Sparkles } from 'lucide-react'
import { ScrollReveal } from '../cinematic/ScrollReveal'
import { StaggerReveal } from '../cinematic/StaggerReveal'
import { MagneticButton } from '../cinematic/MagneticButton'
import { ParallaxSection } from '../cinematic/ParallaxSection'

interface HeroProps {
  variant: 'default' | 'minimal' | 'fullHeight'
  title: string
  subtitle?: string
  backgroundImage?: number | MediaType | null
  icon?: 'book-open' | 'library' | 'sparkles' | 'none'
  ctaButtons?: Array<{
    label: string
    href: string
    variant: 'default' | 'outline' | 'secondary'
    id?: string | null
  }> | null
  alignment: 'left' | 'center' | 'right'
}

const iconMap = {
  'book-open': BookOpen,
  library: Library,
  sparkles: Sparkles,
  none: null,
}

export function Hero({
  variant,
  title,
  subtitle,
  backgroundImage,
  icon = 'none',
  ctaButtons,
  alignment,
}: HeroProps) {
  const Icon = icon !== 'none' ? iconMap[icon] : null

  const alignmentClasses = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end',
  }

  const variantClasses = {
    default: 'py-24',
    minimal: 'py-16',
    fullHeight: 'min-h-screen py-24',
  }

  const backgroundImageUrl =
    backgroundImage && typeof backgroundImage === 'object' && backgroundImage.url
      ? backgroundImage.url
      : null

  return (
    <section
      className={`relative flex ${variantClasses[variant]} ${alignmentClasses[alignment]} flex-col justify-center overflow-hidden`}
    >
      {backgroundImageUrl && (
        <ParallaxSection className="absolute inset-0 z-0">
          <Image
            src={backgroundImageUrl}
            alt=""
            fill
            className="object-cover opacity-20"
            priority
          />
        </ParallaxSection>
      )}

      <div className="container relative z-10 mx-auto px-4">
        <div className={`mx-auto flex max-w-4xl flex-col gap-6 ${alignmentClasses[alignment]}`}>
          {Icon && (
            <ScrollReveal>
              <div className="text-primary">
                <Icon className="h-12 w-12" />
              </div>
            </ScrollReveal>
          )}

          <div className="space-y-4">
            <ScrollReveal>
              <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                {title}
              </h1>
            </ScrollReveal>
            {subtitle && (
              <ScrollReveal delay={0.2}>
                <p className="text-xl text-muted-foreground sm:text-2xl">{subtitle}</p>
              </ScrollReveal>
            )}
          </div>

          {ctaButtons && ctaButtons.length > 0 && (
            <StaggerReveal className="flex flex-wrap gap-4">
              {ctaButtons.map((button, index) => (
                <MagneticButton key={button.id || index}>
                  <Button variant={button.variant} size="lg" asChild>
                    <a href={button.href}>{button.label}</a>
                  </Button>
                </MagneticButton>
              ))}
            </StaggerReveal>
          )}
        </div>
      </div>
    </section>
  )
}
