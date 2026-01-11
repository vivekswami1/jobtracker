import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// DELETE /api/resumes/[id] - Delete a resume
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: resumeId } = await params

    // 1. Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Fetch resume record to get file path (RLS ensures ownership)
    const { data: resume, error: fetchError } = await supabase
      .from('resumes')
      .select('resume_id, user_id, file_path')
      .eq('resume_id', resumeId)
      .single()

    if (fetchError || !resume) {
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

    // 4. Delete from storage first
    const { error: storageError } = await supabase.storage
      .from('resumes')
      .remove([resume.file_path])

    if (storageError) {
      console.error('Storage delete error:', storageError)
      // Continue with DB delete even if storage delete fails
      // The file might already be deleted or not exist
    }

    // 5. Delete database record
    const { error: dbError } = await supabase
      .from('resumes')
      .delete()
      .eq('resume_id', resumeId)

    if (dbError) {
      console.error('Database delete error:', dbError)
      return NextResponse.json(
        { error: 'Failed to delete resume' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Resume delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/resumes/[id] - Get resume details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: resumeId } = await params

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: resume, error: dbError } = await supabase
      .from('resumes')
      .select('resume_id, resume_name, original_filename, file_size, created_at')
      .eq('resume_id', resumeId)
      .single()

    if (dbError || !resume) {
      return NextResponse.json(
        { error: 'Resume not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ resume })

  } catch (error) {
    console.error('Resume fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
