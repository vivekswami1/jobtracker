'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NewApplicationModal } from './new-application-modal'
import type { Resume } from '@/types/database'

interface DashboardHeaderProps {
  resumes: Resume[]
  totalCount: number
}

export function DashboardHeader({ resumes, totalCount }: DashboardHeaderProps) {
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('highlight')
  const [modalOpen, setModalOpen] = useState(false)

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
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Applications
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-0.5 sm:mt-1">
            {totalCount} total application{totalCount !== 1 ? 's' : ''}
          </p>
        </div>
        {/* Desktop button - hidden on mobile */}
        <Button onClick={() => setModalOpen(true)} className="hidden sm:flex">
          <Plus className="h-4 w-4 mr-2" />
          New Application
        </Button>
      </div>

      {/* Floating Action Button for Mobile */}
      <button
        onClick={() => setModalOpen(true)}
        className="fixed bottom-24 right-4 z-40 sm:hidden w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center active:scale-95 active:bg-blue-700 transition-transform focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label="Add new application"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* New Application Modal */}
      <NewApplicationModal
        resumes={resumes}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  )
}
