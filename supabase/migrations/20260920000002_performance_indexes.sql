-- Migration: 20260920000002_performance_indexes.sql
-- Description: Composite and single indexes to optimize pagination, filtering, and foreign key joins

-- 1. Index attendance queries (filtered by date, employee, and order by clock_in)
CREATE INDEX IF NOT EXISTS idx_attendance_date_emp
  ON attendance (attendance_date DESC, employee_id);

CREATE INDEX IF NOT EXISTS idx_attendance_month_year
  ON attendance (attendance_date DESC);

-- 2. Index employees table for division filtering, status, and role
CREATE INDEX IF NOT EXISTS idx_employees_division_status
  ON employees (division_id, status);

CREATE INDEX IF NOT EXISTS idx_employees_role_status
  ON employees (role, status);

-- 3. Index requests table (date ranges, employee, and approval status)
CREATE INDEX IF NOT EXISTS idx_requests_dates_emp
  ON requests (start_date, end_date, employee_id);

CREATE INDEX IF NOT EXISTS idx_requests_status_type
  ON requests (status, request_type_id);

-- 4. Index payroll items by payroll run
CREATE INDEX IF NOT EXISTS idx_payroll_items_run_id
  ON payroll_items (payroll_run_id);

-- 5. Index audit logs for actor and entity queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_entity
  ON audit_logs (created_at DESC, entity_type);
