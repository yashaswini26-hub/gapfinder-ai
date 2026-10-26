# GapFinder AI

> **"Find Your Learning Gaps. Fix Them Before Exam Day."**  
> An AI-powered diagnostic revision engine for college students that indexes syllabi and lecture notes, pinpoints conceptual blind spots with verifiable page citations, and generates an adaptive daily revision plan.

---

## 🎯 Key Differentiators

Unlike generic chatbots or static flashcard apps:
1. **100% Grounded Assessment**: Questions and answer keys are synthesized **strictly** from uploaded syllabus and course notes.
2. **Exact Verifiable Citations**: Every diagnostic question, rubric explanation, and assistant answer includes clickable citations to the exact document, section title, and page number.
3. **Deterministic Gap Analysis Engine**: Mastery is calculated using a testable mathematical model (`100 * weighted_earned / weighted_possible`) with configurable difficulty weights, threshold boundaries, and explicit confidence heuristics (Low / Medium / High).
4. **Adaptive Paced Revision**: Generates a day-by-day timetable based on topic weakness, syllabus importance, exam proximity, and the student's daily study minutes budget.
5. **Secure Answer Key Isolation**: Answer keys and scoring rubrics are protected server-side and never sent to the client during an in-progress quiz.
6. **Ready-to-Test Demo Mode**: Built-in demonstration featuring original college-level material (**CS 301 Introduction to Data Science & Machine Learning**) allowing instant walkthroughs without needing external credentials.

---

## 📚 Complete Project Documentation

