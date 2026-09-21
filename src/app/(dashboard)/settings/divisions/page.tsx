import { getDivisions } from '@/app/actions/divisions';
import { getEmployees } from '@/app/actions/employees';
import { DivisionsClient } from '@/features/settings/components/divisions-client';

export default async function DivisionsPage() {
  const [divRes, empRes] = await Promise.all([
    getDivisions(),
    getEmployees(),
  ]);

  return (
    <DivisionsClient
      initialDivisions={divRes.data || []}
      initialEmployees={empRes.data || []}
      initialError={divRes.error || null}
    />
  );
}
