import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bebiojwkjnyyccnlqjge.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlYmlvandram55eWNjbmxxamdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NDMwNTksImV4cCI6MjA4NTExOTA1OX0.-vsjqytJI9XACqdaLdQ4VKQ3Mf7ZgNFWm36_1jvim4Y'
);

async function check() {
  // Try the exact table name used in code
  const { data, error, count } = await supabase
    .from('Bella Vida campaign_candidates_duplicate')
    .select('*', { count: 'exact' });

  console.log('Table: Bella Vida campaign_candidates_duplicate');
  console.log('Error:', error);
  console.log('Count:', count);
  console.log('Data:', JSON.stringify(data, null, 2));

  // Also list all columns if data exists
  if (data && data.length > 0) {
    console.log('\nColumns:', Object.keys(data[0]));
  }
}

check();
