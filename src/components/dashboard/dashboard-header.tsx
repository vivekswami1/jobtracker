'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { NewApplicationModal } from './new-application-modal'
import type { Resume } from '@/types/database'

interface DashboardHeaderProps {
  resumes: Resume[]
  totalCount: number
}

export function DashboardHeader({ resumes, totalCount }: DashboardHeaderProps) {
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('highlight')

  // Handle highlight from calendar navigation
  useEffect(() => {
    if (highlightId) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const element = document.getElementById(`application-${highlightId}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          // Add highlight effect
          element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2')
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2')
          }, 3000)
        }
      }, 100)
    }
  }, [highlightId])

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Applications
        </h1>
        <p className="text-gray-500 mt-1">
          {totalCount} total application{totalCount !== 1 ? 's' : ''}
        </p>
      </div>
      <NewApplicationModal resumes={resumes} />
    </div>
  )
}
