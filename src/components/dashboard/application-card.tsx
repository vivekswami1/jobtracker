'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { ChevronDown, ChevronRight, FileText, Pencil, Trash2, Loader2, Target, CheckCircle, AlertCircle, TrendingUp, Sparkles } from 'lucide-react'
import { StatusTimeline } from './status-timeline'
import { StatusBadge } from './status-badge'
import { EditApplicationModal } from './edit-application-modal'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { JobApplicationWithDetails, ApplicationStatus } from '@/types/database'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Dynamically import PDF components to avoid SSR issues
const PDFViewerModal = dynamic(
  () => import('@/components/pdf/pdf-viewer-modal').then(mod => ({ default: mod.PDFViewerModal })),
  { ssr: false }
)
const PDFEditorModal = dynamic(
  () => import('@/components/pdf/pdf-editor-modal').then(mod => ({ default: mod.PDFEditorModal })),
  { ssr: false }
)

interface ApplicationCardProps {
  application: JobApplicationWithDetails
}

const STATUSES: { value: ApplicationStatus; label: string }[] = [
  { value: 'applied', label: 'Applied' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'oa', label: 'OA' },
  { value: 'interview', label: 'Interview' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'offer', label: 'Offer' },
]

// Generate company favicon URL from company name
function getCompanyFaviconUrl(companyName: string): string {
  // Clean company name: remove spaces, special chars, convert to lowercase
  const domain = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric
    .trim()
  return `https://www.google.com/s2/favicons?domain=${domain}.com&sz=64`
}

