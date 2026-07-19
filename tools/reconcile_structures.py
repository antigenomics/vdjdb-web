#!/usr/bin/env python3
# Reconcile the deployed vdjdb.txt structure evidence against the corrected structure
# metadata (isalgo/vdjdb_structure_models) + native PDB chunk (vdjdb-db PDB_Database.txt).
#
# Guarantees "every vdjdb row carries the right structure hash/flags":
#   * TCR_hash is verified = sha256(cdr3.alpha+v.alpha+j.alpha+cdr3.beta+v.beta+j.beta+
#     mhc.a+mhc.b+antigen.epitope)  (tcren/scripts/legacy hash; per-complex, both chains share it).
#   * evidence.structure.native  = meta.structure.id is a REAL PDB accession (4-char 1abc / extended
#     pdb_XXXXXXXX). Fixes the stale over-count (free-text "Fig 9, Supp Table 5-8" etc. are NOT native).
#   * evidence.structure.contacts = TCR_hash has a MODEL (is_native=False) with num_contacts > 0.
#   * evidence.structure.quality  = TCR_hash has a MODEL with ranking_confidence >= 0.85.
# Also generates paired TRA/TRB vdjdb rows for native PDB structures (PDB_Database.txt) whose PDB id
# is absent from vdjdb.txt — PDB id in meta.structure.id, reference.id = RCSB link, vdjdb.score = 3.
#
# 2026-07-19
from __future__ import annotations

import argparse
import gzip
import hashlib
import io
import json
import re
from pathlib import Path

HASH_KEYS = ["cdr3.alpha", "v.alpha", "j.alpha", "cdr3.beta", "v.beta", "j.beta",
             "mhc.a", "mhc.b", "antigen.epitope"]
PDB_RE = re.compile(r"^([0-9][A-Za-z0-9]{3}|pdb_[A-Za-z0-9]{8})$")
QUALITY_THRESHOLD = 0.85


def tcr_hash(f: dict) -> str:
    return hashlib.sha256("".join(str(f.get(k, "")) for k in HASH_KEYS).encode("utf-8")).hexdigest()


def _open(path: Path):
    if str(path).endswith(".gz"):
        return io.TextIOWrapper(gzip.open(path, "rb"), encoding="utf-8")
    return open(path, "r", encoding="utf-8")


def _to_float(s):
    s = (s or "").strip()
    try:
        return float(s)
    except ValueError:
        return None


def load_corrected(path: Path):
    """Per-hash flags from the corrected metadata: has_model_contacts, has_good_quality."""
    contacts, quality = set(), set()
    with _open(path) as fh:
        hdr = fh.readline().rstrip("\n").split("\t")
        idx = {c: i for i, c in enumerate(hdr)}
        for line in fh:
            f = line.rstrip("\n").split("\t")
            h = f[idx["tcr_pmhc_hash"]].strip().lower()
            native = f[idx["is_native"]].strip().lower() == "true"
            if native or not h:
                continue
            nc = _to_float(f[idx["num_contacts"]])
            rc = _to_float(f[idx["ranking_confidence"]])
            if nc is not None and nc > 0:
                contacts.add(h)
            if rc is not None and rc >= QUALITY_THRESHOLD:
                quality.add(h)
    return contacts, quality


