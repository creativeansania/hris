'use client';

import { useParams } from 'next/navigation';
import { EmployeeDetailClient } from '@/features/employees';

export default function EmployeeDetailPage() {
  const params = useParams();
  const employeeId = params.id as string;

  return <EmployeeDetailClient employeeId={employeeId} />;
}
