# AI Chavrusah Milestone 2 Report

October 25, 2026. Status: implementation delivered for owner acceptance. Milestone 3 has not started.

## Behavior delivered

My Learning now lists private sessions and notes. Create a manual session with READING or BE_IYUN, a context such as Daf Yomi, and optional masechta/daf/sefer/parsha/topic. Open it to end the learning period or write a linked note. A note can also stand alone or link several of the learner's sessions.

Notes capture the learner's author thesis, title, body and optional summary. DOMAIN, CORPUS, CONTEXT and TOPIC facets allow simultaneous membership; title/thesis search and a facet filter support retrieval. Up to five ranked anchor-reference placeholders are allowed. They are explicitly UNVERIFIED, with no retrieved text or fabricated SourceHits. The body may include more than five manually written reference labels; verified citation features are still future work.

Every save appends an immutable note version with timestamp, author ID, display-name snapshot, change reason and parent. History previews old title/thesis/summary/body. Restore appends a new version copying that text, retaining every earlier version and preserving the note's current facets, anchors and session links. Restoring old organization metadata is not part of this milestone.

## Integrity and privacy

RLS isolates each learner's sessions, notes, history and metadata, including from global admins. Clients cannot directly write note/history/organization tables; authenticated transaction functions validate ownership and session links. Current/parent version foreign keys constrain versions to the same note. A row lock plus expected-version check prevents lost edits. Invalid metadata rolls back the whole operation.

Stale editors receive PT409/HTTP 409 and retain their unsaved draft. An initial implementation used SQLSTATE 40001; live tests exposed PostgREST's automatic retry loop. The corrective migration uses a business-conflict code instead. [Supabase explanation](https://supabase.com/kb/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions).

A second corrective migration defers the author-profile foreign key until commit so account removal can cascade owned notes/history together. This was verified with temporary test-account cleanup. These corrections were added as forward migrations; already-applied migration history was preserved.

The browser's two-tab test also found that same-account authentication refreshes could remount navigation and lose a local draft. Auth state now retains the same identity's editor during background revalidation or refresh failure. Admin controls require a freshly verified profile; failed/pending validation does not authorize a cached role. Sign-out and account changes still immediately clear private state. New regression tests cover these boundaries.

## Data changes

Applied to the existing linked development project mmkbwjprujnrvmryeapi:

1. 20261025010000_learning_sessions: learning_sessions and reserved read-only messages.
2. 20261025020000_versioned_notes: notes, note_versions and note_sessions.
3. 20261025030000_note_organization_and_operations: note_facets, unverified note_anchor_sources, reserved read-only questions, save/restore transaction functions.
4. 20261025040000_deferred_note_author_cleanup: deferred author FK for transactional account cleanup.
5. 20261025050000_non_retryable_note_conflicts: explicit HTTP 409 business conflicts.

Generated database types were refreshed. No package dependencies or lockfile versions were changed. The owner account/admin role was not modified. Supplied Material and Docs were not changed; the new independent Docs document remains outside this implementation commit. Temporary API/browser users and their owned learning records are removed after tests.

## Validation

- Typecheck and lint: passed.
- Client tests: 16 passed, including the original auth tests, facet/anchor/thesis validation, and same-account revalidation protection.
- Database tests: 56 passed (36 learning/versioning/privacy assertions plus 20 original profile assertions), all fixtures rolled back.
- Live learning API tests: 25 passed. Two simultaneous saves yield exactly one success and one immediate HTTP 409; only one version is appended. Rejected metadata leaves no partial save. History, restore, protected writes, ownership and cleanup were checked.
- Browser acceptance: Chullin 57a session, BE_IYUN, linked Gemara/Halacha note, five-anchor UI limit, two edits, preview, restore as version four, facet retrieval and page-reload persistence passed. A two-tab stale save preserves its draft after the first tab saves. Verified admin access after sign-out/sign-in also passed after the auth-state correction. No browser JavaScript errors were reported.
- Mobile-width note/history and desktop library screenshots inspected. Browser checks use the bundled Playwright runtime and temporary accounts, not the owner's credentials.
- Final web and Android Hermes exports passed, including the same-account auth refinement (approximately 1.5 MB web / 3.4 MB Android bytecode).
- Database lint: passed, no schema errors.

