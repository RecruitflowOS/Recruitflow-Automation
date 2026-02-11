# New Client Onboarding SOP
## RecruitFlow — Supabase + Automation + Dashboard

**Version:** 1.0 | **Date:** 2026-02-11

---

## Roles & Ownership

| Task Area | Owner |
|---|---|
| Automation duplication, webhook setup, node reconfiguration | **Ayo** |
| Supabase table creation, RLS policies, storage bucket | **Franco / Tangeni** |
| Dashboard config update (table name, campaign title) | **Franco / Tangeni** |
| End-to-end smoke test + sign-off | **All three** |

---

## Step-by-Step Checklist

### Phase 1 — Supabase Setup `Franco / Tangeni`

- [ ] **1.1** Create new table in Supabase using the standard schema (SQL below).
- [ ] **1.2** Enable RLS on the new table.
- [ ] **1.3** Add SELECT policy for authenticated users (copy from existing policy — no INSERT/UPDATE/DELETE policies).
- [ ] **1.4** Confirm storage bucket `resumes` exists. If this client needs isolation, create a new bucket named `{client_name}_resumes` and note the path convention.
- [ ] **1.5** Create a Supabase Auth user for the client (if they need dashboard access) and confirm login works.

**Standard table creation SQL — paste into Supabase SQL Editor:**
```sql
-- Replace {table_name} with the actual client table name e.g. acme_candidates
CREATE TABLE public.{table_name} (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name        TEXT NOT NULL,
  email            TEXT,
  phone            TEXT NOT NULL,
  nationality      TEXT,
  current_city     TEXT,
  position_applied TEXT,   -- use plain TEXT unless enum is required
  resume_url       TEXT,
  screening_status TEXT,
  screening_score  INTEGER,
  screening_summary TEXT,
  screening_report  TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.{table_name} ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Authenticated users can view candidates"
ON public.{table_name}
FOR SELECT
TO authenticated
USING (true);
```

> **Note on `position_applied`:** Use plain `TEXT` by default. Only use an ENUM if the position list is fixed and known upfront. Discuss with Ayo before choosing ENUM — the automation must match exactly.

---

### Phase 2 — Automation Setup `Ayo`

- [ ] **2.1** Duplicate the existing automation workflow in n8n (or relevant platform). Rename it clearly: `{client_name} — Recruitment Automation`.
- [ ] **2.2** A new webhook URL is auto-generated on duplication. Copy it.
- [ ] **2.3** Update the **Webhook trigger node** if needed (confirm the path/method is correct for this client).
- [ ] **2.4** Update the **Candidate General Info Set node** — map fields from the new client's form payload (name, email, phone, nationality, city, position applied, etc.).
- [ ] **2.5** Update the **Candidate Application Answers Set node** — capture client-specific question answers from the form payload.
- [ ] **2.6** Update the **LLM Screener node(s)**:
  - Keep the existing prompting format and JSON expressions.
  - Update only the client-specific criteria section: required experience years, mandatory certifications, position-specific scoring rubric.
  - Do NOT rewrite or remove existing JSON output expressions.
- [ ] **2.7** Reconnect the **Supabase insert node(s)** to the new client table (`{table_name}`). Verify all column mappings are correct (field names in the node must match the DB column names exactly).
- [ ] **2.8** Confirm resume extraction node is still connected and writing to the correct storage path (`resumes/` or `{client_name}_resumes/`).
- [ ] **2.9** Activate the workflow. Do a single test run manually to confirm execution completes without errors.

---

### Phase 3 — Application Form Setup `Ayo`

- [ ] **3.1** Open the client's application form (Lovable / Google AI Studio / other).
- [ ] **3.2** Insert the new webhook URL (from Step 2.2) into the form's submission handler.
- [ ] **3.3** Confirm the form posts all required fields in the payload — cross-check against the Set nodes configured in Step 2.4–2.5.
- [ ] **3.4** Submit one test application through the live form and verify it triggers the automation end-to-end.

---

### Phase 4 — Dashboard Configuration `Franco / Tangeni`

Two lines in `index.tsx` must be updated for each client:

**4.1 — Update the table name** (line ~262):
```typescript
// BEFORE
.from('campaign_candidates')

// AFTER — use the new client table name
.from('{table_name}')
```

