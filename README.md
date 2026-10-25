# Safarscape

Lead-capture website and staff console for the Safarscape travel agency — built from the Paper designs (file *Test-Paper*).
Travellers browse trips and send enquiries; nothing is booked or paid online. Every enquiry is saved first, then emailed to the team, and managed in a small CRM.

**Stack:** Next.js 16 (App Router, React 19, TypeScript) · Tailwind CSS v4 · Drizzle ORM on Postgres (embedded PGlite locally) · Zod · Vitest · Playwright.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. No database or keys needed: the app creates an embedded Postgres in `./.data`, runs migrations and seeds demo content on first start.

Staff console: http://localhost:3000/admin — demo accounts (password `Safarscape#2026`):

| Role    | Email                   | Can |
|---------|-------------------------|-----|
| Owner   | owner@safarscape.test   | Everything, incl. team & agency settings |
| Manager | priya@safarscape.test   | All leads, catalogue, content, reports, email routing |
| Sales   | arjun@safarscape.test   | Own + unassigned leads; read-only catalogue |

> Demo staff, leads ("Demo lead · …"), reviews ("Sample") and hotel names "(demo)" are placeholders. Replace them — and change the passwords — before launch. Contact details are empty until set in **Admin → Agency & WhatsApp**.

Start over with a fresh database: `npm run db:reset`.

## Tests

```bash
npm test            # 50 unit/integration tests (Vitest, in-memory Postgres)
npm run e2e:install # once: download Playwright's Chromium
npm run test:e2e    # builds, starts a server on an in-memory DB, runs 28 browser tests (desktop + mobile)
npm run test:all    # lint + typecheck + both suites
```

Covered: enquiry submission (save → team email → auto-reply, failure + retry, honeypot, rate limit, duplicates, routing), validation (client and server, Indian + international phone normalisation), auth (lockout, sessions, password reset), role permissions (server-side), lead status changes (lost reason required, timeline), CSV export (formula-injection safe), package publishing (blocked until complete, publish/unpublish visibility), filters/sort/pagination, SEO output, mobile layouts.

## What's where

```
src/app/(site)/        Public pages: home, packages, package detail, destinations, custom trip, guides, about, reviews, gallery, contact, legal, search, enquiry confirmation
src/app/admin/(auth)   Sign in, forgot / reset password
src/app/admin/(console) Dashboard, leads CRM, packages, destinations, content, reports, settings
src/app/api/enquiries  Public enquiry endpoint (JSON)
src/proxy.ts           Redirects signed-out visitors away from /admin (roles are checked again on the server)
src/lib/               Domain logic: enquiries, leads, catalogue, auth, permissions, reports, email, validation
src/db/                Drizzle schema, connection, demo seed
drizzle/               SQL migrations (generate with `npm run db:generate` after editing the schema)
tests/unit, tests/e2e  Vitest and Playwright suites
```

## How enquiries work

1. Visitor submits (package dialog, custom-trip planner, destination callback or contact form). UTM parameters and referrer from their first visit are attached.
2. Server validates (Zod), checks the honeypot and Turnstile (if configured), rate-limits by IP and phone, and returns the existing reference for a duplicate within 10 minutes.
3. The enquiry is **saved to the database first**, with a reference like `SFS-24817`.
4. Team notification goes to the recipients in Admin → Email & routing (plus any destination-specific routes); the traveller gets the auto-reply if they gave an email.
5. Email failures never lose a lead: the lead is flagged "Email failed" and can be retried from its page. Every attempt is in the lead's Emails tab.
6. The browser fires `generate_lead` (GA4) / `Lead` (Meta Pixel) — only if the visitor accepted analytics cookies.

**Conversion rate** = leads created in the period that are now *Converted* ÷ all leads created in the period.

## Deploying

Any Node host works (Vercel, Render, Railway, a VPS). For Vercel:

1. Create a Postgres database (Neon or Supabase) and set `DATABASE_URL`.
2. Set `NEXT_PUBLIC_SITE_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, and optionally Turnstile, GA4 and Meta Pixel keys (see `.env.example`).
3. Set `SEED_ADMIN_PASSWORD` for the first boot (or sign in and change passwords immediately), then set `SEED_DEMO_LEADS=false` / delete the demo content.
4. Deploy. Migrations run on first request.

Integration status: Resend, Turnstile, GA4 and Meta Pixel are wired in but **have not been tested against live accounts** — they need real keys. Use **Admin → Email & routing → Send test email** to confirm delivery once keys are set.
