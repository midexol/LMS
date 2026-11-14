# Automated tests

## Commands

| Command | What it does | Cost |
|---|---|---|
| `npm test` | Runs the whole suite (about 730 tests, about 1 minute) | free |
| `npm run test:watch` | Re-runs affected tests as you edit | free |
| `npm run test:coverage` | Suite plus a coverage report (`coverage/index.html`) | free |
| `npm run typecheck:tests` | Type-checks the test files themselves | free |
| `npm run test:live` | Calls the **real** AI provider from `.env` to check grading end to end | a few cents; Gemini's free tier allows about 20 requests/day per model |

Run `npm test` before every push.

## Safety

- The normal suite **never touches your database**. Prisma is replaced by an in-memory fake (`tests/helpers/mocks.ts`),
  and `DATABASE_URL` is set to an unusable address. `tests/lib/safety-and-utils.test.ts` fails if that ever changes.
- No real API keys are loaded. Paystack, Google sign-in, Cloudflare R2, SMTP and AI calls are all faked.
- Only `npm run test:live` uses real credentials, and it uses no database.

## What is covered

| Folder | Covers |
|---|---|
| `tests/lib` | sessions and cookies, rate limiting (memory and Redis), Paystack payments and webhook signatures, **AI grading** (prompts, provider choice, fallback grader, Gemini model fallback), email (including HTML escaping), private file links |
| `tests/api` | every API route: registration, login, password reset, email verification, Google sign-in, grading, progress, completion/certificates, discussion, payments, announcements, course builder, grade overrides, uploads, admin tools, contact form, route protection middleware |
| `tests/pages` | server-rendered pages: who is redirected where, what data each page loads, paid-content signing |
| `tests/ui` | the screens in a simulated browser: login, signup, password reset, landing page and contact form, checkout, course player, student profile, catalog, instructor studio, course builder, admin dashboard |
| `tests/contracts` | rules over the **whole codebase**: every route checks authentication unless explicitly public, no error text leaks, rate limits are awaited, security headers, schema matches the code, no invented institutional claims in user-facing text |
| `tests/live` | real AI grading and the tutor assistant (opt-in) |

## Adding a feature

1. Add a route? `tests/contracts` will fail until it checks the signed-in user (or you add it to the public list with a reason).
2. Write tests next to the matching file in `tests/api` or `tests/ui`. Helpers: `loginAs("TUTOR")`, `call(handler, path, { body })`, and `prismaMock.<model>.<method>.mockResolvedValue(...)`.
3. Use a fresh user per test (the helpers do this) so rate limits never leak between tests.

## Known limits

- These tests use a fake database, so they cannot catch a wrong Prisma query shape or a missing column. Try new database-touching features once against a real database.
- Real Paystack, Google sign-in, Cloudflare R2 uploads and email delivery are not exercised.
- The tests run in a simulated browser; they do not check how pages look, or real mobile behaviour.
