export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  if (!session.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  return sendRedirect(event, '/giancarlo_papa_resume.pdf', 302);
});
