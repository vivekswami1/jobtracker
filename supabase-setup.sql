-- ============================================
-- JOB TRACKER MVP - DATABASE SETUP
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. USERS TABLE (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RESUMES TABLE
CREATE TABLE IF NOT EXISTS public.resumes (
    resume_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    resume_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_path TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. JOB APPLICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.job_applications (
    application_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    resume_id UUID REFERENCES public.resumes(resume_id) ON DELETE SET NULL,
    company_name TEXT NOT NULL,
    job_title TEXT NOT NULL,
    job_url TEXT,
    job_description TEXT,
    application_status TEXT NOT NULL DEFAULT 'applied'
        CHECK (application_status IN ('applied', 'shortlisted', 'oa', 'interview', 'rejected', 'offer')),
    applied_date DATE DEFAULT CURRENT_DATE,
    ats_keywords TEXT[],
    notes TEXT,
    salary_range TEXT,
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. STATUS HISTORY TABLE (for timeline tracking)
CREATE TABLE IF NOT EXISTS public.status_history (
    history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.job_applications(application_id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    notes TEXT,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_job_applications_user_id ON public.job_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON public.job_applications(application_status);
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON public.resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_status_history_application_id ON public.status_history(application_id);

-- 6. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;

-- 7. RLS POLICIES

-- Users table policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Resumes table policies
DROP POLICY IF EXISTS "Users can manage own resumes" ON public.resumes;
CREATE POLICY "Users can manage own resumes" ON public.resumes
    FOR ALL USING (auth.uid() = user_id);

-- Job applications table policies
DROP POLICY IF EXISTS "Users can manage own applications" ON public.job_applications;
CREATE POLICY "Users can manage own applications" ON public.job_applications
    FOR ALL USING (auth.uid() = user_id);

-- Status history table policies
DROP POLICY IF EXISTS "Users can view own status history" ON public.status_history;
CREATE POLICY "Users can view own status history" ON public.status_history
    FOR SELECT USING (
        application_id IN (
            SELECT application_id FROM public.job_applications
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert own status history" ON public.status_history;
CREATE POLICY "Users can insert own status history" ON public.status_history
    FOR INSERT WITH CHECK (
        application_id IN (
            SELECT application_id FROM public.job_applications
            WHERE user_id = auth.uid()
        )
    );

-- 8. FUNCTION: Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (user_id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (user_id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. FUNCTION: Auto-log status changes
CREATE OR REPLACE FUNCTION public.log_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.application_status IS DISTINCT FROM NEW.application_status THEN
        INSERT INTO public.status_history (application_id, status)
        VALUES (NEW.application_id, NEW.application_status);
    END IF;
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_status_change ON public.job_applications;
CREATE TRIGGER on_status_change
    BEFORE UPDATE ON public.job_applications
    FOR EACH ROW EXECUTE FUNCTION public.log_status_change();

-- 10. FUNCTION: Log initial status on insert
CREATE OR REPLACE FUNCTION public.log_initial_status()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.status_history (application_id, status)
    VALUES (NEW.application_id, NEW.application_status);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_application_created ON public.job_applications;
CREATE TRIGGER on_application_created
    AFTER INSERT ON public.job_applications
    FOR EACH ROW EXECUTE FUNCTION public.log_initial_status();

-- 11. STORAGE BUCKET SETUP
-- Run these commands if the bucket doesn't exist:

INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Users can upload own resumes" ON storage.objects;
CREATE POLICY "Users can upload own resumes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'resumes' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can view own resumes" ON storage.objects;
CREATE POLICY "Users can view own resumes"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'resumes' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete own resumes" ON storage.objects;
CREATE POLICY "Users can delete own resumes"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'resumes' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public access to view resumes (since file_url is public)
DROP POLICY IF EXISTS "Public can view resumes" ON storage.objects;
CREATE POLICY "Public can view resumes"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'resumes');

-- ============================================
-- SETUP COMPLETE!
--
-- Next steps:
-- 1. Enable Google OAuth in Supabase Dashboard:
--    Authentication > Providers > Google
--    Add your Google OAuth credentials
--
-- 2. Add redirect URL in Google Cloud Console:
--    https://plttssdtznuqauhxuavg.supabase.co/auth/v1/callback
--
-- 3. Update .env.local with your OpenAI API key
-- ============================================
