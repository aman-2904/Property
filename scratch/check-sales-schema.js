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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSchema() {
  console.log("Checking sales table...");
  const { data: sales, error: salesErr } = await supabase.from('sales').select('*').limit(1);
  if (salesErr) {
    console.error("Sales error:", salesErr.message);
  } else {
    console.log("Sales columns:", sales.length > 0 ? Object.keys(sales[0]) : "Empty table, but exists");
  }

  console.log("Checking properties table...");
  const { data: props, error: propsErr } = await supabase.from('properties').select('*').limit(1);
  if (propsErr) {
    console.error("Properties error:", propsErr.message);
  } else {
    console.log("Properties columns:", props.length > 0 ? Object.keys(props[0]) : "Empty table, but exists");
  }
}

checkSchema();
