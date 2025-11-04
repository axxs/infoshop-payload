'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'

export function SearchBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchValue, setSearchValue] = useState(searchParams.get('search') || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams.toString())

    if (searchValue.trim()) {
      params.set('search', searchValue.trim())
    } else {
      params.delete('search')
    }

    // Reset to page 1 when searching
    params.delete('page')

    router.push(`/shop?${params.toString()}`)
  }

  const handleClear = () => {
    setSearchValue('')
    const params = new URLSearchParams(searchParams.toString())
    params.delete('search')
    params.delete('page')
    router.push(`/shop?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by title, author, or ISBN..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-10"
        />
      </div>
      <Button type="submit">Search</Button>
      {searchParams.get('search') && (
        <Button type="button" variant="outline" onClick={handleClear}>
          Clear
        </Button>
      )}
    </form>
  )
}
