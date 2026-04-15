import type { JobSearchResult } from './types';

/**
 * Tech/engineering terms used to filter out obviously irrelevant jobs.
 * Built from common software engineering role keywords + the candidate's tech stack.
 * Case-insensitive matching against job title + description.
 */
const RELEVANCE_TERMS = new Set([
  // Role keywords
  'software', 'engineer', 'developer', 'entwickler', 'programmer', 'architect',
  'devops', 'sre', 'fullstack', 'full-stack', 'full stack', 'frontend', 'front-end',
  'backend', 'back-end', 'tech lead', 'technical lead', 'cto', 'vp engineering',
  'platform', 'infrastructure', 'cloud', 'data engineer', 'ml engineer',
  'web developer', 'web engineer', 'application developer',
  // Tech stack from resume
  'php', 'laravel', 'vue', 'vuejs', 'vue.js', 'nuxt', 'nuxtjs', 'nuxt.js',
  'javascript', 'typescript', 'node', 'nodejs', 'node.js', 'react', 'angular',
  'python', 'java', 'kotlin', 'swift', 'rust', 'go', 'golang', 'ruby',
  'c#', '.net', 'dotnet', 'c++', 'scala',
  'aws', 'azure', 'gcp', 'kubernetes', 'k8s', 'docker', 'terraform',
  'ci/cd', 'cicd', 'jenkins', 'github actions', 'gitlab',
  'postgresql', 'mysql', 'redis', 'mongodb', 'elasticsearch',
  'api', 'rest', 'graphql', 'microservice',
  'agile', 'scrum',
  'ai', 'machine learning', 'llm', 'genai',
  'linux', 'unix',
  'html', 'css', 'tailwind',
  // IT/tech generics
  'it ', 'ict', 'informatik', 'informatiker', 'informatics',
  'programmier', 'entwicklung', 'technik'
]);

/** Flattened terms for quick iteration */
const termsArray = Array.from(RELEVANCE_TERMS);

/**
 * Check if a job is relevant to a software engineering candidate.
 * Uses fast keyword matching against title + description.
 * Returns true if the job appears to be tech/engineering related.
 */
export function isRelevantJob(job: JobSearchResult): boolean {
  const text = `${job.title} ${job.description}`.toLowerCase();
  return termsArray.some(term => text.includes(term));
}

/**
 * Filter an array of job results to only include relevant tech/engineering roles.
 * Logs the number of filtered-out results for debugging.
 */
export function filterRelevantJobs(jobs: JobSearchResult[]): JobSearchResult[] {
  const relevant = jobs.filter(isRelevantJob);
  const dropped = jobs.length - relevant.length;
  if (dropped > 0) {
    console.log(`[relevance] Filtered out ${dropped}/${jobs.length} irrelevant jobs`);
  }
  return relevant;
}
