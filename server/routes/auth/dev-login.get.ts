export default defineEventHandler(async (event) => {
  if (process.env.NODE_ENV === 'production') {
    throw createError({ statusCode: 404 });
  }

  // Plain bypass cookie — survives NUXT_SESSION_PASSWORD mismatches between
  // worktree (port 3001) and main dev server (port 3000) sharing localhost.
  setCookie(event, 'dev-admin-bypass', '1', {
    maxAge: 60 * 60 * 8,
    httpOnly: true,
    sameSite: 'lax',
    path: '/'
  });

  // Best-effort session (enables client-side loggedIn / useAuth composables)
  try {
    await setUserSession(event, {
      user: {
        email: 'giancarlo.papa@gmail.com',
        name: 'Giancarlo (dev)',
        avatar: ''
      }
    });
  } catch {
    // Session password mismatch is OK — bypass cookie handles server-side auth
  }

  // Use an absolute redirect based on the actual request host so the browser
  // stays on port 3001 even when navigated from the preview panel (port 3000).
  const host = getHeader(event, 'host') ?? 'localhost:3001';
  const adminUrl = `http://${host}/admin`;

  setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8');
  return `<!DOCTYPE html><html><head>
<script>window.location.replace(${JSON.stringify(adminUrl)})<\/script>
<meta http-equiv="refresh" content="0; url=${adminUrl}">
</head><body>Redirecting to admin...</body></html>`;
});
