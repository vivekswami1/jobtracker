import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: Request) {
  try {
    const { jobDescription } = await request.json()

    if (!jobDescription || typeof jobDescription !== 'string') {
      return NextResponse.json(
        { error: 'Job description is required' },
        { status: 400 }
      )
    }

    if (!process.env.GEMINI_API_KEY) {
      // Return mock data if no API key (for development)
      return NextResponse.json({
        jobTitle: 'Software Engineer',
        companyName: 'Tech Company',
        location: 'Remote',
        atsKeywords: ['JavaScript', 'React', 'Node.js', 'TypeScript', 'AWS'],
      })
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const prompt = `You are a job description parser. Extract the following information from this job posting:

1. Job title (the role name only, without the company name)
2. Company name
3. Location (city, state, country, or "Remote" if applicable)
4. 5-10 ATS-friendly keywords (key skills, technologies, qualifications mentioned)

Respond ONLY with valid JSON in this exact format, no markdown, no code blocks, just pure JSON:
{
  "jobTitle": "string",
  "companyName": "string",
  "location": "string or null",
  "atsKeywords": ["string"]
}

If you cannot determine a field, use null for strings or an empty array for atsKeywords.

Job Description:
${jobDescription.slice(0, 8000)}`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Clean up the response - remove markdown code blocks if present
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

    const parsed = JSON.parse(cleanedText)

    return NextResponse.json({
      jobTitle: parsed.jobTitle || null,
      companyName: parsed.companyName || null,
      location: parsed.location || null,
      atsKeywords: Array.isArray(parsed.atsKeywords) ? parsed.atsKeywords : [],
    })
  } catch (error: unknown) {
    console.error('Parse JD error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to parse job description: ${errorMessage}` },
      { status: 500 }
    )
  }
}
