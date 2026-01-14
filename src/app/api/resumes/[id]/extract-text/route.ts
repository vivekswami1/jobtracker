import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get resume record
    const { data: resume, error: resumeError } = await supabase
      .from('resumes')
      .select('*')
      .eq('resume_id', id)
      .eq('user_id', user.id)
      .single()

    if (resumeError || !resume) {
      return NextResponse.json(
        { error: 'Resume not found' },
        { status: 404 }
      )
    }

    // Download PDF from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('resumes')
      .download(resume.file_path)

    if (downloadError || !fileData) {
      console.error('Download error:', downloadError)
      return NextResponse.json(
        { error: 'Failed to download resume file' },
        { status: 500 }
      )
    }

    // Convert blob to ArrayBuffer for unpdf
    const arrayBuffer = await fileData.arrayBuffer()

    // Use unpdf for server-side PDF text extraction
    const { extractText } = await import('unpdf')
    const { text: extractedText, totalPages } = await extractText(arrayBuffer)

    // Clean up the extracted text (extractedText is an array of strings per page)
    const text = extractedText
      .join('\n')
      .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
      .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
      .trim()

    return NextResponse.json({
      text,
      pageCount: totalPages,
    })
  } catch (error) {
    console.error('PDF text extraction error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to extract text: ${message}` },
      { status: 500 }
    )
  }
}
