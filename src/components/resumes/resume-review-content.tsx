'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import {
  Home,
  RefreshCw,
  ChevronLeft,
  CheckCircle,
  XCircle,
  Zap,
  TrendingUp,
  Hash,
  Repeat,
  Calendar,
  Trophy,
  GraduationCap,
  Users,
  Loader2,
  Target,
  FileText,
  Code,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  type LucideIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Resume } from '@/types/database'
import { cn } from '@/lib/utils'

// Dynamically import PDF viewer to avoid SSR issues
const PDFViewer = dynamic(
  () => import('./pdf-preview-panel').then(mod => ({ default: mod.PDFPreviewPanel })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }
)

interface ResumeReviewContentProps {
  resume: Resume
}

// Analysis type from API
interface ResumeAnalysis {
  overallScore: number
  potentialImprovement: number
  totalChecks: number
  passedChecks: number
  needsWorkChecks: number
  impactScore: number
  keywordsScore: number
  topFixes: {
    id: string
    label: string
    count: number
    details?: string[]
  }[]
  completed: {
    id: string
    label: string
  }[]
  strengths: string[]
  quickWins: string[]
  sectionFeedback?: {
    section: string
    score: number
    feedback: string
    suggestions: string[]
  }[]
}

// Icon mapping for fix types
const FIX_ICONS: Record<string, LucideIcon> = {
  repetition: Repeat,
  dates: Calendar,
  leadership: Trophy,
  metrics: Target,
  formatting: FileText,
  keywords: Hash,
  verbs: Code,
  default: AlertTriangle,
}

// Icon mapping for completed items
const COMPLETED_ICONS: Record<string, LucideIcon> = {
  education: GraduationCap,
  teamwork: Users,
  skills: Code,
  experience: Target,
  contact: FileText,
  summary: FileText,
  projects: Code,
  certifications: Trophy,
  default: CheckCircle,
}

// Default analysis when API is not available
const DEFAULT_ANALYSIS: ResumeAnalysis = {
  overallScore: 0,
  potentialImprovement: 0,
  totalChecks: 23,
  passedChecks: 0,
  needsWorkChecks: 0,
  impactScore: 0,
  keywordsScore: 0,
  topFixes: [],
  completed: [],
  strengths: [],
  quickWins: [],
  sectionFeedback: [],
}

