import { AdminInviteForm } from '../../../features/users/admin-invite-form.jsx';
import { AdminRoleForm } from '../../../features/users/admin-role-form.jsx';

export default function UsersPage() {
  return (
    <div className="admin-users-stack">
      <header className="admin-users-heading">
        <div>
          <span className="admin-muted">OWNER CONTROLS</span>
          <h1>People &amp; administrator access</h1>
          <p className="admin-muted">
            Invite a colleague to create a verified account, then assign or revoke their Admin role.
          </p>
        </div>
        <a href="#invite-administrator" className="admin-primary-link">
          Add Administrator
        </a>
      </header>
      <section id="invite-administrator" className="admin-card admin-users-section">
        <h2>1. Invite New Administrator</h2>
        <p className="admin-muted">
          Send account registration instructions by email. Nobody becomes an administrator
          from the invitation alone.
        </p>
        <AdminInviteForm />
      </section>
      <section id="assign-administrator" className="admin-card admin-users-section">
        <h2>2. Assign or Remove Admin Role</h2>
        <p className="admin-muted">
          The person must already have an active, verified account. Confirm your owner password
          to assign or remove the Admin role. Owner accounts cannot be modified here.
        </p>
        <AdminRoleForm />
      </section>
    </div>
  );
}
