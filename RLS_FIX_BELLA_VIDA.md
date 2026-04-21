# RLS Policy Fix for Bella Vida Campaign Candidates

## Problem
The `campaign_candidates_duplicate` table has RLS (Row Level Security) enabled, which blocks the anon key from reading data. This causes the app to show "Unable to load candidates" errors.


## Solution
Run these SQL commands in Supabase SQL Editor to allow public read access.

---

## SQL Commands

### Step 1: Enable RLS on the table (if not already enabled)
```sql
ALTER TABLE "Bella Vida campaign_candidates_duplicate" ENABLE ROW LEVEL SECURITY;```

### Step 2: Create policy for public read access
```sql
CREATE POLICY "Allow public read"
ON "Bella Vida campaign_candidates_duplicate"
FOR SELECT
TO anon
USING (true);
```

### Step 3: Verify the policy was created
```sql
SELECT * FROM pg_policies WHERE tablename = 'Bella Vida campaign_candidates_duplicate';
```

---

## How to Apply

1. **Open Supabase Dashboard**
   - Go to: https://app.supabase.com/
   - Select your project

2. **Navigate to SQL Editor**
   - Left sidebar → SQL Editor
   - Click "New query"

3. **Copy and paste the SQL above**
   - Run Step 1 first
   - Then Step 2
   - Then Step 3 to verify

4. **Refresh your app**
   - Go back to the browser and refresh
   - The Campaigns view should now load for Bella Vida
