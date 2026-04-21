import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bebiojwkjnyyccnlqjge.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlYmlvandram55eWNjbmxxamdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NDMwNTksImV4cCI6MjA4NTExOTA1OX0.-vsjqytJI9XACqdaLdQ4VKQ3Mf7ZgNFWm36_1jvim4Y'
);

(async () => {
  console.log('=== CHECKING DATA ACCESS ===\n');

  // Try to list files with different approaches
  console.log('1️⃣  Listing resumes bucket (limit 100):');
  const { data: files1, error: err1 } = await supabase.storage
    .from('resumes')
    .list('', { limit: 100 });

  if (err1) {
    console.log(`   ❌ Error: ${err1.message}`);
  } else {
    console.log(`   ✓ Got ${files1?.length || 0} files`);
    if (files1 && files1.length > 0) {
      files1.slice(0, 5).forEach(f => console.log(`     - ${f.name}`));
      if (files1.length > 5) console.log(`     ... and ${files1.length - 5} more`);
    }
  }

  console.log('\n2️⃣  Checking campaign_candidates table:');
  const { data: candidates, error: err2, count } = await supabase
    .from('campaign_candidates')
    .select('*', { count: 'exact' })
    .limit(5);

  if (err2) {
    console.log(`   ❌ Error: ${err2.message}`);
  } else {
    console.log(`   ✓ Total candidates: ${count || 0}`);
    if (candidates && candidates.length > 0) {
      console.log(`   Sample candidate:`);
      const c = candidates[0];
      console.log(`     ID: ${c.id}`);
      console.log(`     Name: ${c.full_name}`);
      console.log(`     Resume URL: ${c.resume_url || '(null)'}`);
      console.log(`     Columns: ${Object.keys(c).join(', ')}`);
    }
  }

  // If both work, list all files and candidates
  if (files1 && files1.length > 0 && candidates && candidates.length > 0) {
    console.log('\n3️⃣  Exporting all data for matching:');
    
    const { data: allCandidates } = await supabase
      .from('campaign_candidates')
      .select('id, full_name, resume_url');
    
    const { data: allFiles } = await supabase.storage
      .from('resumes')
      .list('', { limit: 1000 });

    console.log(`\n📊 Summary:`);
    console.log(`   Files in storage: ${allFiles?.length || 0}`);
    console.log(`   Candidates in DB: ${allCandidates?.length || 0}`);
    console.log(`   With resume_url: ${allCandidates?.filter(c => c.resume_url).length || 0}`);
    console.log(`   Missing resume_url: ${allCandidates?.filter(c => !c.resume_url).length || 0}`);

    // Save to file for analysis
    const exportData = {
      files: allFiles,
      candidates: allCandidates
    };
    
    const fs = await import('fs').then(m => m.promises);
    await fs.writeFile('data-export.json', JSON.stringify(exportData, null, 2));
    console.log('\n✓ Exported to data-export.json');
  }
})();
