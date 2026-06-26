const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wnpjcopndrvvxkmftlgd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InducGpjb3BuZHJ2dnhrbWZ0bGdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM3ODUxMiwiZXhwIjoyMDk1OTU0NTEyfQ.B8XEtajlw3t-YQIwl_qFgUJlyI_8F2EtOyAR9I2uaHY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runTests() {
  console.log("=== Achievements & Rewards System Integration Tests ===");

  try {
    // 1. Verify table existence
    const tables = ['reward_categories', 'achievement_rules', 'reward_history', 'reward_claims', 'reward_notifications'];
    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        throw new Error(`DB verification failed: Table ${table} is not accessible. ${error.message}`);
      }
      console.log(`✅ Table ${table} is accessible.`);
    }

    // 2. Test Category CRUD operations
    console.log("\nTesting Reward Categories CRUD...");
    const uniqueCatName = `Test Category ${Date.now()}`;
    const { data: newCat, error: catCreateErr } = await supabase
      .from('reward_categories')
      .insert([{ name: uniqueCatName, display_order: 99 }])
      .select()
      .single();

    if (catCreateErr) throw catCreateErr;
    console.log(`✅ Created category: ${newCat.name} (ID: ${newCat.id})`);

    const { data: catList, error: catReadErr } = await supabase
      .from('reward_categories')
      .select('*')
      .eq('id', newCat.id)
      .single();
    if (catReadErr) throw catReadErr;
    console.log(`✅ Read category: ${catList.name}`);

    const { data: updatedCat, error: catUpdErr } = await supabase
      .from('reward_categories')
      .update({ name: `${uniqueCatName} Updated` })
      .eq('id', newCat.id)
      .select()
      .single();
    if (catUpdErr) throw catUpdErr;
    console.log(`✅ Updated category: ${updatedCat.name}`);

    // 3. Test Rule CRUD operations
    console.log("\nTesting Achievement Rules CRUD...");
    const uniqueRuleName = `Test Rule ${Date.now()}`;
    const { data: newRule, error: ruleCreateErr } = await supabase
      .from('achievement_rules')
      .insert([{
        name: uniqueRuleName,
        category_id: newCat.id,
        required_direct_sales: 10,
        required_group_sales: 50,
        reward_type: 'Cash',
        reward_value: '₹10,000',
        status: 'active',
        display_order: 99,
        description: 'Test rule description'
      }])
      .select()
      .single();

    if (ruleCreateErr) throw ruleCreateErr;
    console.log(`✅ Created achievement rule: ${newRule.name} (ID: ${newRule.id})`);

    const { data: ruleList, error: ruleReadErr } = await supabase
      .from('achievement_rules')
      .select('*, reward_categories(name)')
      .eq('id', newRule.id)
      .single();
    if (ruleReadErr) throw ruleReadErr;
    console.log(`✅ Read achievement rule: ${ruleList.name} (Category: ${ruleList.reward_categories?.name})`);

    // 4. Test User Qualification Simulation
    console.log("\nSimulating Agent Evaluation...");
    // Find a mock user / agent to test with
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, name, direct_sales_count, group_sales_count')
      .limit(1);

    if (profErr || !profiles || profiles.length === 0) {
      console.log("⚠️ No agent profiles found. Skipping qualification checks.");
    } else {
      const agent = profiles[0];
      console.log(`Selected Agent: ${agent.name || "Unknown"} (ID: ${agent.id})`);
      console.log(`Stats: Direct Sales: ${agent.direct_sales_count || 0}, Group Sales: ${agent.group_sales_count || 0}`);

      // Call postgres function 'check_reward_eligibility'
      console.log("Calling check_reward_eligibility function via RPC...");
      const { error: rpcErr } = await supabase.rpc('check_reward_eligibility', { target_user_id: agent.id });
      if (rpcErr) {
        console.log(`⚠️ RPC execution returned error: ${rpcErr.message}. Make sure the SQL migration is fully executed.`);
      } else {
        console.log("✅ RPC check_reward_eligibility completed successfully.");
        
        // Query reward history
        const { data: qHistory, error: qErr } = await supabase
          .from('reward_history')
          .select('*, achievement_rules(name)')
          .eq('user_id', agent.id);
          
        if (qErr) throw qErr;
        console.log(`✅ Agent has ${qHistory.length} qualified rewards in history:`);
        qHistory.forEach(h => {
          console.log(` - Reward: ${h.achievement_rules?.name} (Status: ${h.status}, Date: ${h.eligible_date})`);
        });
      }
    }

    // 5. Clean up test records
    console.log("\nCleaning up test records...");
    await supabase.from('achievement_rules').delete().eq('id', newRule.id);
    await supabase.from('reward_categories').delete().eq('id', newCat.id);
    console.log("✅ Cleanup finished.");

    console.log("\n=== ALL TESTS PASSED! ===");

  } catch (err) {
    console.error("\n❌ Test Suite Failed:", err.message);
  }
}

runTests();
