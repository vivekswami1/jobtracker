'use client'

import { useState, useEffect } from 'react'
import { Worker, Viewer, SpecialZoomLevel } from '@react-pdf-viewer/core'
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout'
import { Button } from '@/components/ui/button'
import {
  X,
  Download,
  Edit,
  Loader2,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Target,
  FileText,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Sparkles
} from 'lucide-react'

import '@react-pdf-viewer/core/lib/styles/index.css'
import '@react-pdf-viewer/default-layout/lib/styles/index.css'

interface ATSAnalysis {
  score: number
  matchedKeywords: string[]
  missingKeywords: string[]
  suggestions: string[]
  stats: {
    wordCount: number
    pageCount: number
    sections: string[]
  }
}

interface PDFViewerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pdfUrl: string | null
  filename: string
  resumeId: string
  onEdit?: () => void
  atsKeywords?: string[]
  jobTitle?: string
  companyName?: string
}

export function PDFViewerModal({
  open,
  onOpenChange,
  pdfUrl,
  filename,
  resumeId,
  onEdit,
  atsKeywords = [],
  jobTitle,
  companyName,
}: PDFViewerModalProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<ATSAnalysis | null>(null)

  // Create default layout plugin instance with responsive settings
  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    sidebarTabs: (defaultTabs) => [],
    toolbarPlugin: {
      fullScreenPlugin: {
        onEnterFullScreen: (zoom) => {
          zoom(SpecialZoomLevel.PageFit)
        },
        onExitFullScreen: (zoom) => {
          zoom(SpecialZoomLevel.PageFit)
        },
      },
    },
  })

  // Mock ATS analysis - in production, this would call an API
  useEffect(() => {
    // Only run when modal opens, not on every render
    if (!open) {
      setAnalysis(null)
      setIsAnalyzing(false)
      return
    }

    // Skip if already analyzing or has analysis
    if (isAnalyzing || analysis) return

    if (atsKeywords && atsKeywords.length > 0) {
      setIsAnalyzing(true)
      // Simulate API call delay
      const timer = setTimeout(() => {
        // Mock analysis based on provided keywords
        const matchedCount = Math.floor(atsKeywords.length * 0.7)
        const matched = atsKeywords.slice(0, matchedCount)
        const missing = atsKeywords.slice(matchedCount)

        setAnalysis({
          score: Math.floor(65 + Math.random() * 25),
          matchedKeywords: matched,
          missingKeywords: missing,
          suggestions: [
            'Add more quantifiable achievements',
            'Include relevant certifications',
            'Optimize section headings for ATS',
          ],
          stats: {
            wordCount: 450 + Math.floor(Math.random() * 200),
            pageCount: 1,
            sections: ['Contact', 'Experience', 'Education', 'Skills'],
          },
        })
        setIsAnalyzing(false)
      }, 1500)
      return () => clearTimeout(timer)
    } else {
      // Default analysis when no keywords provided
      setAnalysis({
        score: 72,
        matchedKeywords: ['JavaScript', 'React', 'TypeScript', 'Node.js'],
        missingKeywords: ['AWS', 'Docker'],
        suggestions: [
          'Add more quantifiable achievements',
          'Include relevant certifications',
        ],
        stats: {
          wordCount: 520,
          pageCount: 1,
          sections: ['Contact', 'Experience', 'Education', 'Skills'],
        },
      })
    }
  }, [open])

  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement('a')
      link.href = pdfUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 border-green-200'
    if (score >= 60) return 'bg-yellow-100 border-yellow-200'
    return 'bg-red-100 border-red-200'
  }

  const getScoreRingColor = (score: number) => {
    if (score >= 80) return 'stroke-green-500'
    if (score >= 60) return 'stroke-yellow-500'
    return 'stroke-red-500'
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
      <div className="fixed inset-0 flex flex-col bg-white">
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-b bg-gray-50 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <h2 className="font-semibold text-gray-900 truncate text-sm sm:text-base">
              {filename}
            </h2>
            {jobTitle && companyName && (
              <span className="hidden sm:inline text-xs text-gray-500 truncate">
                for {jobTitle} at {companyName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
            >
              <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </Button>
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
              >
                <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Edit PDF</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
            >
              <Download className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Download</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8 sm:h-9 sm:w-9"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>

        {/* Main Content with Sidebar */}
        <div className="flex-1 flex overflow-hidden">
          {/* PDF Viewer */}
          <div className="flex-1 overflow-hidden bg-gray-100">
            {pdfUrl ? (
              <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                <div className="h-full w-full">
                  <Viewer
                    fileUrl={pdfUrl}
                    plugins={[defaultLayoutPluginInstance]}
                    defaultScale={1}
                    onDocumentLoad={() => setIsLoading(false)}
                  />
                </div>
              </Worker>
            ) : (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}
          </div>

          {/* Analytics Sidebar */}
          <div
            className={`${
              sidebarOpen ? 'w-72 sm:w-80' : 'w-0'
            } transition-all duration-300 border-l bg-white overflow-hidden shrink-0`}
          >
            <div className="w-72 sm:w-80 h-full overflow-y-auto">
              {/* Sidebar Toggle (Mobile) */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full bg-white border rounded-l-lg p-1 shadow-md sm:hidden"
              >
                {sidebarOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>

              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <p className="text-sm text-gray-500">Analyzing resume...</p>
                </div>
              ) : analysis ? (
                <div className="p-4 space-y-5">
                  {/* ATS Score */}
                  <div className={`p-4 rounded-lg border ${getScoreBgColor(analysis.score)}`}>
                    <div className="flex items-center gap-3">
                      <div className="relative w-16 h-16">
                        <svg className="w-16 h-16 -rotate-90">
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            fill="none"
                            stroke="#e5e7eb"
                            strokeWidth="6"
                          />
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            fill="none"
                            className={getScoreRingColor(analysis.score)}
                            strokeWidth="6"
                            strokeDasharray={`${(analysis.score / 100) * 176} 176`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className={`text-lg font-bold ${getScoreColor(analysis.score)}`}>
                            {analysis.score}
                          </span>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">ATS Score</h3>
                        <p className="text-xs text-gray-600">
                          {analysis.score >= 80
                            ? 'Excellent match!'
                            : analysis.score >= 60
                            ? 'Good match'
                            : 'Needs improvement'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Document Stats */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Document Stats
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-semibold text-gray-900">{analysis.stats.wordCount}</p>
                        <p className="text-xs text-gray-500">Words</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-semibold text-gray-900">{analysis.stats.pageCount}</p>
                        <p className="text-xs text-gray-500">Pages</p>
                      </div>
                    </div>
                  </div>

                  {/* Matched Keywords */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Matched Keywords ({analysis.matchedKeywords.length})
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.matchedKeywords.map((keyword, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs border border-green-200"
                        >
                          {keyword}
                        </span>
                      ))}
                      {analysis.matchedKeywords.length === 0 && (
                        <p className="text-xs text-gray-500">No keywords matched</p>
                      )}
                    </div>
                  </div>

                  {/* Missing Keywords */}
                  {analysis.missingKeywords.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        Missing Keywords ({analysis.missingKeywords.length})
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.missingKeywords.map((keyword, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-orange-50 text-orange-700 rounded text-xs border border-orange-200"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sections Found */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Sections Detected
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.stats.sections.map((section, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs border border-blue-200"
                        >
                          {section}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Suggestions */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      Suggestions
                    </h4>
                    <ul className="space-y-2">
                      {analysis.suggestions.map((suggestion, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-xs text-gray-600 bg-gray-50 p-2 rounded"
                        >
                          <TrendingUp className="h-3 w-3 mt-0.5 text-purple-500 shrink-0" />
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 gap-3 text-center p-4">
                  <BarChart3 className="h-12 w-12 text-gray-300" />
                  <p className="text-sm text-gray-500">
                    No analysis available
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
