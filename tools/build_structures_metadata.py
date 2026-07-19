#!/usr/bin/env python3
# Build the slim `structures_metadata.tsv` companion file consumed by vdjdb-web
# (backend/server/structures/Structures.scala) to surface per-model TCR-pMHC
# confidence metrics in the Structure interface and Browse "S" evidence badge.
#
# Input:  the manuscript's vdjdb_structures_metadata.tsv[.gz] (45 columns, keyed by
#         tcr_pmhc_hash == the web structure.id / HTML-visualization filename).
# Output: hash<TAB>is_native<TAB>num_contacts<TAB>iptm<TAB>confidence<TAB>iptm_pct<TAB>confidence_pct<TAB>binding_mode_outlier
#
# Metric definitions follow notebooks/structure_figure.ipynb + manuscript methods:
#   confidence  = ranking_confidence (AlphaFold2 ranking conf.; 0.8*iptm + 0.2*ptm)
#   iptm        = tcr_pmhc_iptm      (TCR:pMHC *interface* ipTM, the "ipTM" axis in Fig 4)
#   *_pct       = rank(pct=True)*100 over the modelled subset (is_native == False)
#   outlier     = 2D-KDE density of (scanning_angle, pitch_angle) < OUTLIER_DENSITY_FRACTION of peak
#
# 2026-07-19
from __future__ import annotations

import argparse
import csv
import gzip
import io
import sys
from pathlib import Path

import numpy as np
from scipy.stats import gaussian_kde

# Notebook code uses < 0.10 of peak density; the Fig 4e legend says < 5%.
# Default to the notebook value; change here to reconcile with the figure legend.
OUTLIER_DENSITY_FRACTION = 0.10


def _open(path: Path):
    if str(path).endswith(".gz"):
        return io.TextIOWrapper(gzip.open(path, "rb"), encoding="utf-8")
    return open(path, "r", encoding="utf-8")


def _to_float(s: str):
    s = (s or "").strip()
    if s == "" or s.lower() in ("na", "nan", "none"):
        return None
    try:
        return float(s)
    except ValueError:
        return None


