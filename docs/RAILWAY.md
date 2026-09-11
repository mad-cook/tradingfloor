# Deploy The Floor
The repository is prepared for one Railway service running the viewer and its private worker. This hosts the paper rehearsal plus real read-only public-board data. It does not enable real trading.

## GitHub
Remote: https://github.com/mad-cook/tradingfloor.git
This local repository selects the mad-cook account in Git Credential Manager. Authentication happens in GitHub's browser/device flow. Never paste a password, token, recovery code, or wallet secret into chat.

The current local branch can be published to the empty repository's main branch with:
```sh
git push -u origin HEAD:main
```
Do not use force push. If the remote has acquired commits, fetch and review them first. Nothing in these instructions executes a push.

## Railway
1. Sign in to Railway with the mad-cook GitHub account. Create a project from the tradingfloor repository and grant Railway access to that repository.
2. Railway discovers Dockerfile. Keep one replica. The startup supervisor starts the private worker, waits for it to be healthy, then starts Next.js on Railway's PORT.
3. Attach a persistent volume at /app/data. Set DATA_DIR=/app/data. Without the volume, redeploys lose the paper treasury, forecasts, and event history.
4. Set PAPER=1, DATA_MODE=demo, ALLOW_LOCAL_CONTROLS=0 and BOARD_MODE=test. Leave PORT to Railway. Do not expose worker port 3101.
5. Add RPC_URL using your server-side Helius URL. Add TOKEN_MINT and CREATOR_WALLET using public addresses. The creator wallet is also the treasury address.
6. Add a randomly generated AUDIENCE_SECRET (at least 32 random bytes). This stabilizes anonymous gallery cookies across deploys. It is not a wallet key.
7. Generate a Railway public domain and set PUBLIC_URL to the resulting https URL. Redeploy if needed. The social preview endpoint is /opengraph-image.
8. Check /api/health returns 200, the board is explicitly labeled TEST CONNECTIONS, all twelve desks appear, sound starts after entry, and gallery reactions reach the boss.

The supplied local test token/wallet are in ignored .env.local. They are not your project's launch addresses. Copy their public values yourself for a hosted test, then replace them and set BOARD_MODE=project for the actual launch. Keep the RPC key in Railway variables, never in GitHub or a browser bundle.

## Runtime behavior
- The viewer and worker share one container; worker binds only to 127.0.0.1.
- One replica is required: votes live in memory and one worker owns the simulation. Horizontal scaling needs a separate worker and shared audience/rate-limit store.
- Snapshots save atomically to DATA_DIR. A rotated event log retains two files of roughly 10 MB each.
- A persistent write failure makes the health check fail. The supervisor shuts down both processes if either exits.
- Public simulation commands return 403 by default. ALLOW_LOCAL_CONTROLS is only for local development; HTTP host/origin checks also remain in place.
- Gallery votes are anonymous entertainment, not authenticated holder voting. Cookies can be reset; use an edge rate limiter for a busy public launch. Totals cover fifteen minutes and reset on worker restart.
- Board requests are cached server-side for thirty seconds and failures show unavailable values. Old browser data is marked stale after ninety seconds.
- With a Railway volume, redeploys can briefly interrupt service. Expect viewers' event streams to reconnect.
- Optional Postgres: provision it, set DATABASE_URL, and run npm run db:migrate before starting against an empty database. This implementation saves the rehearsal snapshot; normalized production trading records remain future work.

## Verification
```sh
npm ci
npm test
npm run build
npm start
```
Docker is not required to run locally. To test the actual image on a machine with Docker:
```sh
docker build -t the-floor .
docker run --rm -p 3100:3100 -v floor-data:/app/data -e DATA_DIR=/app/data the-floor
```
GitHub Actions runs tests, a production build, and a Docker build. The repository does not automatically publish or deploy anything before you connect Railway.

References: [Railway Dockerfiles](https://docs.railway.com/builds/dockerfiles), [Volumes](https://docs.railway.com/volumes), [Healthchecks](https://docs.railway.com/deployments/healthchecks), [GitHub credential management](https://docs.github.com/en/get-started/git-basics/caching-your-github-credentials-in-git).

Local verification completed: 39 tests, production build, desktop/mobile browser checks, gallery/board checks, and isolated supervisor/persistence checks passed. Docker is not installed on this machine, so the actual Linux image build remains for GitHub Actions or Railway. No GitHub push or Railway deployment has been performed.
