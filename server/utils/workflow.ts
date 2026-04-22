import type {
  ApplicationWorkflow,
  WorkflowStage,
  WorkflowStages,
  WorkflowTransitionPayload,
  StageStatus,
  ReviewChecklist,
  InterviewChecklist
} from '~/types/applications';

/**
 * Source-of-truth state machine for the application workflow.
 *
 * Rules (mirrors the redesign plan):
 * - Every stage transition is explicit. No silent autosaves on `complete`.
 * - Apply cannot be `complete`d unless Review is `done`.
 * - Resetting a `done` stage moves it back to `pending` and rewinds
 *   `current_stage` to it (downstream stages are not touched, but the
 *   workflow history records the rewind).
 * - Re-opening a sent/exported workflow requires `unlock`.
 */

export const STAGE_ORDER: WorkflowStage[] = [
  'analyze',
  'prioritize',
  'cv',
  'cover_letter',
  'review',
  'apply',
  'interview_prep'
];

// Only 'closed' is fully terminal. 'sent' remains in the type for legacy
// data and is normalised to 'interview_prep' on read (see normalizeWorkflow).
const TERMINAL_STAGES: ReadonlyArray<WorkflowStage> = ['closed'];

export function defaultWorkflow(): ApplicationWorkflow {
  return {
    current_stage: 'analyze',
    stages: {
      analyze: { status: 'pending', last_run_at: null },
      prioritize: { status: 'pending', rationale: null },
      cv: { status: 'pending', applied_count: 0, total_count: 0 },
      cover_letter: {
        status: 'pending',
        version_count: 0,
        active_version_id: null
      },
      review: { status: 'pending', checklist: {} },
      apply: {
        status: 'pending',
        mode: null,
        sent_at: null,
        exported_at: null
      },
      interview_prep: {
        status: 'pending',
        notes: null,
        checklist: {},
        scheduled_at: null
      }
    }
  };
}

/**
 * Patch an incoming workflow blob to the current schema:
 *  - fills in interview_prep defaults if the app predates it
 *  - remaps the legacy terminal 'sent' current_stage to 'interview_prep'
 *
 * Call this on EVERY read/write path that consumes workflow from the DB so
 * the state machine and UI never have to branch on schema version.
 */
export function normalizeWorkflow(raw: unknown): ApplicationWorkflow {
  const base = defaultWorkflow();
  if (!raw || typeof raw !== 'object') return base;
  const input = raw as Partial<ApplicationWorkflow>;
  const inStages = (input.stages ?? {}) as Partial<WorkflowStages>;
  const stages: WorkflowStages = {
    analyze: { ...base.stages.analyze, ...(inStages.analyze ?? {}) },
    prioritize: { ...base.stages.prioritize, ...(inStages.prioritize ?? {}) },
    cv: { ...base.stages.cv, ...(inStages.cv ?? {}) },
    cover_letter: {
      ...base.stages.cover_letter,
      ...(inStages.cover_letter ?? {})
    },
    review: {
      ...base.stages.review,
      ...(inStages.review ?? {}),
      checklist: {
        ...base.stages.review.checklist,
        ...(inStages.review?.checklist ?? {})
      }
    },
    apply: { ...base.stages.apply, ...(inStages.apply ?? {}) },
    interview_prep: {
      ...base.stages.interview_prep,
      ...(inStages.interview_prep ?? {}),
      checklist: {
        ...base.stages.interview_prep.checklist,
        ...(inStages.interview_prep?.checklist ?? {})
      }
    }
  };
  // Legacy: old apps land on 'sent' when apply completed. Treat as interview_prep.
  let current = input.current_stage ?? base.current_stage;
  if (current === 'sent') current = 'interview_prep';
  return { current_stage: current, stages };
}

export function isReviewComplete(
  checklist: ReviewChecklist | undefined | null
): boolean {
  if (!checklist) return false;
  return Boolean(
    checklist.jd_read &&
    checklist.scoring_ok &&
    checklist.cv_ok &&
    checklist.cover_letter_ok &&
    checklist.references_ok &&
    checklist.recipient_ok
  );
}

type ActiveStage = keyof WorkflowStages;

function nextPendingStage(stages: WorkflowStages): WorkflowStage {
  for (const stage of STAGE_ORDER as ActiveStage[]) {
    if (stages[stage].status !== 'done') return stage;
  }
  return 'apply';
}

function setStageStatus(
  stages: WorkflowStages,
  stage: WorkflowStage,
  status: StageStatus
): WorkflowStages {
  if (stage === 'sent' || stage === 'closed') return stages;
  const key = stage as ActiveStage;
  const next = { ...stages };
  (next[key] as { status: StageStatus }) = { ...next[key], status };
  return next;
}

/**
 * Apply a stage transition to a workflow. Pure function — does not touch DB.
 * Throws on invalid transitions.
 */
