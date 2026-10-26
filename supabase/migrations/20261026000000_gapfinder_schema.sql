-- ==========================================================
-- GapFinder AI - Supabase Production Schema & Migrations
-- PostgreSQL with pgvector, RLS, and secure answer key isolation
-- ==========================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. Profiles table linked to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Subjects table
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  exam_date TIMESTAMPTZ,
  daily_study_minutes INTEGER NOT NULL DEFAULT 60 CHECK (daily_study_minutes >= 15 AND daily_study_minutes <= 720),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'processed', 'failed')),
  processing_error TEXT,
  page_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Document Chunks table (with 768-dim vector embeddings for Gemini text-embedding-004)
CREATE TABLE IF NOT EXISTS public.document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  page_number INTEGER,
  section_title TEXT,
  token_count INTEGER,
  embedding vector(768),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Topics table
CREATE TABLE IF NOT EXISTS public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  parent_topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  syllabus_unit TEXT,
  importance INTEGER NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  estimated_study_minutes INTEGER NOT NULL DEFAULT 45 CHECK (estimated_study_minutes >= 10),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Topic Sources mapping
CREATE TABLE IF NOT EXISTS public.topic_sources (
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  chunk_id UUID NOT NULL REFERENCES public.document_chunks(id) ON DELETE CASCADE,
  relationship_metadata JSONB,
  PRIMARY KEY (topic_id, chunk_id)
);

-- 8. Quiz Attempts table
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  quiz_type TEXT NOT NULL DEFAULT 'diagnostic',
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'evaluated')),
  total_score NUMERIC(5,2),
  total_possible NUMERIC(5,2),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Questions table (Public viewable by student during quiz - NO correct answers)
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL CHECK (question_type IN ('single_choice', 'multiple_choice', 'true_false', 'short_answer')),
  question_text TEXT NOT NULL,
  options JSONB,
  explanation TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  marks INTEGER NOT NULL DEFAULT 1 CHECK (marks >= 1),
  source_references JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Question Answer Keys (Isolated protected table - NEVER queried by client before quiz submission)
CREATE TABLE IF NOT EXISTS public.question_answer_keys (
  question_id UUID PRIMARY KEY REFERENCES public.questions(id) ON DELETE CASCADE,
  correct_answer JSONB NOT NULL,
  rubric JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Student Responses
CREATE TABLE IF NOT EXISTS public.responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answer JSONB,
  awarded_marks NUMERIC(5,2),
  maximum_marks NUMERIC(5,2) NOT NULL,
  is_correct BOOLEAN,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Topic Mastery (Aggregated assessment diagnosis)
CREATE TABLE IF NOT EXISTS public.topic_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  mastery_score NUMERIC(5,2),
  status TEXT NOT NULL DEFAULT 'insufficient_data' CHECK (status IN ('insufficient_data', 'weak', 'medium', 'strong')),
  confidence TEXT NOT NULL DEFAULT 'low' CHECK (confidence IN ('low', 'medium', 'high')),
  assessed_question_count INTEGER NOT NULL DEFAULT 0,
  evidence_summary TEXT NOT NULL DEFAULT '',
  last_assessed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_topic_mastery UNIQUE (user_id, topic_id)
);

-- 13. Revision Tasks
CREATE TABLE IF NOT EXISTS public.revision_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority_score NUMERIC(5,2) NOT NULL DEFAULT 50.00,
  scheduled_date DATE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
  completion_metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Chat Sessions and Messages (Grounded Topic Assistant)
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('user', 'assistant')),
  content TEXT NOT NULL,
  citations JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================================
-- INDEXES FOR HIGH-PERFORMANCE QUERIES
-- ==========================================================

CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON public.subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_subject ON public.documents(user_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_chunks_user_doc ON public.document_chunks(user_id, document_id);
CREATE INDEX IF NOT EXISTS idx_topics_subject ON public.topics(subject_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_sub ON public.quiz_attempts(user_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_attempt ON public.questions(attempt_id);
CREATE INDEX IF NOT EXISTS idx_responses_attempt_user ON public.responses(attempt_id, user_id);
CREATE INDEX IF NOT EXISTS idx_topic_mastery_user_sub ON public.topic_mastery(user_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_revision_tasks_user_date ON public.revision_tasks(user_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON public.chat_messages(session_id);

-- Vector index for cosine similarity search (pgvector HNSW)
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
  ON public.document_chunks
  USING hnsw (embedding vector_cosine_ops);

-- ==========================================================
-- PGVECTOR VECTOR SEARCH RPC FUNCTION
-- ==========================================================

CREATE OR REPLACE FUNCTION public.match_document_chunks (
  query_embedding vector(768),
  filter_user_id UUID,
  filter_subject_id UUID,
  match_count INT DEFAULT 6,
  match_threshold FLOAT DEFAULT 0.45
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  filename TEXT,
  chunk_index INT,
  content TEXT,
  page_number INT,
  section_title TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Security guard: Prevent cross-user data access.
  -- Caller must be authenticated as filter_user_id OR running with service_role privileges.
  IF auth.uid() IS NOT NULL AND auth.uid() <> filter_user_id THEN
    RAISE EXCEPTION 'Access denied: Cannot query document chunks belonging to another user.';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.document_id,
    d.filename,
    c.chunk_index,
    c.content,
    c.page_number,
    c.section_title,
    (1 - (c.embedding <=> query_embedding))::FLOAT AS similarity
  FROM public.document_chunks c
  JOIN public.documents d ON d.id = c.document_id
  WHERE c.user_id = filter_user_id
    AND d.subject_id = filter_subject_id
    AND c.embedding IS NOT NULL
    AND (1 - (c.embedding <=> query_embedding)) >= match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Restrict execution to authenticated users and service_role
REVOKE EXECUTE ON FUNCTION public.match_document_chunks(vector(768), UUID, UUID, INT, FLOAT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.match_document_chunks(vector(768), UUID, UUID, INT, FLOAT) FROM anon;
GRANT EXECUTE ON FUNCTION public.match_document_chunks(vector(768), UUID, UUID, INT, FLOAT) TO authenticated, service_role;

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict isolation: Users can ONLY access their own data
-- ==========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_answer_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revision_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Profiles: user can read, insert, and update their own profile
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Subjects: user can CRUD own subjects
CREATE POLICY "Users can view own subjects" ON public.subjects
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subjects" ON public.subjects
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subjects" ON public.subjects
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own subjects" ON public.subjects
  FOR DELETE USING (auth.uid() = user_id);

-- Documents: user can CRUD own documents
CREATE POLICY "Users can view own documents" ON public.documents
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own documents" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own documents" ON public.documents
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents" ON public.documents
  FOR DELETE USING (auth.uid() = user_id);

-- Document Chunks: user can access own chunks
CREATE POLICY "Users can view own chunks" ON public.document_chunks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chunks" ON public.document_chunks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own chunks" ON public.document_chunks
  FOR DELETE USING (auth.uid() = user_id);

-- Topics: access via subject ownership
CREATE POLICY "Users can view topics of own subjects" ON public.topics
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.subjects s WHERE s.id = topics.subject_id AND s.user_id = auth.uid())
  );
CREATE POLICY "Users can insert topics to own subjects" ON public.topics
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.subjects s WHERE s.id = topics.subject_id AND s.user_id = auth.uid())
  );
CREATE POLICY "Users can update topics of own subjects" ON public.topics
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.subjects s WHERE s.id = topics.subject_id AND s.user_id = auth.uid())
  );
CREATE POLICY "Users can delete topics of own subjects" ON public.topics
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.subjects s WHERE s.id = topics.subject_id AND s.user_id = auth.uid())
  );