## Owner test checklist

1. Start/reload Expo Go using the existing npm start instructions, then open My Learning. Web preview is also available at http://localhost:8085 while the agent preview runs.
2. Create a Daf Yomi session titled Chullin 57a. Enter Masechta Chullin and Daf 57a; choose a depth. Confirm the session shows the saved context and start time.
3. From that session, write a note. Enter your title, author thesis and body. Add Halacha under Domain/theme and Gemara under Source corpus. Confirm the session checkbox is selected; optionally link another owned session.
4. Add five anchor labels. Confirm Add anchor reference disables at five. Put additional reference labels in the body and verify saving is still allowed. These are manual labels, not verified sources.
5. Save, edit twice with change reasons, and open version history. Preview version one; restore it. Confirm a fourth version appears with original text and thesis, and version three still exists. Current facets/anchors/session links remain as before restoration.
6. In My Learning, filter Domain/theme by Halacha, then Source corpus by Gemara. The same note should appear in both cases. Reload the app and confirm persistence.
7. Open the same note's editor in two web tabs. Save one, then attempt to save the other. The second should show a conflict and retain its draft for copying/merging.
8. On Android, background and reopen the app while editing. Confirm same-account refresh does not send you Home. Check keyboard, scrolling and selecting/copying long body text on the device.
9. End a session and confirm its end time. Sign out and into another test account; the first learner's sessions, notes and history must be inaccessible.

## Limits and deferred work

Explicit Save is required; unsaved drafts are not autosaved or crash-recoverable. There is no rich-text editor, version diff, note deletion, offline write queue or conflict auto-merge. Facet values are comma-separated labels. The library uses the API's current response limit; pagination and full-text body search are deferred. The question inbox and transcript UI are not implemented; their reserved tables expose no client writes.

Physical Android testing remains with the owner. No local Docker test run is claimed; database checks used the agreed hosted development project. The historical Milestone 1 dependency advisories were not addressed by changing framework versions in this milestone. AI, source authorization, live Sefaria, voice and the human-first engine remain unimplemented.

## Changed files

```text
README.md
Planning/Milestone-1-Report.md
Planning/Milestone-2-Report.md
eslint.config.js
package.json
scripts/test-database.mjs
scripts/test-hosted-learning.mjs
src/app/_layout.tsx
src/app/(app)/_layout.tsx
src/app/(app)/admin.tsx
src/app/(app)/index.tsx
src/app/(app)/my-learning.tsx
src/app/(app)/sessions/new.tsx
src/app/(app)/sessions/[id].tsx
src/app/(app)/notes/new.tsx
src/app/(app)/notes/[id].tsx
src/app/(app)/notes/[id]/edit.tsx
src/app/(app)/notes/[id]/history.tsx
src/components/NoteEditor.tsx
src/components/learning-ui.tsx
src/domain/learning.ts
src/domain/models.ts
src/providers/AuthProvider.tsx
src/services/auth/controller.ts
src/services/learning/index.ts
src/services/notes/index.ts
src/types/database.ts
supabase/migrations/20261025010000_learning_sessions.sql
supabase/migrations/20261025020000_versioned_notes.sql
supabase/migrations/20261025030000_note_organization_and_operations.sql
supabase/migrations/20261025040000_deferred_note_author_cleanup.sql
supabase/migrations/20261025050000_non_retryable_note_conflicts.sql
supabase/tests/database/learning.test.sql
tests/auth.test.ts
tests/learning.test.ts
```

Generated caches, exports, browser QA scripts/screenshots and local environment values remain ignored. Stop for owner approval before Milestone 3.
