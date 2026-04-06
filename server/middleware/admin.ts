const OWNER_EMAIL = 'giancarlo.papa@gmail.com';

export default defineEventHandler(async (event) => {
  if (!event.path.startsWith('/admin')) return;

  const session = await getUserSession(event);

  if (!session?.user?.email || session.user.email !== OWNER_EMAIL) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
  }
});
