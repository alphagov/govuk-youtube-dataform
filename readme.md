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

## Adding Columns: updating `includes/constants.js`

Two arrays register every column that should be checked for being entirely NULL:

| Array | Covers |
|---|---|
| `stagingAlwaysNullChecks` | `stg_*` models |
| `targetAlwaysNullChecks` | `tgt_*` models |

`definitions/assertions/bulk_assertions_always_null.js` iterates both and generates one `<table>_always_null_check` assertion per entry, failing if a listed column has no non-NULL value anywhere inside that entry's `windowInterval`.

**When you add a column to a `stg_` or `tgt_` model, add its name to that model's `columns` array.** There is no central registry and nothing enforces this — an unlisted column is silently unchecked. It doesn't fail, it just never gets tested.

### Some staging entries also build the model

For EAV-shaped insights sources (Facebook, Instagram, Threads), the staging model reads its own entry back to build the pivot:

```js
const insightsColumns = stagingAlwaysNullChecks.find(
  check => check.table === 'stg_instagram_media_insights'
).columns;
```

In those models the array *is* the source of truth for which columns exist — adding a metric name creates the column and registers the check in one step. The name must match the source's `metric` value exactly.

### Check whether the column also generates a `_daily_change`

This is the easy one to miss. Where a target derives daily change from cumulative lifetime totals, **one new staging metric produces two new target columns**:

| Staging entry | Target columns generated |
|---|---|
| `saved` | `saved`, `saved_daily_change` |

The targets that do this — `tgt_instagram_feed_combined`, `tgt_instagram_reels_combined`, `tgt_threads_media_combined` — read the staging array to generate their SQL, so the change columns appear in the output automatically. **`targetAlwaysNullChecks` does not follow: it is maintained by hand.** Add both the lifetime and the `_daily_change` name to the target entry yourself.

Two things to watch:

- **Renamed columns.** The Instagram feed/reels models alias `likes` → `likes_lifetime` on the way out, so the change column is `likes_lifetime_daily_change`, not `likes_daily_change`. Register the output name, not the source name.
- **`days_since_previous_snapshot`.** One per model, not one per metric. It's already registered on the models that have it, so it only needs adding when a target starts deriving daily change for the first time.

Account-level models (`tgt_instagram_account_combined`, `tgt_threads_account_combined`) spell their columns out longhand rather than reading an array, so both the model and the constants entry need editing by hand.

### Before committing

- **Exclude any column that is 100% NULL in the source**, or the assertion fails on day one. Leave a comment saying why — see how `gif_url` and `hide_status` are handled on the Threads entries.
- **Match `windowInterval` to the pull cadence:** `INTERVAL 14 DAY` for Facebook and YouTube, `INTERVAL 21 DAY` for Instagram and Threads, so a quiet fortnight doesn't fail the check.
- **Verify the entry matches the model.** `dataform compile --json` emits each model's resolved column list; diffing that against the entry catches both a typo and a `_daily_change` column you forgot to register.

---

## Known Limitations

- Demographics data outage from 16 March 2026 (Google issue: 488961396)
- Country and gender dimensions cannot be queried simultaneously via the Analytics API
- Analytics API tokens expire every 7 days (app is in testing mode)
- Playlist, cards, and impression metrics are not modelled