**4.2 — Update the campaign title displayed on the dashboard** (line ~371):
```typescript
// BEFORE
<h1 ...>Apprenticeship Program - Freight Forwarding</h1>

// AFTER
<h1 ...>{Client Campaign Title}</h1>
```

**4.3** If the Supabase project is different per client (separate Supabase project), also update lines 39–40:
```typescript
const SUPABASE_URL = 'https://{new_project_ref}.supabase.co';
const SUPABASE_ANON_KEY = '{new_anon_key}';
```

- [ ] **4.4** Save, build/deploy the dashboard. Confirm it loads and shows candidates after test submissions from Phase 3.
- [ ] **4.5** Log in as the client user (created in Step 1.5) and verify they can see data, view profiles, download resumes, and download the AI report.

---

## Definition of Done

All of the following must be true before onboarding is marked complete:

- [ ] Supabase table exists with correct schema and RLS enabled
- [ ] Anon/unauthenticated SELECT returns empty `[]` (not an error, just no data)
- [ ] Anon INSERT/DELETE returns RLS policy violation error
- [ ] Automation workflow is active and named correctly
- [ ] A real test application submitted via the client form creates a row in the correct table
- [ ] Resume PDF appears in the storage bucket at the correct path
- [ ] Dashboard loads and shows the test candidate ranked by score
- [ ] Candidate profile view displays: name, position, contact info, score, summary
- [ ] Resume preview loads in the dashboard (signed URL resolves)
- [ ] AI Report download works (produces `.txt` file)
- [ ] Client user can log in and access the dashboard independently
- [ ] Old/previous client table is NOT being queried (no data bleed)

---

## Common Failure Points + Quick Fixes

| Symptom | Likely Cause | Fix |
|---|---|---|
| Dashboard shows `Access Denied` / empty after login | RLS enabled but no SELECT policy, or wrong table name | Check RLS policies in Supabase → Tables → RLS tab. Confirm table name in `index.tsx` line ~262 matches exactly |
| Dashboard shows no candidates but table has rows | Table name mismatch (case-sensitive) | Compare `.from('...')` value in code against exact table name in Supabase. Must be identical |
| Automation runs but no row inserted | Supabase insert node still pointing to old table | Open the Supabase node in the workflow, update the table name field |
| Resume preview fails / "Resume Not Found" | `resume_url` path in DB doesn't match actual file path in storage | Check the storage bucket in Supabase. Compare the file name stored in `resume_url` against what's actually in the bucket. The dashboard strips `resumes/` prefix automatically |
| Resume preview fails after making bucket private | Storage policy missing for authenticated reads | Add storage SELECT policy: `CREATE POLICY "auth read resumes" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = '{bucket_name}');` |
| Automation produces `null` for a field | Set node missing that field, or form isn't sending it | Check form payload in automation execution log. Add the missing field to the correct Set node |
| `position_applied` insert error (invalid enum value) | `position_applied` column is an ENUM and the value doesn't match | Either add the value to the enum (`ALTER TYPE position_applied_enum ADD VALUE '...'`) or change the column to plain `TEXT` |
| LLM screener returns wrong scores or bad JSON | Client-specific criteria updated incorrectly in prompt | Revert prompt changes. Only modify the criteria section — leave JSON output format and expressions untouched |
| Webhook not receiving form submissions | Wrong webhook URL in the form, or workflow is inactive | Copy webhook URL directly from the n8n trigger node. Confirm workflow is **active** (not in testing/draft mode) |
| Old client data visible on new client dashboard | Table name in `index.tsx` not updated | Update `.from('{table_name}')` and redeploy |

---
---

## Standard Configuration Prompt (Reusable Template)

> Copy this prompt when starting any new client onboarding. Fill in all values before sharing with the team or using with CloudCode.

---

