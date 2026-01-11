'use client'

import { cn } from '@/lib/utils'
import type { ApplicationStatus, StatusHistory } from '@/types/database'

const STATUS_ORDER: ApplicationStatus[] = ['applied', 'shortlisted', 'oa', 'interview', 'offer']

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; bgColor: string; textColor: string }> = {
  applied: { label: 'Applied', bgColor: 'bg-blue-500', textColor: 'text-blue-600' },
  shortlisted: { label: 'Shortlisted', bgColor: 'bg-purple-500', textColor: 'text-purple-600' },
  oa: { label: 'OA', bgColor: 'bg-yellow-500', textColor: 'text-yellow-600' },
  interview: { label: 'Interview', bgColor: 'bg-orange-500', textColor: 'text-orange-600' },
  rejected: { label: 'Rejected', bgColor: 'bg-red-500', textColor: 'text-red-600' },
  offer: { label: 'Offer', bgColor: 'bg-green-500', textColor: 'text-green-600' },
}

interface StatusTimelineProps {
  history: StatusHistory[]
  currentStatus: ApplicationStatus
}

export function StatusTimeline({ history, currentStatus }: StatusTimelineProps) {
  const completedStatuses = new Set(history.map((h) => h.status))
  const historyMap = Object.fromEntries(
    history.map((h) => [h.status, h.changed_at])
  )

  const isRejected = currentStatus === 'rejected'

  return (
    <div className="py-2">
      <p className="text-sm font-medium text-gray-700 mb-3">Application Timeline</p>
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {STATUS_ORDER.map((status, index) => {
          const isCompleted = completedStatuses.has(status)
          const config = STATUS_CONFIG[status]
          const date = historyMap[status]

          return (
            <div key={status} className="flex items-center">
              <div className="flex flex-col items-center min-w-[70px]">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium',
                    isCompleted ? config.bgColor : 'bg-gray-300'
                  )}
                >
                  {isCompleted ? '✓' : index + 1}
                </div>
                <span className={cn(
                  'text-xs mt-1 font-medium',
                  isCompleted ? config.textColor : 'text-gray-400'
                )}>
                  {config.label}
                </span>
                {date && (
                  <span className="text-xs text-gray-500">
                    {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
              {index < STATUS_ORDER.length - 1 && (
                <div
                  className={cn(
                    'w-6 h-0.5 mx-1',
                    isCompleted && completedStatuses.has(STATUS_ORDER[index + 1])
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                  )}
                />
              )}
            </div>
          )
        })}

        {isRejected && (
          <div className="flex flex-col items-center min-w-[70px] ml-2">
            <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-medium">
              ✕
            </div>
            <span className="text-xs mt-1 font-medium text-red-600">
              Rejected
            </span>
            {historyMap['rejected'] && (
              <span className="text-xs text-gray-500">
                {new Date(historyMap['rejected']).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