export function ApplicationCard({ application }: ApplicationCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [isLoadingResume, setIsLoadingResume] = useState(false)
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false)
  const [pdfEditorOpen, setPdfEditorOpen] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfFilename, setPdfFilename] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const faviconUrl = getCompanyFaviconUrl(application.company_name)

  // Open resume using signed URL in in-app viewer
  const handleViewResume = async () => {
    if (!application.resume) return

    setIsLoadingResume(true)
    try {
      const response = await fetch(`/api/resumes/${application.resume.resume_id}/signed-url`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get file URL')
      }

      // Open in in-app PDF viewer
      setPdfUrl(data.url)
      setPdfFilename(data.filename || application.resume.resume_name + '.pdf')
      setPdfViewerOpen(true)
    } catch (error) {
      console.error('Failed to open resume:', error)
      alert('Failed to open resume. Please try again.')
    } finally {
      setIsLoadingResume(false)
    }
  }

  // Open PDF editor
  const handleEditPdf = () => {
    setPdfViewerOpen(false)
    setPdfEditorOpen(true)
  }

  // Save PDF annotations
  const handleSavePdfAnnotations = async (annotations: unknown[]) => {
    // For now, just log the annotations
    // In a full implementation, you would save these to the database
    console.log('Saving annotations:', annotations)
    // Could save to a separate annotations table or embed in the PDF
  }

  const handleStatusChange = async (newStatus: ApplicationStatus) => {
    setIsUpdating(true)
    try {
      await supabase
        .from('job_applications')
        .update({ application_status: newStatus })
        .eq('application_id', application.application_id)

      router.refresh()
    } catch (error) {
      console.error('Failed to update status:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this application?')) return

    setIsDeleting(true)
    try {
      await supabase
        .from('job_applications')
        .delete()
        .eq('application_id', application.application_id)

      router.refresh()
    } catch (error) {
      console.error('Failed to delete application:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div id={`application-${application.application_id}`} className="border rounded-lg bg-white shadow-sm transition-all duration-300">
      {/* Header Row */}
      <div
        className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <button className="text-gray-400 hover:text-gray-600">
          {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </button>

        <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4 items-center">
          <div>
            <p className="font-medium text-gray-900">{application.job_title}</p>
            {/* Mobile: Company name with optional link */}
            <div className="flex items-center gap-1.5 text-sm text-gray-500 sm:hidden" onClick={(e) => e.stopPropagation()}>
              <img
                src={faviconUrl}
                alt=""
                className="h-4 w-4 rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
              {application.job_url ? (
                <a
                  href={application.job_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 hover:underline"
                >
                  {application.company_name}
                </a>
              ) : (
                <span>{application.company_name}</span>
              )}
            </div>
          </div>
          {/* Desktop: Company name with optional link */}
          <div className="text-gray-600 hidden sm:flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <img
              src={faviconUrl}
              alt=""
              className="h-5 w-5 rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
            {application.job_url ? (
              <a
                href={application.job_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-600 hover:underline"
              >
                {application.company_name}
              </a>
            ) : (
              <span>{application.company_name}</span>
            )}
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <Select
              value={application.application_status}
              onValueChange={handleStatusChange}
              disabled={isUpdating}
            >
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue>
                  <StatusBadge status={application.application_status} />
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {application.resume && (
              <button
                onClick={handleViewResume}
                disabled={isLoadingResume}
                className="flex items-center gap-1 text-sm text-blue-600 hover:underline disabled:opacity-50"
              >
                {isLoadingResume ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">{application.resume.resume_name}</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-blue-600"
            onClick={() => setEditModalOpen(true)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-red-600"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 border-t">
          <div className="pt-4">
            <StatusTimeline
              history={application.status_history}
              currentStatus={application.application_status}
            />
          </div>

          {/* Additional Info */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Applied Date</p>
              <p className="font-medium">
                {new Date(application.applied_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            {application.location && (
              <div>
                <p className="text-gray-500">Location</p>
                <p className="font-medium">{application.location}</p>
              </div>
            )}
            {application.salary_range && (
              <div>
                <p className="text-gray-500">Salary Range</p>
                <p className="font-medium text-green-600">{application.salary_range}</p>
              </div>
            )}
          </div>

          {/* ATS Keywords */}
          {application.ats_keywords && application.ats_keywords.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-2">ATS Keywords</p>
              <div className="flex flex-wrap gap-1">
                {application.ats_keywords.map((keyword, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {application.notes && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{application.notes}</p>
            </div>
          )}

          {/* ATS Analytics Section */}
          {application.ats_keywords && application.ats_keywords.length > 0 && (
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">ATS Analysis</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* ATS Score */}
                <div className="bg-white rounded-lg p-3 border shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12">
                      <svg className="w-12 h-12 -rotate-90">
                        <circle
                          cx="24"
                          cy="24"
                          r="20"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="4"
                        />
                        <circle
                          cx="24"
                          cy="24"
                          r="20"
                          fill="none"
                          className="stroke-blue-500"
                          strokeWidth="4"
                          strokeDasharray={`${(70 / 100) * 125} 125`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600">70</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">ATS Score</p>
                      <p className="text-sm font-medium text-gray-900">Good Match</p>
                    </div>
                  </div>
                </div>

                {/* Keywords Count */}
                <div className="bg-white rounded-lg p-3 border shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <p className="text-xs text-gray-500">Keywords</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{application.ats_keywords.length}</p>
                  <p className="text-xs text-gray-500">tracked keywords</p>
                </div>

                {/* Suggestions */}
                <div className="bg-white rounded-lg p-3 border shadow-sm sm:col-span-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    <p className="text-xs text-gray-500">Optimization Tips</p>
                  </div>
                  <ul className="space-y-1">
                    <li className="flex items-start gap-2 text-xs text-gray-600">
                      <TrendingUp className="h-3 w-3 mt-0.5 text-purple-500 shrink-0" />
                      Add quantifiable achievements
                    </li>
                    <li className="flex items-start gap-2 text-xs text-gray-600">
                      <TrendingUp className="h-3 w-3 mt-0.5 text-purple-500 shrink-0" />
                      Include relevant certifications
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      <EditApplicationModal
        application={application}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
      />

      {/* PDF Viewer Modal */}
      {application.resume && (
        <PDFViewerModal
          open={pdfViewerOpen}
          onOpenChange={setPdfViewerOpen}
          pdfUrl={pdfUrl}
          filename={pdfFilename}
          resumeId={application.resume.resume_id}
          onEdit={handleEditPdf}
          atsKeywords={application.ats_keywords || []}
          jobTitle={application.job_title}
          companyName={application.company_name}
        />
      )}

      {/* PDF Editor Modal */}
      {application.resume && (
        <PDFEditorModal
          open={pdfEditorOpen}
          onOpenChange={setPdfEditorOpen}
          pdfUrl={pdfUrl}
          filename={pdfFilename}
          resumeId={application.resume.resume_id}
          onSave={handleSavePdfAnnotations}
        />
      )}
    </div>
  )
}
