-- Lets staff opt a featured testimonial's delivered file into the marketing
-- site's public Work section. Reuses the testimonials table (rather than a
-- new one) since a portfolio piece is always tied 1:1 to a testimonial —
-- the marketing site joins back to requests for the file + type.
alter table testimonials add column if not exists portfolio_approved boolean not null default false;
