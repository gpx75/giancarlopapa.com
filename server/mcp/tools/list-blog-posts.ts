export default defineMcpTool({
  description:
    'List all published blog posts with title, description, date, and tags',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false
  },
  inputSchema: {},
  cache: '5m',
  handler: async () => {
    const posts = await $fetch('/api/_content/query/blog', {
      method: 'GET'
    }).catch(() => null);

    if (!posts) {
      throw createError({
        statusCode: 500,
        message: 'Failed to load blog posts'
      });
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(posts, null, 2)
        }
      ]
    };
  }
});
