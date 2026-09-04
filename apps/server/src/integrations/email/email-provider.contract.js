export function assertEmailProvider(provider) {
  if (!provider || typeof provider.sendVerificationEmail !== 'function') {
    throw new TypeError('Email provider must implement sendVerificationEmail().');
  }
  if (typeof provider.sendPasswordResetEmail !== 'function') {
    throw new TypeError('Email provider must implement sendPasswordResetEmail().');
  }

  return provider;
}
