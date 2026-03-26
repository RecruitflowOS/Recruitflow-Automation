# Setting Up Bella Vida User Profile in Supabase

## Problem
The `bella vida` user account exists in Supabase authentication, but:
1. The `users` table doesn't exist yet
2. No user profile record exists

The application requires this table and profile to function.

## Solution: Create Table and Add User Profile via Supabase Dashboard

### Step 1: Access Supabase Dashboard
1. Go to https://supabase.co
2. Sign in with your Supabase account
3. Select your project (the one used by this app)

### Step 2: Open SQL Editor
1. In the left sidebar, click **SQL Editor**
2. Click **New Query** to create a new SQL query

### Step 3: Create the Users Table
Run this query to create the `users` table:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  company_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for company_name lookups
CREATE INDEX idx_users_company_name ON users(company_name);
```

### Step 4: Find the Bella Vida User ID
Run this query to find the user's ID:

```sql
SELECT id, email FROM auth.users WHERE email LIKE '%bella%' OR raw_user_meta_data->>'name' LIKE '%bella%';
```

Look at the results and note the `id` value for the bella vida user. It should look something like `12345678-1234-1234-1234-123456789012`.

### Step 5: Insert the User Profile
Once you have the user ID from Step 4, run this query (replace `YOUR_USER_ID` with the actual ID):

```sql
INSERT INTO users (id, email, company_name)
VALUES (
  'f6bee6ad-ce93-44d2-92e1-8e4f5a992633',
  'bella.vida@example.com',
  'bella_vida'
);
```

### Step 6: Verify
You can verify the table and profile were created by running:

```sql
SELECT * FROM users;
```

You should see one row with the bella vida user.

### Step 7: Test in the App
1. Refresh the browser (or close and reopen the app)
2. Try signing in as bella vida again
3. You should now see the dashboard instead of the "Profile Not Configured" error

## Notes
- The `company_name` must be exactly `bella_vida` (lowercase, with underscore)
- The app uses this to determine which campaign table to load (`campaign_candidates_duplicate` for bella_vida)
- If the email is different, update it in the INSERT statement accordingly
- The `users` table references `auth.users`, so deleting an auth user will cascade-delete their profile
