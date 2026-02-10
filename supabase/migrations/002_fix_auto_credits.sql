-- ============================================
-- FIX: Remove Auto-Credits on Signup
-- ============================================
-- This script fixes the issue where users get free credits on signup
-- Credits should only be added AFTER successful Stripe payment

-- Function to handle new user signup (NO AUTO CREDITS!)
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
  
  -- Create subscription with 0 credits (credits added after payment)
  INSERT INTO public.subscriptions (user_id, plan_type, credits, status)
  VALUES (NEW.id, 'STARTER', 0, 'ACTIVE')
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Verify the change
-- ============================================
SELECT '✅ Trigger updated: New users will have 0 credits until payment' as result;
