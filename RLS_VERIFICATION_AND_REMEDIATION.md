# RLS Verification and Remediation Queries

**Purpose:** Verify that Row Level Security (RLS) is enabled on all tables with correct policies
**Urgency:** 🔴 CRITICAL — Run before processing any production candidate data
**Date Created:** 2026-02-14

---

## Step 1: Audit — Verify RLS Status on All Tables

Run this query in your Supabase SQL Editor to see which tables exist and whether RLS is configured:

```sql
SELECT
  schemaname,
  tablename,
  rowsecurity,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = pt.tablename) as policy_count
FROM pg_tables pt
WHERE schemaname = 'public'
ORDER BY tablename;
```

**What to look for:**
- `rowsecurity = true` — RLS is enabled ✅
- `rowsecurity = false` — RLS is disabled ❌ (CRITICAL)
- `policy_count > 0` — At least one policy exists ✅
- `policy_count = 0` — No policies (CRITICAL)

**Example output:**
```
 schemaname |       tablename        | rowsecurity | policy_count
------------+------------------------+-------------+--------------
 public     | campaign_candidates    | t           |            1
 public     | client_b_candidates    | f           |            0   ← CRITICAL!
```

---

## Step 2: View Existing RLS Policies

For each table that shows `rowsecurity = true`, verify the policy is correct:

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Expected output for campaign_candidates:**
```
 schemaname |     tablename      |      policyname      | permissive |   roles    |          qual           | with_check
------------+--------------------+----------------------+------------+------------+-------------------------+------------
 public     | campaign_candidates | recruiter_access     | t          | {public}   | auth.email() = ...      | (null)
```

---

## Step 3: Remediation — Enable RLS on Tables That Need It

### 3a. Enable RLS on the table

```sql
-- Replace [TABLE_NAME] with the actual table name
ALTER TABLE [TABLE_NAME] ENABLE ROW LEVEL SECURITY;
```

### 3b. Create the isolation policy

For **moconstruction@gmail.com** (recruiter access):

```sql
-- For campaign_candidates table
CREATE POLICY "recruiter_access" ON campaign_candidates
  FOR ALL
  USING (auth.email() = 'moconstruction@gmail.com')
  WITH CHECK (auth.email() = 'moconstruction@gmail.com');
```

For **Client B** (if you have a separate table):

```sql
-- For client_b_candidates table (replace with actual client email)
CREATE POLICY "client_b_access" ON client_b_candidates
  FOR ALL
  USING (auth.email() = 'client-b-email@example.com')
  WITH CHECK (auth.email() = 'client-b-email@example.com');
```

For **Client C** (if applicable):

```sql
-- For client_c_candidates table
CREATE POLICY "client_c_access" ON client_c_candidates
  FOR ALL
  USING (auth.email() = 'client-c-email@example.com')
  WITH CHECK (auth.email() = 'client-c-email@example.com');
```

---

## Step 4: Verification — Test Each Table After RLS Setup

After applying RLS, test with curl to confirm it's working:

### Test 1: Recruiter access to their own table

```bash
curl -s -H "apikey: [ANON_KEY]" \
     -H "Authorization: Bearer [RECRUITER_JWT]" \
     "https://bebiojwkjnyyccnlqjge.supabase.co/rest/v1/campaign_candidates?select=*"

# Expected: Array of candidate records (if any exist)
```

### Test 2: Attack user CANNOT access recruiter's table

```bash
curl -s -H "apikey: [ANON_KEY]" \
     -H "Authorization: Bearer [ATTACK_JWT]" \
     "https://bebiojwkjnyyccnlqjge.supabase.co/rest/v1/campaign_candidates?select=*"

# Expected: [] (empty array)
```

### Test 3: Anonymous user CANNOT access any table

```bash
curl -s -H "apikey: [ANON_KEY]" \
     "https://bebiojwkjnyyccnlqjge.supabase.co/rest/v1/campaign_candidates?select=*"

# Expected: [] (empty array)
```

