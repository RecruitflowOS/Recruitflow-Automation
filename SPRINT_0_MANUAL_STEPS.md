# Sprint 0 — Manual Steps Remaining

Code changes are done and committed. The following require Supabase dashboard / SQL Editor access.

---

## Step 1 — Enable RLS on `campaign_candidates`

**Where:** Supabase Dashboard → SQL Editor

```sql
-- 1. Enable RLS
ALTER TABLE campaign_candidates ENABLE ROW LEVEL SECURITY;

-- 2. Allow recruiter to read
CREATE POLICY "select_authorised_recruiter"
  ON campaign_candidates
  FOR SELECT
  USING (auth.email() = 'moconstruction@gmail.com');

-- 3. Block all client-initiated writes
CREATE POLICY "block_client_insert"
  ON campaign_candidates FOR INSERT WITH CHECK (false);

CREATE POLICY "block_client_update"
  ON campaign_candidates FOR UPDATE USING (false);

CREATE POLICY "block_client_delete"
  ON campaign_candidates FOR DELETE USING (false);

-- 4. Verify
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'campaign_candidates';
-- REQUIRED: rowsecurity = true

SELECT policyname, cmd FROM pg_policies WHERE tablename = 'campaign_candidates';
-- REQUIRED: 4 rows listed
```

**Done when:** `rowsecurity = true` + 4 policies confirmed.

---

## Step 2 — Harden Storage Bucket

**Part A — Supabase Dashboard → Storage → resumes → Settings**

Toggle **"Public bucket" → OFF**

This is the single highest-priority action. Do it before anything else.

---

**Part B — Supabase Dashboard → Storage → Policies**

Add a new policy on the `resumes` bucket:

| Setting | Value |
|---|---|
| Policy name | `authenticated_read_resumes` |
| Allowed operation | SELECT |
| Target roles | `authenticated` |
| USING expression | `bucket_id = 'resumes'` |

This keeps PDF viewing working for the recruiter while blocking anonymous access.

---

## Step 3 — Verify RLS (run as anon / attacker)

**T1 — Anon read must return empty:**
```bash
curl -H "apikey: YOUR_ANON_KEY" \
  "https://bebiojwkjnyyccnlqjge.supabase.co/rest/v1/campaign_candidates?select=*"
```
- PASS: `[]`
- FAIL: candidate rows returned

**T2 — Attacker JWT must return empty:**
```bash
curl -H "apikey: YOUR_ANON_KEY" \
     -H "Authorization: Bearer ATTACKER_JWT" \
  "https://bebiojwkjnyyccnlqjge.supabase.co/rest/v1/campaign_candidates?select=*"
```
- PASS: `[]`
- FAIL: candidate rows returned

**T3 — Attacker INSERT must be blocked:**
```bash
curl -X POST \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer ATTACKER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Injected","email":"injected@evil.com","screening_score":99}' \
  "https://bebiojwkjnyyccnlqjge.supabase.co/rest/v1/campaign_candidates"
```
- PASS: `42501` RLS policy violation error
- FAIL: `201 Created`

**T4 — Recruiter JWT must return data (confirm nothing broken):**
```bash
curl -H "apikey: YOUR_ANON_KEY" \
     -H "Authorization: Bearer RECRUITER_JWT" \
  "https://bebiojwkjnyyccnlqjge.supabase.co/rest/v1/campaign_candidates?select=*"
```
- PASS: candidate rows returned
- FAIL: empty or error — policy misconfigured

---

## Step 4 — Verify Storage

**T5 — Direct PDF access without auth must be blocked:**
```bash
curl -v "https://bebiojwkjnyyccnlqjge.supabase.co/storage/v1/object/resumes/ANY_FILENAME.pdf"
```
- PASS: 400 or 403
- FAIL: PDF binary returned

**T6 — Bucket enumeration must be blocked:**
```bash
curl -X POST \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer ATTACKER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"prefix":"","limit":100}' \
  "https://bebiojwkjnyyccnlqjge.supabase.co/storage/v1/object/list/resumes"
```
- PASS: `[]` or 403
- FAIL: list of filenames returned

**T7 — Recruiter PDF preview still works (confirm nothing broken):**
- Log in to dashboard
- Open any candidate profile
- PDF renders in iframe
- PASS: PDF loads
- FAIL: access error — review storage policy from Step 2B

---

## Step 5 — Deploy to Vercel + browser checks

```bash
git push
```

After Vercel deploys:

| Check | How | PASS |
|---|---|---|
| CSP header present | DevTools → Network → any request → Response Headers | `Content-Security-Policy` visible |
| X-Frame-Options present | Same | `X-Frame-Options: DENY` visible |
| iframe sandbox correct | DevTools → Elements → inspect iframe | `sandbox="allow-same-origin"` present, no `allow-scripts` |
| No PII in console | DevTools → Console → open any candidate profile | No filenames or paths logged |

---

## Stop-Ship Gate Summary

| Gate | What | PASS condition |
|---|---|---|
| 1 | RLS blocks anon read | `[]` returned |
| 2 | RLS blocks client writes | `42501` error |
| 3 | Storage not public | 400/403 on direct URL |
| 4 | Storage enumeration blocked | `[]` or 403 |
| 5 | iframe has no scripts | `sandbox="allow-same-origin"` in Elements |
| 6 | CSP header live | Header visible in DevTools Network |
| 7 | Console clean | No PII in DevTools Console |

**All 7 must be PASS before handling any live client data.**

---

*Sprint 0 code committed: `622213c` — 2026-02-13*
