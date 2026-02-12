# RecruitFlow — Security Audit Report

**Date:** 2026-02-12
**Auditor:** Claude Code (Principal Architect Mode)
**Scope:** Full codebase + system architecture
**Overall Score:** 35 / 100 🔴

---

## Summary

RecruitFlow is a functional recruitment automation platform with a well-designed user experience. However, the system in its current state contains multiple Critical and High severity vulnerabilities that would prevent it from passing any enterprise security procurement review, SOC2 audit, or GDPR compliance assessment.

| Severity | Count |
|---|---|
| 🔴 Critical | 4 |
| 🔴 High | 10 |
| 🟡 Medium | 4 |
| 🟢 Low | 2 |
| **Total** | **20** |

---

## Scorecard

| Category | Score |
|---|---|
| Security | 28 / 100 🔴 |
| Performance | 61 / 100 🟡 |
| Scalability | 31 / 100 🔴 |
| Code Quality | 52 / 100 🟡 |
| Multi-Tenant Isolation | 22 / 100 🔴 |
| Production Readiness | 18 / 100 🔴 |
| **Overall** | **35 / 100 🔴** |

---

## All Findings

---

### P1-001 — Supabase Credentials Committed to Public GitHub Repository

| Field | Detail |
|---|---|
| **Severity** | 🔴 CRITICAL |
| **CVSS Score** | 9.8 |
| **Affected** | `index.tsx` lines 38–39, GitHub repository |
| **Effort** | 2 hours |
| **Compliance** | SOC2 CC6.1, GDPR Article 32 |

**Description:**
The Supabase project URL and ANON key are hardcoded on lines 38–39 of `index.tsx` and committed to a public GitHub repository. Any internet user can retrieve these credentials by visiting the repo or viewing page source. The ANON key grants direct REST API access to the Supabase project, limited only by RLS policies.

**Reproduction Steps:**
1. Visit `https://github.com/Charles-bot-cmd/Recruitflow-Automation/blob/main/index.tsx`
2. Lines 38–39 expose the full Supabase URL and ANON JWT
3. Use the key directly against the REST API
4. If RLS is misconfigured, a full table dump is returned

**PoC:**
```bash
curl -s \
  -H "apikey: [ANON_KEY]" \
  -H "Authorization: Bearer [ANON_KEY]" \
  "https://bebiojwkjnyyccnlqjge.supabase.co/rest/v1/campaign_candidates?select=*"
```

**Impact:** Full database read if RLS is absent or misconfigured. Attacker can enumerate all candidates, PII (email, phone, name, nationality), AI scores, and resume paths.

**Remediation:**
The ANON key is by design intended for client-side use. The system's entire security posture therefore depends 100% on RLS being correctly configured on every table and bucket.
1. Audit all RLS policies immediately
2. Rotate the key if any unauthorized access is suspected
3. Move the project ref to an environment variable for future-proofing
4. Enable GitHub secret scanning alerts on the repository

---

### P1-002 — Client-Side Only Authorization Guard (Email Allowlist)

| Field | Detail |
|---|---|
| **Severity** | 🔴 CRITICAL |
| **CVSS Score** | 9.1 |
| **Affected** | `index.tsx` line 866, App component |
| **Effort** | 1 hour |
| **Compliance** | SOC2 CC6.3, GDPR Articles 25 & 32 |

**Description:**
The only check preventing unauthorized recruiters from accessing candidate data is a JavaScript `if` statement in the browser: `if (user.email !== 'moconstruction@gmail.com')`. This executes entirely in the user's browser and can be bypassed completely. Any user who creates a Supabase Auth account and obtains a valid JWT can query `campaign_candidates` directly via the REST API, entirely bypassing this check.

**Reproduction Steps:**
1. Call `supabase.auth.signUp()` with any email to create an account
2. Obtain a valid JWT from the session
3. Query the REST API directly — the client-side check never runs

