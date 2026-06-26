const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wnpjcopndrvvxkmftlgd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InducGpjb3BuZHJ2dnhrbWZ0bGdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM3ODUxMiwiZXhwIjoyMDk1OTU0NTEyfQ.B8XEtajlw3t-YQIwl_qFgUJlyI_8F2EtOyAR9I2uaHY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testFetchPending() {
  console.log("=== Testing Nested Embeds (promotion_levels) ===");
  
  const { data, error } = await supabase
    .from("reward_claims")
    .select("*, profiles!user_id(name, email, direct_sales_count, group_sales_count, promotion_levels(title)), achievement_rules(name, reward_type, reward_value)")
    .eq("status", "pending")
    .order("request_date", { ascending: false });

  if (error) {
    console.error("❌ select failed:", error.message);
  } else {
    console.log("✅ select succeeded!");
    console.log("Data:", JSON.stringify(data, null, 2));
  }
}

testFetchPending();
