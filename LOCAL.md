# Local Convex and Shopify

The maintained project is `/Users/keval/Documents/build-sprint-app`. This local setup is the only runtime. The Convex cloud deployment (`neighborly-nightingale-843`, store build-sprint-demo) was retired on 14 October 2026: its deploy script, root Shopify app configuration and legacy custom pixel were removed, and the ignored cloud `.env.local`, `shopify.app.toml` and `.shopify/` were moved to `.local/convex/retired-cloud-2026-10-14/`. The historical replica keeps the cloud data exported on October 12, separate from new Shopify test data. Use the `local:*` commands below for this Mac.

## Start and stop

Run commands from this project with OrbStack open and dependencies installed with `npm ci`.

| Command | Result |
| --- | --- |
| `npm run local:up` | Starts both private Convex instances and the restricted Shopify gateway; rebuilds the sandbox from maintained source. Does not start a public tunnel. |
| `npm run local:status` | Checks the private pages and the public link, when one is running. |
| `npm run local:down` | Stops both local instances, the gateway and the tunnel. Keeps every volume and backup. |
| `npm run local:deploy` | Copies current app source into an ignored build directory, builds it with local settings and uploads to sandbox Convex only. |
| `npm run local:shopify` | Explicitly starts a temporary public tunnel, rebuilds local settings, publishes the development app/extension and updates its collector and checkout subscriptions. An existing healthy tunnel is reused; an expired link is replaced. |
| `npm run local:shopify:stop` | Stops only the public tunnel. |
| `npm run local:shopify:publish` | Retries publishing the current development configuration and refreshing destinations after Shopify access is fixed. |
| `npm run local:shopify:refresh` | Updates the development collector and checkout subscription destinations without publishing an app version. |
| `npm run local:connection:enable` | Allows the sandbox to exchange a real Shopify session for a development-store token. |
| `npm run local:sync:enable` | Enables background synchronization and signed checkout ingestion after a connection exists. |
| `npm run local:verify` | Runs read-only access and asset checks against the currently running public gateway. |
| `npm run local:backup` | Pauses local sync and incoming requests, saves a cold volume archive plus exports and code/configuration, then resumes. |
| `npm run local:restore` | Restores the latest backup into a **new retained volume**, compares records/files, then stops that recovery copy. Never replaces the running sandbox. |

| Instance | App | Backend | Dashboard | Persistent volume |
| --- | --- | --- | --- | --- |
| Historical replica | http://127.0.0.1:3211 | http://127.0.0.1:3210 | http://127.0.0.1:6791 | `hodor-real-data` |
| Fresh sandbox | http://127.0.0.1:6211 | http://127.0.0.1:6210 | http://127.0.0.1:6792 | `checkout-gain-sandbox-data` |

The gateway listens at `http://127.0.0.1:6311`. Every published container port binds to `127.0.0.1`. The public tunnel exposes only that gateway; there is no route from it to the historical instance, dashboard, database administration, storage API, demo data routes or private files. The sandbox and replica have different saved admin keys.

## Shopify identity and first connection

- Development app: **Checkout Gain Local Dev**, app ID `434796920833`, public client ID `f98767012d6e223abbbf0fc931acbbf4`.
- Development store: **Checkout Gain Local Dev Sandbox**, `checkout-gain-local-dev-sandbox.myshopify.com`.
- Permissions: `read_orders`, `read_customer_events`, `write_pixels`.
- Development extension: `checkout-gain-local-evidence`. Its generated identity is kept across local rebuilds.
- Local configuration: `.local/convex/app/shopify.app.local.toml`. There is no root Shopify app configuration.

Open the app from the development store's Shopify admin. Under **Data details**, **Verify Shopify session** checks a real Shopify session, and **Connect test store** exchanges it and imports test data. App credentials remain inside sandbox Convex. After connection, enable synchronization with the command above. The standalone local page shows the app's public report; private store details and changes use the authenticated Shopify page.

Shopify also requires protected customer data access for checkout notifications. If it rejects registration, the command fails and reports the restriction; a working browser collector is not evidence that notifications work. Request only checkout/order data needed by the existing app, without customer names, email, address or phone fields. Do not label a permission-blocked scenario as passed.

The approved development access is configured and real checkout notifications were verified on October 13. The sandbox contains three checkout scenarios and test order #1001. See [the verification record](local/VERIFIED.md) for observed results and test limits.

## Design boundary

