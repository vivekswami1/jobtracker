'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Briefcase, LayoutDashboard, FileText } from 'lucide-react'
import { UserNav } from '@/components/auth/user-nav'
import { cn } from '@/lib/utils'

interface NavbarProps {
  user: {
    email?: string
    user_metadata?: {
      full_name?: string
      avatar_url?: string
    }
  }
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/resumes', label: 'Resumes', icon: FileText },
]

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname()

  return (
    <nav className="border-b bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">JobTracker</span>
            </Link>

            {/* Nav Links */}
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* User Nav */}
          <UserNav user={user} />
        </div>
      </div>
    </nav>
  )
}
