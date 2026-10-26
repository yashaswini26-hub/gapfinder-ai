# GapFinder AI — Production Deployment Guide (Vercel & Supabase)

This guide provides step-by-step instructions to deploy GapFinder AI to production using **Supabase** for database, authentication, pgvector storage, and **Vercel** for hosting the Next.js App Router application.

---

## 1. Prerequisites

- A **GitHub / GitLab** account with the repository pushed.
- A **Supabase** account ([https://supabase.com](https://supabase.com)).
- A **Vercel** account ([https://vercel.com](https://vercel.com)).
- A **Google AI Studio** account and Gemini API key ([https://aistudio.google.com](https://aistudio.google.com)).

---

## 2. Supabase Setup

### Step 2.1: Create a Supabase Project
1. Log in to your Supabase Dashboard and click **New project**.
2. Set a name (e.g., `gapfinder-ai-prod`), secure database password, and choose your preferred cloud region.

### Step 2.2: Apply Database Migrations & Enable pgvector
1. Navigate to the **SQL Editor** in your Supabase dashboard.
2. Open the migration file:
   `supabase/migrations/20261026000000_gapfinder_schema.sql`
3. Paste the contents into the SQL Editor and click **Run**.
4. Verify execution:
   - Check that `vector` extension is active.
   - Confirm 14 tables are created (`profiles`, `subjects`, `documents`, `document_chunks`, `topics`, `quiz_attempts`, `questions`, `question_answer_keys`, `responses`, `topic_mastery`, `revision_tasks`, etc.).
   - Confirm the RPC function `match_document_chunks` is installed.

### Step 2.3: Configure Private Storage Bucket
1. Navigate to **Storage** in the Supabase sidebar.
2. The bucket is automatically initialized by the migration script:
   - **Name**: `course_materials`
   - **Public bucket**: **Disabled (Private)**
3. Storage policies are automatically applied by the migration script, restricting read/write access to `auth.uid() = (storage.foldername(name))[1]`.

### Step 2.4: Configure Authentication Redirect URLs
1. Navigate to **Authentication -> URL Configuration**.
2. Set **Site URL** to your production domain: `https://your-gapfinder-app.vercel.app`.
3. Under **Redirect URLs**, add:
   - `http://localhost:3000/auth/callback` (for local testing)
   - `https://your-gapfinder-app.vercel.app/auth/callback`

---

## 3. Google Gemini API Setup

1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Create an API Key.
3. Save the key for the `GEMINI_API_KEY` environment variable.
4. Default models:
   - **LLM**: `gemini-2.0-flash`
   - **Embeddings**: `text-embedding-004` (768 dimensions)

---

## 4. Vercel Deployment

### Step 4.1: Import Project into Vercel
1. Log in to Vercel and click **Add New -> Project**.
2. Select your `GapFinder AI` repository and click **Import**.
3. Framework Preset: **Next.js** (auto-detected).
4. Root Directory: `./`

### Step 4.2: Configure Environment Variables
In the Vercel **Environment Variables** panel, add the following:

| Variable Name | Value / Source |
| :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | `https://your-gapfinder-app.vercel.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard -> Project Settings -> API -> Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard -> Project Settings -> API -> anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard -> Project Settings -> API -> service_role secret |
| `SUPABASE_STORAGE_BUCKET` | `course_materials` |
| `GEMINI_API_KEY` | Your Google AI Studio API key |
| `GEMINI_MODEL` | `gemini-2.0-flash` |
| `EMBEDDING_MODEL` | `text-embedding-004` |
| `RAG_SIMILARITY_THRESHOLD` | `0.45` |
| `RAG_TOP_K` | `4` |

### Step 4.3: Deploy
1. Click **Deploy**.
2. Wait for the build and static route generation to finish.
3. The deployment will complete with green status and assign your live production URL.

---

## 5. Post-Deployment Verification & Demo Account Setup

### Step 5.1: Create a Demo Account
1. Visit your live site: `https://your-gapfinder-app.vercel.app/signup`.
2. Sign up with an account:
   - **Email**: `judge-demo@gapfinder.ai`
   - **Password**: Secure password of your choice
   - **Name**: `Academic Evaluator`
3. You will be redirected to `/onboarding`. Enter target subject "Introduction to Data Science & ML" and your upcoming exam date.

### Step 5.2: Seed Preloaded Demo Content
1. Navigate to **Settings** (`/settings`).
2. Scroll to **Demonstration & Evaluator Workspace**.
3. Click **Reload Demo Dataset**.
4. The system seeds:
   - 8 structured syllabus topics
   - Sample lecture notes with page & section citations
   - A completed diagnostic quiz attempt with objective and short-answer evaluations
   - An active gap diagnosis report highlighting weak concepts
   - An adaptive, time-paced revision timetable

### Step 5.3: Verification Checklist
- [ ] Visit `/dashboard`: Verify assessed mastery meter and countdown display correctly.
- [ ] Visit `/gap-report`: Click a citation pill and verify the `CitationDrawer` displays the exact document excerpt.
- [ ] Visit `/revision-plan`: Mark a revision task completed and confirm checkbox state persists.
- [ ] Visit `/diagnostic`: Start a custom diagnostic quiz across selected topics.
- [ ] Visit `/assistant`: Ask a question about "Overfitting and Bias-Variance tradeoff" and verify the response cites course notes.
