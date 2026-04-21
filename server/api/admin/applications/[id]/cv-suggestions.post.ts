import { serverSupabaseServiceRole } from "#supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import type { CvSuggestion, PersistedCvSuggestion } from "~/types/applications";
import { normalizeWorkflow, refreshStageCounters } from "~~/server/utils/workflow";


const SYSTEM_PROMPT = [
  "You are a senior technical recruiter and CV coach specialising in software engineering roles.",
  "",
  "Generate specific, actionable CV improvement suggestions based on the JD.",
  "",
  "Rules:",
  "- Be specific (name the exact technology, section, or bullet point to change)",
  "- Be actionable",
  "- Prioritise: high = would likely improve shortlisting, medium = good to have, low = minor polish",
  "- Do not repeat what is already strong on the CV",
  "- Maximum 6 suggestions",
  "",
  "Respond with a JSON array only. No markdown fences, no extra text."
].join("\n");

export default defineEventHandler(async (event) => {
  const idParam = getRouterParam(event, "id");
  const id = Number(idParam);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: "Invalid application id." });
  }

  const db = serverSupabaseServiceRole<unknown>(event) as unknown as SupabaseClient;

  const fetchResult = await db
    .from("job_applications")
    .select("id, company, position, job_description, match_breakdown, workflow")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (fetchResult.error || !fetchResult.data) {
    throw createError({ statusCode: 404, message: "Application not found." });
  }
  const app = fetchResult.data;

  if (!app.job_description) {
    throw createError({ statusCode: 400, message: "No job description. Add one first." });
  }

  // Pull prior suggestions so we can preserve history (applied) and avoid repeats.
  const priorRes = await db
    .from("application_cv_suggestions")
    .select("id, status, suggestion, section")
    .eq("application_id", id);
  const prior = (priorRes.data ?? []) as Array<{ id: number; status: string; suggestion: string; section: string }>;
  const appliedPrior = prior.filter(p => p.status === "applied");
  const pendingPrior = prior.filter(p => p.status === "pending");

  const anthropic = useAnthropic();
  const resumeText = await getResumeForPrompt();

  const gaps = (app.match_breakdown?.gaps as string[] | undefined) ?? [];
  const gapsContext = gaps.length ? "\nKnown gaps from match analysis: " + gaps.join(", ") : "";
  const appliedContext = appliedPrior.length
    ? "\n\nThe following improvements were already applied in earlier runs — do NOT repeat them:\n"
      + appliedPrior.map(p => `- [${p.section}] ${p.suggestion}`).join("\n")
    : "";

  const userContent = "Target role: " + app.position + " at " + app.company + gapsContext + appliedContext
    + "\n\nResume:\n" + resumeText
    + "\n\n---\n\nJob Description:\n" + app.job_description;

  let response;
  try {
    response = await callAnthropicWithRetry(anthropic, {
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 2048,
      messages: [{ role: "user", content: userContent }],
      system: SYSTEM_PROMPT
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Unknown AI error";
    console.error("[cv-suggestions] Anthropic error:", errMsg);
    throw createError({ statusCode: 502, message: "AI request failed: " + errMsg });
  }

  const textBlock = response.content.find(b => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw createError({ statusCode: 502, message: "Unexpected AI response format." });
  }

  const FENCE_OPEN = /^[`]{3}(?:json)?\s*\n?/i;
  const FENCE_CLOSE = /\n?[`]{3}\s*$/i;

  let suggestions: CvSuggestion[];
  try {
    const raw = textBlock.text.replace(FENCE_OPEN, "").replace(FENCE_CLOSE, "").trim();
    const parsed = JSON.parse(raw);
    suggestions = Array.isArray(parsed) ? parsed : [];
  } catch {
    console.error("[cv-suggestions] Failed to parse:", textBlock.text.slice(0, 300));
    throw createError({ statusCode: 502, message: "Could not parse AI response." });
  }

  const runId = randomUUID();
  const rows = suggestions.map(s => ({
    application_id: id,
    run_id: runId,
    section: s.section ?? "General",
    issue: s.issue ?? "",
    suggestion: s.suggestion ?? "",
    priority: ["high", "medium", "low"].includes(s.priority) ? s.priority : "medium",
    status: "pending" as const
  }));

  // Supersede prior pending rows so the visible list reflects the latest run.
  // Applied / dismissed history is left untouched.
  if (pendingPrior.length > 0) {
    const supersedeRes = await db
      .from("application_cv_suggestions")
      .update({ status: "dismissed", applied_note: "superseded by newer run" })
      .in("id", pendingPrior.map(p => p.id));
    if (supersedeRes.error) {
      console.warn("[cv-suggestions] Failed to supersede prior pending:", supersedeRes.error.message);
    }
  }

  if (rows.length > 0) {
    const insertResult = await db
      .from("application_cv_suggestions")
      .insert(rows);
    if (insertResult.error) {
      throw createError({ statusCode: 500, message: insertResult.error.message });
    }
  }

  const totalRes = await db
    .from("application_cv_suggestions")
    .select("id", { count: "exact", head: true })
    .eq("application_id", id);
  const appliedRes = await db
    .from("application_cv_suggestions")
    .select("id", { count: "exact", head: true })
    .eq("application_id", id)
    .eq("status", "applied");

  const next = refreshStageCounters(normalizeWorkflow(app.workflow), {
    cv_total_count: totalRes.count ?? 0,
    cv_applied_count: appliedRes.count ?? 0
  });
  await db.from("job_applications").update({ workflow: next }).eq("id", id);

  const all = await db
    .from("application_cv_suggestions")
    .select("*")
    .eq("application_id", id)
    .order("created_at", { ascending: false });

  return all.data as PersistedCvSuggestion[];
});
