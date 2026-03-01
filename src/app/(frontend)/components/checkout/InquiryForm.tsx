'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Send } from 'lucide-react'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { submitInquiry } from '@/lib/checkout/inquiryActions'

interface InquiryFormProps {
  disabledMessage: string
}

export function InquiryForm({ disabledMessage }: InquiryFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const trimmedName = customerName.trim()
    const trimmedEmail = customerEmail.trim()

    if (!trimmedName) {
      setError('Name is required')
      setIsSubmitting(false)
      return
    }

    if (!trimmedEmail) {
      setError('Email is required')
      setIsSubmitting(false)
      return
    }

    try {
      const result = await submitInquiry({
        customerName: trimmedName,
        customerEmail: trimmedEmail,
        message: message.trim(),
      })

      if (!result.success) {
        setError(result.error)
        return
      }

      router.push('/checkout/inquiry-sent')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send an Inquiry</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
          {disabledMessage}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="inquiry-name" className="block text-sm font-medium mb-2">
              Name <span className="text-destructive">*</span>
            </label>
            <Input
              id="inquiry-name"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
              maxLength={200}
              placeholder="Your name"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="inquiry-email" className="block text-sm font-medium mb-2">
              Email <span className="text-destructive">*</span>
            </label>
            <Input
              id="inquiry-email"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              required
              placeholder="you@example.com"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="inquiry-message" className="block text-sm font-medium mb-2">
              Message <span className="text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              id="inquiry-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
              placeholder="Any additional details or questions..."
              disabled={isSubmitting}
            />
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending Inquiry...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Inquiry
              </>
            )}
          </Button>
        </form>

        {error && (
          <div role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
