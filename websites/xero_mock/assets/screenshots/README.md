# Screenshots

No screenshots were downloaded. On 2026-11-18 the planning sandbox had no outbound network:
the image-search skill needs `icrawler`, which couldn't be installed, and WebFetch was blocked
for every domain. Use `DESIGN.md` (tokens and component specs) and `assets/README.md` §4 (per-view
layout descriptions) as the visual reference. If the network becomes available, run:

    python3 .claude/skills/image-search/scripts/image_search.py "Xero bank reconciliation screen match OK" websites/xero_mock/assets/screenshots --max 5
    python3 .claude/skills/image-search/scripts/image_search.py "Xero invoices awaiting payment list" websites/xero_mock/assets/screenshots --max 5
    python3 .claude/skills/image-search/scripts/image_search.py "Xero homepage dashboard 2025" websites/xero_mock/assets/screenshots --max 5
    python3 .claude/skills/image-search/scripts/image_search.py "Xero profit and loss report" websites/xero_mock/assets/screenshots --max 3
