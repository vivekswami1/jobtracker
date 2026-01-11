'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { FileText, Eye, Trash2, Loader2, Download, Edit } from 'lucide-react'
import type { Resume } from '@/types/database'

// Dynamically import PDF components to avoid SSR issues
const PDFViewerModal = dynamic(
  () => import('@/components/pdf/pdf-viewer-modal').then(mod => ({ default: mod.PDFViewerModal })),
  { ssr: false }
)
const PDFEditorModal = dynamic(
  () => import('@/components/pdf/pdf-editor-modal').then(mod => ({ default: mod.PDFEditorModal })),
  { ssr: false }
)

interface ResumeListProps {
  resumes: Resume[]
}

export function ResumeList({ resumes }: ResumeListProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [loadingUrlId, setLoadingUrlId] = useState<string | null>(null)

  // PDF viewer state
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false)
  const [pdfEditorOpen, setPdfEditorOpen] = useState(false)
  const [currentPdfUrl, setCurrentPdfUrl] = useState<string | null>(null)
  const [currentPdfFilename, setCurrentPdfFilename] = useState('')
  const [currentResumeId, setCurrentResumeId] = useState('')

  // Get signed URL and open in viewer
  const handleView = async (resume: Resume) => {
    setLoadingUrlId(resume.resume_id)

    try {
      const response = await fetch(`/api/resumes/${resume.resume_id}/signed-url`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get file URL')
      }

      // Open in in-app viewer
      setCurrentPdfUrl(data.url)
      setCurrentPdfFilename(data.filename || resume.resume_name + '.pdf')
      setCurrentResumeId(resume.resume_id)
      setPdfViewerOpen(true)
    } catch (error) {
      console.error('Failed to get signed URL:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to access file: ${message}`)
    } finally {
      setLoadingUrlId(null)
    }
  }

  // Download file
  const handleDownload = async (resume: Resume) => {
    setLoadingUrlId(resume.resume_id)

    try {
      const response = await fetch(`/api/resumes/${resume.resume_id}/signed-url?download=true`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get file URL')
      }

      // Trigger download
      const link = document.createElement('a')
      link.href = data.url
      link.download = data.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Failed to download:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to download file: ${message}`)
    } finally {
      setLoadingUrlId(null)
    }
  }

  // Open editor
  const handleEdit = () => {
    setPdfViewerOpen(false)
    setPdfEditorOpen(true)
  }

  // Save annotations
  const handleSaveAnnotations = async (annotations: unknown[]) => {
    console.log('Saving annotations:', annotations)
    // Implementation: save to database
  }

  // Delete resume via secure API
  const handleDelete = async (resume: Resume) => {
    if (!confirm(`Are you sure you want to delete "${resume.resume_name}"?`)) {
      return
    }

    setDeletingId(resume.resume_id)

    try {
      const response = await fetch(`/api/resumes/${resume.resume_id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete resume')
      }

      router.refresh()
    } catch (error) {
      console.error('Failed to delete resume:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to delete resume: ${message}`)
    } finally {
      setDeletingId(null)
    }
  }

  // Format file size
  const formatFileSize = (bytes: number | null | undefined): string => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  if (resumes.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No resumes uploaded yet.</p>
        <p className="text-sm text-gray-400 mt-1">
          Upload your first resume to get started.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {resumes.map((resume) => (
          <div
            key={resume.resume_id}
            className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{resume.resume_name}</p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>
                    {new Date(resume.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  {resume.file_size && (
                    <>
                      <span>•</span>
                      <span>{formatFileSize(resume.file_size)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleView(resume)}
                disabled={loadingUrlId === resume.resume_id}
                className="text-gray-500 hover:text-blue-600"
                title="View PDF"
              >
                {loadingUrlId === resume.resume_id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDownload(resume)}
                disabled={loadingUrlId === resume.resume_id}
                className="text-gray-500 hover:text-green-600"
                title="Download PDF"
              >
                <Download className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(resume)}
                disabled={deletingId === resume.resume_id}
                className="text-gray-500 hover:text-red-600"
                title="Delete resume"
              >
                {deletingId === resume.resume_id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* PDF Viewer Modal */}
      <PDFViewerModal
        open={pdfViewerOpen}
        onOpenChange={setPdfViewerOpen}
        pdfUrl={currentPdfUrl}
        filename={currentPdfFilename}
        resumeId={currentResumeId}
        onEdit={handleEdit}
      />

      {/* PDF Editor Modal */}
      <PDFEditorModal
        open={pdfEditorOpen}
        onOpenChange={setPdfEditorOpen}
        pdfUrl={currentPdfUrl}
        filename={currentPdfFilename}
        resumeId={currentResumeId}
        onSave={handleSaveAnnotations}
      />
    </>
  )
}
