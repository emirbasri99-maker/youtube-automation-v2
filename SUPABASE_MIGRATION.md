# Supabase Migration Guide

## 🎯 Quick Start

Follow these steps to set up your Supabase database and migrate from in-memory storage.

---

## Step 1: Run SQL Migration

1. **Open Supabase Dashboard:**
   - Go to https://supabase.com/dashboard
   - Select your project: `csaclpqtceciytvaicth`

2. **Open SQL Editor:**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy & Paste Migration Script:**
   - Open: `supabase/migrations/001_initial_schema.sql`
   - Copy entire contents
   - Paste into SQL Editor

4. **Run Migration:**
   - Click "Run" button
   - Wait for success message
   - Verify tables created

---

## Step 2: Create Test User

### Option A: Via Supabase Dashboard (Recommended)

1. **Go to Authentication:**
   - Click "Authentication" → "Users"
   - Click "Add User" → "Create new user"

2. **Create Demo User:**
   ```
   Email: demo@youtube.com
   Password: demo123
   Auto Confirm User: ✓ (checked)
   ```

3. **Click "Create User"**

### Option B: Via Application Signup

1. Add signup functionality to your app (already implemented in AuthContext)
2. Use the signup form on your landing page

---

## Step 3: Verify Database Setup

Run these queries in SQL Editor to verify:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'subscriptions', 'credit_transactions');

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'subscriptions', 'credit_transactions');

-- Check demo user (after creating user)
SELECT * FROM profiles;
SELECT * FROM subscriptions;
```

Expected results:
- 3 tables created
- RLS enabled on all tables
- Demo user profile created
- Default subscription (Starter, 2500 credits) auto-created

---

## Step 4: Test Application

### 4.1 Restart Development Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

### 4.2 Test Login Flow

1. Open http://localhost:3000
2. Click "Şimdi Abone Ol" or "Sign In"
3. Login with:
   - Email: `demo@youtube.com`
   - Password: `demo123`
4. Verify:
   - ✅ Login successful
   - ✅ Redirected to dashboard
   - ✅ Sidebar shows 2,500 credits
   - ✅ Plan name shows "Starter"

### 4.3 Test Credit Deduction

1. Navigate to "Shorts Oluştur"
2. Enter topic: "AI Araçları"
3. Click "Senaryo Oluştur"
4. Set scenes: 6
5. Click "Sahneleri İşle"
6. Verify:
   - ✅ Estimated cost notification: "600 kredi"
   - ✅ Scenes generate successfully
   - ✅ Credits deducted: 2500 → 1900
   - ✅ Sidebar updates in real-time

### 4.4 Test Insufficient Credits

1. Try creating 20-scene Shorts (needs 2000 credits)
2. Verify:
   - ✅ Upgrade modal appears
   - ✅ Shows "Yetersiz kredi" message
   - ✅ Displays plan comparison

### 4.5 Test Upgrade Flow

1. Click "Upgrade to Professional" in modal
2. Verify:
   - ✅ Plan changes to "Professional"
   - ✅ Credits increase: 1900 + 7500 = 9400
   - ✅ Sidebar updates immediately
   - ✅ Can now create 20-scene Shorts

### 4.6 Verify Database Persistence

1. Logout from application
2. Login again
3. Verify:
   - ✅ Credits persist (9400)
   - ✅ Plan persists (Professional)

### 4.7 Check Transaction History

Run in SQL Editor:

```sql
SELECT 
  amount,
  type,
  description,
  balance_after,
  created_at
FROM credit_transactions
WHERE user_id = (SELECT id FROM profiles WHERE email = 'demo@youtube.com')
ORDER BY created_at DESC;
```

Expected transactions:
1. `+7500` PURCHASE "Plan upgraded to PROFESSIONAL"
2. `-600` USAGE "Shorts creation: 6 scenes"
3. `+2500` PURCHASE "Plan upgraded to STARTER" (initial)

---

## Step 5: Monitor Real-Time Updates

### Test Real-Time Subscription Changes

1. Open application in browser
2. Open Supabase Dashboard → Table Editor → `subscriptions`
3. Manually update credits for demo user
4. Verify sidebar updates **without page refresh**

---

## Troubleshooting

### Issue: "Missing Supabase environment variables"

**Solution:**
- Verify `.env` file contains:
  ```
  VITE_SUPABASE_URL=https://csaclpqtceciytvaicth.supabase.co
  VITE_SUPABASE_ANON_KEY=sb_publishable_BwveM7iizUndjveIacvnAw_aNOWiYxq
  ```
- Restart dev server

### Issue: "Failed to load subscription"

**Solution:**
- Check user is logged in
- Verify subscription exists in database:
  ```sql
  SELECT * FROM subscriptions WHERE user_id = 'USER_ID_HERE';
  ```
- Check browser console for errors

### Issue: "Row Level Security policy violation"

**Solution:**
- Verify RLS policies created correctly
- Check user is authenticated:
  ```sql
  SELECT auth.uid(); -- Should return user ID
  ```

### Issue: Credits not deducting

**Solution:**
- Check browser console for errors
- Verify `deductCreditsFromDatabase` function called
- Check transaction log:
  ```sql
  SELECT * FROM credit_transactions ORDER BY created_at DESC LIMIT 5;
  ```

---

## Database Schema Reference

### Tables Created

1. **profiles**
   - `id` (UUID, PK) - Links to auth.users
   - `email` (TEXT, UNIQUE)
   - `full_name` (TEXT)
   - `avatar_url` (TEXT)
   - `created_at`, `updated_at` (TIMESTAMPTZ)

2. **subscriptions**
   - `id` (UUID, PK)
   - `user_id` (UUID, FK → profiles)
   - `plan_type` (TEXT) - STARTER | PROFESSIONAL | BUSINESS
   - `credits` (INTEGER)
   - `status` (TEXT) - ACTIVE | CANCELED | PAST_DUE
   - `stripe_customer_id`, `stripe_subscription_id` (TEXT)
   - `current_period_start`, `current_period_end` (TIMESTAMPTZ)
   - `created_at`, `updated_at` (TIMESTAMPTZ)

3. **credit_transactions**
   - `id` (UUID, PK)
   - `user_id` (UUID, FK → profiles)
   - `amount` (INTEGER)
   - `type` (TEXT) - PURCHASE | USAGE | REFUND | BONUS
   - `description` (TEXT)
   - `balance_after` (INTEGER)
   - `related_video_id` (TEXT)
   - `created_at` (TIMESTAMPTZ)

---

## Next Steps

After successful migration:

1. **Remove In-Memory Storage:**
   - Delete old `subscription.ts` in-memory Map code (optional)
   - Keep validation functions

2. **Add Stripe Integration:**
   - Set up Stripe webhooks
   - Handle subscription events
   - Auto-update database on payment

3. **Add Settings Page:**
   - View subscription details
   - Manage billing
   - View credit history

4. **Add Analytics:**
   - Track credit usage patterns
   - Show usage graphs
   - Predict credit depletion

---

## Success Checklist

- [ ] SQL migration executed successfully
- [ ] Demo user created
- [ ] Login works with Supabase Auth
- [ ] Credits display correctly in sidebar
- [ ] Credit deduction works on video generation
- [ ] Transaction log records all changes
- [ ] Upgrade flow updates database
- [ ] Real-time updates work
- [ ] Data persists after logout/login
- [ ] No console errors

**Once all items checked, migration is complete!** ✅
