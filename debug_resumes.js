import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bebiojwkjnyyccnlqjge.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlYmlvandram55eWNjbmxxamdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NDMwNTksImV4cCI6MjA4NTExOTA1OX0.-vsjqytJI9XACqdaLdQ4VKQ3Mf7ZgNFWm36_1jvim4Y';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function debugResumes() {
  console.log('\n=== RESUME DEBUGGING REPORT ===\n');

  // 0. Check available tables
  console.log('0. CHECKING AVAILABLE TABLES...\n');
  const { data: tables, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public');

  if (tablesError) {
    console.log('⚠️  Could not query information_schema. Trying direct query...');
  } else {
    console.log(`Found tables: ${tables?.map(t => t.table_name).join(', ') || 'none'}\n`);
  }

  // 1. Check database records
  console.log('1. CHECKING DATABASE RECORDS...\n');
  const { data: candidates, error: dbError } = await supabase
    .from('campaign_candidates')
    .select('id, full_name, resume_url')
    .limit(10);

  if (dbError) {
    console.error('❌ DB Error with candidate_screenings:', dbError.message);

    // Try alternative table names
    console.log('\n  Trying alternative table names...');
    const alternatives = ['campaign_candidates', 'candidates', 'candidate_profiles', 'applications', 'screenings'];

    for (const tableName of alternatives) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (!error) {
        console.log(`  ✓ Found table: "${tableName}"`);
        if (tableName === 'campaign_candidates') {
          const { data: cc } = await supabase.from('campaign_candidates').select('id, full_name, resume_url').limit(5);
          if (cc) {
            console.log(`    Sample records:`);
            cc.forEach((c) => {
              console.log(`      • ${c.full_name} - resume_url: ${c.resume_url || 'NULL'}`);
            });
          }
        }
      }
    }
  } else {
    console.log(`✓ Found ${candidates?.length || 0} candidates:\n`);
    candidates?.forEach((c) => {
      console.log(`  • ${c.full_name}`);
      console.log(`    resume_url: ${c.resume_url || 'NULL'}`);
    });
  }

  // 2. Check what storage buckets exist
  console.log('\n2. CHECKING AVAILABLE STORAGE BUCKETS...\n');
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

  if (bucketsError) {
    console.error('❌ Error listing buckets:', bucketsError);
  } else {
    console.log(`✓ Found ${buckets?.length || 0} buckets:\n`);
    buckets?.forEach((b) => {
      console.log(`  • ${b.name}`);
    });
  }

  // 2b. Check what's actually in the resumes bucket
  console.log('\n2b. CHECKING STORAGE BUCKET ("resumes")...\n');
  const { data: files, error: storageError } = await supabase.storage
    .from('resumes')
    .list('', { limit: 20 });

  if (storageError) {
    console.error('❌ Storage Error:', storageError);
  } else {
    console.log(`✓ Found ${files?.length || 0} files in bucket:\n`);
    files?.forEach((f) => {
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
      console.log(`  URL works: yes`);
    }
  }

  console.log('\n=== END REPORT ===\n');
  process.exit(0);
}

debugResumes().catch(err => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
