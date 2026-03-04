import resumeJson from '../../../content/giancarlo_papa_resume.json';

export default defineEventHandler(async (event) => {
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
