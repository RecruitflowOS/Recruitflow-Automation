import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bebiojwkjnyyccnlqjge.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlYmlvandram55eWNjbmxxamdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NDMwNTksImV4cCI6MjA4NTExOTA1OX0.-vsjqytJI9XACqdaLdQ4VKQ3Mf7ZgNFWm36_1jvim4Y'
);

(async () => {
  console.log('Listing all buckets and their contents...\n');

  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

  if (bucketsError) {
    console.error('❌ Error listing buckets:', bucketsError.message);
    return;
  }

  console.log(`Found ${buckets.length} buckets:\n`);

  for (const bucket of buckets) {
    console.log(`📦 ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
    
    const { data: files, error } = await supabase.storage
      .from(bucket.name)
      .list('', { limit: 100 });

    if (error) {
      console.log(`   ❌ Cannot access: ${error.message}`);
    } else {
      console.log(`   Files: ${files?.length || 0}`);
      files?.slice(0, 5).forEach(f => {
        console.log(`     - ${f.name}`);
      });
      if (files && files.length > 5) {
        console.log(`     ... and ${files.length - 5} more`);
      }
    }
    console.log();
  }
})();
