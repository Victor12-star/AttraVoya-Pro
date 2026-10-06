import { AnalyticsDashboard } from '../../../features/dashboard/analytics-dashboard.jsx';

export default function AnalyticsPage() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_URL ?? null;

  return <AnalyticsDashboard apiBaseUrl={apiBaseUrl} />;
}
