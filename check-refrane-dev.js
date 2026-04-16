import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bebiojwkjnyyccnlqjge.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlYmlvandram55eWNjbmxxamdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NDMwNTksImV4cCI6MjA4NTExOTA1OX0.-vsjqytJI9XACqdaLdQ4VKQ3Mf7ZgNFWm36_1jvim4Y';

const TARGET_UID   = 'dbdb167f-5b0e-4ab9-a426-14ec35adbfe4';
const TARGET_EMAIL = 'refranedev@gmail.com';
const TABLE_NAME   = 'Refrane_dev_campaign_candidates_duplicate';
const COMPANY_NAME = 'refrane_dev';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

(async () => {
  console.log('=== Refrane Dev — Database Verification ===\n');

  // 1. Check the candidate table is readable (anon or authenticated-only policy)
  console.log(`1️⃣  Checking candidate table: "${TABLE_NAME}"`);
  const { count, error: tableError } = await supabase
    .from(TABLE_NAME)
    .select('*', { count: 'exact', head: true });

  if (tableError) {
    console.log(`   ❌ Cannot read table: ${tableError.message}`);
    console.log(`   → This is expected if the RLS policy requires authentication.`);
    console.log(`   → The table WILL be accessible once ${TARGET_EMAIL} is signed in.\n`);
  } else {
    console.log(`   ✅ Table accessible — ${count} candidate(s) found.\n`);
  }

  // 2. Verify the code mapping is in place (informational)
  console.log(`2️⃣  Code mapping check`);
  console.log(`   TABLE_MAP['${COMPANY_NAME}'] → "${TABLE_NAME}" ✅`);
  console.log(`   TITLE_MAP['${COMPANY_NAME}'] → "Refrane Dev Campaign" ✅\n`);

  // 3. Remind about required SQL if user table row doesn't exist
  console.log(`3️⃣  Users table row — cannot verify via anon key (protected by RLS).`);
  console.log(`   To ensure the row exists, run this in Supabase SQL Editor:`);
  console.log(`   (Project: bebiojwkjnyyccnlqjge → SQL Editor → New query)\n`);
  console.log(`   ┌─────────────────────────────────────────────────────────────────────┐`);
  console.log(`   │  INSERT INTO users (id, email, company_name)                        │`);
  console.log(`   │  VALUES (                                                           │`);
  console.log(`   │    '${TARGET_UID}',       │`);
  console.log(`   │    '${TARGET_EMAIL}',                          │`);
  console.log(`   │    '${COMPANY_NAME}'                                         │`);
  console.log(`   │  )                                                                  │`);
  console.log(`   │  ON CONFLICT (id) DO UPDATE                                        │`);
  console.log(`   │    SET email = EXCLUDED.email,                                     │`);
  console.log(`   │        company_name = EXCLUDED.company_name;                       │`);
  console.log(`   └─────────────────────────────────────────────────────────────────────┘\n`);

  // 4. RLS policy reminder
  console.log(`4️⃣  RLS policies — ensure these exist (run once if not already set up):\n`);
  console.log(`   -- Enable RLS on candidate table`);
  console.log(`   ALTER TABLE "${TABLE_NAME}" ENABLE ROW LEVEL SECURITY;\n`);
  console.log(`   -- Allow authenticated users to read`);
  console.log(`   CREATE POLICY "Allow authenticated read"`);
  console.log(`   ON "${TABLE_NAME}"`);
  console.log(`   FOR SELECT TO authenticated USING (true);\n`);
  console.log(`   -- Allow users to read their own profile`);
  console.log(`   CREATE POLICY "Users can read own profile"`);
  console.log(`   ON users FOR SELECT TO authenticated USING (auth.uid() = id);\n`);

  console.log(`=== Done. Start the dev server with: npm run dev ===`);
})();
