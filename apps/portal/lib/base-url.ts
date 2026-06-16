// Absolute base URL for share links + PDF source. Resolves in order:
//   1. PORTAL_PRINT_BASE_URL — explicit override (set it to pin a custom domain).
//   2. VERCEL_PROJECT_PRODUCTION_URL — Vercel's stable production domain,
//      injected automatically at runtime (no env var to configure).
//   3. localhost — local dev.
// Keeps generated /share/<token> + PDF URLs on the real production domain
// without anyone setting an env var after deploy.
export function baseUrl(): string {
  if (process.env.PORTAL_PRINT_BASE_URL) return process.env.PORTAL_PRINT_BASE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return 'http://localhost:3000';
}
