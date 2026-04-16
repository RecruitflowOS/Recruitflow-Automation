# Refrane Dev — Onboarding Setup

## Overview

This document covers the steps to onboard `refranedev@gmail.com` into the Recruitflow platform, including the users table insert, candidate table RLS policies, and the code change already applied.

---

## Code Change (Already Applied)

`src/main.tsx` — added `refrane_dev` to the table and title maps:

```ts
const TABLE_MAP: Record<string, string> = {
  ...
  refrane_dev: 'Refrane_dev_campaign_candidates_duplicate',
};

const TITLE_MAP: Record<string, string> = {
  ...
  refrane_dev: 'Refrane Dev Campaign',
};
```

---

## SQL Setup

Run these in the Supabase SQL Editor:
**Project:** `bebiojwkjnyyccnlqjge` → SQL Editor → New query

---

### Step 1 — Insert user into `users` table

```sql
INSERT INTO users (id, email, company_name)
VALUES (
  'dbdb167f-5b0e-4ab9-a426-14ec35adbfe4',
  'refranedev@gmail.com',
  'refrane_dev'
)
ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      company_name = EXCLUDED.company_name;
```

---

### Step 2 — Enable RLS on the candidate table

```sql
ALTER TABLE "Refrane_dev_campaign_candidates_duplicate"
ENABLE ROW LEVEL SECURITY;
```

---

### Step 3 — Create read policy for authenticated users

```sql
CREATE POLICY "Allow authenticated read"
ON "Refrane_dev_campaign_candidates_duplicate"
FOR SELECT
TO authenticated
USING (true);
```

---

### Step 4 — Ensure `users` table allows authenticated users to read their own row

First, check if a policy already exists:

```sql
SELECT policyname FROM pg_policies WHERE tablename = 'users';
```

If no `SELECT` policy exists for `authenticated`, add:

```sql
CREATE POLICY "Users can read own profile"
ON users
FOR SELECT
TO authenticated
USING (auth.uid() = id);
```

---

### Step 5 — Verify

```sql
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename IN ('users', 'Refrane_dev_campaign_candidates_duplicate')
ORDER BY tablename;
```

---

## How It Works

| Action | Result |
|---|---|
| `refranedev@gmail.com` logs in | App finds their `users` row, gets `company_name = 'refrane_dev'` |
| Dashboard & Campaigns views | Query `Refrane_dev_campaign_candidates_duplicate` |
| RLS | Only authenticated sessions can SELECT from the candidate table |

> **Note:** The table name has mixed case and must remain double-quoted in all SQL statements. The app passes it as a string to `supabase.from()`, which handles it correctly.
