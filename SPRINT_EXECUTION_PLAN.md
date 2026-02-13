# RecruitFlow — Sprint 0 & Sprint 1 Execution Plan (REVISED)

**Date:** 2026-02-13
**Revised:** Scoped to Dashboard + Supabase (DB + Storage) ONLY
**Out of scope — this document:** n8n, webhooks, automation validation, Vite bundling, CDN removal, SaaS re-architecture
**System:** n8n → Supabase → Vercel dashboard. Controlled workloads. 1–3 enterprise clients max.

---

## SCOPE BOUNDARY (HARD)

| Layer | In Scope | Out of Scope |
|---|---|---|
| Supabase DB (RLS, policies, indexes) | YES | — |
| Supabase Storage (bucket policies, signed URLs) | YES | — |
| Vercel dashboard (headers, CSP, iframe, PII logs) | YES | — |
| n8n workflows | NO | Next week |
| Webhook authentication | NO | Next week |
| Automation validation logic | NO | Next week |
| Vite bundling / CDN removal | NO | Separate decision |
| SaaS multi-tenant re-architecture | NO | Sprint 2 |

---

## Table of Contents

1. [Sprint 0 — 48-Hour Stop-Ship](#sprint-0)
2. [Sprint 1 — Pilot-Ready Hardening](#sprint-1)
3. [Stop-Ship Gates (DB + Dashboard only)](#stop-ship-gates)
4. [RLS Verification Pack](#rls-verification)
5. [Storage Verification Pack](#storage-verification)
6. [Campaign Onboarding Checklist](#onboarding-checklist)
7. [Production Readiness Score](#readiness-score)

---

## 1. Sprint 0 — 48-Hour Stop-Ship <a name="sprint-0"></a>

**Goal:** Close all critical/high findings in the DB and dashboard layers. Do not onboard any live client until all stop-ship gates PASS.

**Constraint:** Zero n8n changes. Zero webhook changes. Zero bundling changes.

### Task Table

| # | Task | Risk Closed | Owner | Effort | Depends On |
|---|---|---|---|---|---|
| S0-1 | Enable RLS + create policies on ALL campaign tables | Cross-table data exposure | Database | 1h | Nothing — do first |
| S0-2 | Verify RLS blocks anon, attacker, and cross-campaign REST access | Confirms S0-1 correct | Database | 30m | S0-1 |
| S0-3 | Harden Storage bucket: disable public read + block enumeration | Resume PII exposure | Database | 45m | Nothing |
| S0-4 | Verify Storage policies (direct access + list test) | Confirms S0-3 correct | Database | 20m | S0-3 |
| S0-5 | Update PDF iframe to `sandbox="allow-same-origin"` + `referrerPolicy="no-referrer"` | PDF JS execution in frame | Frontend | 20m | Nothing |
| S0-6 | Create `vercel.json` with Sprint 0 security headers (CSP + X-Frame-Options + 3 others) | XSS data exfil, clickjacking | Frontend/DevOps | 45m | Nothing |
| S0-7 | Remove PII from browser console logs (3 `console.log` lines) | PII in DevTools / SIEM noise | Frontend | 15m | Nothing |
| S0-8 | Repo cleanup: delete unnecessary .md files | Credential/PII leakage in VCS | DevOps | 15m | Nothing |
| S0-9 | Deploy to Vercel + smoke test | Confirm nothing broken | All | 30m | S0-5, S0-6, S0-7 |

**Total Sprint 0: ~4.5 hours engineering time**

---

### S0-1 — RLS on ALL Campaign Tables

Run for EVERY campaign table (currently `campaign_candidates`, repeat pattern for each new table):

```sql
-- ═══════════════════════════════════════════════
-- REPEAT THIS BLOCK FOR EACH CAMPAIGN TABLE
-- Replace 'campaign_candidates' and 'moconstruction@gmail.com'
-- with the actual table name and recruiter email per client
-- ═══════════════════════════════════════════════

-- Step 1: Enable RLS
ALTER TABLE campaign_candidates ENABLE ROW LEVEL SECURITY;

-- Step 2: SELECT — authorised recruiter only
CREATE POLICY "select_authorised_recruiter"
  ON campaign_candidates
  FOR SELECT
  USING (auth.email() = 'moconstruction@gmail.com');

-- Step 3: Block all client-initiated writes
-- n8n uses service_role which bypasses RLS — this blocks anon + authenticated roles only
CREATE POLICY "block_client_insert"
  ON campaign_candidates FOR INSERT WITH CHECK (false);

CREATE POLICY "block_client_update"
  ON campaign_candidates FOR UPDATE USING (false);

CREATE POLICY "block_client_delete"
  ON campaign_candidates FOR DELETE USING (false);

-- Step 4: Confirm RLS active
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'campaign_candidates';
-- REQUIRED RESULT: rowsecurity = true

-- Step 5: Confirm 4 policies created
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'campaign_candidates';
-- REQUIRED RESULT: 4 rows listed
```

**Cross-campaign isolation:** Each table gets its own `auth.email() = '[recruiter_email]'` policy. Client A's JWT cannot read Client B's table. No per-table configuration needed beyond running this block per table.

**Acceptance criteria:** `rowsecurity = true` in pg_tables + 4 policies confirmed in pg_policies for every campaign table.

---

### S0-2 — RLS Verification (run after S0-1)

See full verification suite in [Section 4 — RLS Verification Pack](#rls-verification). All 4 SQL queries + tests T1–T4 must pass before proceeding.

---

### S0-3 — Storage Bucket Hardening

**In Supabase Dashboard → Storage → Policies:**

Verify and enforce the following on the `resumes` bucket (or whichever bucket holds CVs):

**Step 1 — Confirm bucket is NOT public:**
```
Dashboard → Storage → [bucket name] → Settings
"Public bucket" toggle must be OFF
```
If it is currently ON: toggle OFF immediately. This is the highest-priority action.

**Step 2 — Remove any existing permissive policies, then create restricted ones:**

```sql
-- Run in Supabase SQL Editor

-- Remove any open public SELECT policy if present
-- (Check storage.policies first, then drop by name)
SELECT * FROM storage.objects LIMIT 0; -- just to confirm schema access

-- Verify no public policies exist
SELECT policyname, definition
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects';
-- Review: no policy should have USING (true) or USING (bucket_id = 'resumes') without auth check

-- Correct policy: only service_role (n8n uploads) can INSERT
-- Authenticated recruiter can SELECT objects in their own bucket
-- Anonymous: no access
```

**Step 3 — Enforce via Supabase Storage Policy UI:**

In Storage → Policies → `resumes` bucket:
- **SELECT (download):** `auth.role() = 'authenticated'` — only logged-in recruiter can use signed URLs
- **INSERT (upload):** Leave managed by service_role via n8n (service_role bypasses policies)
- **UPDATE / DELETE:** No policy (implicitly blocked for non-service roles)
- **List objects:** No anonymous list policy. List only via service_role.

**If using raw SQL to enforce:**
```sql
-- Revoke any public object listing
-- (Supabase storage uses RLS on storage.objects table)
-- Ensure no policy grants anon SELECT on storage.objects for the resumes bucket

-- Minimal secure policy — authenticated SELECT for signed URL generation only:
CREATE POLICY "authenticated_read_resumes"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'resumes');

-- Block anonymous entirely
-- (no policy = no access by default once RLS is active on storage.objects)
```

**Acceptance criteria:** Direct public URL to any resume object returns 400/403. Enumeration API returns empty or 403. Signed URLs still work for the recruiter session.

---

### S0-4 — Storage Verification (run after S0-3)

See full verification suite in [Section 5 — Storage Verification Pack](#storage-verification). Tests T5–T7 must all PASS.

---

### S0-5 — PDF Iframe Hardening

**File:** `index.tsx` — the `<iframe>` inside `CandidateProfileView`

```tsx
// BEFORE (current — allows scripts, no referrer restriction):
<iframe
  src={`${viewUrl}#page=${pdfPage}&view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
  className="w-full h-full min-h-[800px] border-none shadow-lg"
  title="PDF Preview"
/>

// AFTER (secure — no scripts, origin-isolated, no referrer leak):
<iframe
  src={`${viewUrl}#page=${pdfPage}&view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
  className="w-full h-full min-h-[800px] border-none shadow-lg"
  title="PDF Preview"
  sandbox="allow-same-origin"
  referrerPolicy="no-referrer"
/>
```

**Why `sandbox="allow-same-origin"` and NOT `allow-scripts`:**

| Attribute | Effect |
|---|---|
| `sandbox` (any value) | Enables all sandbox restrictions by default: no popups, no forms, no top-nav, no plugins |
| `allow-same-origin` | Frame retains its actual origin (Supabase storage CDN), required for PDF rendering in all browsers |
| No `allow-scripts` | **Scripts are blocked.** PDF-embedded JavaScript cannot execute. |
| `referrerPolicy="no-referrer"` | No Referer header sent from the iframe — prevents URL leakage |

**What this neutralises:** PDF files can contain JavaScript (e.g., auto-submit forms, launch URLs, read DOM). With `allow-same-origin` but no `allow-scripts`, that JavaScript is dead on arrival. The browser renders the PDF natively — no frame JavaScript required.

**Acceptance criteria:** PDF renders correctly in Chrome, Edge, Firefox. DevTools Elements tab shows `sandbox="allow-same-origin"` on the iframe. No `allow-scripts` present.

---

### S0-6 — `vercel.json` Security Headers

Create `vercel.json` in the project root (or update if it exists):

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'none'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://esm.sh; style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; connect-src 'self' https://bebiojwkjnyyccnlqjge.supabase.co wss://bebiojwkjnyyccnlqjge.supabase.co; frame-src https://bebiojwkjnyyccnlqjge.supabase.co; img-src 'self' data: blob: https://bebiojwkjnyyccnlqjge.supabase.co; font-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'"
        },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=(), payment=()" }
      ]
    }
  ]
}
```

**Note on `'unsafe-inline'` in `script-src`:** Required by the existing CDN import map (`<script type="importmap">`). This is a known limitation of the CDN approach. It is acceptable for Sprint 0. Removing it requires Vite bundling — which is explicitly out of scope for this sprint.

**What this closes now:**

| Header / Directive | Threat Closed |
|---|---|
| `connect-src` locked to Supabase project URL | Data exfiltration to attacker domains — even if XSS fires, it cannot POST data out |
| `frame-src` locked to Supabase | PDF iframe cannot be redirected to load attacker content |
| `frame-ancestors 'none'` | Clickjacking |
| `X-Frame-Options: DENY` | Clickjacking (legacy browser fallback) |
| `X-Content-Type-Options: nosniff` | MIME-type confusion attacks |
| `Referrer-Policy` | Dashboard URL leakage in outbound requests |
| `Permissions-Policy` | Camera/mic/geo access from compromised frame |

**Acceptance criteria:** Deploy to Vercel. DevTools → Network → any response → `Content-Security-Policy` header present. `X-Frame-Options: DENY` present. No CSP violations in browser console.

---

### S0-7 — Remove PII from Console Logs

**File:** `index.tsx` — inside `CandidateProfileView`

```typescript
// DELETE these 3 lines (contain file paths = PII):
console.log(`[ResumeFetch] Starting resolution. Original="${originalPath}"`)
console.log('[ResumeFetch] Success with clean path.')
console.log(`[ResumeFetch] Deep search found: "${match.name}"`)

// KEEP (error context only — no PII in message):
console.error("[ResumeFetch] Critical Exception:", err.message)
```

**Why this matters:** Resume file paths contain candidate names (e.g., `resumes/john-smith-cv.pdf`). These appear in the browser console, which is visible to anyone with DevTools access on the recruiter's machine, and can be captured by browser extensions.

**Acceptance criteria:** Open any candidate profile. Open DevTools Console. No filename, path, or candidate name appears in the log output.

---

### S0-8 — Repo Cleanup

**Delete the following files from the repository:**

| File | Reason for Deletion |
|---|---|
| `Campaign_Candidates_Access_Verification_Report.md` | Contains plaintext PII: recruiter email, Supabase UID (`d00eb606-8a39-48a6-829d-5be38daf7829`), Supabase project URL. Historical only — no operational value. |
| `PROJECT_BRIEF.md` | QA reference for a system already built. No ongoing operational value. Contents superseded by SOP + Audit Report. |

**Retain:**

| File | Reason to Keep |
|---|---|
| `SECURITY_AUDIT_REPORT.md` | Authoritative reference for all findings |
| `SPRINT_EXECUTION_PLAN.md` | This document — active execution guide |
| `NEW_CLIENT_ONBOARDING_SOP.md` | Operational — required for each new client |
| `README.md` | Standard repository documentation |

```bash
# Execute in git:
git rm Campaign_Candidates_Access_Verification_Report.md
git rm PROJECT_BRIEF.md
git commit -m "security: remove PII-bearing and stale docs from repo"
```

**Acceptance criteria:** Neither deleted file exists on the main branch. Git history still contains them (expected — do not rebase history unless the UID/email is considered a secret requiring purge).

> **If the UID/email must be purged from history:** Use `git filter-repo --path Campaign_Candidates_Access_Verification_Report.md --invert-paths` — but only if the Supabase UID is considered sensitive in your threat model. For a pilot, history purge is Sprint 2 scope.

---

### S0-9 — Deploy + Smoke Test

After S0-5, S0-6, S0-7 are committed and pushed:

1. Trigger Vercel deployment (auto-deploys on push to `main`)
2. Open dashboard → verify login works
3. Open candidate profile → verify PDF renders in iframe
4. Open DevTools → Network → confirm CSP header present
5. Open DevTools → Elements → confirm `sandbox="allow-same-origin"` on iframe
6. Open DevTools → Console → confirm no PII in logs
7. Run stop-ship gate tests (Section 3)

---

## 2. Sprint 1 — Pilot-Ready Hardening <a name="sprint-1"></a>

**Goal:** Harden the DB and dashboard to enterprise pilot standard. All Sprint 0 gates must be PASS before starting Sprint 1.
**Calendar:** ≤ 2 weeks after Sprint 0 completion.
**Engineering time:** ≤ 8 hours (DB + Dashboard only).

### Task Table

| # | Task | Risk Closed | Owner | Effort | Depends On |
|---|---|---|---|---|---|
| S1-1 | Create `recruiter_audit_log` table (DB) | No accountability trail | Database | 1h | S0-1 complete |
| S1-2 | Wire audit log insert on profile view (Dashboard) | Completes audit trail | Frontend | 1h | S1-1 |
| S1-3 | Reduce signed URL expiry 3600s → 300s | Stolen URL reuse window | Frontend | 15m | Nothing |
| S1-4 | Revoke `information_schema` from anon/authenticated | Schema enumeration | Database | 30m | Nothing |
| S1-5 | Add `screening_score` index | Performance (>1k rows) | Database | 30m | Nothing |
| S1-6 | Production readiness final verification | Pre-pilot sign-off | All | 2h | All above |

**Total Sprint 1: ~5.25 hours engineering time**

---

### S1-1 — Recruiter Audit Log Table

```sql
-- Create audit log table
CREATE TABLE recruiter_audit_log (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      timestamptz DEFAULT now() NOT NULL,
  recruiter_email text NOT NULL,
  candidate_id    text NOT NULL,
  action          text NOT NULL
    CHECK (action IN ('view_profile', 'download_resume', 'download_report'))
);

-- RLS: service_role can read (for your admin queries). All other roles blocked.
ALTER TABLE recruiter_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "block_all_client_access"
  ON recruiter_audit_log
  FOR ALL
  USING (false);
-- service_role bypasses RLS — use it for admin queries to this table.

-- Verify
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'recruiter_audit_log';
-- REQUIRED: rowsecurity = true

SELECT policyname, cmd FROM pg_policies WHERE tablename = 'recruiter_audit_log';
-- REQUIRED: 1 policy, FOR ALL, USING (false)
```

**Acceptance criteria:** Table exists. RLS enabled. `SELECT` from dashboard recruiter session returns 0 rows (blocked). `SELECT` from service_role returns rows.

---

### S1-2 — Audit Log Insert on Profile View

**File:** `index.tsx` — `App` component, `onSelectCandidate` callback

```typescript
// Add alongside existing setSelectedCandidate / setCurrentView calls:
onSelectCandidate={(candidate) => {
  setSelectedCandidate(candidate);
  setCurrentView('profile');
  // Fire-and-forget audit insert — intentionally not awaited
  supabase.from('recruiter_audit_log').insert({
    recruiter_email: user.email,
    candidate_id: String(candidate.id),
    action: 'view_profile',
  }).then();
}}
```

**For download events** — add similar inserts in the download handlers with `action: 'download_resume'` and `action: 'download_report'`.

**Acceptance criteria:** Open candidate profile → row appears in `recruiter_audit_log` (verify in Supabase Table Editor with service role). Recruiter REST query to audit table → 0 rows returned.

---

### S1-3 — Reduce Signed URL Expiry

**File:** `index.tsx` — `resolveUrls` function (or equivalent)

```typescript
// BEFORE:
.createSignedUrls([cleanPath], 3600)
// ...
.createSignedUrls([targetPath], 3600, { download: true })

// AFTER:
.createSignedUrls([cleanPath], 300)
// ...
.createSignedUrls([targetPath], 300, { download: true })
```

**Impact:** URL captured from browser DevTools or network log is valid for 5 minutes only (down from 1 hour). Profile navigation auto-generates a fresh URL on each view.

**Acceptance criteria:** Log in, open a candidate profile. Copy iframe `src` URL from DevTools. Wait 6 minutes. Paste URL into a new tab → access denied / token expired. Navigate back to profile → PDF loads again.

---

### S1-4 — Revoke `information_schema` Access

> **Safety note:** This revocation is safe on Supabase. It does not affect n8n (service_role bypasses grants), dashboard queries (use `public` schema), or Supabase internal operations. Only blocks `anon` and `authenticated` roles from schema enumeration.

```sql
-- Revoke schema enumeration from client roles
REVOKE SELECT ON ALL TABLES IN SCHEMA information_schema FROM anon;
REVOKE SELECT ON ALL TABLES IN SCHEMA information_schema FROM authenticated;

-- Verify (run as the recruiter authenticated user via REST):
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- REQUIRED RESULT: permission denied error or empty result

-- Maintenance note: Re-verify after Supabase major version upgrades.
-- These grants may be restored during upgrades.
```

**Acceptance criteria:** Authenticated REST request to `information_schema` returns error. Dashboard functions normally (it queries `public` schema, not `information_schema`).

---

### S1-5 — Screening Score Index

```sql
CREATE INDEX CONCURRENTLY idx_cc_screening_score
  ON campaign_candidates(screening_score DESC);

-- Verify
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'campaign_candidates'
  AND indexname = 'idx_cc_screening_score';
-- REQUIRED: 1 row returned
```

**Acceptance criteria:** Index visible in `pg_indexes`. Dashboard sort-by-score pagination response time acceptable at > 1,000 rows.

---

### S1-6 — Production Readiness Final Verification

Run complete test pack from Sections 4 and 5 (all 10 tests). Run production readiness score from Section 7. All stop-ship gates must re-PASS after Sprint 1 changes.

---

## 3. Stop-Ship Gates — DB + Dashboard Only <a name="stop-ship-gates"></a>

**All gates must be PASS before any live client data is processed through the dashboard. No exceptions.**

```
╔══════════════════════════════════════════════════════════════╗
║  GATE 1 — RLS ACTIVE ON ALL CAMPAIGN TABLES                  ║
║                                                              ║
║  Test: SELECT * FROM campaign_candidates (as anon)           ║
║  PASS: Empty array returned — 0 rows                         ║
║  FAIL: Any candidate rows returned                           ║
╠══════════════════════════════════════════════════════════════╣
║  GATE 2 — CLIENT-INITIATED WRITES BLOCKED                    ║
║                                                              ║
║  Test: INSERT INTO campaign_candidates (as authenticated      ║
║        non-service-role user)                                ║
║  PASS: 42501 RLS policy violation error returned             ║
║  FAIL: 201 Created — row appears in table                    ║
╠══════════════════════════════════════════════════════════════╣
║  GATE 3 — STORAGE NOT PUBLIC                                 ║
║                                                              ║
║  Test: Direct GET to Supabase Storage object URL (no auth)   ║
║  PASS: 400 Bad Request or 403 Forbidden                      ║
║  FAIL: PDF binary returned                                   ║
╠══════════════════════════════════════════════════════════════╣
║  GATE 4 — STORAGE ENUMERATION BLOCKED                        ║
║                                                              ║
║  Test: POST /storage/v1/object/list/resumes (as attacker JWT)║
║  PASS: [] or 403 — no filenames returned                     ║
║  FAIL: Filename list returned                                ║
╠══════════════════════════════════════════════════════════════╣
║  GATE 5 — PDF IFRAME SCRIPTS BLOCKED                         ║
║                                                              ║
║  Test: DevTools Elements → inspect iframe element            ║
║  PASS: sandbox="allow-same-origin" present, no allow-scripts ║
║  FAIL: sandbox attribute absent OR allow-scripts present     ║
╠══════════════════════════════════════════════════════════════╣
║  GATE 6 — CSP HEADER PRESENT                                 ║
║                                                              ║
║  Test: DevTools Network → any response headers               ║
║  PASS: Content-Security-Policy header present on every load  ║
║  FAIL: Header absent                                         ║
╠══════════════════════════════════════════════════════════════╣
║  GATE 7 — PII ABSENT FROM CONSOLE                            ║
║                                                              ║
║  Test: Open candidate profile → DevTools Console             ║
║  PASS: No filename, path, or candidate name in console output ║
║  FAIL: Resume path or name visible in log                    ║
╠══════════════════════════════════════════════════════════════╣
║  GATE 8 — CROSS-CAMPAIGN TABLE ACCESS BLOCKED                ║
║                                                              ║
║  Test: Recruiter A JWT attempts REST query on Client B table ║
║  PASS: 0 rows returned                                       ║
║  FAIL: Any rows from Client B returned                       ║
║  NOTE: Only testable once 2+ client tables exist             ║
╚══════════════════════════════════════════════════════════════╝
```

**Gates 1–7: Required before Sprint 0 sign-off.**
**Gate 8: Required before second client is onboarded.**

---

## 4. RLS Verification Pack <a name="rls-verification"></a>

**Test users:**
```
ANON   = No session. Anon key only.
ATTACK = Valid Supabase account NOT in the recruiter email list.
RECR   = moconstruction@gmail.com with active session JWT.
```

### SQL Queries (Supabase SQL Editor — service_role context)

```sql
-- Q1: Confirm RLS enabled on all public tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
-- PASS: rowsecurity = true for EVERY row
-- FAIL: Any table shows rowsecurity = false

-- Q2: Audit all policies — confirm no open-access policies
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
-- PASS: SELECT policies use auth.email() = '[email]' — no policy has qual = 'true' or qual IS NULL
-- FAIL: Any policy with qual = 'true' (open to all)

-- Q3: List tables with RLS disabled (must return 0 rows)
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;
-- PASS: 0 rows
-- FAIL: Any table listed

-- Q4: Confirm auth.email() resolves (run as recruiter via REST)
SELECT auth.email();
-- As moconstruction@gmail.com: returns 'moconstruction@gmail.com'
-- As ATTACK user: returns attacker's email (RLS correctly uses this to block them)
```

### REST/curl Test Cases

**T1 — Anon read (ANON)**
```bash
curl -H "apikey: [ANON_KEY]" \
  "https://bebiojwkjnyyccnlqjge.supabase.co/rest/v1/campaign_candidates?select=*"
```
- **PASS:** `[]` (empty — RLS blocks anon)
- **FAIL:** Candidate rows returned

---

**T2 — Attacker read (ATTACK)**
```bash
curl -H "apikey: [ANON_KEY]" \
     -H "Authorization: Bearer [ATTACK_JWT]" \
  "https://bebiojwkjnyyccnlqjge.supabase.co/rest/v1/campaign_candidates?select=*"
```
- **PASS:** `[]` — zero rows
- **FAIL:** Any candidate data

---

**T3 — Attacker INSERT (ATTACK)**
```bash
curl -X POST \
  -H "apikey: [ANON_KEY]" \
  -H "Authorization: Bearer [ATTACK_JWT]" \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Injected","email":"injected@evil.com","screening_score":99}' \
  "https://bebiojwkjnyyccnlqjge.supabase.co/rest/v1/campaign_candidates"
```
- **PASS:** `{"code":"42501","message":"new row violates row-level security policy"}`
- **FAIL:** `201 Created`

---

**T4 — Authorised recruiter read (RECR)**
```bash
curl -H "apikey: [ANON_KEY]" \
     -H "Authorization: Bearer [RECR_JWT]" \
  "https://bebiojwkjnyyccnlqjge.supabase.co/rest/v1/campaign_candidates?select=*"
```
- **PASS:** Candidate rows returned — dashboard works correctly
- **FAIL:** Empty or error — RLS policy incorrectly configured, recruiter locked out

---

**T5 — Cross-campaign table (requires 2 client tables)**
```bash
# As RECR (moconstruction recruiter), attempt to read Client B's table
curl -H "apikey: [ANON_KEY]" \
     -H "Authorization: Bearer [RECR_JWT]" \
  "https://bebiojwkjnyyccnlqjge.supabase.co/rest/v1/[CLIENT_B_TABLE_NAME]?select=*"
```
- **PASS:** `[]` — RLS on Client B's table blocks moconstruction email
- **FAIL:** Client B's candidates returned

---

## 5. Storage Verification Pack <a name="storage-verification"></a>

### SQL Query (Supabase SQL Editor)

```sql
-- Q5: Audit storage bucket configuration
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets;
-- PASS: public = false for 'resumes' bucket
-- FAIL: public = true

-- Q6: Audit storage policies
SELECT policyname, definition
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects';
-- PASS: No policy with USING (true) or bucket_id = 'resumes' without an auth check
-- FAIL: Any open-access policy on the resumes bucket
```

### REST/curl Test Cases

**T6 — Direct object access without auth (ANON)**
```bash
# Replace [FILENAME] with any known or guessed resume filename
curl -v "https://bebiojwkjnyyccnlqjge.supabase.co/storage/v1/object/resumes/[FILENAME].pdf"
```
- **PASS:** `400 Bad Request` or `403 Forbidden` — no PDF binary
- **FAIL:** `200 OK` — PDF content returned

---

**T7 — Bucket enumeration (ATTACK)**
```bash
curl -X POST \
  -H "apikey: [ANON_KEY]" \
  -H "Authorization: Bearer [ATTACK_JWT]" \
  -H "Content-Type: application/json" \
  -d '{"prefix":"","limit":100}' \
  "https://bebiojwkjnyyccnlqjge.supabase.co/storage/v1/object/list/resumes"
```
- **PASS:** `[]` or `403` — no filenames
- **FAIL:** Array of filenames returned

---

**T8 — Signed URL access (RECR) — confirms bucket still works post-hardening**
1. Log in to dashboard as recruiter
2. Open any candidate profile
3. Confirm PDF renders in iframe
4. Confirm AI report download link works
- **PASS:** Both work — hardening has not broken recruiter access
- **FAIL:** PDF shows error — policy is too restrictive; review S0-3 configuration

---

**T9 — Signed URL expiry (Sprint 1, after S1-3)**
1. Log in, open candidate profile
2. Copy iframe `src` URL from DevTools → Elements
3. Wait 6 minutes
4. Paste URL in new browser tab
- **PASS:** Access denied / `Token is expired`
- **FAIL:** PDF loads after 6 minutes

---

## 6. Campaign Onboarding Checklist <a name="onboarding-checklist"></a>

**Use this checklist every time a new client or campaign is onboarded.**

```
══════════════════════════════════════════════════════
  RECRUITFLOW — CAMPAIGN ONBOARDING CHECKLIST
  Complete every item in order. Do not skip steps.
══════════════════════════════════════════════════════

PHASE 1 — TABLE CREATION
[ ] 1a  Create campaign table in Supabase SQL Editor:
        CREATE TABLE [campaign_table_name] (
          id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          created_at       timestamptz DEFAULT now(),
          full_name        text,
          email            text,
          phone            text,
          position_applied text,
          screening_score  numeric,
          screening_summary text,
          resume_path      text,
          report_path      text,
          nationality      text,
          current_city     text
        );

[ ] 1b  Confirm table appears in Supabase Table Editor

PHASE 2 — RLS HARDENING
[ ] 2a  Enable RLS:
        ALTER TABLE [campaign_table_name] ENABLE ROW LEVEL SECURITY;
[ ] 2b  Create SELECT policy (use recruiter's actual email):
        CREATE POLICY "select_authorised_recruiter"
          ON [campaign_table_name] FOR SELECT
          USING (auth.email() = '[recruiter_email]');
[ ] 2c  Create 3 block policies (INSERT / UPDATE / DELETE):
        (Use S0-1 SQL block above — replace table name)
[ ] 2d  Verify: rowsecurity = true in pg_tables             PASS/FAIL
[ ] 2e  Verify: 4 policies in pg_policies                   PASS/FAIL

PHASE 3 — STORAGE BUCKET MAPPING
[ ] 3a  Confirm 'resumes' bucket is NOT public (Dashboard toggle)
[ ] 3b  Confirm resume_path column in table uses correct
        storage path format (e.g., 'resumes/filename.pdf')

PHASE 4 — DASHBOARD CONFIGURATION
[ ] 4a  Update dashboard config to point to [campaign_table_name]
        (typically an env var or config constant in index.tsx)
[ ] 4b  Deploy dashboard update to Vercel
[ ] 4c  Log in as recruiter → confirm candidate list loads
[ ] 4d  Open candidate profile → confirm PDF renders in iframe

PHASE 5 — VERIFICATION TESTS
[ ] 5a  T1: Anon read returns 0 rows                        PASS/FAIL
[ ] 5b  T2: Attacker read returns 0 rows                    PASS/FAIL
[ ] 5c  T3: Attacker INSERT returns RLS policy violation     PASS/FAIL
[ ] 5d  T4: Recruiter read returns candidate data           PASS/FAIL
[ ] 5e  T6: Direct storage access returns 400/403           PASS/FAIL
[ ] 5f  T7: Storage enumeration returns [] or 403           PASS/FAIL

PHASE 6 — CROSS-CLIENT CHECK (if 2+ campaigns exist)
[ ] 6a  T5: Previous recruiter JWT cannot read new table     PASS/FAIL

SIGN-OFF
[ ] Engineer: _________________________  Date: ____________
[ ] All PASS/FAIL gates: PASS

DO NOT grant n8n access or send webhook URL to client
until all items above are checked.
══════════════════════════════════════════════════════
```

---

## 7. Production Readiness Score <a name="readiness-score"></a>

**Scope: Dashboard + Database only. n8n layer scored separately next week.**

### Current State (Pre-Sprint 0)

| Domain | Control | Status | Score |
|---|---|---|---|
| **Database** | RLS enabled on campaign tables | NOT DONE | 0/1 |
| **Database** | Write-blocking policies in place | NOT DONE | 0/1 |
| **Database** | Cross-campaign isolation | NOT DONE | 0/1 |
| **Database** | information_schema revoked | NOT DONE | 0/1 |
| **Storage** | Bucket not public | UNKNOWN | 0/1 |
| **Storage** | Enumeration blocked | UNKNOWN | 0/1 |
| **Storage** | Signed URL expiry ≤ 5 min | NOT DONE | 0/1 |
| **Dashboard** | CSP header present | NOT DONE | 0/1 |
| **Dashboard** | X-Frame-Options: DENY | NOT DONE | 0/1 |
| **Dashboard** | PDF iframe no scripts | NOT DONE | 0/1 |
| **Dashboard** | No PII in console logs | NOT DONE | 0/1 |
| **Dashboard** | Recruiter audit log | NOT DONE | 0/1 |
| **Repo** | No PII in committed files | FAIL | 0/1 |

**Pre-Sprint 0 Score: 0/13 (0%) — NOT READY FOR CLIENT DATA**

---

### After Sprint 0 Complete

| Domain | Control | Target Status | Score |
|---|---|---|---|
| **Database** | RLS enabled on campaign tables | PASS | 1/1 |
| **Database** | Write-blocking policies in place | PASS | 1/1 |
| **Database** | Cross-campaign isolation | PASS | 1/1 |
| **Database** | information_schema revoked | DEFERRED → S1 | 0/1 |
| **Storage** | Bucket not public | PASS | 1/1 |
| **Storage** | Enumeration blocked | PASS | 1/1 |
| **Storage** | Signed URL expiry ≤ 5 min | DEFERRED → S1 | 0/1 |
| **Dashboard** | CSP header present | PASS | 1/1 |
| **Dashboard** | X-Frame-Options: DENY | PASS | 1/1 |
| **Dashboard** | PDF iframe no scripts | PASS | 1/1 |
| **Dashboard** | No PII in console logs | PASS | 1/1 |
| **Dashboard** | Recruiter audit log | DEFERRED → S1 | 0/1 |
| **Repo** | No PII in committed files | PASS | 1/1 |

**Post-Sprint 0 Score: 10/13 (77%) — ACCEPTABLE FOR FIRST CLIENT (CONTROLLED PILOT)**

---

### After Sprint 1 Complete

| Domain | Control | Target Status | Score |
|---|---|---|---|
| **Database** | RLS enabled on campaign tables | PASS | 1/1 |
| **Database** | Write-blocking policies in place | PASS | 1/1 |
| **Database** | Cross-campaign isolation | PASS | 1/1 |
| **Database** | information_schema revoked | PASS | 1/1 |
| **Storage** | Bucket not public | PASS | 1/1 |
| **Storage** | Enumeration blocked | PASS | 1/1 |
| **Storage** | Signed URL expiry ≤ 5 min | PASS | 1/1 |
| **Dashboard** | CSP header present | PASS | 1/1 |
| **Dashboard** | X-Frame-Options: DENY | PASS | 1/1 |
| **Dashboard** | PDF iframe no scripts | PASS | 1/1 |
| **Dashboard** | No PII in console logs | PASS | 1/1 |
| **Dashboard** | Recruiter audit log | PASS | 1/1 |
| **Repo** | No PII in committed files | PASS | 1/1 |

**Post-Sprint 1 Score: 13/13 (100%) — READY FOR ENTERPRISE PILOT (DB + DASHBOARD LAYER)**

> **Reminder:** n8n layer (webhook auth, automation validation, execution log PII) is scored and hardened separately. Total system readiness requires both layers complete.

---

## Appendix — What Is NOT In This Sprint

The following items from the previous plan version are **explicitly removed** from Sprint 0 and Sprint 1. They will be addressed in a separate n8n hardening sprint:

| Removed Item | Reason Removed | When |
|---|---|---|
| n8n webhook static bearer token | n8n out of scope | Next sprint |
| n8n email deduplication + validation node | n8n out of scope | Next sprint |
| n8n execution log pruning env vars | n8n out of scope | Next sprint |
| HMAC + timestamp webhook auth | n8n out of scope | Next sprint |
| File validation Code node in n8n | n8n out of scope | Next sprint |
| Workflow duplication guard (CLIENT_TABLE_NAME) | n8n out of scope | Next sprint |
| Vite bundling / CDN import map removal | Separate decision | TBD |
| Sprint 1 tightened CSP (script-src 'self') | Depends on bundling | TBD |
| SaaS multi-tenant re-architecture | Sprint 2 | TBD |

---

*Revised by Claude Code — 2026-02-13*
*Scope: Dashboard + Supabase (DB + Storage) hardening only.*
*n8n / automation layer: separate sprint, separate document.*
