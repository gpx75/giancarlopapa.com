import { basename, extname, join } from 'node:path';
import { readFile, readdir, stat } from 'node:fs/promises';

interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority?: string;
}

async function walkMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        return walkMarkdownFiles(fullPath);
      }
      if (entry.isFile() && extname(entry.name) === '.md') {
        return [fullPath];
      }
      return [];
    })
  );

  return files.flat();
}

export default defineEventHandler(async (event) => {
  const {
    public: { siteUrl }
  } = useRuntimeConfig(event);

  const staticPages: SitemapEntry[] = [
    { loc: `${siteUrl}/`, changefreq: 'weekly', priority: '1.0' },
    { loc: `${siteUrl}/blog`, changefreq: 'weekly', priority: '0.8' },
    { loc: `${siteUrl}/contact`, changefreq: 'monthly', priority: '0.7' },
    { loc: `${siteUrl}/runs`, changefreq: 'weekly', priority: '0.7' },
    { loc: `${siteUrl}/skillmatrix`, changefreq: 'monthly', priority: '0.7' },
    { loc: `${siteUrl}/colophon`, changefreq: 'monthly', priority: '0.5' },
    { loc: `${siteUrl}/legal`, changefreq: 'yearly', priority: '0.3' }
  ];

  const blogDir = join(process.cwd(), 'content', 'blog');
  let blogEntries: SitemapEntry[] = [];

  try {
    const markdownFiles = await walkMarkdownFiles(blogDir);

    const entries = await Promise.all(
      markdownFiles.map(async (filePath) => {
        const content = await readFile(filePath, 'utf-8');
        if (/^draft:\s*true\s*$/im.test(content)) {
          return null;
        }

        const fileStat = await stat(filePath);
        const slug = basename(filePath, '.md');

        const blogEntry: SitemapEntry = {
          loc: `${siteUrl}/blog/${slug}`,
          lastmod: fileStat.mtime.toISOString(),
          changefreq: 'monthly',
          priority: '0.6'
        };

        return blogEntry;
      })
    );

    blogEntries = [];
    for (const entry of entries) {
      if (entry) {
        blogEntries.push(entry);
      }
    }
  } catch {
    blogEntries = [];
  }

  const allEntries = [...staticPages, ...blogEntries];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allEntries
  .map(
    (entry) => `  <url>
    <loc>${entry.loc}</loc>
${entry.lastmod ? `    <lastmod>${entry.lastmod}</lastmod>\n` : ''}${entry.changefreq ? `    <changefreq>${entry.changefreq}</changefreq>\n` : ''}${entry.priority ? `    <priority>${entry.priority}</priority>\n` : ''}  </url>`
  )
  .join('\n')}
</urlset>`;

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8');

  return xml;
});
