-- ============================================================
-- SQL Migration: Add created_at column to commissions table
-- ============================================================

-- Alter commissions table to add created_at column
ALTER TABLE public.commissions 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
