# Schema Update Notes

This note documents what had to change in the old logic to match the current Supabase schema.

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

## Main Schema Shift

The old logic still assumed that moderation metadata lived on `messages`.

That is no longer true.

Moderation-specific data now lives on `moderation_cases`, especially:
- `toxicity_score`
- `ai_reason`
- `punishment_type`
- `punishment_duration`
- `blockchain_case_id`
- `tx_hash`
- `status`
- `decision`

`messages` should now be treated as the raw chat message table. For moderation views, it is only needed for:
- `content`
- `wallet_address` fallback when offender wallet is not found on `profiles`

## Changes Required In Old Logic

### 1. Remove old joined reads from `messages`

Old moderation routes were querying fields like:
- `messages.harmful_score`
- `messages.severe_score`
- `messages.reason`
- `messages.punishment`

Those fields are not part of the current `messages` schema and caused the moderation endpoints to fail with `500`.

Updated logic:
- query the base row from `moderation_cases`
- fetch `messages.content` separately
- fetch offender profile data separately

This avoids relying on old nested joins and removed columns.

### 2. Use `moderation_cases.toxicity_score` as the only persisted score

There should be no DB reads or writes to:
- `harmful_score`
- `severe_score`

Current rule:
- AI still computes `harmful_score` and `severe_score` in memory inside the scanner pipeline
- only the AI `severe_score` is persisted
- it is stored in `moderation_cases.toxicity_score`

Updated logic:
- `create_moderation_case(...)` now writes `toxicity_score`
- retry-chain logic now passes `toxicity_score`
- frontend cases view now reads `toxicity_score`

### 3. Read AI explanation and punishment fields from `moderation_cases`

Old logic assumed the following came from `messages`:
- `reason`
- `punishment`

Updated logic reads from `moderation_cases`:
- `ai_reason`
- `punishment_type`
- `punishment_duration`

### 4. Stop expecting `updated_at` on moderation cases

The current schema list for `moderation_cases` does not include `updated_at`.

Updated frontend logic:
- still uses `created_at`
- no longer depends on `updated_at`
- resolved label is synthesized in UI instead of coming from the database

### 5. Keep `messages` writes limited to actual message columns

Current valid `messages` writes are:
- `content`
- `user_id`
- `wallet_address`
- `flagged`
- `processed_at`

No moderation metadata should be written to `messages`.

### 6. Keep `moderation_cases` as the moderation workflow table

Current valid `moderation_cases` writes/updates include:
- `message_id`
- `offender_id`
- `moderator_1`
- `moderator_2`
- `moderator_3`
- `status`
- `decision`
- `toxicity_score`
- `ai_reason`
- `punishment_type`
- `punishment_duration`
- `blockchain_case_id`
- `tx_hash`
- `created_at`

## Concrete Logic Updates Made

### Backend routes

`/moderation/cases`, `/moderation/my-cases`, `/moderation/case/{id}`, and `/moderation/retry-chain/{case_id}` were updated to:
- select only valid columns from `moderation_cases`
- hydrate message content from `messages`
- hydrate offender display info from `profiles`
- stop depending on old nested `messages(...)` field expansion

### Backend service

`create_moderation_case(...)` was updated so that:
- the persisted score is `toxicity_score`
- AI reason and punishment metadata are stored on `moderation_cases`

### Frontend cases page

The cases page was updated so that:
- it no longer expects `messages.harmful_score`
- it no longer expects `messages.severe_score`
- it no longer expects `updated_at`
- it uses `toxicity_score` from `moderation_cases`

## Performance Follow-Up

After the schema fix, the cases page was still slow because the old list endpoint was doing blockchain reconciliation during every list fetch.

### Old behavior

`GET /moderation/my-cases` did all of the following on every page load:
- fetch assigned cases from `moderation_cases`
- for each case, call `get_case_from_chain(...)`
- for voting cases, also call `verify_vote_on_chain(...)` for each moderator

This made the page slow because one moderator with many assigned/history cases could trigger dozens of Sepolia RPC calls just to render the list.

### New behavior

`GET /moderation/my-cases` now defaults to the fast path:
- load cases from `moderation_cases`
- hydrate `messages.content`
- hydrate offender profile info
- do **not** fetch on-chain data by default

An optional query parameter was added:

- `include_chain=false` by default
- `include_chain=true` restores the expensive per-case blockchain sync behavior when explicitly needed

### Why this change was needed

The list page only needs enough data to render:
- case title
- offender
- message content
- moderation status
- AI reason
- AI punishment recommendation

It does not need to reconcile live blockchain state for every case on every load.

### Practical team rule

Use:
- `/moderation/my-cases` for fast list rendering

Use blockchain sync only when truly needed:
- vote submission flow
- case detail flow
- background sync worker
- explicit debugging or admin views via `include_chain=true`

### UI impact

Because the fast list path skips chain reads by default:
- `on_chain` data is not included in normal list responses
- vote count UI may show a fallback like `Vote data unavailable` unless the caller explicitly requests chain data

This is expected and was done intentionally to remove the main page-load bottleneck.

## Important Team Rule Going Forward

For moderation dashboard and case detail work:

- query `moderation_cases` for moderation metadata
- query `messages` only for raw message content/state

Do not reintroduce queries against:
- `messages.harmful_score`
- `messages.severe_score`
- `messages.reason`
- `messages.punishment`

## Remaining Assumption

The current logic still expects the `profiles` table to have:
- `id`
- `username`
- `wallet_address`
- `warnings`

That was not part of the schema list above, so if `profiles` was also refactored, it should be checked separately.

## Summary

Old model:
- `messages` mixed raw chat data and moderation metadata

New model:
- `messages` = raw chat data
- `moderation_cases` = moderation state and AI-derived metadata

Persist only:
- `moderation_cases.toxicity_score`

Do not persist or query:
- `messages.harmful_score`
- `messages.severe_score`
