'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Button } from '../components/ui/button'
import { logoutUser } from '@/lib/auth/actions'

export function LogoutButton() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const handleLogout = async () => {
    try {
      await logoutUser()
      router.push('/login')
      router.refresh()
    } catch {
      setError('Failed to sign out. Please try again.')
    }
  }

  return (
    <div>
      <Button variant="outline" onClick={handleLogout}>
        <LogOut className="mr-2 h-4 w-4" />
        Sign Out
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
