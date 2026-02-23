import { defineContentConfig, defineCollection, z } from '@nuxt/content'

const actionLinkSchema = z.object({
  label: z.string(),
  to: z.string(),
  icon: z.string().optional(),
  external: z.boolean().optional()
})

export default defineContentConfig({
  collections: {
    content: defineCollection({
      type: 'page',
      source: '**/*.{md,json}'
    }),

    blog: defineCollection({
      type: 'page',
      source: 'blog/**/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string(),
        date: z.string(),
        tags: z.array(z.string()).optional(),
        draft: z.boolean().optional()
      })
    }),

    profile: defineCollection({
      type: 'data',
      source: 'profile.json',
      schema: z.object({
        hero: z.object({
          name: z.string(),
          role: z.string(),
          location: z.string(),
          availability: z.string(),
          summary: z.string(),
          actions: z.array(actionLinkSchema),
          contactLinks: z.array(z.object({
            label: z.string(),
            to: z.string(),
            icon: z.string()
          }))
        }),
        about: z.array(z.string()),
        stats: z.array(z.object({
          label: z.string(),
          value: z.string()
        })),
        experience: z.array(z.object({
          company: z.string(),
          role: z.string(),
          period: z.string(),
          location: z.string(),
          summary: z.string(),
          achievements: z.array(z.string()),
          stack: z.array(z.string())
        })),
        projects: z.array(z.object({
          name: z.string(),
          summary: z.string(),
          links: z.array(actionLinkSchema),
          stack: z.array(z.string())
        })).optional(),
        skills: z.array(z.object({
          label: z.string(),
          items: z.array(z.string())
        })),
        writing: z.array(z.object({
          title: z.string(),
          description: z.string(),
          platform: z.string(),
          to: z.string(),
          publishedAt: z.string()
        })).optional(),
        contact: z.object({
          headline: z.string(),
          subline: z.string(),
          cta: z.object({
            label: z.string(),
            to: z.string()
          })
        })
      })
    }),

    resume: defineCollection({
      type: 'data',
      source: 'giancarlo_papa_resume.json',
      schema: z.object({
        basics: z.object({
          name: z.string(),
          label: z.string().optional(),
          image: z.string().optional(),
          email: z.string().optional(),
          phone: z.string().optional(),
          url: z.string().optional(),
          summary: z.string().optional(),
          location: z.object({
            address: z.string().optional(),
            postalCode: z.string().optional(),
            city: z.string().optional(),
            countryCode: z.string().optional(),
            region: z.string().optional()
          }).optional(),
          profiles: z.array(z.object({
            network: z.string(),
            username: z.string().optional(),
            url: z.string().optional()
          })).optional()
        }),
        work: z.array(z.object({
          name: z.string(),
          location: z.string().optional(),
          position: z.string().optional(),
          url: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          summary: z.string().optional(),
          highlights: z.array(z.string()).optional()
        })).optional(),
        education: z.array(z.object({
          institution: z.string(),
          location: z.string().optional(),
          studyType: z.string().optional(),
          area: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          gpa: z.string().optional()
        })).optional(),
        skills: z.array(z.object({
          name: z.string(),
          level: z.string().optional(),
          keywords: z.array(z.string()).optional()
        })).optional(),
        languages: z.array(z.object({
          language: z.string(),
          fluency: z.string().optional()
        })).optional(),
        interests: z.array(z.object({
          name: z.string(),
          keywords: z.array(z.string()).optional()
        })).optional()
      })
    }),

    skills: defineCollection({
      type: 'data',
      source: 'skills.json',
      schema: z.object({
        label: z.string(),
        icon: z.string(),
        skills: z.array(z.object({
          name: z.string(),
          level: z.enum(['expert', 'advanced', 'proficient', 'familiar']),
          years: z.number().optional(),
          icon: z.string()
        }))
      })
    }),

    colophon: defineCollection({
      type: 'data',
      source: 'colophon.json',
      schema: z.object({
        label: z.string(),
        name: z.string(),
        description: z.string(),
        url: z.string()
      })
    })
  }
})
