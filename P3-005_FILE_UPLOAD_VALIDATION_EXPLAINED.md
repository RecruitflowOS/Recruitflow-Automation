# P3-005: No Server-Side File Content Validation — Detailed Explanation

**Finding:** P3-005 — No Server-Side File Content Validation on Resume Upload
**Severity:** 🔴 HIGH
**CVSS Score:** 7.2
**Affected Component:** Supabase Storage bucket (`resumes`), n8n workflow
**Status:** ❌ OPEN (informational only)

---

## Executive Summary

When candidates upload resumes, there is **no server-side validation** of what's actually in the file. This allows attackers to upload:

- ❌ Malware disguised as PDF
- ❌ HTML files that execute as web pages
- ❌ Oversized files that exhaust storage quotas
- ❌ Files with path traversal in filenames

**Current Flow:**
```
Candidate uploads file → n8n stores to Supabase Storage → Recruiter opens it in iframe
                         ↑ NO VALIDATION HERE
```

---

## Attack Scenarios

### Scenario 1: Malware Distribution

**Attack:**
1. Attacker creates malicious EXE file
2. Renames it `resume.pdf`
3. Uploads via candidate form
4. File stored in Supabase Storage
5. Recruiter downloads file
6. Recruiter's antivirus detects malware, but it's already in the download folder

**Current Protection:** ❌ NONE
**Risk:** Medium (requires recruiter to execute file)

---

### Scenario 2: HTML Injection via PDF Rename

**Attack:**
1. Attacker creates HTML file with embedded JavaScript
2. Renames it `resume.pdf`
3. Uploads via candidate form
4. n8n stores it in Storage as `resume.pdf` (no validation)
5. Recruiter opens profile, iframe loads the file
6. Browser sees `.pdf` in URL but file is actually HTML
7. HTML/JavaScript executes in iframe context

**Current Protection:** ⚠️ PARTIAL (sandbox attribute helps, but not guaranteed)
**Risk:** High (could bypass PDF.js and execute arbitrary code)

---

### Scenario 3: SVG with Embedded JavaScript

**Attack:**
1. Attacker creates SVG file with `<script>` tag
2. Renames it `resume.pdf`
3. Uploads via form
4. File stored as-is
5. Iframe tries to render SVG
6. SVG JavaScript executes

**Current Protection:** ⚠️ PARTIAL (sandbox helps)
**Risk:** High

**Example malicious SVG:**
```xml
<?xml version="1.0" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" onload="alert('XSS')">
  <circle cx="50" cy="50" r="40" />
</svg>
```

---

### Scenario 4: Storage Quota Exhaustion (DoS)

**Attack:**
1. Attacker creates 1GB null-byte file
2. Names it `resume.pdf`
3. Uploads it
4. Supabase storage quota filled
5. Legitimate candidates can no longer upload
6. System effectively down

**Current Protection:** ❌ NONE
**Risk:** Medium (availability impact)

---

### Scenario 5: Path Traversal in Filename

**Attack:**
1. Attacker creates file named `../../evil.sh`
2. Uploads via form
3. If Supabase/n8n doesn't sanitize filenames, could overwrite other files
4. Potential code execution if the file ends up in a script directory

**Current Protection:** ✅ PROBABLY SAFE (Supabase handles sanitization)
**Risk:** Low (but still possible with misconfiguration)

---

## What Validation Would Prevent

### Server-Side Validation Checks

#### Check 1: File Extension Whitelist
```
✅ Allowed: .pdf
❌ Blocked: .exe, .html, .js, .svg, .docx, etc.
```

**Prevents:** Most malware distribution, HTML injection

---

#### Check 2: Magic Byte Verification
```
File magic bytes (first few bytes):
- PDF: 25 50 44 46 (hex) = "%PDF" (ASCII)
- PNG: 89 50 4E 47 = PNG signature
- JPEG: FF D8 FF = JPEG signature
- HTML: 3C 68 74 6D 6C = "<html"
```

**Logic:**
```
IF file extension = ".pdf" AND file magic bytes ≠ "%PDF"
  THEN REJECT "File claims to be PDF but isn't"
```

**Example:**
```
Attacker uploads: resume.pdf (actually a .exe file)
Magic bytes check: File starts with "MZ" (EXE signature), not "%PDF"
Result: ✅ REJECTED before storing
```

**Prevents:** Disguised malware, trojanware

---

#### Check 3: File Size Limit
```
MAX_FILE_SIZE = 10 MB

IF file_size > 10 MB
  THEN REJECT "Resume too large"
```

**Prevents:** Storage DoS attacks, quota exhaustion

---

#### Check 4: Filename Sanitization
```
Original filename: "../../evil.sh"
Sanitized:        "evil.sh" (remove path traversal chars)

OR

Use UUID-based names: "550e8400-e29b-41d4-a716-446655440000.pdf"
(no user-controlled filename at all)
```

**Prevents:** Path traversal, filename injection

---

#### Check 5: Antivirus/Malware Scanning (Optional)
```
Use VirusTotal API or Clamav to scan files
IF file_detected_as_malware
  THEN REJECT and log alert
```

**Prevents:** Actual malware distribution

---

## Current Risk Level

### Without Validation (Current State)

| Threat | Likelihood | Impact | Risk |
|---|---|---|---|
| Malware distribution | Low | High | 🟡 Medium |
| HTML/JavaScript injection | Medium | Medium | 🟡 Medium |
| Storage DoS | Low | Medium | 🟡 Medium |
| Path traversal | Low | Low | 🟢 Low |
| **Overall Risk** | | | **🟡 MEDIUM-HIGH** |

