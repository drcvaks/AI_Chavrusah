# AI Chavrusah

AI Chavrusah is a planned voice-first Torah-learning workspace for conversational learning, approved source retrieval, and durable notes that preserve the learner's authorship.

## Project status

The owner has approved the [Milestone 0 architecture plan](Planning/Milestone-0-Plan.md). This repository currently contains planning and reference documents, with local Git tracking. There is no executable app, installed project dependency set, or database migration yet. Milestone 1 will establish the Expo app shell, Supabase authentication, private profiles, and admin access controls.

## Repository contents

- `Codex Instructions for Initial Prompt.txt`: controlling specification and milestone boundaries.
- `Planning/`: architecture, implementation checklists, decisions, and milestone reports.
- `Material/`: supplied product-planning reference documents. Earlier proposals do not override the controlling specification.
- `Docs/`: the owner's independent learning documents for future comparisons; not automatically ingested, edited, or treated as verified Torah sources.

## Planned architecture

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

Before building, identify:

1. The development project's dashboard link/project reference and its client project URL and publishable key.
2. Confirmation that it is the dedicated development project, rather than a production or shared database.
3. The email to use for the first app account and eventual GLOBAL_ADMIN. A Supabase dashboard account is separate from an app's Supabase Auth user. The admin role will be assigned by a trusted action after that app account exists; never through user-supplied signup metadata.
4. The first test device: Android or iPhone. Web can supplement device testing.

Proposed defaults are email/password authentication with email confirmation enabled and the display name AI Chavrusah. AI, source retrieval, voice, and note generation are later milestones, so their provider accounts and keys are not needed for Milestone 1.

## Validation and milestone approvals

Milestone 0 verified the document inventory, local tools, preservation of the supplied files, and local Git baseline. App launch, typecheck, lint, and database tests are not runnable yet.

The architecture plan contains the exact proposed Milestone 1 build and test checklists. After implementation, this README will provide actual dependency versions, setup commands, and verified test results. Local Supabase database tests require a compatible running container runtime; confirm local prerequisites before claiming that test path is available.

Complete one milestone at a time. After each milestone, report changed files, check results, limitations, and manual tests, then wait for the owner's approval before proceeding.
