export function friendlyAuthError(error: unknown): string {
  const code = (error as { code?: string } | undefined)?.code ?? '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'That email is already registered — try signing in instead.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.';
    case 'auth/user-not-found':
      return 'No account found with that email.';
    case 'auth/too-many-requests':
      return 'Too many attempts — please try again later.';
    case 'auth/requires-recent-login':
      return 'For your security, please sign out, sign back in, and then try deleting your account again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
