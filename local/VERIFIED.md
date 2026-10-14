# Local setup verification — October 13, 2026

The maintained runtime is in `/Users/keval/Documents/build-sprint-app`. No cloud deployment or live Shopify configuration was changed. Existing unfinished project changes were retained.

## Real browser and Shopify checks

- Opened the frozen replica on port 3211: the historical overview and checkout navigation work. Its existing report showed 105 checkouts and 29 completions. No historical records were edited.
- Opened the fresh sandbox on port 6211 and the authenticated development app inside Shopify. The standalone page exposes the existing public report; private checkout details require the Shopify session.
- Installed **Checkout Gain Local Dev** on **Checkout Gain Local Dev Sandbox**, with the user's approved `read_orders`, `read_customer_events`, and `write_pixels` permissions. Enabled development protected-data access for analytics without requesting customer name, email, address or phone fields.
- A real Shopify session was verified and exchanged using the existing authentication code. The development pixel and signed checkout notifications were registered. Background synchronization was enabled only after connection succeeded.
- Used Shopify's no-charge test payment gateway and a $10 digital test product. The app showed:

| Scenario | Evidence in the local app |
| --- | --- |
| Checkout left unfinished | $10, contact step, no completion; later imported as abandoned by Shopify |
| Successful test payment | Test order **#1001**, $20, completed and paid; browser completion and Shopify order evidence agree |
| Declined test payment | $30, payment alert, no completion; later imported as abandoned by Shopify |

These produced **9 browser events across 3 checkouts**, **3 signed checkout price records**, **1 paid test order**, and **2 unrecovered abandoned checkouts**. Browser events remain untrusted observations, not payment authority. The fresh installation correctly reports incomplete historical coverage instead of claiming 30 days of monitoring.

## Access and persistence checks

- The real removal of `read_orders` triggered `app/scopes_update`, removed the local connection, blocked report access (403) and collection (503), and made background sync return `disconnected`. The approved permissions were restored, a real browser session reconnected, and collector destinations were refreshed. This verifies permission removal; an actual uninstall was not performed.
- Found and fixed a lifecycle-delivery bug: Shopify appended relative notification paths to the application page path. Generated configuration now uses an absolute notification URL. A regression test covers both initial and changed tunnel addresses.
- Replayed a real stored browser event: response `duplicate`, record count unchanged at 9.
- Repeated a signed lifecycle fixture with an already processed event identity: no extra lifecycle record and no loss of the reconnected installation.
- Saved and reopened a test payment-fix marker through the restricted gateway using a clearly labeled synthetic test session. A real browser reload showed the saved history. The marker was then undone; the test history remains in the sandbox.
- The public gateway passed 18 checks covering expired/wrong-store/wrong-app sessions, invalid signatures, blocked private/admin/history routes and permitted assets without localhost redirects or live-app addresses. Negative authentication cases use synthetic fixtures; real authentication was separately verified in Shopify.
- The main project passed its type check and **206 tests**. The local settings/gateway suite passed **19 tests**. Both cloud-default and generated-local builds passed their app checks. Existing unrelated whitespace issues in `convex/events.ts` and `tests/actions.test.ts` were left unchanged.

## Evidence and limits

Owner-only local receipts and screenshots are under `.local/convex/`: `acceptance-*.json`, `isolation-receipt.json`, `final-checkouts.png`, `successful-checkout.png`, `declined-checkout.png`, and the test logs. They are ignored by Git. No credentials are included in this document.

The old 111-file source comparison and earlier recovery receipts remain available. Exact parity with the code currently deployed in cloud Convex is still unverified. Public bundle inspection and route tests were performed; this is not a claim of a full browser network capture. Backups on this Mac do not protect against loss of the Mac.

## Restart and recovery result

`local:down` stopped both local instances, both dashboards, the gateway and the tunnel. `local:up` restarted the private setup and rebuilt only the sandbox. The original events, signed prices, paid order, abandoned checkouts and installation records matched the pre-restart receipt. The public link remained stopped.

Backup **2026-10-13T09-29-33-356Z** includes the frozen sandbox volume, logical export, all six stored files, generated local source/configuration, maintained source and tests with the original app configuration, runtime/runbook and owner-only recovery credentials. Its nine artifact hashes were checked. Restoration into the new retained volume **checkout-gain-restore-1791883791819** matched **30 tables, 97 records and 6 files**. The recovery container had no network or published ports and was stopped after comparison; the active sandbox was preserved. Receipts: `.local/convex/restart-receipt.json` and `.local/convex/restore-receipt.json`.

Final operating state: private replica, sandbox, dashboards and gateway are running; the public Shopify tunnel is stopped. Run `npm run local:shopify` for the next Shopify testing session, then reopen the app in the test store's admin. Background synchronization remains enabled for the connected sandbox only.
