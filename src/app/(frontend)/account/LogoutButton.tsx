'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Button } from '../components/ui/button'
import { logoutUser } from '@/lib/auth/actions'

export function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    await logoutUser()
    router.push('/login')
    router.refresh()
  }

  return (
    <Button variant="outline" onClick={handleLogout}>
      <LogOut className="mr-2 h-4 w-4" />
      Sign Out
    </Button>
  )
}
