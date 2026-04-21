import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bebiojwkjnyyccnlqjge.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlYmlvandram55eWNjbmxxamdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NDMwNTksImV4cCI6MjA4NTExOTA1OX0.-vsjqytJI9XACqdaLdQ4VKQ3Mf7ZgNFWm36_1jvim4Y';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function setupUserProfile() {
  try {
    console.log('Checking for existing users...');
    const { data: existingUsers, error: queryError } = await supabase
      .from('users')
      .select('*');

    if (queryError) {
      console.error('Error querying users:', queryError);
      return;
    }

    console.log('Existing users:', existingUsers);

    // Check if bella_vida already has a profile
    const bellaVidaProfile = existingUsers?.find(u => u.company_name === 'bella_vida');

    if (bellaVidaProfile) {
      console.log('bella_vida profile already exists:', bellaVidaProfile);
      return;
    }

    // Since we're using anon key, we need to know the user ID
    // Let's check the current session
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('Not authenticated. You need to be signed in to set up the profile.');
      console.log('Sign in as bella vida first in the browser, then run this script.');
      return;
    }

    console.log('Current user:', user.id, user.email);

    // Now insert the user profile
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: user.id,
        email: user.email,
        company_name: 'bella_vida'
      })
      .select();

    if (error) {
      console.error('Error creating user profile:', error);
      return;
    }

    console.log('User profile created successfully:', data);
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

setupUserProfile();
