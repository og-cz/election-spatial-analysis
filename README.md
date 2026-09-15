# election-spatial-analysis

An unsupervised analysis of Philippine National and Local Elections (NLE) results, 2010-2025,
looking at the *shape* of how each locality votes — how lopsided or contested its races are,
how fragmented its candidate fields get, whether that shape is stable or shifts over time —
rather than who wins. Nothing in this project uses winner labels, party affiliation, or any
outcome variable as a modeling target; every model here is unsupervised, built purely from
vote-share and concentration statistics computed from the raw tallies.

## Data

Two OpenHalalan extracts, provided directly rather than downloaded by this project: a
per-candidate, per-locality vote-count file (~2.09M rows, 2010-2025) and a separate declared-
winners file (~157k rows, 2001-2025). Full provenance, every known data-quality issue found by
direct inspection (double HTML-entity escaping, city names colliding across provinces, uneven
per-year reporting coverage, positions that are reported per-locality but decided at a wider
provincial/national scope, and more), and the full table of processed outputs live in
`data/README.md` — that file is the authoritative record of what's actually in this data and
should be read before extending any of the notebooks below. Raw source files are not included in
this repository; see `data/README.md` for exactly what to put in `data/raw/` to reproduce
everything from scratch.


## Why eight notebooks instead of one

Each notebook depends on the output of the one before it and answers a different kind of
question, so staging them separately keeps each one's assumptions checkable in isolation rather
than buried inside one long script. `01` and `02` are data engineering — matching, cleaning, and
turning ~932k individual candidate tallies into ~75k race-level share/margin/concentration
figures. `03` reshapes those into one row per locality per election. `04` through `08` are where
the actual machine learning happens: clustering, anomaly detection, and temporal analysis, each
building on the locality-level feature matrix `03` produces and on each other's outputs. Nothing
after `03` needs to touch the original 2-million-row vote file again.

## Notebook-by-notebook summary

**`01_data_cleaning.ipynb`** — Loads both raw files (2,088,099 vote-count rows, 157,333 winner
rows), fixes double HTML-entity escaping affecting candidate names, audits per-`(year,
position)` reporting coverage and drops 9 combinations (3,139 rows, 0.2%) that fall below 50% of
that position's best-covered year, splits candidate races from party-list rows (932,985 vs.
1,151,975), and cross-validates against the winners file. Overall winner match rate: 92.2%
(82,595 of 89,567) — the gap is explained and quantified in `data/README.md` (chiefly: ~8.6% of
winner rows have no `City` recorded at all, so they can never be matched by locality). Builds a
locality registry of 1,865 unique province/city pairs.

**`02_feature_engineering.ipynb`** — Drops non-geographic reporting posts (overseas/absentee
voting), drops the 252 candidate races and 7 party-list races with zero recorded votes (share and
concentration are undefined at 0/0), and computes, per race: `top1_share`, `margin` (top-share
minus runner-up share; uncontested races get margin = 1.0), and the Herfindahl-Hirschman
concentration index. 7.1% of local races (5,338 of 75,055) turn out to be uncontested. Output:
`race_features.parquet` (75,055 rows) and `partylist_features.parquet` (7,587 rows).

