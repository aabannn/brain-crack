# Brain Genius (Crack-Head)

A static frontend that talks directly to Supabase (Postgres + Auth) —
no server to host or run.

## Why this was necessary

The original file stored all player data through `window.storage`, an
API that only exists inside Claude.ai's artifact sandbox. This version
replaces it with a real Postgres database on Supabase, so the game can
be hosted anywhere.

The admin password also used to live in plain text inside the HTML,
visible to anyone who viewed source. It's now a real login handled by
Supabase Auth, checked server-side by Supabase, not by anything in the
browser.

## Structure

```
brain-genius/
  supabase/
    schema.sql        run once in the Supabase SQL Editor
  frontend/            Static site, no build step, no server
    index.html         includes the Supabase JS client via CDN
    css/style.css
    js/
      config.js        SUPABASE_URL / SUPABASE_ANON_KEY / ADMIN_EMAIL
      api.js           Supabase client calls (replaces the old fetch() layer)
      renderers.js      the 5 mini-games (unchanged logic)
      game.js           round loop, timer, HUD, scoring
      leaderboard.js
      admin.js
      main.js           registration screen wiring
```

## One-time setup

**1. Create a Supabase project** at supabase.com (free tier is fine).

**2. Run the schema** — Dashboard → SQL Editor → paste the contents of
`supabase/schema.sql` → Run. This creates the `players` table and three
functions (`register_player`, `submit_result`, `toggle_winner`) that
enforce the game's rules server-side — a player can only raise their
own best score, never overwrite someone else's row, and only a signed-in
admin session can toggle winner status.

**3. Create the admin account** — Dashboard → Authentication → Users →
Add user. Use any email (e.g. `admin@your-event.local`) and a real
password. This is the only account that can mark winners.

**4. Fill in `frontend/js/config.js`**:
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` — Dashboard → Project Settings → API.
  The anon key is *meant* to be public; it has no power beyond what the
  RLS policy and function grants in `schema.sql` allow.
- `ADMIN_EMAIL` — must match the email from step 3. The login screen
  still only asks for a password; this constant supplies the email
  behind the scenes.

## Running it

The frontend is plain static files — no build step, no npm install.

```bash
cd frontend
python3 -m http.server 8080
# open http://localhost:8080
```

To make it playable by other people on their own phones, deploy the
`frontend/` folder to any static host (Netlify, Vercel, GitHub Pages —
all free, drag-and-drop or Git-connected). Share that URL, or a QR code
pointing at it.

## Known limitations / things to harden before a real contest

- Anyone can call `register_player`/`submit_result` with any phone
  number — there's no OTP or phone verification, matching the trust
  level of the original artifact version.
- `toggle_winner` only requires *any* signed-in Supabase user, not
  specifically the one admin account — fine as long as you don't
  create other user accounts in this project.
- No rate limiting; for a small event this isn't a concern.
