import type { JSX } from 'react';

import { AuthForm } from '@/components/auth-forms';

export const metadata = { title: 'Create account' };

export default function RegisterPage(): JSX.Element {
  return <AuthForm mode="register" />;
}
