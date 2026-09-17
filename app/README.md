# app/

**Vote-Shape Map**: explore how Philippine elections have voted, 2010-2025 — pick a race from the
selector (Local, Provincial, Congressional, Presidential, Senate, or Party List), hover or click a
province for its landslide-vs-competitive share in that race, then drill into any of its cities
for a plain-language read of that city's own election history. Plain HTML/CSS/JS, no build step,
no framework:

```
app/
├── index.html               # page structure
├── style.css                 # theme (grayscale, no hue), layout, typography
├── app.js                    # data load, map draw, drill-down, plain-language rendering
├── leaflet.css                # vendored Leaflet stylesheet
└── data/
    ├── province_clusters.json     # province-level cluster shares for the Local race, from 09
    ├── localities.json            # per-city history + stability summary for the Local race, from 04/05/06/08
    ├── province_stats_by_race.json  # province-level cluster shares for the other 5 races, from 11
    └── locality_races.json          # per-city cluster history for the other 5 races, from 11
```

Leaflet itself (the JS library, loaded from cdnjs at runtime) is used purely as a vector GeoJSON
renderer — there's no basemap or tile layer, since nothing outside this project's own boundary
polygons is needed.

## What it does

**A race selector at the top of the sidebar picks which model is on screen.** Six races, each its
own independent clustering model fit only on that race's own vote shares and margins (see `11` for
the five added beyond the original local one): Local (Mayor/Vice Mayor/Councilor), Provincial
(Governor), Congressional (House), Presidential, Senate, and Party List. Switching races re-styles
the same map polygons from that race's own province stats, rebuilds the rank lists, and resets to
the national view rather than trying to carry a locked city over between two different models.

**The landing view leads with the finding, not the method.** Before any stats or jargon, the
sidebar states the current race's actual result in one paragraph — for Local: elections have
gotten less competitive almost everywhere since 2010, and this page only ever measures how
lopsided a result was, never who won or why. That intro (and the national rank lists below it)
disappears once you drill into a specific province or city, since at that point you're already
past needing the pitch.

**Senate and Party List are labeled differently on purpose.** The Senate fills 12 seats at once
from a field that regularly runs into the dozens of candidates, so no single candidate's vote
share works as a "landslide" signal the way it does for a single-winner race. That view's legend
says "low-fragmentation share" instead, and its city sentences say "top candidate" instead of
"winner" — the underlying method (cluster on log-ENC, margin, top1-share) is identical, only the
words around it change to match what the numbers actually mean for a multi-winner race.

**Province level:** hover or click any province to see its landslide share, local-result count, and
how it compares to the national average, plus ranked lists of the most landslide-leaning and most
competitive provinces. Clicking a province locks the panel to it — hovering elsewhere no longer
changes what's shown, only clicking a different province does — and opens a searchable list of
that province's cities.

