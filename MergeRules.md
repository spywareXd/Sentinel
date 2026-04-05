# Merge Rules

This file is the defensive merge contract for Sentinel while integrating branches with different backend logic.

Its purpose is simple:

- protect the current working moderation flow
- prevent deprecated Supabase schema assumptions from re-entering the codebase
- preserve deployability
- keep punishment-enforcement frontend work isolated from backend schema churn

If a merge conflict forces a choice and this file disagrees with the incoming branch, prefer this file unless the database schema has been intentionally changed again and the change is updated here first.

## Core Non-Negotiables

1. `messages` is the raw chat table, not the moderation metadata table.
2. `moderation_cases` is the source of truth for moderation state, AI explanation, punishment recommendation, and chain linkage.
3. The only persisted moderation score is `moderation_cases.toxicity_score`.
4. Do not reintroduce reads or writes to deprecated moderation columns on `messages`.
5. Frontend punishment UI must be resilient to backend differences by using a narrow adapter layer and defensive null handling.
6. Vote flow must remain end-to-end functional:
   - MetaMask vote
   - backend `/moderation/vote/sync`
   - case resolution
   - punishment outcome visible in UI
7. Vercel deployment safety matters. Avoid introducing new fragile build-time dependencies without verifying they are tracked and referenced safely.

## Current Schema Source Of Truth

### `moderation_cases`

- `id`
- `message_id`
- `offender_id`
- `moderator_1`
- `moderator_2`
- `moderator_3`
- `blockchain_case_id`
- `status`
- `decision`
- `toxicity_score`
- `created_at`
- `tx_hash`
- `ai_reason`
- `punishment_duration`
- `punishment_type`

### `messages`

- `id`
- `user_id`
- `content`
- `created_at`
- `flagged`
- `processed_at`
- `wallet_address`

### Current `profiles` assumptions

The current code still assumes `profiles` contains:

- `id`
- `username`
- `wallet_address`
- `warnings`

If the incoming branch changes `profiles`, update this file before resolving conflicts.

## Deprecated Assumptions That Must Not Return

The following old patterns are now considered unsafe and must not be merged back in:

- `messages.harmful_score`
- `messages.severe_score`
- `messages.reason`
- `messages.punishment`
- `moderation_cases.updated_at` as a required field
- old FK-based nested moderation queries that assume removed message fields still exist
- storing moderation metadata back onto `messages`

### Reject any merge chunk that reintroduces code like:

- `.select("..., messages:message_id(content, harmful_score, severe_score, reason)")`
- `.select("..., punishment ...")` from `messages`
- frontend types that expect `messages.harmful_score`
- frontend types that expect `messages.severe_score`
- UI logic that depends on `updated_at` from `moderation_cases`

## Current Backend Contract

### Moderation case creation

When a flagged message becomes a case:

- read offender wallet from `profiles.wallet_address`
- fallback to `messages.wallet_address`
- select moderators from `profiles`
- insert moderation state into `moderation_cases`
- persist:
  - `toxicity_score`
  - `ai_reason`
  - `punishment_type`
  - `punishment_duration`
- create the case on-chain
- write back:
  - `blockchain_case_id`
  - `tx_hash`

### Case resolution

Resolution must continue to do all of the following:

- mark `moderation_cases.status = "resolved"`
- set `moderation_cases.decision`
- increment offender warnings once on punish
- keep resolution idempotent

### Case list routes

List routes must continue to prefer fast DB-backed rendering:

- `/moderation/my-cases` should default to the fast path
- `include_chain=true` is opt-in
- normal list rendering should not do expensive chain reconciliation by default

## Current Frontend Contract

### Cases page

The cases page currently expects:

- moderation metadata from `moderation_cases`
- raw message content from `messages.content`
- offender display info from `profiles`

It should not expect:

- `messages.harmful_score`
- `messages.severe_score`
- `messages.reason`
- `messages.punishment`

### Vote flow

The vote flow must preserve these rules:

- sync through `/moderation/vote/sync`
- use the actual MetaMask signer address for verification
- show structured backend sync errors when available
- support deployed backend URLs without assuming localhost on Vercel

### Punishment display

Current recommendation display comes from:

- `moderation_cases.punishment_type`
- `moderation_cases.punishment_duration`

This is recommendation/output metadata, not necessarily proof that a user punishment has already been actively enforced.

## Rules For Upcoming Punishment Enforcement Work

You said the next feature is punishment application handling on users, including timer logic and enforcement in the frontend. This is exactly where schema drift can quietly break the app, so follow these rules during the merge.

### 1. Separate recommendation from enforcement

Do not blur these two concepts:

- recommendation:
  - `moderation_cases.punishment_type`
  - `moderation_cases.punishment_duration`
- enforcement state:
  - whether a user is currently muted, timed out, warned, or banned
  - when that punishment expires
  - whether it is active now

If the incoming branch stores active punishments in a different place, do not overload `moderation_cases` or `messages` to fake enforcement state.

