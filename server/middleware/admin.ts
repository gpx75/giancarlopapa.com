const OWNER_EMAIL = 'giancarlo.papa@gmail.com';

export default defineEventHandler(async (event) => {
  if (!event.path.startsWith('/admin')) return;

  const session = await getUserSession(event);

  const userEmail = (session?.user as Record<string, unknown> | undefined)?.email as string | undefined;
  if (!userEmail || userEmail !== OWNER_EMAIL) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
  }
});
