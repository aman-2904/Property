const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wnpjcopndrvvxkmftlgd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InducGpjb3BuZHJ2dnhrbWZ0bGdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM3ODUxMiwiZXhwIjoyMDk1OTU0NTEyfQ.B8XEtajlw3t-YQIwl_qFgUJlyI_8F2EtOyAR9I2uaHY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  try {
    const res = await fetch(supabaseUrl + '/rest/v1/', {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      }
    });
    const schema = await res.json();
    
    // Look at definitions
    if (schema.definitions && schema.definitions.profiles) {
      console.log('Profiles columns:', Object.keys(schema.definitions.profiles.properties));
    } else {
      console.log('Profiles definitions not found.');
    }
  } catch (e) {
    console.error('Error:', e);
  }
}

main();