---

### With Validation (After Fix)

| Threat | Likelihood | Impact | Risk |
|---|---|---|---|
| Malware distribution | Low | High | 🟢 Very Low |
| HTML/JavaScript injection | Very Low | Medium | 🟢 Low |
| Storage DoS | Very Low | Medium | 🟢 Low |
| Path traversal | Very Low | Low | 🟢 Very Low |
| **Overall Risk** | | | **🟢 LOW** |

---

## Implementation Location

### Where Validation Happens

Currently: **Candidate uploads resume → (no validation) → Stored in Supabase**

With validation: **Candidate uploads resume → n8n Code node validates → Stored in Supabase**

### In n8n Workflow

The validation would be added as a **Code node** before the Supabase storage node:

```javascript
// In n8n Code node:
const crypto = require('crypto');
const fs = require('fs');

// 1. Check extension
const filename = $input.body.filename;
const ext = filename.split('.').pop().toLowerCase();
if (!['pdf'].includes(ext)) {
  throw new Error('Only PDF files allowed');
}

// 2. Check magic bytes
const fileBuffer = Buffer.from($input.body.file_data, 'base64');
const magicBytes = fileBuffer.toString('hex', 0, 4);
if (magicBytes !== '25504446') { // %PDF
  throw new Error('File is not actually a PDF');
}

// 3. Check file size
const maxSize = 10 * 1024 * 1024; // 10 MB
if (fileBuffer.length > maxSize) {
  throw new Error('File too large');
}

// 4. Sanitize filename
const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_');

return {
  valid: true,
  filename: sanitized,
  size: fileBuffer.length
};
```

---

## Why You Might NOT Need This

### When Validation is Less Critical:

✅ **If your candidates are pre-vetted**
- Only known, trusted candidates upload
- Internal referrals only
- No public application form

✅ **If your recruiter base is small**
- Easy to detect compromised files
- Recruiting team knows each other

✅ **If resume viewing is read-only**
- Recruiters never download files
- Always viewed in iframe only
- (Your current implementation)

### When You DEFINITELY Need It:

❌ **If you have public candidate application form**
- Thousands of unknown candidates
- Impossible to pre-vet everyone

❌ **If recruiters download resumes**
- Higher risk of malware execution
- User devices at risk

---

## Current Safeguards (Incomplete)

Your system HAS some protections:

✅ **PDF iframe sandbox** (P3-002 fixed today)
- Prevents JavaScript execution from compromised PDFs
- Blocks access to parent window

⚠️ **Supabase Storage RLS** (probably configured)
- Controls who can read/write to bucket
- Doesn't validate content itself

❌ **NO magic byte checking**
- Can't distinguish real PDF from renamed EXE

❌ **NO file size limits**
- Storage quota can be exhausted

❌ **NO extension whitelist**
- Any file type can be stored

---

## Compliance Impact

### OWASP A08:2021 (Software & Data Integrity Failures)

> "Assuming downloaded files are safe without verifying they are genuine"

**Current Status:** ⚠️ PARTIAL RISK

---

### SOC2 CC6.8 (Handling Changes)

> "Detect and protect from unauthorized software changes"

**Current Status:** ⚠️ NEEDS IMPROVEMENT

---

## Effort vs. Risk Analysis

### Option A: Minimal Validation (1 hour)
```javascript
// Just check extension + size
if (ext !== 'pdf' || size > 10MB) reject
```
**Fixes:** Storage DoS, basic file type bypass
**Misses:** Magic byte spoofing, malware distribution

---

### Option B: Standard Validation (3 hours)
```javascript
// Extension + magic bytes + size + filename sanitization
if (!isValidPDF(file)) reject
```
**Fixes:** Most attack scenarios
**Misses:** Sophisticated malware with PDF header

---

### Option C: Full Validation (6+ hours)
```javascript
// Standard validation + VirusTotal scanning
if (!isValidPDF(file)) reject
if (isMalware(file)) reject
```
**Fixes:** Everything including sophisticated malware
**Cost:** API fees for VirusTotal

---

## Recommendation

### For Your Current Setup:

**Risk Level:** 🟡 **MEDIUM** (but mitigated by sandbox)

**Recommended Action:**
- **Option B (Standard Validation)** — 3 hours
- Worth doing before scaling to multiple clients
- Not immediately critical with current single-client setup

**Timeline:** Sprint 1 (next 2 weeks)

---

## Summary

### What P3-005 Fixes:

| Threat | Fixed | Prevented |
|---|---|---|
| Disguised malware (EXE as PDF) | ✅ | File execution |
| HTML/JavaScript injection | ✅ | Code injection |
| Storage quota exhaustion | ✅ | DoS attacks |
| Path traversal attacks | ✅ | File overwrites |
| Unsupported file types | ✅ | Compatibility issues |

### What It Doesn't Fix:

- Legitimate malware in actual PDF format (prevented by antivirus)
- Already-stored malicious files (requires cleanup)

---

## Decision for RecruitFlow

### Current Situation:
- ✅ Recruiters view resumes in iframe (sandbox protected)
- ✅ Single client (low risk from malicious uploads)
- ✅ Pre-vetted candidate pool likely

### Recommendation:
- **Implement Option B in Sprint 1** (next 2 weeks)
- **Not immediately critical** for current single-client deployment
- **Essential** before scaling to multiple clients
- **Should be done** before accepting public candidate applications

---

*P3-005 Analysis — RecruitFlow Security Hardening*
*Date: 2026-02-14*
