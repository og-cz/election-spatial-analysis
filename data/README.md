# Data

## Source

Two OpenHalalan extracts of Philippine National and Local Elections (NLE) results, provided
directly rather than downloaded by this project:

- `raw/NLE_Vote_Counts_2007-2025.csv.gz` — per-candidate, per-locality vote counts, 2010-2025.
  ~2.09M rows. One row = one candidate's tally in one locality's race in one election year.
- `raw/NLE_Winners_2004-2025.csv` — the separate list of declared winners, 2001-2025.
  ~157k rows.

Put both files in `raw/` under exactly those names before running `notebooks/01_data_cleaning.ipynb`
— they are not included in this repository (the vote-counts file alone is ~55MB compressed).

## Known data-quality issues (found by direct inspection, not assumed)

These are the reasons `01_data_cleaning.ipynb` looks the way it does. Recorded here so they
don't have to be rediscovered:

- **Double HTML-entity-escaping.** Names with an apostrophe or accented letter in the
  vote-counts file are escaped twice and then uppercased, e.g. `PEOPLE&AMP;APOS;S` for
  `PEOPLE'S`, `BA&AMP;NTILDE;ARES` for `BAÑARES` — 14,826 rows (0.7%). Fixed by `clean_text` in
  `src/common.py`. Uppercasing also breaks the fix partway (HTML entity names are
  case-sensitive; `&NTILDE;` isn't recognized where `&AMP;` still is, one of a handful of
  legacy entities valid in either case), so the entity name is lowercased between the two
  unescape passes.
- **Winners file: ~8.6% of local-office rows have no `City`.** 13,537 rows, spread across every
  year 2001-2025, have `Province` and the candidate filled in but `City` blank. Same person can
  have it populated in one election and blank in another (e.g. Sheryl Capus, Councilor-elect
  for Malinao, Albay: blank in 2004/2007/2010, `MALINAO` in 2016/2019). This is the single
  largest confirmed cause of the winner-cross-validation gap in `01` — a row like this can
  never be looked up by `(Position, Year, Province, City)` no matter how well names are matched.
- **City names collide across provinces.** Multiple provinces share a municipality name (e.g.
  Malinao exists in both Aklan and Albay). Any lookup keyed on `City` alone silently merges two
  unrelated races' candidate/winner lists — this is why every locality lookup in `01`/`common.py`
  is keyed on `(..., Province, City)`, never `City` alone.
- **Middle names differ in completeness between the two files for the same person.** The
  vote-counts file often truncates a middle name to an initial (`SALVACION B.`), the Winners
  file spells it out in full (`SALVACION BEJARIN`). Matching on the full name breaks on this
  alone, so the candidate name-matching key (`clean_token` / `first_word` in `src/common.py`)
  uses last name + first given name only, deliberately dropping the middle name comparison.
- **Diacritics aren't handled consistently between files either** (`BAÑARES` vs `BANARES` for
  the same person) — folded out of the matching key only (`strip_diacritics`), not out of the
  cleaned/saved text columns, which keep the real spelling.
- **Non-geographic reporting posts.** `is_geographic == False` marks overseas/absentee voting
  posts (e.g. "AMERICAS", "AGANA" — Guam) that aren't real Philippine localities. Excluded from
  any per-locality feature or registry.
