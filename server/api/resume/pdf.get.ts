// The PDF lives in server/assets (not public/) because it contains my phone
// number and email: it is only served to signed-in visitors.
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  if (!session.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  const pdf = await useStorage('assets:server').getItemRaw<Buffer>(
    'giancarlo_papa_resume.pdf'
  );
  if (!pdf) {
    throw createError({ statusCode: 404, statusMessage: 'Resume not found' });
  }

  setResponseHeaders(event, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'inline; filename="giancarlo_papa_resume.pdf"',
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Robots-Tag': 'noindex, nofollow, noarchive'
  });

  return pdf;
});
