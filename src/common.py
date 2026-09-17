"""Shared helpers for the project notebooks.

Pulled out here so a fix to the locality-grouping convention, the text-cleaning logic, or the
race-feature computation only has to be made once. Before this existed, `locality_group_cols`
had already been copy-pasted into two separate notebook-builder scripts (01 and 02) -- exactly
the kind of drift this module is meant to prevent.

No `display()` or other notebook-only calls live here on purpose: this module is plain Python
and gets imported by notebooks, not the other way around, so it has to work outside a Jupyter
kernel too.
"""
import html
import re
import unicodedata

import numpy as np
import pandas as pd

LOCAL_GROUP_COLS = {
    "MEMBER, HOUSE OF REPRESENTATIVES": ["province", "city", "district"],
}

# The three positions confirmed in 03 to be decided by the locality itself, not a wider
# province/district/national race reported through it. Used as the default feature set for
# every clustering/anomaly notebook so they all start from the same ground rather than each
# redefining "core" slightly differently.
CORE_POSITIONS = ["MAYOR", "VICE MAYOR", "COUNCILOR"]
CORE_METRICS = ["top1_share", "margin", "enc"]
DEFAULT_GROUP_COLS = ["province", "city"]


def locality_group_cols(position):
    """Columns identifying a locality for this position. District only matters for House
    races, where a city split into multiple congressional districts would otherwise have its
    races merged into one."""
    return LOCAL_GROUP_COLS.get(position, DEFAULT_GROUP_COLS)


def unescape_twice(series):
    """Undo double HTML-entity-escaping found in the vote-counts file's text fields, e.g.
    "'" -> "&apos;" -> "&amp;apos;", further mangled by later uppercasing into "&AMP;APOS;".
    Named entities are case-sensitive; "&amp;"/"&AMP;" is one of a handful of legacy entities
    recognized either case, but "&ntilde;" is not, hence the lowercasing pass in between the
    two unescape passes. Missing values are left as missing, not turned into empty strings.
    """
    def fix(text):
        once = html.unescape(text)
        once = re.sub(r"&([A-Za-z]+);", lambda m: "&" + m.group(1).lower() + ";", once)
        return html.unescape(once)

    s = series.astype("string")
    present = s.notna()
    s.loc[present] = s.loc[present].map(fix)
    return s


def clean_text(series):
    """Trim, uppercase, collapse whitespace -- after undoing the double HTML-entity-escaping
    above. Used for every locality/name text field in both source files."""
    return (unescape_twice(series)
                  .str.strip()
                  .str.upper()
                  .str.replace(r"\s+", " ", regex=True))


def strip_diacritics(text):
    """Fold an accented letter to its plain-ASCII base (NFKD splits "N" from its combining
    tilde, then the combining mark is dropped). Used only for the candidate name-matching key,
    since the two source files don't agree on whether accents are kept (e.g. "BAÑARES" in
    vote-counts vs. "BANARES" in Winners for the same person)."""
    return "".join(c for c in unicodedata.normalize("NFKD", text) if not unicodedata.combining(c))


def clean_token(series):
    """Normalize a name fragment for matching: diacritics stripped, punctuation removed,
    case- and whitespace-normalized. Used only to build a matching key, never for display."""
    return (series.astype("string").fillna("").map(strip_diacritics).str.strip().str.upper()
                  .str.replace(r"[.,]", "", regex=True)
                  .str.replace(r"\s+", " ", regex=True))


def first_word(series):
    """First whitespace-delimited token of a cleaned name fragment. Used as the stable part of
    a given name when matching across two files that disagree on how much of a middle name to
    keep (an initial in one file, spelled out in full in the other)."""
    return clean_token(series).str.split(" ").str[0].fillna("")


