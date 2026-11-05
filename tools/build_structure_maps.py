#!/usr/bin/env python3
"""Build legacy web HTML maps with TCRen, using an explicit identity manifest.

Run in the TCRen environment. Manifest TSV: path, hash. Paths are relative to the
manifest; hashes are the exact legacy TCR_hash, never inferred from filenames.
Annotation runs in one batch. ipTM is supplied separately by build_structures_metadata.py.
"""
from __future__ import annotations

import argparse
import csv
import gzip
import re
from pathlib import Path


def read_manifest(path):
    opener = gzip.open if path.suffix == ".gz" else open
    with opener(path, "rt") as stream:
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


def write_downloads(structure, out, source, contacts, markup, note=''):
    import shutil
    import zipfile
    from tcren.structure.io import write_pdb
    from tcren.docking import rename_chains

    key = structure.pdb_id
    pdb = out / f'aligned_aligned_{key}.pdb'
    cif = source.name.lower().endswith(('.cif', '.cif.gz', '.mmcif', '.mmcif.gz'))
    if cif:
        renamed, _ = rename_chains(structure)
        write_pdb(renamed, pdb)
    elif source.resolve() != pdb.resolve():
        shutil.copyfile(source, pdb)
    coordinates = out / f'{key}_aa_coordinates.tsv'
    contact_file = out / f'{key}_contacts_aa.txt'
    roles = {'TRA': 'TCR_alpha', 'TRB': 'TCR_beta', 'PEPTIDE': 'peptide'}
    with coordinates.open('w') as stream:
        writer = csv.writer(stream, delimiter='\t', lineterminator='\n')
        writer.writerow(['Chain', 'Residue', 'ResNum', 'X', 'Y', 'Z'])
        for chain in structure.chains:
            if chain.chain_type in roles:
                for residue in chain.residues:
                    if residue.ca is not None:
                        writer.writerow([roles[chain.chain_type], residue.aa,
                                         residue.seq_index + 1, *residue.ca])
    labels = {'tra': 'CDR3_alpha', 'trb': 'CDR3_beta', 'peptide': 'peptide'}
    lookup = {(r['structure_chain'], r['aa_index']): r for r in markup.iter_rows(named=True)}
    with contact_file.open('w') as stream:
        writer = csv.writer(stream, delimiter='\t', lineterminator='\n')
        writer.writerow(['chain_from', 'aa_from', 'res_num_from', 'aa_to', 'res_num_to', 'chain_to'])
        for contact in contacts.iter_rows(named=True):
            a = lookup.get((contact['structure_chain_1'], contact['aa_index_1']))
            b = lookup.get((contact['structure_chain_2'], contact['aa_index_2']))
            if a and b:
                writer.writerow([labels[a['complex_chain']], a['aa'], a['aa_index'] + 1,
                                 b['aa'], b['aa_index'] + 1, labels[b['complex_chain']]])
    members = [pdb, contact_file, coordinates] + ([source] if cif else [])
    if note:
        identity = out / f'{key}_identity.txt'
        identity.write_text(note + '\n')
        members.append(identity)
    with zipfile.ZipFile(out / f'{key}_all.zip', 'w', compression=zipfile.ZIP_DEFLATED) as bundle:
        for path in members:
            info = zipfile.ZipInfo(path.name, date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            with path.open('rb') as src, bundle.open(info, 'w') as dst:
                shutil.copyfileobj(src, dst)


def write_maps(structure, out, projection=None, bounds=None, source=None, note=""):
    from tcren.project2d import (project_structure, residue_markup_table,
                                contacts_table, ca_contacts_table)
    from tcren.viz import render_complementarity_map

    import polars as pl
    import xml.etree.ElementTree as ET

    projection = projection or project_structure(structure)
    if projection.frame != 'native':
        raise ValueError('legacy overlays require the canonical native frame, not a per-model PCA frame')
    markup = residue_markup_table(structure, projection).filter(
        (pl.col('complex_chain') == 'peptide') |
        (pl.col('complex_chain').is_in(['tra', 'trb']) & (pl.col('complex_region') == 'cdr3'))).drop_nulls(['u', 'v'])
    contacts = contacts_table(structure, threshold=5.0)
    ca = ca_contacts_table(structure, threshold=8.0)
    if source is not None:
        write_downloads(structure, out, source, contacts, markup, note)
    for suffix in ['', '_simplified']:
        svg = render_complementarity_map(markup,
                                        contacts=contacts if not suffix else None,
                                        ca_contacts=ca if not suffix else None, bounds=bounds)
        # Keep the legacy legend and transparent overlay layers. Geometry remains TCRen-owned.
        ET.register_namespace('', 'http://www.w3.org/2000/svg')
        root = ET.fromstring(svg)
        ns = '{http://www.w3.org/2000/svg}'
        background = root.find(ns + 'rect')
        if background is not None:
            root.remove(background)
        if note:
            from textwrap import wrap
            for line, text in enumerate(wrap(note, width=130)):
                ET.SubElement(root, ns + 'text', {'x': '20', 'y': str(20 + 12 * line),
                              'font-size': '10', 'fill': '#9a4d00'}).text = text
        colors = {'tra': '#008000', 'trb': '#ff0000', 'peptide': '#0000ff'}
        source_residues = {(chain.chain_id, residue.seq_index): residue
                           for chain in structure.chains for residue in chain.residues}
        for group in root.findall('.//' + ns + 'g[@class="residue"]'):
            group.find(ns + 'rect').set('fill', colors[group.get('data-complex-chain')])
            group.findall(ns + 'text')[0].set('fill', 'black' if group.get('data-complex-chain') == 'trb' else 'white')
            residue = source_residues[(group.get('data-chain'), int(group.get('data-aa-index')))]
            group.set('data-insertion-code', residue.insertion_code)
            group.findall(ns + 'text')[-1].text = str(residue.pdb_index) + residue.insertion_code
            group.find(ns + 'title').text = f'{residue.aa}{residue.pdb_index}{residue.insertion_code} ({residue.resname})'
        svg = ET.tostring(root, encoding='unicode')
        stem = out / (structure.pdb_id + suffix)
        stem.with_suffix('.html').write_text(
            '<!doctype html><html><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1">'
            '<style>svg{max-width:100%;height:auto}</style></head><body>' + svg + '</body></html>')


def export_one(work):
    structure, projection, row, out, bounds = work
    write_maps(structure, out, projection, bounds, row['path'],
               row.get('note', ''))
    return structure.pdb_id


def validate_identities(structures, metadata, *, repair_roles=False, variants=None, raw_chains=None):
    """Check deposited sequences against the metadata that owns each legacy hash."""
    wanted = {structure.pdb_id for structure in structures}
    expected = {}
    reviewed = {}
    if variants:
        with variants.open() as stream:
            for row in csv.DictReader(stream, delimiter='\t'):
                key = (row['hash'], row['role'])
                if key in reviewed:
                    raise ValueError('duplicate reviewed native variant')
                reviewed[key] = row
    notes = {}
    opener = gzip.open if metadata.suffix == '.gz' else open
    with opener(metadata, 'rt') as stream:
        for row in csv.DictReader(stream, delimiter='\t'):
            key = row['tcr_pmhc_hash']
            if key in wanted:
                expected.setdefault(key, set()).add(tuple(row[field] for field in
                    ('cdr3.alpha', 'cdr3.beta', 'antigen.epitope')))
    errors = []
    repaired = 0
    for structure in structures:
        identities = expected.get(structure.pdb_id, set())
        if len(identities) != 1:
            errors.append(f'{structure.pdb_id}: missing or conflicting metadata identity')
            continue
        for role, sequence in zip(('TRA', 'TRB', 'PEPTIDE'), next(iter(identities))):
            review = reviewed.get((structure.pdb_id, role))
            if review and review['expected'] == sequence:
                notes[structure.pdb_id] = f"{review['pdb'].upper()}: {role} {review['observed']} differs from metadata {sequence}. {review['reason']}."
                sequence = review['observed']
            if repair_roles and sequence:
                from tcren.structure.model import Chain, RegionMarkup
                if role == 'PEPTIDE' and not any(sequence in c.sequence() for c in structure.chains):
                    # Generic linker stripping can remove residues explicitly included in
                    # this dataset's epitope. Recover only an exact segment of raw coordinates.
                    for chain_id, residues in (raw_chains or {}).get(structure.pdb_id, []):
                        raw_sequence = ''.join(r.aa for r in residues)
                        start = raw_sequence.find(sequence)
                        if start >= 0:
                            structure.chains.append(Chain(chain_id + '_metadata_peptide',
                                residues[start:start + len(sequence)], chain_type='PEPTIDE'))
                for chain in list(structure.chains):
                    start = chain.sequence().find(sequence)
                    if start < 0:
                        continue
                    if role == 'PEPTIDE' and chain.sequence() != sequence:
                        # Exact metadata segment in a covalently fused construct. Preserve
                        # author/sequence indices and split before primary-complex selection.
                        residues = chain.residues[start:start + len(sequence)]
                        chain.residues = chain.residues[:start] + chain.residues[start + len(sequence):]
                        peptide_id = chain.chain_id + '_peptide'
                        if any(c.chain_id == peptide_id for c in structure.chains):
                            raise ValueError('fused peptide chain ID collision')
                        chain = Chain(peptide_id, list(residues), chain_type='PEPTIDE')
                        structure.chains.append(chain)
                    repaired += chain.chain_type != role
                    chain.chain_type = role
                    # Metadata receptor sequences are full junctions, including C/F(W) anchors.
                    residues = chain.residues if role == 'PEPTIDE' else chain.residues[start + 1:start + len(sequence) - 1]
                    region = 'PEPTIDE' if role == 'PEPTIDE' else 'CDR3'
                    chain.regions = [r for r in chain.regions if r.region_type != region] + [
                        RegionMarkup(region, residues[0].seq_index, residues[-1].seq_index,
                                     ''.join(r.aa for r in residues), list(residues))]
                for chain in structure.by_type(role):
                    if sequence not in chain.sequence():
                        chain.chain_type = None  # unrelated copy/tag cannot win complex selection
            if sequence and not any(sequence in chain.sequence() for chain in structure.by_type(role)):
                errors.append(f'{structure.pdb_id}: {role} sequence does not match metadata')
    if errors:
        raise ValueError('metadata identity mismatches:\n' + '\n'.join(errors))
    if repaired:
        print(f'restored {repaired} chain roles from exact metadata sequences', flush=True)
    print(f'verified receptor/peptide identity for {len(structures)} structures', flush=True)
    return notes


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True, help='legacy database structure/ directory')
    parser.add_argument('--threads', type=int, default=0)
    parser.add_argument('--metadata', type=Path, help='source metadata for receptor/peptide identity checks')
    parser.add_argument('--variants', type=Path, default=Path(__file__).with_name('native_structure_variants.tsv'))
    args = parser.parse_args()
    rows = read_manifest(args.manifest)
    from tcren.structure import parse_structure
    from tcren.annotation import classify_chains
    from tcren.annotation.batch import annotate_batch
    from tcren.mhc import annotate_mhc_batch

    print(f'parsing {len(rows)} raw coordinate inputs', flush=True)
    structures = [parse_structure(row['path'], pdb_id=row['hash'], keep_modified=True) for row in rows]
    raw_chains = {s.pdb_id: [(c.chain_id, list(c.residues)) for c in s.chains] for s in structures}
    print('annotating receptor and MHC queries in whole-set batches', flush=True)
    records = annotate_batch(structures, threads=args.threads)
    for structure, annotation in zip(structures, records):
        classify_chains(structure, organism='human', autodetect_species=True,
                        precomputed_records=annotation)
    annotate_mhc_batch(structures, threads=args.threads)
    from tcren.docking import select_primary_complex
    if args.metadata:
        notes = validate_identities(structures, args.metadata, repair_roles=True,
                                    variants=args.variants, raw_chains=raw_chains)
        for row in rows:
            row['note'] = notes.get(row['hash'], '')
    del raw_chains
    structures = [select_primary_complex(structure) for structure in structures]
    from tcren.project2d import project_structure
    print('projecting selected complexes into the canonical frame', flush=True)
    projections = [project_structure(structure) for structure in structures]
    if any(projection.frame != 'native' for projection in projections):
        raise ValueError('canonical reference annotation is required for legacy overlays')
    # One common viewport: per-map autoscaling would move the same physical point between layers.
    import numpy as np
    from tcren.project2d import residue_markup_table
    import polars as pl
    uv = np.concatenate([
        residue_markup_table(structure, projection).filter(
            (pl.col('complex_chain') == 'peptide') |
            (pl.col('complex_chain').is_in(['tra', 'trb']) & (pl.col('complex_region') == 'cdr3'))
        ).select('u', 'v').drop_nulls().to_numpy()
        for structure, projection in zip(structures, projections)])
    bounds = (float(uv[:, 0].min()), float(uv[:, 0].max()),
              float(uv[:, 1].min()), float(uv[:, 1].max()))
    args.out.mkdir(parents=True, exist_ok=True)
    from tcren.runtime import parallel_map
    work = [(structure, projection, row, args.out, bounds)
            for structure, projection, row in zip(structures, projections, rows)]
    print(f'exporting {len(work)} structures with the existing bounded TCRen worker API', flush=True)
    parallel_map(export_one, work, args.threads)
    from structure_asset_identity import seal
    snapshot = args.manifest.parent / 'input-digests.json'
    if snapshot.exists():
        import json
        from structure_asset_identity import digest
        identity = json.loads(snapshot.read_text())
        identity.pop('schema_version')
        if not args.metadata or digest(args.metadata) != identity['source_metadata_sha256']:
            raise ValueError('map metadata differs from prepared input')
        seal(args.out, identity)
    print(f'wrote {len(structures)} full and simplified TCRen maps')


if __name__ == '__main__':
    main()
