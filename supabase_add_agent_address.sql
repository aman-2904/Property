-- Migration: Add address column to profiles and update handle_new_user_v2 trigger function

-- 1. Add address column to profiles table if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address TEXT;

-- 2. Update handle_new_user_v2 trigger function to copy address from auth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user_v2()
RETURNS TRIGGER AS $$
DECLARE
    sponsor_exists BOOLEAN;
    valid_sponsor_id UUID;
    valid_network_lvl INTEGER;
    is_first_user BOOLEAN;
    default_role public.user_role;
    ref_code TEXT;
    code_exists BOOLEAN;
BEGIN
    SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO is_first_user;
    
    IF is_first_user THEN
        default_role := 'SUPER_ADMIN'::public.user_role;
    ELSE
        default_role := 'AGENT'::public.user_role;
    END IF;

    valid_sponsor_id := NULL;
    valid_network_lvl := 1;
    IF (new.raw_user_meta_data->>'upline_id') IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (new.raw_user_meta_data->>'upline_id')::uuid
        ) INTO sponsor_exists;
        
        IF sponsor_exists THEN
            valid_sponsor_id := (new.raw_user_meta_data->>'upline_id')::uuid;
            SELECT network_level INTO valid_network_lvl 
            FROM public.profiles 
            WHERE id = valid_sponsor_id;
            
            valid_network_lvl := valid_network_lvl + 1;
        END IF;
    END IF;

    -- Generate Unique Referral Code
    LOOP
        ref_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
        SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = ref_code) INTO code_exists;
        EXIT WHEN NOT code_exists;
    END LOOP;

    INSERT INTO public.profiles (
        id, email, name, phone, address, avatar, role, referral_code, upline_id, network_level, promotion_level, is_active, is_system_user
    )
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'name', 'New Agent'),
        new.raw_user_meta_data->>'phone',
        new.raw_user_meta_data->>'address',
        new.raw_user_meta_data->>'avatar',
        default_role,
        ref_code,
        valid_sponsor_id,
        valid_network_lvl,
        0, -- rookie agent level
        TRUE,
        FALSE
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
