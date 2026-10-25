# AI Chavrusah

AI Chavrusah is a planned voice-first Torah-learning workspace for conversational learning, approved source retrieval, and durable notes that preserve the learner's authorship.

## Project status

The owner accepted Milestone 1 and approved Milestone 2. The app now supports manual learning sessions, durable notes with author-thesis capture, immutable version history and restore, faceted organization, and up to five explicitly unverified anchor references. Authentication, private profiles, preferences and the admin placeholder remain in place. No AI, source retrieval, or voice is implemented.

The development Supabase project is linked and the Milestone 2 migrations are applied. Client configuration is saved in an ignored local `.env`, with `.env.example` as the tracked template. Current validation and the owner checklist are in [the Milestone 2 report](Planning/Milestone-2-Report.md); the [Milestone 1 report](Planning/Milestone-1-Report.md) records the original foundation.

## Run the app

Use Node 24 LTS and npm. The lockfile records exact dependency versions; the official starter uses Expo SDK 57, React Native 0.86, and React 19.2.3.

```powershell
Set-Location -LiteralPath 'C:\Users\Family\ws\AI Chavrusah'
npm.cmd ci
# If .env is missing, copy .env.example to .env and fill in the client values.
npm.cmd start
```

For Android, install/update Expo Go, connect the phone and computer to the same network, and scan the terminal QR code from Expo Go. The installed Expo Go must support SDK 57; Android can also use the matching build from [Expo Go downloads](https://expo.dev/go). Web testing uses `npm.cmd run web` or the `w` option in the running Expo terminal. Web and mobile share the hosted development database.

The app defaults to port 8083 to avoid another development server. Open `http://localhost:8083` for web testing. If Expo Go chooses a virtual network interface, use your current Wi-Fi address with `REACT_NATIVE_PACKAGER_HOSTNAME` when starting Expo. The Milestone 2 agent preview uses `http://localhost:8085` without taking over your existing server.

Create an app account with your chosen password and confirm its email before signing in. Your Supabase dashboard login does not create an app account. After clicking the confirmation link, return to the app and sign in manually; automatic email deep-link login is not implemented. If the default confirmation redirect opens an unavailable localhost page, the email may still have been confirmed; return and try signing in. For a clean local web redirect, set Authentication > URL Configuration > Site URL to your running web URL, `http://localhost:8083`, in the development dashboard.

## Repository contents

- `Codex Instructions for Initial Prompt.txt`: controlling specification and milestone boundaries.
- `Planning/`: architecture, implementation checklists, decisions, and milestone reports.
- `Material/`: supplied product-planning reference documents. Earlier proposals do not override the controlling specification.
- `Docs/`: the owner's independent learning documents for future comparisons; not automatically ingested, edited, or treated as verified Torah sources.
- `src/app/`: Expo Router screens and auth/admin route guards.
- `src/domain/`: product types, kept separate from screens.
- `src/services/auth/`: auth/profile operations and identity-transition controller.
- `src/providers/` and `src/lib/`: auth lifecycle, client configuration, and Supabase client.
- `supabase/migrations/` and `src/types/database.ts`: versioned schema and generated types.
- `tests/`, `supabase/tests/`, and `scripts/`: client/security tests and trusted developer administration helpers.

## Use Milestone 2

Open My Learning to create a session or a standalone note. A session records its learning context, depth and optional daf/sefer/parsha/topic. Open a session to write a linked note or end the learning period. Notes may link several sessions.

Write your author thesis/core idea explicitly. Add body text, an optional summary, comma-separated facets, and up to five discovery anchors. Anchor labels are UNVERIFIED; no source text is retrieved and nothing is presented as a verified citation. The body is not subject to the five-anchor limit.

Every save creates a version with a server timestamp, author ID/display-name snapshot, change reason and parent. View version history to preview old text. Restoring copies the selected title, thesis, summary and body into a new version. Organization facets, anchors and session links remain current rather than rolling back with text.

Save explicitly before leaving an editor; local drafts are not autosaved or crash-recoverable. Same-account refreshes keep the current screen mounted. Concurrent saves use an expected version: a stale editor gets a conflict and retains its draft for copying/merging. Changing accounts or signing out clears private state.

Search notes by title/thesis or filter a chosen facet dimension. The starter library uses Supabase's response limit; pagination and full-text body search are deferred.

## Architecture

Use Expo, React Native, TypeScript, and Expo Router for the app, with Supabase Auth, Postgres, and Row Level Security (RLS) for private data. Keep domain types and services separate from screens. Run privileged source retrieval, source authorization, and AI calls on the server. Each later milestone adds only the interfaces and implementations it needs.

Global source-policy states are APPROVED, ON_REQUEST, and EXCLUDED. Users cannot weaken global exclusions. Notes use facets rather than exclusive folders, allow up to five discovery anchors independently of citations, and append immutable versions rather than overwrite durable work. The full human-first engine remains deferred to Milestone 8.

## Supabase development project setup

Create or designate a dedicated development project. For project creation, use:

- Enable Data API: on.
- Automatically expose new tables: off.
- Enable automatic RLS: on.

Migrations will explicitly grant the access each table needs and define its RLS policies. Automatic RLS does not replace those policies or the authorization tests. [Supabase table exposure guidance](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically).

To connect the app, obtain the project URL and publishable key from the project's **Connect** dialog. The publishable key is designed for client applications; database permissions and RLS control the data accessible through it. [Supabase Expo setup](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native), [API key guidance](https://supabase.com/docs/guides/getting-started/api-keys).

During Milestone 1, store the client configuration in a local `.env` file:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

`.env` is ignored by Git. Never put a database password, secret/service-role key, personal access token, or AI-provider secret into `EXPO_PUBLIC_*` variables. A publishable key connects the app to its API; it does not authorize database administration or migrations.

For CLI access to the development project, authenticate through the Supabase CLI login flow on this computer. Once authenticated and after local Supabase configuration exists, link by project reference. The project reference is also visible in the dashboard URL `https://supabase.com/dashboard/project/PROJECT_REF`. [Supabase CLI workflow](https://supabase.com/docs/guides/local-development/cli-workflows).

```powershell
# Run in this repository when preparing Milestone 1.
npx.cmd supabase login
# After Supabase initialization, using the agreed development project:
npx.cmd supabase link --project-ref YOUR_PROJECT_REF
```

Complete any login verification or database-password prompt locally. Do not paste private credentials into chat or commit them. No Supabase connector is currently available in this chat; the CLI is the proposed administration route. Linking identifies the project; migrations are a separate step and will target only the agreed development environment.

The project connection details and testing choices have been supplied. For another development environment, identify:

1. The development project's dashboard link/project reference and its client project URL and publishable key.
2. Confirmation that it is the dedicated development project, rather than a production or shared database.
3. The email to use for the first app account and eventual GLOBAL_ADMIN. A Supabase dashboard account is separate from an app's Supabase Auth user. The admin role will be assigned by a trusted action after that app account exists; never through user-supplied signup metadata.
4. The first test device: Android or iPhone. Web can supplement device testing.

The owner selected Android with Expo Go for mobile testing, supplemented by web. Their verified app account has been assigned GLOBAL_ADMIN through the trusted developer helper. Email/password authentication uses email confirmation, and the display name is AI Chavrusah. AI and voice provider keys are not needed for Milestone 1.

## Database setup and admin assignment

For a new agreed development project, initialize/link the CLI, preview changes, and apply migrations:

```powershell
npx.cmd supabase login
npx.cmd supabase link --project-ref YOUR_PROJECT_REF
npx.cmd supabase db push --dry-run
npx.cmd supabase db push
```

The configured project already has the profiles migration; do not reset it. Signup always provisions USER/READING defaults, irrespective of user metadata. Authenticated users can read their own profile and update only display_name/default_depth_mode. Global admins retain that same private-profile boundary.

After the owner signs up and confirms the intended app email, run this trusted developer command with the authorized CLI login:

```powershell
npm.cmd run admin:promote -- YOUR_VERIFIED_APP_ACCOUNT_EMAIL
```

The helper requires exactly one verified app account, identifies its UUID, then assigns GLOBAL_ADMIN. It never creates an account, sets a password, or trusts signup role metadata. Sign out and back in afterward to refresh the app's admin guard. This command uses your CLI's privileged project access and is not available inside the app.

To refresh generated database types after an approved schema change, use `npx.cmd supabase gen types typescript --linked` and save successful output to `src/types/database.ts`.

## Validation and milestone approvals

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test -- --run
npx.cmd expo-doctor
npm.cmd run export:web
npm.cmd run export:android
npm.cmd run test:db:hosted
npm.cmd run test:auth:hosted
npm.cmd run test:learning:hosted
npx.cmd supabase db lint --linked --level warning
```

Hosted database tests run all SQL test files (currently 56 pgTAP assertions), using real anon/authenticated roles inside rolled-back transactions. The harness raises a SQL error if an assertion fails. Hosted API tests obtain the admin API key only in process memory through the authorized CLI and remove their temporary accounts in cleanup. The learning suite checks private sessions/notes, the anchor limit, immutable history, atomic save/restore, and two simultaneous editors. Run hosted tests only against the agreed development project. Neither suite writes secrets to disk or logs them.

Expo generates typed routes in .expo. If typecheck reports stale route names after adding screens, restart Expo to regenerate its route declarations before rechecking.

For local database tests, Docker or a compatible container runtime is required:

```powershell
npx.cmd supabase start
# Apply pending migrations to the local database, not the linked hosted database.
npx.cmd supabase migration up --local
npm.cmd run test:db
```

Docker was not available on the development computer during setup, so the hosted checks provide the database-security validation. No Docker installation is required to use the hosted app.

The [Milestone 2 report](Planning/Milestone-2-Report.md) records current check results, changed files and the owner checklist. Owner sign-in/admin setup is complete. Physical Android acceptance of the new learning screens remains an owner test.

The Milestone 1 audit recorded 29 entries propagated from four underlying upstream advisories; compatible fixes did not clear them at that time. Dependencies were not upgraded or re-audited in Milestone 2. See that report and reassess compatible fixes before deployment.

Complete one milestone at a time. After each milestone, report changed files, check results, limitations, and manual tests, then wait for the owner's approval before proceeding.
