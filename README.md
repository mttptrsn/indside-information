# Insider

Insider is a Python 3.12+ research-data pipeline for finding unusual open-market insider purchases at smaller U.S. public companies.

The project is designed around a simple idea: a purchase is more informative when it represents a meaningful change in an insider's own historical behavior. Later stages will measure purchase abnormality, long buying silences, clusters of operating executives buying together, ownership increases, purchase velocity, and purchase acceleration.

Insider buying is evidence for further investigation, not proof that a security is undervalued or will rise.

## Pipeline philosophy

The pipeline separates immutable source evidence from normalized records, enriched histories, behavioral signals, rankings, and eventual static web exports.

Core principles:

- SEC accession numbers and CIK values are durable identifiers.
- Tickers are attributes, not permanent identity keys.
- Raw SEC ownership documents remain unmodified XML.
- Tabular intermediate artifacts use CSV.GZ.
- Metadata and manifests use JSON.
- Each stage has explicit versioned contracts.
- Every write is atomic.
- Every artifact carries lineage, generation time, schema version, and quality information.
- Historical scoring must be causal and must not use future observations.
- Network behavior must be cache-friendly, rate-limited, retried, and testable offline.
- Identical inputs and configuration should produce deterministic outputs.

## Current scope

This foundation stage includes:

- Project configuration
- Versioned artifact contracts
- Typed dataclass records
- Contract and configuration validation
- Atomic JSON, text, bytes, and CSV.GZ writing
- Hashing and UTC timestamp helpers
- An argparse CLI
- Tests for configuration, contracts, versioning, serialization, and atomic writes

The following are intentionally deferred:

- SEC bulk and recent filing ingestion
- Form 4 XML parsing
- Normalization
- yfinance price ingestion
- Behavioral signals
- Rankings
- Pipeline orchestration
- Static Next.js export

## Directory layout

```text
pipeline/
├── cli.py
├── exceptions.py
├── config/
├── contracts/
├── utils/
├── ingest/
├── normalize/
├── validate/
├── enrich/
├── signals/
├── rankings/
└── runner/

tests/
data/                 created by later stages
web/public/data/      created by the future export stage
```

## Installation

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
```

## Configure SEC identity

Before any future SEC network command, replace the placeholder in `pipeline/config/pipeline.json`:

```json
"user_agent": "Your Name your-email@example.com"
```

The SEC expects automated clients to identify themselves and comply with fair-access guidance. This project defaults to five requests per second, below the SEC's published maximum of ten requests per second. Future ingestion stages must cache responses, retry transient failures, and avoid repeatedly downloading unchanged documents.

## Validate contracts

```bash
python -m pipeline.cli contracts validate
```

A successful run validates:

- All required configuration files
- Required configuration keys
- Numeric thresholds and ranges
- Weight groups that must sum to 1.0
- Known quality levels
- Artifact schema declarations
- Dataclass schema versions

## Run tests

```bash
pytest
```

## Planned stage flow

```text
contracts
  -> SEC historical and recent ingestion
  -> XML parsing and normalization
  -> validation and quality reports
  -> yfinance prices
  -> purchase events and campaigns
  -> executive histories
  -> behavior and conviction signals
  -> discovery rankings
  -> static JSON export for Next.js/Vercel
