import { getPayload } from 'payload'
import config from '@payload-config'
import { Mail, MapPin } from 'lucide-react'
import { Card, CardContent } from '../components/ui/card'
import { ContactForm } from './ContactForm'
import { ScrollReveal } from '../components/cinematic/ScrollReveal'

export default async function ContactPage() {
  const payload = await getPayload({ config })

  const theme = (await payload.findGlobal({ slug: 'theme' })) as {
    contactEmail?: string
  }

  const layout = (await payload.findGlobal({ slug: 'layout' })) as {
    socialLinks?:
      | { platform: string; url: string; id?: string | null }[]
      | null
  }

  const contactEmail = theme?.contactEmail
  const socialLinks = layout?.socialLinks

  return (
    <div className="container mx-auto px-4 py-8">
      <ScrollReveal className="mb-8">
        <h1 className="font-heading text-3xl font-bold">Contact Us</h1>
        <p className="mt-2 text-muted-foreground">
          Have a question about a book, want to place a special order, or just want to say hello? We&apos;d love to hear from you.
        </p>
      </ScrollReveal>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ContactForm />
        </div>

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

          <Card>
            <CardContent className="flex items-start gap-4 p-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-heading font-semibold">Visit Us</h3>
                <p className="text-sm text-muted-foreground">
                  Just Books Belfast
                </p>
              </div>
            </CardContent>
          </Card>

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
      </div>
    </div>
  )
}
