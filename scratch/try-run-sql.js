const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const supabaseUrl = 'https://wnpjcopndrvvxkmftlgd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InducGpjb3BuZHJ2dnhrbWZ0bGdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM3ODUxMiwiZXhwIjoyMDk1OTU0NTEyfQ.B8XEtajlw3t-YQIwl_qFgUJlyI_8F2EtOyAR9I2uaHY';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  realtime: {
    transport: ws,
  },
});

async function trySQL() {
  // Let's try executing a basic query via common RPC names
  const rpcs = ['exec_sql', 'execute_sql', 'run_sql', 'sql'];
  for (const rpc of rpcs) {
    console.log(`Trying RPC: ${rpc}...`);
    const { data, error } = await supabase.rpc(rpc, { sql_query: 'SELECT 1 as val;', query: 'SELECT 1 as val;', sql: 'SELECT 1 as val;' });
    if (error) {
      console.log(`RPC ${rpc} failed:`, error.message);
    } else {
      console.log(`RPC ${rpc} succeeded! Data:`, data);
      return;
    }
  }
  console.log("No common SQL RPCs found.");
}

trySQL();