### Test 4: If Client B table exists, verify isolation

```bash
# As recruiter (moconstruction@gmail.com) — should NOT see Client B data
curl -s -H "apikey: [ANON_KEY]" \
     -H "Authorization: Bearer [RECRUITER_JWT]" \
     "https://bebiojwkjnyyccnlqjge.supabase.co/rest/v1/client_b_candidates?select=*"

# Expected: [] (empty array) or permission denied error
```

---

## Step 5: Additional Security Checks

### Check if RLS is enforced on Supabase Storage buckets

```sql
-- Supabase Storage RLS is configured separately in the dashboard
-- Verify via Supabase console:
-- 1. Go to Storage > resumes bucket
-- 2. Click "Policies" tab
-- 3. Confirm authenticated users can only access files uploaded by themselves
```

### Check if Auth functions have RLS

```sql
-- If you have custom SQL functions, verify they also have RLS enabled:
SELECT
  nspname as schema,
  proname as function_name
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE nspname = 'public'
ORDER BY proname;

-- For critical functions (auth-related), verify they are restricted to service_role
```

---

## Checklist — RLS Configuration Complete When:

- [ ] Run Step 1 query — identify all tables and their RLS status
- [ ] Run Step 2 query — verify existing policies are correct
- [ ] For each table with `rowsecurity = false`, run Step 3a (enable RLS)
- [ ] For each table without a policy, run Step 3b (create policy)
- [ ] Run Step 4 tests — confirm RLS is working with curl tests
- [ ] Run Step 5 checks — verify Storage and function RLS
- [ ] Document the results — save which tables were fixed

---

## Common Issues & Solutions

### Issue 1: Policy creates, but curl still returns data

**Symptom:** After creating a policy, anonymous users still see candidate data

**Cause:** RLS not actually enabled on the table

**Solution:**
```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'campaign_candidates';

-- If rowsecurity = false, run:
ALTER TABLE campaign_candidates ENABLE ROW LEVEL SECURITY;
```

---

### Issue 2: Authenticated recruiter gets "42501 permission denied" error

**Symptom:**
```json
{
  "code": "42501",
  "message": "permission denied for relation campaign_candidates"
}
```

**Cause:** The RLS policy is too restrictive, or the user's email doesn't match the policy

**Solution:**
```sql
-- Verify the email in the JWT matches the policy:
-- 1. Check the policy:
SELECT policyname, qual FROM pg_policies WHERE tablename = 'campaign_candidates';

-- 2. Check the JWT email (decode it and look for "email" claim)
-- 3. Update the policy if the email is wrong:
DROP POLICY IF EXISTS "recruiter_access" ON campaign_candidates;
CREATE POLICY "recruiter_access" ON campaign_candidates
  FOR ALL
  USING (auth.email() = 'correct-email@gmail.com');
```

---

### Issue 3: Multiple RLS policies exist, causing unexpected behavior

**Symptom:** Some queries work, some don't; behavior is unpredictable

**Cause:** Multiple policies with conflicting USING clauses

**Solution:**
```sql
-- View all policies on the table:
SELECT policyname, qual, permissive FROM pg_policies WHERE tablename = 'campaign_candidates';

-- Drop unwanted policies:
DROP POLICY IF EXISTS "old_policy_name" ON campaign_candidates;

-- Recreate just one clean policy
```

---

## Quick Reference: Current Status (2026-02-14)

| Table | RLS Enabled | Policy | Status |
|---|---|---|---|
| campaign_candidates | ✅ Yes | recruiter_access | ✅ VERIFIED |
| (Others?) | ? | ? | ⏳ PENDING |

---

## Next Steps After Verification

1. ✅ Verify all tables have RLS (this file)
2. ⏳ Run Sprint 0 remediation (see SECURITY_AUDIT_REAUDIT_2026-02-14.md)
3. ⏳ Schedule full security re-audit once all fixes are in place

---

*Verification and remediation guide — RecruitFlow Security Hardening*