def _pct_rank(values: np.ndarray) -> np.ndarray:
    """pandas .rank(pct=True)*100 equivalent: average ranks for ties, /n, *100."""
    n = values.size
    if n == 0:
        return values
    order = np.argsort(values, kind="mergesort")
    ranks = np.empty(n, dtype=float)
    sorted_vals = values[order]
    i = 0
    while i < n:
        j = i
        while j + 1 < n and sorted_vals[j + 1] == sorted_vals[i]:
            j += 1
        # average 1-based rank for the tie group [i, j]
        avg = (i + j) / 2.0 + 1.0
        ranks[order[i : j + 1]] = avg
        i = j + 1
    return ranks / n * 100.0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("input", type=Path, help="vdjdb_structures_metadata.tsv[.gz]")
    ap.add_argument("-o", "--output", type=Path, default=Path("structures_metadata.tsv"))
    args = ap.parse_args()

    # ---- read, dedupe by hash (first occurrence) --------------------------------
    seen: dict[str, dict] = {}
    with _open(args.input) as fh:
        reader = csv.DictReader(fh, delimiter="\t")
        required = {"tcr_pmhc_hash", "is_native", "num_contacts", "tcr_pmhc_iptm",
                    "ranking_confidence", "scanning_angle", "pitch_angle"}
        missing = required - set(reader.fieldnames or [])
        if missing:
            sys.exit(f"Input is missing required columns: {sorted(missing)}")
        total = 0
        for row in reader:
            total += 1
            h = (row.get("tcr_pmhc_hash") or "").strip().lower()
            if not h or h in seen:
                continue
            seen[h] = row

    rows = list(seen.values())
    print(f"read {total} rows, {len(rows)} unique hashes", file=sys.stderr)

    # ---- percentiles + KDE outlier over the modelled subset ---------------------
    def is_native(r) -> bool:
        return (r.get("is_native") or "").strip().lower() in ("true", "1", "yes")

    mod_idx = [i for i, r in enumerate(rows) if not is_native(r)]
    conf = np.array([_to_float(rows[i].get("ranking_confidence")) or np.nan for i in mod_idx])
    iptm = np.array([_to_float(rows[i].get("tcr_pmhc_iptm")) or np.nan for i in mod_idx])

    conf_pct = np.full(len(mod_idx), np.nan)
    ok = ~np.isnan(conf)
    conf_pct[ok] = _pct_rank(conf[ok])
    iptm_pct = np.full(len(mod_idx), np.nan)
    ok = ~np.isnan(iptm)
    iptm_pct[ok] = _pct_rank(iptm[ok])

    # 2D-KDE binding-mode outlier on (scanning_angle, pitch_angle) of modelled subset
    sa = np.array([_to_float(rows[i].get("scanning_angle")) for i in mod_idx], dtype=object)
    pa = np.array([_to_float(rows[i].get("pitch_angle")) for i in mod_idx], dtype=object)
    ang_ok = np.array([sa[k] is not None and pa[k] is not None for k in range(len(mod_idx))])
    outlier = np.zeros(len(mod_idx), dtype=bool)
    outlier_defined = ang_ok.copy()
    if ang_ok.sum() >= 3:
        pts = np.vstack([sa[ang_ok].astype(float), pa[ang_ok].astype(float)])
        kde = gaussian_kde(pts)
        dens = kde(pts)
        dens_n = dens / dens.max()
        outlier[np.where(ang_ok)[0]] = dens_n < OUTLIER_DENSITY_FRACTION

    metrics = {}
    for k, i in enumerate(mod_idx):
        metrics[i] = (conf_pct[k], iptm_pct[k], outlier[k], outlier_defined[k])

    # ---- write slim TSV ---------------------------------------------------------
    def fnum(v, nd):
        return "" if v is None or (isinstance(v, float) and np.isnan(v)) else f"{v:.{nd}f}"

    args.output.parent.mkdir(parents=True, exist_ok=True)
    n_out = 0
    with open(args.output, "w", encoding="utf-8", newline="") as out:
        w = csv.writer(out, delimiter="\t", lineterminator="\n")
        w.writerow(["hash", "is_native", "num_contacts", "iptm", "confidence",
                    "iptm_pct", "confidence_pct", "binding_mode_outlier"])
        for i, r in enumerate(rows):
            h = (r.get("tcr_pmhc_hash") or "").strip().lower()
            nat = is_native(r)
            nc = _to_float(r.get("num_contacts"))
            ipt = _to_float(r.get("tcr_pmhc_iptm"))
            cf = _to_float(r.get("ranking_confidence"))
            cp, ip_pct, outl, outl_def = metrics.get(i, (np.nan, np.nan, False, False))
            w.writerow([
                h,
                "true" if nat else "false",
                "" if nc is None else str(int(round(nc))),
                fnum(ipt, 3),
                fnum(cf, 3),
                "" if (ip_pct is None or np.isnan(ip_pct)) else str(int(round(ip_pct))),
                "" if (cp is None or np.isnan(cp)) else str(int(round(cp))),
                ("true" if outl else "false") if outl_def else "",
            ])
            n_out += 1

    print(f"wrote {n_out} rows -> {args.output}", file=sys.stderr)
    _self_check(args.output)
    return 0


def _self_check(path: Path) -> None:
    """Fail loudly if the flagged RPPIFIRRL 0-contact model is absent or mislabelled."""
    zero_contact_hash = "2fda0f73b8aa"  # RPPIFIRRL/HLA-B*07:02 aberrant model (prefix)
    n, found_zero = 0, False
    with open(path, encoding="utf-8") as fh:
        r = csv.DictReader(fh, delimiter="\t")
        for row in r:
            n += 1
            if row["hash"].startswith(zero_contact_hash):
                assert row["num_contacts"] == "0", f"expected 0 contacts, got {row['num_contacts']!r}"
                found_zero = True
    assert n > 10000, f"suspiciously few rows: {n}"
    assert found_zero, "RPPIFIRRL 0-contact reference model not found — check the input file"
    print(f"self-check OK ({n} rows; RPPIFIRRL 0-contact model present)", file=sys.stderr)


if __name__ == "__main__":
    raise SystemExit(main())
