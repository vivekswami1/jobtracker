'use client'

import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FloatingActionButtonProps {
  onClick: () => void
  className?: string
}

export function FloatingActionButton({ onClick, className }: FloatingActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed bottom-20 right-4 z-40 md:hidden',
        'w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg',
        'flex items-center justify-center',
        'active:scale-95 active:bg-blue-700 transition-transform',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        className
      )}
      aria-label="Add new application"
    >
      <Plus className="h-6 w-6" />
    </button>
  )
}
