import { getHolidays } from '@/app/actions/holidays';
import { HolidaysClient } from '@/features/settings/components/holidays-client';

export default async function HolidaysPage() {
  const currentYear = new Date().getFullYear();
  const res = await getHolidays(currentYear);

  return (
    <HolidaysClient
      initialHolidays={res.data || []}
      initialYear={currentYear}
      initialError={res.error || null}
    />
  );
}
