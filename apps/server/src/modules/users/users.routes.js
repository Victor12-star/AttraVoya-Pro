import { env } from '../../config/env.js';
import { createAdminDirectoryController } from './admin-directory.controller.js';
import { adminDirectoryRepository } from './admin-directory.repository.js';
import { createEmailProvider } from '../../integrations/email/email-provider.factory.js';
import { createAdminInviteController } from './admin-invite.controller.js';
import { createAdminInviteService } from './admin-invite.service.js';
import { adminInviteRepository } from './admin-invite.repository.js';
import { PERMISSIONS, ROLES } from '@attravoya/constants';
import { createAdminRoleService } from './admin-role.service.js';
import { adminRoleRepository } from './admin-role.repository.js';
import { createAdminRoleController } from './admin-role.controller.js';
import { createUsersController } from './users.controller.js';
import { usersRepository } from './users.repository.js';
import { usersSchemas } from './users.schema.js';
import { createUsersService } from './users.service.js';

const ACCOUNT_DELETION_RATE_LIMIT = Object.freeze({ max: 5, timeWindow: '15 minutes' });

export async function usersRoutes(app, options = {}) {
  const repository = options.repository ?? usersRepository;
  const service = createUsersService(repository);
  const controller = createUsersController({ service, env });
  const protectedApp = /** @type {any} */ (app);
  const adminRoles = createAdminRoleController(
    createAdminRoleService(options.adminRoleRepository ?? adminRoleRepository),
  );

  const configuredEmail =
    options.onAdminInvitationRequested ??
    (env.RESEND_API_KEY?.trim() && env.EMAIL_FROM?.trim()
      ? ({ to }) => createEmailProvider().sendAdminRegistrationInvitation({ to })
      : undefined);
  const inviteController = createAdminInviteController(
    createAdminInviteService({
      repository: options.adminInviteRepository ?? adminInviteRepository,
      sendInvitation: configuredEmail,
    }),
  );
  app.get('/admin-directory', {
    onRequest: [
      protectedApp.authenticate,
      protectedApp.authorize({
        minimumRole: ROLES.SUPER_ADMIN,
        allPermissions: [PERMISSIONS.USERS_READ],
      }),
    ],
    schema: usersSchemas.adminDirectory,
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    handler: createAdminDirectoryController(
      options.adminDirectoryRepository ?? adminDirectoryRepository,
    ).listUsers,
  });

  app.get('/admin-invitations', {
    onRequest: [
      protectedApp.authenticate,
      protectedApp.authorize({
        minimumRole: ROLES.SUPER_ADMIN,
        allPermissions: [PERMISSIONS.ROLES_WRITE],
      }),
    ],
    schema: usersSchemas.adminInvitationHistory,
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    handler: inviteController.list,
  });

  app.post('/admin-invitations/:invitationId/revoke', {
    onRequest: [
      protectedApp.authenticate,
      protectedApp.authorize({
        minimumRole: ROLES.SUPER_ADMIN,
        allPermissions: [PERMISSIONS.ROLES_WRITE],
      }),
    ],
    schema: usersSchemas.revokeAdminInvitation,
    config: { rateLimit: ACCOUNT_DELETION_RATE_LIMIT },
    handler: inviteController.revoke,
  });

  app.post('/admin-invitations', {
    onRequest: [
      protectedApp.authenticate,
      protectedApp.authorize({
        minimumRole: ROLES.SUPER_ADMIN,
        allPermissions: [PERMISSIONS.ROLES_WRITE],
      }),
    ],
    schema: usersSchemas.inviteAdministrator,
    config: { rateLimit: ACCOUNT_DELETION_RATE_LIMIT },
    handler: inviteController.invite,
  });

  app.post('/admin-role', {
    onRequest: [
      protectedApp.authenticate,
      protectedApp.authorize({
        minimumRole: ROLES.SUPER_ADMIN,
        allPermissions: [PERMISSIONS.ROLES_WRITE],
      }),
    ],
    schema: usersSchemas.manageAdminRole,
    config: { rateLimit: ACCOUNT_DELETION_RATE_LIMIT },
    handler: adminRoles.setAdminRole,
  });

  app.delete('/me', {
    onRequest: [protectedApp.authenticate],
    schema: usersSchemas.deleteCurrentAccount,
    config: { rateLimit: ACCOUNT_DELETION_RATE_LIMIT },
    handler: controller.deleteCurrentAccount,
  });
}
