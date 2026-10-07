# AI Chavrusah Milestone 0 Architecture Plan

Prepared October 6, 2026. Status: planning complete; implementation proposed and awaiting owner approval. No application features, dependencies, or database migrations have been created.

## 1. Current repository assessment

The starting folder is a document collection, not an existing app. There is no package.json, lockfile, Expo configuration, source tree, Supabase configuration, test suite, or existing Git repository. No applicable AGENTS.md was found in the inspected workspace and ancestor locations.

| Item | Observed state |
| --- | --- |
| Application stack and package versions | None installed in this project |
| Local tools | Git 2.46.2.windows.1; Node 24.15.0; npm 11.12.1 |
| Operating environment | Windows, PowerShell |
| Docs | Six independent Word learning documents; preserved for future owner-directed comparisons |
| Material | Six Word planning/reference documents and one human-first Markdown specification |
| Controlling specification | Codex Instructions for Initial Prompt.txt |
| App launch, typecheck, lint | Not applicable: no app or scripts exist |

Git has been initialized at the workspace root using its standard hidden .git directory. A separate visible Git folder would not add useful version tracking. Planning files belong in Planning; Docs remains the owner's independent work. Track supplied documents as local baseline files without editing them. No remote repository or publication is part of this milestone.

The initial-prompt file takes precedence over Material. Earlier documents propose user-level source policies, optional later versioning, and immediate intent classification/ownership revisits. The controlling plan instead requires global-admin source policy, versioning from Milestone 2, and defers the full human-first engine to Milestone 8. The resource directory is a research starting point, not an approved dependency or source list. Docs examples are comparison material, not verified source records or automatic model context.

Because no starter exists, the Milestone 0 launch acceptance test cannot run. Creating a starter belongs to Milestone 1 under the explicit no-feature-build instruction. README architecture notes are deferred until approved, as requested by the controlling specification.

## 2. Proposed architecture

Use one Expo TypeScript application at the repository root and Supabase for Auth, Postgres, RLS, and privileged server functions. Avoid a monorepo, custom backend framework, graph database, or generic plugin engine.

```text
Docs/                                  owner-managed comparison documents
Material/                              supplied product reference documents
Planning/                              plans, decisions, milestone reports
src/
  app/
    _layout.tsx                        auth provider and navigation
    (auth)/sign-in.tsx                  authentication
    (auth)/sign-up.tsx                  account creation
    (app)/_layout.tsx                   authenticated navigation
    (app)/index.tsx                     Home
    (app)/my-learning.tsx               placeholder in M1
    (app)/settings.tsx                  account/profile settings
    (app)/admin.tsx                     admin-only placeholder in M1
  components/                          small reusable UI elements
  domain/                              product types, separate from database rows
  providers/AuthProvider.tsx           auth lifecycle and current profile
  lib/supabase.ts                      public client and session persistence
  services/
    auth/                              sign-in/out and profile operations
    learning/                          sessions/messages in M2
    notes/                             version-aware note operations in M2
    sources/                           client SourceGateway contract in M3
    ai/                                client conversation contract in M5
    voice/                             VoiceProvider contract in M7
  types/database.ts                    generated database types
supabase/
  config.toml
  migrations/                          ordered, reviewable SQL changes
  tests/database/                      authorization/integrity tests
  functions/
    _shared/sources/                    server gateway, policy evaluator, adapters
    _shared/ai/                         server provider and modular prompts in M5
    source-gateway/                    authenticated source endpoint in M3
    conversation/                      authenticated AI endpoint in M5
    generate-note/                     proposed note endpoint in M6
tests/                                 meaningful client/service tests
```

