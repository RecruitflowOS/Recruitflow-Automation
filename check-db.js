import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bebiojwkjnyyccnlqjge.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlYmlvandram55eWNjbmxxamdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NDMwNTksImV4cCI6MjA4NTExOTA1OX0.-vsjqytJI9XACqdaLdQ4VKQ3Mf7ZgNFWm36_1jvim4Y'
);

(async () => {
  console.log('Checking database access...\n');

  // Try to get count
  const { count: candidateCount, error: countError } = await supabase
    .from('campaign_candidates')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.log('❌ Error querying count:', countError.message);
  } else {
    console.log(`✓ campaign_candidates table has ${candidateCount} records`);
  }

  // Try to fetch one record
  const { data, error } = await supabase
    .from('campaign_candidates')
    .select('*')
    .limit(1);

  if (error) {
    console.log('❌ Error fetching records:', error.message);
  } else if (!data || data.length === 0) {
    console.log('⚠ Table exists but is empty');
  } else {
    console.log('\n✓ Sample record:');
    console.log(JSON.stringify(data[0], null, 2));
  }
})();
