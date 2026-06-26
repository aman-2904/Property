const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Parse .env.local
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    env[match[1]] = (match[2] || '').replace(/['"]/g, '').trim();
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Track created entities for manual cleanup guarantee
let createdAuthUserIds = [];
let createdPropertyId = null;

async function createTestUser(email, name, uplineId = null) {
  console.log(`Creating auth user: ${name} (${email})...`);
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: 'password123',
    email_confirm: true,
    user_metadata: { name }
  });
  if (error) throw new Error(`Failed to create user ${email}: ${error.message}`);
  const userId = data.user.id;
  createdAuthUserIds.push(userId);

  if (uplineId) {
    const { error: updErr } = await supabase
      .from('profiles')
      .update({ upline_id: uplineId })
      .eq('id', userId);
    if (updErr) throw new Error(`Failed to set upline for ${email}: ${updErr.message}`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return profile;
}

async function insertAndApproveSale(sellerId, propertyId, buyerName) {
  // Insert sale in pending_approval status
  const { data: sale, error } = await supabase
    .from('sales')
    .insert({
      seller_id: sellerId,
      property_id: propertyId,
      buyer_name: buyerName,
      buyer_phone: '9999999999',
      sale_amount: 1000000.00,
      booking_amount: 50000.00,
      status: 'pending_approval'
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to insert sale for ${sellerId}: ${error.message}`);

  // Transition to approved to fire DB triggers
  const { data: approvedSale, error: appErr } = await supabase
    .from('sales')
    .update({ status: 'approved' })
    .eq('id', sale.id)
    .select()
    .single();
  if (appErr) throw new Error(`Failed to approve sale for ${sellerId}: ${appErr.message}`);
  return approvedSale;
}

async function fetchProfile(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('*, promotion_levels!promotion_level(title, personal_sale_incentive)')
    .eq('id', userId)
    .single();
  return data;
}

async function fetchWallet(userId) {
  const { data } = await supabase
    .from('promotion_wallet')
    .select('*')
    .eq('user_id', userId)
    .single();
  return data;
}

async function runSimulation() {
  console.log("====================================================");
  console.log("   PROMOTION & POST INCOME SYSTEM INCENTIVE SIMULATOR");
  console.log("====================================================\n");

  try {
    // 1. Create a mock property
    const { data: property, error: propErr } = await supabase
      .from('properties')
      .insert({
        title: 'TEST_PROMO_PROPERTY',
        slug: `test-promo-prop-${Date.now()}`,
        description: 'Test Property for Promotion Rules',
        location: 'Delhi NCR',
        price: 1000000.00,
        total_commission_percent: 5.00,
        status: 'available'
      })
      .select()
      .single();
    if (propErr) throw new Error(`Failed to create property: ${propErr.message}`);
    createdPropertyId = property.id;
    console.log(`✅ Created Test Property: ${property.title} (ID: ${property.id})\n`);

    // 2. Set up the agent network structure
    console.log("--- SETTING UP MLM NETWORK TREE ---");
    const rootUser = await createTestUser('test_promo_root@example.com', 'Test Root Agent');
    const legA = await createTestUser('test_promo_lega@example.com', 'Test Leg A Agent', rootUser.id);
    const legB = await createTestUser('test_promo_legb@example.com', 'Test Leg B Agent', rootUser.id);
    const legC = await createTestUser('test_promo_legc@example.com', 'Test Leg C Agent', rootUser.id);
    
    const dla1 = await createTestUser('test_promo_dla1@example.com', 'Test Downline A1', legA.id);
    const dla1_1 = await createTestUser('test_promo_dla1_1@example.com', 'Test Downline A1-1', dla1.id);
    const dlb1 = await createTestUser('test_promo_dlb1@example.com', 'Test Downline B1', legB.id);
    console.log("✅ MLM Tree created successfully!\n");

    // 3. STEP 1: Verify Root starts at Level 0 (Agent)
    let pRoot = await fetchProfile(rootUser.id);
    console.log(`Initial Status: Root Agent Rank = ${pRoot.promotion_levels.title} (Level ${pRoot.promotion_level})`);
    if (pRoot.promotion_level !== 0) throw new Error("Root agent should start at Level 0");

    // 4. STEP 2: Promote Root to Manager (Level 1)
    // Manager needs: 2 direct sales, 8 group sales.
    console.log("\n--- STEP 2: PROMOTING ROOT TO MANAGER ---");
    console.log("Adding 2 direct sales for Root...");
    await insertAndApproveSale(rootUser.id, property.id, 'Buyer Root 1');
    await insertAndApproveSale(rootUser.id, property.id, 'Buyer Root 2');

    console.log("Adding 8 group sales (via Leg A Agent)...");
    for (let i = 1; i <= 8; i++) {
      await insertAndApproveSale(legA.id, property.id, `Buyer LegA ${i}`);
    }

    pRoot = await fetchProfile(rootUser.id);
    console.log(`Root Agent Direct Sales: ${pRoot.direct_sales_count}, Group Sales: ${pRoot.group_sales_count}`);
    console.log(`Root Agent Rank after sales: ${pRoot.promotion_levels.title} (Level ${pRoot.promotion_level})`);
    
    if (pRoot.promotion_level !== 1) {
      throw new Error(`Expected Root to be promoted to Level 1, got Level ${pRoot.promotion_level}`);
    }
    console.log("✅ Root successfully upgraded to MANAGER (Level 1)!");

    // 5. STEP 3: Verify Manager Personal Sale Incentive (Post-Income)
    // Root is now a Manager. Manager personal sale incentive is ₹5000 per sale.
    console.log("\n--- STEP 3: TESTING MANAGER PERSONAL SALE INCENTIVE ---");
    console.log("Root making a new direct sale (sale #3) while being a Manager...");
    const sale3 = await insertAndApproveSale(rootUser.id, property.id, 'Buyer Root 3');

    // Check promotion wallet transactions for Root
    const { data: rootTxns } = await supabase
      .from('promotion_wallet_transactions')
      .select('*')
      .eq('user_id', rootUser.id)
      .eq('sale_id', sale3.id);
    
    console.log(`Wallet Transaction created:`, rootTxns);
    if (rootTxns.length === 0) throw new Error("No transaction created in promotion wallet transactions!");
    const txn = rootTxns[0];
    
    if (Number(txn.per_sale_incentive) !== 5000.00) {
      throw new Error(`Expected incentive amount ₹5000, got ₹${txn.per_sale_incentive}`);
    }
    if (txn.status !== 'pending') {
      throw new Error(`Expected transaction status to be 'pending', got '${txn.status}'`);
    }
    console.log("✅ Pending transaction of ₹5,000 created successfully!");

    // Check Root promotion wallet
    let walletRoot = await fetchWallet(rootUser.id);
    console.log(`Root Wallet Balance: ₹${walletRoot.balance}, Pending Balance: ₹${walletRoot.pending_income}`);
    if (Number(walletRoot.pending_income) !== 5000.00) {
      throw new Error(`Expected pending wallet income ₹5000, got ₹${walletRoot.pending_income}`);
    }

    // Admin approves transaction
    console.log("Simulating Admin approving the incentive payment...");
    // Call DB RPC directly to simulate Server Action workflow:
    await supabase.rpc('update_promotion_wallet_on_approval', {
      target_user_id: rootUser.id,
      incentive_amount: 5000.00
    });
    await supabase.rpc('credit_main_wallet', {
      target_user_id: rootUser.id,
      credit_amount: 5000.00
    });
    // Update txn row status
    await supabase.from('promotion_wallet_transactions').update({ status: 'approved' }).eq('id', txn.id);

    walletRoot = await fetchWallet(rootUser.id);
    console.log(`Root Promotion Wallet after Approval - Balance: ₹${walletRoot.balance}, Pending: ₹${walletRoot.pending_income}`);
    
    // Check Root main wallet
    const { data: mainWallet } = await supabase.from('wallets').select('*').eq('user_id', rootUser.id).single();
    console.log(`Root Main Wallet Balance: ₹${mainWallet.balance}`);

    if (Number(walletRoot.balance) !== 5000.00 || Number(walletRoot.pending_income) !== 0.00) {
      throw new Error("Wallet balance updates did not match expectations");
    }
    if (Number(mainWallet.balance) !== 5000.00) {
      throw new Error(`Expected main wallet balance to be ₹5000, got ₹${mainWallet.balance}`);
    }
    console.log("✅ Wallet balance and main wallet balance credited successfully upon approval!");

    // 6. STEP 4: Promote Root to Sr. Manager (Level 2)
    // Sr. Manager needs: 4 direct, 26 group, and 1 Manager downline.
    console.log("\n--- STEP 4: PROMOTING ROOT TO SR. MANAGER ---");
    
    // Make Leg A Agent a Manager: needs 2 direct, 8 group.
    // Currently, Leg A Agent has 8 sales (direct for them, group for Root).
    // Leg A needs 8 group sales. Let's make 8 sales for Downline A1.
    console.log("Adding 8 group sales for Leg A Agent (via Downline A1)...");
    for (let i = 1; i <= 8; i++) {
      await insertAndApproveSale(dla1.id, property.id, `Buyer DownlineA1 ${i}`);
    }

    const pLegA = await fetchProfile(legA.id);
    console.log(`Leg A Agent Rank: ${pLegA.promotion_levels.title} (Level ${pLegA.promotion_level})`);
    if (pLegA.promotion_level !== 1) {
      throw new Error(`Leg A Agent did not reach Manager. Level: ${pLegA.promotion_level}`);
    }
    console.log("✅ Leg A Agent upgraded to MANAGER!");

    // Root needs: 4 direct sales (currently has 3: Root 1, Root 2, Root 3. Add 1 more).
    console.log("Adding 1 more direct sale for Root (total 4)...");
    await insertAndApproveSale(rootUser.id, property.id, 'Buyer Root 4');

    // Root needs: 26 group sales.
    // Current group sales for Root: 8 (Leg A direct) + 8 (Downline A1) = 16.
    // Let's add 10 group sales via Leg C Agent.
    console.log("Adding 10 group sales for Root (via Leg C Agent)...");
    for (let i = 1; i <= 10; i++) {
      await insertAndApproveSale(legC.id, property.id, `Buyer LegC ${i}`);
    }

    pRoot = await fetchProfile(rootUser.id);
    console.log(`Root Agent Direct Sales: ${pRoot.direct_sales_count}, Group Sales: ${pRoot.group_sales_count}`);
    console.log(`Root Agent Rank: ${pRoot.promotion_levels.title} (Level ${pRoot.promotion_level})`);

    if (pRoot.promotion_level !== 2) {
      throw new Error(`Expected Root to be Sr. Manager (Level 2), got Level ${pRoot.promotion_level}`);
    }
    console.log("✅ Root successfully upgraded to SR. MANAGER (Level 2)!");

    // 7. STEP 5: Promote Root to AGM (Level 3)
    // AGM needs: 5 direct, 66 group, and 2 Sr. Managers in DIFFERENT legs.
    console.log("\n--- STEP 5: PROMOTING ROOT TO AGM (LEG CHECKS) ---");

    // We already have Leg A Agent at Manager. Let's make Leg A Agent a Sr. Manager.
    // Leg A needs: 4 direct, 26 group, and 1 Manager.
    // Currently, Leg A has 8 direct sales and 8 group sales.
    // Let's promote Downline A1 to Manager: needs 2 direct (currently has 8, so yes), 8 group.
    // Add 8 sales for Downline A1-1.
    console.log("Promoting Downline A1 to Manager (via Downline A1-1 sales)...");
    for (let i = 1; i <= 8; i++) {
      await insertAndApproveSale(dla1_1.id, property.id, `Buyer dla1_1 ${i}`);
    }
    const pDla1 = await fetchProfile(dla1.id);
    console.log(`Downline A1 Rank: ${pDla1.promotion_levels.title} (Level ${pDla1.promotion_level})`);
    if (pDla1.promotion_level !== 1) {
      throw new Error("Downline A1 failed to reach Manager status");
    }

    // Now, Leg A needs 26 group sales.
    // Current group sales for Leg A: 8 (Downline A1) + 8 (Downline A1-1) = 16.
    // Add 10 more sales for Downline A1 (direct for dla1, group for Leg A).
    console.log("Adding 10 more group sales for Leg A...");
    for (let i = 9; i <= 18; i++) {
      await insertAndApproveSale(dla1.id, property.id, `Buyer DownlineA1 ${i}`);
    }

    const pLegA_v2 = await fetchProfile(legA.id);
    console.log(`Leg A Agent Rank: ${pLegA_v2.promotion_levels.title} (Level ${pLegA_v2.promotion_level})`);
    if (pLegA_v2.promotion_level !== 2) {
      throw new Error(`Leg A Agent failed to reach Sr. Manager (Level 2). Level: ${pLegA_v2.promotion_level}`);
    }
    console.log("✅ Leg A Agent upgraded to SR. MANAGER (Leg 1 Qualified)!");

    // Now, make Leg B Agent a Sr. Manager (Leg 2).
    // Leg B needs: 4 direct, 26 group, and 1 Manager.
    console.log("Promoting Leg B Agent to Manager...");
    // Give Leg B 4 direct sales and 8 group sales (via Downline B1).
    for (let i = 1; i <= 4; i++) {
      await insertAndApproveSale(legB.id, property.id, `Buyer LegB ${i}`);
    }
    for (let i = 1; i <= 8; i++) {
      await insertAndApproveSale(dlb1.id, property.id, `Buyer DownlineB1 ${i}`);
    }
    let pLegB = await fetchProfile(legB.id);
    console.log(`Leg B Agent Rank: ${pLegB.promotion_levels.title} (Level ${pLegB.promotion_level})`);
    if (pLegB.promotion_level !== 1) {
      throw new Error("Leg B Agent failed to reach Manager");
    }

    // Promote Downline B1 to Manager: needs 2 direct (has 8, yes), 8 group.
    // Add 8 sales for Downline B1... wait, we can just insert sales for B1's downlines if any, or create a temporary downline.
    // Let's create a temporary user under B1 to make group sales.
    const dlb1_1 = await createTestUser('test_promo_dlb1_1@example.com', 'Test Downline B1-1', dlb1.id);
    console.log("Promoting Downline B1 to Manager...");
    for (let i = 1; i <= 8; i++) {
      await insertAndApproveSale(dlb1_1.id, property.id, `Buyer dlb1_1 ${i}`);
    }
    const pDlb1 = await fetchProfile(dlb1.id);
    console.log(`Downline B1 Rank: ${pDlb1.promotion_levels.title} (Level ${pDlb1.promotion_level})`);
    if (pDlb1.promotion_level !== 1) {
      throw new Error("Downline B1 failed to reach Manager");
    }

    // Leg B needs 26 group sales. Currently has 8 (B1 direct) + 8 (B1-1 direct) = 16.
    // Add 10 more sales for Downline B1.
    console.log("Adding 10 more group sales for Leg B...");
    for (let i = 9; i <= 18; i++) {
      await insertAndApproveSale(dlb1.id, property.id, `Buyer DownlineB1 ${i}`);
    }
    pLegB = await fetchProfile(legB.id);
    console.log(`Leg B Agent Rank: ${pLegB.promotion_levels.title} (Level ${pLegB.promotion_level})`);
    if (pLegB.promotion_level !== 2) {
      throw new Error("Leg B Agent failed to reach Sr. Manager");
    }
    console.log("✅ Leg B Agent upgraded to SR. MANAGER (Leg 2 Qualified)!");

    // Root needs: 5 direct sales (has 4. Add 1 more direct).
    console.log("Adding 1 direct sale for Root (total 5)...");
    await insertAndApproveSale(rootUser.id, property.id, 'Buyer Root 5');

    // Root needs: 66 group sales.
    // Let's check Root's current group sales count.
    pRoot = await fetchProfile(rootUser.id);
    console.log(`Root Agent Direct Sales: ${pRoot.direct_sales_count}, Group Sales: ${pRoot.group_sales_count}`);
    
    // If group sales is less than 66, add the required amount.
    const neededGroupSales = 66 - pRoot.group_sales_count;
    if (neededGroupSales > 0) {
      console.log(`Adding ${neededGroupSales} more group sales for Root via Leg C Agent...`);
      for (let i = 1; i <= neededGroupSales; i++) {
        await insertAndApproveSale(legC.id, property.id, `Buyer LegC More ${i}`);
      }
    }

    pRoot = await fetchProfile(rootUser.id);
    console.log(`Root Agent final Direct Sales: ${pRoot.direct_sales_count}, Group Sales: ${pRoot.group_sales_count}`);
    console.log(`Root Agent final Rank: ${pRoot.promotion_levels.title} (Level ${pRoot.promotion_level})`);

    if (pRoot.promotion_level !== 3) {
      throw new Error(`Expected Root to reach AGM (Level 3), got Level ${pRoot.promotion_level}`);
    }
    console.log("🎉 SUCCESS! Root Agent successfully upgraded to AGM (Level 3) utilizing different leg check rules!");

  } catch (err) {
    console.error("❌ Simulation failed with error:", err.message);
    console.error(err.stack);
  } finally {
    // Cleanup of all created entities to restore database to original state
    console.log("\n--- CLEANING UP DATABASE (RESTORING TO ORIGINAL STATE) ---");
    
    try {
      if (createdPropertyId) {
        console.log("Deleting test sales and transactions...");
        // Deleting wallet transactions, promotions, sales, properties linked to test property
        await supabase.from('promotion_wallet_transactions').delete().eq('property_title', 'TEST_PROMO_PROPERTY');
        await supabase.from('sales').delete().eq('property_id', createdPropertyId);
        await supabase.from('properties').delete().eq('id', createdPropertyId);
      }

      console.log(`Deleting ${createdAuthUserIds.length} test auth users and cascade profiles...`);
      for (const authId of createdAuthUserIds) {
        // Delete wallets first to be safe
        await supabase.from('wallets').delete().eq('user_id', authId);
        await supabase.from('promotion_wallet').delete().eq('user_id', authId);
        await supabase.from('promotions').delete().eq('user_id', authId);
        await supabase.from('notifications').delete().eq('user_id', authId);
        // Delete auth user (cascades to profile)
        await supabase.auth.admin.deleteUser(authId);
      }
      
      console.log("✅ Cleanup complete. Database restored to pristine state!");
    } catch (cleanErr) {
      console.error("❌ Cleanup failed:", cleanErr.message);
    }
    
    console.log("\n=== SIMULATION ENDED ===");
  }
}

runSimulation();
