# AI Merge Games

An English-first playground for original 2D browser game mashups, built on the existing ShipAny Next application.

## Current state

- Homepage, creation workspace, three playable handcrafted examples, four guides, tool directory and legal pages.
- Email/password accounts and a private game library.
- Durable generation jobs, a configurable OpenAI-compatible adapter, one automatic repair, owner-scoped game APIs and standalone HTML downloads.
- Atomic generation debits and idempotent failed-job refunds.
- Stripe integration with an administrator-only sandbox fixture. The public product catalog is empty.
- **Live generation and purchases are disabled by default.** No provider keys or real paid products are included.

The examples are original games inspired by gameplay mechanics. This application does not combine commercial game files, provide installed-game mods, or redistribute third-party assets.

## Cloudflare deployment

The public preview is hosted on Cloudflare Workers with a dedicated D1 database:

- Website: https://aimergegames.org
- Isolated player: https://aimergegames-player.jokemike75.workers.dev
- App configuration: `wrangler.jsonc`; player configuration: `cloudflare/player.wrangler.jsonc`.
- Public prerendered pages use a dedicated Cloudflare KV incremental cache; account and private game data use D1.
- Generation queue: `aimergegames-generation`; background consumer: `aimergegames-tasks` (`cloudflare/tasks.wrangler.jsonc`).
- Private browser validator: `aimergegames-validator` (`cloudflare/validator.wrangler.jsonc`). It has only a Browser Run binding, with no database or provider secrets.

Authenticate with `pnpm exec wrangler login`, then deploy changes:

```text
pnpm cf:build
pnpm cf:deploy:player
pnpm cf:deploy:validator
pnpm cf:deploy
pnpm cf:deploy:tasks
```

The project uses the patched Next.js 16.4.1 release. A tracked pnpm patch omits native Sharp from the Worker bundle; site images and the social preview are static assets. The postbuild step inlines the middleware manifest required by the adapter. These compatibility changes do not affect the normal local Node build.

Both Workers set `keep_names: false`: runtime functions are serialized into the sandbox document, so bundler-injected name helpers must not enter their function bodies. Keep the player on its separate origin.

Workers Paid is active, confirmed in Cloudflare's subscriptions dashboard on October 16, 2026 ($5/month base plus usage). The Worker uses the plan's default CPU allowance. Before the upgrade and KV caching, runtime tests encountered the Free plan's CPU-limit errors. Live checks now pass for all three playable examples, signup, sign-in, the private library, closed generation, public indexing URLs and layouts at 390, 768 and 1440 pixels. The disposable QA account was removed after verification. Deployment scripts never change the billing plan. See [Cloudflare pricing](https://developers.cloudflare.com/workers/platform/pricing/).

The build script takes public URLs and the database provider from `wrangler.jsonc` so browser code and server bindings agree. Authentication and configuration encryption use independent production secrets stored in Cloudflare (`AUTH_SECRET`, `CONFIG_ENCRYPTION_KEY`); never copy local development secrets into the deployment or commit them. Preserve production secrets across deployments.

Generate schema changes with `pnpm db:generate:cloudflare`, review the SQL in `cloudflare/migrations`, then apply approved migrations with `pnpm db:migrate:cloudflare`. Never upload a development database. This deployment's initial database contains no local fixture accounts, model keys, or payment keys.

Verify D1 config encryption and writes locally with `pnpm exec wrangler d1 migrations apply aimergegames-db --local`, then `pnpm test:cloudflare-db`. Run `pnpm test:cloudflare-browser` to check public layouts, examples and indexing URLs. The optional `node scripts/cloudflare-check.mjs --account` also creates a disposable live QA account to verify signup, login, the library and closed-generation response; delete only the recorded QA user afterwards. QA reports are saved under ignored `output/playwright/`.

**Cloudflare hosts the preview release: examples, guides, accounts and private library. Live generation and purchases remain closed on D1**, even if administrator flags change. The production task backend uses a durable queue and a private RPC processor. Native D1 batches handle game-job debits, saves and refunds; interactive transactions remain rejected for other business flows. The app calls the isolated validator through its private `GAME_VALIDATOR` service binding. Backend generation acceptance has passed; public launch acceptance remains separate. No live billing is enabled by this deployment.

