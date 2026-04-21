# Resume Display Diagnostics

## Overview
This guide helps diagnose why resumes aren't displaying in the CandidateProfileView. Follow the steps below to identify the issue.

---

## How to Run the Diagnostic

1. **Open your app** in the browser
2. **Press F12** to open Developer Tools
3. **Click the "Console" tab**
4. **Copy and paste the entire script below** and press Enter
5. **Share the output** with detailed results

---

## Complete Diagnostic Script

```javascript
// ============================================
// RESUME DIAGNOSTICS - RUN IN BROWSER CONSOLE
// ============================================

console.clear();
console.log('%c╔════════════════════════════════════╗', 'color: #4f46e5; font-weight: bold');
console.log('%c║   RESUME DISPLAY DIAGNOSTICS       ║', 'color: #4f46e5; font-weight: bold');
console.log('%c╚════════════════════════════════════╝', 'color: #4f46e5; font-weight: bold');

// ============================================
// STEP 1: DATABASE CHECK
// ============================================
console.log('%c\n=== STEP 1: DATABASE RECORDS ===', 'color: #2563eb; font-weight: bold; font-size: 13px');
console.log('Checking campaign_candidates table for resume_url values...\n');

const { data: dbRecords, error: dbError } = await supabase
  .from('campaign_candidates')
  .select('id, full_name, resume_url')
  .limit(10);

if (dbError) {
  console.error('❌ Database Error:', dbError.message);
} else if (!dbRecords || dbRecords.length === 0) {
  console.warn('⚠️  No candidates found in database');
} else {
  console.log(`✓ Found ${dbRecords.length} candidates\n`);
  let hasResume = 0;
  dbRecords.forEach((r, idx) => {
    const hasUrl = r.resume_url && r.resume_url.trim().length > 0;
    if (hasUrl) hasResume++;
    const icon = hasUrl ? '✓' : '✗';
    console.log(`${idx + 1}. ${icon} ${r.full_name}`);
    console.log(`   resume_url: ${r.resume_url || '(NULL)'}`);
  });
  console.log(`\nSummary: ${hasResume}/${dbRecords.length} candidates have resume_url values`);
}

// ============================================
// STEP 2: STORAGE BUCKET CHECK
// ============================================
console.log('%c\n=== STEP 2: STORAGE BUCKET ===', 'color: #2563eb; font-weight: bold; font-size: 13px');
console.log('Checking "resumes" bucket for files...\n');

const { data: storageFiles, error: listError } = await supabase.storage
  .from('resumes')
  .list('', { limit: 50 });

if (listError) {
  console.error('❌ Storage Error:', listError.message);
  console.error('This likely means: no permission, bucket missing, or auth issue');
} else if (!storageFiles || storageFiles.length === 0) {
  console.warn('⚠️  No files found in resumes bucket (bucket may be empty)');
} else {
  console.log(`✓ Found ${storageFiles.length} files in bucket\n`);
  storageFiles.slice(0, 10).forEach((f, idx) => {
    console.log(`${idx + 1}. ${f.name}`);
  });
  if (storageFiles.length > 10) {
    console.log(`... and ${storageFiles.length - 10} more files`);
  }
}

// ============================================
// STEP 3: PATH MATCHING CHECK
// ============================================
if (dbRecords && dbRecords.length > 0 && storageFiles && storageFiles.length > 0) {
  console.log('%c\n=== STEP 3: PATH MATCHING ===', 'color: #2563eb; font-weight: bold; font-size: 13px');
  console.log('Checking if database paths exist in storage...\n');

  const dbPaths = dbRecords
    .filter(r => r.resume_url)
    .map(r => r.resume_url.replace(/^resumes\//, ''));

  const storageNames = storageFiles.map(f => f.name);

  let matches = 0;
  dbPaths.slice(0, 5).forEach(dbPath => {
    const exists = storageNames.includes(dbPath);
    const icon = exists ? '✓' : '✗';
    console.log(`${icon} ${dbPath}`);
    if (exists) matches++;
  });

  console.log(`\nMatches: ${matches}/${Math.min(dbPaths.length, 5)} paths found in storage`);
}

// ============================================
// STEP 4: SIGNED URL TEST
// ============================================
if (dbRecords && dbRecords.length > 0) {
  const recordWithUrl = dbRecords.find(r => r.resume_url && r.resume_url.trim().length > 0);

  if (recordWithUrl) {
    console.log('%c\n=== STEP 4: SIGNED URL TEST ===', 'color: #2563eb; font-weight: bold; font-size: 13px');
    console.log(`Testing with: ${recordWithUrl.full_name}\n`);

    const cleanPath = recordWithUrl.resume_url.replace(/^resumes\//, '');
    console.log(`Clean path: ${cleanPath}`);

    const { data: signed, error: signError } = await supabase.storage
      .from('resumes')
      .createSignedUrls([cleanPath], 3600);

    if (signError) {
      console.error('❌ Error creating signed URL:', signError.message);
    } else if (!signed || !signed[0]) {
      console.error('❌ No response from createSignedUrls');
    } else if (signed[0].error) {
      console.error('❌ Signed URL error:', signed[0].error);
    } else {
      console.log('✓ Successfully generated signed URL');
      console.log('\nYou can test this URL by opening it:');
      console.log(signed[0].signedUrl);
    }
  }
}

// ============================================
// SUMMARY & NEXT STEPS
// ============================================
console.log('%c\n=== DIAGNOSTIC COMPLETE ===', 'color: #16a34a; font-weight: bold; font-size: 13px');
console.log('%cCopy the output above and share with support.', 'color: #666; font-style: italic');
```

---

## What to Look For

### ✓ Everything Works
- Database shows resume_url values (not NULL)
- Storage bucket has files
- Paths match between database and storage
- Signed URLs generate successfully

### ✗ Common Issues

| Issue | What to Look For | Solution |
|-------|------------------|----------|
| **resume_url is NULL** | Database column shows `(NULL)` for most candidates | Files were never linked to candidates in the database |
| **Bucket is empty** | "No files found in resumes bucket" | Resume files weren't uploaded to Supabase storage |
| **Path mismatch** | Database path doesn't exist in storage bucket | Files were moved/renamed, or paths are stored incorrectly |
| **Can't create signed URL** | Error message when signing URL | Permission issue on bucket, or file was deleted from storage |
| **Permission denied** | "Storage Error: no permission" | RLS policy on storage bucket blocks access |

---

## After Running Diagnostics

**Share the console output and I can:**
1. Identify which step is failing
2. Provide a fix for the specific issue
3. Help you upload missing files if needed
4. Fix path mismatches in the database

---

## Quick Manual Checks

If you prefer to check manually:

**Check if resume_url is populated:**
```javascript
const { data } = await supabase
  .from('campaign_candidates')
  .select('full_name, resume_url')
  .limit(5);
console.log(data);
```

**Check what files are in storage:**
```javascript
const { data } = await supabase.storage
  .from('resumes')
  .list('');
console.log(data);
```

**Try to access a specific file:**
```javascript
const { data: signed } = await supabase.storage
  .from('resumes')
  .createSignedUrls(['filename.pdf'], 3600);
console.log(signed);
```
