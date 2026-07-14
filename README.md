# Flow Studio client portal — phase 1

Phase 1 scope: client login (magic link, no passwords) + a dashboard showing
their plan, flyer usage, and their requests. No request submission, file
delivery, or messaging yet — that's phase 2+.

## 1. Create the Supabase project

1. Go to supabase.com → New project.
2. Once it's ready: Project Settings → API. Copy the **Project URL** and the
   **anon public** key.
3. Copy `.env.local.example` to `.env.local` and paste those two values in.

## 2. Set up the database

1. In the Supabase dashboard: SQL Editor → New query.
2. Paste in the contents of `supabase/schema.sql` and run it.
3. Go to Authentication → Providers, and make sure **Email** is enabled
   with "Confirm email" OFF for magic links to work smoothly (or leave it
   on if you'd rather clients confirm first — up to you).
4. Authentication → URL configuration → add your site URL (once deployed)
   and `http://localhost:3000` for local testing, plus
   `/auth/callback` as an allowed redirect on both.

## 3. Add yourself as a test client

Since request creation and Stripe automation aren't built yet, add a row
by hand to test the dashboard:

1. Authentication → Users → Invite a test user (your own email).
2. Table editor → `clients` → insert a row:
   - `auth_user_id`: the user id from the step above
   - `business_name`: whatever you like
   - `tier`: `growth`
   - `renews_at`: any future date
3. Table editor → `requests` → insert a row or two with that `client_id`,
   e.g. `title: "Weekend brunch flyer"`, `type: flyer`, `status: submitted`.

## 4. Run it locally

```
npm install
npm run dev
```

Visit `http://localhost:3000` — it'll redirect to `/login`. Enter the
email you invited in step 3, click the magic link from your inbox, and
you should land on the dashboard with your test data.

## 5. Deploy

Push this to a GitHub repo, then import it in Vercel (vercel.com → New
Project). Add the same two environment variables from `.env.local` in
Vercel's project settings, then deploy. Update the Supabase redirect URLs
(step 2.4) to include your live Vercel URL once you have it.

## What's next (not built yet)

- A "New request" form so clients submit their own requests instead of
  you adding rows by hand
- A staff-side view for you to see every client's requests in one queue
  and update status / attach delivered files
- File storage (Supabase Storage) for delivered flyers
- The Stripe webhook that auto-creates a `clients` row (with the right
  tier) the moment someone subscribes
