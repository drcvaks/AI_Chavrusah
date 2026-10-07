# AI Chavrusah Milestone 1 Report

Status: implementation delivered and automated checks passed; owner sign-in confirmed and global admin assigned. Physical Android acceptance and the remaining owner checklist still need confirmation. Scope is app shell, authentication, private profiles, typed models, and admin placeholders only. Milestone 2 has not started.

## Delivered behavior

Email/password sign-in and signup with display-name capture and email confirmation guidance. Persistent Supabase sessions, native foreground refresh, and identity-aware profile loading. Home displays the current learner's name. My Learning and Admin are placeholders. Settings saves display name and READING/BE_IYUN preference and offers sign-out. Only a matching GLOBAL_ADMIN profile exposes the Admin route; direct entry is also guarded.

The server provisions USER/READING defaults and ignores role metadata. Profiles use own-row RLS and column-specific update grants. Users cannot change role, UUID, or timestamps, insert forged profiles, or access another learner's private profile. Privileged admin assignment is a developer CLI operation after the intended app account exists and its email is confirmed.

## Environment and data changes

Hosted development project: mmkbwjprujnrvmryeapi, AI_Chavrusah, us-east-1. CLI authentication verified and project linked. Migration 20261007030000_profiles_foundation applied. Generated database types saved. No API secrets are present in the client. No reference documents were modified.

The owner confirmed signing in with the intended app email. The trusted admin helper verified that exactly one email-confirmed account exists and assigned GLOBAL_ADMIN, confirming the updated role. Sign out and back in to refresh the app's admin guard. Temporary integration-test accounts were removed. Docker is unavailable, so hosted database tests supplement the local test script.

The preview runs at http://localhost:8083. Android Expo Go connects to exp://10.0.0.52:8083 on the same Wi-Fi network. The manifest returns HTTP 200 and advertises that Wi-Fi address for its launch bundle. Port 8081 belongs to another development process and was left alone.

| Dependency | Resolved version |
| --- | --- |
| Expo | 57.0.27 |
| Expo Router | 57.0.25 |
| React / React DOM | 19.2.3 |
| React Native | 0.86.3 |
| Supabase JavaScript client | 2.117.2 |
| AsyncStorage | 2.2.0 |
| TypeScript | 6.0.3 |
| Vitest | 5.0.3 |
| ESLint | 9.39.5 |
| Supabase CLI | 2.120.0 |

Other exact versions are recorded in package-lock.json. Use npm ci for reproducible installation. The auth client uses the current SDK's default refresh coordination, without the deprecated processLock option.

## Validation

- Database authorization: 20 pgTAP assertions passed under actual anon/authenticated roles; transaction rolled back.
- Live authentication/Data API: 16 assertions passed, covering sign-in, private profiles, metadata spoofing, protected fields, trusted admin assignment, and sign-out/refresh revocation; temporary accounts removed.
- Hosted database lint: passed, no schema errors.
- TypeScript typecheck and ESLint: passed.
- Client unit tests: nine passed, covering delayed admin/profile responses, account switching, startup races, sign-out, profile errors/retry, mismatched identities, unmount cleanup, and client configuration.
- Expo Doctor: all 21 checks passed.
- Web production bundle: passed, approximately 1.4 MB.
- Android Hermes bundle: passed, approximately 3.4 MB. The first sandbox attempt could not write temporary bytecode; the unrestricted rerun and final export passed.
- Browser smoke test: passed sign-in, form validation, signup navigation, My Learning, preference saving, session persistence across reload, direct admin-route denial for ordinary users, trusted admin access, sign-out, and account switching. No browser JavaScript errors. Desktop sign-in and mobile-width signup/Home screenshots inspected.
- Hosted auth settings: signup enabled and email confirmation required, verified through the public settings endpoint. Actual confirmation-email delivery remains an owner test.
- Source preservation: no changes to Docs, Material, or the controlling prompt. Local .env remains excluded from Git.

The in-app browser automation tool timed out twice. Web verification used the bundled Playwright runtime with headless Edge instead; it created and removed its own temporary accounts. Mobile-width browser checks do not substitute for testing a physical Android device.

## Known limits

npm audit still reports 29 entries (18 high, 11 moderate) propagated from four underlying advisories: [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [decode-uri-component](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr), [node-forge](https://github.com/advisories/GHSA-86w9-cpqp-85rv), and [uuid](https://github.com/advisories/GHSA-w5hq-g745-h8pq). A compatible npm audit fix updated nine packages and replaced nine nested packages but did not clear these advisories. npm's forced remediation proposes incompatible Expo/Router/React Native version changes; those were not applied. The dependency audit is therefore unresolved even though build, auth, and compatibility checks pass. Reassess compatible upstream fixes before deployment.

Owner admin assignment is complete; the owner should confirm visibility of the Admin placeholder after signing out and back in. Password recovery UI, automatic email deep-link login, OAuth, app-store builds, and deployment are outside M1. Confirmation links use the development project's existing redirect configuration; README explains setting a clean local web redirect and returning to the app manually. Native keyboard, foreground/background restoration, and physical-device networking still need Android testing. No local Docker-based tests were claimed.

## Owner test checklist

1. Start the app with npm start; scan its QR code in Android Expo Go. Also test web with npm run web.
2. Create your app account with the supplied intended admin email and your own password, confirm the email, return, and sign in.
3. Verify Home displays your name; My Learning opens as a placeholder.
4. Save a changed display name and depth preference in Settings. Return Home and restart the app to confirm persistence.
5. Sign out and confirm private pages are unavailable. Sign in using a second normal test account and verify there is no prior-user name or Admin access.
6. Open /admin directly as that normal account; confirm redirection or denial.
7. After trusted promotion of the verified owner account, sign out/back in and verify the owner sees the Admin placeholder. Signing out removes access again.
8. Test an invalid password and interrupted network during sign-in/profile loading; confirm clear errors and recovery.

## Files changed

Changed files:

```text
.gitignore
README.md
Planning/Milestone-0-Plan.md
Planning/Milestone-1-Report.md
app.json
eslint.config.js
package.json
package-lock.json
tsconfig.json
vitest.config.mts
scripts/promote-admin.mjs
scripts/supabase-cli.mjs
scripts/test-database.mjs
scripts/test-hosted-auth.mjs
src/app/_layout.tsx
src/app/+not-found.tsx
src/app/(auth)/_layout.tsx
src/app/(auth)/sign-in.tsx
src/app/(auth)/sign-up.tsx
src/app/(app)/_layout.tsx
src/app/(app)/index.tsx
src/app/(app)/my-learning.tsx
src/app/(app)/settings.tsx
src/app/(app)/admin.tsx
src/components/AuthForm.tsx
src/components/ui.tsx
src/domain/models.ts
src/lib/config.ts
src/lib/supabase.ts
src/providers/AuthProvider.tsx
src/services/auth/controller.ts
src/services/auth/index.ts
src/types/database.ts
supabase/.gitignore
supabase/config.toml
supabase/migrations/20261007030000_profiles_foundation.sql
supabase/tests/database/profiles.test.sql
tests/auth.test.ts
```

Generated node_modules, Expo caches, bundle exports, local project-link metadata, browser QA screenshots/scripts, and the live Expo Go QR are ignored. Docs and Material remain untouched. No remote Git repository or publication was created.

Stop after Milestone 1; owner approval is required before Milestone 2.
