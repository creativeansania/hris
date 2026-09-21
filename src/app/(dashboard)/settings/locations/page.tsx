import { getOfficeLocations } from '@/app/actions/locations';
import { LocationsClient } from '@/features/settings/components/locations-client';

export default async function OfficeLocationsPage() {
  const res = await getOfficeLocations();

  return (
    <LocationsClient
      initialLocations={res.data || []}
      initialError={res.error || null}
    />
  );
}
