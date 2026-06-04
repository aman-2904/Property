const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wnpjcopndrvvxkmftlgd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InducGpjb3BuZHJ2dnhrbWZ0bGdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNzg1MTIsImV4cCI6MjA5NTk1NDUxMn0.e2NkyAUti6veehXGtxGxDMHT2NXlQSriXodwsmqLOoc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin() {
  try {
    console.log('Attempting login for dheerajkumar8179@gmail.com...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'dheerajkumar8179@gmail.com',
      password: 'password123'
    });
    
    if (error) {
      console.error('Login failed:', error.message, error);
    } else {
      console.log('Login succeeded! User details:', {
        id: data.user.id,
        email: data.user.email,
        email_confirmed: data.user.email_confirmed_at,
        last_sign_in: data.user.last_sign_in_at
      });
    }
  } catch (err) {
    console.error('Unexpected error during test login:', err);
  }
}

testLogin();
