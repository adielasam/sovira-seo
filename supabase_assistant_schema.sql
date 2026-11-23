-- ============================================================================
-- SOVIRA AI TASK ASSISTANT — PRIVATE SINGLE-USER SCHEMA & DURABLE QUEUE
-- Owner UUID: f6e15a16-757b-4fa6-8b71-56254ebddfc5
-- Run in Supabase SQL Editor prior to starting the Assistant UI / Worker.
-- ============================================================================

-- Ensure pgcrypto is available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. Helper trigger function for updated_at (locked search_path)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_assistant_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.touch_assistant_updated_at() FROM PUBLIC, anon;

-- ----------------------------------------------------------------------------
-- 2. Conversations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assistant_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Assistant Session',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assistant_conversations_user_updated
  ON public.assistant_conversations(user_id, updated_at DESC);

DROP TRIGGER IF EXISTS trg_assistant_conversations_updated ON public.assistant_conversations;
CREATE TRIGGER trg_assistant_conversations_updated
  BEFORE UPDATE ON public.assistant_conversations
  FOR EACH ROW EXECUTE FUNCTION public.touch_assistant_updated_at();

-- ----------------------------------------------------------------------------
-- 3. Durable Tasks
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assistant_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.assistant_conversations(id) ON DELETE SET NULL,
  idempotency_key TEXT,
  instruction TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general' CHECK (
    category IN ('research', 'browser_automation', 'content_production', 'make_workflow', 'notion_sync', 'general')
  ),
  status TEXT NOT NULL DEFAULT 'planning' CHECK (
    status IN (
      'planning',
      'waiting_approval',
      'queued',
      'running',
      'waiting_external',
      'waiting_human_verification',
      'cancelling',
      'completed',
      'failed',
      'cancelled',
      'rejected'
    )
  ),
  plan JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB,
  approval_required BOOLEAN NOT NULL DEFAULT true,
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    approval_status IN ('pending', 'approved', 'rejected', 'not_required')
  ),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  cancel_requested BOOLEAN NOT NULL DEFAULT false,
  retry_count INT NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  max_retries INT NOT NULL DEFAULT 3 CHECK (max_retries >= 0 AND max_retries <= 10),
  error_code TEXT,
  error_message TEXT,
  execution_logs JSONB NOT NULL DEFAULT '[]'::jsonb,
  source TEXT NOT NULL DEFAULT 'web' CHECK (source IN ('web', 'telegram', 'webhook', 'mcp', 'chatgpt')),
  external_execution_id TEXT,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_assistant_tasks_idempotency
  ON public.assistant_tasks(user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assistant_tasks_user_created
  ON public.assistant_tasks(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_assistant_tasks_status
  ON public.assistant_tasks(user_id, status);

CREATE INDEX IF NOT EXISTS idx_assistant_tasks_external_exec
  ON public.assistant_tasks(external_execution_id)
  WHERE external_execution_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_assistant_tasks_updated ON public.assistant_tasks;
CREATE TRIGGER trg_assistant_tasks_updated
  BEFORE UPDATE ON public.assistant_tasks
  FOR EACH ROW EXECUTE FUNCTION public.touch_assistant_updated_at();

-- ----------------------------------------------------------------------------
-- 4. Task Steps
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assistant_task_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.assistant_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  title TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'running', 'waiting_external', 'waiting_human_verification', 'completed', 'failed', 'skipped', 'cancelled')
  ),
  output JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_assistant_task_steps_order
  ON public.assistant_task_steps(task_id, step_order);

-- ----------------------------------------------------------------------------
-- 5. Granular Task Audit & Execution Logs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assistant_task_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.assistant_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('info', 'warn', 'error', 'security', 'audit')),
  step_order INT,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assistant_task_logs_task_time
  ON public.assistant_task_logs(task_id, created_at ASC);

