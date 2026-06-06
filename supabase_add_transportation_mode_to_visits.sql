-- Migration SQL: Add transportation_mode to visits table
-- Execute this script in the Supabase SQL Editor (https://supabase.com/dashboard/project/wnpjcopndrvvxkmftlgd/sql/new)

ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS transportation_mode TEXT DEFAULT 'personal';
