-- Lets clients leave a quick 1-5 star rating once a request is delivered.
alter table requests add column if not exists rating smallint;
alter table requests add column if not exists rating_submitted_at timestamptz;
alter table requests add constraint requests_rating_range check (rating is null or (rating between 1 and 5));
