# Sealed

A private, two-person web app: each of you has one "current" letter to the
other, optionally with a photo or PDF attached. When the other person opens
the shared link, the letter appears sealed — tapping it plays a short reveal
animation and marks it read. Writing a new letter overwrites your previous
one.

No accounts, no passwords. Access is controlled by a single high-entropy
link (see "Security model" below).

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS**, custom design tokens (see "Design direction")
- **Supabase** — Postgres (data) + Storage (attachments)
- **Upstash Redis** — rate limiting
- **Vercel** — hosting + CI/CD
- **Vitest** (unit) + **Playwright** (e2e)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run everything in `supabase/schema.sql`.
3. Go to **Storage** → **New bucket** → name it exactly `attachments` →
   set it to **Private** (not public).
4. Go to **Project Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role key** (not the `anon` key) → `SUPABASE_SERVICE_ROLE_KEY`

The service role key bypasses Row Level Security and must **never** be
exposed to the browser. It's only ever imported in `src/lib/supabase.ts`,
which is marked `server-only` so an accidental client-side import fails
the build instead of leaking the key.

### 3. Create an Upstash Redis database

1. Create a free database at [upstash.com](https://upstash.com).
2. Copy the **REST URL** and **REST Token** into `UPSTASH_REDIS_REST_URL`
   and `UPSTASH_REDIS_REST_TOKEN`.

### 4. Set environment variables

```bash
cp .env.example .env.local
# fill in the four values from steps 2–3
```

### 5. Run it locally

```bash
npm run dev
```

Open `http://localhost:3000`, create a space, and open the generated link
in a second browser (or incognito window) to act as the other person.

## CI/CD

`.github/workflows/ci.yml` runs on every PR and push to `main`: lint,
type-check, unit tests, build, and a Playwright smoke test.

To wire up deployment:

1. Import the GitHub repo into [Vercel](https://vercel.com).
2. Add the four environment variables (step 4 above) in **Project
   Settings → Environment Variables**, for both Preview and Production.
3. Done — Vercel deploys a unique preview URL on every PR (commented on
   the PR automatically) and deploys to production on every merge to
   `main`. No extra workflow file is needed for this part.
4. In GitHub, go to **Settings → Branches** and add a branch protection
   rule on `main` requiring the `test` check to pass before merging —
   this is what makes the pipeline actually enforce quality rather than
   just report it.

`.github/dependabot.yml` opens weekly PRs for outdated npm and GitHub
Actions dependencies.

## Testing

- **Unit tests** (`npm run test`): cover validation logic (message
  length, attachment type/size rules) and slug generation. No network
  or database needed.
- **E2E tests** (`npm run test:e2e`): currently one smoke test that
  checks the landing page renders. It deliberately does **not** exercise
  the create-space → write-message → open-popup flow, because that
  needs real Supabase and Upstash credentials that CI doesn't have.

  To get full e2e coverage of that flow, create a second, disposable
  Supabase project for testing, add its credentials as GitHub Actions
  secrets, and extend `playwright.config.ts`'s `webServer.env` to use
  them — then write tests in `tests/e2e/` that create a space, send a
  message, and assert the popup appears. This is a deliberate scope cut
  for the initial scaffold, not an oversight.

## Security model

- **Access control**: the slug is a 21-character random string
  (~125 bits of entropy, `src/lib/slug.ts`). This — not rate limiting —
  is what makes the link unguessable.
- **Rate limiting** (`src/lib/ratelimit.ts`): a secondary defense
  against infrastructure cost/abuse, not the primary access control.
  Lookup, write, and upload each have separate limits.
- **Attachments**: validated on both client (`AttachmentUpload.tsx`,
  instant feedback) and server (`src/lib/validation.ts`, the actual
  enforcement) — jpeg/png up to 5MB, PDF up to 10MB. Stored in a
  **private** bucket; the app only ever hands out short-lived (10 min)
  signed URLs, generated per page view.
- **Service role key**: server-only, never sent to the browser (see
  step 2 above).

If you ever add real user accounts, revisit the empty RLS policies in
`supabase/schema.sql` — they're currently absent because all access
goes through the API routes using the service role key.

## Design direction

The palette and type choices deliberately avoid the generic "AI app"
look (cream `#F4F1EA` + terracotta `#D97757`, default shadcn styling,
Inter everywhere, centered-card-on-white layouts):

- **Type**: Fraunces (a characterful serif) for the letter content
  itself and the wordmark; Public Sans for UI chrome; IBM Plex Mono
  for timestamps. Two families with distinct jobs, not one font doing
  everything.
- **Color**: a stone/paper/wine-wax palette (`tailwind.config.ts`) tied
  to the "sealed letter" concept, not a generic SaaS blue/purple.
- **The one animated moment**: the wax seal cracking and the letter
  rising out of the envelope (`Envelope.tsx`) is the single deliberate
  interaction in the app — everything else stays quiet by comparison,
  so that moment isn't competing for attention.
- **Reduced motion**: `globals.css` disables all animation for users
  with `prefers-reduced-motion: reduce`.

If you want to change the palette or fonts, everything is centralized
in `tailwind.config.ts` and `src/app/layout.tsx` — nothing is
hardcoded in individual components.

## Known limitations / next steps

- The "which person am I" role is a local, per-device label
  (`src/lib/role.ts`) stored in `localStorage`, not real authentication.
  Clearing browser storage means picking again.
- No email/push notification when a new letter arrives — the recipient
  has to visit the link to see it. Adding this would mean introducing
  an email service (e.g. Resend) or Web Push, which needs its own
  permission flow.
- No image compression on upload — a 5MB JPEG is stored as-is.
