import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bebiojwkjnyyccnlqjge.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlYmlvandram55eWNjbmxxamdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NDMwNTksImV4cCI6MjA4NTExOTA1OX0.-vsjqytJI9XACqdaLdQ4VKQ3Mf7ZgNFWm36_1jvim4Y'
);

(async () => {
  console.log('📋 RESUME MATCHING ANALYSIS\n');

  // Get all files in storage
  console.log('Fetching files from storage bucket...');
  const { data: storageFiles, error: storageError } = await supabase.storage
    .from('resumes')
    .list('', { limit: 1000 });

  if (storageError) {
    console.error('❌ Storage error:', storageError.message);
    return;
  }

  console.log(`✓ Found ${storageFiles?.length || 0} files in storage\n`);

  // Get all candidates
  console.log('Fetching candidates from database...');
  const { data: candidates, error: candidateError } = await supabase
    .from('campaign_candidates')
    .select('id, full_name, resume_url');

  if (candidateError) {
    console.error('❌ Database error:', candidateError.message);
    return;
  }

  console.log(`✓ Found ${candidates?.length || 0} candidates\n`);

  if (!storageFiles || !candidates) {
    console.log('No data to process');
    return;
  }

  // Analyze the gap
  const withResume = candidates.filter(c => c.resume_url && c.resume_url.trim());
  const withoutResume = candidates.filter(c => !c.resume_url || !c.resume_url.trim());

  console.log(`📊 STATUS:`);
  console.log(`   With resume_url: ${withResume.length}`);
  console.log(`   Without resume_url: ${withoutResume.length}\n`);

  if (withoutResume.length === 0) {
    console.log('✓ All candidates have resume_url populated!');
    return;
  }

  // Try to match files to candidates without resumes
  console.log(`🔍 MATCHING ${withoutResume.length} MISSING RESUMES:\n`);

  const fileNames = storageFiles.map(f => f.name);
  const matches = [];
  const unmatched = [];

  withoutResume.forEach(candidate => {
    const fullName = candidate.full_name.toLowerCase().trim();
    const nameParts = fullName.split(/\s+/);
    
    // Try different matching strategies
    let foundFile = null;

    // Strategy 1: Exact name match (firstname_lastname.pdf)
    const exactMatch = fileNames.find(f => 
      f.toLowerCase() === `${nameParts.join('_')}.pdf` ||
      f.toLowerCase() === `${nameParts.join('_')}.PDF`
    );
    if (exactMatch) foundFile = exactMatch;

    // Strategy 2: First and last name in filename
    if (!foundFile && nameParts.length >= 2) {
      const firstLast = `${nameParts[0]}_${nameParts[nameParts.length - 1]}`;
      const fuzzyMatch = fileNames.find(f => 
        f.toLowerCase().includes(firstLast.toLowerCase())
      );
      if (fuzzyMatch) foundFile = fuzzyMatch;
    }

    // Strategy 3: First name in filename
    if (!foundFile && nameParts.length > 0) {
      const fuzzyFirst = fileNames.find(f => 
        f.toLowerCase().includes(nameParts[0].toLowerCase())
      );
      if (fuzzyFirst) foundFile = fuzzyFirst;
    }

    if (foundFile) {
      matches.push({
        candidateId: candidate.id,
        candidateName: candidate.full_name,
        fileName: foundFile,
        confidence: exactMatch ? 'HIGH' : 'MEDIUM'
      });
      console.log(`✓ ${candidate.full_name} → ${foundFile}`);
    } else {
      unmatched.push(candidate.full_name);
      console.log(`✗ ${candidate.full_name} (no match found)`);
    }
  });

  console.log(`\n📊 SUMMARY:`);
  console.log(`   Matched: ${matches.length}`);
  console.log(`   Unmatched: ${unmatched.length}`);

  if (matches.length > 0) {
    console.log(`\n✅ Ready to update ${matches.length} candidates`);
    console.log('\nMatches found (in JSON format for update):');
    console.log(JSON.stringify(matches, null, 2));
  }

  if (unmatched.length > 0) {
    console.log(`\n⚠️  Could not match (${unmatched.length}):`);
    unmatched.forEach(name => console.log(`   - ${name}`));
    console.log('\nCheck storage bucket manually for these files');
  }
})();
