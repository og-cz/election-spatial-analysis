"""Shared geographic-join helpers for election-spatial-analysis, split out from `common.py`
because these depend on geopandas/shapely -- a heavier, more specialized dependency that
notebooks 01-08 have no reason to require just to import unrelated functions. Only `09` (and
anything downstream of it, e.g. an exported app data file) needs this module.

The province-name normalization here resolves real mismatches between two independent sources
(OpenHalalan election data vs. a PSGC-derived boundary file), found by direct inspection in `09`
-- see `data/README.md` for the full account of each one. Kept as real, documented functions
rather than inline notebook code so a future export script (an app data build, additional map
layers) can reuse the exact same join instead of re-deriving it.
"""
import geopandas as gpd
import pandas as pd
from shapely.ops import unary_union

# Cosmetic naming differences between the boundary file's `adm2_en` field and this project's
# `province` column -- an NCR district-naming convention and one hyphenation difference.
PROVINCE_RENAME_MAP = {
    "NCR, CITY OF MANILA, FIRST DISTRICT (NOT A PROVINCE)": "NCR FIRST DISTRICT",
    "NCR, SECOND DISTRICT (NOT A PROVINCE)": "NCR SECOND DISTRICT",
    "NCR, THIRD DISTRICT (NOT A PROVINCE)": "NCR THIRD DISTRICT",
    "NCR, FOURTH DISTRICT (NOT A PROVINCE)": "NCR FOURTH DISTRICT",
    "TAWI-TAWI": "TAWI TAWI",
}

# BARMM administrative designation with no polygon of its own in the boundary file. Real,
# expected, and reported wherever this module's outputs get used -- never silently dropped.
KNOWN_UNMAPPABLE_PROVINCES = ["SPECIAL GEOGRAPHIC AREA"]


def normalize_province_geometry(provinces_raw):
    """Apply the cosmetic renames and add a unioned `"MAGUINDANAO"` polygon (Maguindanao del
    Norte + del Sur combined) alongside the two post-2022-split polygons already present --
    the election data uses plain `"MAGUINDANAO"` through 2022 and the split names only from
    2025, so both eras need a matching polygon. Adds a `province_norm` column; does not modify
    the original `adm2_en` column.
    """
    provinces = provinces_raw.copy()
    provinces["province_norm"] = provinces["adm2_en"].str.upper().replace(PROVINCE_RENAME_MAP)

    maguindanao_parts = provinces[provinces["province_norm"].isin(
        ["MAGUINDANAO DEL NORTE", "MAGUINDANAO DEL SUR"])]
    maguindanao_union = gpd.GeoDataFrame(
        {"province_norm": ["MAGUINDANAO"]},
        geometry=[unary_union(maguindanao_parts.geometry.to_numpy())],
        crs=provinces.crs,
    )
    provinces = pd.concat([provinces, maguindanao_union], ignore_index=True)
    return gpd.GeoDataFrame(provinces, geometry="geometry", crs=provinces_raw.crs)


def province_cluster_summary(clusters):
    """One row per province: locality-year count and the fraction in `04`'s landslide cluster
    (cluster 0). `clusters` is `locality_clusters.parquet` (or any subset of it with the same
    `province`/`cluster` columns)."""
    return (clusters.groupby("province")
            .agg(n_locality_years=("cluster", "size"),
                 landslide_share=("cluster", lambda s: (s == 0).mean()))
            .reset_index())


def join_province_clusters(provinces_raw, clusters):
    """Full pipeline: normalize province names, summarize clusters per province, inner-join the
    two. Returns `(mapped, province_summary)` -- `mapped` is a GeoDataFrame (one row per
    successfully-joined province, geometry included), `province_summary` is the plain
    (ungeometried) per-province summary for every province in `clusters`, joined or not, so a
    caller can compute exactly what didn't map (expected: `KNOWN_UNMAPPABLE_PROVINCES`).
    """
    provinces = normalize_province_geometry(provinces_raw)
    province_summary = province_cluster_summary(clusters)
    mapped = provinces.merge(province_summary, left_on="province_norm", right_on="province", how="inner")
    return mapped, province_summary
