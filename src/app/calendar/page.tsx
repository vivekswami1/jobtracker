import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/layout/navbar'
import { CalendarView } from '@/components/dashboard/calendar-view'
import type { JobApplicationWithDetails } from '@/types/database'

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Fetch applications with resume and status history
  const { data: applications } = await supabase
    .from('job_applications')
    .select(`
      *,
      resume:resumes(resume_id, resume_name, file_url),
      status_history(history_id, status, notes, changed_at)
    `)
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar user={user} />
      <main className="flex-1 flex flex-col">
        <CalendarView applications={processedApplications} />
      </main>
    </div>
  )
}
