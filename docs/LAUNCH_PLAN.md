# Implementation status

THE FLOOR is deployed at https://stocklanafloor.fun. It supports a default local demo, an unsigned wallet-observation mode, and explicitly enabled real Solana stock-token trading.

## Available

- Original 3D office, twelve broker personalities, voiced stories, and audience reactions.
- Rules-based stock-token proposals, quote validation, transaction simulation, and finalized trade receipts.
- Persistent trading journal, owner start/stop controls, reserve and exposure limits, and drawdown halt.
- Live broker scores refreshed with fresh prices, with one-hour forecast resolution.
- Treasury SOL, direct creator-fee vault reads in SOL and the supported stock quote token, and token market data.
- A labeled fully diluted estimate when a stock-quoted token lacks a provider USD market cap.

## Boundaries

- Broker personalities and dialogue are authored fiction. Current trade decisions are deterministic rules, not LLM investment analysis.
- Public reactions affect story selection, not orders or trading settings.
- Rewards require manual claiming. Stock rewards are not automatically converted to SOL.
- No automatic holder distributions, buybacks, or dividends are implemented.
- Automatic firing/replacement and session-based hiring protection belong to demo mode. Live personnel scores do not fire analysts.
- Story presentation is mostly per viewer rather than a synchronized broadcast.
- The market-drop scene monitor keeps a rolling 15-minute history in web-process memory. Restarts clear that history, sampling depends on board requests, and late viewers can miss an event. Persistent trigger history and more reliable delivery remain outstanding.
- The portfolio includes SOL and allowlisted stock tokens, not every asset in the creator wallet.

See the [execution reference](../LIVE_TRADING.md) for exact accounting and risk behavior, and [deployment guide](RAILWAY.md) for hosting requirements.
