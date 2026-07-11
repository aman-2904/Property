const fs = require('fs');
const path = require('path');

const envLocalPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const parts = trimmed.split('=');
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      process.env[key] = value;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  const agentId = '542cfe68-8edb-45d6-95c4-12421ddedfee'; // Our referral test user
  const response = await fetch(`${supabaseUrl}/rest/v1/upline_sponsor_path?agent_id=eq.${agentId}&select=sponsor_id,step_distance,sponsor:sponsor_id(name,email,role)`, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    const text = await response.text();
    console.error('Error status:', response.status, text);
    return;
  }
  
  const data = await response.json();
  console.log(data);
}

main();
