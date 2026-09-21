import { createClient } from '../node_modules/@supabase/supabase-js/dist/index.mjs';
import fs from 'fs';
import path from 'path';

// Read .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach((line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanDummyData() {
  console.log('=== STARTING PRODUCTION DATA CLEANUP ===\n');

  // 1. Clean Odoo Sync Outbox
  console.log('1. Cleaning dummy records from odoo_sync_outbox...');
  const { error: errOutbox } = await supabase
    .from('odoo_sync_outbox')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(errOutbox ? `Error: ${errOutbox.message}` : '✔ odoo_sync_outbox cleaned');

  // 2. Clean Notifications
  console.log('2. Cleaning dummy records from notifications...');
  const { error: errNotif } = await supabase
    .from('notifications')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(errNotif ? `Error: ${errNotif.message}` : '✔ notifications cleaned');

  // 3. Clean Requests & Approvals
  console.log('3. Cleaning dummy requests and approvals...');
  const { error: errAppr } = await supabase
    .from('request_approvals')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(errAppr ? `Error request_approvals: ${errAppr.message}` : '✔ request_approvals cleaned');

  const { error: errReq } = await supabase
    .from('requests')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(errReq ? `Error requests: ${errReq.message}` : '✔ requests cleaned');

  // 4. Clean Attendance & Late Accumulations
  console.log('4. Cleaning test attendance & late accumulations...');
  const { error: errLate } = await supabase
    .from('late_accumulations')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(errLate ? `Error late_accumulations: ${errLate.message}` : '✔ late_accumulations cleaned');

  const { error: errAtt } = await supabase
    .from('attendance')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(errAtt ? `Error attendance: ${errAtt.message}` : '✔ attendance cleaned');

  // 5. Clean Payroll Runs & Payroll Periods
  console.log('5. Cleaning test payroll runs & periods...');
  const { error: errPayRuns } = await supabase
    .from('payroll_runs')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(errPayRuns ? `Error payroll_runs: ${errPayRuns.message}` : '✔ payroll_runs cleaned');

  const { error: errPayPer } = await supabase
    .from('payroll_periods')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(errPayPer ? `Error payroll_periods: ${errPayPer.message}` : '✔ payroll_periods cleaned');

  // 6. Clean Dummy Employee: Budi Santoso (budi.santoso@company.com)
  console.log('6. Cleaning dummy employee (budi.santoso@company.com)...');
  const { data: budi } = await supabase
    .from('employees')
    .select('id')
    .eq('email', 'budi.santoso@company.com')
    .maybeSingle();

  if (budi) {
    // Delete leave balances for Budi
    await supabase.from('leave_balances').delete().eq('employee_id', budi.id);
    // Delete Budi
    const { error: errBudi } = await supabase.from('employees').delete().eq('id', budi.id);
    console.log(errBudi ? `Error deleting Budi: ${errBudi.message}` : '✔ Dummy employee Budi Santoso deleted');
  } else {
    console.log('✔ Budi Santoso not found or already deleted');
  }

  // 7. Verify Final Counts
  console.log('\n=== VERIFYING FINAL DATABASE COUNTS ===');
  const checkTables = [
    'attendance',
    'requests',
    'request_approvals',
    'payroll_periods',
    'payroll_runs',
    'notifications',
    'odoo_sync_outbox',
    'employees',
    'divisions',
    'office_locations',
    'work_schedule_groups',
    'request_types',
  ];

  for (const t of checkTables) {
    const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
    console.log(`- ${t}: ${count} rows`);
  }

  console.log('\n=== CLEANUP COMPLETED SUCCESSFULLY ===');
}

cleanDummyData().catch((err) => {
  console.error('Fatal error during cleanup:', err);
  process.exit(1);
});
