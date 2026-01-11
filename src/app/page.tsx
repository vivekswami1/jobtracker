import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AuthButton } from '@/components/auth/auth-button'
import { Briefcase, FileText, Sparkles, CheckCircle } from 'lucide-react'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col">
      {/* Header */}
      <header className="p-4 flex justify-between items-center max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">JobTracker</h1>
        </div>
        <AuthButton size="sm" variant="outline" />
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <div className="max-w-3xl">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">
            Track Your Job Applications
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            With AI-Powered Automation
          </p>

          {/* Features */}
          <div className="bg-white rounded-xl p-6 shadow-sm mb-8 max-w-md mx-auto">
            <ul className="text-left space-y-4">
              <li className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Auto-parse job descriptions</strong> with AI - instantly extract role, company & keywords
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Track application status</strong> with visual timeline from Applied to Offer
                </span>
              </li>
              <li className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Manage multiple resumes</strong> and link them to specific applications
                </span>
              </li>
            </ul>
          </div>

          {/* CTA Button */}
          <AuthButton size="lg" />

          <p className="mt-4 text-sm text-gray-500">
            Free to use. No credit card required.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-sm text-gray-500">
        <p>Built for job seekers, by job seekers</p>
      </footer>
    </div>
  )
}
