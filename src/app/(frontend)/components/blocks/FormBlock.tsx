import { getPayload } from 'payload'
import config from '@payload-config'
import { Mail } from 'lucide-react'
import { Card, CardContent } from '../ui/card'
import { ContactForm } from '../../contact/ContactForm'

interface FormBlockProps {
  blockType: 'formBlock'
  formType: 'contact'
  title?: string | null
  description?: string | null
  showContactInfo?: boolean | null
}

export async function FormBlock({ title, description, showContactInfo }: FormBlockProps) {
  const showSidebar = showContactInfo !== false

  let contactEmail: string | undefined
  let socialLinks: { platform: string; url: string; id?: string | null }[] | null = null

  if (showSidebar) {
    const payload = await getPayload({ config })

    const [theme, layout] = await Promise.all([
      payload.findGlobal({ slug: 'theme' }) as Promise<{ contactEmail?: string }>,
      payload.findGlobal({ slug: 'layout' }) as Promise<{
        socialLinks?: { platform: string; url: string; id?: string | null }[] | null
      }>,
    ])

    contactEmail = theme?.contactEmail
    socialLinks = layout?.socialLinks ?? null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {(title || description) && (
        <div className="mb-8">
          {title && <h2 className="font-heading text-3xl font-bold">{title}</h2>}
          {description && <p className="mt-2 text-muted-foreground">{description}</p>}
        </div>
      )}

      <div className={showSidebar ? 'grid gap-8 lg:grid-cols-3' : ''}>
        <div className={showSidebar ? 'lg:col-span-2' : ''}>
          <ContactForm />
        </div>

        {showSidebar && (
          <div className="space-y-6">
            {contactEmail && (
              <Card>
                <CardContent className="flex items-start gap-4 p-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold">Email</h3>
                    <a
                      href={`mailto:${contactEmail}`}
                      className="text-sm text-muted-foreground hover:text-primary"
                    >
                      {contactEmail}
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}

            {socialLinks && socialLinks.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="mb-3 font-heading font-semibold">Follow Us</h3>
                  <div className="flex flex-wrap gap-3">
                    {socialLinks.map((link) => (
                      <a
                        key={link.id ?? link.platform}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md border px-3 py-1.5 text-sm capitalize text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        {link.platform}
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
