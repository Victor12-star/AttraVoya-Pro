import { AnalyticsDashboard } from '../../../features/dashboard/analytics-dashboard.jsx';

export default function AnalyticsPage() {
  // The browser uses the same-origin admin proxy; backend credentials remain HttpOnly.
  return <AnalyticsDashboard apiBaseUrl="/api/admin" />;
}
