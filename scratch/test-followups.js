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
    const { data: profiles } = await supabase.from('profiles').select('id, name').eq('role', 'STAFF');
    console.log('Staff members:', profiles);
    if (!profiles || profiles.length === 0) {
      console.log('No staff members found.');
      return;
    }

    const staffId = profiles[0].id;
    console.log('Testing with staff member:', profiles[0].name, '(', staffId, ')');

    const { data, error } = await supabase
      .from("lead_follow_ups")
      .select("*, customer_leads!inner(id, name, phone, staff_id)")
      .eq("status", "Pending")
      .eq("customer_leads.staff_id", staffId);

    if (error) {
      console.error('Error fetching follow ups:', error);
    } else {
      console.log('Fetched follow ups:', data);
    }
  } catch (e) {
    console.error('Unexpected error:', e);
  }
}

test();
