import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/layout/navbar'
import { MobileNav } from '@/components/layout/mobile-nav'
import { ResumeUpload } from '@/components/resumes/resume-upload'
import { ResumeList } from '@/components/resumes/resume-list'

export default async function ResumesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { data: resumes } = await supabase
    .from('resumes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <Navbar user={user} />

      <main className="max-w-4xl mx-auto px-4 py-4 md:py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Rate My Resume</h1>
          <p className="text-sm md:text-base text-gray-500 mt-1">
            Get your ATS score and actionable feedback
          </p>
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
          {/* Upload Section - Full width on mobile, sidebar on desktop */}
          <div className="order-1 lg:order-none lg:col-span-1">
            <ResumeUpload />
          </div>

          {/* Resume List */}
          <div className="order-2 lg:order-none lg:col-span-2">
            <h2 className="text-base md:text-lg font-semibold mb-4">
              Your Resumes ({resumes?.length || 0})
            </h2>
            <ResumeList resumes={resumes || []} />
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  )
}
