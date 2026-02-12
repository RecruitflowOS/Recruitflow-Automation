# RecruitFlow — Sprint 0 & Sprint 1 Execution Plan

**Date:** 2026-02-12
**Scope:** Sprint 0 (48-hour stop-ship) + Sprint 1 (pilot-ready hardening)
**Out of scope:** Sprint 2 (multi-tenant SaaS re-architecture / SOC2 foundation)
**System:** Custom-client pilot — n8n + Supabase + Vercel. Controlled workloads. 1–3 enterprise clients max.

---

## Table of Contents

1. [Sprint 0 — 48-Hour Stop-Ship Plan](#sprint-0)
2. [Sprint 1 — Pilot-Ready Hardening](#sprint-1)
3. [Safest vs Fastest — Critical/High Findings](#safest-vs-fastest)
4. [RLS + Storage Policy Verification Pack](#rls-verification)
5. [Webhook Defense Pack](#webhook-defense)
6. [Security Headers + CSP Plan](#csp-plan)
7. [Complete Sign-Off Checklists](#checklists)

---

## 1. Sprint 0 — 48-Hour Stop-Ship Plan <a name="sprint-0"></a>

**Goal:** Close all 4 Criticals + the 3 Highs exploitable with zero prior access. Do not onboard any client until all stop-ship gates pass.

### Task Table

| # | Task | Finding | Owner | Effort | Depends On |
|---|---|---|---|---|---|
| S0-1 | Enable RLS + create policies on `campaign_candidates` | P1-002, P4-002 | Database | 1h | Nothing — do first |
| S0-2 | Verify RLS is working (run test queries) | P1-002 | Database | 30m | S0-1 |
| S0-3 | Add `screening_score` index | P2-001 | Database | 30m | Nothing — run alongside S0-1 |
| S0-4 | Add `sandbox` + `referrerPolicy` to PDF iframe | P3-002 | Frontend | 30m | Nothing |
| S0-5 | Create `vercel.json` with Sprint 0 security headers + CSP | P7-002 | DevOps/Frontend | 1h | Nothing |
| S0-6 | Add static bearer token auth to n8n webhook | P3-001 | n8n | 30m | Nothing |
| S0-7 | Add email deduplication + rate guard in n8n | P2-002 | n8n | 2h | S0-6 |
| S0-8 | Set n8n execution pruning env vars | P6-001 | DevOps | 15m | Nothing |
| S0-9 | Deploy + smoke test full flow end to end | All | All | 1h | All above |

**Total Sprint 0: ~7 hours engineering time**

---

### S0-1 — RLS Policies on `campaign_candidates`

**Run in Supabase SQL Editor:**

```sql
-- Step 1: Enable RLS
ALTER TABLE campaign_candidates ENABLE ROW LEVEL SECURITY;

-- Step 2: SELECT — only the authorised recruiter
CREATE POLICY "select_authorised_recruiter"
  ON campaign_candidates
  FOR SELECT
  USING (auth.email() = 'moconstruction@gmail.com');

-- Step 3: Block all client-initiated writes
-- (n8n uses service role which bypasses RLS — this only blocks anon/authenticated)
CREATE POLICY "block_anon_insert"
  ON campaign_candidates FOR INSERT WITH CHECK (false);

CREATE POLICY "block_anon_update"
  ON campaign_candidates FOR UPDATE USING (false);

CREATE POLICY "block_anon_delete"
  ON campaign_candidates FOR DELETE USING (false);

-- Step 4: Confirm RLS is active
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'campaign_candidates';
-- Expected: rowsecurity = true

-- Step 5: Confirm all 4 policies are present
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'campaign_candidates';
-- Expected: 4 policies listed
```

**Acceptance criteria:** `rowsecurity = true` + 4 policies confirmed in `pg_policies`.
**Verification:** Run test cases T1–T4 from the RLS Verification Pack (Section 4).

> **Note on P4-002 (cross-tenant):** Apply this same RLS pattern to every per-client table as you onboard new clients. Each table gets its own `auth.email() = '[client_email]'` policy. One client's JWT can never read another client's table.

---

### S0-2 — Add `screening_score` Index

```sql
CREATE INDEX CONCURRENTLY idx_cc_screening_score
  ON campaign_candidates(screening_score DESC);

-- Verify
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'campaign_candidates';
-- Expected: idx_cc_screening_score present
```

**Acceptance criteria:** Index visible in `pg_indexes`. Dashboard pagination noticeably faster on any table > 1k rows.

---

### S0-3 — PDF Iframe Sandbox

**File:** `index.tsx` — the `<iframe>` inside `CandidateProfileView`

```tsx
// BEFORE:
<iframe
  src={`${viewUrl}#page=${pdfPage}&view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
  className="w-full h-full min-h-[800px] border-none shadow-lg"
  title="PDF Preview"
/>

// AFTER:
<iframe
  src={`${viewUrl}#page=${pdfPage}&view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
  className="w-full h-full min-h-[800px] border-none shadow-lg"
  title="PDF Preview"
  sandbox="allow-scripts"
  referrerPolicy="no-referrer"
/>
```

**Why `sandbox="allow-scripts"` only (not `allow-same-origin`):**
PDF embedded JavaScript can execute inside the frame but has a `null` origin. It cannot read parent-page cookies, localStorage, or make authenticated requests to Supabase. Session token theft via PDF JavaScript is neutralised.

**Acceptance criteria:** PDF still renders correctly in Chrome/Edge/Firefox. DevTools shows `sandbox` attribute on the iframe element.

---

### S0-4 — `vercel.json` Security Headers (Sprint 0 CSP)

Create `vercel.json` in the project root. This is the **Sprint 0 version** — it deliberately allows `esm.sh` and `unsafe-inline` because the CDN import map is still in place. The Sprint 1 version tightens this after bundling.

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

**What this achieves right now:**

| Header/Directive | Protects Against |
|---|---|
| `connect-src` locked to Supabase project | Data exfiltration to external domains even if XSS fires |
| `frame-src` locked to Supabase | PDF iframe cannot be hijacked to load arbitrary URLs |
| `frame-ancestors 'none'` | Clickjacking |
| `X-Frame-Options: DENY` | Clickjacking (legacy browser fallback) |
| `X-Content-Type-Options: nosniff` | MIME-type confusion attacks |
| `form-action 'self'` | Form submission hijacking to external domains |

**What `'unsafe-inline'` in `script-src` means:** Required by the CDN import map. XSS script injection is not yet blocked by the browser. This is the known limitation of the CDN approach and the primary reason to bundle in Sprint 1.

**Acceptance criteria:** Deploy to Vercel. DevTools → Network → any response → `Content-Security-Policy` header present. Browser console shows no CSP violations.

---

### S0-5 — Webhook Static Bearer Token Auth (n8n)

**Fastest approach — use n8n's built-in Header Auth (15 minutes, zero custom code):**

1. Open the n8n Webhook node settings
2. Set **Authentication** → `Header Auth`
3. Set **Header Name** → `x-api-key`
4. Set **Header Value** → a randomly generated 32-byte hex secret:
   ```bash
   openssl rand -hex 32
   ```
5. Store the value as an n8n environment variable: `RECRUITFLOW_WEBHOOK_KEY`
6. Update your webhook sender (form / integration) to include `x-api-key: [SECRET]` in all requests

**Verify:** POST to webhook URL without the header → must return `401 Unauthorized`. POST with correct header → accepted and processed.

> **Why not HMAC for Sprint 0:** This is a controlled pilot with a known, trusted sender you control. A static shared secret closes the unauthenticated injection vector in 15 minutes. Full HMAC with replay protection is a Sprint 1 upgrade.

**Acceptance criteria:** Unauthenticated POST returns 401. Authenticated POST processes normally.

---

### S0-6 — Email Deduplication + Input Validation in n8n

Add a **Code node** immediately after the webhook trigger, before any Supabase operation:

```javascript
// n8n Code node — "Validate & Deduplicate"
const item = $input.item.json;

// 1. Required field validation
const required = ['full_name', 'email'];
for (const field of required) {
  if (!item[field] || String(item[field]).trim() === '') {
    throw new Error(`Rejected: missing required field "${field}"`);
  }
}

// 2. Email format check
const email = String(item.email).toLowerCase().trim();
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  throw new Error(`Rejected: invalid email format "${email}"`);
}

// 3. Field length limits (prevent oversized payloads)
const limits = {
  full_name: 200,
  email: 254,
  phone: 50,
  position_applied: 300,
  nationality: 100,
  current_city: 200,
  screening_summary: 5000,
};
for (const [field, maxLen] of Object.entries(limits)) {
  if (item[field] && String(item[field]).length > maxLen) {
    throw new Error(`Rejected: field "${field}" exceeds max length of ${maxLen} chars`);
  }
}

// 4. Return sanitised item
return {
  json: {
    ...item,
    email: email,
    full_name: String(item.full_name).trim().slice(0, 200),
  }
};
```

Then add a deduplication check using a Supabase SELECT before the INSERT. If the email already exists in `campaign_candidates`, stop the workflow. Use Supabase's `upsert` with a unique constraint as the long-term solution:

```sql
-- Add unique constraint (run once in Supabase SQL Editor):
ALTER TABLE campaign_candidates
  ADD CONSTRAINT campaign_candidates_email_unique UNIQUE (email);
```

With this constraint, configure the Supabase insert node to use **upsert** with `onConflict: email`. First submission inserts; re-submission updates. No duplicates ever created.

**Acceptance criteria:** Sending the same email twice — second submission does not create a duplicate row. Sending a missing required field — rejected with error logged. Sending an oversized field — rejected.

---

### S0-7 — n8n Execution Pruning

Set the following environment variables on the n8n instance (`.env` file or hosting platform config panel). Restart n8n after setting.

```
EXECUTIONS_DATA_PRUNE=true
EXECUTIONS_DATA_MAX_AGE=168
EXECUTIONS_DATA_SAVE_ON_ERROR=all
EXECUTIONS_DATA_SAVE_ON_SUCCESS=none
```

**What this does:** Successful execution PII (candidate names, emails, phones) is never saved to the execution log. Failed executions are retained for 7 days for debugging.

**Verify:** Submit a test candidate that processes successfully → go to n8n Executions → successful execution shows no saved input/output data. Submit a malformed payload that fails → execution log shows the error details.

**Acceptance criteria:** Successful execution stores no candidate PII in execution history.

---

### Sprint 0 — Stop-Ship Gates

**All of the following must PASS before handling any live client data:**

```
GATE 1 — RLS ACTIVE
  PASS: SELECT * FROM campaign_candidates (as attacker/anon user) returns 0 rows
  FAIL: Any candidate rows returned

GATE 2 — INSERT BLOCKED
  PASS: INSERT into campaign_candidates (as any non-service-role user) returns permission error
  FAIL: Insert succeeds

GATE 3 — WEBHOOK REQUIRES AUTH
  PASS: Unauthenticated POST to webhook URL returns 401
  FAIL: Request is processed

GATE 4 — PDF IFRAME SANDBOXED
  PASS: Browser DevTools shows sandbox="allow-scripts" on iframe element
  FAIL: sandbox attribute absent

GATE 5 — CSP HEADER PRESENT
  PASS: Response headers include Content-Security-Policy on every page load
  FAIL: Header absent

GATE 6 — EXECUTION LOGS CLEAN
  PASS: Successful n8n execution shows no stored candidate PII in execution data
  FAIL: Full candidate JSON visible in execution history
```

> If any gate fails, stop. Fix and re-verify before onboarding.

---

## 2. Sprint 1 — Pilot-Ready Hardening <a name="sprint-1"></a>

**Goal:** Harden to a level suitable for an enterprise pilot. Close all remaining Highs and Mediums.
**Calendar:** ≤ 2 weeks. **Engineering time:** ≤ 25 hours.

### Task Table

| # | Task | Finding | Owner | Effort | Depends On |
|---|---|---|---|---|---|
| S1-1 | Bundle JS via Vite — remove CDN import map from `index.html` | P1-003 | Frontend | 4h | Nothing |
| S1-2 | Deploy updated `vercel.json` with tightened Sprint 1 CSP | P7-002 | DevOps | 1h | S1-1 deployed |
| S1-3 | Upgrade webhook auth to HMAC + timestamp replay protection | P3-001 | n8n | 3h | S0-5 complete |
| S1-4 | Add file validation Code node in n8n (ext + magic bytes + size) | P3-005 | n8n | 4h | Nothing |
| S1-5 | Add workflow duplication guard (`CLIENT_TABLE_NAME` env check) | P6-002 | n8n | 2h | Nothing |
| S1-6 | Create `recruiter_audit_log` table + insert on profile view | P7-001 | DB + Frontend | 4h | S0-1 complete |
| S1-7 | Revoke `information_schema` access from `anon` and `authenticated` | P3-004 | Database | 30m | Nothing |
| S1-8 | Reduce signed URL expiry from 3600s → 300s | P5-001 | Frontend | 30m | Nothing |
| S1-9 | Remove PII from browser console logs | P7-003 | Frontend | 1h | Nothing |
| S1-10 | Full regression test + smoke test | All | All | 2h | All above |

**Total Sprint 1: ~22 hours engineering time**

---

### S1-1 — Bundle via Vite (removes CDN supply chain risk)

`package.json` already has Vite and all dependencies. The task is to make the app use the local bundle instead of the CDN import map.

1. Remove the `<script type="importmap">` block from `index.html`
2. Remove the Tailwind CDN `<script src="https://cdn.tailwindcss.com">` tag from `index.html`
3. Add `tailwindcss` + `autoprefixer` + `postcss` to devDependencies and configure PostCSS, **or** use the `@tailwindcss/vite` plugin
4. Ensure all imports in `index.tsx` use bare module specifiers (they already do — `import React from 'react'` etc.)
5. Run `npm run build` — Vite bundles everything into `dist/assets/`
6. Run `npm run preview` to verify locally
7. Deploy to Vercel — Vercel auto-runs `npm run build` when configured

**Acceptance criteria:** `dist/` folder produced. No `esm.sh` network requests visible in DevTools Network tab after deploy. App functions identically to before.

---

### S1-2 — Sprint 1 Tightened CSP

After bundling, replace the CSP value in `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://bebiojwkjnyyccnlqjge.supabase.co wss://bebiojwkjnyyccnlqjge.supabase.co; frame-src https://bebiojwkjnyyccnlqjge.supabase.co; img-src 'self' data: blob: https://bebiojwkjnyyccnlqjge.supabase.co; font-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'"
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

**What changes from Sprint 0:**
- `script-src` drops to `'self'` only — `'unsafe-inline'`, `https://esm.sh`, and `https://cdn.tailwindcss.com` all removed
- XSS script injection is now blocked by the browser
- `style-src` retains `'unsafe-inline'` — required for Tailwind runtime utility classes

**Acceptance criteria:** Deploy to Vercel. No CSP violations in browser console. DevTools confirms `script-src 'self'` only.

---

### S1-3 — HMAC + Timestamp Webhook Auth

Replace the Sprint 0 static Header Auth with a Code node that validates both the signature and a timestamp.

**n8n Code node — "Validate HMAC Signature"** (first node after Webhook trigger):

```javascript
const crypto = require('crypto');

const secret = $env.RECRUITFLOW_WEBHOOK_SECRET; // set in n8n environment variables
const body = JSON.stringify($input.item.json.body);
const receivedSig = $input.item.json.headers['x-recruitflow-signature'];
const receivedTs  = $input.item.json.headers['x-recruitflow-timestamp'];

// 1. Timestamp window: reject if > 5 minutes old (prevents replay attacks)
const now = Math.floor(Date.now() / 1000);
const ts  = parseInt(receivedTs, 10);
if (!ts || Math.abs(now - ts) > 300) {
  throw new Error(`Rejected: timestamp outside 5-minute window (drift: ${now - ts}s)`);
}

// 2. HMAC validation — signed payload is "timestamp.body"
const expected = 'sha256=' + crypto
  .createHmac('sha256', secret)
  .update(`${receivedTs}.${body}`)
  .digest('hex');

if (receivedSig !== expected) {
  throw new Error('Rejected: invalid HMAC signature');
}

return $input.item;
```

**Sender side** — whatever posts to the webhook must generate these headers:

```javascript
const crypto = require('crypto');
const secret = process.env.RECRUITFLOW_WEBHOOK_SECRET;
const timestamp = Math.floor(Date.now() / 1000).toString();
const body = JSON.stringify(payload);
const signature = 'sha256=' + crypto
  .createHmac('sha256', secret)
  .update(`${timestamp}.${body}`)
  .digest('hex');

fetch(webhookUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-recruitflow-signature': signature,
    'x-recruitflow-timestamp': timestamp,
  },
  body,
});
```

**Acceptance criteria:** Request without headers → rejected. Request with headers older than 5 minutes → rejected. Valid request → processed. Valid request replayed after 6 minutes → rejected.

---

### S1-4 — File Validation in n8n

Add a **Code node** in the resume-handling workflow branch, before any Supabase Storage upload call:

```javascript
// n8n Code node — "Validate Resume File"
const item = $input.item.json;

// 1. Extension allowlist
const resumeUrl = String(item.resume_url || '');
const ext = resumeUrl.split('.').pop()?.toLowerCase();
if (ext !== 'pdf') {
  throw new Error(`Rejected: file extension ".${ext}" not allowed. Only .pdf accepted.`);
}

// 2. File size limit — 10MB
// If your workflow has access to the binary (via HTTP Request node):
// const fileSizeBytes = $input.item.binary?.data?.fileSize || 0;
// If the size is passed as a field:
const fileSizeBytes = item.fileSizeBytes || 0;
if (fileSizeBytes > 0 && fileSizeBytes > 10 * 1024 * 1024) {
  throw new Error(`Rejected: file size ${fileSizeBytes} bytes exceeds 10MB limit`);
}

// 3. Magic bytes check (if binary is available in the workflow)
// PDF files must start with the bytes: %PDF
// const buffer = Buffer.from(item.fileBase64 || '', 'base64');
// const magic = buffer.slice(0, 4).toString('ascii');
// if (!magic.startsWith('%PDF')) {
//   throw new Error(`Rejected: file does not have PDF magic bytes (got: "${magic}")`);
// }

return $input.item;
```

> **Note on magic bytes:** Uncomment section 3 if the workflow receives the file binary. If n8n only receives a `resume_url` path after upload, magic bytes checking is not possible at this stage — rely on extension + size for Sprint 1, and add a post-upload validation step later.

**Acceptance criteria:** Attempt to process a `.exe` file → rejected before storage write. File > 10MB → rejected. Valid PDF < 10MB → proceeds normally.

---

### S1-5 — Workflow Duplication Guard

Add as the **first Code node** in every client workflow, before any Supabase operation:

```javascript
// n8n Code node — "Assert Client Config"
const tableName = $env.CLIENT_TABLE_NAME;
const clientId  = $env.CLIENT_ID;

if (!tableName || tableName.trim() === '') {
  throw new Error(
    'FATAL: CLIENT_TABLE_NAME environment variable is not set. ' +
    'Workflow aborted to prevent cross-client data pollution.'
  );
}
if (!clientId || clientId.trim() === '') {
  throw new Error('FATAL: CLIENT_ID environment variable is not set. Workflow aborted.');
}

// Sanity check: table name must match safe naming pattern
if (!/^[a-z][a-z0-9_]{2,63}$/.test(tableName)) {
  throw new Error(`FATAL: CLIENT_TABLE_NAME "${tableName}" has invalid format.`);
}

console.log(`[Config OK] Client: ${clientId} | Table: ${tableName}`);
return $input.item;
```

All downstream Supabase nodes use `{{ $env.CLIENT_TABLE_NAME }}` as the table name — never a hardcoded string.

**Acceptance criteria:** Remove `CLIENT_TABLE_NAME` from n8n environment → workflow throws on first execution, no data written. Set to correct value → proceeds normally.

---

### S1-6 — Recruiter Audit Log

**Step 1 — Create table (Supabase SQL Editor):**

```sql
CREATE TABLE recruiter_audit_log (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      timestamptz DEFAULT now() NOT NULL,
  recruiter_email text NOT NULL,
  candidate_id    text NOT NULL,
  action          text NOT NULL CHECK (action IN ('view_profile', 'download_resume', 'download_report'))
);

-- Only service role can read the audit log
ALTER TABLE recruiter_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only"
  ON recruiter_audit_log
  FOR ALL USING (false);
-- Note: service role bypasses RLS — this blocks anon + authenticated reads only
```

**Step 2 — Insert on profile view (`index.tsx`):**

In the `App` component's `onSelectCandidate` callback, add a fire-and-forget audit insert alongside the existing logic:

```typescript
// Wrap the existing onSelectCandidate inline function:
onSelectCandidate={(candidate) => {
  setSelectedCandidate(candidate);
  setCurrentView('profile');
  // Audit log — fire and forget, intentionally not awaited
  supabase.from('recruiter_audit_log').insert({
    recruiter_email: user.email,
    candidate_id: candidate.id,
    action: 'view_profile',
  }).then();
}}
```

**Acceptance criteria:** Open any candidate profile → row appears in `recruiter_audit_log` (verify in Supabase Table Editor with service role). Direct REST query to `recruiter_audit_log` as the recruiter user → returns 0 rows.

---

### S1-7 — Revoke `information_schema` Access

```sql
-- Run in Supabase SQL Editor
REVOKE SELECT ON ALL TABLES IN SCHEMA information_schema FROM anon;
REVOKE SELECT ON ALL TABLES IN SCHEMA information_schema FROM authenticated;

-- Verify (run as authenticated user):
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- Expected: permission denied or 0 rows
```

> **Maintenance note:** Supabase may re-grant these on major upgrades. Add this verification to your post-upgrade runbook.

---

### S1-8 — Reduce Signed URL Expiry

In `index.tsx`, change both signed URL generation calls from `3600` to `300`:

```typescript
// View URL (in resolveUrls function):
// Change every instance of createSignedUrls([...], 3600) to:
.createSignedUrls([cleanPath], 300)

// Download URL:
.createSignedUrls([targetPath], 300, { download: true })
```

**Acceptance criteria:** Load a candidate profile. Wait 6 minutes. Attempt to open the iframe PDF URL directly in a new tab → access denied (URL expired). Navigate away and back to the profile → PDF loads again (new URL generated).

---

### S1-9 — Remove PII Console Logs

Remove these three lines from `CandidateProfileView` in `index.tsx`:

```typescript
// DELETE these lines:
console.log(`[ResumeFetch] Starting resolution. Original="${originalPath}"`)
console.log('[ResumeFetch] Success with clean path.')
console.log(`[ResumeFetch] Deep search found: "${match.name}"`)

// KEEP (no PII — just error context):
console.error("[ResumeFetch] Critical Exception:", err.message)
```

**Acceptance criteria:** Open a candidate profile. Open DevTools Console. No resume path or filename appears in the console output.

---

## 3. Safest vs Fastest — Critical/High Findings <a name="safest-vs-fastest"></a>

| Finding | Fastest Approach | Time | Safest Approach | Time | Choose For Pilot |
|---|---|---|---|---|---|
| **P1-002** Client-side auth only | RLS `auth.email()` policy | 1h | Same | 1h | **Same — only one right answer** |
| **P4-002** Cross-tenant REST access | RLS per-table email policy | 1h/table | Same | 1h/table | **Same — only one right answer** |
| **P3-001** No webhook auth | n8n Header Auth (static API key) | 15m | HMAC + timestamp | 3h | **Fastest in Sprint 0** (controlled sender). Upgrade to HMAC in Sprint 1 |
| **P2-002** No rate limiting | Email dedup in n8n | 2h | Cloudflare edge rate limit | 30m | **Both** — different protections. Dedup prevents data corruption; Cloudflare stops DDoS |
| **P3-002** PDF iframe no sandbox | `sandbox="allow-scripts"` | 30m | Same | 30m | **Same — only one right answer** |
| **P3-005** No file validation | Extension + size check only | 1h | Ext + magic bytes + size | 2h | **Safest** — magic bytes adds 1h but prevents MIME spoofing entirely |
| **P1-003** CDN no SRI | SRI hashes on import map | Complex/partial browser support | Bundle via Vite | 4h | **Safest (Vite bundle)** — SRI on dynamic import maps has inconsistent browser support |
| **P2-001** Missing index | `CREATE INDEX CONCURRENTLY` | 30m | Same | 30m | **Same — only one right answer** |
| **P6-001** n8n PII logs | Set 4 env vars | 15m | Same | 15m | **Same — only one right answer** |
| **P7-002** No CSP | Sprint 0 CSP in `vercel.json` | 1h | Sprint 1 CSP after bundling | 4h+ | **Sprint 0 CSP now. Sprint 1 CSP after bundling** |

---

## 4. RLS + Storage Policy Verification Pack <a name="rls-verification"></a>

Run all 10 tests. Every test must match its expected result before going live with any client.

```
USER A = logged out (anon key only, no session)
USER B = attacker (registered Supabase account, NOT moconstruction@gmail.com)
USER C = recruiter (moconstruction@gmail.com, valid active session)
```

---

### SQL Verification Queries (Supabase SQL Editor)

```sql
-- Q1: Confirm RLS is enabled on all relevant tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
-- PASS: rowsecurity = true for campaign_candidates (and all other client tables)
-- FAIL: rowsecurity = false on any table

-- Q2: List all policies — confirm no policy allows unintended broad access
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
-- PASS: SELECT policy qual = "(auth.email() = 'moconstruction@gmail.com')"
-- FAIL: qual = "true" or qual IS NULL (open access to everyone)

-- Q3: Confirm no unprotected tables exist
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;
-- PASS: 0 rows returned
-- FAIL: Any table listed here

-- Q4: Confirm auth.email() resolves correctly
SELECT auth.email();
-- Run as moconstruction@gmail.com → returns 'moconstruction@gmail.com'
-- Run as attacker user → returns attacker's email (RLS uses this to block them)

-- Q5: Check storage bucket policies
SELECT * FROM storage.policies;
-- Review: 'resumes' bucket must NOT have a public read policy
-- Ensure INSERT is restricted to authenticated users
-- Ensure SELECT is restricted (not open to all authenticated)
```

---

### Test Cases

**T1 — Unauthenticated table read (USER A)**
```bash
curl -H "apikey: [ANON_KEY]" \
  "https://bebiojwkjnyyccnlqjge.supabase.co/rest/v1/campaign_candidates?select=*"
```
- **PASS:** `[]` (empty array — RLS returns 0 rows for anon)
- **FAIL:** Candidate rows returned

---

**T2 — Attacker table read (USER B)**
```bash
curl -H "apikey: [ANON_KEY]" \
     -H "Authorization: Bearer [ATTACKER_JWT]" \
  "https://bebiojwkjnyyccnlqjge.supabase.co/rest/v1/campaign_candidates?select=*"
```
- **PASS:** `[]` — zero rows returned
- **FAIL:** Any candidate data returned

---

**T3 — Attacker table INSERT (USER B)**
```bash
curl -X POST \
  -H "apikey: [ANON_KEY]" \
  -H "Authorization: Bearer [ATTACKER_JWT]" \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Injected","email":"injected@evil.com","screening_score":99}' \
  "https://bebiojwkjnyyccnlqjge.supabase.co/rest/v1/campaign_candidates"
```
- **PASS:** `{"code":"42501","message":"new row violates row-level security policy"}` or similar
- **FAIL:** `201 Created` — row appears in table

---

**T4 — Authorised recruiter table read (USER C)**
```bash
curl -H "apikey: [ANON_KEY]" \
     -H "Authorization: Bearer [RECRUITER_JWT]" \
  "https://bebiojwkjnyyccnlqjge.supabase.co/rest/v1/campaign_candidates?select=*"
```
- **PASS:** Candidate rows returned correctly
- **FAIL:** Empty array or error — RLS policy has a mistake, recruiter is locked out

---

**T5 — Storage bucket object access without auth (USER A)**
```bash
# Attempt to access a known or guessed resume path directly
curl "https://bebiojwkjnyyccnlqjge.supabase.co/storage/v1/object/resumes/[known_filename].pdf"
```
- **PASS:** `{"statusCode":"400","error":"Bad Request"}` or 403 Forbidden
- **FAIL:** PDF binary returned — bucket has a public policy

---

**T6 — Storage bucket enumeration (USER B)**
```bash
curl -X POST \
  -H "apikey: [ANON_KEY]" \
  -H "Authorization: Bearer [ATTACKER_JWT]" \
  -H "Content-Type: application/json" \
  -d '{"prefix":"","limit":100}' \
  "https://bebiojwkjnyyccnlqjge.supabase.co/storage/v1/object/list/resumes"
```
- **PASS:** `[]` or `{"statusCode":"403"}`
- **FAIL:** List of filenames returned

---

**T7 — Signed URL survives after expiry (Sprint 1, after S1-8)**
1. Log in as USER C, open a candidate profile
2. In DevTools, copy the iframe `src` URL
3. Wait 6 minutes
4. Paste URL directly in a new browser tab
- **PASS:** Access denied / expired URL error
- **FAIL:** PDF still loads after 6 minutes

---

**T8 — Webhook rejects unauthenticated POST (after S0-5)**
```bash
curl -X POST https://[N8N_HOST]/webhook/[PATH] \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Test","email":"test@test.com"}'
```
- **PASS:** `401 Unauthorized`
- **FAIL:** `200 OK` or workflow triggered

---

**T9 — n8n rejects duplicate email submission (after S0-6)**
Send the same candidate payload twice in quick succession.
- **PASS:** Second submission does not create a second row in `campaign_candidates`
- **FAIL:** Duplicate rows visible in Supabase Table Editor

---

**T10 — Cross-client table access blocked (if second client table exists)**
```bash
# As USER C (moconstruction@gmail.com recruiter):
curl -H "apikey: [ANON_KEY]" \
     -H "Authorization: Bearer [RECRUITER_JWT]" \
  "https://[PROJECT].supabase.co/rest/v1/[CLIENT_B_TABLE_NAME]?select=*"
```
- **PASS:** `[]` — zero rows returned (RLS on ClientB's table blocks all other emails)
- **FAIL:** ClientB's candidate data returned

---

## 5. Webhook Defense Pack <a name="webhook-defense"></a>

### Auth Layer Decision Tree

```
Q: Do you control who sends to this webhook?
├── YES (internal form / integration you own)
│   └── Sprint 0: Static header API key    [15 minutes]
│       Sprint 1: Upgrade to HMAC + timestamp [3 hours]
└── NO (public job board, third-party integration you don't control)
    └── Sprint 0: HMAC required immediately [3 hours]
```

**For the current RecruitFlow system:** Controlled senders → static header auth in Sprint 0 is the right call.

---

### HMAC + Timestamp Pattern (Sprint 1 full implementation)

See S1-3 above for the complete n8n Code node and sender-side implementation.

**Why this pattern prevents replay attacks:**
- The timestamp is embedded in the HMAC signature
- Changing the timestamp invalidates the signature
- The 5-minute window means any captured + replayed request is rejected after 5 minutes
- This is the same pattern used by Stripe, GitHub, and Twilio webhooks

---

### Rate Limiting Options

| Option | Setup Time | Effectiveness | Notes |
|---|---|---|---|
| **Cloudflare Free Tier** (100 req/min/IP) | 30 min | Best — blocks at edge before n8n | Works with any n8n deployment |
| **n8n rate limit node** | 15 min | Good — n8n level | Only available in some n8n versions |
| **Email deduplication** (S0-6) | 2h | Prevents data corruption | Mandatory regardless — different protection |
| **Nginx `limit_req_zone`** | 1h | Good if behind nginx | Self-hosted deployments only |

**Recommendation for pilot:** Implement email deduplication (S0-6) AND Cloudflare. They serve different purposes: deduplication prevents data corruption from legitimate duplicate submissions; Cloudflare prevents flooding/DoS from malicious sources.

---

### Candidate Deduplication Strategy

Use a unique constraint + upsert (see S0-6). This is simpler than a pre-check SELECT and handles race conditions correctly:

```sql
-- One-time setup:
ALTER TABLE campaign_candidates
  ADD CONSTRAINT campaign_candidates_email_unique UNIQUE (email);
```

Configure the n8n Supabase insert node to use `upsert` with `onConflict: email`:
- New email → INSERT
- Existing email → UPDATE (refreshes data if candidate reapplied)
- Zero duplicate rows, zero errors

---

### Required Logging Without Storing Full PII

Set execution save settings (S0-7) so successful runs store nothing. For error cases in the Error Trigger workflow:

```javascript
// Sanitised error log — references candidate without storing PII
const errorLog = {
  errorMessage: $input.item.json.error.message,
  workflowName: $input.item.json.execution.workflowName,
  timestamp: new Date().toISOString(),
  // Non-reversible reference — useful for cross-referencing with Supabase if needed
  candidateIdHash: require('crypto')
    .createHash('sha256')
    .update($input.item.json.email || 'unknown')
    .digest('hex')
    .slice(0, 8),
  // Do NOT include: full_name, email, phone, resume_url, nationality
};
return { json: errorLog };
```

---

## 6. Security Headers + CSP Plan <a name="csp-plan"></a>

### Why Two CSP Versions

The CDN import map in `index.html` requires `'unsafe-inline'` in `script-src` because the `<script type="importmap">` tag is inline. This makes Sprint 0's CSP unable to block XSS script injection.

Sprint 1 removes the import map via Vite bundling. This allows `script-src 'self'` — which blocks all inline script injection. This is the highest-value CSP protection.

### Sprint 0 CSP — What's Protected vs Not

| Protection | Sprint 0 | Sprint 1 |
|---|---|---|
| Data exfiltration to external domains | ✅ (`connect-src` locked) | ✅ |
| PDF iframe loading arbitrary URLs | ✅ (`frame-src` locked) | ✅ |
| Clickjacking | ✅ (`frame-ancestors 'none'`) | ✅ |
| MIME sniffing | ✅ (`nosniff` header) | ✅ |
| Form submission hijacking | ✅ (`form-action 'self'`) | ✅ |
| XSS script injection blocked by browser | ❌ (`unsafe-inline` required) | ✅ (`script-src 'self'`) |
| CDN supply chain risk | ❌ (esm.sh still in `script-src`) | ✅ (bundled, esm.sh gone) |

### Additional Headers (both sprints — identical values)

| Header | Value | Protects Against |
|---|---|---|
| `X-Frame-Options` | `DENY` | Clickjacking (legacy browser fallback for `frame-ancestors`) |
| `X-Content-Type-Options` | `nosniff` | MIME-type confusion attacks |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | URL leakage in referrer header |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` | Browser feature abuse |

### Note on `style-src 'unsafe-inline'`

Both Sprint 0 and Sprint 1 CSPs require `'unsafe-inline'` for `style-src` because Tailwind CSS utility classes are applied via runtime class names that generate inline styles. This is acceptable for a pilot deployment. To eliminate it entirely, build a full PostCSS + Tailwind CSS extraction pipeline (Sprint 2 scope — not required now).

---

## 7. Complete Sign-Off Checklists <a name="checklists"></a>

### Sprint 0 — Sign off every item before going live

```
DATABASE
[ ] S0-1a   ALTER TABLE campaign_candidates ENABLE ROW LEVEL SECURITY — executed
[ ] S0-1b   4 RLS policies created and confirmed in pg_policies
[ ] S0-2    idx_cc_screening_score index created and confirmed in pg_indexes
[ ] T1      Anon read returns 0 rows                                           PASS/FAIL
[ ] T2      Attacker read returns 0 rows                                       PASS/FAIL
[ ] T3      Attacker insert returns permission denied                          PASS/FAIL
[ ] T4      Recruiter read returns candidate data correctly                    PASS/FAIL

FRONTEND
[ ] S0-3    PDF iframe has sandbox="allow-scripts" and referrerPolicy="no-referrer"
[ ] S0-4    vercel.json created with Sprint 0 CSP and all 4 additional headers
[ ] S0-4b   Deployed to Vercel — CSP header visible in browser DevTools
[ ] S0-4c   No CSP violations in browser console

n8n
[ ] S0-5    Webhook Header Auth enabled
[ ] T8      Unauthenticated POST to webhook returns 401                        PASS/FAIL
[ ] S0-6    Validation/dedup Code node in place
[ ] T9      Duplicate email not duplicated in database                         PASS/FAIL
[ ] S0-7    n8n env vars set: EXECUTIONS_DATA_PRUNE=true, MAX_AGE=168,
            SAVE_ON_ERROR=all, SAVE_ON_SUCCESS=none
[ ] S0-7b   Successful execution shows no stored PII in execution history      PASS/FAIL

STOP-SHIP GATES (all must be PASS)
[ ] GATE 1  RLS blocks anon/attacker reads                                     PASS/FAIL
[ ] GATE 2  INSERT blocked for all non-service-role users                      PASS/FAIL
[ ] GATE 3  Unauthenticated webhook POST returns 401                           PASS/FAIL
[ ] GATE 4  PDF iframe sandbox attribute confirmed in DevTools                 PASS/FAIL
[ ] GATE 5  CSP header present on every page load                              PASS/FAIL
[ ] GATE 6  Successful n8n execution stores no candidate PII                   PASS/FAIL
```

---

### Sprint 1 — Sign off before client expansion

```
FRONTEND
[ ] S1-1    npm run build succeeds with no errors
[ ] S1-1b   No esm.sh network requests in DevTools after deploy
[ ] S1-2    vercel.json updated to Sprint 1 CSP — script-src 'self' confirmed
[ ] S1-2b   No CSP violations in browser console after tightened CSP
[ ] S1-8    Signed URL expiry changed to 300s in both createSignedUrls calls
[ ] T7      Expired signed URL returns access error after 6 minutes            PASS/FAIL
[ ] S1-9    All 3 PII console.log statements removed — console clean on load   PASS/FAIL

DATABASE
[ ] S1-6a   recruiter_audit_log table created with RLS blocking client reads
[ ] S1-6b   Profile view creates audit log row (verify in Supabase Table Editor)
[ ] S1-6c   Direct recruiter REST query to audit log returns 0 rows            PASS/FAIL
[ ] S1-7    REVOKE information_schema from anon and authenticated — executed
[ ] S1-7b   SELECT table_name FROM information_schema.tables returns denied    PASS/FAIL

n8n
[ ] S1-3    HMAC + timestamp Code node in place, replacing static Header Auth
[ ] S1-3b   Request without headers → rejected                                 PASS/FAIL
[ ] S1-3c   Request with stale timestamp (>5 min) → rejected                  PASS/FAIL
[ ] S1-3d   Replayed valid request after 6 min → rejected                      PASS/FAIL
[ ] S1-4    File validation Code node — .exe extension upload rejected         PASS/FAIL
[ ] S1-4b   File > 10MB rejected                                               PASS/FAIL
[ ] S1-5    CLIENT_TABLE_NAME guard in place
[ ] S1-5b   Remove env var → workflow throws, no data written                  PASS/FAIL

FULL REGRESSION
[ ] S1-10a  End-to-end: submit candidate via webhook → appears in dashboard
[ ] S1-10b  Pagination works on dashboard
[ ] S1-10c  PDF preview loads in iframe
[ ] S1-10d  Download AI report works
[ ] S1-10e  Download resume works
[ ] T5      Storage direct access without auth returns 403                     PASS/FAIL
[ ] T6      Storage bucket enumeration returns empty                           PASS/FAIL
[ ] T10     Cross-client table access returns 0 rows (if second client exists) PASS/FAIL
```

---

*Plan authored by Claude Code — RecruitFlow Security Hardening 2026-02-12*
*Covers Sprint 0 (stop-ship) and Sprint 1 (pilot-ready) only. Sprint 2 (SaaS re-architecture) is out of scope.*
