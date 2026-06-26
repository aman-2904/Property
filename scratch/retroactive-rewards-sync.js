const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wnpjcopndrvvxkmftlgd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InducGpjb3BuZHJ2dnhrbWZ0bGdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM3ODUxMiwiZXhwIjoyMDk1OTU0NTEyfQ.B8XEtajlw3t-YQIwl_qFgUJlyI_8F2EtOyAR9I2uaHY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncAll() {
  console.log("=== Retroactive Reward Eligibility Synchronization ===");

  try {
    // 1. Fetch all profile IDs
    console.log("Fetching profiles...");
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, name');

    if (profErr) throw profErr;
    console.log(`Found ${profiles.length} profiles to process.`);

    // 2. Loop and call check_reward_eligibility RPC for each user
    for (let i = 0; i < profiles.length; i++) {
      const profile = profiles[i];
      console.log(`[${i + 1}/${profiles.length}] Processing agent: ${profile.name || "Unknown"} (ID: ${profile.id})...`);
      const { error: rpcErr } = await supabase.rpc('check_reward_eligibility', { target_user_id: profile.id });
      if (rpcErr) {
        console.error(` ❌ Error processing agent ${profile.name || "Unknown"}: ${rpcErr.message}`);
      } else {
        console.log(`  ✅ Synced successfully.`);
      }
    }

    console.log("\n=== SYNCHRONIZATION COMPLETE! ===");
  } catch (err) {
    console.error("\n❌ Sync failed:", err.message);
  }
}

syncAll();
