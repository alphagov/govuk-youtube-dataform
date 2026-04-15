# GOV.UK YouTube Dataform

A [Dataform](https://cloud.google.com/dataform) project that models YouTube Analytics data for the GOV.UK YouTube channel into BigQuery, combining two data sources into a unified reporting layer.

**GCP project:** `gds-social-data` | **Dataset:** `dataform_youtube_processing` | **Region:** `europe-west2`

---

## Data Sources

| Period | Source |
|---|---|
| Pre 2025-12-01 | YouTube Analytics API only |
| 2025-12-01 – 2026-02-28 | Both (overlap window — used for validation) |
| Post 2026-02-28 | YouTube Data Transfer only |

Fact and target models use `UNION ALL` with a `data_source` column to stitch the two sources together. The overlap window is used by verification models to confirm alignment before committing to the stitched model.

---

## Repository Structure

```
definitions/
├── raw/          # Views over source tables (API + Data Transfer)
├── staging/      # Normalised per-source models (stg_api_*, stg_dt_*)
├── lookups/      # Reference tables for canonical value mapping
├── target/       # Final reporting tables (tgt_*)
├── verification/ # Source reconciliation and data quality checks (ver_*)
└── assertions/   # Dataform data quality tests
```

**Staging** cleans and standardises each source independently before they are combined in **target** models. **Lookups** provide canonical mappings for dimensions such as content type, country, device, OS, and traffic source. **Verification** models validate the overlap window and check for gaps, duplicates, and boundary violations.

---

## Data Flow

```
Analytics API  ──► raw_* ──► stg_api_* ─┐
                                          ├─► tgt_* (reporting tables)
Data Transfer  ──► raw_* ──► stg_dt_*  ─┘
                    │
                lookups/ (canonical value mapping throughout)

ver_* ◄── overlap window validation (Dec 2025 – Feb 2026)
```

---

## Known Limitations

- Demographics data outage from 16 March 2026 (Google issue: 488961396)
- Country and gender dimensions cannot be queried simultaneously via the Analytics API
- Analytics API tokens expire every 7 days (app is in testing mode)
- Playlist, cards, and impression metrics are not modelled
