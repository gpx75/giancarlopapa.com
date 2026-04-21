/**
 * Build the "From fit to impact" analysis prompt.
 *
 * Reframes the analysis from describing the candidate (Giancarlo) to
 * Giancarlo evaluating the company. The candidate doesn't need to be
 * told about his own experience — the output should articulate the
 * company's likely pain points, the value he can deliver, and the
 * measurable change he would create.
 *
 * Mantra: "From fit to impact."
 */
export function buildImpactAnalysisPrompt(locationScore: number): string {
  return `You are advising a senior staff engineer (the user) on whether a job is worth pursuing.
The user IS the candidate. Do NOT describe the candidate's experience back to him — he already knows it.
Your job is to flip the perspective: evaluate the COMPANY through the candidate's lens.

GUIDING PERSPECTIVE
"What is broken, inefficient, or missing in this company, and how would I improve it?"

MANTRA
"From fit to impact."

CANDIDATE CONTEXT (background only — do not narrate it back)
- Senior Full Stack Engineer in Elsau ZH, Switzerland (~25 min from Zurich)
- 20+ years building production web platforms; PHP/JS/TS, cloud, AI
- Location pre-scored as ${locationScore}/100. Use this exact value for the location dimension — do not recalculate.

NUMERIC DIMENSIONS (each 0–100, used for the heat-map overview)
- skills:      How well do the candidate's technical skills cover the requirements?
- experience:  Does the candidate's seniority / years / domain shape match?
- industry:    How relevant is the candidate's industry background?
- seniority:   Does the seniority level match?
- techStack:   How many of the required technologies does the candidate already know?

OVERALL match_rate formula (compute precisely):
  skills × 0.27 + techStack × 0.22 + experience × 0.22 + seniority × 0.09 + industry × 0.09 + ${locationScore} × 0.11

NARRATIVE FIELDS — these MUST be written from the candidate's point of view evaluating the company.

- summary (2–3 sentences):
  NOT "Candidate brings X years of Y." Write it as a verdict ON the company:
  what kind of opportunity is this, what would the candidate be walking into, and is it worth his time.

- companyPainPoints (3–5 bullets):
  Read between the lines of the JD. What is likely broken, inefficient, missing, or under-invested
  inside this company? Examples: "Probably accumulating tech debt in a legacy PHP monolith with no
  test coverage," "AI initiative listed without a clear platform — likely greenfield with no MLOps,"
  "Hiring a senior to lead something the existing team can't ship." Be specific to the JD signals.

- valueDelivered (3–5 bullets):
  For each pain point, what would the candidate concretely DO in the first 90 days?
  Verbs first. Examples: "Stand up a CI pipeline + smoke tests around the legacy core,"
  "Replace ad-hoc prompts with a typed gateway and prompt-versioning,"
  "Introduce trunk-based dev + feature flags so they can ship daily."

- measurableImpact (2–4 bullets):
  Quantify the change. Examples: "Reduce lead time from weeks to days,"
  "Cut model spend ~30% via routing + caching," "Bring P95 latency under 200ms,"
  "Halve onboarding time for new engineers." Don't invent metrics — anchor each in the JD signals.

- whyJoin (1–2 sentences):
  The honest pitch FROM the candidate's seat: what makes this worth applying to,
  beyond comp/title? Or, if it isn't, say so plainly.

- strongMatches (max 8): specific technologies / experiences from the JD where the candidate is unambiguously a strong fit.
- gaps (max 6): JD requirements where the candidate is light or absent. State as candidate-facing
  notes ("no formal Kubernetes cert"), not as company-facing weaknesses.

Respond with a SINGLE JSON object only — no markdown fences, no commentary.

Schema:
{
  "match_rate": number,
  "skills": number, "experience": number, "industry": number,
  "seniority": number, "techStack": number,
  "summary": string,
  "companyPainPoints": string[],
  "valueDelivered": string[],
  "measurableImpact": string[],
  "whyJoin": string,
  "strongMatches": string[],
  "gaps": string[]
}`;
}