**PoC:**
```javascript
const { data: { session } } = await supabase.auth.signInWithPassword({
  email: 'attacker@evil.com', password: 'password123'
});
// Query directly — browser check never invoked
const res = await fetch(
  'https://bebiojwkjnyyccnlqjge.supabase.co/rest/v1/campaign_candidates?select=*',
  { headers: { apikey: '[ANON_KEY]', Authorization: `Bearer ${session.access_token}` }}
);
```

**Impact:** Any registered user can access all candidate PII and AI evaluations if RLS is not airtight.

**Remediation:**
```sql
-- Enforce the same check at the database level (bypassing client is then useless)
CREATE POLICY "recruiter_only" ON campaign_candidates
  FOR ALL USING (auth.email() = 'moconstruction@gmail.com');
```

---

### P3-001 — No Webhook Signature Verification (Replay & Forgery Attacks)

| Field | Detail |
|---|---|
| **Severity** | 🔴 CRITICAL |
| **CVSS Score** | 9.3 |
| **Affected** | n8n webhook node (ingestion endpoint) |
| **Effort** | 3 hours |
| **Compliance** | SOC2 CC6.6, OWASP A07:2021 |

**Description:**
The n8n webhook accepts any POST request from any source with no HMAC signature, no shared secret, and no IP allowlist. Any attacker who discovers or guesses the webhook URL can inject arbitrary candidates, flood the pipeline, or submit malicious payloads. There is no timestamp validation, so any captured request can be replayed indefinitely.

**Reproduction Steps:**
```bash
# Inject a fake high-scoring candidate
curl -X POST https://n8n.yourhost.com/webhook/recruitflow-intake \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "INJECTED CANDIDATE",
    "email": "attacker@evil.com",
    "screening_score": 99,
    "screening_status": "Qualified"
  }'
```

**Impact:** Fake candidates injected into pipeline; talent acquisition decisions corrupted; spam flooding; junk data poisoning client reports.

**Remediation:**
```javascript
// Add to n8n webhook — validate HMAC in a Code node:
const crypto = require('crypto');
const secret = $env.WEBHOOK_SECRET;
const sig = $input.headers['x-recruitflow-signature'];
const expected = crypto.createHmac('sha256', secret)
  .update(JSON.stringify($input.body)).digest('hex');
if (sig !== `sha256=${expected}`) throw new Error('Invalid signature — request rejected');
```

---

### P4-002 — Cross-Tenant Data Access via Direct REST API

| Field | Detail |
|---|---|
| **Severity** | 🔴 CRITICAL |
| **CVSS Score** | 9.0 |
| **Affected** | Supabase REST API, all per-client tables |
| **Effort** | 1–2 hours per client table |
| **Compliance** | SOC2 CC6.1, GDPR Articles 5(1)(f) & 32 |

**Description:**
If Client B has a table (e.g. `client_b_candidates`), a Client A recruiter with a valid JWT can query it directly via REST API. The client-side dashboard only shows `campaign_candidates` but does not prevent cross-table REST queries. This is a fundamental flaw in the per-table multi-tenancy model.

**Reproduction Steps:**
```bash
# As ClientA recruiter with valid JWT:
curl -H "apikey: [ANON_KEY]" \
     -H "Authorization: Bearer [MOCONSTRUCTION_JWT]" \
     "https://[PROJECT].supabase.co/rest/v1/client_b_candidates?select=*"
```

**Impact:** Complete exposure of one client's candidate data to another client. Most severe compliance risk in the system.

**Remediation:**
Every table must have RLS enabled with a policy that only allows access to the specific authorized email for that client. Run `SELECT tablename FROM pg_tables WHERE schemaname='public'` and confirm each table has RLS enabled with a client-specific policy.

---

### P1-003 — CDN Dependency Loading Without Subresource Integrity (SRI)

