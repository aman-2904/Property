const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wnpjcopndrvvxkmftlgd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InducGpjb3BuZHJ2dnhrbWZ0bGdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM3ODUxMiwiZXhwIjoyMDk1OTU0NTEyfQ.B8XEtajlw3t-YQIwl_qFgUJlyI_8F2EtOyAR9I2uaHY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .limit(1);

  if (error) {
    console.error('Error fetching profile:', error);
    return;
  }

  if (data.length === 0) {
    console.log('No profiles found to update. We will create a temp profile, try to update account_holder_name, and delete it.');
    // Try to update on a random uuid (will return empty data if not exists, but will throw error if column doesn't exist)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ account_holder_name: 'Test Name' })
      .eq('id', '00000000-0000-0000-0000-000000000000');

    if (updateError) {
      console.error('Update failed. Column probably does not exist yet:', updateError.message);
    } else {
      console.log('Update statement succeeded (column exists!).');
    }
  } else {
    const profileId = data[0].id;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ account_holder_name: 'Test Name' })
      .eq('id', profileId);

    if (updateError) {
      console.error('Update failed. Column probably does not exist yet:', updateError.message);
    } else {
      console.log('Update succeeded! Column exists.');
      // Revert change
      await supabase
        .from('profiles')
        .update({ account_holder_name: null })
        .eq('id', profileId);
    }
  }
}

main();
