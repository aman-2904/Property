-- ============================================================
-- WALLET AND WITHDRAWAL SYSTEM MIGRATION
-- ============================================================

-- 1. Create process_withdrawal() trigger function
CREATE OR REPLACE FUNCTION public.process_withdrawal()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle Insert (Hold balance immediately on pending cashout request)
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'pending'::public.withdrawal_status THEN
      UPDATE public.wallets 
      SET balance = GREATEST(0.00, balance - NEW.amount) 
      WHERE user_id = NEW.user_id;
    END IF;

  -- Handle Update
  ELSIF TG_OP = 'UPDATE' THEN
    -- If status transitioned from pending to approved
    IF OLD.status = 'pending'::public.withdrawal_status AND NEW.status = 'approved'::public.withdrawal_status THEN
      UPDATE public.wallets 
      SET approved_balance = GREATEST(0.00, approved_balance - OLD.amount) 
      WHERE user_id = OLD.user_id;

    -- If status transitioned from pending to rejected (revert balance)
    ELSIF OLD.status = 'pending'::public.withdrawal_status AND NEW.status = 'rejected'::public.withdrawal_status THEN
      UPDATE public.wallets 
      SET balance = balance + OLD.amount 
      WHERE user_id = OLD.user_id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Rebind trigger to withdrawals table
DROP TRIGGER IF EXISTS on_withdrawal_balance_sync ON public.withdrawals;
CREATE TRIGGER on_withdrawal_balance_sync
  AFTER INSERT OR UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.process_withdrawal();
