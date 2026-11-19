# AI Chavrusah Milestone 3 Report

November 18, 2026. Global source policy and synthetic SourceGateway implementation. Owner acceptance is pending; Milestone 4 has not started.

## Delivered behavior

The admin workspace creates, reads, revises and retires CATEGORY, WORK, AUTHOR and VERSION rules in APPROVED, ON_REQUEST or EXCLUDED states. Revisions append new rule identities and preserve the previous administrator, reason and decision history. Revision checks reject stale concurrent changes. Ordinary learners cannot change policy, including through direct API calls.

Any matching EXCLUDED rule wins. Otherwise specificity is VERSION, WORK, AUTHOR, CATEGORY; deeper slash-separated categories outrank ancestors. Equal author matches prefer ON_REQUEST over APPROVED. Unknown sources, incomplete metadata and unmatched rules are denied. These conservative defaults were approved by the owner.

An explicit learner action permits an ON_REQUEST source for 60 minutes, for that learner, session, exact synthetic source and edition, under the current rule identity. Permission can be revoked. Ended sessions, expired permissions, rule replacement and later exclusions invalidate access. No automatic permission is granted by retrieval.

The authenticated server gateway resolves metadata, evaluates policy before provider text retrieval, then atomically rechecks policy before persisting and returning an accepted SourceHit. Policy changes and publication use database locks to order concurrent decisions. Each hit retains exact text, provider/reference, edition/language, retrieval time, provenance and its original authorizing decision. Saved text must be reopened through the gateway in its original session, under current policy; clients cannot select raw text directly. History exposes metadata only. The original decision remains historical evidence, while reopening returns current access separately.

The mock source screen is available inside each learning session. All supplied text is clearly synthetic, not Torah text. No real library is approved or connected. Reserved note-source links and an optional anchor-to-hit reference prepare for later citations without claiming a verified citation UI today.

## Deployment and boundaries

Applied to development project `mmkbwjprujnrvmryeapi`:

1. `20261118010000_global_source_policy.sql`: rules, audit/revision clock, immutable private mock catalog, evaluator and explicit grants/revocation.
2. `20261118020000_source_gateway_evidence.sql`: accepted hits, future citation links and privileged gateway operations.
3. `20261118030000_session_bound_source_reopen.sql`: forward hardening requiring the original session when reopening saved evidence.

The `source-gateway` Edge Function is deployed. Its handler validates every bearer token with Supabase Auth before data access; function-level JWT verification is disabled to support the project's current key configuration. Privileged database functions remain service-role only. The client contains only the publishable key. [Supabase function authentication](https://supabase.com/docs/guides/functions/auth).

The owner account and role were not changed. Tests use isolated synthetic namespaces and temporary accounts, with cleanup. Tests advance the global policy revision but do not configure real source policy. Independent Docs and supplied Material were untouched. No dependency or lockfile versions changed.

## Validation

- Typecheck and lint passed.
- 32 local unit tests passed, including nine gateway and seven HTTP authentication/validation tests.
- 93 hosted database assertions passed: 20 profile, 36 learning and 37 source-policy checks. SQL fixtures were rolled back.
- 25 deployed gateway/API checks passed, including forged/anonymous credentials, protected writes, exact-session and cross-user access, default denial, explicit permission, expiry/revocation, later exclusion of saved evidence, metadata-only history and cleanup.
- Database lint passed with no schema errors.
- Web and Android Hermes exports passed (approximately 1.5 MB web / 3.4 MB Android bytecode).
- Browser acceptance passed: admin creation of all three states, learner approval/denial, explicit permission and revocation, saved-hit denial after exclusion, rule retirement and normal-user admin route protection. No browser JavaScript errors were reported. Desktop admin and mobile-width source screenshots were inspected.
- Temporary browser accounts, evidence and isolated policy fixtures were removed; no Milestone 3 test accounts remain.

## Owner test checklist

1. Start Expo with `npm.cmd start`, or reload the running preview. Sign in using your admin app account. Android with Expo Go remains the physical-device acceptance test.
2. In Admin workspace, create three WORK rules: `mock:work-a` APPROVED, `mock:work-b` ON_REQUEST, `mock:work-c` EXCLUDED. Start with these narrow synthetic keys; no real Torah source approval is implied. Automated fixtures do not leave these rules configured for you.
3. Open My Learning, create/open your session, then choose Mock source checks. Retrieve sample A: synthetic text and decision/provenance should appear. Retrieve C: no text should return.
4. Retrieve B without permission: blocked. Choose its explicit 60-minute permission, retrieve again, then revoke and try reopening the saved hit: blocked. A different session must not inherit that grant or reopen the first session's hit. An ended session cannot retain ON_REQUEST access.
5. Change A's WORK rule to EXCLUDED. Recheck source access and try reopening its saved hit: no text should return. Retire that rule: absent another matching approval, default denial applies. Old rule audit identities remain preserved.
6. Use a normal learner account: the admin route and policy mutation must be inaccessible. Check Android scrolling, keyboard, buttons and long source text.

## Limits and next milestone

Access is checked on each retrieval/reopen. A policy change cannot retract bytes already delivered; use Recheck source access to clear displayed text and refresh metadata. There is no push redaction. Future AI orchestration must reauthorize through SourceGateway and must not reuse cached frontend text or treat the permission RPC as an AI tool.

Only the trusted synthetic provider exists. Catalog records cannot be edited in place; a changed edition/text requires a new identity. Real provider metadata normalization, Sefaria retrieval/search, actual Torah verification, AI and voice remain future milestones. Notes retain their existing manual UNVERIFIED anchors; citation attachment UI is deferred.

Local Docker tests were not run; hosted development checks provide database validation. Physical Android testing remains with the owner. Historical Milestone 1 dependency advisories were not re-audited or addressed by framework upgrades here.

## Changed areas

Admin and session source screens; source domain/service types; shared server gateway and authenticated HTTP handler; three SQL migrations and Edge Function configuration; regenerated database types; gateway/handler/database/hosted tests; TypeScript/ESLint configuration for shared Deno modules; README and milestone reports. Generated bundles, local environment values and browser QA artifacts remain ignored.

Stop for owner acceptance before beginning Milestone 4, live Sefaria integration.