-- ----------------------------------------------------------------------------
-- 6. Durable Background Jobs Queue (FOR UPDATE SKIP LOCKED)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assistant_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.assistant_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL DEFAULT 'execute_task',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (
    status IN ('queued', 'running', 'waiting_external', 'waiting_human_verification', 'completed', 'failed', 'cancelled')
  ),
  locked_by TEXT,
  locked_at TIMESTAMPTZ,
  lease_expires_at TIMESTAMPTZ,
  attempt_count INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancel_requested BOOLEAN NOT NULL DEFAULT false,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent duplicate active jobs for the same task simultaneously
CREATE UNIQUE INDEX IF NOT EXISTS idx_assistant_jobs_one_active_per_task
  ON public.assistant_jobs(task_id)
  WHERE status IN ('queued', 'running', 'waiting_external', 'waiting_human_verification');

CREATE INDEX IF NOT EXISTS idx_assistant_jobs_poll
  ON public.assistant_jobs(user_id, status, next_run_at)
  WHERE status = 'queued';

CREATE INDEX IF NOT EXISTS idx_assistant_jobs_lease
  ON public.assistant_jobs(status, lease_expires_at)
  WHERE status = 'running';

DROP TRIGGER IF EXISTS trg_assistant_jobs_updated ON public.assistant_jobs;
CREATE TRIGGER trg_assistant_jobs_updated
  BEFORE UPDATE ON public.assistant_jobs
  FOR EACH ROW EXECUTE FUNCTION public.touch_assistant_updated_at();

-- ----------------------------------------------------------------------------
-- 7. Encrypted Integration Vault
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assistant_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (
    provider IN ('gemini', 'groq', 'chatgpt_mcp', 'openrouter', 'telegram', 'make', 'notion', 'elevenlabs', 'creatomate', 'google_oauth', 'browser_worker')
  ),
  enabled BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'unconfigured' CHECK (
    status IN ('connected', 'disconnected', 'unconfigured', 'error')
  ),
  encrypted_credentials TEXT,
  key_version TEXT NOT NULL DEFAULT 'v1',
  config_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_tested_at TIMESTAMPTZ,
  last_error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

DROP TRIGGER IF EXISTS trg_assistant_integrations_updated ON public.assistant_integrations;
CREATE TRIGGER trg_assistant_integrations_updated
  BEFORE UPDATE ON public.assistant_integrations
  FOR EACH ROW EXECUTE FUNCTION public.touch_assistant_updated_at();

-- ----------------------------------------------------------------------------
-- 8. Verified Telegram Account Linking
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assistant_telegram_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_user_id BIGINT,
  telegram_chat_id BIGINT,
  telegram_username TEXT,
  link_token_hash TEXT,
  token_expires_at TIMESTAMPTZ,
  verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

DROP TRIGGER IF EXISTS trg_assistant_telegram_links_updated ON public.assistant_telegram_links;
CREATE TRIGGER trg_assistant_telegram_links_updated
  BEFORE UPDATE ON public.assistant_telegram_links
  FOR EACH ROW EXECUTE FUNCTION public.touch_assistant_updated_at();

-- ----------------------------------------------------------------------------
-- 9. Webhook Deduplication Ledger
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assistant_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  event_key TEXT NOT NULL,
  payload_hash TEXT,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, event_key)
);

-- ----------------------------------------------------------------------------
-- 10. Background Worker Heartbeat & Health Registry
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assistant_worker_heartbeats (
  worker_id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hostname TEXT,
  pid INT,
  status TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'draining', 'offline')),
  active_jobs INT NOT NULL DEFAULT 0,
  version TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (STRICT SINGLE-OWNER ISOLATION)