### 2. Put enforcement behind a narrow adapter

Any new frontend punishment/timer logic should read from one normalization layer only.

Recommended pattern:

- one adapter/hook transforms backend punishment data into:
  - `type`
  - `isActive`
  - `issuedAt`
  - `expiresAt`
  - `remainingMs`
- all timer UI reads from that normalized shape
- components must not hardcode raw Supabase column names all over the tree

This is the main defense against merge churn.

### 3. Never derive active enforcement only from AI output

Do not treat:

- `punishment_type`
- `punishment_duration`

as proof that a punishment is currently active on a user.

Those fields are moderation outputs and can be used as recommendation/context, but active enforcement should come from the actual enforcement state source.

### 4. Defensive timer rules

Any punishment countdown/timer logic must:

- tolerate missing timestamps
- tolerate `null` durations
- tolerate zero-duration punishments
- tolerate warnings that do not expire
- tolerate backend branches that provide:
  - `expires_at`
  - or `issued_at + duration`
  - or `duration_hours`

Never let the UI crash because one timestamp is absent.

### 5. Defensive UI rules

The punishment UI must always have a safe fallback:

- if active state is unknown, show a neutral status
- if expiry is missing, do not render a broken countdown
- if punishment type is absent, do not assume `"none"` unless the adapter explicitly maps it
- if backend data is stale, fail soft and keep the app navigable

### 6. Do not block core chat or moderation flows

Punishment enforcement features must not break:

- login
- chat load
- message send
- moderation case creation
- cases page load
- voting

If the punishment source is unavailable, the app should degrade gracefully rather than stop rendering.

## Merge Conflict Resolution Rules

When resolving conflicts, use this priority order:

1. current schema truth
2. currently working end-to-end product behavior
3. deployability
4. new feature code

Meaning:

- preserve the schema-safe code first
- preserve the current working vote/cases flow second
- preserve Vercel-safe build behavior third
- only then layer in incoming feature logic

### Prefer current code when conflict touches:

- `backend/api/routes/moderation.py`
- `backend/services/moderation.py`
- `backend/worker/realtime_scanner.py`
- `frontend/src/app/cases/page.tsx`
- `frontend/src/hooks/useMetaMaskVote.ts`
- `frontend/src/lib/punishment.ts`

### Incoming branch code must be manually audited if it touches:

- Supabase selects on `messages`
- Supabase selects on `moderation_cases`
- punishment/timer logic
- vote sync
- build config
- frontend env handling

## Search-Based Safety Checks

Run these checks after resolving merge conflicts.

### Reject deprecated schema usage

Search for:

- `harmful_score`
- `severe_score`
- `messages.reason`
- `messages.punishment`
- `updated_at`

Interpretation:

- `harmful_score` and `severe_score` are allowed only in scanner/AI in-memory logic
- they are not allowed as persisted DB reads/writes for moderation UI

### Confirm current moderation reads

Search for:

- `toxicity_score`
- `punishment_type`
- `punishment_duration`
- `ai_reason`
- `blockchain_case_id`

These should remain rooted in `moderation_cases`.

### Confirm vote safety

Search for:

- `vote/sync`
- `signerAddress`
- `NEXT_PUBLIC_BACKEND_URL`

The deployed frontend must not silently assume localhost.

## Required Post-Merge Verification

After the merge, do all of the following before considering it safe:

1. `npx tsc --noEmit` in `frontend`
2. `npm run build` in `frontend`
3. load `/cases`
4. verify `/moderation/my-cases` returns data without schema failure
5. cast one vote end-to-end
6. confirm resolution still updates `moderation_cases`
7. confirm punishment recommendation still renders
8. if enforcement frontend is added:
   - confirm timer renders without crashing
   - confirm expired punishments stop showing as active
   - confirm missing timestamps fail soft

## Anti-Regressions Checklist

- `messages` still only stores raw message data
- `moderation_cases` still stores moderation metadata
- no DB reads of `messages.harmful_score`
- no DB reads of `messages.severe_score`
- no DB reads of `messages.reason`
- no DB reads of `messages.punishment`
- `toxicity_score` remains the persisted score
- cases list remains fast by default
- vote sync still returns structured errors
- Vercel build still works

## Practical Rule For Future Me

If a merge chunk looks convenient but assumes old schema behavior, reject it.

If a punishment UI change requires guessing backend meaning, stop and add an adapter.

If a merge makes the app more tightly coupled to raw Supabase columns across many components, back it out and centralize the mapping first.

## Reference Files

Use these files as the current implementation reference during merge resolution:

- `schemaupdate.md`
- `backend/api/routes/moderation.py`
- `backend/services/moderation.py`
- `backend/worker/realtime_scanner.py`
- `frontend/src/app/cases/page.tsx`
- `frontend/src/hooks/useMetaMaskVote.ts`
- `frontend/src/lib/punishment.ts`