For in-depth architectural and implementation specifications, see the dedicated documentation files:
- [ARCHITECTURE.md](file:///c:/Users/cvr/Desktop/GapFinder%20AI%20%E2%80%94%20Master%20Build%20Prompt/ARCHITECTURE.md) — System architecture, component responsibilities, data flow, and Mermaid diagram.
- [RAG_PIPELINE.md](file:///c:/Users/cvr/Desktop/GapFinder%20AI%20%E2%80%94%20Master%20Build%20Prompt/RAG_PIPELINE.md) — Text extraction, 600t chunking, `text-embedding-004` (768d), pgvector search, and citations.
- [AI_WORKFLOW.md](file:///c:/Users/cvr/Desktop/GapFinder%20AI%20%E2%80%94%20Master%20Build%20Prompt/AI_WORKFLOW.md) — End-to-end AI workflow, prompt boundaries, deterministic vs LLM boundaries, and mathematical formulas.
- [SECURITY.md](file:///c:/Users/cvr/Desktop/GapFinder%20AI%20%E2%80%94%20Master%20Build%20Prompt/SECURITY.md) — Supabase RLS policies, answer key isolation, upload validation, prompt injection defense, and secret hygiene.
- [LIMITATIONS_AND_FUTURE_WORK.md](file:///c:/Users/cvr/Desktop/GapFinder%20AI%20%E2%80%94%20Master%20Build%20Prompt/LIMITATIONS_AND_FUTURE_WORK.md) — Current system constraints, heuristics, and prioritized roadmap.
- [DEPLOYMENT.md](file:///c:/Users/cvr/Desktop/GapFinder%20AI%20%E2%80%94%20Master%20Build%20Prompt/DEPLOYMENT.md) — Complete deployment guide for Vercel and Supabase.

---

## 🏗 Tech Stack

- **Framework**: Next.js 16 (App Router with Turbopack)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS & Lucide Icons
- **Data Visualizations**: Recharts
- **Validation**: Zod (Runtime input validation & AI structured outputs)
- **Database & Auth**: Supabase PostgreSQL with `pgvector` & Row Level Security (RLS)
- **AI Integration**: Official Google Gen AI SDK (`@google/genai`)
- **LLM & Embeddings**: Gemini 2.0 Flash & `text-embedding-004` (768 dimensions)
- **Document Processing**: `pdf-parse` (server-side PDF text extraction) & TXT parser
- **Testing**: Vitest unit & integration test suite

---

## 🚀 Quick Start (Local Setup)

### 1. Prerequisites
- Node.js v18+ (tested on Node v22)
- npm or pnpm

### 2. Clone & Install
```bash
git clone <repo-url>
cd "GapFinder AI"
npm install --legacy-peer-deps
```

### 3. Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure your environment variables:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash
EMBEDDING_MODEL=text-embedding-004
```

> **Note for Judges & Evaluators:** If external API keys are not supplied, GapFinder AI automatically activates **Demo Mode**, preloading our original **CS 301 Data Science** syllabus, notes chunks, diagnostic assessment, and revision schedule.

### 4. Database Setup (Supabase)
Run the migration file in `supabase/migrations/20261026000000_gapfinder_schema.sql` in your Supabase SQL Editor. This script:
- Enables the `vector` (pgvector) and `uuid-ossp` extensions.
- Creates all 14 domain tables with foreign key constraints.
- Builds HNSW vector indexes for cosine similarity search.
- Creates the `match_document_chunks` RPC function.
- Enables Row Level Security (RLS) on all tables with student isolation policies.

### 5. Running the Application
```bash
# Start development server
npm run dev

# Run unit tests
npm test

# Build production bundle
npm run build
```

The application runs at `http://localhost:3000`.

---

## 🧑‍⚖️ Walkthrough for Judges & Evaluators

Follow this recommended path to evaluate the full end-to-end student workflow:

1. **Sign In**: Navigate to `http://localhost:3000/login` and click **"1-Click Demo Sign-In"** to enter the evaluator account.
2. **Dashboard** (`/dashboard`): Observe the assessed mastery score, weak topic alerts, exam countdown, and today's revision tasks.
3. **Materials** (`/materials`): View preloaded lecture notes. Click any document to inspect its extracted 600-token chunks with page numbers.
4. **Topics Map** (`/topics`): Explore the structured syllabus modules for **CS 301 Introduction to Data Science**.
5. **Diagnostic Quiz** (`/diagnostic`): Select topics (or all topics) and click **"Start Diagnostic Assessment"**.
6. **Take Quiz** (`/quiz/[id]`): Answer questions (MCQ and short descriptive). Submit the attempt.
7. **Review Results** (`/results/[id]`): Review marks awarded, objective answer keys, AI rubric feedback, and clickable citations.
8. **Inspect Gap Report** (`/gap-report`): Explore the core feature: weak/medium/strong classification, confidence rating, missed concepts, and clickable citations that open source text excerpts in a drawer.
9. **Revision Plan** (`/revision-plan`): View the time-paced daily calendar schedule. Check off a task and verify persistence.
10. **Explain-This-Topic Assistant** (`/assistant`): Ask a question (e.g., *"Explain why L1 Lasso produces sparse weights"*). Observe the response citing uploaded course material.

---

## 🔍 Core Application Routes

| Route | Description |
|---|---|
| `/` | Public landing page explaining the 4-step workflow and value proposition |
| `/login` / `/signup` | Supabase authentication with 1-click Demo mode sign-in for evaluators |
| `/onboarding` | Subject target setup: exam date, daily study minutes, syllabus scope |
| `/dashboard` | Student hub: assessed mastery meter, weak topic alerts, today's schedule |
| `/materials` | Upload center for PDF/TXT files with text extraction and pgvector status |
| `/materials/[id]` | Chunk inspector displaying extracted chunks, page numbers, and tokens |
| `/topics` | Syllabus hierarchy with importance weights and AI auto-extraction |
| `/diagnostic` | Diagnostic quiz setup: topic scope, question count, and duration |
| `/quiz/[attemptId]` | Interactive quiz taker with question pager, citations, and confirmation |
| `/results/[attemptId]` | Question breakdown, student vs correct answers, rubric feedback, citations |
| `/gap-report` | **Core feature**: topic-by-topic gap report with scores, confidence, and actions |
| `/revision-plan` | Adaptive calendar timetable paced to exam date with completion checkboxes |
| `/assistant` | Explain-this-topic assistant answering strictly from uploaded notes |
| `/progress` | Analytics dashboard with Recharts mastery distribution and quiz progression |
| `/settings` | Study preferences, exam countdown settings, and demo data reloader |

---

## 🧪 Testing

Run the automated test suite with:
```bash
npm test
```
The test suite covers:
- Deterministic topic mastery scoring and threshold boundaries (Weak < 50, Medium 50–79.99, Strong ≥ 80).
- Insufficient data handling (0 assessed questions → `insufficient_data`).
- Confidence rules (Low: < 3 questions, Medium: 3–5, High: 6+).
- Difficulty weighting (Easy 1.0, Medium 1.25, Hard 1.5).
- Objective exact/normalized answer evaluation.
- Revision priority calculations and exam urgency pacing.
- Heading detection, paragraph splitting, and document chunking.

---

## 🛠️ Troubleshooting

- **Supabase vector extension error**: Ensure `CREATE EXTENSION IF NOT EXISTS vector;` runs in the Supabase SQL Editor.
- **Port 3000 in use**: Run `npm run dev -- -p 3001` to start on an alternative port.
- **Legacy peer dependencies**: Use `npm install --legacy-peer-deps` to ensure compatibility across Next.js 16 and toolchain packages.

---

## 📄 License
MIT License. Built for educational diagnostic excellence.
