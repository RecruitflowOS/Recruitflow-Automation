# RLS Policy Fix for Campaign Candidates

## Problem
The `campaign_candidates` table has RLS (Row Level Security) enabled, which blocks the anon key from reading data. This causes the app to show "Access Denied" errors.

## Solution
Run these SQL commands in Supabase SQL Editor to allow public read access.

---

## SQL Commands

### Step 1: Enable RLS on the table (if not already enabled)
```sql
ALTER TABLE campaign_candidates ENABLE ROW LEVEL SECURITY;
```

### Step 2: Create policy for public read access
```sql
CREATE POLICY "Allow public read"
ON campaign_candidates
FOR SELECT
TO anon
USING (true);
```

### Step 3: Verify the policy was created
```sql
SELECT * FROM pg_policies WHERE tablename = 'campaign_candidates';
```

---

## How to Apply

1. **Open Supabase Dashboard**
   - Go to: https://app.supabase.com/
   - Select your project (bebiojwkjnyyccnlqjge)

2. **Navigate to SQL Editor**
   - Left sidebar → SQL Editor
   - Click "New query"

3. **Copy and paste the SQL above**
   - Run Step 1 first
   - Then Step 2
   - Then Step 3 to verify

4. **Refresh your app**
   - http://localhost:3001
   - The Campaigns view should now load

---

## What This Does

- **Enables RLS**: Ensures only authorized access (security best practice)
- **Public Read Policy**: Allows anonymous users to read all rows from `campaign_candidates`
- **Maintains Security**: Write operations still require authentication

---

## If You Need to Restrict Further

To allow read access only to authenticated users (not anon):

```sql
CREATE POLICY "Allow authenticated read"
ON campaign_candidates
FOR SELECT
TO authenticated
USING (true);
```

Then drop the anon policy:
```sql
DROP POLICY "Allow public read" ON campaign_candidates;
```

---

## Need to Remove a Policy?

If you need to undo:
```sql
DROP POLICY "Allow public read" ON campaign_candidates;
```

---

## Verify RLS is working

Check which policies exist:
```sql
SELECT tablename, policyname, permissive, roles, qual
FROM pg_policies
WHERE tablename = 'campaign_candidates';
```

Expected output:
```
 tablename    | policyname       | permissive | roles | qual
──────────────┼──────────────────┼────────────┼───────┼──────
 campaign_... | Allow public read| t          | anon  | true
```
