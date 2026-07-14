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

const ws = require('ws');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  realtime: {
    transport: ws,
  },
});

async function printAgents() {
  console.log("Fetching profiles...");
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, name, email, role, promotion_level, upline_id, direct_sales_count, group_sales_count');

  if (error) {
    console.error("Error:", error.message);
    return;
  }

  console.table(profiles);
}

printAgents();