| Field | Detail |
|---|---|
| **Severity** | 🔴 HIGH |
| **CVSS Score** | 8.1 |
| **Affected** | `index.html` lines 10–22 (import map via esm.sh) |
| **Effort** | 4 hours |
| **Compliance** | SOC2 CC7.1, OWASP A06:2021 |

**Description:**
All JavaScript dependencies (React 19, react-dom, lucide-react, @supabase/supabase-js) are loaded at runtime from `https://esm.sh` via an import map with no integrity hashes. If esm.sh is compromised, serves a malicious version, or is intercepted via BGP hijacking or DNS poisoning, the entire application — including all Supabase credentials — would be silently replaced with attacker-controlled code.

**Impact:** Total compromise: credential theft, session hijacking, candidate data exfiltration, persistent backdoor in every recruiter session.

**Remediation:**
Bundle all dependencies via Vite instead of loading from CDN. `package.json` already exists and lists all dependencies — simply run `npm run build` and stop using the CDN import map. This eliminates the supply chain risk entirely.

---

### P2-001 — Missing Index on `screening_score` — Full Table Scan at Scale

| Field | Detail |
|---|---|
| **Severity** | 🔴 HIGH |
| **CVSS Score** | N/A (Performance) |
| **Affected** | `campaign_candidates` table, `DashboardView` query |
| **Effort** | 30 minutes |
| **Compliance** | SOC2 A1.2 (Availability) |

**Description:**
The dashboard performs `ORDER BY screening_score DESC` on every page load and every pagination event. Without an index on this column, each query performs a full sequential table scan. At 100k+ candidates, this causes multi-second latency per page load and allows a trivial DoS via rapid pagination clicks.

| Rows | Index? | Expected Latency |
|---|---|---|
| 10k | No | ~50ms |
| 100k | No | ~500ms |
| 1M | No | 5–15 seconds |
| 1M | Yes | <10ms |

**Remediation:**
```sql
CREATE INDEX CONCURRENTLY idx_campaign_candidates_screening_score
  ON campaign_candidates(screening_score DESC);
```

---

### P2-002 — No Webhook Rate Limiting (DoS via Candidate Flood)

| Field | Detail |
|---|---|
| **Severity** | 🔴 HIGH |
| **CVSS Score** | 7.5 |
| **Affected** | n8n webhook endpoint |
| **Effort** | 4 hours |
| **Compliance** | SOC2 A1.1, A1.2 |

**Description:**
The n8n webhook has no rate limiting. An attacker sending 10,000 requests/minute will exhaust n8n's execution queue, hammer Supabase with inserts, potentially trigger row limits, and flood the dashboard with junk candidates. There is no deduplication or throttle.

**Remediation:**
1. Enable n8n's built-in rate limiting on webhook nodes
2. Add Cloudflare or Nginx rate limit upstream (100 req/min per IP)
3. Add candidate deduplication by email in n8n before Supabase insert
4. Implement HMAC webhook signature (see P3-001)

---

### P3-002 — Stored XSS via Unsandboxed PDF Iframe

| Field | Detail |
|---|---|
| **Severity** | 🔴 HIGH |
| **CVSS Score** | 7.8 |
| **Affected** | `CandidateProfileView` — `<iframe>` line 814 |
| **Effort** | 30 minutes |
| **Compliance** | OWASP A03:2021 |

**Description:**
The resume preview `<iframe>` has no `sandbox` attribute. PDFs with embedded JavaScript (a documented PDF spec feature) will execute in the context of the page in Chromium-based browsers. A malicious candidate could upload a PDF that steals the recruiter's Supabase session token when they open the profile.

**Remediation:**
```tsx
// index.tsx line 814 — add sandbox and referrerPolicy:
<iframe
  src={`${viewUrl}#page=${pdfPage}&view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
  className="w-full h-full min-h-[800px] border-none shadow-lg"
  title="PDF Preview"
  sandbox="allow-scripts"
  referrerPolicy="no-referrer"
