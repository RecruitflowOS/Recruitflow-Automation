# Refrane Dev — Access & Candidate Rendering Setup

**User:** refranedev@gmail.com  
**UID:** dbdb167f-5b0e-4ab9-a426-14ec35adbfe4  
**Table:** `Refrane_dev_campaign_candidates_duplicate`  
**Project:** bebiojwkjnyyccnlqjge

---

## Code Status

All mappings are already wired up correctly in `src/main.tsx` — no code changes needed.

| Mapping | Value |
|---|---|
| `TABLE_MAP['refrane_dev']` | `'Refrane_dev_campaign_candidates_duplicate'` |
| `TITLE_MAP['refrane_dev']` | `'Refrane Dev Campaign'` |
| `EMAIL_TO_COMPANY['refranedev@gmail.com']` | `'refrane_dev'` |

The `EMAIL_TO_COMPANY` override means the user does **not** need a `users` table row to get the correct table — the mapping applies on login.

---

## Database Setup

Run the following in Supabase SQL Editor:
**Supabase → Project `bebiojwkjnyyccnlqjge` → SQL Editor → New query**

---

### Step 1 — Upsert user row

Safety net in case the `EMAIL_TO_COMPANY` override is ever removed:

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

### Step 3 — Allow authenticated users to read candidates

```sql
CREATE POLICY "Allow authenticated read"
ON "Refrane_dev_campaign_candidates_duplicate"
FOR SELECT
TO authenticated
USING (true);
```

---

### Step 4 — Allow users to read their own profile

Check if a SELECT policy already exists on the `users` table:

```sql
SELECT policyname FROM pg_policies WHERE tablename = 'users';
```

If no SELECT policy for `authenticated` exists, add one:

```sql
CREATE POLICY "Users can read own profile"
ON users
FOR SELECT
TO authenticated
USING (auth.uid() = id);
```

---

### Step 5 — Verify all policies

```sql
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename IN ('users', 'Refrane_dev_campaign_candidates_duplicate')
ORDER BY tablename;
```

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| "Access Denied" error in app | Missing RLS policy for `authenticated` | Run Steps 2 & 3 |
| "Profile Not Configured" screen | `users` row missing AND email not in `EMAIL_TO_COMPANY` | Run Step 1 |
| Login works but 0 candidates shown | Table is empty — no data ingested yet | Check Table Editor in Supabase |
| Candidates visible in table editor but not in app | RLS blocking authenticated reads | Run Steps 2 & 3 |

> **Note:** The table name uses mixed case and must remain double-quoted in all SQL statements. The app passes it as a string to `supabase.from()`, which handles quoting automatically.
