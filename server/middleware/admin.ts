const OWNER_EMAIL = 'giancarlo.papa@gmail.com';

export default defineEventHandler(async (event) => {
  const isAdminRoute =
    event.path.startsWith('/admin') || event.path.startsWith('/api/admin');
  if (!isAdminRoute) return;

  // Dev-only bypass — no cookie needed, always pass in non-production
  if (process.env.NODE_ENV !== 'production') return;

  const session = await getUserSession(event);
  const userEmail = (session?.user as Record<string, unknown> | undefined)
    ?.email as string | undefined;
  if (!userEmail || userEmail !== OWNER_EMAIL) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
  }
});
