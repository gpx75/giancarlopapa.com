-- ============================================================================
-- Workflow redesign — Phase A foundations
-- ============================================================================
-- Apply via Supabase SQL editor. Idempotent (safe to re-run).
--
-- Adds:
--   1. job_applications.workflow         jsonb        per-app stage state machine
--   2. job_applications.deleted_at       timestamptz  soft-delete
--   3. application_cv_suggestions        table        persisted, statusful CV suggestions
--   4. application_reference_letters     table        per-app ref-letter selection
--   5. application_workflow_history      table        audit trail / undo source
--   6. job_suggestions.dismissed_at      timestamptz  soft-dismiss (was hard delete)
--   7. job_suggestions.snoozed_until     timestamptz  pause-from-feed
--   8. cover_letters.is_active           boolean      one active version per app
--   9. indexes on hot filter/sort columns
--
-- Backfill strategy for `workflow`:
--   - status = 'saved'                     -> all stages pending
--   - status >= 'applied'                  -> analyze / prioritize / cv / cover_letter
--                                              / review / apply marked done; current = 'sent'
--   - if cover_letters exist               -> cover_letter.version_count populated
--   - if cv_suggestions json non-empty     -> cv.total_count populated
-- ============================================================================
-- ---------------------------------------------------------------------------
-- 1. workflow column on job_applications
-- ---------------------------------------------------------------------------
alter table public.job_applications
add column if not exists workflow jsonb not null default jsonb_build_object(
        'current_stage',
        'analyze',
        'stages',
        jsonb_build_object(
            'analyze',
            jsonb_build_object('status', 'pending'),
            'prioritize',
            jsonb_build_object('status', 'pending'),
            'cv',
            jsonb_build_object(
                'status',
                'pending',
                'applied_count',
                0,
                'total_count',
                0
            ),
            'cover_letter',
            jsonb_build_object('status', 'pending', 'version_count', 0),
            'review',
            jsonb_build_object('status', 'pending', 'checklist', '{}'::jsonb),
            'apply',
            jsonb_build_object('status', 'pending')
        )
    );
