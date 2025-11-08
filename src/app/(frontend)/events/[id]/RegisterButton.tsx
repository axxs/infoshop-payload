'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '../../components/ui/button'
import { EventAttendance } from '@/payload-types'
import { registerForEvent, cancelRegistration } from '@/lib/events'

interface RegisterButtonProps {
  eventId: number
  userId?: number
  userRegistration: EventAttendance | null
  isCancelled: boolean
  isCompleted: boolean
  isFull: boolean
}

export function RegisterButton({
  eventId,
  userId,
  userRegistration,
  isCancelled,
  isCompleted,
  isFull,
}: RegisterButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleRegister = async () => {
    if (!userId) {
      router.push(`/login?redirect=/events/${eventId}`)
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await registerForEvent({ eventId, userId })

      if (!result.success) {
        setError(result.error || 'Failed to register for event')
        return
      }

      // Refresh the page to show updated registration status
      router.refresh()
    })
  }

  const handleCancel = async () => {
    if (!userId || !userRegistration) return

    if (!confirm('Are you sure you want to cancel your registration?')) {
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await cancelRegistration({
        attendanceId: userRegistration.id,
        userId,
      })

      if (!result.success) {
        setError(result.error || 'Failed to cancel registration')
        return
      }

      // Refresh the page to show updated registration status
      router.refresh()
    })
  }

  // User is already registered
  if (userRegistration) {
    const isWaitlisted = userRegistration.status === 'WAITLIST'

    return (
      <div className="space-y-2">
        <Button
          onClick={handleCancel}
          disabled={isPending}
          variant="destructive"
          className="w-full"
        >
          {isPending ? 'Cancelling...' : 'Cancel Registration'}
        </Button>
        {isWaitlisted && (
          <p className="text-center text-sm text-muted-foreground">
            You are on the waitlist. We&apos;ll notify you if a spot opens up.
          </p>
        )}
        {error && <p className="text-center text-sm text-destructive">{error}</p>}
      </div>
    )
  }

  // Event is cancelled or completed
  if (isCancelled || isCompleted) {
    return (
      <Button disabled className="w-full">
        {isCancelled ? 'Event Cancelled' : 'Event Ended'}
      </Button>
    )
  }

  // User not logged in
  if (!userId) {
    return (
      <Button onClick={handleRegister} className="w-full">
        Sign In to Register
      </Button>
    )
  }

  // Normal registration
  return (
    <div className="space-y-2">
      <Button onClick={handleRegister} disabled={isPending} className="w-full">
        {isPending ? 'Registering...' : isFull ? 'Join Waitlist' : 'Register for Event'}
      </Button>
      {error && <p className="text-center text-sm text-destructive">{error}</p>}
    </div>
  )
}