**`03_locality_features.ipynb`** — Reshapes race-level features into one row per
`(year, province, city)`. Confirms by direct inspection that `Governor`/`Vice Governor` and
`Provincial Board Member`/`House` races are reported identically across every city sharing a
province or district (they're not decided by the city alone), and that a handful of cities span
more than one congressional district (58 of 7,577 city-years) — handled with a vote-weighted
average rather than silently keeping one district's numbers. Output: `locality_features.parquet`,
9,570 locality-years across 81 columns.

**`04_clustering.ipynb`** — The first real model. Restricts to the three positions actually
decided at the locality level (`Mayor`, `Vice Mayor`, `Councilor` — using all ten position groups
would silently drop every 2013 row, which has zero coverage for the wider-scope positions),
keeping 93.7% of rows (8,967 of 9,570) as complete cases. Effective-number-of-candidates
(`enc = 1/HHI`) is log-transformed to correct a real right skew (raw skewness 2.33, log skewness
-0.02, confirmed by direct measurement) before standardizing and running PCA (3 of 9 components
for 90%+ variance) and a silhouette-score sweep over k=2..10. Best k=2, silhouette=0.534: a
"landslide" cluster (28.8% of locality-years — high top-share and margin, low candidate
fragmentation) and a "competitive" cluster (71.2% — the reverse). The landslide share climbs
noticeably in BARMM (51.7%) and Region I (39.1%) relative to the national 28.8% average.

**`05_anomaly_detection.ipynb`** — A different question from clustering: which locality-years
don't resemble *anything* nearby, regardless of cluster. Isolation Forest on the same 9-feature
matrix `04` used, with `contamination` set explicitly to 2% (scikit-learn's default `"auto"`
flagged an unusable 28.3% of all rows here, and the anomaly-score distribution has no natural gap
to exploit instead). Flags 180 of 8,967 rows (2.0%), concentrated in a small number of provinces
(Maguindanao, Sulu, and Lanao del Sur alone account for 30% of them) rather than spread evenly,
and splits into two recurring shapes: 34 rows are a full Mayor+Vice Mayor uncontested sweep, 29
are a near-tied Mayor race paired with a highly fragmented Councilor race, and the remaining 117
fit neither pattern cleanly. The large-city extreme-fragmentation case that originally motivated
this notebook — Manila, 2016, 149 Councilor candidates, visible as an extreme point in `04`'s PCA
plot — turns out to rank 111th of 8,967 by anomaly score once every feature is weighed together,
not the single most extreme case; that initial assumption was checked against the real output and
corrected rather than left in.

**`06_temporal_analysis.ipynb`** — Follows individual localities across their observed election
years and asks whether `04`'s cluster label is a stable trait or something that flips around.
Handles partial per-locality histories directly (not every locality has all six years) by only
computing transitions between consecutive *observed* elections. Overall, 71.7% of consecutive
elections keep the same cluster label, but the two clusters are not equally sticky: the
competitive cluster persists 78.1% of the time it's observed, the landslide cluster only 54.1% —
landslide status, in this data, is a noticeably less stable locality trait than competitive
status. 507 localities with five or more observed elections never changed cluster at all.

**`07_richer_clustering.ipynb`** — Re-runs `04`'s clustering with 27 features instead of 9
(adding Governor, Vice Governor, Provincial Board Member, House, Senator, and Party List),
restricted to 2016 onward (97.6% complete-case coverage across the four post-2013 years; 2013 and
the President/VP columns are excluded for the reasons `01`/`03` already established). PCA needed
9 of 27 components for 92.2% of variance — real redundancy, since these are largely the same
electorate voting on the same ballot. Silhouette sweep again picks k=2, but with a markedly
weaker separation than `04` (silhouette 0.277 vs. 0.534), visible in the PCA scatter as a
continuous smear rather than two distinguishable groups. Cross-tabbed directly against `04`'s
original clustering on the 6,374 locality-years both notebooks can see: `04`'s landslide
localities land in `07`'s landslide-leaning cluster 80.6% of the time, and `04`'s competitive
localities land in `07`'s competitive-leaning cluster 85.0% of the time. Conclusion: the richer
feature set mostly re-derives `04`'s split rather than revealing new structure — it adds
correlated, redundant signal that makes the same split noisier, not sharper.

**`08_anomaly_temporal.ipynb`** — Joins `05` and `06` to test a question both left open: does a
locality flagged anomalous in some single election also tend to be one whose cluster label is
volatile over time? Tested directly rather than assumed, at both the locality level (ever-flagged
vs. never-flagged change rate: 24.1% vs. 29.0%, Mann-Whitney p=0.056) and the transition level
(does a flagged endpoint year predict that specific transition being a change: 27.7% vs. 28.4%,
chi-square p=0.882) — neither difference is statistically significant. Being unusual in one
election, in this data, does not predict being unstable across elections; a spot-check locality
flagged anomalous in 4 of its 5 observed years (a persistently near-uncontested Mayor race) still
changed cluster only once, in line with the average. The honest caveat: `05`'s fixed 2%
contamination rate means only 144 of 1,780 localities are ever flagged at all, so this null result
has real but limited statistical power — it should be read as "not detected here," not as a
closed question.

## What this project deliberately does not do

No claim of electoral fraud or wrongdoing anywhere in this project — `05`'s anomaly scores are a
statistical shape comparison, not a fraud-detection model, and treating them as one would be a
real overclaim given what the features actually measure (vote-share concentration, nothing about
ballot integrity). No party-list seat-allocation mechanics (party-list races get the same
descriptive share/concentration treatment as everything else, not an actual Panachage-style seat
model). No geographic/map visualization anywhere yet — every plot in this project is a PCA
projection or a table, not a map of the Philippines, despite the project's name. No predictive
modeling of who wins a future race — every model here describes the shape of what already
happened, nothing forecasts.

## Reproducing this project

Drop the two files named in `data/README.md`'s **Source** section into `data/raw/`, then run the
notebooks in order (`01` through `08`) from within `notebooks/`. `01` and `02` together take a
few minutes on the full ~2M-row vote file; everything from `03` onward runs in seconds against
the much smaller locality-level tables. Nothing under `data/` is tracked in git — see the **Git**
section of `data/README.md`.

## Possible next work

A PSGC/geographic join to actually map clusters, anomalies, and volatility onto the Philippines
rather than describing them in tables and PCA plots — the most obvious gap given the project's
name, and genuinely new work rather than more analysis of what's already built. Re-running `05`
at a higher contamination level if the null result in `08` is worth pursuing with more
statistical power. Combining `07`'s richer-but-noisier feature set with an actual second
clustering axis (e.g. clustering separately on local vs. wider-scope features and comparing) if
the redundancy `07` found is worth decomposing rather than just noting.
