export default defineEventHandler((event) => {
  const {
    public: { siteUrl }
  } = useRuntimeConfig(event);

  const lines = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /contact',
    'Disallow: /book',
    'Disallow: /resume',
    `Sitemap: ${siteUrl}/sitemap.xml`
  ];

  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8');

  return lines.join('\n');
});
