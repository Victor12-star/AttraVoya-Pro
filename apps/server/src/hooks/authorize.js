import { roleMeets } from '@attravoya/constants';

import { AuthenticationError, AuthorizationError } from '../errors/app-error.js';

/**
 * Create an authorization hook for a protected route.
 *
 * `allPermissions` is used for sensitive operations that require every listed
 * capability. `anyPermissions` is useful when multiple administrative roles can
 * reach the same operation through different permission grants.
 */
export function createAuthorizeHook({ minimumRole, allPermissions = [], anyPermissions = [] } = {}) {
  return async function authorize(request) {
    if (!request.auth) {
      throw new AuthenticationError();
    }

    const roleSet = new Set(request.auth.roles ?? []);
    const permissionSet = new Set(request.auth.permissions ?? []);

    if (minimumRole) {
      const hasMinimumRole = [...roleSet].some((role) => roleMeets(role, minimumRole));
      if (!hasMinimumRole) throw new AuthorizationError();
    }

    if (allPermissions.some((permission) => !permissionSet.has(permission))) {
      throw new AuthorizationError();
    }

    if (anyPermissions.length > 0 && !anyPermissions.some((permission) => permissionSet.has(permission))) {
      throw new AuthorizationError();
    }
  };
}
