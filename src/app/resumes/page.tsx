import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/layout/navbar'
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
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Resumes</h1>
          <p className="text-gray-500 mt-1">
            Manage your resumes and link them to job applications
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Section */}
          <div className="lg:col-span-1">
            <ResumeUpload />
          </div>

          {/* Resume List */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold mb-4">
              Your Resumes ({resumes?.length || 0})
            </h2>
            <ResumeList resumes={resumes || []} />
          </div>
        </div>
      </main>
    </div>
  )
}
