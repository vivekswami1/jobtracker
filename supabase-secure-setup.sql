-- ============================================
-- PRODUCTION-READY SECURE RESUME SYSTEM
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. DROP EXISTING POLICIES (clean slate)
DROP POLICY IF EXISTS "Users can upload own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Public can view resumes" ON storage.objects;
DROP POLICY IF EXISTS "Users can manage own resumes" ON public.resumes;

-- 2. DELETE AND RECREATE BUCKET AS PRIVATE
DELETE FROM storage.buckets WHERE id = 'resumes';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resumes',
  'resumes',
  FALSE,  -- PRIVATE bucket
  5242880,  -- 5MB limit
  ARRAY['application/pdf']  -- PDF only
);

-- 3. STORAGE POLICIES (Private Bucket)

-- Policy: Users can upload to their own folder only
-- Path format: {user_id}/{uuid}.pdf
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'resumes' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own files (for overwrites if needed)
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'resumes' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'resumes' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'resumes' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can read their own files (for signed URL generation)
CREATE POLICY "Users can read own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'resumes' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. DATABASE TABLE (if not exists)
CREATE TABLE IF NOT EXISTS public.resumes (
    resume_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    resume_name TEXT NOT NULL,  -- User-friendly display name
    original_filename TEXT,      -- Original uploaded filename
    file_path TEXT NOT NULL UNIQUE,  -- Private storage path: {user_id}/{uuid}.pdf
    file_size INTEGER,           -- File size in bytes
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add new columns if table already exists and make file_url nullable
DO $$
BEGIN
  -- Add original_filename if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resumes' AND column_name = 'original_filename') THEN
    ALTER TABLE public.resumes ADD COLUMN original_filename TEXT;
  END IF;

  -- Add file_size if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resumes' AND column_name = 'file_size') THEN
    ALTER TABLE public.resumes ADD COLUMN file_size INTEGER;
  END IF;

  -- Make file_url nullable (for private bucket with signed URLs)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resumes' AND column_name = 'file_url') THEN
    ALTER TABLE public.resumes ALTER COLUMN file_url DROP NOT NULL;
  END IF;
END $$;

-- 5. DATABASE RLS POLICIES
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own resumes" ON public.resumes;
CREATE POLICY "Users can insert own resumes"
ON public.resumes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own resumes" ON public.resumes;
CREATE POLICY "Users can view own resumes"
ON public.resumes FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own resumes" ON public.resumes;
CREATE POLICY "Users can update own resumes"
ON public.resumes FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own resumes" ON public.resumes;
CREATE POLICY "Users can delete own resumes"
ON public.resumes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 6. INDEX FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON public.resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_file_path ON public.resumes(file_path);

-- 7. FUNCTION: Update timestamp on update
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS resumes_updated_at ON public.resumes;
CREATE TRIGGER resumes_updated_at
  BEFORE UPDATE ON public.resumes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- SETUP COMPLETE!
--
-- Security Features:
-- ✓ Private bucket (no public access)
-- ✓ PDF only, 5MB limit enforced at bucket level
-- ✓ User-scoped storage paths
-- ✓ RLS on database table
-- ✓ Signed URLs required for all file access
-- ============================================
