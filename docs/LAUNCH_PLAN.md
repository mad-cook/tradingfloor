# Launch plan — entertainment scope
Updated 14 September 2026.

## Product premise
The Floor is an animated fictional trading office. The market, trades, trading profits, and staff decisions are simulated on purpose. Its appeal is personalities, office disasters, rivalries, and audience participation. Real-money execution and model-provider connections are not launch requirements.

The configured token market cap, creator/treasury wallet SOL, and estimated direct creator fees are separate read-only real-world data. Simulated profits cannot fund a buyback or payout. The supplied sample token and wallet remain labeled test connections until replaced.

## Implemented
- Twelve fictional desks, principal, market simulation, forecasts, and paper receipts.
- Eight recurring office stories, two scripts each, 80 dedicated voiced lines, five timed beats per story.
- Paper storms, victory confetti and trophy, phone/coffee cascades, audit visits, IT outages, and rival reactions.
- Optional director camera, cinema view, readable subtitles, and recent office gossip.
- Anonymous gallery reactions influence the next story family, without interrupting the current story.
- Principal crash cutaway with a separate confirmed market-cap trigger; manual only in test mode.
- GitHub/Railway configuration, private worker, health checks, and persistent snapshot support.

## Remaining to publish
1. Publish the reviewed local branch to mad-cook/tradingfloor.
2. Connect Railway, deploy the Docker image, and verify the actual Linux build.
3. Attach persistent storage; configure private RPC URL and gallery cookie secret; keep public simulation controls disabled.
4. Connect final token mint and creator wallet when available. The same public creator wallet is the treasury display address. Set BOARD_MODE=project only with the correct project addresses.
5. Choose public domain/social links and final launch description.
6. Verify hosted desktop/mobile graphics and sound, reconnect behavior, snapshot recovery, and expected audience load. Add edge rate limiting before a busy public launch.

No wallet secret is needed to host the show or read the public board. No GitHub push, Railway deployment, token launch, real trade, reward claim, buyback, or distribution is performed by the show.

## Later, separate scope
Verified-holder perks, rewards, and buybacks require their own design and implementation. Any real distributions must use actual available funds, with clear operational rules. They are not implied by fictional office profits.

## Presentation behavior
The account simulation and incoming gallery tallies are shared by the server. Story timing, cast presentation, director camera, and gossip history are currently local to each viewer. Different viewers may see different comedic scenes. A synchronized broadcast is a future extension if desired.
