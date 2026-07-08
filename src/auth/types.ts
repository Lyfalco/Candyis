export type AuthProviderId = 'guest' | 'email';

export interface AuthUser {
  id: string;
  displayName: string;
  photoURL: string | null;
  provider: AuthProviderId;
}
