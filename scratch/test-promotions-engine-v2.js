const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    env[key] = value.trim();
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function runTests() {
  console.log("=== STARTING PROMOTIONS ENGINE V2 TESTS ===");
  try {
    // 1. Verify connection and table structures
    const { data: levels, error: levelsErr } = await supabase
      .from('promotion_levels')
      .select('*')
      .order('level', { ascending: true });

    if (levelsErr) {
      console.error("❌ Error fetching promotion levels. Ensure migration has been executed in Supabase SQL editor:", levelsErr.message);
      return;
    }
    console.log("✅ Promotion Levels loaded successfully. Count:", levels.length);
    console.log(levels.map(l => `Level ${l.level}: ${l.title} (Incentive: ₹${l.personal_sale_incentive}, Prev Level: ${l.required_prev_promotion_level})`));

    // 2. Fetch some agents to inspect
    const { data: profiles, error: profilesErr } = await supabase
      .from('profiles')
      .select('id, name, email, promotion_level, upline_id, direct_sales_count, group_sales_count')
      .limit(5);

    if (profilesErr) {
      console.error("❌ Error fetching profiles:", profilesErr.message);
      return;
    }
    console.log(`✅ Loaded ${profiles.length} profiles for reference.`);

    // 3. Verify wallets exist
    const { data: wallets, error: walletsErr } = await supabase
      .from('promotion_wallet')
      .select('*')
      .limit(5);

    if (walletsErr) {
      console.error("❌ Error fetching promotion_wallet. Ensure migration has been run:", walletsErr.message);
      return;
    }
    console.log(`✅ Promotion Wallets loaded successfully. Count: ${wallets.length}`);

    // Choose a profile to do a simulated run
    const testAgent = profiles.find(p => p.name !== 'Admin' && p.email !== 'admin@mlm.com') || profiles[0];
    if (!testAgent) {
      console.log("⚠️ No agents found to test promotion updates.");
      return;
    }

    console.log(`Testing with Agent: ${testAgent.name} (${testAgent.id})`);
    console.log(`Current level: ${testAgent.promotion_level}, Direct Sales: ${testAgent.direct_sales_count}, Group Sales: ${testAgent.group_sales_count}`);

    // Check promotion progress server action logic (we can mock the parameters or test the DB RPC)
    console.log("\n1. Testing leg checks recursion...");
    const { data: network, error: networkErr } = await supabase.rpc('get_downline_network', { root_id: testAgent.id });
    if (networkErr) {
      console.error("❌ Error running get_downline_network RPC:", networkErr.message);
    } else {
      console.log(`✅ get_downline_network RPC succeeded. Found downline members: ${network.length}`);
    }

    console.log("\n2. Checking wallet transactions status...");
    const { data: txs, error: txsErr } = await supabase
      .from('promotion_wallet_transactions')
      .select('*')
      .eq('user_id', testAgent.id)
      .limit(5);

    if (txsErr) {
      console.error("❌ Error querying promotion_wallet_transactions:", txsErr.message);
    } else {
      console.log(`✅ promotion_wallet_transactions count for agent: ${txs.length}`);
    }

    console.log("\n=== TESTS COMPLETED ===");
  } catch (err) {
    console.error("Unexpected error during test execution:", err);
  }
}

runTests();
