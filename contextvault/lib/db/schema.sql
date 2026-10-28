-- ContextVault migration 001. All vectors are 1536-dimensional: OpenAI
-- text-embedding-3-small's documented default; the deterministic mock uses the
-- same shape but is isolated by embedding_model and is NOT a semantic model.
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY, email text NOT NULL UNIQUE, display_name text NOT NULL,
  password_hash text NOT NULL, role text NOT NULL DEFAULT 'user' CHECK(role IN ('user','developer')), created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';
CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE TABLE IF NOT EXISTS collections (
  id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 100), description text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT 'violet', chunk_size integer NOT NULL DEFAULT 900 CHECK(chunk_size BETWEEN 300 AND 2400),
  chunk_overlap integer NOT NULL DEFAULT 120 CHECK(chunk_overlap >= 0 AND chunk_overlap < chunk_size),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(id, owner_id), UNIQUE(owner_id, name)
);
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  collection_id uuid NOT NULL, filename text NOT NULL, content_type text NOT NULL,
  file_size integer NOT NULL CHECK(file_size > 0), storage_key text NOT NULL UNIQUE, checksum text NOT NULL,
  page_count integer, status text NOT NULL DEFAULT 'UPLOADED' CHECK (status IN ('UPLOADED','VALIDATING','EXTRACTING','CHUNKING','EMBEDDING','INDEXING','READY','FAILED')),
  progress integer NOT NULL DEFAULT 0 CHECK(progress BETWEEN 0 AND 100), error text,
  tags text[] NOT NULL DEFAULT '{}', archived boolean NOT NULL DEFAULT false,
  timings jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(id, owner_id), UNIQUE(id, collection_id, owner_id),
  FOREIGN KEY(collection_id,owner_id) REFERENCES collections(id,owner_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS documents_owner_created_idx ON documents(owner_id,created_at DESC);
CREATE INDEX IF NOT EXISTS documents_collection_created_idx ON documents(collection_id,created_at DESC);
CREATE TABLE IF NOT EXISTS document_chunks (
  id uuid PRIMARY KEY, document_id uuid NOT NULL, collection_id uuid NOT NULL, owner_id uuid NOT NULL,
  chunk_index integer NOT NULL CHECK(chunk_index >= 0), content text NOT NULL, page_number integer,
  section_title text, token_count integer NOT NULL, metadata jsonb NOT NULL DEFAULT '{}',
  embedding_model text NOT NULL, embedding vector(1536) NOT NULL,
  search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(document_id,chunk_index), UNIQUE(id,owner_id),
  FOREIGN KEY(document_id,collection_id,owner_id) REFERENCES documents(id,collection_id,owner_id) ON UPDATE CASCADE ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS chunks_scope_idx ON document_chunks(owner_id,collection_id,embedding_model);
CREATE INDEX IF NOT EXISTS chunks_document_idx ON document_chunks(document_id,chunk_index);
CREATE INDEX IF NOT EXISTS chunks_fts_idx ON document_chunks USING gin(search_vector);
-- HNSW supports incremental updates and performs well for a growing corpus.
-- Re-evaluate memory, filtered recall and build time at production scale.
CREATE INDEX IF NOT EXISTS chunks_embedding_hnsw_idx ON document_chunks USING hnsw (embedding vector_cosine_ops) WITH (m=16, ef_construction=64);
CREATE TABLE IF NOT EXISTS ingestion_jobs (
  id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_id uuid NOT NULL, status text NOT NULL DEFAULT 'QUEUED' CHECK(status IN ('QUEUED','PROCESSING','DONE','FAILED')),
  attempts integer NOT NULL DEFAULT 0, max_attempts integer NOT NULL DEFAULT 3,
  available_at timestamptz NOT NULL DEFAULT now(), locked_at timestamptz, last_error text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(document_id,owner_id) REFERENCES documents(id,owner_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS jobs_claim_idx ON ingestion_jobs(owner_id,status,available_at);
CREATE UNIQUE INDEX IF NOT EXISTS jobs_one_active_doc_idx ON ingestion_jobs(document_id) WHERE status IN ('QUEUED','PROCESSING');
-- Durable cleanup outbox prevents object-storage failures from orphaning uploads.
CREATE TABLE IF NOT EXISTS storage_deletions (
  id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  storage_key text NOT NULL, status text NOT NULL DEFAULT 'QUEUED' CHECK(status IN ('QUEUED','PROCESSING','FAILED')),
  attempts integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT now(), locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS storage_deletions_claim_idx ON storage_deletions(owner_id,status,available_at);
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  collection_id uuid NOT NULL, title text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,owner_id),
  FOREIGN KEY(collection_id,owner_id) REFERENCES collections(id,owner_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS conversations_owner_updated_idx ON conversations(owner_id,updated_at DESC);
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY, owner_id uuid NOT NULL, conversation_id uuid NOT NULL,
  role text NOT NULL CHECK(role IN ('USER','ASSISTANT','SYSTEM')), content text NOT NULL,
  model text, token_usage jsonb NOT NULL DEFAULT '{}', metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(id,owner_id), FOREIGN KEY(conversation_id,owner_id) REFERENCES conversations(id,owner_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS messages_conversation_created_idx ON messages(conversation_id,created_at);
CREATE TABLE IF NOT EXISTS citations (
  id uuid PRIMARY KEY, owner_id uuid NOT NULL, message_id uuid NOT NULL, chunk_id uuid REFERENCES document_chunks(id) ON DELETE SET NULL,
  citation_index integer NOT NULL, similarity real, UNIQUE(message_id,citation_index),
  FOREIGN KEY(message_id,owner_id) REFERENCES messages(id,owner_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS retrieval_events (
  id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_id uuid, collection_id uuid NOT NULL, strategy text NOT NULL, result_count integer NOT NULL,
  duration_ms integer NOT NULL, metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(collection_id,owner_id) REFERENCES collections(id,owner_id) ON DELETE CASCADE,
  FOREIGN KEY(message_id,owner_id) REFERENCES messages(id,owner_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS usage_events (
  id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL, model text NOT NULL, input_tokens integer, output_tokens integer, latency_ms integer,
  estimated_cost numeric, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action text NOT NULL, resource_id uuid, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS evaluation_runs (
  id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  collection_id uuid NOT NULL, question text NOT NULL, expected_document_id uuid,
  result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(collection_id,owner_id) REFERENCES collections(id,owner_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS rate_limits (
  key text PRIMARY KEY, count integer NOT NULL, window_start timestamptz NOT NULL DEFAULT now()
);
-- Application requests use SET LOCAL app.user_id inside each transaction.
-- In PostgreSQL run migrations under a different role; the runtime role must
-- be NOSUPERUSER NOBYPASSRLS. FORCE also subjects a non-superuser table owner.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['collections','documents','document_chunks','ingestion_jobs','storage_deletions','conversations','messages','citations','retrieval_events','usage_events','audit_events','evaluation_runs'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS owner_isolation ON %I', t);
    EXECUTE format('CREATE POLICY owner_isolation ON %I USING (owner_id = NULLIF(current_setting(''app.user_id'', true), '''')::uuid) WITH CHECK (owner_id = NULLIF(current_setting(''app.user_id'', true), '''')::uuid)', t);
  END LOOP;
END $$;