export function applyTransition(
  workflow: ApplicationWorkflow,
  payload: WorkflowTransitionPayload
): ApplicationWorkflow {
  const { stage, action, meta } = payload;

  if (!STAGE_ORDER.includes(stage) && stage !== 'sent' && stage !== 'closed') {
    throw new Error(`Unknown stage: ${stage}`);
  }

  // Unlocking a terminal workflow returns it to the interview_prep stage as in_progress.
  if (action === 'unlock') {
    if (!TERMINAL_STAGES.includes(workflow.current_stage)) {
      throw new Error('Workflow is not locked.');
    }
    return {
      current_stage: 'interview_prep',
      stages: setStageStatus(workflow.stages, 'interview_prep', 'in_progress')
    };
  }

  if (TERMINAL_STAGES.includes(workflow.current_stage)) {
    throw new Error('Workflow is locked. Unlock before further changes.');
  }

  if (action === 'enter') {
    if (stage === 'sent' || stage === 'closed') {
      throw new Error('Cannot enter terminal stage directly.');
    }
    let stages = setStageStatus(workflow.stages, stage, 'in_progress');
    // interview_prep supports autosaving notes/checklist via enter+meta.
    if (stage === 'interview_prep') {
      const cur = stages.interview_prep;
      stages = {
        ...stages,
        interview_prep: {
          ...cur,
          notes:
            typeof meta?.notes === 'string' ? meta.notes : (cur.notes ?? null),
          checklist:
            (meta?.checklist as InterviewChecklist | undefined) ??
            cur.checklist,
          scheduled_at:
            typeof meta?.scheduled_at === 'string'
              ? meta.scheduled_at
              : (cur.scheduled_at ?? null)
        }
      };
    }
    return { current_stage: stage, stages };
  }

  if (action === 'reset') {
    if (stage === 'sent' || stage === 'closed') {
      throw new Error('Cannot reset terminal stage.');
    }
    const stages = setStageStatus(workflow.stages, stage, 'pending');
    return { current_stage: stage, stages };
  }

  if (action === 'complete') {
    if (stage === 'apply') {
      if (workflow.stages.review.status !== 'done') {
        throw new Error('Review must be completed before Apply.');
      }
      const mode =
        meta?.mode === 'export' || meta?.mode === 'send' ? meta.mode : null;
      const stages: WorkflowStages = {
        ...workflow.stages,
        apply: {
          status: 'done',
          mode,
          sent_at:
            mode === 'send'
              ? new Date().toISOString()
              : (workflow.stages.apply.sent_at ?? null),
          exported_at:
            mode === 'export'
              ? new Date().toISOString()
              : (workflow.stages.apply.exported_at ?? null)
        },
        interview_prep: {
          ...workflow.stages.interview_prep,
          status:
            workflow.stages.interview_prep.status === 'done'
              ? 'done'
              : 'in_progress'
        }
      };
      return { current_stage: 'interview_prep', stages };
    }

    if (stage === 'interview_prep') {
      const notes =
        typeof meta?.notes === 'string'
          ? meta.notes
          : (workflow.stages.interview_prep.notes ?? null);
      const checklist =
        (meta?.checklist as InterviewChecklist | undefined) ??
        workflow.stages.interview_prep.checklist;
      const scheduled_at =
        typeof meta?.scheduled_at === 'string'
          ? meta.scheduled_at
          : (workflow.stages.interview_prep.scheduled_at ?? null);
      const stages: WorkflowStages = {
        ...workflow.stages,
        interview_prep: {
          ...workflow.stages.interview_prep,
          status: 'done',
          notes,
          checklist,
          scheduled_at
        }
      };
      return { current_stage: 'closed', stages };
    }

    if (stage === 'review') {
      const checklist =
        (meta?.checklist as ReviewChecklist | undefined) ??
        workflow.stages.review.checklist;
      if (!isReviewComplete(checklist)) {
        throw new Error('All review checks must be ticked.');
      }
      const stages: WorkflowStages = {
        ...workflow.stages,
        review: { status: 'done', checklist }
      };
      return { current_stage: nextPendingStage(stages), stages };
    }

    if (stage === 'sent' || stage === 'closed') {
      throw new Error('Cannot complete terminal stage directly.');
    }

    let stages = setStageStatus(workflow.stages, stage, 'done');

    // Per-stage side-effects on completion.
    if (stage === 'analyze') {
      stages = {
        ...stages,
        analyze: {
          ...stages.analyze,
          status: 'done',
          last_run_at: new Date().toISOString()
        }
      };
    }
    if (stage === 'prioritize' && typeof meta?.rationale === 'string') {
      stages = {
        ...stages,
        prioritize: { status: 'done', rationale: meta.rationale }
      };
    }

    return { current_stage: nextPendingStage(stages), stages };
  }

  throw new Error(`Unknown workflow action: ${String(action)}`);
}

/**
 * Recompute lightweight stage counters from current DB-derived facts.
 * Called by stage panels that mutate sub-resources (CV suggestions, cover letters)
 * to keep the workflow in sync without forcing the user to re-trigger transitions.
 */
export function refreshStageCounters(
  workflow: ApplicationWorkflow,
  patch: Partial<{
    cv_applied_count: number;
    cv_total_count: number;
    cover_letter_version_count: number;
    cover_letter_active_version_id: number | null;
    analyze_last_run_at: string;
  }>
): ApplicationWorkflow {
  const stages: WorkflowStages = { ...workflow.stages };

  if (
    typeof patch.cv_applied_count === 'number' ||
    typeof patch.cv_total_count === 'number'
  ) {
    stages.cv = {
      ...stages.cv,
      applied_count: patch.cv_applied_count ?? stages.cv.applied_count,
      total_count: patch.cv_total_count ?? stages.cv.total_count
    };
  }
  if (
    typeof patch.cover_letter_version_count === 'number' ||
    patch.cover_letter_active_version_id !== undefined
  ) {
    stages.cover_letter = {
      ...stages.cover_letter,
      version_count:
        patch.cover_letter_version_count ?? stages.cover_letter.version_count,
      active_version_id:
        patch.cover_letter_active_version_id !== undefined
          ? patch.cover_letter_active_version_id
          : (stages.cover_letter.active_version_id ?? null)
    };
  }
  if (patch.analyze_last_run_at) {
    stages.analyze = {
      ...stages.analyze,
      last_run_at: patch.analyze_last_run_at
    };
  }

  return { ...workflow, stages };
}
