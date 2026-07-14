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

async function main() {
  try {
    const res = await fetch(env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/', {
      headers: {
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    const schema = await res.json();
    
    console.log('--- TABLES ---');
    console.log(Object.keys(schema.definitions || {}));
    
    console.log('--- RPC PATHS ---');
    const rpcPaths = Object.keys(schema.paths || {}).filter(p => p.startsWith('/rpc/'));
    console.log(rpcPaths);
  } catch (e) {
    console.error('Error:', e);
  }
}

main();