/>
```

---

### P3-005 — No Server-Side File Content Validation on Resume Upload

| Field | Detail |
|---|---|
| **Severity** | 🔴 HIGH |
| **CVSS Score** | 7.2 |
| **Affected** | Supabase Storage bucket `resumes`, n8n workflow |
| **Effort** | 6 hours |
| **Compliance** | SOC2 CC6.8, OWASP A08:2021 |

**Description:**
Resume files are stored in Supabase Storage and rendered in an iframe. There is no server-side MIME validation, magic byte checking, file size limit, or antivirus scanning. An attacker can upload HTML files that execute JavaScript when opened, PDFs with embedded JavaScript, or oversized files that exhaust storage quotas.

**Malicious Upload Types:**
| Type | Risk |
|---|---|
| EXE disguised as PDF | Malware distribution |
| PDF with embedded JavaScript | Session theft via iframe |
| HTML renamed to .pdf | Stored XSS |
| SVG with `<script>` tags | Stored XSS |
| 1 GB null-byte file | Storage DoS |
| Path traversal in filename (`../../evil.sh`) | File overwrite |

**Remediation:**
In the n8n workflow, before passing any file to Supabase Storage:
1. Validate file extension is in allowlist: `['.pdf']`
2. Check magic bytes — PDF must start with `%PDF`
3. Enforce max file size of 10 MB
4. Optionally integrate VirusTotal API for scanning

---

### P6-001 — n8n Execution Logs Retain PII Indefinitely

| Field | Detail |
|---|---|
| **Severity** | 🔴 HIGH |
| **CVSS Score** | 7.1 |
| **Affected** | n8n execution history, all workflow runs |
| **Effort** | 30 minutes |
| **Compliance** | GDPR Article 5(1)(e), SOC2 CC6.7 |

**Description:**
By default, n8n stores the full input/output of every workflow execution. Every candidate submission creates an execution record containing: full_name, email, phone, nationality, resume_url, AI scores, and screening summary. Without pruning enabled, this PII accumulates indefinitely and is accessible to anyone with n8n admin access.

**Remediation:**
Set the following environment variables on the n8n instance:
```
EXECUTIONS_DATA_PRUNE=true
EXECUTIONS_DATA_MAX_AGE=168
EXECUTIONS_DATA_SAVE_ON_ERROR=all
EXECUTIONS_DATA_SAVE_ON_SUCCESS=none
```
This retains failures for debugging but discards successful execution PII.

---

### P6-002 — Workflow Duplication Creates Silent Cross-Client Data Pollution

| Field | Detail |
|---|---|
| **Severity** | 🔴 HIGH |
| **CVSS Score** | 7.8 |
| **Affected** | n8n workflow duplication, all per-client Supabase tables |
| **Effort** | 3 hours |
| **Compliance** | SOC2 CC6.1, GDPR Article 32 |

**Description:**
The onboarding SOP relies on manual workflow duplication. If the operator forgets to update the target table name in the Supabase insert node of the duplicated workflow, Client B's candidates are silently written into Client A's table. n8n will not error — the insert will succeed — and the cross-contamination will only be discovered when reviewing data.

**Remediation:**
1. Add a validation Code node that asserts `$env.CLIENT_TABLE_NAME` is set and non-empty before any Supabase operation
2. Store the table name as an environment variable per n8n instance/project, not hardcoded
3. Add an acceptance test to the onboarding checklist that verifies data goes to the correct table

---

### P7-002 — No Content Security Policy Headers

| Field | Detail |
|---|---|
| **Severity** | 🔴 HIGH |
| **CVSS Score** | 7.0 |
| **Affected** | Vercel deployment, `index.html` |
| **Effort** | 2 hours |
| **Compliance** | SOC2 CC6.8, OWASP A05:2021 |

**Description:**
No Content-Security-Policy header is configured on the Vercel deployment. If any XSS vulnerability is exploited, the attacker has full access to the Supabase ANON key, all session data, all loaded candidate data, and the ability to exfiltrate to any external domain.

**Remediation:**
Create `vercel.json` in the project root:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' https://cdn.tailwindcss.com https://esm.sh; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-src https://*.supabase.co; img-src 'self' data: https://*.supabase.co; style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com"
        },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    }
  ]
}
```

