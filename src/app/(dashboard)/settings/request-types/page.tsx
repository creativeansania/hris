import { getRequestTypes } from '@/app/actions/request-types';
import { RequestTypesClient } from '@/features/settings/components/request-types-client';

export default async function RequestTypesPage() {
  const res = await getRequestTypes();

  return (
    <RequestTypesClient
      initialTypes={res.data || []}
      initialError={res.error || null}
    />
  );
}
