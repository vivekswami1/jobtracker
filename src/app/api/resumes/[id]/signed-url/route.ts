import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Signed URL expiration time (in seconds)
const SIGNED_URL_EXPIRY = 60 * 5 // 5 minutes

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: resumeId } = await params
    const url = new URL(request.url)
    const forDownload = url.searchParams.get('download') === 'true'

    // 1. Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Fetch resume record (RLS ensures user can only access their own)
    const { data: resume, error: dbError } = await supabase
      .from('resumes')
      .select('resume_id, user_id, file_path, resume_name')
      .eq('resume_id', resumeId)
      .single()

    if (dbError || !resume) {
      return NextResponse.json(
        { error: 'Resume not found' },
        { status: 404 }
      )
    }

    // 3. Double-check ownership (defense in depth)
    if (resume.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // 4. Generate signed URL
    // If forDownload is true, set download filename; otherwise open in browser
    const signedUrlOptions = forDownload
      ? { download: resume.resume_name + '.pdf' }
      : {}

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('resumes')
      .createSignedUrl(resume.file_path, SIGNED_URL_EXPIRY, signedUrlOptions)

    if (signedUrlError || !signedUrlData) {
      console.error('Signed URL generation error:', signedUrlError)
      return NextResponse.json(
        { error: 'Failed to generate access URL' },
        { status: 500 }
      )
    }

    // 5. Return signed URL
    return NextResponse.json({
      url: signedUrlData.signedUrl,
      expiresIn: SIGNED_URL_EXPIRY,
      filename: resume.resume_name + '.pdf',
    })

  } catch (error) {
    console.error('Signed URL error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
