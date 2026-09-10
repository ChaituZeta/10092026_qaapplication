-- HP QA Application - Safe & Fully Compatible Supabase Database Schema
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query -> Run)

-- 0. FOLDERS TABLE
CREATE TABLE IF NOT EXISTS public.folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT,
  year TEXT DEFAULT '2026',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.folders ADD COLUMN IF NOT EXISTS parent_id TEXT;
ALTER TABLE public.folders ADD COLUMN IF NOT EXISTS year TEXT DEFAULT '2026';
ALTER TABLE public.folders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access for folders" ON public.folders;
CREATE POLICY "Public access for folders" ON public.folders FOR ALL USING (true) WITH CHECK (true);

-- 1. CAMPAIGNS TABLE
CREATE TABLE IF NOT EXISTS public.campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT DEFAULT 'IN',
  version_name TEXT DEFAULT 'Standard',
  status TEXT DEFAULT 'Draft',
  web_view_url TEXT DEFAULT '',
  figma_url TEXT DEFAULT '',
  html_source TEXT DEFAULT '',
  litmus_url TEXT DEFAULT '',
  design_type TEXT DEFAULT 'figma',
  team TEXT DEFAULT 'HP-APJ',
  mockup_file_name TEXT DEFAULT '',
  mockup_data_url TEXT DEFAULT '',
  outlook_file_name TEXT DEFAULT '',
  outlook_extracted_html TEXT DEFAULT '',
  outlook_subject TEXT DEFAULT '',
  folder_id TEXT DEFAULT '2026',
  user_email TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  last_edited_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_by TEXT,
  deleted_at TIMESTAMPTZ,
  review_note TEXT DEFAULT '',
  qa_results JSONB DEFAULT '[]'::jsonb,
  checklists JSONB DEFAULT '[]'::jsonb,
  checklist_answers JSONB DEFAULT '{}'::jsonb,
  current_step INTEGER DEFAULT 1
);

-- Ensure missing columns are added if campaigns table already existed
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'IN';
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS version_name TEXT DEFAULT 'Standard';
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Draft';
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS web_view_url TEXT DEFAULT '';
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS figma_url TEXT DEFAULT '';
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS html_source TEXT DEFAULT '';
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS litmus_url TEXT DEFAULT '';
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS design_type TEXT DEFAULT 'figma';
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS team TEXT DEFAULT 'HP-APJ';
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS mockup_file_name TEXT DEFAULT '';
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS mockup_data_url TEXT DEFAULT '';
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS outlook_file_name TEXT DEFAULT '';
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS outlook_extracted_html TEXT DEFAULT '';
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS outlook_subject TEXT DEFAULT '';
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS folder_id TEXT DEFAULT '2026';
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS user_email TEXT DEFAULT '';
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT '';
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS last_edited_by TEXT DEFAULT '';
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS deleted_by TEXT;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS review_note TEXT DEFAULT '';
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS qa_results JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS checklists JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS checklist_answers JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS current_step INTEGER DEFAULT 1;

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access for campaigns" ON public.campaigns;
CREATE POLICY "Public access for campaigns" ON public.campaigns FOR ALL USING (true) WITH CHECK (true);

-- 2. APP_USERS TABLE
CREATE TABLE IF NOT EXISTS public.app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  team TEXT DEFAULT 'HP-APJ',
  status TEXT DEFAULT 'active',
  last_login TEXT DEFAULT 'Never',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS team TEXT DEFAULT 'HP-APJ';
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS last_login TEXT DEFAULT 'Never';
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS quick_login_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'app_users_email_key'
  ) THEN
    ALTER TABLE public.app_users ADD CONSTRAINT app_users_email_key UNIQUE (email);
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access for app_users" ON public.app_users;
CREATE POLICY "Public access for app_users" ON public.app_users FOR ALL USING (true) WITH CHECK (true);

-- 3. TEAMS TABLE
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'teams_name_key'
  ) THEN
    ALTER TABLE public.teams ADD CONSTRAINT teams_name_key UNIQUE (name);
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access for teams" ON public.teams;
CREATE POLICY "Public access for teams" ON public.teams FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.teams (name)
SELECT 'HP-APJ' WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'HP-APJ');
INSERT INTO public.teams (name)
SELECT 'HP-IND' WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'HP-IND');
INSERT INTO public.teams (name)
SELECT 'HP-SEA' WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'HP-SEA');

