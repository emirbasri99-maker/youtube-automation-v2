-- ============================================
-- Migration 006: Fix plan types & initial credits
-- ============================================
-- 1. Allow TRIAL in plan_type CHECK constraint
-- 2. Set initial credits to 0 (webhook will assign correct amount)
-- 3. Update handle_new_user trigger to not pre-assign plan/credits

-- Fix CHECK constraint to include TRIAL
ALTER TABLE subscriptions 
  DROP CONSTRAINT IF EXISTS subscriptions_plan_type_check;

ALTER TABLE subscriptions 
  ADD CONSTRAINT subscriptions_plan_type_check 
  CHECK (plan_type IN ('TRIAL', 'STARTER', 'PROFESSIONAL', 'BUSINESS'));

-- Update handle_new_user to create subscription with 0 credits
-- Webhook will assign real credits after payment
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Create subscription with 0 credits (webhook will set plan + credits after payment)
  INSERT INTO public.subscriptions (user_id, plan_type, credits, status)
  VALUES (NEW.id, 'STARTER', 0, 'ACTIVE')
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Migration 006 applied: TRIAL plan allowed, initial credits set to 0' as result;
