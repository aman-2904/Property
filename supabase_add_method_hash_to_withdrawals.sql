-- ============================================================
-- SQL Migration: Add method and hash columns to withdrawals table
-- ============================================================

-- Alter withdrawals table to add method and hash columns
ALTER TABLE public.withdrawals 
ADD COLUMN IF NOT EXISTS method TEXT NOT NULL DEFAULT 'Bank Transfer',
ADD COLUMN IF NOT EXISTS hash TEXT;
