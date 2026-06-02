-- Enterprise Admin Dashboard — Activity Logs & Realtime Migration
-- Run this in your Supabase SQL Editor
-- Safe to re-run: drops and recreates activity_logs cleanly

----------------------------------------------------
-- 1. DROP & RECREATE ACTIVITY LOGS TABLE
--    (Drops cleanly if it existed without all columns)
----------------------------------------------------

-- Drop dependent triggers/policies/indexes first
DROP TRIGGER IF EXISTS trg_log_sales_activity ON public.sales;
DROP TRIGGER IF EXISTS trg_log_withdrawals_activity ON public.withdrawals;
DROP TRIGGER IF EXISTS trg_log_commissions_activity ON public.commissions;

-- Drop the table entirely so we can recreate with full schema
DROP TABLE IF EXISTS public.activity_logs CASCADE;

-- Recreate with all columns
CREATE TABLE public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,                         -- e.g. 'sale_approved', 'withdrawal_rejected'
    entity_type TEXT NOT NULL,                    -- 'sale' | 'commission' | 'withdrawal'
    entity_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for fast queries
CREATE INDEX activity_logs_created_at_idx ON public.activity_logs (created_at DESC);
CREATE INDEX activity_logs_entity_type_idx ON public.activity_logs (entity_type);
CREATE INDEX activity_logs_actor_id_idx ON public.activity_logs (actor_id);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Admins can read all logs
DROP POLICY IF EXISTS "Admins can read activity_logs" ON public.activity_logs;
CREATE POLICY "Admins can read activity_logs" ON public.activity_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

-- System trigger inserts freely
DROP POLICY IF EXISTS "System inserts activity_logs" ON public.activity_logs;
CREATE POLICY "System inserts activity_logs" ON public.activity_logs
    FOR INSERT WITH CHECK (true);

----------------------------------------------------
-- 2. TRIGGER FUNCTION: log_activity()
----------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_action TEXT;
    v_entity_type TEXT;
    v_actor_id UUID;
    v_metadata JSONB;
BEGIN
    IF TG_TABLE_NAME = 'sales' THEN
        v_entity_type := 'sale';
        v_actor_id := NEW.approved_by;
        IF NEW.status = 'approved' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM NEW.status) THEN
            v_action := 'sale_approved';
            v_metadata := jsonb_build_object(
                'amount', NEW.sale_amount,
                'property_id', NEW.property_id,
                'seller_id', NEW.seller_id
            );
        ELSIF NEW.status = 'rejected' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM NEW.status) THEN
            v_action := 'sale_rejected';
            v_metadata := jsonb_build_object('seller_id', NEW.seller_id);
        ELSIF TG_OP = 'INSERT' THEN
            v_action := 'sale_submitted';
            v_actor_id := NEW.seller_id;
            v_metadata := jsonb_build_object('amount', NEW.sale_amount, 'seller_id', NEW.seller_id);
        ELSE
            RETURN NEW;
        END IF;

    ELSIF TG_TABLE_NAME = 'withdrawals' THEN
        v_entity_type := 'withdrawal';
        v_actor_id := NEW.processed_by;
        IF NEW.status = 'approved' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM NEW.status) THEN
            v_action := 'withdrawal_approved';
            v_metadata := jsonb_build_object('amount', NEW.amount, 'user_id', NEW.user_id);
        ELSIF NEW.status = 'rejected' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM NEW.status) THEN
            v_action := 'withdrawal_rejected';
            v_metadata := jsonb_build_object('amount', NEW.amount, 'user_id', NEW.user_id);
        ELSIF TG_OP = 'INSERT' THEN
            v_action := 'withdrawal_requested';
            v_actor_id := NEW.user_id;
            v_metadata := jsonb_build_object('amount', NEW.amount);
        ELSE
            RETURN NEW;
        END IF;

    ELSIF TG_TABLE_NAME = 'commissions' THEN
        v_entity_type := 'commission';
        v_actor_id := NEW.approved_by;
        IF NEW.status = 'approved' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM NEW.status) THEN
            v_action := 'commission_approved';
            v_metadata := jsonb_build_object('amount', NEW.amount, 'recipient_id', NEW.recipient_id);
        ELSIF NEW.status = 'rejected' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM NEW.status) THEN
            v_action := 'commission_rejected';
            v_metadata := jsonb_build_object('recipient_id', NEW.recipient_id);
        ELSIF TG_OP = 'INSERT' THEN
            v_action := 'commission_created';
            v_actor_id := NEW.recipient_id;
            v_metadata := jsonb_build_object('amount', NEW.amount, 'level', NEW.level);
        ELSE
            RETURN NEW;
        END IF;

    ELSE
        RETURN NEW;
    END IF;

    INSERT INTO public.activity_logs (actor_id, action, entity_type, entity_id, metadata)
    VALUES (v_actor_id, v_action, v_entity_type, NEW.id, v_metadata);

    RETURN NEW;
END;
$$;

----------------------------------------------------
-- 3. ATTACH TRIGGERS
----------------------------------------------------
CREATE TRIGGER trg_log_sales_activity
    AFTER INSERT OR UPDATE OF status ON public.sales
    FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER trg_log_withdrawals_activity
    AFTER INSERT OR UPDATE OF status ON public.withdrawals
    FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER trg_log_commissions_activity
    AFTER INSERT OR UPDATE OF status ON public.commissions
    FOR EACH ROW EXECUTE FUNCTION public.log_activity();

----------------------------------------------------
-- 4. ENABLE SUPABASE REALTIME
--    ALTER PUBLICATION is idempotent-safe via DO block
----------------------------------------------------
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawals;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.commissions;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END$$;
