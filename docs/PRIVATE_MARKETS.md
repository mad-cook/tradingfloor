# Private-markets visitor and Pyth research

## PreStocks

The public product registry at `https://prestocks.com/api/prestocks` provides token identities, token prices, issuer reference marks, and implied valuations. The adapter validates identities and numeric fields, caches successful or failed responses for one minute, and withholds new pitches when data is unavailable or older than three minutes.

A visitor carries a selected product into the office. The principal and another analyst discuss it, with two possible research outcomes:

- WATCHLIST: token premium relative to reference mark is between -30% and +5%.
- PASS: outside that illustrative research band.

These are transparent story/research rules, not an investment recommendation or execution strategy. The registry does not provide a mark timestamp, and a reference mark is not an executable price. The panel links to the exact token on Solscan. No PreStocks mint has been added to the funded trading allowlist. A WATCHLIST outcome does not sign or submit an order.

Visits occur at most approximately once per four minutes of normal viewing, or through the “Hear the pitch” buttons. Prices and the outcome are frozen for each scene so dialogue cannot change mid-pitch.

## Pyth

Set the private server variable `PYTH_PRO_API_KEY` to enable the comparison. Never use a browser-prefixed variable. Without the key the UI explicitly says the connection is pending; it does not substitute another provider and label it Pyth.

The integration requests official Pro feed IDs 922 (`Equity.US.AAPL/USD`) and 1792 (`Crypto.AAPLX/USD`). It uses each price's exponent, confidence, original feed-update timestamp, and market session. A premium is shown only with both valid feeds, updates newer than sixty seconds, confidence within 1%, and a regular underlying-equity session. Closed, stale, missing or uncertain data withholds comparison.

The current comparison is research context, not an execution gate. Before advertising a verified live Pyth integration, connect the key and verify an authenticated response in production. Automated tests cover parsing and stale/closed-market handling; an absent key is not a live validation.

References:
- https://prestocks.com/products
- https://docs.pyth.network/price-feeds/pro/acquire-api-key
- https://docs.pyth.network/price-feeds/pro/api/rest
- https://docs.pyth.network/price-feeds/pro/payload-reference
