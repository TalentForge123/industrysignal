// Server entry for the quarterly report.
//
// Resolves the latest *published* report from Postgres and hands the
// hydrated bilingual payload to the client view, which picks the lang
// half based on `useLang()`. When no published row exists yet (early
// dev) the page renders the mock fixture with an explicit "preview"
// banner — Studio gets used to populate the table.

import { getLatestReportBilingual } from '@/lib/reports';
import { ReportView } from '../_views/ReportView';

export const dynamic = 'force-dynamic';

export default async function ReportPage() {
  const dbReport = await getLatestReportBilingual();
  return <ReportView dbReport={dbReport} />;
}
