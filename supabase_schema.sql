-- SQL Migration Script for AuraCommission Platform
-- Target: Supabase PostgreSQL Database

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Custom Types
CREATE TYPE agent_role AS ENUM ('admin', 'agent');
CREATE TYPE agent_rank AS ENUM ('Agent', 'Senior Agent', 'Manager', 'Director');
CREATE TYPE profile_status AS ENUM ('active', 'suspended');
CREATE TYPE sale_status AS ENUM ('pending_approval', 'approved', 'rejected');
CREATE TYPE commission_status AS ENUM ('pending', 'paid', 'cancelled');
CREATE TYPE payout_status AS ENUM ('pending', 'approved', 'rejected');

-- 1. PROFILES TABLE (extends Auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role agent_role DEFAULT 'agent'::agent_role,
    sponsor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    rank agent_rank DEFAULT 'Agent'::agent_rank,
    status profile_status DEFAULT 'active'::profile_status,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. PROPERTIES TABLE
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC(15, 2) NOT NULL CHECK (price >= 0),
    commission_percentage NUMERIC(5, 2) NOT NULL DEFAULT 5.00 CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
    image_url TEXT,
    status TEXT DEFAULT 'available' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Properties
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- 3. SALES TABLE (Transactions)
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
    agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    buyer_name TEXT NOT NULL,
    sale_price NUMERIC(15, 2) NOT NULL CHECK (sale_price >= 0),
    sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status sale_status DEFAULT 'pending_approval'::sale_status NOT NULL,
    document_url TEXT, -- upload agreement/proof of sale
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Sales
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- 4. COMMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
    type TEXT NOT NULL CHECK (type IN ('direct', 'indirect')),
    level INTEGER NOT NULL, -- 0 = direct selling agent, 1 = sponsor, 2 = grand-sponsor, etc.
    status commission_status DEFAULT 'pending'::commission_status NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Commissions
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

-- 5. PAYOUTS TABLE (Withdrawal Requests)
CREATE TABLE IF NOT EXISTS public.payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    status payout_status DEFAULT 'pending'::payout_status NOT NULL,
    payment_method TEXT NOT NULL,
    transaction_hash TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Payouts
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

----------------------------------------------------
-- RLS POLICIES
----------------------------------------------------

-- Profiles Policies
CREATE POLICY "Allow public read for active profiles" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow update for owners" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow admin full access" 
ON public.profiles FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'::agent_role
  )
);

-- Properties Policies
CREATE POLICY "Allow authenticated users to read properties" 
ON public.properties FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow admins full access to properties" 
ON public.properties FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'::agent_role
  )
);

-- Sales Policies
CREATE POLICY "Agents can view their own sales" 
ON public.sales FOR SELECT 
TO authenticated 
USING (
  agent_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'::agent_role
  )
);

CREATE POLICY "Agents can insert their own sales" 
ON public.sales FOR INSERT 
TO authenticated 
WITH CHECK (
  agent_id = auth.uid()
);

CREATE POLICY "Admins can update sales" 
ON public.sales FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'::agent_role
  )
);

CREATE POLICY "Admins can delete sales" 
ON public.sales FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'::agent_role
  )
);

-- Commissions Policies
CREATE POLICY "Agents can view their own commissions" 
ON public.commissions FOR SELECT 
TO authenticated 
USING (
  agent_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'::agent_role
  )
);

CREATE POLICY "Admins have full access to commissions" 
ON public.commissions FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'::agent_role
  )
);

-- Payouts Policies
CREATE POLICY "Agents can view their own payouts" 
ON public.payouts FOR SELECT 
TO authenticated 
USING (
  agent_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'::agent_role
  )
);

CREATE POLICY "Agents can create payout requests" 
ON public.payouts FOR INSERT 
TO authenticated 
WITH CHECK (
  agent_id = auth.uid() AND status = 'pending'::payout_status
);

CREATE POLICY "Admins have full access to payouts" 
ON public.payouts FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'::agent_role
  )
);

----------------------------------------------------
-- TRIGGERS & FUNCTIONS
----------------------------------------------------

-- Profile Auto-Creation Function from Auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    sponsor_exists boolean;
    valid_sponsor_id uuid;
    is_first_user boolean;
    default_role public.agent_role;
BEGIN
    -- Check if this is the first user in the database. If so, make them an admin.
    SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO is_first_user;
    
    IF is_first_user THEN
        default_role := 'admin'::public.agent_role;
    ELSE
        default_role := 'agent'::public.agent_role;
    END IF;

    -- Validate sponsor_id if passed in raw_user_meta_data
    valid_sponsor_id := NULL;
    IF (new.raw_user_meta_data->>'sponsor_id') IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (new.raw_user_meta_data->>'sponsor_id')::uuid
        ) INTO sponsor_exists;
        
        IF sponsor_exists THEN
            valid_sponsor_id := (new.raw_user_meta_data->>'sponsor_id')::uuid;
        END IF;
    END IF;

    INSERT INTO public.profiles (id, email, full_name, role, sponsor_id, rank, status)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', 'Unnamed Agent'),
        default_role,
        valid_sponsor_id,
        'Agent'::public.agent_rank,
        'active'::public.profile_status
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- Function to update agent ranks based on total sales volume
CREATE OR REPLACE FUNCTION public.recalculate_agent_rank(target_agent_id uuid)
RETURNS void AS $$
DECLARE
    total_sales_volume NUMERIC(15, 2);
    new_rank public.agent_rank;
    current_role public.agent_role;