-- Topic Sources: access via topic -> subject ownership
CREATE POLICY "Users can view own topic sources" ON public.topic_sources
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.topics t
      JOIN public.subjects s ON s.id = t.subject_id
      WHERE t.id = topic_sources.topic_id AND s.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert own topic sources" ON public.topic_sources
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.topics t
      JOIN public.subjects s ON s.id = t.subject_id
      WHERE t.id = topic_sources.topic_id AND s.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete own topic sources" ON public.topic_sources
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.topics t
      JOIN public.subjects s ON s.id = t.subject_id
      WHERE t.id = topic_sources.topic_id AND s.user_id = auth.uid()
    )
  );

-- Quiz Attempts: user can CRUD own attempts
CREATE POLICY "Users can view own quiz attempts" ON public.quiz_attempts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own quiz attempts" ON public.quiz_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own quiz attempts" ON public.quiz_attempts
  FOR UPDATE USING (auth.uid() = user_id);

-- Questions: user can view questions of their own quiz attempt
CREATE POLICY "Users can view questions of own attempt" ON public.questions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.quiz_attempts a WHERE a.id = questions.attempt_id AND a.user_id = auth.uid())
  );

-- Question Answer Keys: EXCLUSIVELY server-role or strictly after attempt evaluated
-- Client cannot read answer keys during an in-progress quiz!
CREATE POLICY "Users can read answers only after quiz evaluation" ON public.question_answer_keys
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.questions q
      JOIN public.quiz_attempts a ON a.id = q.attempt_id
      WHERE q.id = question_answer_keys.question_id
        AND a.user_id = auth.uid()
        AND a.status IN ('submitted', 'evaluated')
    )
  );

-- Responses: user can view and insert own responses
CREATE POLICY "Users can view own responses" ON public.responses
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own responses" ON public.responses
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own responses" ON public.responses
  FOR UPDATE USING (auth.uid() = user_id);

-- Topic Mastery: user can manage own mastery
CREATE POLICY "Users can manage own mastery" ON public.topic_mastery
  FOR ALL USING (auth.uid() = user_id);

-- Revision Tasks: user can manage own revision tasks
CREATE POLICY "Users can manage own revision tasks" ON public.revision_tasks
  FOR ALL USING (auth.uid() = user_id);

-- Chat Sessions: user can CRUD own chat sessions
CREATE POLICY "Users can manage own chat sessions" ON public.chat_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Chat Messages: access via session ownership
CREATE POLICY "Users can manage messages in own session" ON public.chat_messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.chat_sessions s WHERE s.id = chat_messages.session_id AND s.user_id = auth.uid())
  );

-- ==========================================================
-- STORAGE BUCKET & STORAGE RLS POLICIES
-- Bucket 'course_materials' is private and strictly partitioned by user
-- Storage path structure: user_<user_id>/<timestamp>_<filename>
-- ==========================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course_materials',
  'course_materials',
  false,
  26214400, -- 25 MB max limit
  ARRAY['application/pdf', 'text/plain']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 26214400,
  allowed_mime_types = ARRAY['application/pdf', 'text/plain'];

-- Storage RLS Policies
DROP POLICY IF EXISTS "Users can upload own course materials" ON storage.objects;
CREATE POLICY "Users can upload own course materials"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'course_materials'
    AND (storage.foldername(name))[1] = ('user_' || auth.uid()::text)
  );

DROP POLICY IF EXISTS "Users can view own course materials" ON storage.objects;
CREATE POLICY "Users can view own course materials"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'course_materials'
    AND (storage.foldername(name))[1] = ('user_' || auth.uid()::text)
  );

DROP POLICY IF EXISTS "Users can delete own course materials" ON storage.objects;
CREATE POLICY "Users can delete own course materials"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'course_materials'
    AND (storage.foldername(name))[1] = ('user_' || auth.uid()::text)
  );
