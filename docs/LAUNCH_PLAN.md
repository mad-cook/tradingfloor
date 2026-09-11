# From rehearsal to a live project
Updated 11 September 2026.

## What runs today
The shared worker owns twelve fictional analyst desks and a principal. Every five real seconds it advances five simulated market minutes, generates synthetic prices and scripted proposals, applies the risk kernel, records simulated fills, resolves forecasts, and scores analysts. The browser receives that state and turns events into movements, dialogue, reactions, and paperwork. The show is shared; each viewer controls their own camera and sound.

The desks are not currently making LLM calls or executing brokerage/on-chain trades. Model and market adapter code exists, but the rehearsal worker does not invoke it. PAPER=0 fails closed.

The public board is a separate read-only connection:
- DEX Screener supplies the exact configured Solana token's market cap, price, change and liquidity. It selects the most liquid matching base-token pool. Missing market cap is not silently replaced by FDV.
- Helius/Solana RPC supplies the configured creator/treasury wallet's SOL.
- Creator-fee estimates read the direct Pump SOL vault (less rent) and PumpSwap WSOL vault for that wallet. They exclude shared-fee allocations and non-SOL quote tokens, so they are not a complete account-wide rewards statement.
- Market cap, wallet balance, unclaimed fees and the $500 paper account are four different quantities. Unclaimed rewards have not funded trading.
- The supplied token and wallet are independent test examples. Neither is presented as The Floor's launched token or treasury.

Public gallery reactions affect character behavior. They cannot choose a trade, move money, or change risk limits. They are anonymous browser votes, not holder voting, and totals are temporary.

## Milestone 1: public hackathon demo
The code is prepared for GitHub + Railway. See RAILWAY.md for exact steps.

You provide:
1. Railway account/project authorization and any hosting plan/domain you choose.
2. Server-side Helius RPC configuration in Railway variables; the existing key was reused locally without committing it.
3. Real token mint and creator wallet when they exist. CREATOR_WALLET is also the treasury address.
4. Final public token description and launch terms. Keep the rehearsal label until trading is actually live.

No wallet secret is needed for the demo, balance reads, market cap, or gallery.

## Milestone 2: real-market paper trading
Before any real money:
1. Confirm the venue: the original architecture anticipates tokenized equities on Solana through Jupiter. Actual shares at a broker require a separate broker integration and account permissions.
2. Validate the issuer registry, exact mints, backing/redemption/eligibility, and supported executable routes. A familiar ticker is not enough.
3. Connect licensed market data, market sessions, stale-quote rules, benchmarks, and executable quote checks.
4. Connect a chosen model provider and funded API account. Analyst and principal outputs must pass strict schemas; models never get signing keys or bypass the deterministic risk kernel.
5. Run live-market paper sessions, reconcile results, test outages and retries, and measure model cost/latency before presenting the workers as live AI traders.

## Milestone 3: a tightly limited real-money pilot
This is additional implementation, not an environment-variable flip.

- Approve the operating entity, jurisdiction, venue eligibility and public claims with qualified counsel.
- Decide the maximum capital at risk, reserve for operations/tax, allowed assets, order size, exposure, turnover, slippage, drawdown and loss stops.
- Implement a separate constrained execution service: signing, simulation, confirmation, idempotency, reconciliation, failed/expired transactions, balances, and audit records.
- Put keys behind a dedicated signing service with spend limits and an emergency stop. Keep the creator/treasury address visible, but do not give an LLM or public web process unrestricted access to it.
- Treat creator fees as treasury contributions only after actual successful claims/transfers are recorded. Fees fluctuate with activity; they are not a reliable funding promise.
- Implement authenticated operations, alerts, durable normalized records, backups, monitoring and a recovery drill.
- Start with explicitly approved small capital after the paper checks pass. No real trade, claim, token launch or payout was authorized or executed during this build pass.

## Narrative and holder participation
A closer description is a proprietary trading house: it trades its own treasury. A broker executes for customers. The current product is a fictional AI trading-floor experiment, not a licensed financial firm.

A token's market cap is not the company's value, equity, assets, available cash or a redeemable investment. Calling token holders shareholders/investors with dividend rights creates substantive questions, not just a branding choice.

Pump's terms updated 1 September 2026 prohibit using its services for a capital raise, pooled investment scheme, profit-sharing arrangement, revenue participation, or tokenized business ownership/debt (restricted-use clause (t)). The proposed creator-reward-funded trading pool plus token dividends conflicts with that stated platform restriction. A buyback is not an automatic workaround. Obtain platform confirmation and jurisdiction-specific securities/tax advice before choosing a structure or making return promises.

For the hackathon, use participation that works today: audience reactions, desk watchlists, prediction games scored in points, votes on cosmetic office changes, and character/story involvement. Verified-holder perks later need wallet-signature authentication, correct token-account ownership and mint checks, a documented snapshot policy, and protection against replay and duplicate accounts.

If profit distributions are eventually legally/platform-permitted under a different approved structure, they need a separately reviewed specification: realized net distributable profits, loss carry-forward, reserve policy, eligible-wallet snapshots, treasury/LP/exchange exclusions, sanctions/tax handling where applicable, wallet splitting, claim proofs, claim periods and transaction accounting. A raw “top 100–500 holders” list is vulnerable to balance movement, split wallets and pool/exchange addresses, and disproportionately favors the largest balances. No dividend entitlement or automatic buyback is implemented here.

## Sources
- [Pump terms](https://pump.fun/docs/terms-and-conditions), especially creator fees and restricted uses.
- [Pump fees](https://pump.fun/docs/fees): fee amounts and collection depend on current protocol settings.
- [Pump creator-vault documentation](https://github.com/pump-fun/pump-public-docs/blob/main/docs/PUMP_CREATOR_FEE_README.md).
- [PumpSwap creator-vault documentation](https://github.com/pump-fun/pump-public-docs/blob/main/docs/PUMP_SWAP_CREATOR_FEE_README.md).
- [DEX Screener API](https://docs.dexscreener.com/api/reference).
- [SEC crypto-asset guidance](https://www.sec.gov/resources-small-businesses/capital-raising-building-blocks/crypto-assets-federal-securities-laws). US guidance is not a substitute for review of the jurisdictions where you operate and market.