---

### P3-003 — Email Allowlist Bypass via Unicode Homoglyph

| Field | Detail |
|---|---|
| **Severity** | 🟡 MEDIUM |
| **CVSS Score** | 5.3 |
| **Affected** | `index.tsx` line 866 |
| **Effort** | 1 hour |
| **Compliance** | OWASP A07:2021 |

**Description:**
The client-side email check uses strict string equality. Unicode homoglyphs (e.g. Cyrillic 'о' `\u043E` instead of Latin 'o') could create an account at `mоconstruction@gmail.com` which visually looks identical. This is mostly moot once RLS is enforced at the database level (P1-002), but the client-side check would be bypassed.

**Remediation:**
Move allowlist enforcement to RLS (see P1-002). The client-side check becomes irrelevant defence-in-depth only.

---

### P3-004 — `information_schema` Table Enumeration

| Field | Detail |
|---|---|
| **Severity** | 🟡 MEDIUM |
| **CVSS Score** | 5.9 |
| **Affected** | Supabase Postgres — `information_schema` |
| **Effort** | 1 hour |
| **Compliance** | SOC2 CC6.1 |

**Description:**
By default, Supabase's anon role can query `information_schema.tables`. If multiple clients have separate tables (e.g. `client_a_candidates`, `client_b_candidates`), any authenticated user can enumerate all table names, discovering other clients' existence.

**Remediation:**
```sql
REVOKE SELECT ON information_schema.tables FROM anon, authenticated;
```

---

### P4-001 — Hardcoded Table Name — Multi-Tenancy is Architectural Fiction

| Field | Detail |
|---|---|
| **Severity** | 🟡 MEDIUM |
| **CVSS Score** | N/A (Architecture) |
| **Affected** | `index.tsx` line 297, all n8n workflows |
| **Effort** | 2–3 days |
| **Compliance** | SOC2 CC6.1 |

**Description:**
The table name `campaign_candidates` is hardcoded in every Supabase query. The dashboard can only ever display one table. Adding a second client requires a code change and deployment, manual n8n workflow duplication, and new RLS policies. There is no client identity concept at the auth layer.

**Impact:** Scaling to N clients requires N code deployments. A misconfigured workflow duplication could silently write Client B data into Client A's table.

**Remediation:**
Introduce a `client_id` column on a unified `candidates` table, or use Postgres schemas (one schema per client) rather than table name suffixes. Route queries via `auth.jwt()` claims or a `recruiter_profiles` lookup table.

---

### P5-001 — Resume Signed URLs Remain Valid After Logout

| Field | Detail |
|---|---|
| **Severity** | 🟡 MEDIUM |
| **CVSS Score** | 4.3 |
| **Affected** | `CandidateProfileView`, Supabase Storage |
| **Effort** | 1 hour |
| **Compliance** | GDPR Article 5(1)(f) |

**Description:**
Signed URLs are valid for 3600 seconds (1 hour) regardless of whether the recruiter's session has ended. If a recruiter logs out, or their device is stolen, any previously opened signed URL remains accessible for up to 1 hour. URLs can be bookmarked, shared in chat history, or leaked from browser history.

**Remediation:**
Reduce signed URL expiry to 300 seconds (5 minutes) for view URLs. Change `3600` to `300` in `CandidateProfileView` lines 496 and 558.

---

### P7-001 — No Audit Trail for Recruiter Actions

| Field | Detail |
|---|---|
| **Severity** | 🟡 MEDIUM |
| **CVSS Score** | 4.5 |
| **Affected** | Entire dashboard |
| **Effort** | 4 hours |
| **Compliance** | SOC2 CC7.2, GDPR Article 30 |

