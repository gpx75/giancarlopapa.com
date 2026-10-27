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
    return withResumePhone(structuredClone(resumeJson));
  }

  // The phone number is never in the JSON (see withResumePhone); hide the email too.
  const resume = structuredClone(resumeJson);
  const { email: _email, ...publicBasics } = resume.basics;

  return {
    ...resume,
    basics: publicBasics
  };
});
