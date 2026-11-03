import { SessionSecurityPanel } from '../../../features/auth/session-security-panel.jsx';
import { ChangePasswordForm } from '../../../features/auth/change-password-form.jsx';

export default function SecurityPage() {
  return (
    <div className="admin-security-stack">
      <section className="admin-card admin-login-card">
        <h1>Account security</h1>
        <p className="admin-muted">
          Change your password if you suspect that it has been exposed or reused. You will need to
          sign in again after changing it.
        </p>
        <ChangePasswordForm />
      </section>
      <SessionSecurityPanel />
    </div>
  );
}