BEGIN
    -- Get agent's role (do not change admin ranks)
    SELECT role INTO current_role FROM public.profiles WHERE id = target_agent_id;
    IF current_role = 'admin'::public.agent_role THEN
        RETURN;
    END IF;

    -- Calculate total approved sales volume
    SELECT COALESCE(SUM(sale_price), 0) INTO total_sales_volume
    FROM public.sales
    WHERE agent_id = target_agent_id AND status = 'approved'::public.sale_status;

    -- Determine Rank
    IF total_sales_volume >= 5000000.00 THEN
        new_rank := 'Director'::public.agent_rank;
    ELSIF total_sales_volume >= 2000000.00 THEN
        new_rank := 'Manager'::public.agent_rank;
    ELSIF total_sales_volume >= 500000.00 THEN
        new_rank := 'Senior Agent'::public.agent_rank;
    ELSE
        new_rank := 'Agent'::public.agent_rank;
    END IF;

    -- Update Profile Rank
    UPDATE public.profiles
    SET rank = new_rank, updated_at = now()
    WHERE id = target_agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- MLM Commission Distribution Function on Sale Approval
CREATE OR REPLACE FUNCTION public.distribute_mlm_commissions()
RETURNS trigger AS $$
DECLARE
    total_commission_pool NUMERIC(15, 2);
    comm_percentage NUMERIC(5, 2);
    current_agent_id uuid;
    current_sponsor_id uuid;
    sponsor_status public.profile_status;
    direct_amount NUMERIC(15, 2);
    upline_1_amount NUMERIC(15, 2);
    upline_2_amount NUMERIC(15, 2);
    upline_3_amount NUMERIC(15, 2);
BEGIN
    -- Only trigger when status transitions to 'approved'
    IF NEW.status = 'approved'::public.sale_status AND OLD.status != 'approved'::public.sale_status THEN
        
        -- Get commission percentage of property
        SELECT commission_percentage INTO comm_percentage
        FROM public.properties
        WHERE id = NEW.property_id;
        
        -- Calculate Total Commission Pool
        total_commission_pool := NEW.sale_price * (COALESCE(comm_percentage, 5.00) / 100.00);
        
        -- 1. LEVEL 0: Direct Selling Agent (50% of commission pool)
        direct_amount := total_commission_pool * 0.50;
        INSERT INTO public.commissions (sale_id, agent_id, amount, type, level, status)
        VALUES (NEW.id, NEW.agent_id, direct_amount, 'direct', 0, 'pending'::public.commission_status);
        
        -- Recalculate rank for the selling agent
        PERFORM public.recalculate_agent_rank(NEW.agent_id);

        -- Get immediate Sponsor
        SELECT sponsor_id INTO current_sponsor_id FROM public.profiles WHERE id = NEW.agent_id;
        
        -- 2. LEVEL 1: Sponsor Upline (25% of pool)
        IF current_sponsor_id IS NOT NULL THEN
            SELECT status INTO sponsor_status FROM public.profiles WHERE id = current_sponsor_id;
            
            IF sponsor_status = 'active'::public.profile_status THEN
                upline_1_amount := total_commission_pool * 0.25;
                INSERT INTO public.commissions (sale_id, agent_id, amount, type, level, status)
                VALUES (NEW.id, current_sponsor_id, upline_1_amount, 'indirect', 1, 'pending'::public.commission_status);
            END IF;
            
            -- Move up to Level 2 Sponsor
            SELECT sponsor_id INTO current_sponsor_id FROM public.profiles WHERE id = current_sponsor_id;
            
            -- 3. LEVEL 2: Upline's Sponsor (15% of pool)
            IF current_sponsor_id IS NOT NULL THEN
                SELECT status INTO sponsor_status FROM public.profiles WHERE id = current_sponsor_id;
                
                IF sponsor_status = 'active'::public.profile_status THEN
                    upline_2_amount := total_commission_pool * 0.15;
                    INSERT INTO public.commissions (sale_id, agent_id, amount, type, level, status)
                    VALUES (NEW.id, current_sponsor_id, upline_2_amount, 'indirect', 2, 'pending'::public.commission_status);
                END IF;
                
                -- Move up to Level 3 Sponsor
                SELECT sponsor_id INTO current_sponsor_id FROM public.profiles WHERE id = current_sponsor_id;
                
                -- 4. LEVEL 3: Upline's Sponsor's Sponsor (10% of pool)
                IF current_sponsor_id IS NOT NULL THEN
                    SELECT status INTO sponsor_status FROM public.profiles WHERE id = current_sponsor_id;
                    
                    IF sponsor_status = 'active'::public.profile_status THEN
                        upline_3_amount := total_commission_pool * 0.10;
                        INSERT INTO public.commissions (sale_id, agent_id, amount, type, level, status)
                        VALUES (NEW.id, current_sponsor_id, upline_3_amount, 'indirect', 3, 'pending'::public.commission_status);
                    END IF;
                END IF;
            END IF;
        END IF;
        
        -- Update Property status to sold
        UPDATE public.properties
        SET status = 'sold', updated_at = now()
        WHERE id = NEW.property_id;

    -- Handle cancellation / rejection transition (from approved back to pending or rejected)
    ELSIF NEW.status = 'rejected'::public.sale_status AND OLD.status = 'approved'::public.sale_status THEN
        -- Cancel related commissions
        UPDATE public.commissions
        SET status = 'cancelled'::public.commission_status
        WHERE sale_id = NEW.id;

        -- Re-open Property status to available
        UPDATE public.properties
        SET status = 'available', updated_at = now()
        WHERE id = NEW.property_id;

        -- Recalculate rank
        PERFORM public.recalculate_agent_rank(NEW.agent_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_sale_approved
  AFTER UPDATE OF status ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.distribute_mlm_commissions();
