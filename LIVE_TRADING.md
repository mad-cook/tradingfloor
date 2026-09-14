# Wallet-backed Solana trading

The default remains `DATA_MODE=demo`, `PAPER=1`. Deploying this code does not enable signing.

## Modes

- `demo`: existing fictional market and fictional fills.
- `shadow`: real creator-wallet balances, actual xStocks prices and desk proposals; no signer is loaded and no orders are submitted.
- `live`: the same wallet-backed view plus validated Jupiter swaps. Requires `PAPER=0`, `LIVE_TRADING_ENABLED=1`, `TRADING_PRIVATE_KEY` and matching `CREATOR_WALLET`.

Set secrets directly in Railway Variables. `TRADING_PRIVATE_KEY` accepts a base58 64-byte Solana secret key or a JSON array of 64 bytes. It must belong to `CREATOR_WALLET`. Do not commit it or paste it into chat. RPC_URL is server-only. Jupiter currently supports keyless requests; JUPITER_API_KEY is optional for configured capacity.

The launch wallet and test wallet must never share a journal. A wallet mismatch stops startup. Use a separate persistent directory for a new wallet, preserving the old directory. Keep one Railway replica and the `/app/data` volume. Railway may stop the previous volume-attached deployment before starting its replacement.

## Budget and execution

The entire native SOL balance is the shared treasury. All deposits, including manually claimed creator rewards, increase buying power. The app does not claim rewards itself. Keep 0.03 SOL reserved. Maximum order is 0.03 SOL equivalent; minimum is 0.003 SOL. Position cap for new buys is 15% of portfolio value. Orders are at least ten minutes apart, each desk waits one hour after a fill, and at most 24 submissions per UTC day. A 15% funding-adjusted drawdown from the portfolio high-water mark latches trading off.

Decisions are simple deterministic rules, not LLM investment analysis. After three fresh one-minute observations, an empty desk can propose a starter position; existing positions add only with positive observed momentum. Gain/loss and negative momentum can trigger partial sales. The cast and show remain fictional.

The allowlist comes from https://xstocks.com/products (2026-09-14). SPCX becomes COINx and GOOG maps to GOOGLx in wallet mode. Missing prices or swap routes block a trade; ticker matches never authorize a mint. Issuer pause flags block execution. Scaled-UI multipliers are applied to share quantities and valuations.

Before submitting: validate quote identities, age, amount, fees, impact (0.5%), slippage (50 bps), market-price agreement, sole signer and top-level programs. Simulate the exact message and inspect SOL spend, token amounts, unchanged existing token permissions and minimum output. New token-account rent is capped at 0.006 SOL and transaction fees at 0.0005 SOL. The signer stays in the worker; it is never returned by an API or serialized to storage.

A durable pending signature is written before submission. Unknown outcomes block new orders. After restart the worker checks that signature, never creates a replacement automatically. Only finalized on-chain receipts become fills. Failed transaction costs remain in portfolio P&L. Journal receipts retain finalized transaction identifiers; the public ledger displays the latest 500.

## Accounting boundaries

Portfolio value includes native SOL and the twelve allowlisted stocks. Other wallet tokens, including the project's own token, are excluded. Native SOL price changes and stock issuer scaling are part of P&L. External balance changes are funding/withdrawals valued when observed, not profit. Do not independently swap these same stock holdings from another app while the bot runs: unknown external swaps would be treated as funding flows. Claiming SOL rewards is supported. Account rent reduces liquid portfolio value until recovered.

## Launch sequence

1. Configure the real public creator address and RPC, select `shadow`, leave PAPER=1 and LIVE_TRADING_ENABLED=0. Verify balances, stock prices and UI against Solscan.
2. Enter TRADING_PRIVATE_KEY directly in Railway. Merely setting it in shadow mode does not sign anything.
3. Confirm a small unsigned swap simulation for the actual wallet and review the configured limits.
4. Enable live explicitly using DATA_MODE=live, PAPER=0, LIVE_TRADING_ENABLED=1. The live journal starts separately from shadow and demo state.
5. Check the first finalized buy and sell against their Solscan receipts. No funded execution has been tested by the build process.

To stop new orders: set KILL_SWITCH=1 and redeploy, or stop the Railway service for an immediate process stop. An already submitted transaction may still settle. The persisted killed flag is latched; investigate before resuming. The public audience controls cannot enable trading or change limits.

API references: https://developers.jup.ag/docs/swap/order-and-execute and https://developers.jup.ag/docs/price/v3 . Asset availability and issuer eligibility restrictions still apply; a route alone is not evidence of eligibility.
