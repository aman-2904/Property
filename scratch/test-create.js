const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    env[match[1]] = (match[2] || '').replace(/['"]/g, '').trim();
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function testCreate() {
  const testEmail = `test_dummy_${Date.now()}@example.com`;
  console.log("Creating auth user:", testEmail);
  const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: 'password123',
    email_confirm: true,
    user_metadata: { name: 'Dummy Test User' }
  });

  if (authErr) {
    console.error("Auth creation failed:", authErr.message);
    return;
  }

  const userId = authUser.user.id;
  console.log("Auth user created with ID:", userId);

  // Check if profile exists
  console.log("Checking if profile row was automatically created...");
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileErr) {
    console.log("Profile not created automatically. Attempting manual insert...");
    const { data: newProfile, error: insertErr } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: testEmail,
        name: 'Dummy Test User',
        role: 'AGENT'
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Manual insert failed:", insertErr.message);
    } else {
      console.log("Manual insert succeeded! Profile:", newProfile);
    }
  } else {
    console.log("Profile created automatically! Profile:", profile);
  }

  // Cleanup
  console.log("Cleaning up auth user...");
  await supabase.auth.admin.deleteUser(userId);
  console.log("Done cleanup.");
}

testCreate();
