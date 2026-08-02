# Insider static web export

The web export converts analytical CSV.GZ artifacts into compact, page-oriented JSON for the Next.js application.

## Commands

Export existing completed pipeline artifacts:

```bash
python -m pipeline.cli export-web
```

Export one company while developing:

```bash
python -m pipeline.cli export-web --ticker SGNL
```

Run the complete daily pipeline and publish frontend data:

```bash
python -m pipeline.cli run-all --export-web
```

Use cached SEC and price data:

```bash
python -m pipeline.cli run-all \
  --skip-sec-download \
  --export-web
```

Run only the export stage and its declared dependencies:

```bash
python -m pipeline.cli run-stage export_web \
  --skip-sec-download
```

## Frontend data structure

```text
web/public/data/
├── manifest.json
├── overview.json
├── status.json
├── methodology.json
├── discoveries.json
├── featured.json
├── search-index.json
├── sectors.json
├── activity/
│   └── daily.json
├── visualization/
│   ├── constellation.json
│   ├── heartbeat.json
│   ├── ripples.json
│   └── sector-orbits.json
├── rankings/
│   ├── breaking-habits.json
│   ├── quiet-buyers.json
│   ├── wolf-packs.json
│   ├── growing-positions.json
│   ├── accelerating.json
│   ├── contrarian.json
│   └── under-the-radar.json
├── companies/
│   ├── index.json
│   └── {ticker}.json
├── insiders/
│   ├── index.json
│   └── {owner-cik}.json
└── history/
    └── {ticker}.json
```

The visual exports are intentionally precomputed:

- `constellation.json` provides deterministic company positions, radius, glow, and pulse.
- `heartbeat.json` provides a chronological signal pulse.
- `ripples.json` scales large purchases into visual wave radii.
- `sector-orbits.json` provides sector mass and orbit placement.
- `activity/daily.json` supports scrollable timelines and temporal landscapes.

The exporter writes into a temporary sibling directory, validates and hashes the resulting files, writes `manifest.json` last, and atomically replaces `web/public/data/`.
