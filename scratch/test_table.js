const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wnpjcopndrvvxkmftlgd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InducGpjb3BuZHJ2dnhrbWZ0bGdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM3ODUxMiwiZXhwIjoyMDk1OTU0NTEyfQ.B8XEtajlw3t-YQIwl_qFgUJlyI_8F2EtOyAR9I2uaHY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixMismatchedSales() {
  try {
    // Find sales that are 'pending_approval'
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('*, sale_payments(*)')
      .eq('status', 'pending_approval');

    if (salesError) {
      console.error('Error fetching sales:', salesError);
      return;
    }

    console.log(`Found ${sales.length} pending sales.`);

    for (const sale of sales) {
      const payments = sale.sale_payments || [];
      const approvedPayments = payments.filter(p => p.status === 'approved');
      const rejectedPayments = payments.filter(p => p.status === 'rejected');
      
      // If there are no approved payments and at least one rejected payment (the booking payment)
      if (approvedPayments.length === 0 && rejectedPayments.length > 0) {
        console.log(`Updating sale ID ${sale.id} for buyer ${sale.buyer_name} to 'rejected' status...`);
        
        const { error: updateError } = await supabase
          .from('sales')
          .update({
            status: 'rejected',
            approved_by: rejectedPayments[0].approved_by,
            approved_at: rejectedPayments[0].approved_at
          })
          .eq('id', sale.id);

        if (updateError) {
          console.error(`Failed to update sale ${sale.id}:`, updateError.message);
        } else {
          console.log(`Successfully updated sale ${sale.id} to rejected.`);
        }
      }
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

fixMismatchedSales();
