const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wnpjcopndrvvxkmftlgd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InducGpjb3BuZHJ2dnhrbWZ0bGdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM3ODUxMiwiZXhwIjoyMDk1OTU0NTEyfQ.B8XEtajlw3t-YQIwl_qFgUJlyI_8F2EtOyAR9I2uaHY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  console.log("Checking promotion_levels...");
  const { data: plData, error: plErr } = await supabase.from('promotion_levels').select('*').limit(5);
  if (plErr) {
    console.error('Error fetching promotion_levels:', plErr.message);
  } else {
    console.log('promotion_levels count:', plData.length);
    console.log('promotion_levels columns:', plData.length > 0 ? Object.keys(plData[0]) : 'None');
    console.log('promotion_levels sample:', plData);
  }

  console.log("Checking promotions...");
  const { data: pData, error: pErr } = await supabase.from('promotions').select('*').limit(5);
  if (pErr) {
    console.error('Error fetching promotions:', pErr.message);
  } else {
    console.log('promotions count:', pData.length);
    console.log('promotions columns:', pData.length > 0 ? Object.keys(pData[0]) : 'None');
    console.log('promotions sample:', pData);
  }

  // Let's check other tables that might exist
  const checkTables = ['promotion_history', 'promotion_wallet', 'promotion_wallet_transactions', 'wallets'];
  for (const table of checkTables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`Table ${table} does not exist or error:`, error.message);
    } else {
      console.log(`Table ${table} exists! Columns:`, data.length > 0 ? Object.keys(data[0]) : 'Empty');
    }
  }
}

check();
