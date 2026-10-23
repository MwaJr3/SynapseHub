/** Actor shape mirrored for the stubs (kept identical to src/lib/auth). */
export interface Actor {
  id: string;
  name: string;
  email: string;
  role: 'MEMBER' | 'EDITOR' | 'ADMIN' | 'PLATFORM_OPERATOR';
}