-- ============================================================================
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'assistant_conversations',
    'assistant_tasks',
    'assistant_task_steps',
    'assistant_task_logs',
    'assistant_jobs',
    'assistant_integrations',
    'assistant_telegram_links',
    'assistant_webhook_events',
    'assistant_worker_heartbeats'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon;', tbl);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated, service_role;', tbl);

    EXECUTE format('DROP POLICY IF EXISTS "assistant_owner_only_select" ON public.%I;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "assistant_owner_only_insert" ON public.%I;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "assistant_owner_only_update" ON public.%I;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "assistant_owner_only_delete" ON public.%I;', tbl);

    EXECUTE format(
      'CREATE POLICY "assistant_owner_only_select" ON public.%I FOR SELECT TO authenticated USING (auth.uid() = user_id AND auth.uid() = ''f6e15a16-757b-4fa6-8b71-56254ebddfc5''::uuid);',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "assistant_owner_only_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND auth.uid() = ''f6e15a16-757b-4fa6-8b71-56254ebddfc5''::uuid);',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "assistant_owner_only_update" ON public.%I FOR UPDATE TO authenticated USING (auth.uid() = user_id AND auth.uid() = ''f6e15a16-757b-4fa6-8b71-56254ebddfc5''::uuid) WITH CHECK (auth.uid() = user_id AND auth.uid() = ''f6e15a16-757b-4fa6-8b71-56254ebddfc5''::uuid);',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "assistant_owner_only_delete" ON public.%I FOR DELETE TO authenticated USING (auth.uid() = user_id AND auth.uid() = ''f6e15a16-757b-4fa6-8b71-56254ebddfc5''::uuid);',
      tbl
    );
  END LOOP;
END $$;

