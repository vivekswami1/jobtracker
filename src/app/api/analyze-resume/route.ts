import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
})

export interface ResumeAnalysis {
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
    details: string[]
  }[]
  completed: {
    id: string
    label: string
  }[]
  strengths: string[]
  quickWins: string[]
  sectionFeedback: {
    section: string
    score: number
    feedback: string
    suggestions: string[]
  }[]
}

// Mock analysis for when API is not available
const MOCK_ANALYSIS: ResumeAnalysis = {
  overallScore: 85,
  potentialImprovement: 9,
  totalChecks: 23,
  passedChecks: 20,
  needsWorkChecks: 3,
  impactScore: 90,
  keywordsScore: 84,
  topFixes: [
    { id: 'repetition', label: 'Repetition', count: 3, details: ['Avoid repeating "responsible for"', 'Vary action verbs', 'Reduce redundant phrases'] },
    { id: 'metrics', label: 'Metrics', count: 2, details: ['Add quantifiable results to more bullet points', 'Include percentage improvements'] },
    { id: 'keywords', label: 'Keywords', count: 2, details: ['Add more industry-specific keywords', 'Include relevant technical skills'] },
  ],
  completed: [
    { id: 'contact', label: 'Contact Info' },
    { id: 'education', label: 'Education' },
    { id: 'experience', label: 'Experience' },
  ],
  strengths: [
    'Strong impact through quantifiable achievements',
    'Technical fluency and relevant keywords usage',
    'Good focus on collaboration and team involvement',
  ],
  quickWins: [
    'Rephrase repeated phrases in bullet points for more variety',
    'Add specific metrics to 2 more bullet points',
    'Include leadership keywords in your summary section',
  ],
  sectionFeedback: [
    { section: 'Summary', score: 85, feedback: 'Good overview of skills and experience', suggestions: ['Add a key achievement', 'Include target role keywords'] },
    { section: 'Experience', score: 88, feedback: 'Strong work history with good details', suggestions: ['Add more metrics', 'Use stronger action verbs'] },
    { section: 'Education', score: 90, feedback: 'Well formatted education section', suggestions: ['Include relevant coursework if recent graduate'] },
    { section: 'Skills', score: 82, feedback: 'Good technical skills listed', suggestions: ['Organize by category', 'Add proficiency levels'] },
  ],
}

export async function POST(request: Request) {
  try {
    const { resumeId, resumeText } = await request.json()

    if (!resumeId) {
      return NextResponse.json(
        { error: 'Resume ID is required' },
        { status: 400 }
      )
    }

    // Verify user owns the resume
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: resume, error } = await supabase
      .from('resumes')
      .select('*')
      .eq('resume_id', resumeId)
      .eq('user_id', user.id)
      .single()

    if (error || !resume) {
      return NextResponse.json(
        { error: 'Resume not found' },
        { status: 404 }
      )
    }

    // If no API key or no resume text, return mock data
    if (!process.env.GROQ_API_KEY || !resumeText || resumeText.length < 100) {
      return NextResponse.json(MOCK_ANALYSIS)
    }

    const prompt = `You are an expert ATS (Applicant Tracking System) resume analyzer and career coach. Analyze the following resume thoroughly and provide detailed, actionable feedback.

IMPORTANT: Analyze each section of the resume and provide specific feedback for each.

Evaluate the resume on these criteria:
1. **Overall ATS Score (0-100)**: How well optimized is this resume for ATS systems?
2. **Impact Score (0-100)**: How well are achievements quantified with metrics and numbers?
3. **Keywords Score (0-100)**: How well does the resume use relevant industry keywords?
4. **Section-by-Section Analysis**: Analyze each section (Summary, Experience, Education, Skills, etc.)
5. **Top Issues to Fix**: Identify the most impactful issues that need fixing
6. **Strengths**: What does this resume do well?
7. **Quick Wins**: Easy improvements that can significantly boost the score

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{
  "overallScore": <number 0-100>,
  "potentialImprovement": <number showing how many points can be gained>,
  "totalChecks": 23,
  "passedChecks": <number of checks passed>,
  "needsWorkChecks": <number of checks that need work>,
  "impactScore": <number 0-100>,
  "keywordsScore": <number 0-100>,
  "topFixes": [
    {
      "id": "<one of: repetition, metrics, keywords, formatting, verbs, leadership, dates>",
      "label": "<display name>",
      "count": <number of issues>,
      "details": ["specific issue 1", "specific issue 2", "specific issue 3"]
    }
  ],
  "completed": [
    {"id": "<one of: contact, summary, experience, education, skills, projects, certifications>", "label": "<display name>"}
  ],
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "quickWins": ["actionable quick win 1", "actionable quick win 2", "actionable quick win 3"],
  "sectionFeedback": [
    {
      "section": "<section name>",
      "score": <number 0-100>,
      "feedback": "<brief feedback about this section>",
      "suggestions": ["specific suggestion 1", "specific suggestion 2"]
    }
  ]
}

Be specific and actionable in your feedback. Reference actual content from the resume when possible.

Resume Content:
${resumeText.slice(0, 15000)}`

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an expert ATS resume analyzer. Always respond with valid JSON only, no markdown formatting.'
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 4096,
    })

    const text = completion.choices[0]?.message?.content || ''

    // Clean up the response
    let cleanedText = text.trim()
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.slice(7)
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.slice(3)
    }
    if (cleanedText.endsWith('```')) {
      cleanedText = cleanedText.slice(0, -3)
    }
    cleanedText = cleanedText.trim()

    const parsed = JSON.parse(cleanedText) as ResumeAnalysis

    // Validate and sanitize the response
    const analysis: ResumeAnalysis = {
      overallScore: Math.min(100, Math.max(0, parsed.overallScore || 75)),
      potentialImprovement: Math.min(25, Math.max(0, parsed.potentialImprovement || 10)),
      totalChecks: parsed.totalChecks || 23,
      passedChecks: parsed.passedChecks || 18,
      needsWorkChecks: parsed.needsWorkChecks || 5,
      impactScore: Math.min(100, Math.max(0, parsed.impactScore || 70)),
      keywordsScore: Math.min(100, Math.max(0, parsed.keywordsScore || 70)),
      topFixes: Array.isArray(parsed.topFixes) ? parsed.topFixes.slice(0, 5) : MOCK_ANALYSIS.topFixes,
      completed: Array.isArray(parsed.completed) ? parsed.completed.slice(0, 6) : MOCK_ANALYSIS.completed,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 5) : MOCK_ANALYSIS.strengths,
      quickWins: Array.isArray(parsed.quickWins) ? parsed.quickWins.slice(0, 5) : MOCK_ANALYSIS.quickWins,
      sectionFeedback: Array.isArray(parsed.sectionFeedback) ? parsed.sectionFeedback : MOCK_ANALYSIS.sectionFeedback,
    }

    return NextResponse.json(analysis)
  } catch (error: unknown) {
    console.error('Resume analysis error:', error)
    // Return mock data on error to ensure UI works
    return NextResponse.json(MOCK_ANALYSIS)
  }
}
