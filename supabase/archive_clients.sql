-- Adds soft-delete/archive support for clients. Archived clients are hidden
-- from the default staff clients list but keep all their history (requests,
-- messages, snapshots) intact and can be unarchived at any time.
alter table clients add column if not exists archived_at timestamptz;
