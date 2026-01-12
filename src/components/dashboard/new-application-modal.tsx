'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Sparkles, Plus, Upload, FileText, X, CheckCircle } from 'lucide-react'
import type { Resume, ApplicationStatus } from '@/types/database'

interface NewApplicationModalProps {
  resumes: Resume[]
}

const STATUSES: { value: ApplicationStatus; label: string }[] = [
  { value: 'applied', label: 'Applied' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'oa', label: 'OA' },
  { value: 'interview', label: 'Interview' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'offer', label: 'Offer' },
]

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export function NewApplicationModal({ resumes }: NewApplicationModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')

  // Form state
  const [jobDescription, setJobDescription] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [status, setStatus] = useState<ApplicationStatus>('applied')

  // Resume selection state
  const [resumeSource, setResumeSource] = useState<'existing' | 'upload'>('existing')
  const [selectedResumeId, setSelectedResumeId] = useState<string>('')
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [resumeName, setResumeName] = useState('')
  const [jobUrl, setJobUrl] = useState('')
  const [location, setLocation] = useState('')
  const [salaryRange, setSalaryRange] = useState('')
  const [atsKeywords, setAtsKeywords] = useState<string[]>([])
  const [notes, setNotes] = useState('')

  const resetForm = () => {
    setJobDescription('')
    setJobTitle('')
    setCompanyName('')
    setStatus('applied')
    setResumeSource('existing')
    setSelectedResumeId('')
    setResumeFile(null)
    setResumeName('')
    setJobUrl('')
    setLocation('')
    setSalaryRange('')
    setAtsKeywords([])
    setNotes('')
    setUploadProgress(0)
    setUploadStatus('idle')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (file.type !== 'application/pdf') {
        alert('Please upload a PDF file')
        return
      }
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        alert(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`)
        return
      }
      setResumeFile(file)
      setUploadStatus('idle')
      setUploadProgress(0)
      // Auto-fill resume name from file name
      if (!resumeName) {
        setResumeName(file.name.replace(/\.pdf$/i, ''))
      }
    }
  }

  const clearFile = () => {
    setResumeFile(null)
    setResumeName('')
    setUploadProgress(0)
    setUploadStatus('idle')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleAIParse = async () => {
    if (!jobDescription.trim()) return

    setParsing(true)
    try {
      const res = await fetch('/api/parse-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to parse job description')
      }

      if (data.jobTitle) setJobTitle(data.jobTitle)
      if (data.companyName) setCompanyName(data.companyName)
      if (data.location) setLocation(data.location)
      if (data.atsKeywords) setAtsKeywords(data.atsKeywords)
    } catch (error) {
      console.error('Failed to parse JD:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to parse job description: ${message}`)
    } finally {
      setParsing(false)
    }
  }

  const uploadResumeSecurely = async (): Promise<string | null> => {
    if (!resumeFile) return null

    setUploadStatus('uploading')
    setUploadProgress(10)

    try {
      const formData = new FormData()
      formData.append('file', resumeFile)
      formData.append('resumeName', resumeName.trim() || resumeFile.name.replace(/\.pdf$/i, ''))

      setUploadProgress(30)

      const response = await fetch('/api/resumes/upload', {
        method: 'POST',
        body: formData,
      })

      setUploadProgress(70)

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      setUploadProgress(100)
      setUploadStatus('success')

      return result.resume.resume_id
    } catch (error) {
      setUploadStatus('error')
      throw error
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!jobTitle.trim() || !companyName.trim()) {
      alert('Please fill in the required fields')
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }

      // Determine resume ID based on source
      let finalResumeId: string | null = null
      if (resumeSource === 'existing' && selectedResumeId) {
        finalResumeId = selectedResumeId
      } else if (resumeSource === 'upload' && resumeFile) {
        finalResumeId = await uploadResumeSecurely()
      }

      // Create job application
      const { error } = await supabase.from('job_applications').insert({
        user_id: user.id,
        job_title: jobTitle.trim(),
        company_name: companyName.trim(),
        application_status: status,
        resume_id: finalResumeId,
        job_url: jobUrl.trim() || null,
        job_description: jobDescription.trim() || null,
        location: location.trim() || null,
        salary_range: salaryRange.trim() || null,
        ats_keywords: atsKeywords.length > 0 ? atsKeywords : null,
        notes: notes.trim() || null,
      })

      if (error) throw error

      setOpen(false)
      resetForm()
      router.refresh()
    } catch (error) {
      console.error('Failed to save application:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to save application: ${message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Application
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Job Application</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Job Description with AI Parse */}
          <div className="space-y-2">
            <Label htmlFor="jobDescription">Job Description</Label>
            <div className="flex gap-2">
              <Textarea
                id="jobDescription"
                placeholder="Paste the job description here to auto-fill fields..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={4}
                className="flex-1 resize-none"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleAIParse}
                disabled={parsing || !jobDescription.trim()}
                className="self-start whitespace-nowrap"
              >
                {parsing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span className="ml-2">AI Parse</span>
              </Button>
            </div>
          </div>

          {/* Job Title & Company */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jobTitle">
                Job Role <span className="text-red-500">*</span>
              </Label>
              <Input
                id="jobTitle"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Software Engineer"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">
                Company Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Google"
                required
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ApplicationStatus)}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Resume Selection */}
          <div className="space-y-3">
            <Label>Resume (optional)</Label>

            {/* Source Toggle */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setResumeSource('existing')
                  clearFile()
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  resumeSource === 'existing'
                    ? 'bg-white shadow text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FileText className="h-4 w-4" />
                Select Saved Resume
              </button>
              <button
                type="button"
                onClick={() => {
                  setResumeSource('upload')
                  setSelectedResumeId('')
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  resumeSource === 'upload'
                    ? 'bg-white shadow text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Upload className="h-4 w-4" />
                Upload New
              </button>
            </div>

            {/* Existing Resume Selection */}
            {resumeSource === 'existing' && (
              <div className="space-y-2">
                {resumes.length > 0 ? (
                  <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a resume..." />
                    </SelectTrigger>
                    <SelectContent>
                      {resumes.map((resume) => (
                        <SelectItem key={resume.resume_id} value={resume.resume_id}>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-600" />
                            <span>{resume.resume_name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-4 text-center">
                    <FileText className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">No saved resumes</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Upload a new resume or save one in the Resumes section
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Upload New Resume */}
            {resumeSource === 'upload' && (
              <>
                {!resumeFile ? (
                  <div
                    className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">Click to upload resume</p>
                    <p className="text-xs text-gray-400 mt-1">PDF only, max 5MB</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded">
                          {uploadStatus === 'success' ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <FileText className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{resumeFile.name}</p>
                          <p className="text-xs text-gray-500">
                            {(resumeFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={clearFile}
                        disabled={uploadStatus === 'uploading'}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Upload Progress Bar */}
                    {uploadStatus === 'uploading' && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>Uploading...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {uploadStatus === 'success' && (
                      <p className="mt-2 text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Uploaded successfully
                      </p>
                    )}

                    <div className="mt-3">
                      <Label htmlFor="resumeName" className="text-xs">Resume Name</Label>
                      <Input
                        id="resumeName"
                        value={resumeName}
                        onChange={(e) => setResumeName(e.target.value)}
                        placeholder="e.g., Frontend Developer Resume"
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Job URL & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jobUrl">Job URL (optional)</Label>
              <Input
                id="jobUrl"
                type="url"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location (optional)</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Remote / San Francisco, CA"
              />
            </div>
          </div>

          {/* Salary Range */}
          <div className="space-y-2">
            <Label htmlFor="salaryRange">Salary Range (optional)</Label>
            <Input
              id="salaryRange"
              value={salaryRange}
              onChange={(e) => setSalaryRange(e.target.value)}
              placeholder="e.g., $120,000 - $150,000 / year"
            />
          </div>

          {/* ATS Keywords */}
          {atsKeywords.length > 0 && (
            <div className="space-y-2">
              <Label>ATS Keywords (from AI)</Label>
              <div className="flex flex-wrap gap-2">
                {atsKeywords.map((keyword, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm cursor-pointer hover:bg-blue-200"
                    onClick={() => setAtsKeywords(atsKeywords.filter((_, idx) => idx !== i))}
                    title="Click to remove"
                  >
                    {keyword} ×
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Referral, key contacts, interview prep notes..."
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !jobTitle.trim() || !companyName.trim()}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Application
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
