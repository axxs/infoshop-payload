import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'
import { Facebook, Twitter, Instagram, Linkedin, Github, Youtube } from 'lucide-react'
import { ScrollReveal } from '../cinematic/ScrollReveal'
import { MagneticButton } from '../cinematic/MagneticButton'

export async function FooterDynamic() {
  const payload = await getPayload({ config })

  let layout
  try {
    layout = await payload.findGlobal({
      slug: 'layout',
    })
  } catch {
    return <FooterFallback />
  }

  const columns = layout.columns || []
  const socialLinks = layout.socialLinks || []
  const copyright =
    layout.copyright || `\u00A9 ${new Date().getFullYear()} Infoshop. All rights reserved.`

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Footer Columns */}
        {columns.length > 0 && (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {columns.map((column, index) => (
              <ScrollReveal key={column.id || `column-${index}`} delay={index * 0.1}>
                <div>
                  {column.title && (
                    <h3 className="mb-4 font-heading text-lg font-semibold">{column.title}</h3>
                  )}
                  {column.links && column.links.length > 0 && (
                    <ul className="space-y-2 text-sm">
                      {column.links.map((link, linkIndex) => (
                        <li key={link.id || `link-${index}-${linkIndex}`}>
                          <Link
                            href={link.href || '#'}
                            className="text-muted-foreground hover:text-primary"
                          >
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </ScrollReveal>
            ))}
          </div>
        )}

        {/* Social Links */}
        {socialLinks.length > 0 && (
          <ScrollReveal className="mt-8 flex justify-center space-x-6">
            {socialLinks.map((social, index) => {
              const Icon = getSocialIcon(social.platform)
              return (
                <MagneticButton key={social.id || `social-${index}`} strength={0.4}>
                  <Link
                    href={social.url || '#'}
                    className="text-muted-foreground hover:text-primary"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon className="h-5 w-5" />
                    <span className="sr-only">{social.platform}</span>
                  </Link>
                </MagneticButton>
              )
            })}
          </ScrollReveal>
        )}

        {/* Copyright */}
        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>{copyright}</p>
        </div>
      </div>
    </footer>
  )
}

function getSocialIcon(platform?: string | null) {
  switch (platform) {
    case 'facebook':
      return Facebook
    case 'twitter':
      return Twitter
    case 'instagram':
      return Instagram
    case 'linkedin':
      return Linkedin
    case 'github':
      return Github
    case 'youtube':
      return Youtube
    default:
      return Twitter
  }
}

function FooterFallback() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <ScrollReveal>
            <div>
              <h3 className="mb-4 font-heading text-lg font-semibold">About Infoshop</h3>
              <p className="text-sm text-muted-foreground">
                A community-run bookstore collective promoting radical literature and independent
                publishing.
              </p>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <div>
              <h3 className="mb-4 font-heading text-lg font-semibold">Shop</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/shop" className="text-muted-foreground hover:text-primary">
                    All Books
                  </Link>
                </li>
                <li>
                  <Link
                    href="/shop/categories"
                    className="text-muted-foreground hover:text-primary"
                  >
                    Categories
                  </Link>
                </li>
                <li>
                  <Link
                    href="/shop?sort=newest"
                    className="text-muted-foreground hover:text-primary"
                  >
                    New Arrivals
                  </Link>
                </li>
              </ul>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <div>
              <h3 className="mb-4 font-heading text-lg font-semibold">Support</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/about" className="text-muted-foreground hover:text-primary">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-muted-foreground hover:text-primary">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="text-muted-foreground hover:text-primary">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.3}>
            <div>
              <h3 className="mb-4 font-heading text-lg font-semibold">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/privacy" className="text-muted-foreground hover:text-primary">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-muted-foreground hover:text-primary">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </ScrollReveal>
        </div>
        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Infoshop. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