**Description:**
There is no logging of which recruiter viewed which candidate's profile, when, or from where. If a data breach occurs, there is no way to determine what was accessed. Compliance audits requiring access logs (SOC2, GDPR Article 30) cannot be satisfied.

**Remediation:**
1. Create a `recruiter_audit_log` table with RLS restricted to service role reads only
2. Add an insert on every `onSelectCandidate` call:
   ```sql
   INSERT INTO recruiter_audit_log (recruiter_email, candidate_id, action, timestamp)
   VALUES (auth.email(), $candidate_id, 'view_profile', now());
   ```
3. Enable Supabase's built-in auth event logs

---

### P5-002 — Storage Bucket Enumeration via `list()` API

| Field | Detail |
|---|---|
| **Severity** | 🟢 LOW |
| **CVSS Score** | 3.1 |
| **Affected** | `CandidateProfileView` lines 526–533 |
| **Effort** | 1 hour |
| **Compliance** | GDPR Article 5(1)(c) |

**Description:**
When direct resume path resolution fails, the code calls `supabase.storage.from('resumes').list('', { search: filename })`. This exposes all file names in the bucket root to a list operation. An authenticated user could call this API directly to enumerate all resume filenames, revealing candidate names (if files are named with candidate info) and total file count.

**Remediation:**
Restrict the `list` operation on the storage bucket to service role only. Standardize file naming to UUID-only (no candidate name in the storage path).

---

### P7-003 — Candidate PII Visible in Browser Console Logs

| Field | Detail |
|---|---|
| **Severity** | 🟢 LOW |
| **CVSS Score** | 2.1 |
| **Affected** | `CandidateProfileView` lines 489, 499, 537 |
| **Effort** | 2 hours |
| **Compliance** | GDPR Article 5(1)(c) |

**Description:**
Several `console.log` statements print resume paths and file resolution details to the browser console. These are visible to anyone who opens browser DevTools, including the recruiter's colleagues, IT staff, or an attacker with physical access.

```typescript
// Line 489:
console.log(`[ResumeFetch] Starting resolution. Original="${originalPath}"`)
// Line 499:
console.log('[ResumeFetch] Success with clean path.')
// Line 537:
console.log(`[ResumeFetch] Deep search found: "${match.name}"`)
```

**Remediation:**
Remove all `console.log` and `console.warn` statements from `CandidateProfileView`, or replace with a structured logger that is disabled in production builds.

---

## Remediation Roadmap

### 🚨 Sprint 0 — Before Any Production Traffic (~2 days)

| Priority | Fix | Effort | Findings Closed |
|---|---|---|---|
| 1 | Enable RLS on all client tables with `auth.email()` policy | 1 hour | P1-002, P4-002 |
| 2 | Add database index on `screening_score` | 30 min | P2-001 |
| 3 | Add `sandbox="allow-scripts"` to PDF iframe | 30 min | P3-002, P5-003 |
| 4 | Create `vercel.json` with CSP and security headers | 2 hours | P7-002 |
| 5 | Add HMAC signature verification to n8n webhook | 3 hours | P3-001 |
| 6 | Add rate limiting to n8n webhook | 4 hours | P2-002 |
| 7 | Enable n8n execution data pruning | 30 min | P6-001 |

### ⚠️ Sprint 1 — Within 2 Weeks (~19 hours)

| Priority | Fix | Effort | Findings Closed |
|---|---|---|---|
| 8 | Bundle JS via Vite — remove CDN import map | 4 hours | P1-003 |
| 9 | Add file validation in n8n (MIME + magic bytes + size) | 6 hours | P3-005 |
| 10 | Add workflow duplication validation guard in n8n | 3 hours | P6-002 |
| 11 | Create recruiter audit log table | 4 hours | P7-001 |
| 12 | Revoke `information_schema` access from anon role | 1 hour | P3-004 |
| 13 | Reduce signed URL expiry from 3600s to 300s | 1 hour | P5-001 |