`local/runtime.mjs` owns starting, checking, building, publishing and stopping this setup. `local/settings.mjs` owns its local identity and addresses. The application uses the public `shared/deployment.ts` interface; `shared/deploymentTarget.ts` keeps the hosted (non-local) adapter that the tests run against; it no longer points at a running deployment and will be replaced when the public app gets hosting. A separate generated local adapter is used only in `.local/convex/app`. No secret belongs in either public adapter. Local builds reject cloud hostnames or the live store in their assets.

The gateway forwards only listed app assets and Shopify routes to sandbox port 6211. It checks official Shopify session tokens before report reads and writes, and validates notification signatures against unchanged raw bytes. Opening-page `id_token` parameters are discarded, never used to authorize data. Only evidence reads may request Shopify's expired-session retry. Browser checkout events remain untrusted evidence; signed notifications and order synchronization provide separate evidence.

Container images are pinned by digest in `local/compose.yaml` and `local/replica.compose.yaml`. Packages come from this project, not another chat's folder. Main business record formats and calculations are retained. The frozen replica is started/stopped but never rebuilt or given development credentials.

## Recovery

- **After restarting the Mac:** open OrbStack, run `local:up`, then run `local:shopify` only when public testing is wanted. Stale tunnel process records are ignored. No login/startup service is installed.
- **Expired Shopify login:** reopen the development app from Shopify admin and use **Connect test store**. Offline token renewal uses the existing Shopify implementation. If the CLI itself needs login, run the project's Shopify CLI against the named `local` configuration and complete its normal login, then retry `local:shopify:publish`.
- **Stopped/changed tunnel:** run `local:shopify`; it republishes the test app URL and updates pixel/checkout destinations and absolute lifecycle notification URLs. If Shopify refuses any part, the command fails and must be retried after fixing access. Old links stop serving when their tunnel process stops.
- **Port conflict:** local commands refuse startup. Stop the process that owns the conflicting port rather than changing a target to the cloud or another local instance.
- **Operation already running:** let the existing command finish. The lock contains its process ID; runtime commands remove a stale lock only when that process no longer exists.
- **Private diagnostics:** `.local/convex/last-error.log`, `gateway.log`, `tunnel.log`. Do not paste private logs or credential files into public issues.

Backups live in the ignored, owner-only `.local/convex/backups/<timestamp>/` directory. They contain `volume.tar.gz` (database, deployed code, files and backend configuration), `snapshot.zip` (logical table/file export), `source.tar.gz` (generated local app source/config), `maintained-source.tar.gz` (main project code with its hosted test adapter), `runtime.tar.gz` (maintained runtime and this runbook), credentials needed to recover this local instance, hashes and record/file digests. Treat the entire backup as a secret. A backup directory is not an off-machine backup.

`local:restore` verifies hashes before extracting into a new volume named `checkout-gain-restore-*`. The recovery container has **no network and no public or private published ports**. It is queried through Docker's private execution channel and stopped after comparison. The receipt `.local/convex/restore-receipt.json` names the retained volume. To recover for actual use, stop the current sandbox and deliberately point a recovery Compose copy at that named volume with the backed-up key/config; preserve the original volume. The rehearsal command intentionally does not switch active data automatically.

## Earlier evidence retained

The existing replica, old rehearsal volumes and backups have not been removed. Its earlier runbook remains at `/Users/keval/Documents/Codex/2026-10-10/task/hodor-real/LOCAL.md`. That work retained 3,832 business records from the October 12 export, removed credentials, rebuilt the local website, recorded 188 passing tests and a 12.83-second cold restore. Those are historical receipts, not claims of fresh tests in this project. Exact parity with code deployed in cloud Convex remains unverified.

## Reference

