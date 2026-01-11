# JobTracker - AI-Powered Job Application Tracker

A modern job application tracker MVP with AI-powered job description parsing, status timeline tracking, and resume management.

## Features

- **Google Authentication** via Supabase Auth
- **AI Job Description Parsing** - Paste a JD and auto-fill job title, company, and ATS keywords
- **Application Timeline** - Visual status tracking from Applied to Offer
- **Resume Management** - Upload and manage multiple resumes
- **Status Filtering** - Filter applications by status

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **AI**: OpenAI GPT-4o-mini

## Setup Instructions

### 1. Install Dependencies

```bash
cd job-tracker
npm install
```

### 2. Configure Supabase

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and run the contents of `supabase-setup.sql`

### 3. Enable Google OAuth

1. In Supabase Dashboard, go to **Authentication > Providers > Google**
2. Enable Google provider
3. Add your Google OAuth credentials from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
4. Add this redirect URL in Google Cloud Console:
   ```
   https://plttssdtznuqauhxuavg.supabase.co/auth/v1/callback
   ```

### 4. Configure Environment Variables

Update `.env.local` with your OpenAI API key:

```env
NEXT_PUBLIC_SUPABASE_URL=https://plttssdtznuqauhxuavg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_tHwhMKgN5c8ZVLsiR8uihQ_HBfdQCbS
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── api/parse-jd/      # OpenAI JD parsing endpoint
│   ├── auth/              # Auth callback routes
│   ├── dashboard/         # Main dashboard page
│   ├── resumes/           # Resume management page
│   └── page.tsx           # Landing page
├── components/
│   ├── auth/              # Auth components
│   ├── dashboard/         # Dashboard components
│   ├── layout/            # Layout components
│   ├── resumes/           # Resume components
│   └── ui/                # shadcn/ui components
├── lib/
│   ├── supabase/          # Supabase client utilities
│   └── utils.ts           # Helper functions
└── types/
    └── database.ts        # TypeScript types
```

## Database Schema

- **users** - User profiles (synced from auth.users)
- **resumes** - Uploaded resumes with storage links
- **job_applications** - Job application records
- **status_history** - Timeline tracking (auto-populated)

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add environment variables in Vercel project settings
4. Deploy!

Make sure to update the redirect URLs in:
- Supabase Dashboard (Site URL and Redirect URLs)
- Google Cloud Console OAuth credentials

## License

MIT
