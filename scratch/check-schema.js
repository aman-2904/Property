const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wnpjcopndrvvxkmftlgd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InducGpjb3BuZHJ2dnhrbWZ0bGdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM3ODUxMiwiZXhwIjoyMDk1OTU0NTEyfQ.B8XEtajlw3t-YQIwl_qFgUJlyI_8F2EtOyAR9I2uaHY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching profiles:', error);
  } else {
    console.log('Profiles table columns:', data.length > 0 ? Object.keys(data[0]) : 'No rows found');
  }

  const { data: withdrawals, error: wError } = await supabase
    .from('withdrawals')
    .select('*')
    .limit(1);

  if (wError) {
    console.error('Error fetching withdrawals:', wError);
  } else {
    console.log('Withdrawals table columns:', withdrawals.length > 0 ? Object.keys(withdrawals[0]) : 'No rows found');
  }
}

main();
