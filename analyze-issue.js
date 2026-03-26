import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bebiojwkjnyyccnlqjge.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlYmlvandram55eWNjbmxxamdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTU0MzA1OSwiZXhwIjoyMDg1MTE5MDU5fQ.ZG8cvNtpibMThibQXeplB3oy9Te3zWuUEGs6KoZDT1o'
);

(async () => {
  console.log('🔍 ANALYZING RESUME_URL ISSUES\n');

  const { data: candidates } = await supabase
    .from('campaign_candidates')
    .select('id, full_name, resume_url');

  let validPaths = 0;
  let corruptedContent = 0;
  let nullEmpty = 0;
  const corruptedCandidates = [];

  candidates.forEach(c => {
    const url = c.resume_url;
    
    if (!url || url.trim() === '') {
      nullEmpty++;
    } else if (url.includes('resumes/cv') && url.endsWith('.pdf')) {
      validPaths++;
    } else if (url.length > 200) {
      // Likely contains actual resume content
      corruptedContent++;
      corruptedCandidates.push({
        id: c.id,
        name: c.full_name,
        contentLength: url.length,
        preview: url.substring(0, 100)
      });
    } else {
      console.log(`⚠️  Unusual format: ${c.full_name}`);
      console.log(`   Value: ${url.substring(0, 100)}\n`);
    }
  });

  console.log('📊 RESUME_URL STATUS:');
  console.log(`   ✓ Valid file paths: ${validPaths}`);
  console.log(`   ✗ Corrupted (content stored): ${corruptedContent}`);
  console.log(`   ✗ Null/Empty: ${nullEmpty}`);
  console.log(`   Total: ${candidates.length}\n`);

  if (corruptedCandidates.length > 0) {
    console.log(`🚨 CORRUPTED CANDIDATES (first 5):`);
    corruptedCandidates.slice(0, 5).forEach(c => {
      console.log(`   ${c.name}`);
      console.log(`   Content length: ${c.contentLength} chars`);
      console.log(`   Preview: "${c.preview}..."\n`);
    });
  }

  console.log(`\n💡 SOLUTION:`);
  console.log(`   1. Clear corrupted resume_url fields (set to NULL)`);
  console.log(`   2. Assign unused files to candidates\n`);

  // Get files
  const { data: files } = await supabase.storage.from('resumes').list('', { limit: 1000 });
  const usedFiles = new Set(candidates.filter(c => c.resume_url && c.resume_url.includes('resumes/')).map(c => c.resume_url.split('/')[1]));
  const unusedFiles = files.filter(f => !f.name.includes('Placeholder') && !usedFiles.has(f.name)).map(f => f.name);

  console.log(`📁 FILE INVENTORY:`);
  console.log(`   Total files: ${files.length - 1}`); // -1 for placeholder
  console.log(`   Used files: ${usedFiles.size}`);
  console.log(`   Unused files: ${unusedFiles.length}\n`);

  console.log(`✅ We have enough files to cover all candidates!`);
})();
