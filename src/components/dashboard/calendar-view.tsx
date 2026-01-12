'use client'

import { useMemo, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { JobApplicationWithDetails, ApplicationStatus } from '@/types/database'

interface CalendarViewProps {
  applications: JobApplicationWithDetails[]
}

// Hook to detect mobile viewport
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}

// Status color mapping
const STATUS_COLORS: Record<ApplicationStatus, { bg: string; border: string; text: string }> = {
  applied: { bg: '#3B82F6', border: '#2563EB', text: '#FFFFFF' },      // Blue
  shortlisted: { bg: '#06B6D4', border: '#0891B2', text: '#FFFFFF' },  // Cyan
  oa: { bg: '#F97316', border: '#EA580C', text: '#FFFFFF' },           // Orange
  interview: { bg: '#8B5CF6', border: '#7C3AED', text: '#FFFFFF' },    // Purple
  rejected: { bg: '#EF4444', border: '#DC2626', text: '#FFFFFF' },     // Red
  offer: { bg: '#22C55E', border: '#16A34A', text: '#FFFFFF' },        // Green
}

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied: 'Applied',
  shortlisted: 'Shortlisted',
  oa: 'OA',
  interview: 'Interview',
  rejected: 'Rejected',
  offer: 'Offer',
}

interface CalendarEvent {
  id: string
  title: string
  start: string
  backgroundColor: string
  borderColor: string
  textColor: string
  extendedProps: {
    applicationId: string
    companyName: string
    jobTitle: string
    status: ApplicationStatus
    logoUrl: string
  }
}

// Generate company favicon URL from company name
function getCompanyLogoUrl(companyName: string): string {
  const domain = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim()
  return `https://www.google.com/s2/favicons?domain=${domain}.com&sz=32`
}

export function CalendarView({ applications }: CalendarViewProps) {
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Map applications and their status history to calendar events
  const calendarEvents = useMemo<CalendarEvent[]>(() => {
    const events: CalendarEvent[] = []

    applications.forEach((app) => {
      const logoUrl = getCompanyLogoUrl(app.company_name)

      // Add applied date as first event
      const appliedColor = STATUS_COLORS['applied']
      events.push({
        id: `${app.application_id}-applied`,
        title: `${app.company_name} - ${app.job_title}`,
        start: app.applied_date,
        backgroundColor: appliedColor.bg,
        borderColor: appliedColor.border,
        textColor: appliedColor.text,
        extendedProps: {
          applicationId: app.application_id,
          companyName: app.company_name,
          jobTitle: app.job_title,
          status: 'applied',
          logoUrl,
        },
      })

      // Add status history events
      if (app.status_history && app.status_history.length > 0) {
        app.status_history.forEach((history) => {
          // Skip 'applied' status as we already added it from applied_date
          if (history.status === 'applied') return

          const color = STATUS_COLORS[history.status]
          events.push({
            id: `${app.application_id}-${history.history_id}`,
            title: `${app.company_name} - ${app.job_title}`,
            start: history.changed_at.split('T')[0],
            backgroundColor: color.bg,
            borderColor: color.border,
            textColor: color.text,
            extendedProps: {
              applicationId: app.application_id,
              companyName: app.company_name,
              jobTitle: app.job_title,
              status: history.status,
              logoUrl,
            },
          })
        })
      }
    })

    return events
  }, [applications])

  const handleEventClick = (info: any) => {
    const applicationId = info.event.extendedProps.applicationId
    router.push(`/dashboard?highlight=${applicationId}`)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Legend - scrollable on mobile */}
      <div className="bg-white border-b overflow-x-auto">
        <div className="flex items-center gap-2 md:gap-4 p-3 md:p-4 md:justify-center min-w-max">
          <span className="text-xs md:text-sm font-medium text-gray-700 shrink-0">Status:</span>
          {Object.entries(STATUS_COLORS).map(([status, colors]) => (
            <div key={status} className="flex items-center gap-1 md:gap-1.5 shrink-0">
              <div
                className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-sm"
                style={{ backgroundColor: colors.bg }}
              />
              <span className="text-xs md:text-sm text-gray-600">
                {STATUS_LABELS[status as ApplicationStatus]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 p-2 md:p-4 bg-gray-50 overflow-auto">
        <div className="bg-white rounded-lg shadow-sm p-2 md:p-6 min-h-[500px] md:min-h-[700px]">
          {isClient && (
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView={isMobile ? 'dayGridMonth' : 'dayGridMonth'}
              events={calendarEvents}
              eventClick={handleEventClick}
              headerToolbar={isMobile ? {
                left: 'prev,next',
                center: 'title',
                right: 'today',
              } : {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,dayGridWeek',
              }}
              height={isMobile ? 'auto' : 650}
              contentHeight={isMobile ? 'auto' : undefined}
              eventDisplay="block"
              dayMaxEvents={isMobile ? 2 : 3}
              moreLinkClick="popover"
              fixedWeekCount={!isMobile}
              dayHeaderFormat={isMobile ? { weekday: 'narrow' } : { weekday: 'short' }}
              titleFormat={isMobile ? { year: 'numeric', month: 'short' } : { year: 'numeric', month: 'long' }}
              eventContent={(eventInfo) => (
                <div className={`px-1 md:px-1.5 py-0.5 md:py-1 cursor-pointer overflow-hidden flex items-start gap-1 md:gap-1.5 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                  {!isMobile && (
                    <img
                      src={eventInfo.event.extendedProps.logoUrl}
                      alt=""
                      className="w-4 h-4 rounded shrink-0 mt-0.5"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">
                      {eventInfo.event.extendedProps.companyName}
                    </div>
                    {!isMobile && (
                      <div className="text-[10px] opacity-90 truncate">
                        {STATUS_LABELS[eventInfo.event.extendedProps.status as ApplicationStatus]}
                      </div>
                    )}
                  </div>
                </div>
              )}
            />
          )}
        </div>
      </div>
    </div>
  )
}
