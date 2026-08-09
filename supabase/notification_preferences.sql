-- Lets clients opt out of specific email notification types from their
-- profile page. In-app notifications (the Notifications tab) still show
-- regardless — these only gate the Mailgun email send.
alter table clients add column if not exists notify_messages boolean not null default true;
alter table clients add column if not exists notify_delivery boolean not null default true;
