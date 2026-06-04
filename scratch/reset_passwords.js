const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wnpjcopndrvvxkmftlgd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InducGpjb3BuZHJ2dnhrbWZ0bGdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM3ODUxMiwiZXhwIjoyMDk1OTU0NTEyfQ.B8XEtajlw3t-YQIwl_qFgUJlyI_8F2EtOyAR9I2uaHY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function reset() {
  try {
    // List users
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error('Error listing users:', listError);
      return;
    }

    for (const user of users) {
      if (user.email === 'jhaaman558@gmail.com' || user.email === 'dheerajkumar8179@gmail.com') {
        console.log(`Updating password for ${user.email} (id: ${user.id})...`);
        const { error } = await supabase.auth.admin.updateUserById(user.id, {
          password: 'password123'
        });
        if (error) {
          console.error(`Error updating password for ${user.email}:`, error);
        } else {
          console.log(`Successfully updated password for ${user.email}`);
        }
      }
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

reset();
