#!/usr/bin/env python3
"""Bridge: turn the scraper's Service-Mapping CSV into the entities JSON that
`npm run ingest -- --source=live` consumes — reusing the scraper repo's OWN
denormalization (scripts/reload_firebase.aggregate/to_record/build_categories),
so the output matches the canonical Firebase `entities/*` shape exactly.

No Firebase, no database. Reads the CSV the scraper already wrote.

Env:
  SCRAPER_DIR   path to the lbresponse-scrapper checkout
                (default: ../lbresponse-scrapper relative to this repo)
"""
import csv
import json
import os
import sys
from datetime import UTC, datetime
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SCRAPER_DIR = Path(
    os.getenv("SCRAPER_DIR", str(REPO.parent / "lbresponse-scrapper"))
).resolve()
sys.path.insert(0, str(SCRAPER_DIR))

from scripts.reload_firebase import aggregate, build_categories, to_record  # noqa: E402

CSV_PATH = SCRAPER_DIR / "output" / "Service_Mapping_Main_horizontal_26_tableEx.csv"
OUT_PATH = REPO / "data" / "live-entities.json"


def main() -> None:
    if not CSV_PATH.exists():
        raise SystemExit(f"CSV not found: {CSV_PATH} (run the scraper first)")

    with CSV_PATH.open() as f:
        rows = list(csv.DictReader(f))

    raw_by_group, sectors, districts = aggregate(rows)
    now_iso = datetime.now(UTC).isoformat()
    providers = dict(to_record(key, raw, now_iso) for key, raw in raw_by_group.items())
    categories = build_categories(sectors, districts)

    snapshot = {
        "entities": {"providers": providers},
        "categories": categories,
        "entities_metadata": {
            "last_mirrored": now_iso,
            "source": "lbresponse-scrapper (live PowerBI)",
            "counts": {
                "providers": len(providers),
                "category_sector": len(sectors),
                "category_district": len(districts),
            },
        },
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(snapshot, ensure_ascii=False))
    print(
        f"Wrote {len(providers)} providers, {len(sectors)} sectors, "
        f"{len(districts)} districts -> {OUT_PATH}"
    )


if __name__ == "__main__":
    main()
