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

from contextlib import contextmanager
import os
import shutil
import tempfile
import argparse
import csv
import gzip
import io
import sys
from pathlib import Path

import numpy as np
from scipy.stats import gaussian_kde

# Outlier binding mode: model whose (scanning_angle, pitch_angle) 2D-KDE density is below
# this fraction of peak density. Set to 0.05 to match the published Figure 4 legend
# ("< 5% of peak density"). NB: the figure-generating notebook code used 0.10 — the figure
# and its legend should be reconciled (re-render at 5%, or change the legend to 10%).
OUTLIER_DENSITY_FRACTION = 0.05


def _open(path: Path):
    if str(path).endswith(".gz"):
        return io.TextIOWrapper(gzip.open(path, "rb"), encoding="utf-8")
    return open(path, "r", encoding="utf-8")


@contextmanager
def _output(path):
    """Stream large generated metadata into deterministic gzip without retaining a plain copy."""
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', newline='',
                                         dir=path.parent, suffix='.tmp', delete=False) as stream:
            temporary = Path(stream.name)
            yield stream
        compressed = path.suffix == '.gz' or temporary.stat().st_size > 1_000_000
        target = path if path.suffix == '.gz' or not compressed else Path(str(path) + '.gz')
        if compressed:
            ready = None
            try:
                with tempfile.NamedTemporaryFile(dir=path.parent, suffix='.tmp', delete=False) as raw:
                    ready = Path(raw.name)
                    with temporary.open('rb') as source, gzip.GzipFile(
                            filename='', fileobj=raw, mode='wb', mtime=0) as zipped:
                        shutil.copyfileobj(source, zipped)
                os.replace(ready, target)
            finally:
                if ready is not None:
                    ready.unlink(missing_ok=True)
        else:
            os.replace(temporary, target)
        alternate = path.with_suffix('') if path.suffix == '.gz' else (path if compressed else Path(str(path) + '.gz'))
        alternate.unlink(missing_ok=True)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


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


def map_contacts(directory: Path, key: str):
    """Count the TCRen CDR3-peptide edges actually displayed, not receptor-internal edges."""
    import re
    import xml.etree.ElementTree as ET
    if not re.fullmatch('[0-9a-f]{64}', key):
        raise ValueError('map hash must be lowercase SHA256')
    path = directory / (key + '.html')
    if not path.exists():
        return None
    text = path.read_text()
    svg = ET.fromstring(text[text.index('<svg'):text.index('</svg>') + 6])
    ns = '{http://www.w3.org/2000/svg}'
    groups = svg.findall('.//' + ns + 'g[@class="residue"]')
    if not groups:
        raise ValueError('map contact counting requires explicit TCRen residue identities')
    roles = {(g.get('data-chain'), g.get('data-aa-index')): g.get('data-complex-chain')
             for g in groups if g.get('data-complex-chain') == 'peptide' or g.get('data-region') == 'cdr3'}
    count = 0
    for line in svg.findall('.//' + ns + 'g[@class="contacts-dashed"]/' + ns + 'line'):
        a = roles.get((line.get('data-chain-1'), line.get('data-res-1')))
        b = roles.get((line.get('data-chain-2'), line.get('data-res-2')))
        count += (a == 'peptide' and b in ('tra', 'trb')) or (b == 'peptide' and a in ('tra', 'trb'))
    return count


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("input", type=Path, help="vdjdb_structures_metadata.tsv[.gz]")
    ap.add_argument("-o", "--output", type=Path, default=Path("structures_metadata.tsv"))
    ap.add_argument('--structure-dir', type=Path, help='Use the peptide contact counts displayed by TCRen maps')
    args = ap.parse_args()

    choices_path = args.output.parent / 'native_representatives.tsv'
    choices = {}
    if choices_path.exists():
        with choices_path.open() as stream:
            choices = {row['tcr_pmhc_hash']: row['selected_pdb'] for row in csv.DictReader(stream, delimiter='\t')}
    # ---- read, dedupe by hash (prefer experimental coordinates) --------------------------------
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
            if not h:
                continue
            native = (row.get('is_native') or '').strip().lower() in ('true', '1', 'yes')
            old_native = h in seen and (seen[h].get('is_native') or '').lower() in ('true', '1', 'yes')
            preferred = native and choices.get(h) == (row.get('meta.structure.id') or '').lower()
            if h not in seen or (native and not old_native) or preferred:
                seen[h] = row

    rows = list(seen.values())
    print(f"read {total} rows, {len(rows)} unique hashes", file=sys.stderr)

    # ---- percentiles + KDE outlier over the modelled subset ---------------------
    def is_native(r) -> bool:
        return (r.get("is_native") or "").strip().lower() in ("true", "1", "yes")

    mod_idx = [i for i, r in enumerate(rows) if not is_native(r)]
    conf = np.array([_to_float(rows[i].get("ranking_confidence")) for i in mod_idx], dtype=float)
    iptm = np.array([_to_float(rows[i].get("tcr_pmhc_iptm")) for i in mod_idx], dtype=float)

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
    with _output(args.output) as out:
        w = csv.writer(out, delimiter="\t", lineterminator="\n")
        w.writerow(["hash", "is_native", "num_contacts", "iptm", "confidence",
                    "iptm_pct", "confidence_pct", "binding_mode_outlier"])
        for i, r in enumerate(rows):
            h = (r.get("tcr_pmhc_hash") or "").strip().lower()
            nat = is_native(r)
            nc = _to_float(r.get("num_contacts"))
            if args.structure_dir:
                mapped = map_contacts(args.structure_dir, h)
                if mapped is not None or nat:
                    nc = mapped
            ipt = 1.0 if nat else _to_float(r.get("tcr_pmhc_iptm"))
            cf = None if nat else _to_float(r.get("ranking_confidence"))
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

    if not args.output.exists():
        args.output = Path(str(args.output) + ".gz")
    print(f"wrote {n_out} rows -> {args.output}", file=sys.stderr)
    _self_check(args.output)
    web_root = args.output.parent
    if (args.structure_dir and args.structure_dir.resolve() == (web_root / 'structure').resolve()
            and (args.structure_dir / 'asset-manifest.json').is_file()):
        from structure_asset_identity import prepare_record
        prepare_record(args.output.parent, args.input)
    return 0


def _self_check(path: Path) -> None:
    """Validate nonempty metadata and the known zero-contact record when present."""
    zero_contact_hash = "2fda0f73b8aa"  # RPPIFIRRL/HLA-B*07:02 aberrant model (prefix)
    n, found_zero = 0, False
    with _open(path) as fh:
        r = csv.DictReader(fh, delimiter="\t")
        for row in r:
            n += 1
            if row["hash"].startswith(zero_contact_hash):
                assert row["num_contacts"] == "0", f"expected 0 contacts, got {row['num_contacts']!r}"
                found_zero = True
    assert n > 0, "empty metadata export"
    print(f"self-check OK ({n} rows; known zero-contact model present={found_zero})", file=sys.stderr)


if __name__ == "__main__":
    raise SystemExit(main())