**City level:** selecting a city from that list drills into its own record — a plain-language
sentence for its most recent election ("2025 mayoral race: **Competitive**. The winner took 74.1%
of the vote, 48.1 points ahead of the runner-up"), a year-by-year timeline chip for every election
on record (hover or tab to any chip for a one-line explanation of what its shade and shape mean
for that specific year, so the color coding is never left to guess at), and, for the Local race
only, a callout explaining *why* a given election was flagged
statistically unusual when one was, and a sentence on how stable its pattern has been over time
("the voting pattern changed in 2 of 4 consecutive elections"). The other five races show the
cluster history and timeline the same way but skip the anomaly callout and stability sentence,
since `05`'s anomaly-detection model and `06`/`08`'s temporal-stability models were built around
the Local race specifically and haven't been re-run for the other five (see `11`). A "How this was
determined" disclosure sits underneath, collapsed by default, showing the raw share/margin/
candidate-count numbers behind that city's sentences, with column headers that match whichever
race is selected. A second disclosure, "Methodology notes," sits at the bottom of the sidebar in
every view and carries the modeling/boundary-data caveats that used to sit in a permanently
visible footer — real detail for whoever wants it, opt-in rather than in the way of everyone else.

## Data & scope

Every file in `data/` is a pre-computed, aggregate snapshot exported from this repo's own
notebooks — the app itself never re-runs a model or touches the underlying ~2 million individual
vote records at request time:

- `province_clusters.json` — one entry per province: its Local-race landslide-cluster share and
  locality-year count, from `09`'s geographic join. Carries the map's actual geometry.
- `localities.json` — one entry per `(province, city)` as recorded in the source data (a city
  whose province label changed mid-dataset, like several in the 2022 Maguindanao split, gets two
  entries — see `data/README.md`), each with a compact per-year record (cluster label, mayor vote
  share and margin, councilor fragmentation, anomaly flag and shape) and a locality-level
  stability summary (elections observed, times flagged, pattern-change rate). Local race only.
- `province_stats_by_race.json` — the same per-province `{n, l}` shape as `province_clusters.json`'s
  properties, but for the other five races, with no geometry attached (the map reuses
  `province_clusters.json`'s polygons and just re-styles them per race, so geometry is never
  duplicated five more times).
- `locality_races.json` — the other five races' per-city, per-year cluster history: cluster label,
  headline-position vote share, margin, and ENC. No anomaly flag or stability summary, for the
  reason above.

**What's deliberately not here:** the per-candidate, per-race vote tallies that produced these
summaries (`votes_races_clean.parquet`). That file isn't this project's to redistribute publicly
at that grain (see `data/README.md`), and separately, a candidate-by-candidate browsable database
isn't what this app is for — every number shown is a landslide/competitive/unusual
*classification* of a pattern, never a raw vote count for a specific candidate.

## Interaction model

- **Picking a race** from the selector switches the whole page to that race's own model and
  resets to the national view, even if a province or city was locked. The six races are
  independent models (see `11`), so there's no meaningful way to carry a Local-race city lock into
  the Senate view — resetting is simpler and more honest than trying to reconcile the two.
- **Hovering** a province (on the map or in a rank row) updates the detail card, as long as
  nothing is locked.
- **Clicking** a province locks the detail card to it and opens its city list. Only clicking a
  *different* province changes the lock; hovering elsewhere does not.
- **Selecting a city** from that list drills into its detail view. The back link returns to the
  city list for the same province; "Reset to national" (visible whenever something is locked)
  clears everything back to the national view.
- The **"How this was determined"** disclosure on a city's detail view is always available, never
  required reading — the plain-language sentences above it are meant to stand alone.

## Responsive layout

The two-column layout (map + fixed-ish sidebar) targets everything from a phone up through a
13-inch laptop, which turned out to need more than the single mobile breakpoint the app originally
shipped with. Two real bugs, found by testing at actual 13" laptop viewport sizes (1280x800,
1366x768, and shorter windows down to ~680px tall) rather than assumed fixed from a screenshot:

- **The sidebar's own scrollbar never activated.** `.app` only set `min-height: 100dvh`, so a flex
  row with no fixed height happily grows past the viewport to fit its tallest child — and since the
  sidebar was a stretched flex item with no height cap either, its `overflow-y: auto` had nothing to
  scroll *within*: instead the whole page grew taller than the window and needed a full-page scroll
  to reach content below the fold. Confirmed directly (not just theorized): at 1280x800 the old CSS
  produced a 862px-tall `.app` regardless of the 800/768/680px actual window height, with the
  sidebar's `scrollHeight === clientHeight` (nothing to scroll) and page content below ~850px simply
  unreachable without knowing to scroll the whole document — worse, scrolling with the pointer over
  the map does nothing (Leaflet's own wheel handling swallows it), which is a very easy way to
  conclude content is just "cut off." Fixed by giving `.app` (and the sidebar) a hard `height` tied
  to the viewport plus `min-height: 0` on the flex children, so the sidebar's `overflow-y: auto` now
  actually contains its own scroll — verified the same way, by measuring `scrollHeight >
  clientHeight` on the sidebar post-fix at the same three window sizes.
- **Long text had no wrap/shrink strategy.** Headline figures, province/city names, and rank labels
  were fixed px sizes with no `min-width: 0` on their flex-item ancestors, so a long name (the
  dataset's longest city name, `DON VICTORIANO CHIONGBIAN DON MARIANO MARCOS` in Misamis Occidental,
  was used as the actual stress test) could force a flex row wider than the sidebar. Fixed with
  `min-width: 0` on the relevant flex items, `overflow-wrap: anywhere` on their text, and `clamp()`-
  based font sizes on the biggest figures so they scale down slightly on narrower panels instead of
  overflowing.

On top of those two fixes: an intermediate breakpoint (`max-width: 1100px`) narrows the sidebar and
tightens spacing for laptop windows that aren't full-width; two `max-height` breakpoints (760px and
620px) compact vertical spacing for short windows; the stat tiles wrap onto a second row instead of
squeezing three fixed-width tiles into a shrinking sidebar; and the "how this was determined" table
(6 columns) sits in its own `overflow-x: auto` wrapper so it scrolls sideways on its own rather than
pushing the sidebar wider. None of this touches the existing sub-760px phone breakpoint, which still
stacks the map above the sidebar and lets the page scroll normally, matching how it worked before.