- [Convex self-hosting](https://github.com/get-convex/convex-backend/blob/main/self-hosted/README.md)
- [Shopify temporary tunnels](https://shopify.dev/docs/apps/build/cli-for-apps/networking-options)
- [Separate Shopify app configurations](https://shopify.dev/docs/apps/build/cli-for-apps/manage-app-config-files)
- [Protected customer data in development](https://shopify.dev/docs/apps/launch/protected-customer-data)

### Repeatable checkout simulation

Run `npm run local:simulate`, then open http://127.0.0.1:6411. Stop with Ctrl+C.
This is an isolated, accelerated 24-hour replay, **not Shopify orders or background hourly traffic**.
It creates 90–120 sessions each simulated hour: six hours normal, six with shipping exits,
six with lower mobile completion, then six recovery. Sessions include contact, address,
shipping, payment, completion and earlier exits, plus repeated deliveries. A fixed seed
makes each run repeatable. No credentials, network requests, database writes or real payments.

The viewer uses the real event validator, journey aggregation and insight rules. Jump to
hour 6 for normal, hour 9 for completion/shipping warnings, hour 15 for the mobile warning,
and hour 24 for recovery. Play advances one simulated hour every 1.5 seconds. Each snapshot
waits a simulated extra hour for observation, using a six-hour report window. Tracking health
can be switched off to confirm warnings are suppressed. Shopify ingestion, actual device
behaviour, sync coverage and persistence are not exercised by this replay.

`npm run local:simulate -- --report-only` generates event and result JSON under
`.local/convex/simulation/` without starting a server. The hourly table counts all generated
outcomes; insights compare eligible groups in the selected six-hour window. A sustained low
completion rate eventually stops being a *drop* when both halves are equally low; this is
expected under the current comparison rules, not proof that the store has recovered.

### Hourly batches (active schedule)

The macOS schedule `com.keval.checkout-simulation` now runs `local/simulation/batch.ts`
at minute 00 hourly and at login. It adds only one 90–120-session batch for the current
IST hour, never the whole replay. `npm run local:simulate:batch` runs it manually.
Repeating the same hour reuses the saved batch without duplicating sessions. Missed hours
are not backfilled. The scenario moves through six-hour normal, shipping, mobile and
recovery periods starting from the first saved batch, then repeats every 24 hours.

The hourly runner now publishes to the local sandbox database at `127.0.0.1:6210`
using its private admin key. The internal import function refuses cloud deployments.
Rows are marked **Simulated** in Checkouts. These are not Shopify orders or payments.
Each batch runs immediately, compressing its planned steps into the elapsed hour; the
dashboard retains the one-hour observation window before assessing insights.
Simulation insights use only simulated records and a six-hour comparison window.
Native Shopify order and value charts still represent actual Shopify records.
Re-delivery is safe: event IDs are stable and the database ignores duplicates.
A `<hour>.published.json` receipt confirms the stored session count for each batch. The older
24-hour replay is independent and remains available with `local:simulate`.

Hourly files are stored in `.local/convex/simulation/batches/`; `latest.json` records the
checked batch, accumulated totals and current insights. Every run re-reads the saved batch
and checks its session count. No AI model is used. Your Mac must be logged in; missed
calendar execution during sleep is handled on wake. The schedule lives in
`~/Library/LaunchAgents/com.keval.checkout-simulation.plist`, with its source under
`local/simulation/`. Logs remain in `.local/convex/simulation/schedule.log` and
`schedule-error.log`.

Stop with `launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.keval.checkout-simulation.plist`.
Remove that installed plist to prevent startup at the next login.

When simulated records exist in the local app, the dashboard uses a simulation-only view:
Shopify sessions and native price/order totals are excluded from that view but kept in storage.
Counts, funnel stages, hourly completions, abandoned counts and values derive from the same
simulated journeys. Basket amounts are deterministic generated USD test amounts, saved on
simulation events. The chart uses India time, matching the hourly schedule. The historical
average appears only after complete prior days exist. Cloud behaviour is unchanged.

Update: the local test dashboard now treats generated and browser-recorded sessions equally.
Both feed completion counts, funnel stages, hourly activity, abandoned values and test insights.
Native prices are used for browser sessions; missing prices remain unavailable rather than
being invented. No generated completion is represented as a real paid Shopify order.

Update, 14 October 2026: simulated rows carry a **Simulated** badge in Checkouts and in the
checkout details, and the exported status ends with "· Simulated". The order chart is unchanged
by user decision: in the test view, "Today's orders" counts recorded completions (simulated and
browser sessions) in India time, and real Shopify paid orders are not added to that line.

Future batches now target roughly 70% abandonment in normal/recovery periods, with
lower completion during shipping and mobile problem periods. Approximately 30% of
sessions contain a test error (an intentionally elevated test mix, not a Shopify benchmark).
The six categories are payment, shipping unavailable, form validation, rejected discount,
inventory and checkout-extension failure. Errors appear at the relevant checkout stage;
some sessions recover after errors, and many abandoned sessions have no error. Generic
rejected discounts do not pretend to be verified promised offers. Existing saved hourly
batches are reused unchanged; this policy applies when the next new batch is generated.
