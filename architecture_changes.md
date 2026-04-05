# Architecture Changes

This document records the recent architecture changes made in this codebase and provides guidance for future contributors, especially LLM-based coding agents.

## Current Direction

SentinelDAO is structured around four main layers:

1. `frontend/`
   - Next.js app for landing, auth, chat, cases, and activity
2. `backend/`
   - FastAPI routes, moderation orchestration, blockchain sync, scanner entrypoints
3. `Supabase`
   - auth, profiles, messages, moderation cases, punishment history
4. `Blockchain`
   - vote casting, vote verification, case resolution source of truth

## Key Changes Made

### 1. Moderation metadata moved away from `messages`

The frontend and backend were updated to align with the current schema:

- `messages` is treated as the raw chat table
- `moderation_cases` is treated as the moderation workflow table

Important moderation fields now come from `moderation_cases`, not `messages`:

- `toxicity_score`
- `ai_reason`
- `punishment_type`
- `punishment_duration`
- `blockchain_case_id`
- `tx_hash`
- `status`
- `decision`

This replaced older assumptions that fields like `reason`, `harmful_score`, `severe_score`, and `punishment` lived on `messages`.

### 2. `/cases` switched from backend-fetching to direct Supabase reads

The `Cases` page was changed so the list view no longer depends on the FastAPI backend being online.

Current behavior:

- [`frontend/src/app/cases/page.tsx`](/Users/arnav/vscode/Sentinel-1/frontend/src/app/cases/page.tsx)
  reads directly from `moderation_cases`
- it joins only safe read fields:
  - `messages:message_id(content)`
  - `offender:offender_id(username, wallet_address)`

Why this change was made:

- the backend was a runtime bottleneck for rendering the queue
- browser access to Supabase was already established elsewhere in the frontend
- the list page is primarily a read-only UI concern

What this does **not** mean:

- vote syncing should not move into the frontend
- blockchain verification should not move into the frontend
- final resolution logic should not move into the frontend

### 3. `Activity` tab added as a DB-backed punishment history surface

The following were added:

- [`frontend/src/app/activity/page.tsx`](/Users/arnav/vscode/Sentinel-1/frontend/src/app/activity/page.tsx)
- [`frontend/src/components/activity/ActivityHeader.tsx`](/Users/arnav/vscode/Sentinel-1/frontend/src/components/activity/ActivityHeader.tsx)
- [`frontend/src/components/activity/ActivitySummaryStrip.tsx`](/Users/arnav/vscode/Sentinel-1/frontend/src/components/activity/ActivitySummaryStrip.tsx)
- [`frontend/src/components/activity/ActivityList.tsx`](/Users/arnav/vscode/Sentinel-1/frontend/src/components/activity/ActivityList.tsx)
- [`frontend/src/components/activity/ActivityDetailPanel.tsx`](/Users/arnav/vscode/Sentinel-1/frontend/src/components/activity/ActivityDetailPanel.tsx)
- [`frontend/src/types/activity.ts`](/Users/arnav/vscode/Sentinel-1/frontend/src/types/activity.ts)

The activity page reads from `user_punishments` and shows:

- active punishment records
- expired punishment records
- punishment reason
- duration
- issuer
- linked case reference

### 4. Cases UI kept design changes while logic was stabilized

Recent design-facing changes include:

- refined cases list styling
- severity rails and severity pills
- cleaner cases header
- right-side detail panel behavior improvements
- better list/detail layout consistency

Recent logic-facing fixes include:

- removing broken joins against nonexistent `messages` moderation columns
- sorting cases by actual creation time
- removing stale state like `setIsDetailDismissed(...)` leftovers
- restoring conflict-free `cases/page.tsx`

### 5. Punishment UI was introduced in chat

Chat has had iterative punishment-related logic added across the frontend:

- punishment popout / notice behavior
- composer lock behavior for timeout-like punishments
- punishment history visibility in `Activity`

These are frontend UX surfaces around punishment state, but punishment truth still comes from DB state.

## Schema Rule Of Thumb

### Read from `messages` only for raw chat fields

Safe assumptions:

- `id`
- `user_id`
- `content`
- `created_at`
- `flagged`
- `processed_at`
- `wallet_address`

### Read from `moderation_cases` for moderation state

Safe assumptions:

- `status`
- `decision`
- `toxicity_score`
- `ai_reason`
- `punishment_type`
- `punishment_duration`
- `blockchain_case_id`
- `tx_hash`

## LLM Context And Editing Guidance

This section is intentionally written for LLM-based contributors.

### Preferred architecture boundary

#### Frontend may read directly from Supabase for UI state

Direct Supabase reads are acceptable for:

- chat messages
- participants
- punishment history
- assigned case lists
- case detail display

This is especially acceptable when the goal is:

- rendering
- filtering
- sorting
- showing history

#### Backend logic should stay in the backend

Do **not** move business logic into the frontend just because Supabase is available.

Backend-owned logic should remain in `backend/`:

- AI moderation/scanner execution
- moderation case creation
- moderator assignment
- blockchain case creation
- vote verification
- case resolution
- punishment side effects
- warning increments
- any consensus logic

### Practical rule for future changes

If the task is mostly:

- "show data"
- "render history"
- "load a list"
- "display state"

then direct Supabase reads in the frontend are acceptable.

If the task is:

- "decide something"
- "verify something"
- "finalize something"
- "enforce something"
- "sync blockchain or AI results"

then it belongs in the backend.

### Important anti-pattern to avoid

Do not reintroduce frontend queries that assume moderation metadata exists on `messages`.

Avoid fields like:

- `messages.harmful_score`
- `messages.severe_score`
- `messages.reason`
- `messages.punishment`

Those old assumptions caused repeated failures and do not match the current schema direction.

## Current Architectural Preference

The preferred split for this repo is:

- frontend:
  - direct DB reads for read-only and UI-state surfaces
- backend:
  - ownership of moderation/business logic
- blockchain:
  - vote truth and resolution verification

In short:

**Use Supabase directly for rendering. Keep system logic in the backend.**

