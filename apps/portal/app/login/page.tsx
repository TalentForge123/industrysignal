// /login — magic-link sign-in.
//
// Ported from ui_kits/portal/LoginView.jsx. The prototype's password
// field is dropped (HANDOFF §6: magic-link only, "žádná hesla") and
// the "Zapomenuté heslo?" link with it; everything else — the scanline
// backdrop, the top-right CS/EN + ED/GR toggles, the editorial card,
// the brand mark, the title + sub, the footer meta — is preserved.
// The form action is bound to a server action that defers to Auth.js's
// signIn('email', ...).

import { loginAction } from './actions';
import { LoginForm } from './LoginForm';

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  return <LoginForm action={loginAction} error={searchParams?.error ?? null} />;
}
