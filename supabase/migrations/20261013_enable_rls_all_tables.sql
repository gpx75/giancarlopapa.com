-- Lock every app table to the server.
--
-- All reads and writes go through Nitro handlers using the service-role key,
-- which bypasses RLS; the browser never queries these tables. The anon key is
-- public (it ships in the client bundle), so a table without RLS is readable
-- and writable by anyone — Supabase flagged job_applications and
-- cover_letters (rls_disabled_in_public).
--
-- RLS on with no policies = no access for anon/authenticated. Revoking the
-- table grants as well keeps the tables closed even if a permissive policy is
-- added by mistake later. Both statements are idempotent.

alter table public.job_applications              enable row level security;
alter table public.job_suggestions               enable row level security;
alter table public.application_cv_suggestions    enable row level security;
alter table public.cover_letters                 enable row level security;
alter table public.contact_submissions           enable row level security;
alter table public.inbox_messages                enable row level security;
alter table public.application_workflow_history  enable row level security;
alter table public.application_reference_letters enable row level security;
alter table public.outbox                        enable row level security;

revoke all on table
  public.job_applications,
  public.job_suggestions,
  public.application_cv_suggestions,
  public.cover_letters,
  public.contact_submissions,
  public.inbox_messages,
  public.application_workflow_history,
  public.application_reference_letters,
  public.outbox
from anon, authenticated;
