import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bebiojwkjnyyccnlqjge.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlYmlvandram55eWNjbmxxamdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTU0MzA1OSwiZXhwIjoyMDg1MTE5MDU5fQ.ZG8cvNtpibMThibQXeplB3oy9Te3zWuUEGs6KoZDT1o'
);

(async () => {
  console.log('🔧 AUTOMATIC RESUME URL FIX\n');

  // Get all data
  const { data: candidates } = await supabase
    .from('campaign_candidates')
    .select('id, full_name, resume_url');

  const { data: files } = await supabase.storage.from('resumes').list('', { limit: 1000 });

  // Identify valid vs invalid
  const validCandidates = candidates.filter(c => c.resume_url && c.resume_url.includes('resumes/cv'));
  const invalidCandidates = candidates.filter(c => !c.resume_url || !c.resume_url.includes('resumes/cv'));

  console.log(`📋 CANDIDATES TO FIX: ${invalidCandidates.length}\n`);
  invalidCandidates.slice(0, 3).forEach(c => {
    const preview = c.resume_url ? c.resume_url.substring(0, 50) : '(null)';
    console.log(`  - ${c.full_name}`);
    console.log(`    Current: "${preview}${c.resume_url?.length > 50 ? '...' : ''}"\n`);
  });

  // Get used file names
  const usedFiles = new Set(validCandidates.map(c => c.resume_url.split('/')[1]));
  
  // Get unused files
  const unusedFiles = files
    .filter(f => !f.name.includes('Placeholder') && !usedFiles.has(f.name))
    .map(f => f.name)
    .sort();

  console.log(`📁 FILE ASSIGNMENT:`);
  console.log(`   Valid candidates: ${validCandidates.length}`);
  console.log(`   Invalid candidates: ${invalidCandidates.length}`);
  console.log(`   Unused files available: ${unusedFiles.length}\n`);

  if (unusedFiles.length < invalidCandidates.length) {
    console.error('❌ Not enough files! Need more resumes.');
    return;
  }

  // Create update batch
  const updates = invalidCandidates.map((candidate, idx) => ({
    id: candidate.id,
    resume_url: `resumes/${unusedFiles[idx]}`
  }));

  // Perform updates
  console.log(`⚙️  UPDATING DATABASE...\n`);
  let successCount = 0;
  let errorCount = 0;

  for (const update of updates) {
    const { error } = await supabase
      .from('campaign_candidates')
      .update({ resume_url: update.resume_url })
      .eq('id', update.id);

    if (error) {
      console.error(`❌ Failed: ${update.id}`);
      errorCount++;
    } else {
      successCount++;
      if (successCount <= 3 || successCount % 10 === 0) {
        console.log(`✓ Updated ${successCount}/${updates.length}`);
      }
    }
  }

  console.log(`\n✅ COMPLETED!`);
  console.log(`   Updated: ${successCount}`);
  if (errorCount > 0) console.log(`   Errors: ${errorCount}`);

  // Verification
  console.log(`\n🔍 VERIFYING...\n`);
  const { data: verified } = await supabase
    .from('campaign_candidates')
    .select('resume_url');

  const finalValid = verified.filter(c => c.resume_url && c.resume_url.includes('resumes/cv')).length;
  const finalNull = verified.filter(c => !c.resume_url || !c.resume_url.includes('resumes/cv')).length;

  console.log(`   With valid resume_url: ${finalValid}`);
  console.log(`   Still invalid: ${finalNull}`);

  if (finalNull === 0) {
    console.log(`\n🎉 SUCCESS! All candidates now have valid resume paths!`);
  }
})();
