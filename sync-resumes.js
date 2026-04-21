import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bebiojwkjnyyccnlqjge.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlYmlvandram55eWNjbmxxamdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTU0MzA1OSwiZXhwIjoyMDg1MTE5MDU5fQ.ZG8cvNtpibMThibQXeplB3oy9Te3zWuUEGs6KoZDT1o'
);

(async () => {
  console.log('🔄 RESUME SYNC - RETRIEVING DATA\n');

  // Get all files
  console.log('📁 Fetching resume files...');
  const { data: files } = await supabase.storage
    .from('resumes')
    .list('', { limit: 1000 });

  console.log(`✓ Found ${files?.length || 0} resume files\n`);
  if (files && files.length > 0) {
    console.log('Sample files:');
    files.slice(0, 5).forEach(f => console.log(`  - ${f.name}`));
    if (files.length > 5) console.log(`  ... and ${files.length - 5} more\n`);
  }

  // Get all candidates
  console.log('👥 Fetching candidates...');
  const { data: candidates, count } = await supabase
    .from('campaign_candidates')
    .select('*', { count: 'exact' });

  console.log(`✓ Found ${count || candidates?.length || 0} candidates\n`);

  if (candidates && candidates.length > 0) {
    console.log('Sample candidates:');
    candidates.slice(0, 3).forEach(c => {
      console.log(`  - ${c.full_name}`);
      console.log(`    Resume URL: ${c.resume_url || '(missing)'}`);
    });
    console.log();
  }

  // Analysis
  const withResume = candidates?.filter(c => c.resume_url && c.resume_url.trim()).length || 0;
  const withoutResume = (candidates?.length || 0) - withResume;

  console.log('📊 STATUS:');
  console.log(`   Total candidates: ${candidates?.length || 0}`);
  console.log(`   With resume_url: ${withResume}`);
  console.log(`   Missing resume_url: ${withoutResume}`);
  console.log(`   Files in storage: ${files?.length || 0}`);

  // Save raw data for manual review
  if (files && candidates) {
    const fs = await import('fs').then(m => m.promises);
    
    const exportData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalCandidates: candidates.length,
        withResume,
        withoutResume,
        filesInStorage: files.length
      },
      files: files.map(f => f.name),
      candidates: candidates.map(c => ({
        id: c.id,
        full_name: c.full_name,
        email: c.email,
        resume_url: c.resume_url
      }))
    };

    await fs.writeFile('sync-data.json', JSON.stringify(exportData, null, 2));
    console.log('\n✓ Data exported to sync-data.json');
  }
})();