-- ============================================================================
-- SECURED DURABLE WORKER RPCs (Fixed search_path + strict owner checks)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.claim_next_assistant_job(
  p_worker_id TEXT,
  p_lease_seconds INT DEFAULT 60,
  p_owner_id UUID DEFAULT 'f6e15a16-757b-4fa6-8b71-56254ebddfc5'::uuid
)
RETURNS SETOF public.assistant_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_job_id UUID;
BEGIN
  IF p_owner_id IS NULL OR p_owner_id <> 'f6e15a16-757b-4fa6-8b71-56254ebddfc5'::uuid THEN
    RAISE EXCEPTION 'Unauthorized assistant owner UUID';
  END IF;

  IF p_worker_id IS NULL OR length(trim(p_worker_id)) = 0 THEN
    RAISE EXCEPTION 'Worker identifier is required';
  END IF;

  SELECT j.id INTO v_job_id
  FROM public.assistant_jobs j
  WHERE j.user_id = p_owner_id
    AND j.status = 'queued'
    AND j.cancel_requested = false
    AND j.next_run_at <= NOW()
    AND j.attempt_count < j.max_attempts
  ORDER BY j.next_run_at ASC, j.created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_job_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  UPDATE public.assistant_jobs
  SET
    status = 'running',
    locked_by = p_worker_id,
    locked_at = NOW(),
    lease_expires_at = NOW() + make_interval(secs => GREATEST(15, LEAST(p_lease_seconds, 600))),
    attempt_count = attempt_count + 1,
    updated_at = NOW()
  WHERE id = v_job_id
    AND user_id = p_owner_id
  RETURNING *;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_next_assistant_job(TEXT, INT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_next_assistant_job(TEXT, INT, UUID) TO service_role;

-- Renew lease and report cancellation flag atomically
CREATE OR REPLACE FUNCTION public.renew_assistant_job_lease(
  p_job_id UUID,
  p_worker_id TEXT,
  p_lease_seconds INT DEFAULT 60,
  p_owner_id UUID DEFAULT 'f6e15a16-757b-4fa6-8b71-56254ebddfc5'::uuid
)
RETURNS TABLE(renewed BOOLEAN, cancel_requested BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cancel BOOLEAN;
BEGIN
  IF p_owner_id IS NULL OR p_owner_id <> 'f6e15a16-757b-4fa6-8b71-56254ebddfc5'::uuid THEN
    RAISE EXCEPTION 'Unauthorized assistant owner UUID';
  END IF;

  UPDATE public.assistant_jobs j
  SET
    lease_expires_at = NOW() + make_interval(secs => GREATEST(15, LEAST(p_lease_seconds, 600))),
    updated_at = NOW()
  WHERE j.id = p_job_id
    AND j.user_id = p_owner_id
    AND j.locked_by = p_worker_id
    AND j.status = 'running'
  RETURNING j.cancel_requested INTO v_cancel;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, true;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, COALESCE(v_cancel, false);
END;
$$;

REVOKE ALL ON FUNCTION public.renew_assistant_job_lease(UUID, TEXT, INT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.renew_assistant_job_lease(UUID, TEXT, INT, UUID) TO service_role;

-- Recover expired running jobs (crashed worker / lease timeout recovery)
CREATE OR REPLACE FUNCTION public.recover_stale_assistant_jobs(
  p_owner_id UUID DEFAULT 'f6e15a16-757b-4fa6-8b71-56254ebddfc5'::uuid
)
RETURNS TABLE(recovered_count INT, failed_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_recovered INT := 0;
  v_failed INT := 0;
  v_rec RECORD;
BEGIN
  IF p_owner_id IS NULL OR p_owner_id <> 'f6e15a16-757b-4fa6-8b71-56254ebddfc5'::uuid THEN
    RAISE EXCEPTION 'Unauthorized assistant owner UUID';
  END IF;

  FOR v_rec IN
    SELECT j.id, j.task_id, j.attempt_count, j.max_attempts
    FROM public.assistant_jobs j
    WHERE j.user_id = p_owner_id
      AND j.status = 'running'
      AND j.lease_expires_at IS NOT NULL
      AND j.lease_expires_at < NOW()
    FOR UPDATE SKIP LOCKED
  LOOP
    IF v_rec.attempt_count < v_rec.max_attempts THEN
      UPDATE public.assistant_jobs
      SET
        status = 'queued',
        locked_by = NULL,
        locked_at = NULL,
        lease_expires_at = NULL,
        next_run_at = NOW() + make_interval(secs => 15 * GREATEST(1, v_rec.attempt_count)),
        last_error = 'Recovered from expired worker lease',
        updated_at = NOW()
      WHERE id = v_rec.id;

      UPDATE public.assistant_tasks
      SET
        status = 'queued',
        retry_count = v_rec.attempt_count,
        error_code = 'WORKER_LEASE_EXPIRED',
        error_message = 'Worker lease expired; task re-queued automatically.',
        updated_at = NOW()
      WHERE id = v_rec.task_id AND user_id = p_owner_id AND status = 'running';

      INSERT INTO public.assistant_task_logs(task_id, user_id, level, message, metadata)
      VALUES (
        v_rec.task_id,
        p_owner_id,
        'warn',
        'Worker heartbeat lease expired; recovered and re-queued job.',
        jsonb_build_object('job_id', v_rec.id, 'attempt_count', v_rec.attempt_count)
      );

      v_recovered := v_recovered + 1;
    ELSE
      UPDATE public.assistant_jobs
      SET
        status = 'failed',
        locked_by = NULL,
        last_error = 'Exceeded max attempts after worker lease expiration',
        updated_at = NOW()
      WHERE id = v_rec.id;

      UPDATE public.assistant_tasks
      SET
        status = 'failed',
        error_code = 'MAX_RETRIES_EXCEEDED',
        error_message = 'Task failed after worker lease expiration and maximum retry attempts.',
        completed_at = NOW(),
        updated_at = NOW()
      WHERE id = v_rec.task_id AND user_id = p_owner_id;

      INSERT INTO public.assistant_task_logs(task_id, user_id, level, message, metadata)
      VALUES (
        v_rec.task_id,
        p_owner_id,
        'error',
        'Worker lease expired and max retry limit reached; marked task failed.',
        jsonb_build_object('job_id', v_rec.id, 'attempt_count', v_rec.attempt_count)
      );

      v_failed := v_failed + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_recovered, v_failed;
END;
$$;

REVOKE ALL ON FUNCTION public.recover_stale_assistant_jobs(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recover_stale_assistant_jobs(UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
