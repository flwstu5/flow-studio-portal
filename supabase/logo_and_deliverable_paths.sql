-- Documentation gap fix: these two columns have been used throughout the
-- app since early on (client logo upload, deliverable file upload) but
-- were never captured in a tracked migration file — they were added via
-- an ad-hoc instruction in an earlier session. They almost certainly
-- already exist in the live database (the app has been working), so this
-- is a safe no-op if so. Included here so the schema is fully reproducible
-- from the supabase/ folder alone.
alter table clients add column if not exists logo_path text;
alter table requests add column if not exists file_path text;
