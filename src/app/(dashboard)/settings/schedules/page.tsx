import { getScheduleGroups } from '@/app/actions/schedules';
import { SchedulesClient } from '@/features/settings/components/schedules-client';

export default async function WorkSchedulesPage() {
  const res = await getScheduleGroups();

  return (
    <SchedulesClient
      initialGroups={res.data || []}
      initialError={res.error || null}
    />
  );
}
