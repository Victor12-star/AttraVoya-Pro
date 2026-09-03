import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '@attravoya/validation';

export const authSchemas = Object.freeze({
  register: {
    body: registerSchema,
  },
  login: {
    body: loginSchema,
  },
  forgotPassword: {
    body: forgotPasswordSchema,
  },
  resetPassword: {
    body: resetPasswordSchema,
  },
  verifyEmail: {
    body: verifyEmailSchema,
  },
});
