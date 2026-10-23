import type { JSX } from 'react';

import { AuthForm } from '@/components/auth-forms';

export const metadata = { title: 'Sign in' };

export default function LoginPage(): JSX.Element {
  return <AuthForm mode="login" />;
}
