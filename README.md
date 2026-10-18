# Pratyangi Fashions

Online storefront for Pratyangi Fashions (silk sarees), built from the supplied Figma prototype and screen recording.

**Phase:** the storefront UI is built. A customer-accounts API (sign-up, sign-in, sessions, saved addresses) exists in
`apps/api` and runs locally; see [apps/api/README.md](apps/api/README.md). Products, stock and orders stay in the existing PHP ERP,
which is not connected yet ([docs/ERP_INTEGRATION.md](docs/ERP_INTEGRATION.md)). Production hosting and payments are still planned.
Progress, decisions and open items are tracked in [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md).
The backend design is in [docs/BACKEND_PLAN.md](docs/BACKEND_PLAN.md).
**New to the project?** Every command is explained in plain English in [docs/COMMANDS.md](docs/COMMANDS.md).

## Technology stack

| Layer | Choice | Status |
| --- | --- | --- |
| Frontend framework | Next.js 16 (App Router), static export | Built |
| Language | TypeScript | Built |
| UI library | React 19 | Built |
| Styling | CSS Modules + global CSS variables | Built |
| Animation | Framer Motion + CSS transitions | Built |
| Icons | Lucide React | Built |
| UI state / demo data | React hooks + browser `localStorage` | Built |
| Package manager | pnpm workspace | Built |
| Source control | Git + GitHub | In use |
| Preview deployments | Vercel (production site plus per-branch previews) | Live |
| Accounts API | Node.js + Express 5 (TypeScript) in `apps/api`; Zod 4 validation, `@node-rs/argon2` password hashing, pino logging | Built, runs locally |
| Database | MySQL 8 + Prisma 6, versioned migrations in `apps/api/prisma/migrations` | Built, runs locally |
| API tests | Vitest + Supertest (against a real MySQL test database) | Built |
| Browser tests | Playwright | Built |
| Production hosting | Linux VPS (Nginx + Express under a process manager, MySQL on the same server at first) | Planned |
| Payments, orders, products, stock | Stay in the PHP ERP; not connected yet | Planned |

Not used by the storefront: Tailwind CSS, Vite. The storefront stays on Next.js with CSS Modules.
The existing shared cPanel hosting is not used for the store's backend (see the backend plan for why).

## Quick start

Requirements: **pnpm 10** and **Node.js**. The website needs Node 20.9+; the API and its tests need Node 22.12+ or 24.
Node 22 or 24 is recommended (developed on Node 24, CI uses Node 22).

```bash
npm install -g pnpm@10          # once; or: corepack enable
git clone https://github.com/NinjaStudios/pratyangi-fashions-web.git      # original/upstream project
# or: git clone https://github.com/Saikiran-Avusula/test-shoping.git      # personal test copy (not the upstream)
cd <the-cloned-folder>          # pratyangi-fashions-web, or test-shoping for the test copy
pnpm install
pnpm dev                        # http://localhost:3000
```

Original/upstream project: <https://github.com/NinjaStudios/pratyangi-fashions-web>.
Personal test copy: <https://github.com/Saikiran-Avusula/test-shoping>.

