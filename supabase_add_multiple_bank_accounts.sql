-- SQL migration to support multiple bank accounts and snapshots in withdrawals
-- Execute this script in your Supabase SQL Editor

-- 1. Add bank_accounts JSONB array column to public.profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bank_accounts JSONB DEFAULT '[]'::jsonb;

-- 2. Add bank_details JSONB snapshot column to public.withdrawals table
ALTER TABLE public.withdrawals 
ADD COLUMN IF NOT EXISTS bank_details JSONB;

-- Refresh PostgREST schema cache to ensure the new columns are immediately visible in the API
NOTIFY pgrst, 'reload schema';