### 📋 Sprint 2 — Within 30 Days

| Priority | Fix | Effort | Findings Closed |
|---|---|---|---|
| 14 | Re-architect multi-tenancy with `client_id` column or schema separation | 2–3 days | P4-001 |
| 15 | Add error monitoring (Sentry or equivalent) | 4 hours | General |
| 16 | Remove PII from browser console logs | 2 hours | P7-003 |

### Backlog

| Fix | Effort | Finding |
|---|---|---|
| Restrict storage bucket `list` to service role | 1 hour | P5-002 |
| Unicode homoglyph protection on email check | Moot once RLS enforced | P3-003 |
| Incident response runbook | 4 hours | General |

---

## Compliance Gap Analysis

| Finding | SOC2 Criterion | OWASP 2021 | GDPR Article |
|---|---|---|---|
| P1-001 Credentials in repo | CC6.1 | A02 Cryptographic Failures | Art. 32 |
| P1-002 Client-side auth only | CC6.3 | A01 Broken Access Control | Art. 25, 32 |
| P3-001 No webhook auth | CC6.6 | A07 Authentication Failures | Art. 32 |
| P3-005 No file validation | CC6.8 | A08 Software Integrity | Art. 32 |
| P4-002 Cross-tenant access | CC6.1 | A01 Broken Access Control | Art. 5(1)(f), 32 |
| P6-001 PII in execution logs | CC6.7 | A09 Logging Failures | Art. 5(1)(e) |
| P7-001 No audit trail | CC7.2 | A09 Logging Failures | Art. 30 |
| P7-002 No CSP | CC6.8 | A05 Security Misconfiguration | — |

---

## Production Readiness Checklist

| Criterion | Status |
|---|---|
| All secrets in environment variables | ❌ FAIL |
| No debug code in production bundle | ⚠️ PARTIAL |
| Error monitoring configured | ❌ FAIL |
| Structured logging implemented | ❌ FAIL |
| RLS enabled and tested on all tables | ❓ UNKNOWN |
| Auth guard is server-enforced | ❌ FAIL |
| Rate limiting on all public endpoints | ❌ FAIL |
| CORS policy explicitly configured | ❓ UNKNOWN |
| CSP headers configured | ❌ FAIL |
| SRI hashes on all CDN resources | ❌ FAIL |
| Webhook signature verification | ❌ FAIL |
| File upload validation | ❌ FAIL |
| Audit log for recruiter actions | ❌ FAIL |
| Automated Supabase backups | ❓ UNKNOWN |
| Incident response runbook | ❌ FAIL |

**Result: 0 PASS · 1 PARTIAL · 11 FAIL · 3 UNKNOWN**

---

## Investor / Enterprise Risk Statement

RecruitFlow demonstrates clear product-market fit and a functional automation architecture. However, the system **cannot be recommended for enterprise deployment in its current state.**

**Present risks:** Authorization is enforced exclusively in browser JavaScript — any person with a Supabase account can attempt to access candidate data directly via REST API. The webhook ingestion endpoint accepts requests from any source with no authentication. No Content Security Policy is deployed. File uploads undergo no server-side validation.

**Worst-case breach scenario:** Unverified RLS + exposed ANON key = complete extraction of all candidate PII (names, emails, phones, nationalities, AI scores) for all clients. Time to exploit: under 5 minutes using credentials visible in the public repository. GDPR fine exposure: up to 4% of annual global turnover or €20M.

**Remediation timeline:** Sprint 0 items (7 critical fixes) can be completed in under 2 business days. Full production readiness is achievable in 30 days.

**Recommendation:** Do not process real candidate PII until Sprint 0 is complete and RLS policies are independently verified.

---

*Report generated by Claude Code — RecruitFlow Security Audit 2026-02-12*
