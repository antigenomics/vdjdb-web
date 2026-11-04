#!/usr/bin/env python3
"""Build legacy web HTML/SVG maps with TCRen, using an explicit identity manifest.

Run in the TCRen environment. Manifest TSV: path, hash. Paths are relative to the
manifest; hashes are the exact legacy TCR_hash, never inferred from filenames.
Annotation runs in one batch. ipTM is supplied separately by build_structures_metadata.py.
"""
from __future__ import annotations

import argparse
import csv
import re
from pathlib import Path


def read_manifest(path):
    with path.open() as stream:
        rows = list(csv.DictReader(stream, delimiter='\t'))
    if not rows:
        raise ValueError('empty structure manifest')
    seen = set()
    for row in rows:
        key = row['hash']
        if not re.fullmatch('[0-9a-f]{64}', key) or key in seen:
            raise ValueError('hash must be unique lowercase SHA256')
        seen.add(key)
        source = Path(row['path'])
        row['path'] = source if source.is_absolute() else path.parent / source
        if not row['path'].is_file():
            raise FileNotFoundError(row['path'])
    return rows


def write_maps(structure, out):
    from tcren.project2d import (project_structure, residue_markup_table,
                                contacts_table, ca_contacts_table, pocket_markers)
    from tcren.viz import render_complementarity_map

    markup = residue_markup_table(structure, project_structure(structure))
    contacts = contacts_table(structure, threshold=5.0)
    ca = ca_contacts_table(structure, threshold=8.0)
    for suffix, chains in [('', None), ('_simplified', ['tra', 'trb', 'peptide'])]:
        svg = render_complementarity_map(markup, contacts=contacts, ca_contacts=ca,
                                        pockets=pocket_markers(markup) if chains is None else None,
                                        show_chains=chains)
        stem = out / (structure.pdb_id + suffix)
        stem.with_suffix('.svg').write_text(svg)
        stem.with_suffix('.html').write_text(
            '<!doctype html><html><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1">'
            '<style>svg{max-width:100%;height:auto}</style></head><body>' + svg + '</body></html>')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True, help='legacy database structure/ directory')
    parser.add_argument('--threads', type=int, default=0)
    args = parser.parse_args()
    rows = read_manifest(args.manifest)
    from tcren.structure import parse_structure
    from tcren.annotation import classify_chains
    from tcren.annotation.batch import annotate_batch
    from tcren.mhc import annotate_mhc_batch

    structures = [parse_structure(row['path'], pdb_id=row['hash']) for row in rows]
    records = annotate_batch(structures, threads=args.threads)
    for structure, annotation in zip(structures, records):
        classify_chains(structure, organism='human', autodetect_species=True,
                        precomputed_records=annotation)
    annotate_mhc_batch(structures, threads=args.threads)
    args.out.mkdir(parents=True, exist_ok=True)
    for structure in structures:
        write_maps(structure, args.out)
    print(f'wrote {len(structures)} full and simplified TCRen maps')


if __name__ == '__main__':
    main()