Only create directories when their milestone needs them. Expo's supported src/app routing fits this layout; confirm the scaffold's current structure before adapting it. [Expo source-directory documentation](https://docs.expo.dev/router/reference/src-directory/).

Screens invoke typed services. Normal private-data access uses the authenticated Supabase client plus RLS. SourceGateway and AI execution live on the server; src/services/sources and src/services/ai are client-facing contracts, not privileged implementations. Source retrieval flows through authentication, metadata normalization, global policy evaluation, provider retrieval, final version/author validation, and authorized SourceHit persistence. If provider metadata requires fetching a response first, keep it within the trusted server until authorization succeeds. Raw disallowed text must never reach the client or model context.

Use the public Supabase project URL and publishable key in Expo configuration. Keep service-role credentials and AI secrets exclusively server-side. Every server endpoint must authenticate the caller, check session/note ownership, and enforce authorization even when using a privileged database client. UI route protection improves navigation; database and endpoint checks provide security. [Supabase Expo guidance](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native), [RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).

The future server prompt builder composes source rules, content depth, pedagogical support, note-authoring rules, and session context. Preserve raw messages. READING and BE_IYUN remain separate from future GUIDE_ME, CHALLENGE_ME, and EXPLAIN_IT support modes. Reserve IdeaOrigin in types without implementing learner-idea storage or classification yet.

## 3. Proposed data model and migration sequence

These are logical migrations, not SQL already written. Use timestamped migration filenames when implementing. Add indexes, grants, RLS, and integrity constraints alongside each table, never in a later security milestone. Use UUID identifiers and UTC timestamptz fields.

| Milestone | Migration order | Tables and responsibilities |
| --- | --- | --- |
| 1 | 001 profiles and authorization | profiles keyed to auth.users; display_name, USER/GLOBAL_ADMIN role, READING/BE_IYUN default, timestamps; new-user provisioning; private profile RLS; restricted editable columns; trusted admin bootstrap |
| 2 | 002 sessions and messages | learning_sessions, messages; owner access, raw speaker text, depth/context fields; no AI calls |
| 2 | 003 notes and versions | notes, note_versions, note_sessions; atomic create/save/restore operations; immutable versions; author attribution and thesis snapshots |
| 2 | 004 organization and questions | note_facets, note_anchor_sources with explicitly unverified reference placeholders, questions; rank and ownership constraints |
| 3 | 005 source authorization | source_policy_rules plus scoped, expiring source_authorizations for ON_REQUEST; admin-only writes; policy revision/audit evidence |
| 3 | 006 source evidence and citations | source_hits, note_sources; add optional SourceHit link to anchors; persist authorization snapshots and provenance; enforce gateway-only evidence writes |
| 4 | 007 provider normalization if needed | Add only fields the live Sefaria adapter actually requires; no parallel Sefaria-only evidence tables |

Important model details:

- New profiles always receive USER regardless of signup metadata. Users can edit their own display name and depth preference, but cannot edit role, id, or attribution timestamps. RLS alone on a broadly writable profile row is insufficient: restrict column grants or expose narrow update functions. Bootstrap the owner with a trusted SQL/admin action using a verified user ID. Never make the first registrant admin. [Supabase user-data guidance](https://supabase.com/docs/guides/auth/managing-user-data).
- Each child table derives ownership from its parent; no cross-user links are allowed. Global admin authority covers source policy, not unrestricted reading of everyone's private learning.
- note_sessions is a many-to-many link so one note can combine several sessions. Start questions with the specified optional session/note links; add join tables when multi-session question management becomes real.
- Notes have a stable identity and current_version_id. A database transaction appends a version, updates the current pointer and current thesis, and validates expected parent to prevent concurrent lost edits. Enforce unique (note_id, version_number), same-note parent/current links, and disallow ordinary UPDATE/DELETE of version bodies. Restoring copies an earlier version into a new version. Store display-name snapshots on versions so later profile renaming does not rewrite historical attribution.
- For M2 anchors, store reference_label, rank, why_central, and an UNVERIFIED status without fabricated source text. Enforce rank 1 through 5 plus unique (note_id, rank); this limits a note to five anchors even under concurrent requests. In M3 add nullable source_hit_id. Version citations use note_sources independently and have no five-citation limit. Keep facets/anchors at note level initially; historical body, thesis, and citations are version-specific. If full historical organization snapshots are desired, decide before M2.
- SourceHit stores exact retrieved text, canonical reference, provider, work/category/author identifiers, actual version or explicit unknown, language, retrieval timestamp, provenance, authorization decision, rule ID and immutable decision snapshot. For ON_REQUEST record the grant ID. Preserve old policy evidence even after rules change; prefer retiring rules over deleting referenced evidence.
- Proposed policy default is deny when no rule or insufficient metadata matches. Any matching global EXCLUDED rule wins; a narrower APPROVED rule cannot undo it. Otherwise use explicit specificity (VERSION, WORK, AUTHOR, CATEGORY), conservative handling of equal-rank conflicts, and fail closed on ambiguity. A work-wide allowance never overrides an excluded author or edition. Have the owner confirm this semantics before M3; category exclusions then require refinement rather than exceptions.
- Proposed ON_REQUEST grant is an explicit learner action scoped to user, session, source scope, and expiry. It only activates a globally ON_REQUEST source and cannot override EXCLUDED. Recheck current policy/grant before returning cached text or supplying saved sources to the model. Retain historical note evidence, but do not reuse it as newly authorized context automatically. Decide historical viewer behavior before M3.

## 4. Milestone map

| Milestone | Main files or service areas | Tables | Completion gate |
| --- | --- | --- | --- |
| 0 | Planning, Git setup | None | Owner reviews this plan |
| 1 | src/app, auth provider/services, lib/supabase, domain/types | profiles | Auth, profile, admin guard, RLS checks pass |
| 2 | learning/notes services and My Learning screens | sessions, messages, notes, versions, note_sessions, facets, anchor placeholders, questions | Manual learning, five-anchor limit, history/restore |
| 3 | server SourceGateway, mock adapter, policy evaluator, Admin policy UI | policy rules, temporary grants, source_hits, note_sources | Automated allow/deny/ON_REQUEST/security tests |
| 4 | server Sefaria adapter and source viewer | Existing source evidence tables | Exact retrieval, exclusion, malformed/not-found handling |
| 5 | server AI provider/orchestrator, modular prompts, conversation UI | Existing sessions/messages/source evidence | Text depth behavior and gateway-only verified citations |
| 6 | generate-note endpoint and thesis approval/preview UI | Existing notes/versions/citations | Learner-approved thesis, critique, versioned save/restore |
| 7 | VoiceProvider and minimal voice UI | Existing messages with transcript metadata | Voice session, interruption, transcript, same policy boundary |
| 8 | Future human-first orchestration | learner_ideas and learning state as later approved | Acceptance criteria defined later |

After each milestone: run its checks, report changed files and limitations, provide a manual test checklist, then stop for owner approval. Do not add social features, payments, publishing, knowledge graphs, or partner matching.

## 5. Risks and decisions

Before M1, approve the plan and identify the development Supabase project to use (existing dedicated project or a new one), the owner's admin account identity, and the first device to test. Share no secret credentials in chat. Windows supports local Android tooling and physical-device testing; local iOS simulator testing needs macOS. Web is useful for quick checks but cannot replace mobile auth/session testing.

Proposed M1 defaults: email/password sign-in and sign-up, email confirmation enabled, Home/My Learning/Settings navigation, admin placeholder guarded separately, npm with a committed lockfile, and AI Chavrusah as the display name matching this workspace. OAuth, password recovery UI, deployment, and voice remain outside M1. The supplied documents also spell the product AI Chavrusa; confirm final branding before release.

Select a mutually compatible Expo/React Native/Router/TypeScript set from the current official scaffold at M1 and record exact resolved versions in the milestone report and lockfile. The observed Node version is a local tool version, not evidence of app compatibility. Verify compatibility before installation rather than guessing package versions now. [Expo project creation](https://docs.expo.dev/get-started/create-a-project/).

Before M3, confirm denial precedence, temporary authorization duration/scope, the initial approved source library, and treatment of historical sources after exclusion. Before M4, review provider API behavior, text/version metadata, licensing, and retention requirements against actual official provider documentation. Before M5, select the AI provider and retention/budget settings. Before M7, select voice provider and transcript/audio retention; audio storage is not assumed.

Architecture risks to avoid: user-editable roles; source filtering only in UI/prompts; model recollection becoming evidence; replacing durable text instead of appending versions; flattened conversation summaries; one-folder note organization; conflating depth with support; attributing AI alternatives to the learner; mutable policy records destroying authorization history; and direct client writes of supposedly verified source hits.

## 6. Exact Milestone 1 implementation checklist

- [ ] Obtain explicit approval for M1 and development-project/account/device choices.
- [ ] Restate intended file/migration changes; inspect the workspace again and report material differences before coding.
- [ ] Scaffold a compatible Expo Router TypeScript starter in a temporary workspace subdirectory, then copy reviewed app files to the root without overwriting Docs, Material, Planning, or the controlling prompt. Use this to avoid scaffold failure in a nonempty root.
- [ ] Record exact installed package versions; commit package.json and package-lock.json. Include only Router, Supabase client/session dependencies, and required lint/test tooling.
- [ ] Configure app metadata, TypeScript, lint, .env.example, and clear missing-configuration handling. Add scripts: start, typecheck, lint, test, test:db.
- [ ] Create minimal domain types: profile role, depth, facets, idea origin, and source-policy states; generate database types from the M1 schema. No runtime providers for later milestones.
- [ ] Add Supabase configuration and the profiles migration with auth-user provisioning, USER default, own-row RLS, restricted update privileges, and trusted admin bootstrap instructions. Fix security-definer search paths and privileges where such functions are needed.
- [ ] Add an auth service/provider with persistent sessions, refresh lifecycle handling, initial loading, signup/confirmation flow, and sign-out. Clear profile state when changing users.
- [ ] Build sign-in/sign-up, Home displaying the profile name, My Learning placeholder, and Settings with profile name/depth preference and sign-out.
- [ ] Add an Admin placeholder visible only to GLOBAL_ADMIN; guard direct route entry, loading state, and stale profile state. It exposes no source-policy feature yet.
- [ ] Add focused auth/route tests and database authorization tests. Include a private admin check function only if needed for a meaningful server-side authorization assertion; do not add future admin features.
- [ ] Once approved, add README setup/architecture/testing instructions, development environment requirements, and trusted admin bootstrap steps.
- [ ] Apply migrations only to the agreed development environment, run all checks, report results and every changed file, deliver the manual checklist, and stop before M2.

Expected M1 changed areas: package/lock/config files, .env.example and any justified ignore updates, src/app, src/components, src/providers/AuthProvider.tsx, src/lib/supabase.ts, src/services/auth, src/domain, src/types/database.ts, supabase/config.toml, one profiles migration, database tests, client tests, README, and the milestone report. Docs and Material are inputs.

## 7. Exact tests available after Milestone 1

The following commands are proposed deliverables, not commands that work in this document-only repository today. The M1 README must make their prerequisites and results reproducible.

```powershell
npm.cmd ci
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test -- --run
npx.cmd expo-doctor
npx.cmd supabase start
npm.cmd run test:db
npm.cmd start
```

The local database test path requires Supabase CLI and a compatible running container runtime. Define test:db to run the local SQL test suite (Supabase test db). If local prerequisites are unavailable, report that gap and arrange an isolated development test environment; do not claim RLS passed from UI tests. Avoid resetting any shared or production database. npm start should provide the Expo device/web launch choices.

Database assertions must use actual anon/authenticated database roles and user identity contexts, rather than a service-role-only test client:

1. Signup creates one profile with USER/READING defaults. Forged signup metadata cannot select GLOBAL_ADMIN.
2. Anonymous access to profiles is denied; user A can read A's profile, and cannot read B's profile even by explicit ID.
3. A can update A's display_name/default_depth_mode, but cannot update B, role, ID, or server-managed timestamps; cannot insert a second forged admin profile.
4. Only the trusted bootstrap changes the chosen owner to GLOBAL_ADMIN; the ordinary authenticated account cannot self-promote.
5. Admin authority does not grant access to another user's private profile. Any admin-check function, if added, rejects normal/anonymous callers and accepts the designated admin.

Manual checklist on the selected mobile device, with two test users and one designated admin:

1. Launch configured app; signed-out state shows authentication, with no private screen flash. Launch without configuration separately and confirm an understandable setup error.
2. Sign up, confirm email, sign in, and see the saved display name on Home. Invalid credentials/confirmation errors appear clearly.
3. Open Home, My Learning, and Settings. Change the display name/depth preference, relaunch, and confirm persistence.
4. Restart with an active session and confirm it restores; sign out and confirm authenticated routes are blocked. Sign in as the other account and confirm no prior profile leaks.
5. A normal account sees no Admin entry; opening the admin route directly is denied. The designated admin can open the placeholder. Sign out from that account and confirm access disappears.
6. Simulate network failure during sign-in/profile loading and confirm a recoverable error with no accidental admin access.
7. Confirm no AI, source retrieval, voice, session/note features, or human-first engine were added.

Milestone 0 checks: project inventory and tooling inspected; supporting Material text reviewed; Docs preserved; Git and ignore rules verified; no app checks can run yet. The source Word documents were read for content, not subjected to a layout review or rewritten.
