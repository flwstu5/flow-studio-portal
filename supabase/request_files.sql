-- Requests previously supported only one delivered file (requests.file_path).
-- This table lets staff attach multiple files to a single delivery (e.g.
-- PNG + PDF + source file) without breaking anything that still reads
-- requests.file_path as "the latest/primary file" (kept in sync on every
-- upload — see uploadDeliverable in app/staff/actions.js).
create table if not exists request_files (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  file_path text not null,
  uploaded_at timestamptz not null default now()
);

create index if not exists request_files_request_id_idx on request_files (request_id);

-- Backfill: carry every request's existing single file into the new table
-- so nothing already delivered is missing from the multi-file list.
insert into request_files (request_id, file_path, uploaded_at)
select r.id, r.file_path, coalesce(r.delivered_at, r.created_at)
from requests r
where r.file_path is not null
  and not exists (
    select 1 from request_files rf where rf.request_id = r.id and rf.file_path = r.file_path
  );
