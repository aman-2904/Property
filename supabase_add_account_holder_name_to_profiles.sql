-- SQL migration to add account_holder_name to public.profiles table
-- Execute this script in your Supabase SQL Editor

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS account_holder_name TEXT;

-- Refresh PostgREST schema cache to ensure the new column is immediately visible in the API
NOTIFY pgrst, 'reload schema';
