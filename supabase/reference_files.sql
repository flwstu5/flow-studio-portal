-- Lets clients attach a reference file (logo, inspiration image, etc.) when
-- submitting a new request. Uploads go through the server action using the
-- service-role client, so no client-side storage RLS policies are needed —
-- the bucket just needs to exist.
insert into storage.buckets (id, name, public)
values ('references', 'references', false)
on conflict (id) do nothing;

alter table requests add column if not exists reference_file_path text;

-- If bucket creation via SQL is blocked in your Supabase project, create it
-- manually instead: Dashboard -> Storage -> New bucket -> name "references",
-- private (not public).
