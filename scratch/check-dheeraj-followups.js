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
    const staffId = 'be46e95b-18f2-4e3f-a6bd-836311fb0c73';
    
    // 1. Fetch leads for this staff
    const { data: leads } = await supabase.from('customer_leads').select('*').eq('staff_id', staffId);
    console.log('Customer leads for Dheeraj:', leads);

    // 2. Fetch all followups in DB
    const { data: followUps } = await supabase.from('lead_follow_ups').select('*, customer_leads(name, staff_id)');
    console.log('All followups in DB:', followUps);
  } catch (e) {
    console.error('Error:', e);
  }
}

test();
