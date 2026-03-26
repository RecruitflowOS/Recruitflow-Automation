import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bebiojwkjnyyccnlqjge.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlYmlvandram55eWNjbmxxamdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NDMwNTksImV4cCI6MjA4NTExOTA1OX0.-vsjqytJI9XACqdaLdQ4VKQ3Mf7ZgNFWm36_1jvim4Y';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function debugResumes() {
  console.log('\n=== RESUME DEBUGGING REPORT ===\n');

  // 1. Check database records
  console.log('1. CHECKING DATABASE RECORDS...\n');
  const { data: candidates, error: dbError } = await supabase
    .from('candidate_screenings')
    .select('id, full_name, resume_url')
    .limit(5);

  if (dbError) {
    console.error('❌ DB Error:', dbError);
  } else {
    console.log(`✓ Found ${candidates?.length || 0} candidates:\n`);
    candidates?.forEach((c: any) => {
      console.log(`  • ${c.full_name}`);
      console.log(`    resume_url: ${c.resume_url || 'NULL'}`);
    });
  }

  // 2. Check what's actually in the resumes bucket
  console.log('\n2. CHECKING STORAGE BUCKET ("resumes")...\n');
  const { data: files, error: storageError } = await supabase.storage
    .from('resumes')
    .list('', { limit: 20 });

  if (storageError) {
    console.error('❌ Storage Error:', storageError);
  } else {
    console.log(`✓ Found ${files?.length || 0} files in bucket:\n`);
    files?.forEach((f: any) => {
      console.log(`  • ${f.name} (${f.metadata?.size || '?'} bytes)`);
    });
  }

  // 3. Test signed URL creation
  if (files && files.length > 0) {
    console.log('\n3. TESTING SIGNED URL FOR FIRST FILE...\n');
    const testFile = files[0].name;
    const { data: signedData, error: signError } = await supabase.storage
      .from('resumes')
      .createSignedUrls([testFile], 3600);

    if (signError) {
      console.error('❌ Signed URL Error:', signError);
    } else if (signedData?.[0]?.error) {
      console.error('❌ File Error:', signedData[0].error);
    } else {
      console.log(`✓ Signed URL generated for "${testFile}"`);
      console.log(`  URL: ${signedData?.[0]?.signedUrl?.substring(0, 100)}...`);
    }
  }

  console.log('\n=== END REPORT ===\n');
}

debugResumes().catch(console.error);
