import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Navbar } from '@/components/layout/navbar'
import { MobileNav } from '@/components/layout/mobile-nav'
import { ResumeReviewContent } from '@/components/resumes/resume-review-content'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ResumeReviewPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Fetch the resume
  const { data: resume, error } = await supabase
    .from('resumes')
    .select('*')
    .eq('resume_id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !resume) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col pb-20 md:pb-0">
      <Navbar user={user} />
      <main className="flex-1">
        <ResumeReviewContent resume={resume} />
      </main>
      <MobileNav />
    </div>
  )
}