No API keys or environment files are needed to run the UI. Sign-in and sign-up show "not connected" unless an auth mode is
configured (see [Auth modes](#auth-modes-demo-vs-real-api)).

## Commands

Run from the repository root (PowerShell, Command Prompt and bash all work).

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the dev server at http://localhost:3000 |
| `pnpm typecheck` | Check all TypeScript |
| `pnpm build` | Production build; writes the static site to `apps/web/out` |
| `pnpm preview` | Serve the built site at http://localhost:3000 (run `pnpm build` first) |
| `pnpm test` | Build the site in demo auth mode and run the automated browser tests on port 3100 (see [Testing](#testing)) |
| `pnpm test:headed` | Same, in a visible browser window so you can watch |
| `pnpm test:ui` | Same, in Playwright's interactive viewer (pick tests, replay steps, see each screenshot) |
| `pnpm api:dev` | Start the accounts API at http://localhost:4000/api/v1 (needs MySQL and `apps/api/.env`) |
| `pnpm api:typecheck` | Check the API's TypeScript |
| `pnpm api:migrate` | Apply database migrations. Needs MySQL; run it only against a development or `_test` database you control |
| `pnpm api:migrate:dev` | Create and apply a new migration after editing the schema. Needs MySQL; development database only |
| `pnpm api:test` | API tests. Needs MySQL; they EMPTY the tables of the `_test` database in `apps/api/.env.test` |
| `pnpm --filter pratyangi-web run test:e2e:real-mode` | Browser tests of real-account mode with a faked API (no database; web on port 3101) |
| `pnpm --filter pratyangi-web run test:e2e:api` | Browser tests against the real API and MySQL (see [Testing](#testing)) |
| `pnpm --filter pratyangi-api run generate` / `build` / `start` | Generate the Prisma client / build / run the built API |
| `pnpm --filter pratyangi-web add <package>` | Add a dependency to the storefront |

Notes:

- `next start` does not work with a static export; use `pnpm preview`.
- To try the dev site on a phone on the same Wi-Fi, open `http://<your-PC-IP>:3000`. This has not been tested; if
  scripts do not load, add that address to `allowedDevOrigins` in `apps/web/next.config.ts`.
- `pnpm install` also fixes "module not found" errors. Run it again after pulling changes.
- New package versions must be at least one day old (`minimumReleaseAge` in `pnpm-workspace.yaml`; a supply-chain safety setting).

## Project structure

```
apps/
  web/                    The storefront (Next.js)
    src/app/              Routes: /, /new-arrivals, /bag, /checkout, /account, /account/orders,
                          /login, /signup, /forgot-password, /verify-email
    src/components/       account, auth, checkout, home, layout, motion, sections, ui
    src/lib/              catalog, bag, account, address book, checkout, siteConfig, tryOn,
                          auth/ (demo and real-API sign-in, chosen by env vars), motion
    e2e/                  Playwright browser tests (demo auth mode)
    e2e-real-mode/        Browser tests of real-account mode with a faked API
    e2e-api/              Browser tests against the real API and MySQL
    playwright.config.ts, playwright.real-mode.config.ts, playwright.api.config.ts
    public/images/        Images used by the site
    reference/            Design reference screenshots (not shipped)
    .env.example          Website environment variables (copy to .env.local)
  api/                    Customer-accounts API (Express 5 + Prisma + MySQL); see apps/api/README.md
    prisma/               schema.prisma and versioned migrations/
    src/                  auth/, addresses/, security/, erp/port.ts (unconnected ERP contract),
                          app.ts, server.ts, config.ts, db.ts, mailer.ts, validation.ts, errors.ts
    test/                 Vitest + Supertest tests against real MySQL
    .env.example, .env.test.example, README.md
docs/                     COMMANDS.md, PROJECT_STATUS.md, BACKEND_PLAN.md, ERP_INTEGRATION.md
.github/workflows/        test.yml (automated checks on GitHub)
pnpm-workspace.yaml       Workspace and package-age safety setting
CLAUDE.md                 Notes for AI coding assistants working in this repository
```

## Testing

Browser tests use [Playwright](https://playwright.dev) and run against the production build, the same files Vercel serves.
Each test runs twice: at desktop size (1440 × 900) and phone size (375 × 812).

```bash
pnpm --filter pratyangi-web exec playwright install chromium   # once per computer: downloads the test browser
pnpm test                                                      # builds in demo mode, then runs everything (can take a few minutes)
```

`pnpm test` serves the build on port 3100. A good run ends with a passed summary and no failures.

There are four test suites:

| Suite | Command | Needs |
| --- | --- | --- |
| Demo-mode browser tests (`apps/web/e2e`) | `pnpm test` | Nothing else |
| Real-mode browser tests (`apps/web/e2e-real-mode`): the browser fakes the API, web on port 3101 | `pnpm --filter pratyangi-web run test:e2e:real-mode` | Nothing else (no database) |
| API browser tests (`apps/web/e2e-api`): real API on port 4001 and web on port 3100 | `pnpm --filter pratyangi-web run test:e2e:api` | MySQL, and `DATABASE_URL` set in your shell to a migrated database whose name ends in `_test` |
| API tests (`apps/api/test`, Vitest + Supertest) | `pnpm api:test` | MySQL and `apps/api/.env.test` |

**Database warning:** `pnpm api:test` empties the `shop_*` tables and refuses to run unless the database name ends in
`_test`; it applies the migrations to that database itself. `test:e2e:api` does not check the name itself and adds test
accounts, so point `DATABASE_URL` only at a throwaway database whose name ends in `_test` that already has the migrations
applied. Never use real data with either suite.

What the demo-mode suite checks:

- **Every page** (`/`, `/new-arrivals`, `/bag`, `/account`, `/account/orders`) has the right title, no broken images, no
  console errors or failed requests, and no sideways scrolling.
- **Sign-in, account and checkout flows** (see `apps/web/e2e`).
- **Header:** the Shop menu and search dialog open and close with Esc, Tab stays inside the dialog, focus returns to the Search button.
- **Add to cart** raises the bag count.
- **Category carousel:** arrows move it, both arrows disable at the ends, and there is no blank space after the last card.
- **Hero and Shop by Category:** the category cards sit directly under the hero at rest; the hero stays pinned while the
  category section slides over it; the centre model fades out and the left and right models drift outward (outer ones
  further, never crossing); the "Shop by Category" heading has no background, appears only while scrolling and is softly
  blurred only while it overlaps the hero; everything reverses when scrolling back up, and nothing moves with "reduce
  motion" on. Also checked: no sideways scrolling at 320, 375 and 425 px.

In plain words:

- **`pnpm test`** builds the website, then a robot opens it in an invisible browser, clicks around like a visitor and
  checks that everything works. Success ends with a passed summary and no failures; a failure shows a red `x` and what went wrong.
- **`pnpm test:headed`** does the same in a visible browser window, so you can watch the robot work.
- **`pnpm test:ui`** opens Playwright's viewer: choose a test, run it, and step back and forward to see the page at every step.
- **`pnpm --filter pratyangi-web run test:e2e:report`** opens the report of the last run in your browser. Failed tests
  include a screenshot and a video. Press Ctrl + C in the terminal to close it.
- **`pnpm --filter pratyangi-web exec playwright install chromium`** downloads the test browser. Run it once per computer.
- To rerun without rebuilding: `pnpm --filter pratyangi-web exec playwright test` (the last build in `apps/web/out` is used).
- To run one file or one size: `pnpm --filter pratyangi-web exec playwright test hero-scroll --project=desktop`.

Every command in this project, including Git and Vercel, is explained step by step in
[docs/COMMANDS.md](docs/COMMANDS.md).

If a test fails after you change the design on purpose, update the test in `apps/web/e2e` to match.

## Auth modes: demo vs real API

The website picks how sign-in works when it is built, from environment variables:

| Mode | Chosen when | What it does |
| --- | --- | --- |
| API (real) | `NEXT_PUBLIC_API_URL` is set (takes precedence over the demo variable) | Sign-up, sign-in, sessions and addresses go to `<NEXT_PUBLIC_API_URL>/api/v1/...` |
| Demo | `NEXT_PUBLIC_API_URL` is not set and `NEXT_PUBLIC_AUTH_DEMO=true` | Browser-only stand-in so every screen can be clicked through. It is not real authentication |
| Off | Neither is set | Sign-in and sign-up say accounts are "not connected" |

To run real mode locally: start the API as described in [apps/api/README.md](apps/api/README.md) (needs MySQL), put
`NEXT_PUBLIC_API_URL=http://localhost:4000` in `apps/web/.env.local`, then restart `pnpm dev`.

- **Never set `NEXT_PUBLIC_AUTH_DEMO` on the live site.**
- `NEXT_PUBLIC_*` values are baked in at build time: restart `pnpm dev` or rebuild after changing them.
- A `NEXT_PUBLIC_API_URL` left in `apps/web/.env.local` can leak into the `pnpm test` demo build and break the demo tests.
  Remove or comment it out while running `pnpm test`.

## Configuration

- **WhatsApp number and social links:** `apps/web/src/lib/siteConfig.ts`. An empty value shows a disabled
  "pending configuration" state instead of a broken link. These still need the real values from the business.
- **Website environment variables** (all optional; template in `apps/web/.env.example`, copy to `apps/web/.env.local`):
  `NEXT_PUBLIC_API_URL` (store API address), `NEXT_PUBLIC_AUTH_DEMO` (demo mode, see above) and
  `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (public Google sign-in client ID).
- **API environment variables** (templates in `apps/api/.env.example` and `apps/api/.env.test.example`; copy to `.env` and
  `.env.test`): `DATABASE_URL`, `WEB_ORIGIN`, `PORT`, `SESSION_DAYS`, `TRUST_PROXY`, `LOG_LEVEL`, `GOOGLE_CLIENT_ID`,
  `SMTP_URL` and `MAIL_FROM`. What each means is explained in the example files.
- **AI try-on:** `NEXT_PUBLIC_API_URL` is also the base address of the try-on request (`/api/try-on`). `apps/api` has no
  route for it yet, so try-on is not backed by the store API (see [docs/BACKEND_PLAN.md](docs/BACKEND_PLAN.md)).
- Keep secrets in local `.env*` files; they are git-ignored. Never commit them.

## Images

Static export serves images exactly as stored, so file size is page weight. Before adding an image to
`apps/web/public/images`:

- Save it as **WebP**, at most **2× the size it is displayed** (a 250 px wide card needs about 500–640 px).
- Aim for **under 150 KB** for a card or product photo; a full-width banner can be larger.
- Reference it by path, e.g. `/images/reference/product-1.webp`.

Example conversion: `ffmpeg -i in.png -vf "scale=640:-2" -c:v libwebp -quality 82 out.webp`.

## Deploying the frontend

The build output is plain static files in `apps/web/out`, so any static host works.

**Vercel (set up and working):**

- Project: `pratyangi-fashions-web` (account `nstudio706-6425`), connected to this GitHub repository.
- Production site: <https://pratyangi-fashions-web.vercel.app> — redeployed automatically on every push to `main`.
- Every other branch gets its own preview deployment.
- Project settings that matter: **Framework** Next.js, **Root Directory** `apps/web`, **Include source files outside of
  the Root Directory** on. Build and install commands are left at Vercel's defaults (pnpm is detected from the lockfile).
- Preview deployment links (the long `...-nstudio706-6425.vercel.app` addresses) are protected by Vercel login. To show
  one to a client, turn off Deployment Protection for previews in the project settings, or share a protected link
  from the Vercel dashboard.
- Command line (optional): `npm install --global vercel@latest`, then `vercel login`, `vercel whoami`,
  `vercel ls pratyangi-fashions-web`.

If a build fails with `The specified Root Directory ... does not exist`, the Root Directory setting does not match the
folder layout. Set it to `apps/web` under Project Settings → General.

The static site holds only public `NEXT_PUBLIC_*` values (never secrets). For real accounts on a live site,
`NEXT_PUBLIC_API_URL` must point at the live API when the site is built; the API itself is not deployed yet.

**Nginx on a Linux server (example):** upload the contents of `apps/web/out` and serve them with
`try_files $uri $uri.html $uri/ =404;`.

On plain static servers the browser console can show 404s for `__next.*.txt` prefetch files. They are harmless;
navigation falls back to a normal page load.

## Git workflow

- `main` is the stable version. Do each piece of work on a branch (for example `ui/<short-description>`),
  push it, then open a pull request into `main`.
- Commit small, clearly described changes. Never commit passwords, API keys or `.env` files.

## Troubleshooting

- **`Use pnpm instead`** — you ran `npm install` or `yarn install`. Use `pnpm install`.
- **Port 3000 is busy** — stop the other process, or run `pnpm --filter pratyangi-web exec next dev --port 3001`.
- **Stale build errors after moving or deleting files** — delete `apps/web/.next` and run the command again.
- **API fails at start-up or tests fail with a database or environment variable error** — `DATABASE_URL` (and the other API
  variables) are missing. Copy `apps/api/.env.example` to `.env` and `.env.test.example` to `.env.test`, fill them in,
  and make sure MySQL is running. For `test:e2e:api`, set `DATABASE_URL` in your shell.
- **`pnpm api:test` refuses to run because the database name must end in `_test`** — this is a safety check, because
  those tests empty the tables. Point `DATABASE_URL` at a separate test database whose name ends in `_test`.
- **Changed a `NEXT_PUBLIC_*` variable but nothing changed** — they are baked in at build time. Restart `pnpm dev` or run `pnpm build` again.
- **The folder cannot be renamed or deleted on Windows** — close editors and terminals that have it open, then retry.
