# Incremental native records — local implementation, 2026-10-09

Implemented locally; no deployment, subscriptions, scope changes, credentials, or Shopify writes occurred during this implementation. Existing UI title/help changes are preserved.

## Behavior

- App open/date changes GET saved evidence directly. Explicit refresh reads saved evidence first, requests synchronization separately, then reads the saved result/health. Existing minute cron owns continuous updates while the app is closed. A fresh saved sync avoids Shopify queries entirely.
- Additive native head/version tables key records by store, installation, kind and hashed native ID. Published versions remain immutable. Cursor stages become visible together only when orders and abandoned-checkout scans both finish. Reports pin a publication and installation across pages.
- Initial import uses the existing 30 complete local days plus today window. Subsequent scans filter updates with a one-hour overlap, frozen scan end and resumable cursors. Every six hours a creation-window reconciliation catches records delayed beyond the overlap. Shopify orders sort by UPDATED_AT; abandoned checkouts retain CREATED_AT because Shopify's enum has no UPDATED_AT.
- Source timestamps govern upserts. Duplicate/older updates do not replace newer records; conflicting same-time versions reject the run. Known session/order links survive omitted checkout tokens. Canceled orders and recovered checkouts update existing records. Missing records in a scan do not delete previously saved records.
- Legacy snapshots remain readable until initial canonical publication. Failed/expired unpublished versions cannot enter reports, including after later successful jobs. Derived staging cleanup preserves canonical source versions and their publication headers.
- Pagination/one-day leases, 100-node pages, 1,000-page job ceiling, 128 candidate versions per head, aggregate version read budget, 45-day event window and 8 MiB report ceiling fail safely rather than return partial results.

## Review and rollout

Review `shared/nativeSync.ts`, `convex/nativeStore.ts`, additive `convex/schema.ts` fields/tables, `convex/capacity.ts`, `convex/shopify.ts`, native query fields, monitoring guard and targeted `src/main.ts` changes. Synthetic tests execute actual actions, mutations, report/HTTP handlers and controller code. The fixture database does not model production Convex transaction rollback or index creation/load; those require a separately authorized backend rollout and live verification.

Deploy backend with additive schema first, then matching frontend only after independent review and deployment authorization. Do not add scopes or subscriptions. Verify first import/resume, record freshness, database-only app/date reads and reporting limits against the confirmed development store. The current connected store has an unresolved 44 native versus 40 synced abandoned count; canonical reports explicitly return reconciliationVerified=false. No successful scan certifies parity. The signed order subtotal anomaly remains separately unproven.

Rollback must retain the additive schema, source tables and canonical publication headers. Reverting the entire old schema/cleanup code would reject additive job fields or delete required headers. If rollout fails, stop/revert the synchronization action while keeping the compatible reader/schema/cleanup and last good publication. A future legacy full-snapshot writer can publish a fresh legacy generation; current readers accept both formats. Do not delete or bulk rewrite canonical/legacy source data as a rollback.

## Deliberate limits and follow-up

- Polling uses existing approved read access; new native order webhook subscriptions are not implemented or enabled. Existing signed checkout-price deliveries continue independently.
- Incremental job counts represent cumulative stored identities for that installation/currency. Dashboard figures derive from the bounded returned rows and selected date cohort, not cumulative header counters.
- Reconciliation retains known records when API results omit them. Native deletions are not inferred from absence; a future verified deletion workflow requires explicit semantics and authority.
- Old source versions are retained. Excessive revisions safely trip the bounded reader; version compaction preserving pinned reads is a future scalability step.
- This remains scoped to the configured development store. Native/API parity and the original signed subtotal must be independently diagnosed; local fixtures cannot prove their causes.
- A brand-new disconnected install needs the existing explicit authenticated refresh/connect flow before cron can import. Cached reads do not establish a new installation or change permissions.

## Verification

Final local checks: 184/184 tests pass; TypeScript and production Vite build pass; Polaris manifest checks 388 component tags/attributes. All four native GraphQL query variants validate against the official Admin 2026-10 schema. Schema validation identified and corrected the unsupported abandoned-checkout UPDATED_AT sort before completion.

Evidence logs: `/tmp/build-sprint-incremental-rereview-tests.txt`, `/tmp/build-sprint-incremental-rereview-build.txt`. Focused implementation-start diff: `/tmp/build-sprint-incremental-review.patch` (regression tests are separately in the tests directory).

## Independent review repairs

- P1: Shopify can return a current record version updated after a creation-window scan's frozen start. Such versions are deferred without blocking cursor progress or replacing good saved data. The publication carries deferredUntil; report monitoring exposes pendingUpdates and blocks complete-coverage assessment. That flag carries across scans until a later frozen end covers the deferred timestamp. The next overlapping scan imports the newer version. This also handles an indexed incremental result whose returned node changes mid-read.
- P2: Identity preservation uses pending ?? published when merging every optional session/order link. Newer pending pages cannot erase an earlier verified link during the first import. Conflicting incoming identities reject the run; older updates still cannot overwrite good data. Same-time structural comparison ignores object key insertion order.
- Added action/mutation/HTTP regressions for mid-scan changes in both backfill and reconciliation, later capture and monitoring disclosure, repeated pending pages and identity conflicts. Live browser tests performed separately target the current deployed application, not these undeployed changes.
