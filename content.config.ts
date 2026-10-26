import { defineContentConfig, defineCollection, z } from '@nuxt/content';

const actionLinkSchema = z.object({
  label: z.string(),
  to: z.string(),
  icon: z.string().optional(),
  external: z.boolean().optional()
});

// Only content the public site renders is a collection: every collection is
// shipped to the browser as a downloadable SQL dump (/__nuxt_content/*). The
// resume (phone, email), its translations, reference letters and other private
// files in content/ are imported server-side only — never add them here.
export default defineContentConfig({
  collections: {
    blog: defineCollection({
      type: 'page',
      source: 'blog/**/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string(),
        date: z.string(),
        image: z.string().optional(),
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
          summary: z.array(z.string()),
          highlights: z
            .array(
              z.object({
                emoji: z.string(),
                text: z.string(),
                to: z.string().optional()
              })
            )
            .optional(),
          invitation: z.string().optional(),
          summaryLink: z.string().optional(),
          actions: z.array(actionLinkSchema),
          contactLinks: z.array(
            z.object({
              label: z.string(),
              to: z.string(),
              icon: z.string()
            })
          )
        }),
        latest: z
          .object({
            kicker: z.string(),
            title: z.string(),
            postLabel: z.string(),
            runLabel: z.string(),
            allPostsLabel: z.string(),
            allRunsLabel: z.string()
          })
          .optional(),
        about: z.array(z.string()),
        stats: z.array(
          z.object({
            label: z.string(),
            value: z.string()
          })
        ),
        experience: z.array(
          z.object({
            company: z.string(),
            role: z.string(),
            period: z.string(),
            location: z.string(),
            summary: z.string(),
            achievements: z.array(z.string()),
            stack: z.array(z.string())
          })
        ),
        skills: z.array(
          z.object({
            label: z.string(),
            items: z.array(z.string())
          })
        ),
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

    skills: defineCollection({
      type: 'data',
      source: 'skills.json',
      schema: z.object({
        categories: z.array(
          z.object({
            label: z.string(),
            icon: z.string(),
            skills: z.array(
              z.object({
                name: z.string(),
                level: z.enum(['expert', 'advanced', 'proficient', 'familiar']),
                years: z.number().optional(),
                icon: z.string()
              })
            )
          })
        )
      })
    }),

    colophon: defineCollection({
      type: 'data',
      source: 'colophon.json',
      schema: z.object({
        items: z.array(
          z.object({
            label: z.string(),
            name: z.string(),
            description: z.string(),
            url: z.string()
          })
        )
      })
    }),

    legal: defineCollection({
      type: 'data',
      source: 'legal.json',
      schema: z.object({
        meta: z.object({
          lastUpdated: z.string(),
          governed: z.string()
        }),
        legalNotice: z.object({
          name: z.string(),
          location: z.string(),
          websiteUrl: z.string(),
          note: z.string()
        }),
        privacy: z.object({
          controller: z.string(),
          dataCollection: z.array(
            z.object({
              label: z.string(),
              description: z.string()
            })
          ),
          cookies: z.array(
            z.object({
              name: z.string(),
              description: z.string(),
              optOut: z
                .object({
                  url: z.string(),
                  label: z.string()
                })
                .optional()
            })
          ),
          processors: z.array(
            z.object({
              service: z.string(),
              purpose: z.string(),
              country: z.string()
            })
          ),
          processorNote: z.string(),
          retention: z.string(),
          rights: z.array(z.string())
        }),
        disclaimer: z.object({
          sections: z.array(
            z.object({
              title: z.string(),
              content: z.string()
            })
          ),
          openSource: z.object({
            title: z.string(),
            intro: z.string(),
            licenseText: z.string(),
            githubUrl: z.string(),
            note: z.string()
          })
        })
      })
    }),

    ui: defineCollection({
      type: 'data',
      source: 'ui.json',
      schema: z.object({
        auth: z.object({
          signInTitle: z.string(),
          signInDescription: z.string(),
          providers: z.object({
            github: z.string(),
            google: z.string(),
            linkedin: z.string()
          }),
          signIn: z.string(),
          signOut: z.string()
        }),
        footer: z.object({
          copyright: z.string(),
          tagline: z.string()
        }),
        contact: z.object({
          successTitle: z.string(),
          successDescription: z.string(),
          authTitle: z.string(),
          authDescription: z.string(),
          form: z.object({
            nameLabel: z.string(),
            namePlaceholder: z.string(),
            emailLabel: z.string(),
            emailPlaceholder: z.string(),
            messageLabel: z.string(),
            messagePlaceholder: z.string(),
            honeypotLabel: z.string(),
            submit: z.string()
          }),
          errorTitle: z.string()
        }),
        mobileMenu: z.object({
          title: z.string(),
          bookLabel: z.string(),
          contactLabel: z.string()
        }),
        runs: z.object({
          sportLabels: z.record(z.string(), z.string()),
          statLabels: z.object({
            distance: z.string(),
            pace: z.string(),
            speed: z.string(),
            time: z.string(),
            elevation: z.string(),
            avgHr: z.string()
          })
        })
      })
    })
  }
});
