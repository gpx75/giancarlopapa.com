import resumeJson from '../../../content/giancarlo_papa_resume.json';

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, {
    'Cache-Control': 'no-store, max-age=0',
    Pragma: 'no-cache',
    'X-Robots-Tag': 'noindex, nofollow, noarchive'
  });

  const session = await getUserSession(event);
  const isLoggedIn = Boolean(session.user);

  if (isLoggedIn) {
    return structuredClone(resumeJson);
  }

  const resume = structuredClone(resumeJson);
  const { email: _email, phone: _phone, ...publicBasics } = resume.basics;

  return {
    ...resume,
    basics: publicBasics
  };
});