def build_race_features(df, group_extra_cols=()):
    """One row per (year, position, locality) with vote-share/concentration features.

    `df` must have columns: year, position, province, city, district, candidate_name, party,
    votes. `group_extra_cols` are extra columns to carry through unchanged (constant within
    each race group), e.g. region.

    Returns `(features, dropped_summary)`. Races with zero total votes recorded have an
    undefined share (0/0) and are excluded from `features`; `dropped_summary` is a small
    DataFrame of how many such races were dropped per (position, year), or `None` if none were.
    Built with vectorized groupby/rank/transform rather than a per-group Python loop -- that
    pattern caused a real multi-minute hang in 01 over race groups this numerous.
    """
    frames = []
    for position, pos_df in df.groupby("position", observed=True):
        group_cols = locality_group_cols(position)
        keys = ["year"] + group_cols
        pos_df = pos_df.copy()

        total = pos_df.groupby(keys)["votes"].transform("sum")
        pos_df["share"] = pos_df["votes"] / total
        # method="first" breaks exact vote ties by original row order -- fine here, this rank
        # only picks out "the" top1/top2 row for the feature table, not an official result.
        pos_df["local_rank"] = pos_df.groupby(keys)["votes"].rank(method="first", ascending=False)

        agg = pos_df.groupby(keys).agg(
            n_candidates=("votes", "size"),
            total_votes=("votes", "sum"),
            hhi=("share", lambda s: float((s ** 2).sum())),
        )

        top1 = (pos_df[pos_df["local_rank"] == 1]
                .set_index(keys)[["candidate_name", "party", "share"]]
                .rename(columns={"candidate_name": "top_candidate", "party": "top_party",
                                  "share": "top1_share"}))
        top2 = (pos_df[pos_df["local_rank"] == 2]
                .set_index(keys)[["share"]]
                .rename(columns={"share": "top2_share"}))

        feat = agg.join(top1).join(top2)
        for col in group_extra_cols:
            feat[col] = pos_df.groupby(keys)[col].first()
        feat["position"] = position
        frames.append(feat.reset_index())

    out = pd.concat(frames, ignore_index=True)

    zero_total = out["total_votes"] == 0
    dropped_summary = None
    if zero_total.any():
        dropped_summary = (out.loc[zero_total, ["position", "year"]]
                            .value_counts().rename("n_races").reset_index()
                            .sort_values(["position", "year"]))
        out = out.loc[~zero_total].copy()

    out["top2_share"] = out["top2_share"].fillna(0.0)
    out["margin"] = out["top1_share"] - out["top2_share"]
    out["enc"] = 1.0 / out["hhi"]
    return out, dropped_summary


def build_group_feature_matrix(locality_features, positions, metrics=CORE_METRICS):
    """Complete-case rows and a log-transformed feature matrix for an arbitrary set of ballot
    positions -- the general form of `build_core_feature_matrix` below, added in `11` to run the
    same clustering method against position groups other than the locally-decided three (`04`
    only ever needed one fixed group, so this generalization didn't exist until `11` needed it
    for Provincial/Congressional/Presidential/Senate/Party List).

    `hhi` is intentionally excluded even though it exists per position: `enc = 1 / hhi` by
    construction (see `build_race_features`), so including both would double-count the same
    signal. `enc` is log-transformed (right-skewed -- confirmed by measurement in `04`: raw
    skewness 2.33 for Councilor, 0.02 after log) before standardizing elsewhere.

    Returns `(df, X, feature_cols)`: `df` is `locality_features` restricted to complete-case
    rows for the given positions (original columns, index reset), `X` is the corresponding
    untransformed-but-logged feature DataFrame (same row order as `df`), and `feature_cols` lists
    the `len(positions) * len(metrics)` column names. Scaling (e.g. `StandardScaler`) is left to
    the caller.
    """
    feature_cols = [f"{p}_{m}" for p in positions for m in metrics]
    complete = locality_features[feature_cols].notna().all(axis=1)
    df = locality_features[complete].reset_index(drop=True).copy()

    X = df[feature_cols].copy()
    for p in positions:
        X[f"{p}_enc"] = np.log(X[f"{p}_enc"])

    return df, X, feature_cols


def build_core_feature_matrix(locality_features, core_positions=CORE_POSITIONS, metrics=CORE_METRICS):
    """Complete-case rows and a log-transformed feature matrix for the core (locally-decided)
    positions, shared by every clustering/anomaly-detection notebook so they all start from the
    same feature definition. A thin wrapper around `build_group_feature_matrix` fixed to
    `CORE_POSITIONS` -- kept as its own function since `01`-`08` already import it by this name.

    Returns `(df, X, feature_cols)`: `df` is `locality_features` restricted to complete-case
    rows (original columns, index reset), `X` is the corresponding untransformed-but-logged
    feature DataFrame (same row order as `df`), and `feature_cols` lists the 9 column names.
    Scaling (e.g. `StandardScaler`) is left to the caller.
    """
    return build_group_feature_matrix(locality_features, core_positions, metrics)
