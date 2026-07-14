-- Migration script for Property MLM Staff CRM
-- Execute in Supabase SQL Editor

-- 1. Add STAFF to user_role ENUM (Executed as standalone statement)
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'STAFF';

-- 2. Add last_login to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- 3. Create customer_leads table
CREATE TABLE IF NOT EXISTS public.customer_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    property_interest UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    budget NUMERIC(15, 2),
    source TEXT NOT NULL DEFAULT 'Website',
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'New',
    staff_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.customer_leads ENABLE ROW LEVEL SECURITY;

-- 4. Create lead_follow_ups table
CREATE TABLE IF NOT EXISTS public.lead_follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.customer_leads(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    follow_up_date DATE NOT NULL,
    follow_up_time TIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.lead_follow_ups ENABLE ROW LEVEL SECURITY;

-- 5. Create Indexes
CREATE INDEX IF NOT EXISTS idx_customer_leads_staff ON public.customer_leads(staff_id);
CREATE INDEX IF NOT EXISTS idx_customer_leads_property ON public.customer_leads(property_interest);
CREATE INDEX IF NOT EXISTS idx_customer_leads_status ON public.customer_leads(status);
CREATE INDEX IF NOT EXISTS idx_lead_follow_ups_lead ON public.lead_follow_ups(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_follow_ups_date ON public.lead_follow_ups(follow_up_date);
CREATE INDEX IF NOT EXISTS idx_lead_follow_ups_status ON public.lead_follow_ups(status);

-- 6. Recreate/create RLS policies

DROP POLICY IF EXISTS "Admin full access customer_leads" ON public.customer_leads;
DROP POLICY IF EXISTS "Staff select own customer_leads" ON public.customer_leads;
DROP POLICY IF EXISTS "Staff insert own customer_leads" ON public.customer_leads;
DROP POLICY IF EXISTS "Staff update own customer_leads" ON public.customer_leads;

DROP POLICY IF EXISTS "Admin full access lead_follow_ups" ON public.lead_follow_ups;
DROP POLICY IF EXISTS "Staff select own lead_follow_ups" ON public.lead_follow_ups;
DROP POLICY IF EXISTS "Staff insert own lead_follow_ups" ON public.lead_follow_ups;
DROP POLICY IF EXISTS "Staff update own lead_follow_ups" ON public.lead_follow_ups;

-- customer_leads Policies
CREATE POLICY "Admin full access customer_leads" ON public.customer_leads
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('SUPER_ADMIN'::public.user_role, 'ADMIN'::public.user_role)
        )
    );

CREATE POLICY "Staff select own customer_leads" ON public.customer_leads
    FOR SELECT TO authenticated
    USING (
        staff_id = auth.uid() AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'STAFF'::public.user_role
        )
    );

CREATE POLICY "Staff insert own customer_leads" ON public.customer_leads
    FOR INSERT TO authenticated
    WITH CHECK (
        staff_id = auth.uid() AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'STAFF'::public.user_role
        )
    );

CREATE POLICY "Staff update own customer_leads" ON public.customer_leads
    FOR UPDATE TO authenticated
    USING (
        staff_id = auth.uid() AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'STAFF'::public.user_role
        )
    )
    WITH CHECK (
        staff_id = auth.uid() AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'STAFF'::public.user_role
        )
    );

-- lead_follow_ups Policies
CREATE POLICY "Admin full access lead_follow_ups" ON public.lead_follow_ups
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('SUPER_ADMIN'::public.user_role, 'ADMIN'::public.user_role)
        )
    );

CREATE POLICY "Staff select own lead_follow_ups" ON public.lead_follow_ups
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.customer_leads l
            WHERE l.id = lead_id AND l.staff_id = auth.uid()
        ) AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'STAFF'::public.user_role
        )
    );

CREATE POLICY "Staff insert own lead_follow_ups" ON public.lead_follow_ups
    FOR INSERT TO authenticated
    WITH CHECK (
        created_by = auth.uid() AND EXISTS (
            SELECT 1 FROM public.customer_leads l
            WHERE l.id = lead_id AND l.staff_id = auth.uid()
        ) AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'STAFF'::public.user_role
        )
    );

CREATE POLICY "Staff update own lead_follow_ups" ON public.lead_follow_ups
    FOR UPDATE TO authenticated
    USING (
        created_by = auth.uid() AND EXISTS (
            SELECT 1 FROM public.customer_leads l
            WHERE l.id = lead_id AND l.staff_id = auth.uid()
        ) AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'STAFF'::public.user_role
        )
    )
    WITH CHECK (
        created_by = auth.uid() AND EXISTS (
            SELECT 1 FROM public.customer_leads l
            WHERE l.id = lead_id AND l.staff_id = auth.uid()
        ) AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'STAFF'::public.user_role
        )
    );
