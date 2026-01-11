'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Loader2, Sparkles } from 'lucide-react'
import type { JobApplicationWithDetails, ApplicationStatus } from '@/types/database'

interface EditApplicationModalProps {
  application: JobApplicationWithDetails
  open: boolean
  onOpenChange: (open: boolean) => void
}

const STATUSES: { value: ApplicationStatus; label: string }[] = [
  { value: 'applied', label: 'Applied' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'oa', label: 'OA' },
  { value: 'interview', label: 'Interview' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'offer', label: 'Offer' },
]

export function EditApplicationModal({ application, open, onOpenChange }: EditApplicationModalProps) {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [parsing, setParsing] = useState(false)

  // Form state - initialized from application
  const [jobDescription, setJobDescription] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [status, setStatus] = useState<ApplicationStatus>('applied')
  const [jobUrl, setJobUrl] = useState('')
  const [location, setLocation] = useState('')
  const [salaryRange, setSalaryRange] = useState('')
  const [atsKeywords, setAtsKeywords] = useState<string[]>([])
  const [notes, setNotes] = useState('')

  // Initialize form when application changes or modal opens
  useEffect(() => {
    if (open && application) {
      setJobDescription(application.job_description || '')
      setJobTitle(application.job_title)
      setCompanyName(application.company_name)
      setStatus(application.application_status)
      setJobUrl(application.job_url || '')
      setLocation(application.location || '')
      setSalaryRange(application.salary_range || '')
      setAtsKeywords(application.ats_keywords || [])
      setNotes(application.notes || '')
    }
  }, [open, application])

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

      // Update job application
      const { error } = await supabase
        .from('job_applications')
        .update({
          job_title: jobTitle.trim(),
          company_name: companyName.trim(),
          application_status: status,
          job_url: jobUrl.trim() || null,
          job_description: jobDescription.trim() || null,
          location: location.trim() || null,
          salary_range: salaryRange.trim() || null,
          ats_keywords: atsKeywords.length > 0 ? atsKeywords : null,
          notes: notes.trim() || null,
        })
        .eq('application_id', application.application_id)

      if (error) throw error

      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error('Failed to update application:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to update application: ${message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Job Application</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Job Description with AI Parse */}
          <div className="space-y-2">
            <Label htmlFor="edit-jobDescription">Job Description</Label>
            <div className="flex gap-2">
              <Textarea
                id="edit-jobDescription"
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
              <Label htmlFor="edit-jobTitle">
                Job Role <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-jobTitle"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Software Engineer"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-companyName">
                Company Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Google"
                required
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="edit-status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ApplicationStatus)}>
              <SelectTrigger id="edit-status">
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

          {/* Job URL & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-jobUrl">Job URL (optional)</Label>
              <Input
                id="edit-jobUrl"
                type="url"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-location">Location (optional)</Label>
              <Input
                id="edit-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Remote / San Francisco, CA"
              />
            </div>
          </div>

          {/* Salary Range */}
          <div className="space-y-2">
            <Label htmlFor="edit-salaryRange">Salary Range (optional)</Label>
            <Input
              id="edit-salaryRange"
              value={salaryRange}
              onChange={(e) => setSalaryRange(e.target.value)}
              placeholder="e.g., $120,000 - $150,000 / year"
            />
          </div>

          {/* ATS Keywords */}
          {atsKeywords.length > 0 && (
            <div className="space-y-2">
              <Label>ATS Keywords</Label>
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
            <Label htmlFor="edit-notes">Notes (optional)</Label>
            <Textarea
              id="edit-notes"
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
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !jobTitle.trim() || !companyName.trim()}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
