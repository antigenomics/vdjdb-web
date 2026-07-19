#!/usr/bin/env python3
# Sync the deployed <db>/structure/ directory with the corrected structure assets from
# isalgo/vdjdb_structure_models. Adds the per-structure files for every corrected hash that is
# not yet present locally, wrapping the shipped SVG complementarity maps into the HTML the web
# serves (matches tcr-structures-visualization/produce_plots_pipline/plotting.py svg_to_html).
#
# Maps (complementarity_maps[_simplified].tgz) are DISPLAY-critical (<hash>.html is what makes a
# structure appear); contacts_aa/coordinates_aa are download extras. pdb_files.tgz (656MB) + the
# per-hash _all.zip bundles are download-only and skipped by default (--with-downloads to include).
#
# Run ON THE SERVER (needs internet to HF + the deployed structure/ dir). Stdlib only.
# 2026-07-19
from __future__ import annotations

import argparse
import gzip
import io
import re
import tarfile
import urllib.request
from pathlib import Path

BASE = "https://huggingface.co/datasets/isalgo/vdjdb_structure_models/resolve/main"
XML_PROLOG = re.compile(r"<\?xml.*?\?>", re.DOTALL)

HTML_TMPL = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SVG Embedded in HTML</title>
</head>
<body>
    {svg}
</body>
</html>"""


def svg_to_html(svg: str) -> str:
    return HTML_TMPL.format(svg=XML_PROLOG.sub("", svg).strip())


def download(url: str, dest: Path):
    if dest.exists():
        print(f"  (cached {dest.name})")
        return
    print(f"  downloading {url} -> {dest.name}")
    with urllib.request.urlopen(url, timeout=600) as r, open(dest, "wb") as f:
        while True:
            chunk = r.read(1 << 20)
            if not chunk:
                break
            f.write(chunk)


def corrected_hashes(meta_gz: Path) -> set[str]:
    hs = set()
    with io.TextIOWrapper(gzip.open(meta_gz, "rb"), encoding="utf-8") as fh:
        hdr = fh.readline().rstrip("\n").split("\t")
        hi = hdr.index("tcr_pmhc_hash")
        for line in fh:
            v = line.split("\t")[hi].strip().lower()
            if v:
                hs.add(v)
    return hs


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--metadata", type=Path, required=True)
    ap.add_argument("--structure-dir", type=Path, required=True, help="deployed <db>/structure/")
    ap.add_argument("--work", type=Path, default=Path("./_sync_tars"))
    ap.add_argument("--with-downloads", action="store_true", help="also sync pdb_files + build _all.zip")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    args.work.mkdir(parents=True, exist_ok=True)
    existing = {p.name[:-5] for p in args.structure_dir.glob("*.html") if not p.name.endswith("_simplified.html")}
    want = corrected_hashes(args.metadata)
    new = want - existing
    print(f"corrected structures: {len(want)}; already present: {len(existing)}; to add: {len(new)}")
    if args.dry_run:
        print("DRY RUN")
        return 0

    # tarball -> (member-suffix in tar, [output writers])
    # writers: (out-suffix, transform)  transform=None copies bytes; "html" wraps svg->html
    jobs = [
        ("complementarity_maps.tgz",            ".svg",             [(".svg", None), (".html", "html")]),
        ("complementarity_maps_simplified.tgz", "_simplified.svg",  [("_simplified.svg", None), ("_simplified.html", "html")]),
        ("contacts_aa.tgz",                     "_aa_contacts.tsv", [("_aa_contacts.tsv", None)]),
        ("coordinates_aa.tgz",                  "_aa_coordinates.tsv", [("_aa_coordinates.tsv", None)]),
    ]
    added = {}
    for tgz, suffix, writers in jobs:
        path = args.work / tgz
        download(f"{BASE}/data/{tgz}", path)
        n = 0
        with tarfile.open(path, "r:gz") as tar:
            for m in tar:
                if not m.isfile():
                    continue
                base = Path(m.name).name
                if not base.endswith(suffix):
                    continue
                # the 64-hex hash is the first token before any "_" or "." in the basename
                h = base.split("_")[0].split(".")[0].lower()
                if len(h) != 64 or h not in new:
                    continue
                data = tar.extractfile(m).read()
                for out_suffix, tf in writers:
                    out = args.structure_dir / f"{h}{out_suffix}"
                    if tf == "html":
                        out.write_text(svg_to_html(data.decode("utf-8")), encoding="utf-8")
                    else:
                        out.write_bytes(data)
                n += 1
        added[tgz] = n
        print(f"  {tgz}: wrote files for {n} new hashes")

    got_html = sum(1 for h in new if (args.structure_dir / f"{h}.html").exists())
    print(f"done: {got_html}/{len(new)} new structures now have <hash>.html")
    if not args.with_downloads:
        print("NOTE: pdb_files + _all.zip download bundles NOT synced (use --with-downloads for full download support)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
