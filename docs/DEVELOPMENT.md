# Development

## Local environment

Use Node.js 22 and npm. Run `npm ci`, then `npm run dev:all`. The viewer listens on port 3100 and the worker on loopback port 3101. The default configuration is an unsigned demo with synthetic prices.

For separate processes, run `npm run worker` and `npm run dev`. For a production-style local run, use `npm run build` followed by `npm start`; the supervisor starts both services.

Copy `.env.example` to `.env.local` only when custom configuration is needed. Keep secrets out of version control. Consult the [execution reference](../LIVE_TRADING.md) before configuring wallet-backed modes.

## Tests

```sh
npm test
npm run build
node scripts/deployment-check.mjs
```

The deployment check starts isolated local services. Browser checks in `scripts/` require a running local app and installed Chrome. They are optional development diagnostics, not proof of performance on every device.

## Original 3D assets

`scripts/build_assets.py` generates the analyst, workstation, and room as editable Blender files and GLB assets under `public/models/`. Geometry uses faceted shapes, vertex colors, and restrained material counts.

`npm run assets:build` uses Blender 4.5 at the Windows path in `package.json`; adapt the executable path for other installations. Additional generators build the coffee and cinematic props. Regeneration is unnecessary to run the checked-in app.

## Dialogue and audio

The voice bank uses authored dialogue and synthetic speech with per-character processing. It is not live LLM-generated dialogue. Existing MP3s and manifests are included under `public/vo/`.

- Dialogue source: `scripts/dialogue.mjs`.
- Voice regeneration: `scripts/build_voices.ps1` on Windows with System.Speech and ffmpeg.
- Office story source: `packages/core/show-scenes.json`.
- Story voices: `scripts/build_show_audio.ps1`.

See [watchability](WATCHABILITY.md) for repetition protection, reaction chains, and presentation behavior.
