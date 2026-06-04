const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wnpjcopndrvvxkmftlgd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InducGpjb3BuZHJ2dnhrbWZ0bGdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM3ODUxMiwiZXhwIjoyMDk1OTU0NTEyfQ.B8XEtajlw3t-YQIwl_qFgUJlyI_8F2EtOyAR9I2uaHY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testTable() {
  try {
    console.log('Testing if sale_payments table exists...');
    const { data, error } = await supabase
      .from('sale_payments')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error selecting from sale_payments:', error.message, error);
    } else {
      console.log('Successfully selected from sale_payments! Data:', data);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testTable();
