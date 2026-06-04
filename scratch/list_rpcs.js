const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wnpjcopndrvvxkmftlgd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InducGpjb3BuZHJ2dnhrbWZ0bGdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM3ODUxMiwiZXhwIjoyMDk1OTU0NTEyfQ.B8XEtajlw3t-YQIwl_qFgUJlyI_8F2EtOyAR9I2uaHY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listRPCs() {
  try {
    console.log('Attempting to call inspect_triggers RPC...');
    const { data: data1, error: err1 } = await supabase.rpc('inspect_triggers');
    if (err1) {
      console.log('inspect_triggers RPC failed:', err1.message);
    } else {
      console.log('inspect_triggers RPC succeeded! Data:', data1);
    }

    console.log('Attempting to call list_triggers RPC...');
    const { data: data2, error: err2 } = await supabase.rpc('list_triggers');
    if (err2) {
      console.log('list_triggers RPC failed:', err2.message);
    } else {
      console.log('list_triggers RPC succeeded! Data:', data2);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

listRPCs();
