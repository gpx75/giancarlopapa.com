-- Language of an application's documents (tailored CV, cover letter, email).
-- The admin UI detects the job ad's language and suggests switching; the
-- choice is stored here. Existing rows default to English.
alter table public.job_applications
add column if not exists language text not null default 'en'
constraint job_applications_language_check check (language in ('en', 'de', 'fr', 'it'));
