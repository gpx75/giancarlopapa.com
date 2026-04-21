-- Add interview_prep stage to the workflow state machine.
--
-- Runtime note: server/utils/workflow.ts#normalizeWorkflow patches any
-- workflow blob that predates this column on read, so the application is
-- safe to ship before this migration runs. The migration brings the DB
-- default and persisted rows in line with the new schema.

-- 1. Bump the column default so new rows include interview_prep.
alter table public.job_applications
  alter column workflow set default jsonb_build_object(
    'current_stage', 'analyze',
    'stages', jsonb_build_object(
      'analyze',        jsonb_build_object('status', 'pending'),
      'prioritize',     jsonb_build_object('status', 'pending'),
      'cv',             jsonb_build_object('status', 'pending', 'applied_count', 0, 'total_count', 0),
      'cover_letter',   jsonb_build_object('status', 'pending', 'version_count', 0),
      'review',         jsonb_build_object('status', 'pending', 'checklist', '{}'::jsonb),
      'apply',          jsonb_build_object('status', 'pending'),
      'interview_prep', jsonb_build_object('status', 'pending', 'checklist', '{}'::jsonb)
    )
  );

-- 2. Backfill: add the interview_prep entry to any pre-existing workflow rows
--    that don't have it yet.
update public.job_applications
   set workflow = jsonb_set(
         workflow,
         '{stages,interview_prep}',
         jsonb_build_object('status', 'pending', 'checklist', '{}'::jsonb),
         true
       )
 where workflow -> 'stages' ? 'interview_prep' = false;

-- 3. Migrate any rows currently parked on the legacy terminal stage 'sent'
--    into the new interview_prep stage (status in_progress) so the user can
--    continue the workflow there. 'closed' remains the only fully terminal
--    stage going forward.
update public.job_applications
   set workflow = jsonb_set(
         jsonb_set(
           workflow,
           '{current_stage}',
           '"interview_prep"'::jsonb,
           true
         ),
         '{stages,interview_prep,status}',
         '"in_progress"'::jsonb,
         true
       )
 where workflow ->> 'current_stage' = 'sent';