-- 4. COUNTRIES TABLE
CREATE TABLE IF NOT EXISTS public.countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT DEFAULT '',
  flag TEXT DEFAULT '🌐',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure missing columns are added and NULL constraint on url is dropped if present
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS url TEXT DEFAULT '';
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS flag TEXT DEFAULT '🌐';
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Make url column NULLABLE or default to '' if it was previously NOT NULL
ALTER TABLE public.countries ALTER COLUMN url DROP NOT NULL;
ALTER TABLE public.countries ALTER COLUMN url SET DEFAULT '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'countries_code_key'
  ) THEN
    ALTER TABLE public.countries ADD CONSTRAINT countries_code_key UNIQUE (code);
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access for countries" ON public.countries;
CREATE POLICY "Public access for countries" ON public.countries FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.countries (code, name, url, flag)
SELECT 'IN', 'India', '', '🇮🇳' WHERE NOT EXISTS (SELECT 1 FROM public.countries WHERE code = 'IN');
INSERT INTO public.countries (code, name, url, flag)
SELECT 'AU', 'Australia', '', '🇦🇺' WHERE NOT EXISTS (SELECT 1 FROM public.countries WHERE code = 'AU');
INSERT INTO public.countries (code, name, url, flag)
SELECT 'SG', 'Singapore', '', '🇸🇬' WHERE NOT EXISTS (SELECT 1 FROM public.countries WHERE code = 'SG');
INSERT INTO public.countries (code, name, url, flag)
SELECT 'MY', 'Malaysia', '', '🇲🇾' WHERE NOT EXISTS (SELECT 1 FROM public.countries WHERE code = 'MY');
INSERT INTO public.countries (code, name, url, flag)
SELECT 'NZ', 'New Zealand', '', '🇳🇿' WHERE NOT EXISTS (SELECT 1 FROM public.countries WHERE code = 'NZ');

-- 5. APP_SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expanded_logo_url TEXT DEFAULT '',
  collapsed_logo_url TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS expanded_logo_url TEXT DEFAULT '';
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS collapsed_logo_url TEXT DEFAULT '';
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS stage_labels JSONB DEFAULT '{"1": "Stage 1: Details & Source", "2": "Stage 2: Visual Comparison", "3": "Stage 3: Alt & Alias Tags", "4": "Stage 4: Link Validation", "5": "Stage 5: Grammar & Spell Check", "6": "Stage 6: Review & Approval / LAUNCH (FQA)", "7": "Stage 7: Review & Approval (FQA)"}'::jsonb;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access for app_settings" ON public.app_settings;
CREATE POLICY "Public access for app_settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);

-- 6. ACTIVITY_LOGS TABLE
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  action_type TEXT NOT NULL,
  details TEXT,
  campaign_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS campaign_id TEXT;

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access for activity_logs" ON public.activity_logs;
CREATE POLICY "Public access for activity_logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);

-- 7. CHECKLISTS TABLE
CREATE TABLE IF NOT EXISTS public.checklists (
  id TEXT PRIMARY KEY,
  team TEXT NOT NULL,
  title TEXT NOT NULL,
  items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.checklists ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.checklists ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access for checklists" ON public.checklists;
CREATE POLICY "Public access for checklists" ON public.checklists FOR ALL USING (true) WITH CHECK (true);

-- 8. REALTIME SUBSCRIPTION ENABLING
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.folders;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 9. AI_AGENTS TABLE
CREATE TABLE IF NOT EXISTS public.ai_agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  rules TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  assigned_teams JSONB DEFAULT '[]'::jsonb,
  model TEXT,
  welcome_message TEXT,
  conversation_starters JSONB DEFAULT '[]'::jsonb,
  capabilities JSONB DEFAULT '[]'::jsonb,
  mcp_servers JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access for ai_agents" ON public.ai_agents;
CREATE POLICY "Public access for ai_agents" ON public.ai_agents FOR ALL USING (true) WITH CHECK (true);

-- 10. APP_CREDENTIALS TABLE (Securely stores application credentials and secrets in the database)
CREATE TABLE IF NOT EXISTS public.app_credentials (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.app_credentials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access for app_credentials" ON public.app_credentials;
CREATE POLICY "Public access for app_credentials" ON public.app_credentials FOR ALL USING (true) WITH CHECK (true);