```

## Data limitations

SEC ownership filings are filed by reporting persons and can contain amendments, footnotes, indirect ownership, multiple transaction lots, and reporting errors. Later stages must preserve source evidence and expose ambiguity rather than silently correcting it.

yfinance is an unofficial convenience source. Coverage, metadata, corporate actions, symbols, and historical records can be missing or revised. Price quality must be reported separately from SEC filing quality.

## Investment limitation

This software is for research and educational use. It does not provide investment advice, and no score or purchase pattern should be interpreted as a guarantee of future performance.


## SEC ingestion architecture

Historical backfills and daily updates use different paths:

- `ingest-sec-bulk` downloads SEC quarterly Form 3/4/5 ZIP archives for scalable history.
- `ingest-sec-recent` reads recent EDGAR daily indexes, filters Forms 4 and 4/A, downloads full submissions, extracts the immutable `ownershipDocument` XML, and caches company ticker mappings.
- `normalize` parses cached XML into filings, issuers, insiders, securities, footnotes, and transactions.
- `validate-sec` produces independent filing, identity, and transaction quality reports.

Direct ownership XML has precedence over flattened quarterly records when both describe the same filing. Original evidence is never deleted.

### Raw SEC layout

```text
data/raw/sec/
├── bulk/archives/
├── bulk/extracted/
├── bulk/download_manifest.csv.gz
├── indexes/
├── filings/<issuer-cik>/<accession-number>/
│   ├── filing.xml
│   ├── metadata.json
│   └── request.json
└── reference/company_tickers.json
```

### Normalized artifacts

```text
data/normalized/filings.csv.gz
data/normalized/issuers.csv.gz
data/normalized/insiders.csv.gz
data/normalized/securities.csv.gz
data/normalized/footnotes.csv.gz
data/normalized/transactions.csv.gz
```

### Commands

```bash
python -m pipeline.cli ingest-sec-bulk --start-year 2024
python -m pipeline.cli ingest-sec-recent --lookback-days 10
python -m pipeline.cli normalize
python -m pipeline.cli validate-sec
```

Each command writes a machine-readable report under `data/quality/pipeline_runs/` and updates `data/quality/latest_run.json`.

### Known SEC limitations

Form 4 filings can contain amendments, multiple reporting owners, multiple price lots, weighted-average price footnotes, indirect ownership, derivative transactions, and reporting errors. The parser preserves these structures and marks malformed or ambiguous records instead of silently manufacturing certainty. Derivative acquisitions are retained but are never treated as qualifying open-market purchases.


## Prices, enrichment, and behavioral signals

`ingest-prices` uses yfinance with `auto_adjust=False`, writes one canonical CSV.GZ per ticker under `data/raw/prices/`, and validates freshness, OHLC consistency, duplicate dates, volume, splits, and history depth. Metadata is cached separately under `data/raw/company_metadata/`.

`enrich` groups Form 4 lots into daily economic purchase events, groups nearby events into campaigns, calculates ownership changes, attaches causal price context, preserves reported values, and creates split-adjusted share and price fields without changing historical transaction value.

`build-histories` creates one row per event using only purchases strictly earlier than that event. `score-signals` calculates abnormality, silence, velocity, acceleration, clusters, behavior change, and conviction with visible component and penalty JSON. Forward returns are evaluation-only columns and never enter live scores.

```bash
python -m pipeline.cli ingest-prices
python -m pipeline.cli ingest-prices --ticker ABCD
python -m pipeline.cli enrich
python -m pipeline.cli build-histories
python -m pipeline.cli score-signals
python -m pipeline.cli process
```


## Rankings and pipeline runner

The final backend stage creates deterministic discovery rankings under `data/rankings/`, including breaking habits, quiet buyers, wolf packs, growing positions, acceleration, contrarian activity, under-the-radar companies, and sector activity. Each ranking exposes underlying metrics and evidence-based headlines.

### First historical build
```bash
python -m pipeline.cli ingest-sec-bulk --start-year 2024
python -m pipeline.cli ingest-sec-recent --lookback-days 10
python -m pipeline.cli normalize
python -m pipeline.cli validate-sec
python -m pipeline.cli process
```

### Daily run
```bash
python -m pipeline.cli run-all
```

### Existing-data/offline run
```bash
python -m pipeline.cli run-all --skip-sec-download
```

### Focused and resumed runs
```bash
python -m pipeline.cli run-all --ticker ABCD
python -m pipeline.cli run-all --accession 0001234567-26-000123
python -m pipeline.cli run-stage rankings
python -m pipeline.cli run-stage signals --ticker ABCD
python -m pipeline.cli run-all --resume RUN_ID
```

Resume is refused when configuration hashes changed. `status` reports artifact availability, run history, record counts, freshness, and quality warnings.

```bash
python -m pipeline.cli status
```

This project stops at ranked CSV.GZ artifacts. Static JSON export into `web/public/data/` is the next independent stage.
