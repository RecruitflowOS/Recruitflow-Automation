#!/usr/bin/env node

/**
 * Resume Diagnostics Script
 * Run with: node diagnose-resumes.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bebiojwkjnyyccnlqjge.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlYmlvandram55eWNjbmxxamdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NDMwNTksImV4cCI6MjA4NTExOTA1OX0.-vsjqytJI9XACqdaLdQ4VKQ3Mf7ZgNFWm36_1jvim4Y';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const log = {
  header: (text) => console.log(`\n${'='.repeat(50)}\n${text}\n${'='.repeat(50)}`),
  success: (text) => console.log(`✓ ${text}`),
  error: (text) => console.error(`✗ ${text}`),
  warn: (text) => console.warn(`⚠ ${text}`),
  info: (text) => console.log(`ℹ ${text}`),
};

async function diagnoseResumes() {
  try {
    log.header('RESUME DISPLAY DIAGNOSTICS');

    // ============================================
    // STEP 1: DATABASE CHECK
    // ============================================
    log.header('STEP 1: Database Records Check');
    console.log('Fetching candidates with resume_url values...\n');

    const { data: dbRecords, error: dbError } = await supabase
      .from('campaign_candidates')
      .select('id, full_name, resume_url')
      .limit(10);

    if (dbError) {
      log.error(`Database query failed: ${dbError.message}`);
      return;
    }

    if (!dbRecords || dbRecords.length === 0) {
      log.warn('No candidates found in database');
      return;
    }

    log.success(`Found ${dbRecords.length} candidates`);
    console.log();

    let hasResumeCount = 0;
    dbRecords.forEach((r, idx) => {
      const hasUrl = r.resume_url && r.resume_url.trim().length > 0;
      if (hasUrl) hasResumeCount++;
      const status = hasUrl ? '✓' : '✗';
      console.log(`${idx + 1}. [${status}] ${r.full_name}`);
      console.log(`   resume_url: ${r.resume_url || '(NULL)'}\n`);
    });

    console.log(`Summary: ${hasResumeCount}/${dbRecords.length} candidates have resume_url\n`);

    if (hasResumeCount === 0) {
      log.error('No candidates have resume_url values - files may not be linked in database');
      return;
    }

    // ============================================
    // STEP 2: STORAGE BUCKET CHECK
    // ============================================
    log.header('STEP 2: Storage Bucket Check');
    console.log('Listing files in "resumes" bucket...\n');

    const { data: storageFiles, error: listError } = await supabase.storage
      .from('resumes')
      .list('', { limit: 100 });

    if (listError) {
      log.error(`Storage access failed: ${listError.message}`);
      console.log('This likely means: Permission denied, bucket missing, or auth issue\n');
      return;
    }

    if (!storageFiles || storageFiles.length === 0) {
      log.warn('No files found in resumes bucket (bucket may be empty)');
      return;
    }

    log.success(`Found ${storageFiles.length} files in bucket`);
    console.log('\nFirst 10 files:');
    storageFiles.slice(0, 10).forEach((f, idx) => {
      console.log(`${idx + 1}. ${f.name}`);
    });

    if (storageFiles.length > 10) {
      console.log(`... and ${storageFiles.length - 10} more files\n`);
    } else {
      console.log();
    }

    // ============================================
    // STEP 3: PATH MATCHING
    // ============================================
    log.header('STEP 3: Path Matching');
    console.log('Checking if database paths exist in storage...\n');

    const dbPaths = dbRecords
      .filter(r => r.resume_url)
      .map(r => ({
        name: r.full_name,
        path: r.resume_url.replace(/^resumes\//, '')
      }));

    const storageNames = storageFiles.map(f => f.name);

    let matchCount = 0;
    dbPaths.slice(0, 5).forEach(({ name, path }) => {
      const exists = storageNames.includes(path);
      const status = exists ? '✓' : '✗';
      console.log(`[${status}] ${name}`);
      console.log(`   Path: ${path}`);
      if (exists) {
        matchCount++;
        log.success('Found in storage');
      } else {
        log.error('NOT found in storage');
      }
      console.log();
    });

    console.log(`Match Summary: ${matchCount}/${Math.min(dbPaths.length, 5)} paths found in storage\n`);

    if (matchCount === 0) {
      log.error('ISSUE: Database paths do not match actual storage files');
      console.log('Possible solutions:');
      console.log('  - Files were renamed or deleted from storage');
      console.log('  - Database paths are stored incorrectly');
      console.log('  - Files need to be re-uploaded to storage\n');
      return;
    }

    // ============================================
    // STEP 4: SIGNED URL TEST
    // ============================================
    log.header('STEP 4: Signed URL Generation Test');

    const testRecord = dbRecords.find(r => r.resume_url);
    if (!testRecord) {
      log.warn('No resume to test');
      return;
    }

    const cleanPath = testRecord.resume_url.replace(/^resumes\//, '');
    console.log(`Testing with: ${testRecord.full_name}`);
    console.log(`Path: ${cleanPath}\n`);

    const { data: signed, error: signError } = await supabase.storage
      .from('resumes')
      .createSignedUrls([cleanPath], 3600);

    if (signError) {
      log.error(`Error creating signed URL: ${signError.message}\n`);
      return;
    }

    if (!signed || !signed[0]) {
      log.error('No response from createSignedUrls\n');
      return;
    }

    if (signed[0].error) {
      log.error(`Signed URL error: ${signed[0].error}\n`);
      return;
    }

    log.success('Successfully generated signed URL');
    console.log(`\nURL (valid for 1 hour):`);
    console.log(signed[0].signedUrl);
    console.log();

    // ============================================
    // SUMMARY
    // ============================================
    log.header('DIAGNOSTICS COMPLETE ✓');
    console.log('Status: All checks passed! Resumes should be displayable.\n');

  } catch (error) {
    log.error(`Unexpected error: ${error.message}`);
    console.error(error);
  }
}

(async () => {
  await diagnoseResumes();
})();
