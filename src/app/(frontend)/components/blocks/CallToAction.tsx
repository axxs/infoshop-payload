import React from 'react'
import { Button } from '../ui/button'
import { serializeLexical } from '@/lib/serializeLexical'
import { BookOpen, Calendar, Mail, Phone, ShoppingCart, Users } from 'lucide-react'
import Image from 'next/image'
import type { Media as MediaType } from '@/payload-types'

interface CTAButton {
  label: string
  href: string
  variant: 'default' | 'outline' | 'secondary' | 'ghost'
  size: 'default' | 'sm' | 'lg'
  id?: string | null
}

interface CallToActionProps {
  icon?: 'book-open' | 'calendar' | 'mail' | 'phone' | 'shopping-cart' | 'users' | 'custom' | null
  customIcon?: number | MediaType | null
  title: string
  description?: unknown
  buttons?: CTAButton[] | null
  backgroundColor: 'default' | 'muted' | 'accent' | 'primary'
}

const iconMap = {
  'book-open': BookOpen,
  calendar: Calendar,
  mail: Mail,
  phone: Phone,
  'shopping-cart': ShoppingCart,
  users: Users,
}

const backgroundClasses = {
  default: 'bg-background',
  muted: 'bg-muted',
  accent: 'bg-accent text-accent-foreground',
  primary: 'bg-primary text-primary-foreground',
}

export function CallToAction({
  icon,
  customIcon,
  title,
  description,
  buttons,
  backgroundColor,
}: CallToActionProps) {
  const Icon = icon && icon !== 'custom' ? iconMap[icon] : null
  const customIconUrl =
    icon === 'custom' && customIcon && typeof customIcon === 'object' ? customIcon.url : null

  const descriptionContent = description ? serializeLexical(description) : null

  return (
    <section className={`py-20 ${backgroundClasses[backgroundColor]}`}>
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          {/* Icon */}
          {Icon && (
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-primary/10 p-4">
                <Icon className="h-12 w-12 text-primary" />
              </div>
            </div>
          )}

          {customIconUrl && (
            <div className="mb-6 flex justify-center">
              <div className="relative h-16 w-16">
                <Image src={customIconUrl} alt="" fill className="object-contain" />
              </div>
            </div>
          )}

          {/* Title */}
          <h2 className="mb-6 text-3xl font-bold sm:text-4xl md:text-5xl">{title}</h2>

          {/* Description */}
          {descriptionContent && (
            <div className="prose prose-lg mx-auto mb-8 max-w-2xl dark:prose-invert">
              {descriptionContent}
            </div>
          )}

          {/* Buttons */}
          {buttons && buttons.length > 0 && (
            <div className="flex flex-wrap justify-center gap-4">
              {buttons.map((button, index) => (
                <Button
                  key={button.id || index}
                  variant={button.variant}
                  size={button.size}
                  asChild
                >
                  <a href={button.href}>{button.label}</a>
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
