# Recruitflow Automation System — Project Brief

---

| Field       | Detail                                              |
|-------------|-----------------------------------------------------|
| **Title**   | Recruitflow Automation System — Project Brief       |
| **Version** | 1.0                                                 |
| **Date**    | 2026-02-11                                          |
| **Purpose** | System description and QA validation reference      |
| **Audience**| QA/Testing Teams, Developers, Technical Reviewers   |
| **Status**  | Final — System Already Built                        |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Requirements](#2-product-requirements)
   - 2.1 [Core Features](#21-core-features)
   - 2.2 [User Roles and Permissions](#22-user-roles-and-permissions)
   - 2.3 [Technical Requirements](#23-technical-requirements)
3. [User Experience (UX)](#3-user-experience-ux)
   - 3.1 [Information Architecture](#31-information-architecture)
   - 3.2 [Design Principles](#32-design-principles)
4. [Technical Architecture](#4-technical-architecture)
5. [Third-Party Integrations](#5-third-party-integrations)
6. [Data Management](#6-data-management)
7. [Security and Compliance](#7-security-and-compliance)
8. [Testing and Quality Assurance](#8-testing-and-quality-assurance)
9. [Appendices](#9-appendices)

---

## 1. Executive Summary

Recruitflow is an AI-powered recruitment automation and candidate management system designed to eliminate manual screening bottlenecks. The system automatically processes candidate applications from intake through AI evaluation, stores all structured results and raw documents in a Supabase backend, and surfaces the data to hiring teams through a secure web-based recruiter dashboard.

### How it Works — High-Level Flow

```
Candidate submits application
         │
         ▼
Automation Platform (n8n.io)
  - Parses application data
  - Invokes AI screening layer
  - Generates scores, summaries, and reports
         │
         ▼
Supabase Backend
  - Structured data → PostgreSQL table (per campaign)
  - Resume file     → Storage bucket ("resumes")
         │
         ▼
Recruiter Dashboard (Web SPA)
  - Login via Supabase Auth
  - View candidates ranked by AI score
  - Inspect individual profiles, scores, and AI reports
  - Preview and download resumes (PDF)
  - Export Top 10 report
```

### Campaign-Based Architecture

The system is organized around **campaigns**. Each hiring campaign (e.g., "Apprenticeship Program - Freight Forwarding") corresponds to a dedicated Supabase table. All candidates who apply within a campaign are stored as rows in that campaign's table and are displayed together on the dashboard. This isolates candidate data per engagement and supports multi-client deployments.

The dashboard currently connects to the `candidates` table, which represents the active campaign. Future campaigns are expected to use separate tables following the same schema.

---

## 2. Product Requirements

### 2.1 Core Features

- **Application Intake via Form**
  Candidates submit their details and resume through an external intake form. The form data and uploaded file are forwarded to the automation platform via webhook.

- **Automation Processing**
  An automation platform (n8n.io) receives the raw application payload, orchestrates the AI screening, and routes the structured output to Supabase.

- **AI Screening and Scoring**
  The AI layer evaluates candidates and produces:
  - A composite **total score** (0–100, stored as `score` in DB)
  - A qualification **status** (`Qualified`, `Unqualified`, or `Pending`)
  - An **executive summary** of the candidate's profile
  - A detailed **AI report** (full text assessment)

- **Resume Storage**
  The candidate's CV (PDF) is uploaded to the Supabase Storage bucket named `resumes`. The filename/path is saved in the `cv_file_name` column of the candidate record.

- **Supabase Table Write**
  After AI processing, all structured candidate data is written as a new row in the campaign's Supabase table.

- **Dashboard — Candidate Pipeline View**
  Authenticated recruiters see all candidates in the active campaign, sorted by AI score descending. Each row shows: full name, contact details (email, phone), AI score bar, and qualification badge.

- **Dashboard — Candidate Profile View**
  Clicking "View Profile" on any candidate opens a detailed profile page showing:
  - AI Evaluation Matrix (Technical, Experience, Cultural fit scores displayed as circular progress indicators)
  - Executive Summary block
  - Resume PDF preview panel with zoom controls and page navigation
  - Download AI Report button (saves report as `.txt`)
  - Download Resume button (triggers signed-URL download)

- **Top 10 Report Export**
  A one-click button on the dashboard downloads a plain-text report of the top 10 ranked candidates with all key metrics.

- **Authentication**
  All dashboard access requires email/password login via Supabase Auth. Sign-up is available for onboarding new recruiters.

### 2.2 User Roles and Permissions

The system uses Supabase Auth for identity and Row-Level Security (RLS) policies for data access. The current implementation supports the following conceptual roles:

| Role         | Login Required | View Candidates | View Profile & Scores | View Resume | Download Report | Export Top 10 | Manage Users |
|--------------|:--------------:|:---------------:|:---------------------:|:-----------:|:---------------:|:-------------:|:------------:|
| **Admin**    | Yes            | Yes             | Yes                   | Yes         | Yes             | Yes           | Yes          |
| **Recruiter**| Yes            | Yes             | Yes                   | Yes         | Yes             | Yes           | No           |
| **Viewer**   | Yes            | Yes             | Yes (read-only)       | No          | No              | No            | No           |
| **Unauthenticated** | —       | No              | No                    | No          | No              | No            | No           |

> **Note:** In the current build, role differentiation is enforced primarily through Supabase RLS policies applied at the database and storage layer. The dashboard UI does not yet render visibly different interfaces per role — all authenticated users receive the full recruiter interface. Role-specific UI restriction is a future consideration.

**Admin responsibilities:**
- Manage Supabase user accounts and invite new recruiters
- Configure and maintain RLS policies
- Manage campaign tables and storage buckets

**Recruiter responsibilities:**
- Monitor and review candidate pipeline
- Download reports and resumes
- Export ranked shortlists

**Viewer responsibilities:**
- Read-only access to candidate list and profiles
- Cannot download or export documents

### 2.3 Technical Requirements

| Component               | Technology / Service                              |
|-------------------------|---------------------------------------------------|
| Dashboard Frontend      | React 19 (TypeScript), Vite 6, Tailwind CSS       |
| Supabase Client Library | `@supabase/supabase-js` v2.48.1                   |
| Supabase Auth           | Email/password authentication with session tokens |
| Supabase Database       | PostgreSQL — `candidates` table per campaign      |
| Supabase Storage        | `resumes` bucket — PDF file storage               |
| Automation Platform     | Make.com (or equivalent webhook-compatible tool)  |
| AI Screening Layer      | LLM/AI module integrated within automation flow   |
| Hosting                 | Static SPA — served via any static file host      |
| Icon Library            | Lucide React v0.563.0                             |

---

## 3. User Experience (UX)

### 3.1 Information Architecture

#### Data Flow: Application to Dashboard

```
Step 1: INTAKE
  Candidate fills out application form
  → Uploads CV (PDF)
  → Submits personal details (name, email, phone)

Step 2: AUTOMATION TRIGGER
  Form submission triggers webhook to automation platform
  → Payload includes: full_name, email, phone, CV file reference

Step 3: AI PROCESSING (inside automation)
  → Resume text extracted
  → AI model evaluates candidate against job criteria
  → Produces: score (0-100), status, summary, full report

Step 4: SUPABASE WRITE
  → Structured data row inserted into campaign table (e.g., `candidates`)
  → CV file uploaded to `resumes` storage bucket
  → `cv_file_name` column populated with the file path/name

Step 5: DASHBOARD DISPLAY
  → Authenticated recruiter opens dashboard
  → React app calls: supabase.from('candidates').select('*').order('score', { ascending: false })
  → Candidates rendered in ranked table

Step 6: PROFILE DRILL-DOWN
  → Recruiter clicks "View Profile"
  → App loads candidate detail view
  → Resume URL resolved via signed URL from Supabase Storage
  → PDF rendered in inline iframe with zoom/page controls
```

#### Resume Storage and Preview

Resumes are stored in the `resumes` Supabase Storage bucket. The `cv_file_name` field in the database contains the file path. The dashboard resolves the file using the following priority strategy:

1. **Strategy 1 — Clean Path**: Strip any `resumes/` prefix from the stored path and attempt to generate a signed URL directly (handles cases where DB stores `resumes/filename.pdf` but file lives at root of bucket).
2. **Strategy 2 — Original Path**: If Strategy 1 fails, attempt the raw stored path.
3. **Strategy 3 — Deep Search**: List the bucket contents with a filename search query and match by name.

Signed URLs are generated with a 3600-second (1 hour) expiry for both viewing (inline) and downloading (with `download: true` flag).

#### Page / View Structure

```
/  (root — SPA, no routing library)
├── LoginPage         → Shown to unauthenticated users
│     ├── Sign In Form
│     └── Sign Up Form
└── App Shell         → Shown to authenticated users
      ├── Sidebar (Campaigns nav, user info, logout)
      ├── Header (search bar, console label)
      └── Content Area
            ├── DashboardView   → Candidate pipeline table
            └── CandidateProfileView → Profile, scores, resume
```

### 3.2 Design Principles

- **Clarity First**: Each candidate's qualification status, score, and identity are visible at a glance on the pipeline table. Status badges use colour-coded visual indicators (green = Qualified, red = Unqualified, amber = Pending).
- **Recruiter Efficiency**: The most relevant action — viewing a profile — is one click. Top 10 export is one click. Resume download is one click.
- **Minimal Cognitive Load**: The interface uses a single-page navigation model. No routing complexity — the app moves between two views (pipeline and profile) via state.
- **Real-Time Data Reflection**: The candidate list is fetched fresh on every dashboard mount. A "Retry Connection" button allows recruiters to manually refresh on error.
- **Transparent Error States**: When a resume cannot be found, the system shows the raw DB path for debugging. When data fetch fails, the error message from Supabase is displayed directly.
- **Progressive PDF Controls**: The resume viewer provides zoom (50%–200% in 25% steps), page navigation, reset zoom, and open-in-new-tab actions — enabling thorough review without leaving the dashboard.

---

## 4. Technical Architecture

### 4.1 System Component Diagram (Described)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL INTAKE                              │
│  [ Application Form ] ──webhook──► [ Automation Platform ]         │
│                                         │                           │
│                                    ┌────┴───────────────────┐      │
│                                    │   AI SCREENING LAYER   │      │
│                                    │  (LLM / Scoring Logic) │      │
│                                    └────────────┬───────────┘      │
└─────────────────────────────────────────────────┼───────────────────┘
                                                  │
                              ┌───────────────────┼────────────────────┐
                              │      SUPABASE BACKEND                  │
                              │                   │                    │
                              │   ┌───────────────▼────────────────┐  │
                              │   │   PostgreSQL (Database)         │  │
                              │   │   Table: `candidates`          │  │
                              │   │   (one table per campaign)     │  │
                              │   └───────────────┬────────────────┘  │
                              │                   │                    │
                              │   ┌───────────────▼────────────────┐  │
                              │   │   Storage (resumes bucket)      │  │
                              │   │   File: {cv_file_name}.pdf     │  │
                              │   └────────────────────────────────┘  │
                              │                                        │
                              │   ┌────────────────────────────────┐  │
                              │   │   Supabase Auth                 │  │
                              │   │   JWT Session Tokens           │  │
                              │   └───────────────┬────────────────┘  │
                              └───────────────────┼────────────────────┘
                                                  │
                              ┌───────────────────▼────────────────────┐
                              │      RECRUITER DASHBOARD (SPA)         │
                              │   React 19 + TypeScript + Tailwind CSS │
                              │                                        │
                              │   ┌─────────────────────────────────┐ │
                              │   │ LoginPage                        │ │
                              │   │  supabase.auth.signInWithPassword│ │
                              │   │  supabase.auth.signUp            │ │
                              │   └─────────────────────────────────┘ │
                              │   ┌─────────────────────────────────┐ │
                              │   │ DashboardView                    │ │
                              │   │  supabase.from('candidates')     │ │
                              │   │    .select('*')                  │ │
                              │   │    .order('score', {asc: false}) │ │
                              │   └─────────────────────────────────┘ │
                              │   ┌─────────────────────────────────┐ │
                              │   │ CandidateProfileView             │ │
                              │   │  supabase.storage                │ │
                              │   │    .from('resumes')              │ │
                              │   │    .createSignedUrls([path],3600)│ │
                              │   └─────────────────────────────────┘ │
                              └────────────────────────────────────────┘
```

### 4.2 Automation → Supabase Webhook Flow

1. The application form POSTs to the automation platform webhook endpoint.
2. The automation scenario parses the payload (candidate personal data + CV attachment).
3. The resume file is uploaded to Supabase Storage (`resumes` bucket) — the resulting file path is retained.
4. The candidate data and file path are passed to the AI screening module.
5. The AI module returns: `score`, `status`, `summary`, `report`.
6. The automation platform constructs the final candidate record object.
7. The record is inserted into the target campaign's Supabase table via Supabase REST API (using the service role key or an anon key with appropriate RLS for inserts).

### 4.3 Campaign Table Selection

Each campaign corresponds to a distinct Supabase table. The dashboard's `DashboardView` component currently queries the hardcoded table name `candidates`. In a multi-campaign deployment, the automation platform would write to different named tables and the dashboard would need to be parameterised by campaign.

### 4.4 Candidate Data Mapping (DB → Frontend)

The automation platform writes columns using one naming convention; the dashboard maps them to a normalized frontend interface:

| DB Column      | Frontend Field      | Notes                                             |
|----------------|---------------------|---------------------------------------------------|
| `id`           | `id`                | UUID primary key                                  |
| `full_name`    | `full_name`         | Candidate's full name                             |
| `email`        | `email`             | Contact email — defaults to `'N/A'` if null       |
| `phone`        | `phone`             | Contact phone — defaults to `'N/A'` if null       |
| `score`        | `total_score`       | Composite AI score (0–100 integer)                |
| `status`       | `status`            | Case-normalized to `Qualified/Unqualified/Pending`|
| `summary`      | `summary`           | Short AI-generated summary text                   |
| `report`       | `reports`           | Full AI report text (plain text, multi-line)      |
| `cv_file_name` | `resume_path`       | Path in `resumes` bucket — may include prefix     |

> **Important for QA**: The `score` column is used for all three sub-score displays (Technical, Experience, Cultural Fit) in the current implementation. The database does not store separate sub-scores. All three circles show the same value. This is a known implementation detail, not a bug.

### 4.5 Resume Signed URL Resolution

The dashboard uses a three-strategy fallback pattern when resolving resume URLs:

```typescript
// Strategy 1: Strip "resumes/" prefix → clean path
const cleanPath = originalPath.replace(/^resumes\//, '');
supabase.storage.from('resumes').createSignedUrls([cleanPath], 3600)

// Strategy 2: Use original path as stored in DB (fallback)
supabase.storage.from('resumes').createSignedUrls([originalPath], 3600)

// Strategy 3: Deep search by filename in bucket root
supabase.storage.from('resumes').list('', { limit: 10, search: filename })
// → then createSignedUrls on matched file
```

---

## 5. Third-Party Integrations

> **This system does not rely on any external third-party SaaS integrations beyond its core stack.**

The complete system operates within the following closed set of technologies:

| Component             | Service/Technology                      |
|-----------------------|-----------------------------------------|
| Automation Platform   | Make.com (or equivalent)                |
| Backend / Database    | Supabase (Auth + PostgreSQL + Storage)  |
| Frontend Dashboard    | Self-hosted SPA (React/Vite)            |
| AI Screening          | Embedded within automation scenario     |

There are no connections to external email services, CRM platforms, calendar tools, job boards, payment processors, or analytics services. All data remains within the Supabase project boundary and the automation platform workspace.

---

## 6. Data Management

### 6.1 Campaign Table Structure

Each campaign has a dedicated PostgreSQL table in Supabase. The current active campaign uses the table named `candidates`. The table schema is:

```sql
CREATE TABLE candidates (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name     TEXT NOT NULL,
  email         TEXT,
  phone         TEXT,
  score         INTEGER,          -- Composite AI score (0–100)
  status        TEXT,             -- 'qualified' | 'unqualified' | NULL
  summary       TEXT,             -- Short AI-generated summary
  report        TEXT,             -- Full AI screening report (plain text)
  cv_file_name  TEXT,             -- Path to resume in 'resumes' storage bucket
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

### 6.2 Candidate Records

Each row represents one candidate application. Key data integrity rules:

- `id` is auto-generated and must be unique.
- `full_name` is required; `email` and `phone` are optional but expected.
- `score` should be an integer in the range 0–100. The dashboard renders it as a percentage.
- `status` is stored lowercase in the DB (`'qualified'`, `'unqualified'`). The frontend normalises capitalisation on read.
- `cv_file_name` should contain only the filename or relative path within the bucket (e.g., `john_doe_cv.pdf` or `resumes/john_doe_cv.pdf`). The dashboard handles both formats.

### 6.3 Resume Storage Bucket

| Property            | Value                                      |
|---------------------|--------------------------------------------|
| Bucket Name         | `resumes`                                  |
| Access Type         | Private (signed URLs required)             |
| File Type           | PDF (expected; no type validation enforced)|
| URL Expiry          | 3600 seconds (1 hour) per signed URL       |
| Naming Convention   | Typically `{candidate_name}_{timestamp}.pdf` or similar |

### 6.4 Data Relationships

```
candidates table row (1)
       │
       └── cv_file_name (TEXT)
                │
                └── resumes bucket file (1)
                    (resolved via signed URL at query time)
```

There are no foreign key constraints between the database table and the storage bucket — the relationship is maintained by convention (matching `cv_file_name` value to storage object path).

### 6.5 Data Retrieval

The dashboard performs a single SELECT query on mount:

```javascript
supabase
  .from('candidates')
  .select('*')
  .order('score', { ascending: false })
```

All columns are fetched (`*`). Column mapping is applied in JavaScript after the response is received. There is no pagination — all records are returned in one request.

### 6.6 Data Updates

There is no update or delete functionality in the current dashboard. All writes are performed exclusively by the automation platform. The dashboard is read-only from the frontend's perspective.

---

## 7. Security and Compliance

### 7.1 Authentication

- Authentication is handled entirely by **Supabase Auth**.
- Users authenticate via email and password.
- On successful login, Supabase issues a **JWT session token** stored in the browser.
- The `supabase.auth.onAuthStateChange` listener keeps the session in sync throughout the app lifecycle.
- All unauthenticated users are redirected to `LoginPage` — no dashboard data is fetched or rendered without an active session.
- Sign-up is available via the login page toggle, but accounts require email verification (if configured in Supabase Auth settings).

### 7.2 Row-Level Security (RLS)

Supabase supports PostgreSQL Row-Level Security policies. These policies should be configured so that:

- Only authenticated users with valid JWT sessions can `SELECT` from the `candidates` table.
- Only the automation service role key (used server-side in Make.com) can `INSERT` new records.
- No user can `UPDATE` or `DELETE` records from the dashboard.

When RLS blocks a dashboard query, the system displays an explicit "Access Denied" error with the Supabase error message — enabling rapid diagnosis.

### 7.3 Secure Resume Storage

- The `resumes` bucket is **private** — files are not publicly accessible.
- All resume access from the dashboard uses **signed URLs** generated by the Supabase SDK.
- Signed URLs expire after **3600 seconds**. A recruiter must be authenticated to trigger URL generation.
- The download signed URL is generated with `{ download: true }` to force browser download rather than inline display where applicable.

### 7.4 Controlled Dashboard Access

- The Supabase URL and anon key are embedded in the client-side code. The anon key is safe to expose in the browser because data access is governed by RLS policies.
- No service role key is exposed on the frontend.
- Logout is implemented via `supabase.auth.signOut()`, which invalidates the session.

### 7.5 Data Integrity

- Candidate data is written once by the automation platform and is not editable through the dashboard.
- The frontend applies `normalizeStatus()` to handle case-inconsistency (`'qualified'` → `'Qualified'`) without mutating the underlying data.
- The resume path fallback strategies ensure resiliency to minor path-format variations without modifying stored data.

---

## 8. Testing and Quality Assurance

> This section is the **primary purpose** of this document. All test scenarios below should be executed by the QA team to validate system correctness.

### 8.1 Testing Overview

The system has **four critical integration points** that must be validated end-to-end:

1. **Application Intake → Automation Platform** (webhook delivery)
2. **Automation Platform → Supabase** (table write + storage upload)
3. **Supabase → Dashboard** (data fetch, rendering, column mapping)
4. **Dashboard → Storage** (signed URL resolution, PDF preview)

---

### 8.2 Test Environment Prerequisites

Before running tests, confirm the following:

- [ ] Supabase project is accessible and tables are seeded/empty as required per test
- [ ] Automation platform scenario is active and listening on webhook endpoint
- [ ] Dashboard is served locally (`npm run dev`) or from a static host
- [ ] A valid test recruiter account exists in Supabase Auth
- [ ] At least one PDF test file is available for resume upload tests
- [ ] Supabase Storage `resumes` bucket exists and is configured as private

---

### 8.3 Test Suite 1 — Authentication

| TC# | Test Case                      | Steps                                                                 | Expected Result                                             | Pass/Fail |
|-----|--------------------------------|-----------------------------------------------------------------------|-------------------------------------------------------------|-----------|
| 1.1 | Valid login                    | Enter valid email + password, click "Secure Login"                    | Session established, dashboard view renders                 |           |
| 1.2 | Invalid credentials            | Enter wrong password, submit                                          | Error banner: Supabase auth error message displayed         |           |
| 1.3 | Empty fields                   | Submit login form with blank email and/or password                    | Browser HTML5 validation prevents submit                    |           |
| 1.4 | Sign-up flow                   | Toggle to Sign Up, enter new email + password, submit                 | Success message displayed; email verification sent (if configured) |  |
| 1.5 | Sign-up with existing email    | Attempt sign-up with already-registered email                         | Appropriate Supabase error displayed                        |           |
| 1.6 | Logout                         | Click "Logout" in sidebar                                             | Session cleared, LoginPage rendered                         |           |
| 1.7 | Session persistence            | Login, close and reopen browser tab (within session window)           | User remains authenticated; dashboard renders without re-login |        |
| 1.8 | Unauthenticated direct access  | Navigate to app URL without a session                                 | LoginPage renders; no candidate data visible                |           |

---

### 8.4 Test Suite 2 — Webhook and Automation Processing

| TC# | Test Case                          | Steps                                                                                     | Expected Result                                                                        | Pass/Fail |
|-----|------------------------------------|-------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------|-----------|
| 2.1 | Valid application submission       | Submit full application form (name, email, phone, PDF resume)                             | Webhook received by automation; scenario executes without errors                       |           |
| 2.2 | Webhook payload structure          | Inspect webhook payload in automation platform                                            | Payload contains: `full_name`, `email`, `phone`, CV file reference                     |           |
| 2.3 | AI processing execution            | After valid submission, check automation execution log                                    | AI module returns `score`, `status`, `summary`, `report` fields                        |           |
| 2.4 | Score range validation             | Review AI output for multiple candidates                                                  | `score` value is an integer between 0 and 100                                          |           |
| 2.5 | Status value validation            | Review AI output values for `status`                                                      | Value is one of: `qualified`, `unqualified`, or null                                   |           |
| 2.6 | Missing CV submission              | Submit application form without attaching a resume                                        | Automation handles gracefully; row inserted with `cv_file_name = null`                 |           |
| 2.7 | Duplicate submission               | Submit same candidate twice (same email)                                                  | Two rows created (no deduplication) OR automation deduplicates — verify expected behavior |        |
| 2.8 | Automation error recovery          | Simulate AI service failure (temporarily disable AI module)                               | Automation logs error; no malformed row inserted into Supabase                         |           |
| 2.9 | Large resume file                  | Submit application with a PDF resume > 5 MB                                               | File uploaded successfully to storage; no timeout errors                               |           |
| 2.10 | Non-PDF resume                    | Submit with a `.docx` or `.jpg` file as resume                                            | System handles gracefully — either accepts and stores, or rejects with clear error      |           |

---

### 8.5 Test Suite 3 — Supabase Table Write Validation

| TC# | Test Case                            | Steps                                                                            | Expected Result                                                               | Pass/Fail |
|-----|--------------------------------------|----------------------------------------------------------------------------------|-------------------------------------------------------------------------------|-----------|
| 3.1 | New row creation                     | Submit valid application; check Supabase table editor                            | New row appears in `candidates` table within 30 seconds                       |           |
| 3.2 | All required fields populated        | Inspect inserted row                                                             | `id`, `full_name`, `score`, `status`, `summary`, `report` are all non-null    |           |
| 3.3 | `cv_file_name` column set            | Inspect inserted row after submission with PDF                                   | `cv_file_name` is non-null and matches the filename uploaded to storage bucket |          |
| 3.4 | Status casing                        | Inspect `status` column value in raw DB                                          | Stored as lowercase: `'qualified'` or `'unqualified'`                         |           |
| 3.5 | Score is integer                     | Inspect `score` column type                                                      | Value is a whole number (no decimals)                                         |           |
| 3.6 | `created_at` auto-populated          | Inspect `created_at` column                                                      | Timestamp is auto-set to time of insertion                                    |           |
| 3.7 | Correct campaign table targeted      | Submit applications for different campaigns (if multi-campaign configured)       | Each record lands in its respective campaign table                             |           |
| 3.8 | RLS blocks dashboard insert          | From authenticated browser session, attempt to insert a row manually via SDK    | Supabase returns permission denied error                                      |           |

---

### 8.6 Test Suite 4 — Supabase Storage Upload Validation

| TC# | Test Case                            | Steps                                                                            | Expected Result                                                               | Pass/Fail |
|-----|--------------------------------------|----------------------------------------------------------------------------------|-------------------------------------------------------------------------------|-----------|
| 4.1 | File uploaded to `resumes` bucket    | Submit application with PDF; check Supabase Storage → `resumes` bucket           | PDF file appears in bucket                                                    |           |
| 4.2 | Filename matches DB record           | Compare `cv_file_name` value in DB with actual file in bucket                    | Names match (accounting for any prefix like `resumes/`)                       |           |
| 4.3 | Bucket is private                    | Attempt to access the file URL directly (without signed URL)                     | HTTP 400/403 returned; file not accessible publicly                           |           |
| 4.4 | Signed URL generation                | From dashboard, open a candidate profile with a resume                           | Signed URL generated successfully; PDF displays in iframe                     |           |
| 4.5 | Signed URL expiry                    | Generate a signed URL; wait 3600+ seconds; attempt to access                    | URL returns 400/403 after expiry                                              |           |
| 4.6 | Download signed URL                  | Click "Download Resume (PDF)" button                                             | Browser prompts file download with correct filename                           |           |
| 4.7 | Multiple files — no collision        | Submit two candidates; verify both resumes are stored without overwriting        | Two distinct files in bucket, both linked correctly to their DB records       |           |

---

### 8.7 Test Suite 5 — Dashboard Data Rendering

| TC# | Test Case                            | Steps                                                                            | Expected Result                                                               | Pass/Fail |
|-----|--------------------------------------|----------------------------------------------------------------------------------|-------------------------------------------------------------------------------|-----------|
| 5.1 | Candidates load on login             | Log in and observe pipeline view                                                 | Candidate list renders with loading spinner, then populates                   |           |
| 5.2 | Sort order — highest score first     | Verify order of candidates in table                                              | Candidate with highest `score` value appears at row 1                         |           |
| 5.3 | Score display                        | Compare `score` in DB with displayed value in table                              | DB `score` value matches displayed percentage (e.g., DB: 82 → UI: `82%`)     |           |
| 5.4 | Status badge — Qualified             | Find candidate with `status = 'qualified'` in DB                                 | Green badge with "Qualified" label and checkmark icon displayed                |           |
| 5.5 | Status badge — Unqualified           | Find candidate with `status = 'unqualified'` in DB                               | Red badge with "Unqualified" label and X icon displayed                       |           |
| 5.6 | Status badge — Pending               | Find candidate with `status = null` in DB                                        | Amber badge with "Pending" label and clock icon displayed                     |           |
| 5.7 | Email display                        | Inspect candidate row                                                            | Email from DB renders in the contact column                                   |           |
| 5.8 | Phone display                        | Inspect candidate row                                                            | Phone from DB renders in the contact column                                   |           |
| 5.9 | Null email/phone                     | Find a candidate with null email/phone in DB                                     | Displays `'N/A'` gracefully                                                   |           |
| 5.10 | Empty campaign                      | Query against empty table (no rows)                                              | "No candidates found in this campaign." message displayed in table            |           |
| 5.11 | RLS error state                     | Log in with account that has no table SELECT permission                           | "Access Denied" error card shown with error message and "Retry Connection" button |       |
| 5.12 | Retry button                        | When error state is shown, click "Retry Connection"                              | `fetchCandidates()` is re-invoked; loading spinner appears; data or error re-displayed |    |

---

### 8.8 Test Suite 6 — Candidate Profile View

| TC# | Test Case                             | Steps                                                                            | Expected Result                                                               | Pass/Fail |
|-----|---------------------------------------|----------------------------------------------------------------------------------|-------------------------------------------------------------------------------|-----------|
| 6.1 | Navigate to profile                   | Click "View Profile" on any candidate row                                        | CandidateProfileView animates in; candidate name and status badge shown       |           |
| 6.2 | AI score circles                      | Inspect the three score circles (Technical, Experience, Cultural)                | All three circles display the `score` value (current implementation: same value for all three) |  |
| 6.3 | Executive summary text                | Inspect the summary block                                                        | `summary` field from DB is displayed verbatim within quotes                   |           |
| 6.4 | Null summary fallback                 | Find candidate with null `summary` in DB                                         | Displays `"No summary available."` fallback text                              |           |
| 6.5 | Back navigation                       | Click "Back to Pipeline" button                                                  | DashboardView re-renders; no data re-fetch required                           |           |
| 6.6 | AI report download                    | Click "Download AI Report" button                                                | `.txt` file downloaded named `{full_name}_AI_Report.txt` with report content  |           |
| 6.7 | AI report button disabled             | Find candidate with null `report` in DB                                          | "Download AI Report" button is disabled/greyed out                            |           |
| 6.8 | Resume download button state          | While resume URL is loading                                                      | Button shows "Scanning Storage..." and is not clickable                       |           |
| 6.9 | Resume download button active         | After signed URL resolves                                                        | Button becomes active; clicking triggers file download                         |           |

---

### 8.9 Test Suite 7 — Resume PDF Preview

| TC# | Test Case                             | Steps                                                                            | Expected Result                                                               | Pass/Fail |
|-----|---------------------------------------|----------------------------------------------------------------------------------|-------------------------------------------------------------------------------|-----------|
| 7.1 | PDF renders in viewer                 | Open profile of candidate with valid `cv_file_name`                              | PDF loads in iframe; first page visible                                       |           |
| 7.2 | Loading state during URL resolution   | Observe viewer immediately after navigating to profile                           | Spinner and "Searching Secure Storage..." message displayed during load       |           |
| 7.3 | Error state — file not found          | Open profile of candidate with invalid/non-existent `cv_file_name`               | "Resume Not Found" panel shown with DB path displayed for debugging           |           |
| 7.4 | No resume — null `cv_file_name`       | Open profile of candidate with null `cv_file_name`                               | "No resume document available." message shown; no URL resolution attempted   |           |
| 7.5 | Zoom In (+ button)                    | Click `+` zoom button repeatedly                                                 | Zoom increases by 25% per click; max 200%                                    |           |
| 7.6 | Zoom Out (- button)                   | Click `-` zoom button when below 200%                                            | Zoom decreases by 25% per click; min 50%                                     |           |
| 7.7 | Zoom Reset                            | Set zoom to non-100%, click reset button                                         | Zoom resets to exactly 100%                                                   |           |
| 7.8 | Page Next                             | Click `›` page button                                                            | `page=` URL param increments; iframe src updates to next page                 |           |
| 7.9 | Page Prev — at page 1                 | Click `‹` page button when on page 1                                             | Button is disabled; page does not go below 1                                  |           |
| 7.10 | Open in new tab                      | Click external link icon in toolbar                                              | PDF opens in new browser tab using signed view URL                            |           |
| 7.11 | Path with "resumes/" prefix           | Ensure a candidate has `cv_file_name = 'resumes/filename.pdf'` in DB            | Strategy 1 strips prefix; file loads correctly                                |           |
| 7.12 | Path without prefix                   | Ensure a candidate has `cv_file_name = 'filename.pdf'` in DB                    | Strategy 1 (clean path = original path); file loads correctly                 |           |
| 7.13 | Deep search fallback                  | Set `cv_file_name` to partial/altered name while actual file exists in bucket   | Strategy 3 finds file via bucket search; PDF loads                            |           |
| 7.14 | Page state reset on profile switch   | Navigate from candidate A profile to candidate B profile                         | PDF page resets to 1; zoom resets to 100%                                     |           |

---

### 8.10 Test Suite 8 — Top 10 Report Export

| TC# | Test Case                             | Steps                                                                            | Expected Result                                                               | Pass/Fail |
|-----|---------------------------------------|----------------------------------------------------------------------------------|-------------------------------------------------------------------------------|-----------|
| 8.1 | Download button active with data      | With 1+ candidates loaded, click "Download Top 10 Report"                        | `.txt` file downloaded                                                        |           |
| 8.2 | Download button disabled — no data    | Observe button when candidate list is empty                                      | Button is disabled and greyed out                                             |           |
| 8.3 | File contains top 10 by score         | Open downloaded file; verify ranking                                             | First entry = highest-scored candidate; entries in descending score order     |           |
| 8.4 | File format correctness               | Inspect file content structure                                                   | Header line, separator, then per-candidate blocks with rank, name, score, status, email, phone, scores, summary |  |
| 8.5 | Filename includes today's date        | Check downloaded filename                                                        | Format: `Top10_Candidates_Report_YYYY-MM-DD.txt`                              |           |
| 8.6 | Fewer than 10 candidates              | Run test with only 3 candidates in table                                         | File contains all 3 — does not error due to missing entries                   |           |

---

### 8.11 Test Suite 9 — End-to-End Candidate Flow

The following represents a complete system test that exercises all components sequentially:

**Scenario: New candidate applies and appears in dashboard**

```
Step 1: Submit application
  - Open application intake form
  - Enter: Full Name = "Jane Test", Email = "jane@test.com", Phone = "0400000000"
  - Upload: test_cv.pdf (valid PDF, < 5MB)
  - Click Submit

Step 2: Verify automation execution (wait up to 2 minutes)
  - Check Make.com (or equivalent) execution history
  - Confirm scenario completed without errors
  - Note the score, status, and summary in the execution output

Step 3: Verify Supabase table
  - Open Supabase Table Editor → `candidates` table
  - Confirm new row exists with:
    - full_name = "Jane Test"
    - email = "jane@test.com"
    - phone = "0400000000"
    - score = [value from Step 2]
    - status = "qualified" or "unqualified"
    - summary = [non-null text]
    - report = [non-null text]
    - cv_file_name = [non-null path]

Step 4: Verify Supabase Storage
  - Open Supabase Storage → resumes bucket
  - Confirm test_cv.pdf (or equivalent filename) exists

Step 5: Verify dashboard display
  - Open/refresh dashboard as authenticated recruiter
  - Confirm "Jane Test" appears in the candidate list
  - Confirm score bar matches DB score value
  - Confirm status badge matches DB status

Step 6: Verify profile view
  - Click "View Profile" for Jane Test
  - Confirm summary text matches DB value
  - Confirm score circles show correct score value
  - Confirm PDF preview loads within 5 seconds

Step 7: Verify downloads
  - Click "Download AI Report" → confirm .txt file content matches DB `report` field
  - Click "Download Resume (PDF)" → confirm PDF file downloads correctly
```

---

### 8.12 Test Suite 10 — Edge Cases and Error Conditions

| TC# | Test Case                              | Expected Behaviour                                                                        |
|-----|----------------------------------------|-------------------------------------------------------------------------------------------|
| 10.1 | Candidate name with special characters| Name renders correctly in all views (e.g., "José García", "O'Brien")                     |
| 10.2 | Very long summary text                 | Summary block scrolls or truncates gracefully; layout not broken                         |
| 10.3 | Very long report text                  | Downloaded .txt file contains full content; no truncation on download                    |
| 10.4 | Score = 0                              | Score bar shows empty/minimal fill; circle shows "0%"; no division-by-zero error         |
| 10.5 | Score = 100                            | Score bar shows full fill; circle shows "100%"                                           |
| 10.6 | Corrupted PDF in storage               | PDF viewer displays browser-native error; "Open in New Tab" still functional             |
| 10.7 | Concurrent users                       | Two recruiters logged in simultaneously; both see consistent data                        |
| 10.8 | Network interruption during fetch      | Loading spinner persists; on reconnection, retry shows updated data                      |
| 10.9 | Extremely large candidate list (100+)  | Dashboard loads all rows without browser freeze; table scrolls smoothly                  |
| 10.10 | Session expiry during active session  | Supabase session expires mid-use; subsequent Supabase calls return auth error             |

---

### 8.13 Test Suite 11 — Performance Validation

| Metric                              | Acceptable Threshold    | Test Method                                              |
|-------------------------------------|-------------------------|----------------------------------------------------------|
| Dashboard initial load time         | < 3 seconds             | Browser DevTools Network tab; time from page load to table render |
| Candidate list render (50 records)  | < 1 second              | Time from API response to DOM update                     |
| Resume signed URL generation        | < 2 seconds             | Time from profile open to PDF iframe `src` being set     |
| PDF preview initial render          | < 5 seconds             | Time from iframe `src` set to visible first page         |
| Top 10 report download              | Instant (<0.5 seconds)  | Time from button click to file download prompt           |
| Supabase API response time          | < 500ms                 | Network tab: `candidates` query response time            |

---

### 8.14 Test Suite 12 — Security and Access Control

| TC# | Test Case                                      | Expected Behaviour                                                    |
|-----|------------------------------------------------|-----------------------------------------------------------------------|
| 12.1 | Unauthenticated API call to `candidates` table | Supabase returns 401/RLS-denied; no data returned                    |
| 12.2 | Unauthenticated storage access                 | Direct object URL returns 400; signed URL required                   |
| 12.3 | Expired signed URL access                      | HTTP 400 returned; file not accessible                               |
| 12.4 | Cross-campaign data isolation                  | Users of Campaign A cannot query Campaign B table (if RLS configured)|
| 12.5 | Anon key cannot bypass RLS                     | Using anon key directly, INSERT to `candidates` returns permission denied |
| 12.6 | Console inspection of network calls            | No service role key visible in browser network requests              |
| 12.7 | Logout clears session token                    | After logout, `supabase.auth.getSession()` returns null              |

---

## 9. Appendices

### A. Glossary of Technical Terms

| Term                    | Definition                                                                                  |
|-------------------------|---------------------------------------------------------------------------------------------|
| **SPA**                 | Single-Page Application — a web app that loads once and updates content dynamically          |
| **Supabase**            | Open-source Firebase alternative providing Auth, PostgreSQL database, and file storage       |
| **RLS**                 | Row-Level Security — PostgreSQL feature controlling which rows users can access              |
| **JWT**                 | JSON Web Token — a signed, self-contained token used for authentication                      |
| **Signed URL**          | A temporary, cryptographically signed URL providing time-limited access to a private file    |
| **Webhook**             | An HTTP POST endpoint that receives real-time event data from an external service            |
| **Make.com**            | Visual automation platform (previously Integromat) used to build multi-step workflows        |
| **Campaign**            | A single recruitment drive; maps to a dedicated Supabase table                              |
| **Anon Key**            | Supabase's public API key — safe to expose in browser; gated by RLS                         |
| **Service Role Key**    | Supabase's admin API key — bypasses RLS; must NEVER be exposed in the browser               |
| **AI Screening Layer**  | The AI/LLM module within the automation that evaluates CVs and generates scores              |
| **Bucket**              | Supabase Storage container (analogous to an S3 bucket) for storing files                    |
| **Vite**                | Modern JavaScript build tool and development server                                         |
| **Tailwind CSS**        | Utility-first CSS framework applied via class names                                         |
| **Lucide React**        | Icon component library used throughout the dashboard UI                                     |

---

### B. Data Schema Examples

#### B.1 `candidates` Table — Sample Rows

```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "full_name": "Sophie Martin",
    "email": "sophie.martin@email.com",
    "phone": "0412 345 678",
    "score": 87,
    "status": "qualified",
    "summary": "Strong logistics background with 4 years in freight operations. Demonstrates excellent attention to detail and strong communication skills.",
    "report": "CANDIDATE EVALUATION REPORT\n\nCandidate: Sophie Martin\n...[full AI assessment text]...",
    "cv_file_name": "sophie_martin_cv.pdf",
    "created_at": "2026-02-10T08:32:14.000Z"
  },
  {
    "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "full_name": "Lucas Dubois",
    "email": "lucas.d@gmail.com",
    "phone": "0423 456 789",
    "score": 54,
    "status": "unqualified",
    "summary": "Limited relevant experience in freight. Skills in customer service but lacks industry-specific knowledge.",
    "report": "CANDIDATE EVALUATION REPORT\n\nCandidate: Lucas Dubois\n...[full AI assessment text]...",
    "cv_file_name": "resumes/lucas_dubois_cv.pdf",
    "created_at": "2026-02-10T09:15:02.000Z"
  },
  {
    "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "full_name": "Emma Nguyen",
    "email": null,
    "phone": null,
    "score": 71,
    "status": null,
    "summary": null,
    "report": null,
    "cv_file_name": null,
    "created_at": "2026-02-10T10:01:55.000Z"
  }
]
```

#### B.2 Frontend `Candidate` Interface

```typescript
interface Candidate {
  id: string;                     // UUID from DB
  full_name: string;              // DB: full_name
  email: string;                  // DB: email (default: 'N/A')
  phone: string;                  // DB: phone (default: 'N/A')
  total_score: number;            // DB: score (mapped)
  status: QualificationStatus;   // DB: status (normalised)
  skills_score: number;           // Currently = total_score
  experience_score: number;       // Currently = total_score
  cultural_fit_score: number;     // Currently = total_score
  summary: string;                // DB: summary
  resume_path: string | null;     // DB: cv_file_name (trimmed)
  reports?: string;               // DB: report (mapped)
}

type QualificationStatus = 'Qualified' | 'Unqualified' | 'Pending';
```

#### B.3 Automation Webhook Payload (Expected Input)

```json
{
  "full_name": "Sophie Martin",
  "email": "sophie.martin@email.com",
  "phone": "0412 345 678",
  "cv_attachment": "[binary or base64 encoded PDF]",
  "cv_filename": "sophie_martin_cv.pdf"
}
```

#### B.4 Automation → Supabase Insert Payload

```json
{
  "full_name": "Sophie Martin",
  "email": "sophie.martin@email.com",
  "phone": "0412 345 678",
  "score": 87,
  "status": "qualified",
  "summary": "Strong logistics background...",
  "report": "CANDIDATE EVALUATION REPORT\n...",
  "cv_file_name": "sophie_martin_cv.pdf"
}
```

---

### C. API Endpoint Reference

The dashboard interacts with Supabase exclusively through the `@supabase/supabase-js` client SDK. The underlying REST endpoints are:

#### C.1 Database Queries

| Operation          | SDK Method                                              | Supabase REST Equivalent                              |
|--------------------|---------------------------------------------------------|-------------------------------------------------------|
| Fetch all candidates | `supabase.from('candidates').select('*').order('score', { ascending: false })` | `GET /rest/v1/candidates?order=score.desc` |

#### C.2 Auth Endpoints

| Operation    | SDK Method                                    |
|--------------|-----------------------------------------------|
| Sign In      | `supabase.auth.signInWithPassword({email, password})` |
| Sign Up      | `supabase.auth.signUp({email, password})`    |
| Get Session  | `supabase.auth.getSession()`                 |
| Sign Out     | `supabase.auth.signOut()`                    |
| Auth Listener| `supabase.auth.onAuthStateChange(callback)`  |

#### C.3 Storage Endpoints

| Operation              | SDK Method                                                              |
|------------------------|-------------------------------------------------------------------------|
| Create signed view URL | `supabase.storage.from('resumes').createSignedUrls([path], 3600)`      |
| Create signed download URL | `supabase.storage.from('resumes').createSignedUrls([path], 3600, { download: true })` |
| List bucket (search)   | `supabase.storage.from('resumes').list('', { limit: 10, search: filename })` |

#### C.4 Supabase Project Configuration

```javascript
const SUPABASE_URL = 'https://bebiojwkjnyyccnlqjge.supabase.co';
// Anon key — safe for browser; access controlled by RLS
```

---

### D. Workflow Diagrams (Text Representation)

#### D.1 Authentication Flow

```
User opens dashboard URL
       │
       ▼
App initialises → supabase.auth.getSession()
       │
  ┌────┴─────────────────────┐
  │ Session exists?           │
  │                           │
 YES                         NO
  │                           │
  ▼                           ▼
App Shell                 LoginPage
(Dashboard rendered)      (Login form rendered)
                               │
                          User submits credentials
                               │
                        supabase.auth.signInWithPassword()
                               │
                     ┌─────────┴──────────┐
                     │ Auth successful?    │
                    YES                   NO
                     │                    │
                     ▼                    ▼
              onAuthStateChange       Error banner
              fires → setUser()       displayed
                     │
                     ▼
              App Shell renders
```

#### D.2 Candidate Data Fetch Flow

```
DashboardView mounts
       │
       ▼
setLoading(true)
       │
       ▼
supabase.from('candidates').select('*').order('score', {asc:false})
       │
  ┌────┴──────────────────────────────────┐
  │                                       │
Success                                 Error
  │                                       │
  ▼                                       ▼
Map DB columns → Candidate[]        setError(error.message)
setCandidates(mappedCandidates)     setLoading(false)
setLoading(false)                   → "Access Denied" card shown
  │
  ▼
Render candidate table rows
(sorted by total_score DESC)
```

#### D.3 Resume URL Resolution Flow

```
CandidateProfileView mounts
with candidate.resume_path
       │
  ┌────┴──────────────────────────┐
  │ resume_path is null?          │
 YES                             NO
  │                               │
  ▼                               ▼
Show "No resume               setLoadingUrl(true)
document available"                │
                              cleanPath = originalPath.replace(/^resumes\//, '')
                                   │
                              [Strategy 1] createSignedUrls([cleanPath], 3600)
                                   │
                         ┌─────────┴──────────┐
                         │ Success?            │
                        YES                   NO
                         │                    │
                         ▼                    ▼
                    finalViewUrl          [Strategy 2] Try originalPath
                    = signedUrl                │
                                    ┌──────────┴─────────┐
                                    │ Success?            │
                                   YES                   NO
                                    │                    │
                                    ▼                    ▼
                               finalViewUrl         [Strategy 3] list() + search
                               = signedUrl               │
                                               ┌─────────┴──────────┐
                                               │ File found?         │
                                              YES                   NO
                                               │                    │
                                               ▼                    ▼
                                         finalViewUrl         setUrlError()
                                         = signedUrl          → "Resume Not Found"
                                               │
                                   ┌───────────┴───────────┐
                                   │ Generate download URL  │
                                   │ (download: true)       │
                                   └───────────┬───────────┘
                                               │
                                    setViewUrl + setDownloadUrl
                                    setLoadingUrl(false)
                                               │
                                    PDF renders in iframe
```

---

### E. Known Implementation Notes for QA

The following are documented design decisions or current-state behaviours that QA should be aware of — these are **not bugs** but should be validated as intentional:

| Item | Detail |
|------|--------|
| **Sub-scores all equal total score** | `skills_score`, `experience_score`, `cultural_fit_score` are all mapped from the single `score` DB column. All three circles show the same value. |
| **Search bar is UI-only** | The header search input is rendered but no filtering logic is connected. Typing in it has no effect on the candidate list. |
| **No pagination** | The dashboard loads all candidate rows in a single query. Large datasets may impact performance. |
| **No real-time subscription** | The dashboard does not use Supabase Realtime. New candidates added after page load do not appear until a manual refresh. |
| **Status normalisation** | The DB stores `'qualified'` (lowercase); the frontend capitalises it to `'Qualified'`. Any other value (including null) maps to `'Pending'`. |
| **Campaign hardcoded** | The table name `'candidates'` and campaign title "Apprenticeship Program - Freight Forwarding" are hardcoded in the dashboard. |
| **Console debug logging** | Resume resolution logs to `console.log`/`console.warn`/`console.error` — visible in browser DevTools. This is intentional for debugging. |
