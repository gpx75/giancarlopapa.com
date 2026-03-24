import { z } from 'zod';

export default defineMcpTool({
  description:
    'Get technical skills and proficiency levels grouped by category (PHP & Web, Cloud & Platform, AI & Data, etc.)',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false
  },
  inputSchema: {
    category: z
      .string()
      .optional()
      .describe(
        'Filter by category label (e.g. "PHP & Web", "Cloud & Platform"). Omit to get all categories.'
      )
  },
  inputExamples: [
    { category: 'PHP & Web' },
    { category: 'Cloud & Platform' },
    {}
  ],
  cache: '5m',
  handler: async ({ category }) => {
    const skills = await $fetch('/api/_content/query/skills', {
      method: 'GET'
    }).catch(() => null);

    if (!skills) {
      throw createError({
        statusCode: 500,
        message: 'Failed to load skills data'
      });
    }

    let data = skills;
    if (
      category &&
      Array.isArray((skills as Record<string, unknown>).categories)
    ) {
      const categories = (skills as Record<string, unknown>)
        .categories as Array<{ label: string }>;
      const filtered = categories.filter((c) =>
        c.label.toLowerCase().includes(category.toLowerCase())
      );
      data = filtered.length > 0 ? filtered : categories;
    }

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
