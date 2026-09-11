-- Shared with Mirror
CREATE TABLE tokenized_assets (
  mint          TEXT PRIMARY KEY,
  issuer        TEXT NOT NULL,
  symbol        TEXT NOT NULL,
  underlying    TEXT NOT NULL,
  decimals      INT  NOT NULL,
  token_program TEXT NOT NULL,
  liquidity_usd NUMERIC,
  routable      BOOLEAN NOT NULL,
  last_seen_at  TIMESTAMPTZ NOT NULL
);

-- A desk is permanent; the analyst sitting at it is not.
CREATE TABLE desks (
  id          TEXT PRIMARY KEY,          -- 'nvda'
  mint        TEXT NOT NULL REFERENCES tokenized_assets(mint),
  underlying  TEXT NOT NULL,             -- 'NVDA'
  seat_index  INT  NOT NULL,             -- position in the 3D scene
  active      BOOLEAN DEFAULT TRUE
);

CREATE TABLE analysts (
  id            TEXT PRIMARY KEY,
  desk_id       TEXT NOT NULL REFERENCES desks(id),
  name          TEXT NOT NULL,
  voice_id      TEXT NOT NULL,
  portrait_seed TEXT NOT NULL,
  traits        JSONB NOT NULL,          -- see §9.3
  hired_at      TIMESTAMPTZ NOT NULL,
  fired_at      TIMESTAMPTZ,             -- NULL = employed
  fired_reason  TEXT,
  parent_id     TEXT REFERENCES analysts(id)   -- mutation lineage
);
CREATE UNIQUE INDEX one_seat_per_desk ON analysts (desk_id) WHERE fired_at IS NULL;

-- Every pitch, approved or not. This is the transparency record.
CREATE TABLE pitches (
  id             BIGSERIAL PRIMARY KEY,
  analyst_id     TEXT NOT NULL REFERENCES analysts(id),
  desk_id        TEXT NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT now(),
  side           TEXT NOT NULL,          -- 'BUY' | 'SELL' | 'HOLD'
  conviction     INT  NOT NULL,          -- 1-10
  size_request   NUMERIC,                -- USD
  horizon_hours  INT  NOT NULL,
  thesis         TEXT NOT NULL,          -- <= 400 chars, shown in the dossier
  forecast_price NUMERIC NOT NULL,       -- the falsifiable bit
  forecast_at    TIMESTAMPTZ NOT NULL,
  spot_at_pitch  NUMERIC NOT NULL,
  boss_decision  TEXT,                   -- 'APPROVE' | 'REJECT' | 'TRIM'
  boss_reason    TEXT,
  approved_usd   NUMERIC,
  risk_verdict   JSONB,                  -- which limits passed/failed
  model          TEXT NOT NULL,
  raw            JSONB
);

-- Resolved forecasts — the honest scoreboard.
CREATE TABLE forecast_results (
  pitch_id      BIGINT PRIMARY KEY REFERENCES pitches(id),
  resolved_at   TIMESTAMPTZ NOT NULL,
  actual_price  NUMERIC NOT NULL,
  direction_hit BOOLEAN NOT NULL,
  abs_pct_error NUMERIC NOT NULL,
  vs_benchmark  NUMERIC NOT NULL         -- excess vs SPYx over the same window
);

CREATE TABLE orders (
  id            BIGSERIAL PRIMARY KEY,
  pitch_id      BIGINT REFERENCES pitches(id),
  desk_id       TEXT NOT NULL,
  side          TEXT NOT NULL,
  mint          TEXT NOT NULL,
  usd_amount    NUMERIC NOT NULL,
  paper         BOOLEAN NOT NULL,
  status        TEXT NOT NULL,           -- PENDING|FILLED|FAILED|REJECTED
  reject_reason TEXT,
  signature     TEXT,                    -- ← the ticket links here
  price_impact  NUMERIC,
  filled_ui_qty NUMERIC,
  fill_price    NUMERIC,
  created_at    TIMESTAMPTZ DEFAULT now(),
  filled_at     TIMESTAMPTZ
);

CREATE TABLE treasury_snapshots (
  at         TIMESTAMPTZ PRIMARY KEY,
  cash_usdc  NUMERIC NOT NULL,
  nav_usd    NUMERIC NOT NULL,
  spyx_price NUMERIC NOT NULL,
  positions  JSONB NOT NULL              -- [{mint, uiQty, usdValue, costBasis}]
);

CREATE TABLE sessions (
  id          BIGSERIAL PRIMARY KEY,
  opened_at   TIMESTAMPTZ NOT NULL,
  closed_at   TIMESTAMPTZ,
  open_nav    NUMERIC,
  close_nav   NUMERIC,
  fired_id    TEXT REFERENCES analysts(id),
  hired_id    TEXT REFERENCES analysts(id)
);

-- Everything the 3D scene plays back.
CREATE TABLE events (
  id         BIGSERIAL PRIMARY KEY,
  at         TIMESTAMPTZ DEFAULT now(),
  kind       TEXT NOT NULL,              -- see §10.2
  desk_id    TEXT,
  payload    JSONB NOT NULL
);

CREATE TABLE floor_runtime (id TEXT PRIMARY KEY, snapshot JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