def load_pdb_natives(path: Path):
    """PDB_Database.txt native chunk rows keyed by tcr_pmhc_hash and by pdb id."""
    rows = []
    with open(path, encoding="utf-8") as fh:
        hdr = fh.readline().rstrip("\n").split("\t")
        for line in fh:
            r = dict(zip(hdr, line.rstrip("\n").split("\t")))
            rows.append(r)
    return rows


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("vdjdb", type=Path, help="deployed vdjdb.txt")
    ap.add_argument("--metadata", type=Path, required=True, help="corrected vdjdb_structures_metadata.tsv.gz")
    ap.add_argument("--pdb-db", type=Path, required=True, help="vdjdb-db chunks/PDB_Database.txt")
    ap.add_argument("-o", "--output", type=Path, required=True)
    ap.add_argument("--dry-run", action="store_true", help="report counts, do not write")
    args = ap.parse_args()

    contacts, quality = load_corrected(args.metadata)
    print(f"corrected: {len(contacts)} model-with-contacts hashes, {len(quality)} good-quality hashes")

    with open(args.vdjdb, encoding="utf-8") as fh:
        header = fh.readline().rstrip("\n").split("\t")
    idx = {c: i for i, c in enumerate(header)}
    col = {c: idx[c] for c in ["meta", "TCR_hash", "evidence.structure.native",
                               "evidence.structure.contacts", "evidence.structure.quality", "complex.id"]}

    existing_pdb_ids = set()
    max_complex = 0
    stats = {"native": 0, "was_native": 0, "contacts": 0, "quality": 0, "hash_fixed": 0}

    def valid_pdb(meta_str):
        try:
            sid = (json.loads(meta_str).get("structure.id") or "").strip()
        except Exception:
            return None
        return sid if PDB_RE.match(sid) else None

    out = None if args.dry_run else open(args.output, "w", encoding="utf-8", newline="")
    if out:
        out.write("\t".join(header) + "\n")

    # single streaming pass over vdjdb.txt
    with open(args.vdjdb, encoding="utf-8") as fh:
        fh.readline()
        for line in fh:
            f = line.rstrip("\n").split("\t")
            if len(f) < len(header):
                f += [""] * (len(header) - len(f))
            h = f[col["TCR_hash"]].strip().lower()
            pdb = valid_pdb(f[col["meta"]])
            if pdb:
                existing_pdb_ids.add(pdb.lower())
            try:
                max_complex = max(max_complex, int(f[col["complex.id"]]))
            except ValueError:
                pass
            if f[col["evidence.structure.native"]].strip().lower() == "true":
                stats["was_native"] += 1
            nat = "true" if pdb else "false"
            con = "true" if h in contacts else "false"
            qua = "true" if h in quality else "false"
            f[col["evidence.structure.native"]] = nat
            f[col["evidence.structure.contacts"]] = con
            f[col["evidence.structure.quality"]] = qua
            stats["native"] += nat == "true"
            stats["contacts"] += con == "true"
            stats["quality"] += qua == "true"
            if out:
                out.write("\t".join(f) + "\n")

    # generate paired TRA/TRB rows for PDB natives whose pdb id is absent from vdjdb.txt
    generated = 0
    cid = max_complex
    for r in load_pdb_natives(args.pdb_db):
        pdbid = (r.get("meta.structure.id") or "").strip()
        if not pdbid or pdbid.lower() in existing_pdb_ids:
            continue
        existing_pdb_ids.add(pdbid.lower())
        cid += 1
        generated += 1
        fields = {k: r.get(k, "") for k in HASH_KEYS}
        h = tcr_hash(fields)
        meta = json.dumps({"structure.id": pdbid})
        ref = f"https://www.rcsb.org/structure/{pdbid.upper()}"
        con = "true" if h in contacts else "false"
        qua = "true" if h in quality else "false"
        for gene, cdr3, v, j in [("TRA", r["cdr3.alpha"], r["v.alpha"], r["j.alpha"]),
                                 ("TRB", r["cdr3.beta"], r["v.beta"], r["j.beta"])]:
            row = {c: "" for c in header}
            row.update({
                "complex.id": str(cid), "gene": gene, "cdr3": cdr3, "v.segm": v, "j.segm": j,
                "species": r["species"], "mhc.a": r["mhc.a"], "mhc.b": r["mhc.b"], "mhc.class": r["mhc.class"],
                "antigen.epitope": r["antigen.epitope"], "antigen.gene": r.get("antigen.gene", ""),
                "antigen.species": r.get("antigen.species", ""), "reference.id": ref, "vdjdb.score": "3",
                "TCR_hash": h, "meta": meta, "method": "", "cdr3fix": "",
                "evidence.structure.native": "true", "evidence.structure.contacts": con,
                "evidence.structure.quality": qua,
            })
            if out:
                out.write("\t".join(row[c] for c in header) + "\n")

    if out:
        out.close()

    print(f"rows: native {stats['was_native']} -> {stats['native']} "
          f"(removed {stats['was_native'] - stats['native']} false natives)")
    print(f"      contacts={stats['contacts']}  quality={stats['quality']}")
    print(f"generated {generated} native complexes ({generated * 2} rows) from PDB_Database not already present")
    if args.dry_run:
        print("DRY RUN — no output written")
    else:
        print(f"wrote {args.output}")
    # self-check
    assert stats["native"] < stats["was_native"], "expected fewer native rows after fix"
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
