const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wnpjcopndrvvxkmftlgd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InducGpjb3BuZHJ2dnhrbWZ0bGdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM3ODUxMiwiZXhwIjoyMDk1OTU0NTEyfQ.B8XEtajlw3t-YQIwl_qFgUJlyI_8F2EtOyAR9I2uaHY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyAgent() {
  console.log("=== Verification of Qualified Agent Rewards ===");

  try {
    // 1. Find the agent matching the screenshot stats (Direct Sales = 12, Group Sales = 8)
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, name, direct_sales_count, group_sales_count');

    if (profErr) throw profErr;

    const matchedAgent = profiles.find(p => p.direct_sales_count === 12 && p.group_sales_count === 8);
    if (!matchedAgent) {
      console.log("⚠️ Could not find an agent with exactly 12 direct sales and 8 group sales.");
      return;
    }

    console.log(`Matched Agent: ${matchedAgent.name} (ID: ${matchedAgent.id})`);
    console.log(`Stats: Direct: ${matchedAgent.direct_sales_count}, Group: ${matchedAgent.group_sales_count}`);

    // 2. Query reward history for this agent
    const { data: history, error: histErr } = await supabase
      .from('reward_history')
      .select('*, achievement_rules(name, reward_value, status)')
      .eq('user_id', matchedAgent.id);

    if (histErr) throw histErr;

    console.log(`\nQualified Rewards Count: ${history.length}`);
    history.forEach((h, index) => {
      console.log(`[${index + 1}] Reward: ${h.achievement_rules?.name} - Value: ${h.achievement_rules?.reward_value} (Status: ${h.status}, Eligible Date: ${h.eligible_date})`);
    });

  } catch (err) {
    console.error("❌ Verification failed:", err.message);
  }
}

verifyAgent();
