import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

// Configuration
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_MIME_TYPES = ['application/pdf']
const BUCKET_NAME = 'resumes'

export async function POST(request: Request) {
  try {
    // 1. Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const resumeName = formData.get('resumeName') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // 3. Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF files are allowed.' },
        { status: 400 }
      )
    }

    // 4. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.` },
        { status: 400 }
      )
    }

    // 5. Generate secure filename (never trust client filename)
    const fileId = uuidv4()
    const filePath = `${user.id}/${fileId}.pdf`
    const originalFilename = file.name
    const displayName = resumeName?.trim() || originalFilename.replace(/\.pdf$/i, '')

    // 6. Convert file to buffer for upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 7. Upload to private bucket
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false, // Never overwrite
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // 8. Insert database record (atomic with rollback)
    // Note: file_url is nullable - we use signed URLs for private bucket access
    const { data: resumeData, error: dbError } = await supabase
      .from('resumes')
      .insert({
        user_id: user.id,
        resume_name: displayName,
        original_filename: originalFilename,
        file_path: filePath,
        file_size: file.size,
      })
      .select('resume_id, resume_name, file_path, file_size, created_at')
      .single()

    if (dbError) {
      // ROLLBACK: Delete uploaded file if DB insert fails
      console.error('Database insert error:', dbError)
      await supabase.storage.from(BUCKET_NAME).remove([filePath])

      return NextResponse.json(
        { error: `Failed to save resume record: ${dbError.message}` },
        { status: 500 }
      )
    }

    // 9. Return success with resume data (no URL - use signed URL endpoint)
    return NextResponse.json({
      success: true,
      resume: {
        resume_id: resumeData.resume_id,
        resume_name: resumeData.resume_name,
        file_size: resumeData.file_size,
        created_at: resumeData.created_at,
      },
    })

  } catch (error) {
    console.error('Resume upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
