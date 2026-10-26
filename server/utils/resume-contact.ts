// The phone number is private: it is not in the (public) repository but in
// NUXT_RESUME_PHONE, and is added only to the PDFs and for signed-in visitors.

/** Phone number from runtime config; scripts outside Nitro read the env var. */
export function getResumePhone(): string {
  // useRuntimeConfig does not exist when scripts/generate-pdf.mjs loads this via jiti.
  const config = typeof useRuntimeConfig === 'function' ? useRuntimeConfig() : null;
  return config?.resume?.phone || process.env.NUXT_RESUME_PHONE || '';
}

/** Shallow copy of the resume with the private phone number filled in. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withResumePhone<T extends Record<string, any>>(resume: T): T {
  const phone = resume.basics?.phone || getResumePhone();
  return phone ? { ...resume, basics: { ...resume.basics, phone } } : resume;
}