The app entrypoint is `cloudflare/app-worker.mjs`, which preserves the generated OpenNext exports and adds a named `GameTaskEntrypoint`. Only the task consumer's service binding can call its processing/recovery methods; no HTTP endpoint exposes them. Model credentials remain encrypted in the app database and are never placed in queue messages. The task consumer has no public route or provider secret.

Deploy the main app before the consumer so the named RPC entrypoint exists. On first setup create the queue with `wrangler queues create aimergegames-generation --message-retention-period-secs 3600`. The consumer processes one message per batch with concurrency capped at two. Duplicate deliveries cannot claim an active job. A cron runs every minute to refund expired jobs and republish pending jobs whose initial delivery was interrupted. An interrupted model request is not restarted by queue redelivery; its job expires and refunds. Queue and cron usage follow the existing Cloudflare account plan.

Run `pnpm test:game-d1` for an isolated local D1 integration test covering atomic rollback, concurrent submission, FIFO debits, repeated refunds, leases, late completion, queue failure, recovery and a fixed-response model/validator pipeline. It creates a separate local database and never sends real model requests. Missing validator bindings fail before a model call and return the consumed credit. The `GAME_VALIDATOR` service binding accepts only generated code and returns a bounded PNG preview after isolated startup checks.

Live task-backend acceptance was completed on October 17, 2026. Queue delivery reached the private processor; repeated deliveries returned the consumed credit only once. The cron recovered a pending job that had never been published to the queue, and separately expired an unclaimed overdue job with one refund. All three disposable accounts and their associated credits, jobs and games were removed after verification. These checks made no model requests. Public generation and purchases remain closed pending production isolated validation and full generated-game acceptance.

Later on October 17, 2026, the private validator and its app binding were deployed. Live browser checks passed for all three examples, invalid code, an infinite loop followed by a healthy new session, restricted game APIs and a browser-service guardrails 403 for an external request. A real queued task used the owner's saved official DeepSeek configuration to generate **Vault of Ember**, passed isolated validation and atomically saved one private artifact with one consumed credit. The disposable task account and all related records were removed. No browser sessions remained after verification. Production build, fixed-response model/credit tests, D1 integration, and public layout/example checks also passed. Public generation and purchases remain closed for launch acceptance and payment setup.

## Run locally

Requirements: Node.js 22+ and pnpm. SQLite is the default database.

```text
pnpm install
pnpm setup:local
pnpm db:setup
pnpm db:push
pnpm rbac:init
pnpm dev
```

Open http://localhost:3000. The development launcher starts the application, a separate game player at http://127.0.0.1:3001, and the persistent task worker.

Local configuration is saved to the ignored `.env.development` file. The setup command creates random authentication and configuration-encryption secrets without printing them, and preserves an existing configuration. Back up that file with the database; changing the encryption key prevents previously encrypted settings from being read.

Use **localhost** for the account application and **127.0.0.1** for the player. Ports alone do not isolate cookies. Do not reverse-proxy generated games onto the account origin.

### Administrator access

Create an account in the application, then promote that account:

```text
pnpm rbac:init --admin-email=YOUR_ACCOUNT_EMAIL
```

Configure providers under `/admin/settings`. No model or payment API keys belong in public environment variables.

### Individual processes

```text
pnpm dev:app
pnpm dev:runner
pnpm dev:worker
pnpm dev:validator
```

The runner binds only to the local loopback interface. To use a different application port, set `GAME_PARENT_ORIGINS` for the runner to the exact allowed parent origins. Set `NEXT_PUBLIC_GAME_RUNNER_ORIGIN` for the app, and rebuild if changing it for production.

## Isolated startup validation

Production uses Cloudflare Browser Run with the official pinned `@cloudflare/playwright` driver. Each check launches a new browser session and context with no saved cookies, account data, application files or model credentials. Generated code runs in the shared Canvas Web Worker runtime. The validator is private: no custom domain, `workers.dev` route or preview URL exposes it.

