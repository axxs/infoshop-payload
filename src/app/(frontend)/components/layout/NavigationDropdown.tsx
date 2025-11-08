'use client'

import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'

interface NavigationItem {
  label: string
  href: string
  id?: string | null
}

interface NavigationDropdownProps {
  label: string
  href: string
  items: NavigationItem[]
}

export function NavigationDropdown({ label, href, items }: NavigationDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium transition-colors hover:text-primary">
        {label}
        <ChevronDown className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem asChild>
          <Link href={href} className="w-full">
            View All {label}
          </Link>
        </DropdownMenuItem>
        {items.map((item) => (
          <DropdownMenuItem key={item.id || item.href} asChild>
            <Link href={item.href} className="w-full">
              {item.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
