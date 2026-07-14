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

const ws = require('ws');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  realtime: {
    transport: ws,
  }
});

async function test() {
  try {
    const staffId = '21b04342-d902-4054-b0fa-b93442bf6394'; // Mr. Staff
    const { data: followUps, error } = await supabase
      .from("lead_follow_ups")
      .select("*, customer_leads!inner(id, name, phone, staff_id)")
      .eq("status", "Pending")
      .eq("customer_leads.staff_id", staffId);

    if (error) {
      console.log('Error:', error);
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    console.log('todayStr:', todayStr);
    
    const overdueFollowUps = followUps.filter(f => f.follow_up_date < todayStr);
    const todaysFollowUps = followUps.filter(f => f.follow_up_date === todayStr);
    const futureFollowUps = followUps.filter(f => f.follow_up_date > todayStr);

    console.log('overdueFollowUps length:', overdueFollowUps.length);
    console.log('todaysFollowUps length:', todaysFollowUps.length);
    console.log('futureFollowUps length:', futureFollowUps.length);
  } catch (e) {
    console.error('Error:', e);
  }
}

test();