The browser session is created with `guardrails: {allowedDomains: []}` to deny all external HTTP/HTTPS requests at the browser service. CSP, request interception, blocked WebSockets and disabled worker network APIs provide additional restrictions. No application page is visited. Checks cover first frame, visible response to directional input, runtime errors, action input and restart, then return a PNG. Browser checks have an 18-second deadline; the service has a 22-second overall deadline and closes the browser afterwards. Sessions are never reused. A 30-second idle expiry also limits abandoned sessions. Passing startup checks is not a full gameplay or security audit.

Run `pnpm test:game-validator` with Chrome installed for the shared checks against the three examples, invalid code, an infinite loop, cancellation deadlines, isolation, endpoint guards and safe errors. This test spends no model balance. Production browser isolation is managed by Cloudflare; it does not enforce the local Docker configuration's specific CPU or memory quota. [Browser session guardrails](https://developers.cloudflare.com/browser-run/features/guardrails/) and [pricing](https://developers.cloudflare.com/browser-run/pricing/) were reviewed October 17, 2026. Browser usage follows the existing Workers Paid plan: 10 browser-hours/month included, then $0.09/hour, with separate concurrency charges above the included monthly average of 10. The generation consumer remains capped at two concurrent jobs.

The local validation coordinator retains a separate Docker option. Docker is not needed to play included examples or use the deployed validator.

```text
docker build -f scripts/validator/Dockerfile -t ai-merge-validator .
pnpm dev:validator
```

The coordinator binds to `127.0.0.1:3002`. Each check starts a disposable container with no network, no application files or secrets, a read-only filesystem, one CPU, a 512 MB memory limit and a 20-second deadline. Only the generated code is passed through stdin. Chromium checks first render, movement, runtime errors and restart, then returns a PNG preview.

The coordinator requires a working Docker daemon. Do not replace it with in-process evaluation of model code. Docker validation could not be run on this development host because Docker was unavailable. Its container configuration is supplied for local use; production uses the separately deployed browser service described above.

## Model configuration and opening generation

In **Admin → Settings → AI**, configure:

- `openai_base_url`: defaults to `https://api.deepseek.com`.
- `openai_api_key`: the provider key.
- `openai_model`: defaults to `deepseek-flash` (DeepSeek V4.1 Flash).

The selected provider is the official DeepSeek API. Its non-secret defaults are shared by the game adapter and administrator form. Enter the API key in the **DeepSeek / Compatible API** password field, save, then use **Test**. Keys are encrypted in the production database and masked in the form. No API key is included in source or browser bundles.

The adapter calls `/chat/completions` with `response_format: json_object`, `stream: false`, a 10,000-token output limit and a 60-second deadline. On `api.deepseek.com` it explicitly sends `thinking: {type: disabled}`; other compatible endpoints do not receive DeepSeek-only parameters. The administrator connection test uses the same transport and JSON mode with a 256-token budget. It proves API access and valid JSON, not playable-game quality. Invalid keys, insufficient balance, rate limits, truncated/empty/malformed output and oversized responses fail explicitly. Automatic repair remains capped at one retry.