- **Uneven per-year/per-position coverage.** E.g. 2013's Senator race has far fewer reporting
  localities than every other year. `01` audits this directly (coverage as a fraction of each
  position's own best-covered year) rather than assuming a "clean" year range, and drops only
  the specific `(year, position)` combinations that fail the threshold — not the whole year.
- **Some races have zero total votes recorded.** All 441 `BARMM MEMBER OF PARLIAMENT` /
  `BARMM PARTY REPRESENTATIVE` rows for 2025 have `votes == 0` for every candidate — the
  Bangsamoro region's first parliamentary election was postponed, so these look like
  candidate-list placeholders with no tally yet. A handful of Senator/Governor/local races in
  2019 (6-7 localities) are also missing a reported tally entirely. `build_race_features` in
  `src/common.py` drops these (share/margin/HHI are undefined, 0/0) rather than keeping `NaN`
  rows, and reports the count.
- **Not every position is decided by the locality it's reported against.** Confirmed by direct
  inspection (Abra, 2016): `GOVERNOR`/`VICE GOVERNOR` report the same province-wide candidate
  slate in every city of the province (different vote splits per city, same structure as the
  national races); `PROVINCIAL BOARD MEMBER` and `MEMBER, HOUSE OF REPRESENTATIVES` likewise
  repeat the same slate across every city sharing a provincial or congressional district. Only
  `MAYOR`, `VICE MAYOR`, and `COUNCILOR` are decided by the city on its own. A
  `"{POSITION}_margin"` column in `locality_features.parquet` for one of the wider-scope
  positions describes how that locality voted, not a locally-decided outcome.
- **A handful of cities span more than one congressional district** (Quezon City has 4, Davao
  City 3, Cebu City and several others 2 — 58 of 7,577 city-years in `race_features`). `03`
  combines a city's districts into one vote-weighted `MEMBER, HOUSE OF REPRESENTATIVES` row
  rather than silently keeping only one district's numbers.
- **`PRESIDENT`/`VICE PRESIDENT` are only on the ballot every other NLE cycle.** The Philippines
  elects a President every six years, so of the six election years in this data (2010-2025),
  only 2010, 2016, and 2022 have a presidential race — 2013, 2019, and 2025 are midterms with no
  President/VP row at all. Not missing data; this is why `PRESIDENT_top1_share` in
  `locality_features.parquet` is only ~50% populated.

## Processed outputs

Written by the notebooks into `processed/`:

| File | From | Rows | Grain | Shipped in this zip? |
|---|---|---|---|---|
| `votes_races_clean.parquet` | `01` | ~933k | candidate × locality × year | No — 28.7MB, regenerate by running `01` |
| `votes_partylist_clean.parquet` | `01` | ~1.15M | party × locality × year | No — 7MB, regenerate by running `01` |
| `locality_registry.parquet` | `01` | ~1,865 | province × city, with region | Yes |
| `race_features.parquet` | `02` | ~75k | position × locality × year | Yes |
| `partylist_features.parquet` | `02` | ~7.6k | locality × year | Yes |
| `locality_features.parquet` | `03` | ~9.6k | locality × year (wide) | Yes |
| `locality_clusters.parquet` | `04` | ~9.0k | locality × year, + cluster label | Yes |
| `locality_anomalies.parquet` | `05` | ~9.0k | locality × year, + anomaly score/flag | Yes |
| `locality_cluster_history.parquet` | `06` | ~1.8k | locality (wide, one column per year) | Yes |
| `locality_cluster_transitions.parquet` | `06` | ~7.2k | locality × consecutive election pair | Yes |
| `locality_clusters_rich.parquet` | `07` | ~6.4k | locality × year (2016+ only), + richer cluster label | Yes |
| `locality_anomaly_temporal.parquet` | `08` | ~1.7k | locality, + anomaly/volatility summary | Yes |

The two large intermediate files are dropped from the delivered zip purely to stay under the
file-size limit for sending it — `02_feature_engineering.ipynb` needs them, so re-run
`01_data_cleaning.ipynb` first (a couple of minutes) before running `02` if you're starting from
this zip rather than continuing in the same environment they were built in.

## Git

Nothing under `data/raw/` or `data/processed/` is tracked in git (`.gitignore` at the project
root excludes both directories' contents, keeping only `.gitkeep` placeholders so the empty
folders still exist after a fresh clone). Everything in both directories is either a source file
that isn't ours to redistribute (`raw/`) or fully regenerable output (`processed/` — every file
in the table above is rebuilt by running `notebooks/01` through `notebooks/07` in order). Only
the notebooks and `src/common.py` are the actual tracked work; a fresh clone needs the two files
listed under **Source** above dropped into `raw/` and the notebooks run in order to reproduce
everything else.

## `08`'s finding, since it's a null result and easy to miss in a data README

`08_anomaly_temporal.ipynb` checked whether a locality flagged anomalous by `05` (an unusual
vote-shape in some single election) also tends to be volatile over time in `06`'s sense (its
cluster label flipping between elections). Directly tested, not assumed: it does not, in either
direction, at conventional significance (Mann-Whitney p=0.056 locality-level, chi-square p=0.882
transition-level, both computed against the actual 1,720-locality overlap between the two files).
Recorded here so it isn't rediscovered or misremembered as a positive result later.
