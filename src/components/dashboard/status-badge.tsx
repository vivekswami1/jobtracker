import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ApplicationStatus } from '@/types/database'

const statusConfig: Record<ApplicationStatus, { label: string; className: string }> = {
  applied: {
    label: 'Applied',
    className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  },
  shortlisted: {
    label: 'Shortlisted',
    className: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
  },
  oa: {
    label: 'OA',
    className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  },
  interview: {
    label: 'Interview',
    className: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-800 hover:bg-red-100',
  },
  offer: {
    label: 'Offer',
    className: 'bg-green-100 text-green-800 hover:bg-green-100',
  },
}

interface StatusBadgeProps {
  status: ApplicationStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.applied

  return (
    <Badge variant="secondary" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  )
}