Official references checked October 16, 2026: [API and model ID](https://api-docs.deepseek.com/), [thinking and request parameters](https://api-docs.deepseek.com/api/create-chat-completion/), [JSON output](https://api-docs.deepseek.com/guides/json_mode/). Request-contract tests use fixed responses and spend no API balance. The owner's key, task backend and production validator are configured; a real backend generation has passed as recorded above. Public launch acceptance remains separate.

Requests use manual redirect handling because Workers rejects `redirect: error`. Any redirect fails without following its destination or forwarding the API key.

On October 16, 2026, the deployed administrator connection check successfully called the official `deepseek-flash` model using the owner's encrypted saved key and received valid JSON. That check verified API connectivity and JSON mode only. The subsequent real backend generation, isolated validator and atomic D1 acceptance are recorded above. The temporary network-diagnostic Worker was removed.

Generation remains closed until **both** `game_generation_enabled` and `game_generation_verified` are true and the three model settings are present. Verify model generation, isolated validation, repairs, refunds, restart and downloads before setting the verified flag.

Users registered after opening generation receive two trial credits by default. The initial-credit settings can adjust that amount and expiry; do not change them without updating the public trial copy. Accounts created while generation is closed receive no automatic trial grant; use the administrator credit tool when testing those existing accounts.

## Queue and game runtime

- A generation request includes a UUID idempotency key.
- A unique active-user constraint allows one unfinished job per account.
- Job creation and credit consumption share a transaction (SQLite) or a native atomic batch (D1).
- The 180-second deadline starts at submission. Each model call is limited to 60 seconds. At most one repair is attempted.
- The worker claims jobs with a compare-and-set update. Its lease token prevents stale workers from committing results.
- Failed and expired jobs restore their consumed credit once inside the same transaction or D1 batch.
- Jobs are durable across page reloads and worker restarts. The cloud cron refunds expired jobs even when no browser is open. Locally, the Node worker processes expiry after restart.
- Games are private by default and soft-deleted from the library.

The generated contract is `createGame({canvas, ctx, width, height})`, returning `update(dt,input)`, `draw()` and `getState()`. Game logic runs in an OffscreenCanvas worker on the separate player origin. Network access is blocked by CSP; the worker has no DOM or account credentials. A watchdog terminates an unresponsive worker. This constrains browser-side execution but does not provide a browser memory quota.

Downloads are **one self-contained HTML file**, containing the runtime, code and controls. Open it in a current browser with Canvas worker support.

## Payments

The public catalog in `src/config/pricing.ts` is intentionally empty. The old demo subscriptions are disabled.

For sandbox checkout testing only:

1. Use a Stripe **test** secret key and webhook signing secret in the admin settings.
2. Set `GAME_PAYMENT_TEST_MODE=true` in the local development configuration and restart.
3. Sign in as an administrator.
4. Send the existing checkout endpoint a `product_id` of `stripe_test_pack` and `payment_provider` of `stripe`.

That fixture represents USD 1.00 and two test credits. It is excluded from the public catalog and unavailable when `NODE_ENV=production`. No genuine Stripe checkout has been performed without account credentials.

Actual purchases additionally require verified generation, `game_purchases_enabled=true`, `game_payments_verified=true`, and real server-side catalog entries. Prices, pack sizes and expiry remain undecided. Publish those terms, configure the operator contact and verify Stripe sandbox checkout before enabling purchases. Client-supplied prices and credits are ignored.

## Verification

```text
pnpm test:games
pnpm dev
pnpm test:browser
pnpm build
```

The core test suite creates an isolated database under `.test-data`. It covers fixture model output, repair limits, task idempotency, concurrent debits, refunds, timeouts, owner isolation, deletion, Stripe signatures and duplicate payment notifications.

The browser check uses a temporary Google Chrome session, not a personal browser profile. It checks 390/768/1440 CSS-pixel layouts, examples, movement, restart, touch-control bounds, account creation, closed generation, public routes, parent isolation and worker termination. Chrome must be installed, or update the launch configuration for another local test browser. Screenshots and the report are saved under `output/playwright`.

A browser check creates a uniquely named local QA account. These tests use fixed local model and Stripe webhook fixtures and do not spend model credits or collect money. Browser checks of untrusted-worker behavior do not substitute for the Docker validator acceptance check.

## SEO and content

The English public pages provide canonical URLs, a generated social image, sitemap entries, WebSite/SoftwareApplication JSON-LD and Article markup. Account, administration, API and private-game routes are excluded from indexing. Untranslated product pages redirect to their English routes; Chinese account infrastructure is retained without adding false translation alternates.

Melty descriptions are attributed to its public homepage and FAQ, reviewed October 16, 2026. The launcher was not installed or independently security-audited. Keyword search volume is unverified; the implementation makes no traffic or ranking guarantee.

## Before opening paid generation

The public preview, task backend and isolated browser validator use Cloudflare as described above. The backend has passed a real generation task; public launch still requires acceptance of account/trial-credit flows, the complete user journey and the opening gates. Paid access additionally needs verified production payment transactions, published commercial terms, operator identity and support contact. Use generated/reviewed database migrations for production rather than `db:push`.
