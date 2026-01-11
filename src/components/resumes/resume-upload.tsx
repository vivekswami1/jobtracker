'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, Loader2, FileText, CheckCircle, X } from 'lucide-react'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export function ResumeUpload() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [uploading, setUploading] = useState(false)
  const [resumeName, setResumeName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    setError('')
    setUploadStatus('idle')
    setUploadProgress(0)

    if (selectedFile) {
      // Validate file type
      if (selectedFile.type !== 'application/pdf') {
        setError('Please upload a PDF file')
        return
      }

      // Validate file size
      if (selectedFile.size > MAX_FILE_SIZE) {
        setError(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`)
        return
      }

      setFile(selectedFile)

      // Auto-fill resume name if empty
      if (!resumeName) {
        const nameWithoutExtension = selectedFile.name.replace(/\.pdf$/i, '')
        setResumeName(nameWithoutExtension)
      }
    }
  }

  const clearFile = () => {
    setFile(null)
    setResumeName('')
    setUploadProgress(0)
    setUploadStatus('idle')
    setError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUpload = async () => {
    if (!file || !resumeName.trim()) {
      setError('Please provide a resume name and select a file')
      return
    }

    setUploading(true)
    setUploadStatus('uploading')
    setUploadProgress(10)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('resumeName', resumeName.trim())

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

      // Reset form after short delay to show success
      setTimeout(() => {
        setFile(null)
        setResumeName('')
        setUploadProgress(0)
        setUploadStatus('idle')
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        router.refresh()
      }, 1500)
    } catch (err) {
      console.error('Upload failed:', err)
      setUploadStatus('error')
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(`Failed to upload resume: ${message}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Upload New Resume</h3>

      <div className="space-y-4">
        {/* File Drop Zone / Selection */}
        {!file ? (
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-10 w-10 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600 font-medium">Click to upload resume</p>
            <p className="text-sm text-gray-400 mt-1">PDF only, max 5MB</p>
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
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <FileText className="h-6 w-6 text-blue-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={clearFile}
                disabled={uploading}
                className="text-gray-400 hover:text-red-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Upload Progress Bar */}
            {uploadStatus === 'uploading' && (
              <div className="mt-4">
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
              <p className="mt-3 text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Uploaded successfully
              </p>
            )}
          </div>
        )}

        {/* Resume Name Input */}
        {file && uploadStatus !== 'success' && (
          <div className="space-y-2">
            <Label htmlFor="resumeName">Resume Name</Label>
            <Input
              id="resumeName"
              placeholder="e.g., Backend Engineer Resume"
              value={resumeName}
              onChange={(e) => setResumeName(e.target.value)}
              disabled={uploading}
            />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {/* Upload Button */}
        {file && uploadStatus !== 'success' && (
          <Button
            onClick={handleUpload}
            disabled={uploading || !file || !resumeName.trim()}
            className="w-full"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Upload Resume
          </Button>
        )}
      </div>
    </div>
  )
}
