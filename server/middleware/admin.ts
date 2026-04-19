const OWNER_EMAIL = 'giancarlo.papa@gmail.com';
const DEV_BYPASS_COOKIE = 'dev-admin-bypass';

export default defineEventHandler(async (event) => {
  const isAdminRoute = event.path.startsWith('/admin') || event.path.startsWith('/api/admin');
  if (!isAdminRoute) return;

  // Dev-only bypass — cleared on production by NODE_ENV check
  if (process.env.NODE_ENV !== 'production') {
    const bypass = getCookie(event, DEV_BYPASS_COOKIE);
    if (bypass === '1') return;
  }

  const session = await getUserSession(event);
  const userEmail = (session?.user as Record<string, unknown> | undefined)?.email as string | undefined;
  if (!userEmail || userEmail !== OWNER_EMAIL) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
  }
});