## Opening it

This app loads its data with `fetch()`, which most browsers block against a page opened directly
from disk (`file://...`). Serve the folder instead:

```
cd app
python3 -m http.server 8000
# then open http://localhost:8000/
```

or host it anywhere that serves static files (GitHub Pages, Netlify, a plain S3 bucket, etc). It
needs network access to two CDNs (Leaflet's JS, Google Fonts) but nothing else — no API, no
database, no server-side code. If the page can't reach either one, the map fails gracefully into
a text message rather than blanking the whole page; the stats, rank lists, and city drill-down
don't depend on Leaflet at all.

## Regenerating the data

Every file in `data/` is a snapshot, not fetched live — if the notebooks are re-run (a new NLE
year added, a clustering change), regenerate:

- `province_clusters.json` from `09`'s `data/processed/province_clusters.geojson`: round
  coordinates to 5 decimals and `landslide_share` to 4, shorten property keys to `p`/`n`/`l`.
- `localities.json` from `04`'s `locality_clusters.parquet`, `05`'s `locality_anomalies.parquet`,
  and `08`'s `locality_anomaly_temporal.parquet`: join on `(year, province, city)`, classify each
  flagged row into one of `05`'s two documented anomaly shapes (uncontested sweep, or close-top/
  fragmented-down-ballot) or `"other"`, and re-shape into one compact per-locality record keyed by
  `(province, city)`.
- `province_stats_by_race.json` and `locality_races.json` from `11`'s five
  `locality_clusters_<race>.parquet` files, exported directly by `11`'s own last two cells (the
  notebook writes both files itself, no separate export script).

Nothing else in the app needs to change unless the data's shape itself changes (a new property, a
different grain).

## Color and naming

The map's province fill uses a viridis ramp (dark purple → blue → teal → green → yellow, low
share to high) instead of the grayscale ramp this project shipped with originally. The reason for
switching, and the constraint that survived it: any actual color risks reading as a political
party affiliation in a Philippine elections context, which is why a literal red/green/blue
scale was never on the table. Viridis was chosen specifically because it isn't that — it's a
single continuous ramp with no individual hue standing in for a side, its lightness rises
monotonically low to high (checked directly, not eyeballed) so the color never implies a
boundary the data doesn't have, and it stays readable under protanopia/deuteranopia and even
degrades sensibly to grayscale if printed. The ramp lives only in `app.js`'s `colorFor()` and
the legend bar's gradient — the rest of the app's interactive/state cues (reset link, active
rank row, locked province outline, locality dots, timeline chips) still use the grayscale
`--accent`/`--seq-*` tokens and the sidebar's light/dark theming is untouched. Named
"Vote-Shape Map," not an earlier working name ("Landslide Atlas") — "atlas" implied a broader
reference work this isn't, and "vote-shape" is the term used throughout this project's own
notebooks and READMEs.

## Why province level, and why this stack

Same reasoning as `09`: city-level *geographic* detail (drawn boundaries for 1,865 localities)
needs its own name-matching pass, not yet done — the drill-down works around this by listing and
searching cities within a province rather than drawing them. Leaflet plus plain fetched JSON files
was chosen over a mapping framework or a backend because the whole dataset is 87 province polygons
and roughly 1,780 per-city summary records — there's no case for a server, a tile provider, or a
heavier charting library at this scale.
