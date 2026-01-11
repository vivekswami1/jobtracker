import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/layout/navbar'
import { ApplicationList } from '@/components/dashboard/application-list'
import { NewApplicationModal } from '@/components/dashboard/new-application-modal'
import type { JobApplicationWithDetails, Resume } from '@/types/database'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Fetch applications with resume and status history
  const { data: applications, error: appError } = await supabase
    .from('job_applications')
    .select(`
      *,
      resume:resumes(resume_id, resume_name, file_url),
      status_history(history_id, status, notes, changed_at)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Fetch resumes for the modal
  const { data: resumes } = await supabase
    .from('resumes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Sort status history by date
  const processedApplications: JobApplicationWithDetails[] = (applications || []).map((app) => ({
    ...app,
    status_history: (app.status_history || []).sort(
      (a: { changed_at: string }, b: { changed_at: string }) =>
        new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
    ),
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Applications
            </h1>
            <p className="text-gray-500 mt-1">
              {processedApplications.length} total application{processedApplications.length !== 1 ? 's' : ''}
            </p>
          </div>
          <NewApplicationModal resumes={resumes || []} />
        </div>

        {/* Application List */}
        <ApplicationList applications={processedApplications} />
      </main>
    </div>
  )
}
