-- ============================================================
-- GeoPulse Database Schema
-- Run this in Supabase SQL Editor (Database → SQL Editor)
-- ============================================================

-- ============================================================
-- 1. EVENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.events (
  id              TEXT PRIMARY KEY,           -- GDELT global event ID
  country_code    TEXT        NOT NULL,        -- FIPS 2-letter country code
  event_type      TEXT        NOT NULL,        -- conflict | protest | sanctions | threat | other
  intensity_score FLOAT       NOT NULL,        -- 0–100 (derived from Goldstein scale)
  latitude        FLOAT       NOT NULL,
  longitude       FLOAT       NOT NULL,
  source_url      TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_events_country_code
  ON public.events (country_code);

CREATE INDEX IF NOT EXISTS idx_events_created_at
  ON public.events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_country_created
  ON public.events (country_code, created_at DESC);

-- ============================================================
-- 2. COUNTRIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.countries (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code    TEXT        UNIQUE NOT NULL,  -- FIPS 2-letter
  country_name    TEXT        NOT NULL,
  risk_score      INTEGER     NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  latitude        FLOAT       NOT NULL,
  longitude       FLOAT       NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_countries_risk_score
  ON public.countries (risk_score DESC);

CREATE INDEX IF NOT EXISTS idx_countries_code
  ON public.countries (country_code);

-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================

-- Events: anyone can read, only service role can write
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on events"
  ON public.events FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow service role full access on events"
  ON public.events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Countries: anyone can read, only service role can write
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on countries"
  ON public.countries FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow service role full access on countries"
  ON public.countries FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 4. AUTOMATIC CLEANUP FUNCTION (optional — cron handles this)
-- ============================================================
CREATE OR REPLACE FUNCTION delete_old_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.events
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$;

-- ============================================================
-- VERIFY (run after creation)
-- ============================================================
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public';
