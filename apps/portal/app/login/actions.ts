'use server';

import { redirect } from 'next/navigation';
import { signIn } from '@/auth';

export async function loginAction(formData: FormData) {
  const email = formData.get('email');
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect('/login?error=invalid_email');
  }
  await signIn('email', {
    email,
    redirectTo: '/login/verify',
  });
}
