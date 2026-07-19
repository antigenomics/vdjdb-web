#!/usr/bin/env python3
# Sync the deployed <db>/structure/ directory with the corrected structure assets from
# isalgo/vdjdb_structure_models. For every corrected hash not present locally, writes the full
# per-structure file set the web serves:
#   <hash>.html / .svg                (complementarity map; .html = SVG wrapped, matches
#                                       tcr-structures-visualization plotting.py svg_to_html)
#   <hash>_simplified.html / .svg
#   <hash>_aa_coordinates.tsv         (Ca coords)                 [coordinates_aa.tgz]
#   <hash>_contacts_aa.txt            (residue contacts; download) [contacts_aa.tgz *_aa_contacts.tsv]
#   aligned_aligned_<hash>.pdb        (structure download)         [pdb_files.tgz]     (--with-downloads)
#   <hash>_all.zip                    (pdb + contacts + coords bundle)                 (--with-downloads)
#
# Maps + coords + contacts are always synced (display + light downloads). pdb + _all.zip are gated
# behind --with-downloads (pulls the 656MB pdb_files.tgz). Run ON THE SERVER. Stdlib only.
# 2026-07-19
from __future__ import annotations

import argparse
import gzip
import io
import re
import tarfile
import urllib.request
import zipfile
from pathlib import Path

BASE = "https://huggingface.co/datasets/isalgo/vdjdb_structure_models/resolve/main"
XML_PROLOG = re.compile(r"<\?xml.*?\?>", re.DOTALL)
HASH_RE = re.compile(r"[0-9a-f]{64}")
HTML_TMPL = ('<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n'
             '    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
             '    <title>SVG Embedded in HTML</title>\n</head>\n<body>\n    {svg}\n</body>\n</html>')


def svg_to_html(svg: str) -> str:
    return HTML_TMPL.format(svg=XML_PROLOG.sub("", svg).strip())


def hash_of(name: str):
    m = HASH_RE.search(Path(name).name.lower())
    return m.group(0) if m else None


def download(url: str, dest: Path):
    if dest.exists() and dest.stat().st_size > 0:
        print(f"  (cached {dest.name})"); return
    print(f"  downloading {dest.name} ...")
    with urllib.request.urlopen(url, timeout=1200) as r, open(dest, "wb") as f:
        while True:
            chunk = r.read(1 << 20)
            if not chunk:
                break
            f.write(chunk)


def corrected_hashes(meta_gz: Path) -> set:
    with io.TextIOWrapper(gzip.open(meta_gz, "rb"), encoding="utf-8") as fh:
        hdr = fh.readline().rstrip("\n").split("\t"); hi = hdr.index("tcr_pmhc_hash")
        return {line.split("\t")[hi].strip().lower() for line in fh if line.split("\t")[hi].strip()}


def extract(tgz: Path, member_ok, writers, new: set, struct_dir: Path) -> int:
    n = 0
    with tarfile.open(tgz, "r:gz") as tar:
        for m in tar:
            if not m.isfile():
                continue
            base = Path(m.name).name
            if not member_ok(base):
                continue
            h = hash_of(base)
            if not h or h not in new:
                continue
            data = tar.extractfile(m).read()
            for tmpl, tf in writers:
                out = struct_dir / tmpl.format(h=h)
                if tf == "html":
                    out.write_text(svg_to_html(data.decode("utf-8")), encoding="utf-8")
                else:
                    out.write_bytes(data)
            n += 1
    return n


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--metadata", type=Path, required=True)
    ap.add_argument("--structure-dir", type=Path, required=True)
    ap.add_argument("--work", type=Path, default=Path("./_sync_tars"))
    ap.add_argument("--with-downloads", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    args.work.mkdir(parents=True, exist_ok=True)
    d = args.structure_dir

    existing = {p.name[:-5] for p in d.glob("*.html") if not p.name.endswith("_simplified.html")}
    new = corrected_hashes(args.metadata) - existing
    print(f"corrected structures not present locally: {len(new)}")
    if args.dry_run:
        print("DRY RUN"); return 0

    jobs = [
        ("complementarity_maps.tgz",            lambda b: b.endswith(".svg") and "_simplified" not in b,
         [("{h}.svg", None), ("{h}.html", "html")]),
        ("complementarity_maps_simplified.tgz", lambda b: b.endswith("_simplified.svg"),
         [("{h}_simplified.svg", None), ("{h}_simplified.html", "html")]),
        ("coordinates_aa.tgz",                  lambda b: b.endswith("_aa_coordinates.tsv"),
         [("{h}_aa_coordinates.tsv", None)]),
        ("contacts_aa.tgz",                     lambda b: b.endswith("_aa_contacts.tsv"),
         [("{h}_contacts_aa.txt", None)]),
    ]
    if args.with_downloads:
        jobs.append(("pdb_files.tgz", lambda b: b.endswith(".pdb"), [("aligned_aligned_{h}.pdb", None)]))

    for tgz, ok, writers in jobs:
        download(f"{BASE}/data/{tgz}", args.work / tgz)
        n = extract(args.work / tgz, ok, writers, new, d)
        print(f"  {tgz}: {n} new hashes")

    got = sum(1 for h in new if (d / f"{h}.html").exists())
    print(f"{got}/{len(new)} new structures now have <hash>.html")

    if args.with_downloads:
        built = 0
        for h in new:
            pdb, con, coo = d / f"aligned_aligned_{h}.pdb", d / f"{h}_contacts_aa.txt", d / f"{h}_aa_coordinates.tsv"
            if not pdb.exists():
                continue
            with zipfile.ZipFile(d / f"{h}_all.zip", "w", zipfile.ZIP_DEFLATED) as z:
                z.write(pdb, pdb.name)
                if con.exists():
                    z.write(con, con.name)
                if coo.exists():
                    z.write(coo, coo.name)
            built += 1
        print(f"built {built} _all.zip bundles")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