```
NEW CLIENT ONBOARDING — RECRUITFLOW CONFIGURATION

== CLIENT DETAILS ==
Client Name:          [e.g. Acme Logistics]
Campaign Name:        [e.g. Operations Graduate Intake 2026]
Campaign Table Name:  [snake_case, e.g. acme_grad_candidates]
Dashboard Title:      [Text shown on dashboard header, e.g. "Acme — Graduate Programme 2026"]

== SUPABASE CONFIG ==
Project URL:          https://{project_ref}.supabase.co
Anon Key:             [paste anon key]
Service Role Key:     [ONLY share with Ayo for automation node — do NOT put in dashboard code]
Table Name:           [same as Campaign Table Name above]

== STORAGE ==
Bucket Name:          resumes   (or {client_name}_resumes if isolated)
File Path Convention: resumes/cv0_{YYYY-MM-DD}_{HHmmss}.pdf
                      (automation sets this — confirm with Ayo)

== APPLICATION FORM ==
Form Platform:        [Lovable / Google AI Studio / Other]
Form URL:             [link to form]
Webhook URL:          [generated from n8n after workflow duplication — Ayo provides this]

== REQUIRED FIELDS (must match DB schema) ==
Confirm the form collects and the automation maps ALL of these:
  - full_name        (TEXT, required)
  - email            (TEXT)
  - phone            (TEXT, required)
  - nationality      (TEXT)
  - current_city     (TEXT)
  - position_applied (TEXT)
  - resume_url       (TEXT — storage path, set by automation)
  - screening_status (TEXT — set by LLM: "Qualified" or "Unqualified")
  - screening_score  (INTEGER 0–100 — set by LLM)
  - screening_summary (TEXT — set by LLM)
  - screening_report  (TEXT — set by LLM)

== CLIENT-SPECIFIC SCREENING CRITERIA ==
Position(s):          [list all positions this campaign covers]
Min. Experience:      [e.g. 10 years specific similar works experience]
Required Certs:       [e.g. Operator Certificate for Tamper Machines]
Auto-Disqualifiers:   [e.g. below 10 yrs experience OR missing cert = auto Unqualified, score 0]
Scoring Rubric:       [describe how LLM should weight criteria, e.g. experience 40%, certs 30%, etc.]
Additional Notes:     [anything else the LLM screener needs to know]

== DELIVERABLES EXPECTED ==
[ ] Supabase table created + RLS applied     → Franco / Tangeni
[ ] Automation duplicated + configured       → Ayo
[ ] Webhook URL inserted into form           → Ayo
[ ] Dashboard updated + deployed             → Franco / Tangeni
[ ] Test submission verified end-to-end      → All
```

---
---

## Technical Notes for CloudCode

These are the exact touch points in the codebase for each new client.

### 1. Supabase credentials — `index.tsx` lines 39–40
```typescript
const SUPABASE_URL  = 'https://{project_ref}.supabase.co';
const SUPABASE_ANON_KEY = '{anon_key}';
```
Only change these if the client has a **separate Supabase project**. If all clients share one project (current setup), these stay the same.

### 2. Table name — `index.tsx` line ~262
```typescript
const { data, error } = await supabase
  .from('{table_name}')          // ← update this per client
  .select('*')
  .order('screening_score', { ascending: false });
```
This is the only query in the app. One change covers everything.

### 3. Campaign title — `index.tsx` line ~371
```typescript
<h1 className="text-2xl font-bold text-slate-900">{Campaign Title Here}</h1>
```

### 4. Column mapping — `index.tsx` lines ~271–292
The mapping block reads from these DB columns. **Schema must stay consistent** — if it does, no changes needed here:
```typescript
total_score:      item.screening_score
status:           item.screening_status      // normalizeStatus() handles casing
summary:          item.screening_summary
reports:          item.screening_report
resume_path:      item.resume_url            // 'resumes/' prefix stripped automatically
position_applied: item.position_applied
nationality:      item.nationality
current_city:     item.current_city
```

### 5. Resume signed URL resolution (no code change needed)
The dashboard already handles path prefix variations automatically:
- **Strategy 1:** Strip `resumes/` prefix → try `filename.pdf`
- **Strategy 2:** Try original path as-is
- **Strategy 3:** Deep bucket search by filename

As long as the automation stores the file in the `resumes` bucket and writes the path to `resume_url`, it will resolve. The only thing that breaks this is a completely different bucket name — in that case, update the `bucketName` constant inside `CandidateProfileView` (line ~475):
```typescript
const bucketName = 'resumes'; // ← update if client uses a separate bucket
```

### 6. No env vars / config file currently
All config is hardcoded in `index.tsx`. If multi-client deployments grow, the recommended upgrade is a top-level config object:
```typescript
// Future-friendly: add at top of index.tsx
const CLIENT_CONFIG = {
  supabaseUrl:   'https://...',
  supabaseKey:   '...',
  tableName:     'client_candidates',
  campaignTitle: 'Client Campaign Name',
  resumeBucket:  'resumes',
};
```
This is not required now — note it for when the client count grows.
