# Make The Floor worth watching

The viewer should understand who wants something, who disagrees, what the boss decides, and who was right. More simultaneous motion alone becomes noise.

## Implemented in this pass

- A larger authored voice library: 860 clips, 728 distinct spoken lines, 266 different sentence patterns.
- Each desk has sixteen bespoke ambient lines, not a shared four-line rotation.
- Each trade outcome has six variants per desk. Fill and forecast claims only follow their matching worker events.
- Eight-minute repetition protection applies across voices and survives refresh within the browser session.
- Old low-priority calls expire. If a category runs out of fresh lines, the room uses fresh neutral banter or stays quiet instead of repeating.
- Office banter is staged as challenge → rival response → principal interruption. It is flavor, not an invented trading decision.
- Swivels toward a rival, principal gestures, and paper bursts from the printer on actual paper fills.
- Uneven pacing: ordinary office hum gives way to a short rush, then settles. Maximum two intelligible foreground voices.
- A longer, heavily filtered room-chatter bed replaces the obvious twenty-second loop.

## Choreography pass

- Forecast wins trigger a celebration and staggered neighbor reactions, including an objection. Fills and misses draw nearby attention. Waves have a cooldown and preserve active desk moments.
- Three risk blocks at one desk within ninety active seconds send the principal through the aisles for a review and back to the office. Visits last twenty-three active seconds with a cooldown between trips.
- Desk posture reflects P&L and resolved forecast accuracy: confident lean-back, strained slump, or neutral working posture.
- A separate Blender coffee asset tips and recovers; phone cords occasionally tangle. Desk paperwork grows with pitches and orders, capped at eighteen sheets per desk. Mishaps are cosmetic.
- Choreography advances per rendered frame and freezes while paused or the page is hidden. No shared animation restart is needed for each simulation snapshot.
- Verified by 37 core/dialogue/choreography tests and an isolated browser event stream covering reactions, boss visit/return, moods, props, and pause/resume. Desktop/mobile control checks remain clean.

## Next possibilities

1. Rivalries with memory: bring back the analyst who challenged a forecast when its actual result arrives.
2. Optional spectator camera direction: follow a developing exchange and yield immediately to manual camera movement.
3. Dedicated character animations for coffee catches and untangling, plus short pacing routes for struggling analysts. This pass uses the existing expressive gestures and posture changes.

## Rhythm to aim for

About thirty seconds: a few desks work, a phone interrupts, a specific analyst stands to pitch, a rival answers, the boss cuts through, the real verdict lands, and the room settles. Avoid making every tick equally dramatic. Reserve big gestures for big moments.

Mute must retain visual readability. Respect reduced motion, never steal the camera while the user is inspecting a desk, and keep the trade ledger authoritative.
