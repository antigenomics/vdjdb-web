#!/usr/bin/env python3
"""Prepare a fresh legacy web structure directory from the local dataset mirror.

Copies only hashes referenced by the selected web table; no network or cached-result reuse.
Writes the explicit manifest consumed by build_structure_maps.py and legacy download bundles.
"""
import argparse
import csv
import gzip
import io
import re
import tarfile
from pathlib import Path


def native_choices(web, dataset, wanted):
    native = {}
    source = dataset / 'metadata/current/vdjdb_structures_metadata_current.tsv.gz'
    if not source.exists():
        return {}
    with gzip.open(source, 'rt') as stream:
        for row in csv.DictReader(stream, delimiter='\t'):
            key, pdb = row['tcr_pmhc_hash'].lower(), row['meta.structure.id'].lower()
            if key in wanted and row['is_native'].lower() == 'true' and re.fullmatch('[0-9][a-z0-9]{3}', pdb):
                native.setdefault(key, set()).add(pdb)
    reviewed = {}
    choices = web / 'native_representatives.tsv'
    if choices.exists():
        with choices.open() as stream:
            reviewed = {row['tcr_pmhc_hash']: row['selected_pdb'] for row in csv.DictReader(stream, delimiter='\t')}
    selected = {}
    for key, candidates in native.items():
        pdb = next(iter(candidates)) if len(candidates) == 1 else reviewed.get(key)
        if pdb not in candidates:
            raise ValueError(f'Native structure {key} needs a reviewed PDB representative')
        selected[key] = pdb
    return selected


def prepare(web, dataset, out):
    if out.exists() and any(out.iterdir()):
        raise ValueError('structure output must be fresh and empty')
    out.mkdir(parents=True, exist_ok=True)
    table = web / 'vdjdb.txt'
    if not table.exists():
        table = web / 'vdjdb.txt.gz'
    opener = gzip.open if table.suffix == '.gz' else open
    with opener(table, 'rt') as stream:
        wanted = {row['TCR_hash'].lower() for row in csv.DictReader(stream, delimiter='\t')}
    native = native_choices(web, dataset, wanted)
    by_pdb = {}
    for key, pdb in native.items():
        by_pdb.setdefault(pdb, []).append(key)
    coverage = dataset / 'metadata/native_review/pdb_coverage_current.tsv.gz'
    native_members, deposited = {}, {}
    if coverage.exists():
        with gzip.open(coverage, 'rt') as stream:
            for row in csv.DictReader(stream, delimiter='\t'):
                if row['archive'] == 'data/pdb_files_native.tgz':
                    native_members[row['member']] = row['pdb_id']
                if row['deposited_source_file']:
                    deposited[row['pdb_id']] = row['deposited_source_file']
    jobs = [('pdb_files.tgz', '.pdb', 'aligned_aligned_{hash}.pdb'),
            ('pdb_files_native.tgz', '.pdb', 'aligned_aligned_{hash}.pdb')]
    counts = {}
    identical_duplicates = 0
    for archive, suffix, target in jobs:
        n = 0
        with tarfile.open(dataset / 'data' / archive, 'r|gz') as source:
            for member in source:
                if not member.isfile() or not member.name.endswith(suffix):
                    continue
                base = Path(member.name).name.lower()
                match = re.search(r'[0-9a-f]{64}', base)
                if archive == 'pdb_files_native.tgz':
                    match_pdb = re.search(r'(?:^|_)([0-9][a-z0-9]{3})\.pdb$', base)
                    pdb = native_members.get(member.name, match_pdb.group(1) if match_pdb else '')
                    keys = by_pdb.get(pdb, [])
                else:
                    keys = [match.group()] if match and match.group() in wanted else []
                    if keys and keys[0] in native:
                        keys = []  # the experimental representative is selected instead
                if not keys:
                    continue
                with source.extractfile(member) as src:
                    data = src.read()
                for key in keys:
                    destination = out / target.format(hash=key)
                    if destination.exists():
                        if destination.read_bytes() != data:
                            raise ValueError(f'conflicting structure asset {destination.name}')
                        identical_duplicates += 1
                        continue
                    destination.write_bytes(data)
                    n += 1
        counts[archive] = n
    models = sorted(out.glob('aligned_aligned_*.pdb'))
    for key, pdb in native.items():
        if (out / f'aligned_aligned_{key}.pdb').exists():
            continue
        source = dataset / deposited.get(pdb, f'data/pdb_sources/{pdb}.cif.gz')
        if not source.resolve().is_relative_to(dataset.resolve()):
            raise ValueError('deposited coordinate source escapes the dataset mirror')
        if source.exists():
            target = out / f'{key}.cif.gz'
            with source.open('rb') as src, target.open('wb') as dst:
                import shutil
                shutil.copyfileobj(src, dst)
            models.append(target)
    if not models:
        raise ValueError('no referenced structure coordinates found')
    with (out / 'map-inputs.tsv.gz').open('wb') as raw, gzip.GzipFile(
            filename='', fileobj=raw, mode='wb', mtime=0) as zipped, io.TextIOWrapper(zipped) as stream:

        writer = csv.writer(stream, delimiter='\t', lineterminator='\n')
        writer.writerow(['path', 'hash'])
        for model in models:
            key = re.search(r'[0-9a-f]{64}', model.name).group()
            writer.writerow([model.name, key])
    from structure_asset_identity import bindings, write_json
    write_json(out / 'input-digests.json', dict(schema_version=1, **bindings(
        web, dataset / 'metadata/current/vdjdb_structures_metadata_current.tsv.gz')))
    print({'archives': counts, 'referenced_hashes': len(wanted), 'available_structures': len(models), 'native_representatives': len(native), 'identical_duplicate_assets': identical_duplicates})


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--web', type=Path, required=True)
    parser.add_argument('--dataset', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    prepare(args.web, args.dataset, args.out)
