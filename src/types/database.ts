export type ApplicationStatus =
  | 'applied'
  | 'shortlisted'
  | 'oa'
  | 'interview'
  | 'rejected'
  | 'offer'

export interface User {
  user_id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Resume {
  resume_id: string
  user_id: string
  resume_name: string
  file_url: string | null
  file_path: string
  file_size?: number | null
  original_filename?: string | null
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface JobApplication {
  application_id: string
  user_id: string
  resume_id: string | null
  company_name: string
  job_title: string
  job_url: string | null
  job_description: string | null
  application_status: ApplicationStatus
  applied_date: string
  ats_keywords: string[] | null
  notes: string | null
  salary_range: string | null
  location: string | null
  created_at: string
  updated_at: string
}

export interface StatusHistory {
  history_id: string
  application_id: string
  status: ApplicationStatus
  notes: string | null
  changed_at: string
}

export interface JobApplicationWithDetails extends JobApplication {
  resume: Pick<Resume, 'resume_id' | 'resume_name' | 'file_url'> | null
  status_history: StatusHistory[]
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: Omit<User, 'created_at' | 'updated_at'>
        Update: Partial<Omit<User, 'user_id'>>
      }
      resumes: {
        Row: Resume
        Insert: Omit<Resume, 'resume_id' | 'created_at' | 'updated_at' | 'is_default'> & { is_default?: boolean }
        Update: Partial<Omit<Resume, 'resume_id' | 'user_id'>>
      }
      job_applications: {
        Row: JobApplication
        Insert: Omit<JobApplication, 'application_id' | 'created_at' | 'updated_at' | 'applied_date'> & { applied_date?: string }
        Update: Partial<Omit<JobApplication, 'application_id' | 'user_id'>>
      }
      status_history: {
        Row: StatusHistory
        Insert: Omit<StatusHistory, 'history_id' | 'changed_at'>
        Update: Partial<Omit<StatusHistory, 'history_id'>>
      }
    }
  }
}
