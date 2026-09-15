# Railway deployment

This is a maintainer reference. For the public project overview, see the [README](../README.md).

## Service layout

One Docker service runs the Next.js viewer and a private Node worker. The worker binds to loopback; only the viewer is exposed publicly. A supervisor starts both processes and exits if either fails.

Use one replica with a persistent volume mounted at `/app/data`. Set `DATA_DIR` to a directory on that volume. Trading journals, snapshots, and event history must survive deployments. Horizontal scaling requires additional coordination and is not supported by the current design.

## Initial deployment

1. Connect a fork or checkout of this repository to Railway. The included `Dockerfile` and `railway.json` define the build and health check.
2. Attach the persistent volume and configure `DATA_DIR`.
3. Start with `DATA_MODE=demo`, `PAPER=1`, `ALLOW_LOCAL_CONTROLS=0`, and `BOARD_MODE=test`.
4. Set a stable private `AUDIENCE_SECRET` for anonymous gallery cookies.
5. Configure a public domain and set `PUBLIC_URL` to its HTTPS URL.
6. Check `/api/health`, the 3D viewer, event-stream reconnection, and gallery behavior.

For public-board reads, configure server-only `RPC_URL`, public `TOKEN_MINT`, and `CREATOR_WALLET`. Use `BOARD_MODE=project` for the configured project. The current deployment's public identifiers are in [PROJECT_ADDRESSES.md](PROJECT_ADDRESSES.md).

## Wallet-backed deployment

Follow [LIVE_TRADING.md](../LIVE_TRADING.md) for shadow/live configuration and authenticated owner controls. A fresh live journal starts stopped. A previously started journal retains its state across normal restarts; deploying a new version is not a substitute for stopping execution.

Store wallet keys, RPC credentials, and owner-control credentials only in private environment variables. Never place them in browser-prefixed variables, the repository, screenshots, or logs. Use a separate journal directory when changing wallets.

## Operations

- `/api/health` checks worker availability and persistence health.
- Public rehearsal commands are disabled when `ALLOW_LOCAL_CONTROLS=0`.
- The owner endpoint requires its separate bearer credential.
- Anonymous gallery reactions are rate-limited by viewer identity, not verified token holdings. Additional edge rate limiting is appropriate for high public traffic.
- A volume-attached deployment can briefly interrupt service; viewers reconnect to the event stream.
- Optional Postgres stores demo snapshots. Live execution recovery uses its file journal on the persistent volume.

## Verification

```sh
npm ci
npm test
npm run build
node scripts/deployment-check.mjs
docker build -t the-floor .
```

The GitHub workflow runs these checks on pushes and pull requests. Railway deployments depend on the repository connection configured by the maintainer.
