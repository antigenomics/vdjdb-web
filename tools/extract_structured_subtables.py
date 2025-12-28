#!/usr/bin/env python3

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Iterable, Set, Tuple


def iter_structure_ids(structure_dir: Path) -> Set[str]:
    ids: Set[str] = set()
    if not structure_dir.is_dir():
        raise SystemExit(f"Structure directory not found: {structure_dir}")

    for path in structure_dir.iterdir():
        name = path.name
        if not name.endswith(".html"):
            continue
        if name.endswith("_simplified.html"):
            continue
        ids.add(name[:-5].strip().lower())
    return ids


def filter_tsv_by_hash(
    input_path: Path, output_path: Path, structure_ids: Set[str]
) -> Tuple[int, int]:
    with input_path.open("r", encoding="utf-8") as fin:
        header_line = fin.readline()
        if not header_line:
            raise SystemExit(f"Empty input: {input_path}")

        header = header_line.rstrip("\n").split("\t")
        try:
            hash_index = header.index("TCR_hash")
        except ValueError as exc:
            raise SystemExit(f"`TCR_hash` column not found in: {input_path}") from exc

        output_path.parent.mkdir(parents=True, exist_ok=True)
        with output_path.open("w", encoding="utf-8", newline="") as fout:
            fout.write(header_line)

            total = 0
            kept = 0
            for line in fin:
                total += 1
                parts = line.rstrip("\n").split("\t")
                if len(parts) <= hash_index:
                    continue
                tcr_hash = parts[hash_index].strip().lower()
                if tcr_hash and tcr_hash in structure_ids:
                    fout.write(line)
                    kept += 1

    return total, kept


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extract rows from VDJdb TSVs that have a structure in <db>/structure by TCR_hash."
    )
    parser.add_argument(
        "--db-dir",
        type=Path,
        default=Path("vdjdb-2025-10-28"),
        help="VDJdb database directory (default: vdjdb-2025-10-28)",
    )
    parser.add_argument(
        "--structure-dir",
        type=Path,
        default=None,
        help="Structure directory (default: <db-dir>/structure)",
    )
    parser.add_argument(
        "--inputs",
        type=str,
        nargs="*",
        default=["vdjdb.txt", "vdjdb_full.txt"],
        help="Input TSV file names inside <db-dir> (default: vdjdb.txt vdjdb_full.txt)",
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=None,
        help="Output directory (default: <db-dir>)",
    )
    parser.add_argument(
        "--suffix",
        type=str,
        default="with_structures",
        help="Output file suffix (default: with_structures)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    db_dir: Path = args.db_dir
    structure_dir: Path = args.structure_dir or (db_dir / "structure")
    out_dir: Path = args.out_dir or db_dir

    structure_ids = iter_structure_ids(structure_dir)
    if not structure_ids:
        raise SystemExit(f"No structure HTML files found in: {structure_dir}")

    print(f"Structures: {len(structure_ids)} ids from {structure_dir}")

    for rel_name in args.inputs:
        input_path = db_dir / rel_name
        if not input_path.is_file():
            raise SystemExit(f"Input not found: {input_path}")

        stem = input_path.name.rsplit(".", 1)[0]
        output_path = out_dir / f"{stem}.{args.suffix}.tsv"
        total, kept = filter_tsv_by_hash(input_path, output_path, structure_ids)
        print(f"{input_path} -> {output_path} | kept {kept} / {total} rows")


if __name__ == "__main__":
    main()

