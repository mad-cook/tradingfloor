# The Floor

Original low-poly trading-floor entertainment simulation built with Next.js, React Three Fiber, a separate Node worker, and Blender-generated assets.

## Run locally

Use Node 22 LTS and npm (Railway uses Node 22).

```sh
npm ci
npm run dev:all
```

Open http://localhost:3100. The worker listens on loopback port 3101. Alternatively run `npm run worker` and `npm run dev` in separate terminals. The production viewer uses `npm run build` then `npm start`; the supervisor starts both services.

## What works

- Original editable Blender scene, workstation, and one rigged analyst reused across twelve fictional desks; five named animation clips and per-desk jacket colors.
- Clickable 3D desks, camera transitions, dossiers, forecasts including misses, risk decisions, paper fill tickets, personnel and former-analyst records.
- Authoritative worker state, server-sent events, 1.5-second animation buffer, 400ms minimum event spacing.
- Deterministic rehearsal decisions and synthetic prices. Five simulated minutes per five-second tick.
- Pure risk kernel: whitelist, order/position/cash/turnover limits, cooldown, impact/slippage, stale quotes, market hours, inventory, kill switch, and drawdown breaker.
- Simulated execution, fractional UI-amount NAV, forecast scoring, two-session hiring protection, firing/replacement and lineage identifiers.
- Local rehearsal controls for pause, night shift, oversized pitch, session close, and execution halt. No live endpoint.
- Atomic local snapshot recovery and rotated event log in ignored `data/`.
- Optional Postgres snapshot persistence via `DATABASE_URL`. Run `npm run db:migrate` on an empty development database first. Full normalized schema is supplied but the initial rehearsal worker writes only its runtime snapshot; production projections remain to implement.
- 860 locally generated synthetic bark clips (728 distinct spoken lines and 266 phrase patterns) across thirteen processed voice profiles, a room-chatter bed, stereo desk voices, phones, keyboard and printer effects. At most two foreground voices play together. Entering the floor enables sound; the sound button mutes immediately. The voice bank is based on the installed Microsoft Zira voice with per-desk processing, not thirteen separate voice actors.

## Original assets

`scripts/build_assets.py` creates:
- `public/models/analyst.blend` and `analyst.glb`
- `public/models/workstation.blend` and `workstation.glb`
- `public/models/room.blend` and `room.glb`

Run `npm run assets:build` with Blender 4.5 at the configured Windows path. Adjust the script command if Blender is elsewhere. Assets use vertex colors and one material each to keep draw calls low. All characters and geometry are original; the supplied game screenshot is a stylistic reference only.

## Verification

```sh
npm test
npm run build
node scripts/browser-check.mjs
npm run preflight
```

Browser verification requires the local viewer/worker and installed Chrome. Screenshots and public-endpoint observations are under `reports/`. The automated suite covers the account simulation, dialogue, choreography, public board, principal cutaway, and office stories. The first measured desktop scene rendered about 119 fps, 39 draw calls, and 19,576 triangles in local headless Chrome; this is not a cross-device performance guarantee.

## Launch scope: entertainment

The simulated market is the product premise, not a temporary trading integration. No real-money execution or model-provider integration is required to launch this show. The public token/wallet board remains a separate read-only connection. See [launch plan](docs/LAUNCH_PLAN.md) for hosting and public-release work.

The original build specification is retained in docs/BUILD_SPEC.md as historical reference. Its financial-execution milestones are outside the current entertainment scope.

## Rebuild the audio bank

Run powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build_voices.ps1 on Windows with System.Speech and ffmpeg installed. Generated MP3s and their text manifest are tracked under public/vo. Browser audio verification: node scripts/audio-check.mjs.


## Dialogue and watchability

The dialogue selector enforces an eight-minute shared phrase cooldown, retains session history across refresh, and uses fresh desk banter instead of repeating exhausted event lines. The floor now stages challenge/reply/principal exchanges, uneven rushes, rival-facing swivels, and printer paper on fills. Reactions now spread between desks, repeated risk blocks trigger a principal visit, performance changes posture, and coffee/phone/paper props add occasional mishaps. See docs/WATCHABILITY.md for behavior details. Verify with node scripts/choreography-check.mjs.

Edit scripts/dialogue.mjs, run node scripts/dialogue.mjs, then run scripts/build_voices.ps1 to regenerate the expanded bank. The runtime uses manifest-v2.json and room-babble-v2.mp3; older audio remains unused for reference.

## Launch and brand

See [Railway deployment](docs/RAILWAY.md), [live launch plan](docs/LAUNCH_PLAN.md), and [brand guide](docs/BRAND.md). The app now includes a real read-only token/wallet board and anonymous gallery reactions. The trading engine remains a paper rehearsal.

### Principal cutaway
Local rehearsal controls include **Preview principal cutaway** (sound follows the sound button). The 41-second fictional scene uses panic, a lowered stage prop, blackout before the sound effect, silent hold, cleanup, and a replacement. No visible injury or blood. It pauses with the simulation, hidden page, or another app view. It changes no trading or treasury state.

Automatic playback is enabled only with `BOARD_MODE=project`: two fresh readings at least 35% below the observed 15-minute market-cap peak, with a ten-minute cooldown. Invalid/stale readings and duplicate samples cannot trigger it. The monitor lives in the web process and resets on restart; one Railway replica is required. Test-token mode is manual only.

Rebuild cinematic props with `scripts/build_cutaway_assets.py` in Blender, and voices with `scripts/build_cutaway_audio.ps1` on Windows. `node scripts/cutaway-check.mjs` rehearses the complete scene against the running local app.

## Office stories
Eight five-beat stories have two voiced scripts each (80 new clips): printer revolt, premature victory, desk rivalry, surprise audit, IT outage, hotline meltdown, coffee crisis, and mandatory motivation. The director starts after seven visible seconds, then allows 18–32 seconds of ordinary office activity between stories. Recent stories are avoided. Backing, doubting, and chaos reactions bias the next story family; incoming votes never interrupt a scene already playing.

Stories are cosmetic, per-viewer presentations of the shared fictional account. They do not modify positions, cash, or trades. Recurring adjacent-desk rivalries and performance-sensitive casting pick the characters. Tabs, hidden pages, and simulation pause freeze story time; the principal cutaway has priority. Cinema view and the director camera are optional. Dragging the room releases the director camera. Escape exits cinema view.

Edit packages/core/show-scenes.json and run scripts/build_show_audio.ps1 to rebuild the story voices. Local rehearsal controls preview each story. Browser verification: node scripts/show-check.mjs; automatic audience story checks: node scripts/show-audience-check.mjs. Full scripts and their text captions work with sound muted. New props are original procedural Three.js geometry.


Wallet-backed stock trading is available as an opt-in mode. See [LIVE_TRADING.md](LIVE_TRADING.md) for read-only preview, signing configuration, budget rules, and launch checks. The default demo remains unsigned.
