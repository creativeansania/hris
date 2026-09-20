-- ============================================================================
-- SPRINT 12: SECURITY HARDENING & ROW LEVEL SECURITY (RLS) MIGRATION
-- ============================================================================

-- 1. Helper Functions (Security Definer to prevent recursive RLS stack depth limit)
create or replace function current_employee_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from employees
  where auth_user_id = auth.uid()
    and auth.uid() is not null
  limit 1;
$$;

create or replace function current_employee_role()
returns employee_role language sql stable security definer set search_path = public as $$
  select role from employees
  where auth_user_id = auth.uid()
    and auth.uid() is not null
  limit 1;
$$;

create or replace function is_direct_report(target_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from employees
    where id = target_id
      and spv_id = current_employee_id()
      and auth.uid() is not null
  );
$$;

create or replace function is_in_my_division(target_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from employees e
    join divisions d on e.division_id = d.id
    where e.id = target_id
      and d.kepala_divisi_id = current_employee_id()
      and auth.uid() is not null
  );
$$;

create or replace function has_global_access()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(current_employee_role() in ('admin', 'hr', 'management'), false);
$$;

-- 2. Ensure RLS is active on core tables
alter table employees enable row level security;
alter table employee_contracts enable row level security;
alter table employee_positions enable row level security;
alter table employee_allowances enable row level security;
alter table attendance enable row level security;
alter table attendance_corrections enable row level security;
alter table requests enable row level security;
alter table request_attachments enable row level security;
alter table request_approvals enable row level security;
alter table leave_balances enable row level security;
alter table late_accumulations enable row level security;
alter table payroll_periods enable row level security;
alter table payroll_runs enable row level security;
alter table payroll_rules enable row level security;
alter table notifications enable row level security;
alter table audit_logs enable row level security;
alter table odoo_sync_outbox enable row level security;

-- 3. Policy overrides for employees table
drop policy if exists employees_select_self on employees;
create policy employees_select_self on employees
  for select using (
    auth_user_id = auth.uid()
    or spv_id = current_employee_id()
    or is_in_my_division(id)
    or has_global_access()
  );

-- 4. Policy overrides for payroll_runs (Strict data isolation: only own slip gaji or Management/HR)
drop policy if exists payroll_runs_select_self on payroll_runs;
drop policy if exists payroll_runs_select_mgmt_hr on payroll_runs;
create policy payroll_runs_select_isolated on payroll_runs
  for select using (
    employee_id = current_employee_id()
    or current_employee_role() in ('admin', 'management', 'hr')
  );

-- 5. Policy overrides for attendance
drop policy if exists attendance_select_self on attendance;
drop policy if exists attendance_select_as_spv on attendance;
drop policy if exists attendance_select_as_kadiv on attendance;
drop policy if exists attendance_select_global on attendance;
create policy attendance_select_hierarchical on attendance
  for select using (
    employee_id = current_employee_id()
    or is_direct_report(employee_id)
    or is_in_my_division(employee_id)
    or has_global_access()
  );

-- 6. Policy overrides for audit_logs (Read only by admin & management)
drop policy if exists audit_logs_select_admin_mgmt on audit_logs;
create policy audit_logs_select_admin_mgmt on audit_logs
  for select using (
    current_employee_role() in ('admin', 'management')
  );

-- 7. Policy overrides for notifications (Read only own notifications)
drop policy if exists notifications_select_self on notifications;
create policy notifications_select_self on notifications
  for select using (
    employee_id = current_employee_id()
  );

-- 8. Policy overrides for requests and request_approvals
drop policy if exists requests_select_self on requests;
create policy requests_select_hierarchical on requests
  for select using (
    employee_id = current_employee_id()
    or created_by = current_employee_id()
    or is_direct_report(employee_id)
    or is_in_my_division(employee_id)
    or has_global_access()
  );
