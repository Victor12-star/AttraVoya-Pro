import { AdminRoleForm } from '../../../features/users/admin-role-form.jsx';

export default function UsersPage() {
  return (
    <section className="admin-card admin-login-card">
      <h1>Manage administrator access</h1>
      <p className="admin-muted">
        Super Admin owners can assign or remove the Admin role for an existing
        verified traveler account. Owner accounts are protected from modification.
        Every actual role change is audited and existing sessions are revoked.
      </p>
      <AdminRoleForm />
    </section>
  );
}
