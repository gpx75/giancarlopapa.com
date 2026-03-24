import { z } from 'zod';

export default defineMcpTool({
  description:
    'Get professional profile information for Giancarlo Papa including role, location, summary, and experience',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false
  },
  inputSchema: {
    section: z
      .enum(['hero', 'about', 'experience', 'stats', 'all'])
      .default('all')
      .describe('Which profile section to retrieve')
  },
  inputExamples: [
    { section: 'hero' },
    { section: 'experience' },
    { section: 'all' }
  ],
  cache: '5m',
  handler: async ({ section }) => {
    const profile = await $fetch('/api/_content/query/profile', {
      method: 'GET'
    }).catch(() => null);

    if (!profile) {
      throw createError({
        statusCode: 500,
        message: 'Failed to load profile data'
      });
    }

    const data =
      section === 'all'
        ? profile
        : (profile as Record<string, unknown>)[section];

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(data, null, 2)
        }
      ]
    };
  }
});