-- ---------------------------------------------------------------------------
-- 2. soft-delete on job_applications
-- ---------------------------------------------------------------------------
alter table public.job_applications
add column if not exists deleted_at timestamptz;
create index if not exists idx_job_applications_deleted_at on public.job_applications (deleted_at)
where deleted_at is null;
create index if not exists idx_job_applications_status on public.job_applications (status)
where deleted_at is null;
create index if not exists idx_job_applications_match_rate on public.job_applications (match_rate desc nulls last)
where deleted_at is null;
-- ---------------------------------------------------------------------------
-- 3. persisted CV suggestions
-- ---------------------------------------------------------------------------
create table if not exists public.application_cv_suggestions (
    id bigserial primary key,
    application_id bigint not null references public.job_applications(id) on delete cascade,
    run_id uuid not null default gen_random_uuid(),
    section text not null,
    issue text not null,
    suggestion text not null,
    priority text not null check (priority in ('high', 'medium', 'low')),
    status text not null default 'pending' check (status in ('pending', 'applied', 'dismissed')),
    applied_note text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index if not exists idx_app_cv_suggestions_app_id on public.application_cv_suggestions (application_id, created_at desc);
create index if not exists idx_app_cv_suggestions_run on public.application_cv_suggestions (application_id, run_id);
-- ---------------------------------------------------------------------------
-- 4. per-app reference-letter selection
-- ---------------------------------------------------------------------------
create table if not exists public.application_reference_letters (
    id bigserial primary key,
    application_id bigint not null references public.job_applications(id) on delete cascade,
    letter_slug text not null,
    attached_at timestamptz not null default now(),
    unique (application_id, letter_slug)
);
create index if not exists idx_app_ref_letters_app_id on public.application_reference_letters (application_id);
-- ---------------------------------------------------------------------------
-- 5. workflow history (audit + undo source)
-- ---------------------------------------------------------------------------
create table if not exists public.application_workflow_history (
    id bigserial primary key,
    application_id bigint not null references public.job_applications(id) on delete cascade,
    stage text not null,
    action text not null,
    meta jsonb,
    created_at timestamptz not null default now()
);
create index if not exists idx_app_workflow_history_app_id on public.application_workflow_history (application_id, created_at desc);
-- ---------------------------------------------------------------------------
-- 6. soft-dismiss + snooze on job_suggestions
-- ---------------------------------------------------------------------------
alter table public.job_suggestions
add column if not exists dismissed_at timestamptz,
    add column if not exists snoozed_until timestamptz;
create index if not exists idx_job_suggestions_dismissed_at on public.job_suggestions (dismissed_at)
where dismissed_at is null;
create index if not exists idx_job_suggestions_status_created on public.job_suggestions (status, created_at desc)
where dismissed_at is null;
-- ---------------------------------------------------------------------------
-- 7. cover_letters.is_active (one active version per application)
-- ---------------------------------------------------------------------------
alter table public.cover_letters
add column if not exists is_active boolean not null default false;
-- Partial unique index: at most one active cover letter per application.
create unique index if not exists uniq_cover_letter_active_per_app on public.cover_letters (application_id)
where is_active;
create index if not exists idx_cover_letters_app_id on public.cover_letters (application_id, created_at desc);
-- ---------------------------------------------------------------------------
-- 8. inbox + outbox supporting indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_inbox_messages_received_at on public.inbox_messages (received_at desc);
-- (inbox→application linking will be added in a follow-up phase)
-- ---------------------------------------------------------------------------
-- 9. backfill — only for pre-existing rows
-- ---------------------------------------------------------------------------
-- Mark all stages done for applications already past the saved stage.
update public.job_applications
set workflow = jsonb_build_object(
        'current_stage',
        'sent',
        'stages',
        jsonb_build_object(
            'analyze',
            jsonb_build_object(
                'status',
                case
                    when match_rate is not null then 'done'
                    else 'pending'
                end
            ),
            'prioritize',
            jsonb_build_object(
                'status',
                case
                    when priority is not null then 'done'
                    else 'pending'
                end
            ),
            'cv',
            jsonb_build_object(
                'status',
                case
                    when cv_suggestions is not null then 'done'
                    else 'pending'
                end,
                'applied_count',
                0,
                'total_count',
                coalesce(jsonb_array_length(cv_suggestions), 0)
            ),
            'cover_letter',
            jsonb_build_object('status', 'done', 'version_count', 0),
            'review',
            jsonb_build_object('status', 'done', 'checklist', '{}'::jsonb),
            'apply',
            jsonb_build_object(
                'status',
                'done',
                'mode',
                'send',
                'sent_at',
                applied_at
            )
        )
    )
where status in (
        'applied',
        'interviewing',
        'offered',
        'accepted',
        'rejected',
        'withdrawn'
    )
    and (workflow->>'current_stage') = 'analyze';
-- Migrate any inline cv_suggestions json into the new table (only once).
insert into public.application_cv_suggestions (
        application_id,
        section,
        issue,
        suggestion,
        priority,
        status
    )
select a.id,
    coalesce(s->>'section', 'General'),
    coalesce(s->>'issue', ''),
    coalesce(s->>'suggestion', ''),
    case
        when s->>'priority' in ('high', 'medium', 'low') then s->>'priority'
        else 'medium'
    end,
    'pending'
from public.job_applications a,
    jsonb_array_elements(coalesce(a.cv_suggestions, '[]'::jsonb)) s
where jsonb_typeof(a.cv_suggestions) = 'array'
    and not exists (
        select 1
        from public.application_cv_suggestions x
        where x.application_id = a.id
    );
-- ============================================================================
-- end of migration
-- ============================================================================