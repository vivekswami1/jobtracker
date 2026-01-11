'use client'

import { useState } from 'react'
import { ApplicationCard } from './application-card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { JobApplicationWithDetails, ApplicationStatus } from '@/types/database'

const FILTER_OPTIONS: { value: ApplicationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'applied', label: 'Applied' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'oa', label: 'OA' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
]

interface ApplicationListProps {
  applications: JobApplicationWithDetails[]
}

export function ApplicationList({ applications }: ApplicationListProps) {
  const [filter, setFilter] = useState<ApplicationStatus | 'all'>('all')

  const filtered =
    filter === 'all'
      ? applications
      : applications.filter((app) => app.application_status === filter)

  // Count applications by status
  const statusCounts = applications.reduce((acc, app) => {
    acc[app.application_status] = (acc[app.application_status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div>
      {/* Filter Buttons */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTER_OPTIONS.map((option) => {
          const count = option.value === 'all'
            ? applications.length
            : statusCounts[option.value] || 0

          return (
            <Button
              key={option.value}
              variant={filter === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(option.value)}
              className={cn(
                'capitalize',
                filter === option.value && 'shadow-sm'
              )}
            >
              {option.label}
              {count > 0 && (
                <span className={cn(
                  'ml-1.5 text-xs px-1.5 py-0.5 rounded-full',
                  filter === option.value
                    ? 'bg-white/20'
                    : 'bg-gray-100'
                )}>
                  {count}
                </span>
              )}
            </Button>
          )
        })}
      </div>

      {/* Application Cards */}
      <div className="space-y-3">
        {filtered.map((app) => (
          <ApplicationCard key={app.application_id} application={app} />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">
              {applications.length === 0
                ? 'No applications yet. Add your first job application!'
                : `No ${filter} applications found.`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
