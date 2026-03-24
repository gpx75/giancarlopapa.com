import { z } from 'zod';

export default defineMcpPrompt({
  description:
    'Summarize the professional profile of Giancarlo Papa for a specific audience',
  inputSchema: {
    audience: z
      .enum(['recruiter', 'technical', 'client'])
      .default('recruiter')
      .describe('Target audience for the summary')
  },
  handler: async ({ audience }) => {
    const audienceContext: Record<string, string> = {
      recruiter:
        'Focus on years of experience, key technologies, role progression, and availability.',
      technical:
        'Focus on architecture decisions, tech stack depth, and engineering practices.',
      client:
        'Focus on deliverables, reliability, communication style, and project outcomes.'
    };

    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Summarize the professional profile of Giancarlo Papa. ${audienceContext[audience]} Use the get-profile and get-skills tools to gather the necessary data.`
          }
        }
      ]
    };
  }
});
