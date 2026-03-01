import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'

export const metadata: Metadata = {
  title: 'Inquiry Sent',
}

export default function InquirySentPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <Mail className="h-10 w-10 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Inquiry Sent!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              Thank you for your interest. We&apos;ve received your inquiry and will get back to you
              as soon as possible.
            </p>

            <p className="text-sm text-muted-foreground">
              We&apos;ll review your inquiry and get in touch. If you don&apos;t hear from us
              within a few business days, feel free to reach out directly.
            </p>

            <div className="flex flex-col gap-2 pt-4">
              <Button asChild>
                <Link href="/shop">Continue Browsing</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/">Back to Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