export function ResumeReviewContent({ resume }: ResumeReviewContentProps) {
  const [activeTab, setActiveTab] = useState<'score' | 'rewriter'>('score')
  const [activeSection, setActiveSection] = useState('home')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isLoadingPdf, setIsLoadingPdf] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(true)
  const [analysisStatus, setAnalysisStatus] = useState<string>('Initializing...')
  const [analysis, setAnalysis] = useState<ResumeAnalysis>(DEFAULT_ANALYSIS)

  // Fetch analysis from API with text extraction
  const fetchAnalysis = useCallback(async () => {
    setIsAnalyzing(true)
    setAnalysisStatus('Extracting text from resume...')

    try {
      // Step 1: Extract text from PDF
      const extractResponse = await fetch(`/api/resumes/${resume.resume_id}/extract-text`)

      if (!extractResponse.ok) {
        const errorData = await extractResponse.json().catch(() => ({}))
        console.error('Extract API error:', extractResponse.status, errorData)
        throw new Error(errorData.error || 'Failed to extract text from resume')
      }

      const { text: resumeText } = await extractResponse.json()
      setAnalysisStatus('Analyzing resume with AI...')

      // Step 2: Send text for analysis
      const analyzeResponse = await fetch('/api/analyze-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeId: resume.resume_id,
          resumeText,
        }),
      })

      if (analyzeResponse.ok) {
        const data = await analyzeResponse.json()
        setAnalysis(data)
        setAnalysisStatus('Analysis complete!')
      } else {
        throw new Error('Failed to analyze resume')
      }
    } catch (error) {
      console.error('Failed to fetch analysis:', error)
      setAnalysisStatus('Analysis failed. Using default scores.')
    } finally {
      setIsAnalyzing(false)
    }
  }, [resume.resume_id])

  // Fetch signed URL for PDF
  useEffect(() => {
    async function fetchPdfUrl() {
      try {
        const response = await fetch(`/api/resumes/${resume.resume_id}/signed-url`)
        const data = await response.json()
        if (response.ok) {
          setPdfUrl(data.url)
        }
      } catch (error) {
        console.error('Failed to fetch PDF URL:', error)
      } finally {
        setIsLoadingPdf(false)
      }
    }
    fetchPdfUrl()
  }, [resume.resume_id])

  // Fetch analysis on mount
  useEffect(() => {
    fetchAnalysis()
  }, [fetchAnalysis])

  const handleRescore = async () => {
    await fetchAnalysis()
  }

  // Calculate score ring circumference
  const circumference = 2 * Math.PI * 58
  const scoreOffset = circumference - (analysis.overallScore / 100) * circumference

  // Get score color based on value
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#22C55E' // green
    if (score >= 60) return '#EAB308' // yellow
    return '#EF4444' // red
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)]">
      {/* Left Sidebar */}
      <div className="w-full lg:w-64 bg-slate-800 text-white flex-shrink-0 overflow-y-auto">
        <div className="p-4 lg:p-6">
          {/* Back button */}
          <Link
            href="/resumes"
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 text-sm"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Resumes
          </Link>

          {/* Score Circle */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative w-36 h-36">
              {isAnalyzing ? (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <Loader2 className="h-10 w-10 animate-spin text-blue-400 mb-2" />
                  <span className="text-xs text-gray-400 text-center px-2">{analysisStatus}</span>
                </div>
              ) : (
                <>
                  <svg className="w-full h-full transform -rotate-90">
                    {/* Background circle */}
                    <circle
                      cx="72"
                      cy="72"
                      r="58"
                      fill="none"
                      stroke="#374151"
                      strokeWidth="12"
                    />
                    {/* Score circle */}
                    <circle
                      cx="72"
                      cy="72"
                      r="58"
                      fill="none"
                      stroke={getScoreColor(analysis.overallScore)}
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={scoreOffset}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold">{analysis.overallScore}</span>
                    <span className="text-xs text-gray-400 uppercase tracking-wider">Overall</span>
                  </div>
                </>
              )}
            </div>

            {/* Improvement Badge */}
            {!isAnalyzing && analysis.potentialImprovement > 0 && (
              <div className="mt-3 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500 rounded-full">
                <span className="text-emerald-400 text-sm font-medium flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  +{analysis.potentialImprovement} points
                </span>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveSection('home')}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                activeSection === 'home'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-slate-700'
              )}
            >
              <Home className="h-5 w-5" />
              <span className="font-medium">Home</span>
            </button>
          </nav>

          {/* Top Fixes */}
          {analysis.topFixes.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Top Fixes
              </h3>
              <nav className="space-y-1">
                {analysis.topFixes.map((fix) => {
                  const Icon = FIX_ICONS[fix.id] || FIX_ICONS.default
                  return (
                    <button
                      key={fix.id}
                      onClick={() => setActiveSection(fix.id)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors',
                        activeSection === fix.id
                          ? 'bg-slate-700 text-white'
                          : 'text-gray-300 hover:bg-slate-700'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5" />
                        <span>{fix.label}</span>
                      </div>
                      <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {fix.count}
                      </span>
                    </button>
                  )
                })}
              </nav>
            </div>
          )}

          {/* Completed */}
          {analysis.completed.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Completed
              </h3>
              <nav className="space-y-1">
                {analysis.completed.map((item) => {
                  const Icon = COMPLETED_ICONS[item.id] || COMPLETED_ICONS.default
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors',
                        activeSection === item.id
                          ? 'bg-slate-700 text-white'
                          : 'text-gray-300 hover:bg-slate-700'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </div>
                      <CheckCircle className="h-5 w-5 text-emerald-400" />
                    </button>
                  )
                })}
              </nav>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Center Panel - Score Report */}
        <div className="flex-1 overflow-y-auto bg-white">
          {/* Tabs & Actions */}
          <div className="sticky top-0 bg-white border-b px-4 lg:px-6 py-3 flex items-center justify-between z-10">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('score')}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  activeTab === 'score'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                Score Report
              </button>
              <button
                onClick={() => setActiveTab('rewriter')}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
                  activeTab === 'rewriter'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <Zap className="h-4 w-4" />
                Resume Rewriter
              </button>
            </div>
            <Button
              variant="outline"
              onClick={handleRescore}
              disabled={isAnalyzing}
              className="text-sm"
            >
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Re-score Resume
            </Button>
          </div>

          {/* Content */}
          <div className="p-4 lg:p-6">
            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
                <p className="text-gray-600 font-medium">{analysisStatus}</p>
                <p className="text-sm text-gray-400 mt-1">This may take 10-15 seconds</p>
              </div>
            ) : activeTab === 'score' ? (
              <ScoreReportTab analysis={analysis} activeSection={activeSection} />
            ) : (
              <RewriterTab />
            )}
          </div>
        </div>

        {/* Right Panel - PDF Preview */}
        <div className="hidden lg:flex lg:w-[400px] xl:w-[450px] flex-col border-l bg-gray-50">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
            <h3 className="font-semibold text-gray-900">Resume Preview</h3>
            <span className="text-sm text-gray-500 truncate max-w-[150px]">{resume.resume_name}.pdf</span>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {isLoadingPdf ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : pdfUrl ? (
              <PDFViewer url={pdfUrl} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Unable to load preview
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Score Report Tab Component
function ScoreReportTab({ analysis, activeSection }: { analysis: ResumeAnalysis; activeSection: string }) {
  const [expandedFix, setExpandedFix] = useState<string | null>(null)

  // Show fix details if a fix is selected
  const selectedFix = analysis.topFixes.find(f => f.id === activeSection)

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome to your resume review
        </h1>
        <p className="text-gray-600">
          Your resume scored <span className="font-semibold">{analysis.overallScore} out of 100</span>.
          {analysis.potentialImprovement > 0 && (
            <> We found ways to improve your score by {analysis.potentialImprovement}+ points.</>
          )}
        </p>
      </div>

      {/* Selected Fix Details */}
      {selectedFix && selectedFix.details && selectedFix.details.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-amber-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {selectedFix.label} Issues ({selectedFix.count})
          </h2>
          <ul className="space-y-2">
            {selectedFix.details.map((detail, index) => (
              <li key={index} className="flex items-start gap-3 text-amber-900">
                <span className="flex items-center justify-center w-5 h-5 bg-amber-200 text-amber-800 text-xs font-bold rounded-full shrink-0 mt-0.5">
                  {index + 1}
                </span>
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Checks Summary */}
      <div className="bg-gray-50 rounded-xl p-5">
        <p className="text-gray-700 mb-3">
          Your score is based on <span className="font-semibold">{analysis.totalChecks}+ recruiter checks</span>.
        </p>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            <span className="text-emerald-700 font-medium">{analysis.passedChecks} passed</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            <span className="text-red-700 font-medium">{analysis.needsWorkChecks} need work</span>
          </div>
        </div>
      </div>

      {/* Scores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Impact Score */}
        <div className="bg-white border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-emerald-100 rounded-lg">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            </div>
            <span className="font-medium text-gray-700">Impact Score</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-3">{analysis.impactScore}</div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${analysis.impactScore}%` }}
            />
          </div>
        </div>

        {/* Keywords Score */}
        <div className="bg-white border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <Hash className="h-4 w-4 text-blue-600" />
            </div>
            <span className="font-medium text-gray-700">Keywords</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-3">{analysis.keywordsScore}</div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${analysis.keywordsScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* Section Feedback */}
      {analysis.sectionFeedback && analysis.sectionFeedback.length > 0 && (
        <div className="bg-white border rounded-xl p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Section-by-Section Analysis
          </h2>
          <div className="space-y-3">
            {analysis.sectionFeedback.map((section, index) => (
              <SectionFeedbackCard key={index} section={section} />
            ))}
          </div>
        </div>
      )}

      {/* Top Fixes with Details */}
      {analysis.topFixes.length > 0 && (
        <div className="bg-white border rounded-xl p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Issues to Fix
          </h2>
          <div className="space-y-2">
            {analysis.topFixes.map((fix) => (
              <div key={fix.id} className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedFix(expandedFix === fix.id ? null : fix.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded">
                      {fix.count}
                    </span>
                    <span className="font-medium text-gray-900">{fix.label}</span>
                  </div>
                  {expandedFix === fix.id ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </button>
                {expandedFix === fix.id && fix.details && (
                  <div className="px-4 pb-4 bg-gray-50">
                    <ul className="space-y-2">
                      {fix.details.map((detail, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-amber-500 mt-1">•</span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strengths */}
      {analysis.strengths.length > 0 && (
        <div className="bg-white border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">Strengths</h2>
          </div>
          <ul className="space-y-3">
            {analysis.strengths.map((strength, index) => (
              <li key={index} className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-gray-700">{strength}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick Wins */}
      {analysis.quickWins.length > 0 && (
        <div className="bg-white border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-900">Quick Wins</h2>
          </div>
          <ul className="space-y-3">
            {analysis.quickWins.map((win, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full shrink-0">
                  {index + 1}
                </span>
                <span className="text-gray-700">{win}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// Section Feedback Card Component
function SectionFeedbackCard({ section }: { section: { section: string; score: number; feedback: string; suggestions: string[] } }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500'
    if (score >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1">
          <span className={cn('text-sm font-bold px-2 py-1 rounded', getScoreColor(section.score))}>
            {section.score}
          </span>
          <span className="font-medium text-gray-900">{section.section}</span>
          <div className="flex-1 max-w-[100px] ml-2">
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full', getProgressColor(section.score))}
                style={{ width: `${section.score}%` }}
              />
            </div>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 bg-gray-50 space-y-3">
          <p className="text-sm text-gray-700">{section.feedback}</p>
          {section.suggestions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Suggestions:</p>
              <ul className="space-y-1">
                {section.suggestions.map((suggestion, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                    <Zap className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Rewriter Tab Component (placeholder)
function RewriterTab() {
  return (
    <div className="text-center py-12">
      <Zap className="h-12 w-12 text-gray-300 mx-auto mb-4" />
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Resume Rewriter</h2>
      <p className="text-gray-600 max-w-md mx-auto">
        AI-powered suggestions to rewrite and improve your resume bullet points.
        Coming soon!
      </p>
    </div>
  )
}
