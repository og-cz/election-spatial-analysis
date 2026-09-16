# app/

`index.html` is **Landslide Atlas**, a single self-contained HTML page: hover any Philippine
province to see its landslide-vs-competitive vote-shape share (the two clusters from
`04_clustering.ipynb`), instead of reading `09_geographic_map.ipynb`'s static PNG. No build step,
no server, no framework — the province geometry and cluster stats from `09`'s
`data/processed/province_clusters.geojson` are embedded directly in the file as a `<script
type="application/json">` block, and the map itself is drawn with
[Leaflet](https://leafletjs.com/) (loaded from a CDN) purely as a vector renderer — there's no
basemap/tile layer, since nothing outside this project's own boundary polygons is needed.

## Opening it

Just open `index.html` in a browser — locally (double-click it, or `python3 -m http.server` from
this folder and visit `localhost:8000`), or host it anywhere that serves static files (GitHub
Pages, Netlify, a plain S3 bucket). It needs network access to two CDNs (Leaflet's JS, Google
Fonts) but nothing else — no API, no database, no build. If the page can't reach either one, the
map fails gracefully into a text message rather than blanking the whole page; the stats and
ranked province lists in the sidebar don't depend on Leaflet at all and render regardless.

## Regenerating the data

The embedded GeoJSON is a snapshot, not fetched live — if `09_geographic_map.ipynb` is re-run (a
new NLE year added, a clustering change in `04`, a boundary-file update), `index.html` needs to
be rebuilt from the fresh `data/processed/province_clusters.geojson` to pick it up. That means:
round every coordinate to 5 decimal places and every `landslide_share` to 4 (cuts the file from
~680KB to ~320KB with no visible precision loss at this map's zoom range), shorten the property
keys to `p`/`n`/`l` (province / n_locality_years / landslide_share) to save further bytes, and
drop the result into the `<script id="geo-data" type="application/json">` block in `index.html`
in place of what's there now. Nothing else in the page needs to change unless the data's shape
itself changes (a new property, a different grain).

## Why province level, and why this stack

Same reasoning as `09`: city-level detail (1,865 localities) needs its own name-matching pass,
not yet done. Leaflet plus a plain embedded GeoJSON was chosen over a mapping framework or a
backend because the whole dataset is 87 polygons and one number per polygon — there's no case
for a server, a tile provider, or a heavier charting library at this scale.
