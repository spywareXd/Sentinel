# Architecture Changes

This note is meant to give future engineers and AI agents a quick feel for what changed in this timeline, what surfaces were intentionally reshaped, and what architectural preference still seems to be preferred even where this branch took temporary shortcuts.

It is written as context, not as a strict rulebook.

## High-level reading of this branch

The app still wants to be understood as:

- a chat-first product
- with moderation layered into the same experience
- with case review and punishment history shown as adjacent surfaces, not as a detached admin console

Several changes in this timeline reinforce that direction.

## Changes implemented in this timeline

### Cases are now sorted by time instead of severity

The cases list was moved away from a severity-first ordering and toward a recency-first ordering.

The practical result is:

- newer assigned cases surface above older ones
- historical high-toxicity cases no longer dominate the top of the queue just because their score is higher

This makes the queue feel more like a real workflow surface instead of a static ranking.

Relevant code:

- `frontend/src/app/cases/page.tsx`

### Cases now carry severity color directly on the card

Severity is now visually expressed on the cases card itself, especially through the left-side rail and severity pill treatment.

The intended feel here is:

- severity is visible immediately
- the card still stays inside the same dark product language
- the UI does not collapse into a generic moderation dashboard aesthetic

Relevant code:

- `frontend/src/components/cases/CaseList.tsx`
- `frontend/src/app/globals.css`

### Activity tab was added and reads from `user_punishments`

There is now an `Activity` surface that presents punishment history and active punishments with a similar list/detail structure to `Cases`.

This page reads from:

- `user_punishments`

The intent seems to be:

- keep punishment state visible and inspectable
- treat punishments as part of the user experience history
- make the product feel accountable rather than opaque

Relevant code:

- `frontend/src/app/activity/page.tsx`
- `frontend/src/components/activity/ActivityList.tsx`
- `frontend/src/components/activity/ActivityDetailPanel.tsx`

### Flagged messages show a small marker next to the username

Chat messages that are marked as flagged now carry a small alert icon next to the sender name.

The product implication is subtle but important:

- moderation state is no longer hidden away only in the cases view
- the chat itself now hints when something in-room has entered moderation context

Relevant code:

- `frontend/src/components/chat/feed/MessageRow.tsx`
- `frontend/src/app/chat/page.tsx`

### The case detail card no longer scrolls away with the list

The right-side detail panel in `Cases` was changed so it remains visible while the cases list scrolls.

The intended interaction is:

- scroll down to older cases
- click a case
- inspect the selected case without having to scroll back up

This makes the page feel more like a real review workspace.

Relevant code:

- `frontend/src/app/cases/page.tsx`
- `frontend/src/components/cases/CaseDetailPanel.tsx`

### Cases context shifted from backend-fetching toward DB-facing reads for this branch

The list view for `Cases` now reads directly from `moderation_cases` instead of depending on the backend route just to render the queue.

This appears to have been motivated by practical stability:

- backend availability was blocking the UI
- some backend assumptions lagged behind the live schema
- direct read access to the presentational data was simpler for the current branch

That means some frontend context clearly moved from backend-facing to DB-facing in this timeline, but the move reads more like a demo-oriented branch concession than a long-term architectural preference.

Relevant code:

- `frontend/src/app/cases/page.tsx`

## Other changes introduced in this same timeline

These also seem important for understanding the current branch shape.

### Chat punishments became visible product state

Punishments are not just hidden records anymore. They now have visible frontend consequences:

- punishment popout/modal behavior
- composer locking during active timeout-like punishments
- countdown treatment for active punishment windows

Relevant code:

- `frontend/src/app/chat/page.tsx`
- `frontend/src/components/chat/PunishmentPopout.tsx`
- `frontend/src/utils/punishment.ts`

### Chat participants are treated as real data, not decorative mock context

The chat shell increasingly leans on real user/profile data, especially in the participant view.

That suggests a preference for:

- keeping the chat experience grounded in live user state
- removing generic filler surfaces that do not map cleanly to current backend data

Relevant code:

- `frontend/src/app/chat/page.tsx`
- `frontend/src/components/layout/RightRail.tsx`

### Previous-cases clutter in chat was intentionally reduced

The right rail has been simplified over time so the chat shell does not pretend to have a richer room-history model than the current data actually supports.

The broader design direction feels like:

- keep chat focused
- let `Cases` and `Activity` carry the heavier moderation/history roles

### Cases header was simplified

The top-right icon cluster in `Cases` was removed because it duplicated chat-like navigation affordances without adding much value to the cases workflow itself.

Relevant code:

- `frontend/src/components/cases/CasesHeader.tsx`

## Backend context versus DB context

This timeline contains an important tension that future agents should understand.

### What changed

For parts of the UI, especially the `Cases` list view, the implementation was moved away from depending on the backend route and back toward direct database reads.

That shift happened for practical reasons:

- backend availability was a blocker
- some older backend assumptions were out of sync with the current schema
- direct reads from `moderation_cases` were a faster way to stabilize the UI

In that sense, some frontend context did shift from backend-facing to DB-facing.

### What still seems preferred

Even with that shift, the stronger architectural preference still appears to be:

- this branch uses direct Supabase reads in a few places for demo stability
- that should not be read as "Supabase imports are the better system design"
- if another engineer or agent is working in a fuller system, they should prefer the local backend API or whatever page-level server/data layer the app already uses
- business logic should continue to live behind backend APIs or backend services

So the more reusable interpretation is:

- direct Supabase reads are acceptable in this branch where they unblock demos or compensate for backend drift
- but the preferred architecture for future work is still to consume backend endpoints, server actions, or existing page-level data-fetching logic rather than teaching more frontend code to query Supabase directly

It still seems more aligned with the project direction to keep these in the backend:

- moderation case creation
- moderator assignment
- AI scan orchestration
- blockchain verification
- vote reconciliation
- resolution finalization
- punishment side effects

So the tone to carry forward is not:

- "this branch queried Supabase directly, so that must be the preferred pattern"

It is more like:

- "for this demo branch, direct DB reads were sometimes the fastest stabilizer"
- "for the actual architecture, backend APIs and backend-owned logic remain the preferred home"

## Suggestive context for future AI agents

If you are making future changes in this repo, it may help to think in these terms:

- the app seems to prefer chat-first UX over dashboard-first UX
- moderation is meant to feel embedded into the user experience, not bolted on
- newer cases should feel actionable first, not merely severe first
- punishment state should remain inspectable and user-visible
- this branch contains some direct Supabase reads for demo purposes
- future work should avoid treating those reads as the architectural gold standard
- backend logic still seems better placed behind backend APIs than inside raw frontend DB workflows

## Short version

The current branch suggests a product that is becoming:

- more visually stateful
- more moderation-aware inside chat itself
- more history-aware through `Activity`
- more workflow-oriented in `Cases`

And at the architectural level, the branch suggests a compromise:

- direct DB reads happened here as a practical workaround
- backend logic should still be thought of as backend-owned
- future implementations should generally prefer backend endpoints or existing application data layers over adding more raw Supabase querying to the frontend
