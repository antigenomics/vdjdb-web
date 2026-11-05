#!/usr/bin/env python3
"""Seal final prepared assets; never performs annotation or resumes calculations."""
import argparse
import csv
import gzip
import hashlib
import json
import re
import zipfile
from pathlib import Path


def stream_digest(stream):
    result = hashlib.sha256()
    for block in iter(lambda: stream.read(1024 * 1024), b''):
        result.update(block)
    return result.hexdigest()


def digest(path):
    with path.open('rb') as stream:
        return stream_digest(stream)


def table(root, name):
    paths = [p for p in (root / name, root / (name + '.gz')) if p.is_file()]
    if len(paths) != 1:
        raise ValueError(f'expected exactly one {name}[.gz]')
    return paths[0]


def rows(path):
    with (gzip.open(path, 'rt') if path.suffix == '.gz' else path.open()) as stream:
        yield from csv.DictReader(stream, delimiter='\t')


def write_json(path, data):
    path.write_text(json.dumps(data, sort_keys=True, indent=2) + '\n')


def bindings(web, source):
    return dict(web_table_sha256=digest(table(web, 'vdjdb.txt')),
                source_metadata_sha256=digest(source))


def required_files(directory, key):
    names = [key + '.html', key + '_simplified.html', 'aligned_aligned_' + key + '.pdb', key + '_all.zip']
    paths = [directory / name for name in names]
    paths += [table(directory, key + '_contacts_aa.txt'), table(directory, key + '_aa_coordinates.tsv')]
    if any(not p.is_file() for p in paths):
        raise ValueError(f'incomplete structure {key}')
    with zipfile.ZipFile(directory / (key + '_all.zip')) as bundle:
        expected = {p.name: p for p in paths if p.suffix != '.html' and p.suffix != '.zip'}
        members = bundle.namelist()
        if len(members) != len(set(members)) or not expected.keys() <= set(members):
            raise ValueError(f'incomplete/duplicate structure ZIP {key}')
        for name in members:
            if Path(name).name != name or not (directory / name).is_file():
                raise ValueError(f'unsafe/unbound structure ZIP member {name}')
            with bundle.open(name) as stream:
                if stream_digest(stream) != digest(directory / name):
                    raise ValueError(f'stale structure ZIP member {name}')
    return paths


def seal(directory, identity):
    keys = sorted(p.stem for p in directory.glob('*.html') if re.fullmatch('[0-9a-f]{64}', p.stem))
    if not keys:
        raise ValueError('no full structure maps')
    for key in keys:
        required_files(directory, key)
    files = []
    for path in sorted(directory.iterdir()):
        if path.name in ('asset-manifest.json',):
            continue
        if path.is_symlink() or not path.is_file():
            raise ValueError('structure assets must be regular flat files')
        if path.suffix in ('.txt', '.tsv') and path.stat().st_size > 1_000_000:
            raise ValueError(f'large generated table needs gzip: {path.name}')
        files.append(dict(path=path.name, bytes=path.stat().st_size, sha256=digest(path)))
    write_json(directory / 'asset-manifest.json', dict(schema_version=1, **identity, hashes=keys, files=files))


def validate(web):
    prepared = json.loads((web / 'prepared-assets.json').read_text())
    directory = web / 'structure'
    manifest_path = directory / 'asset-manifest.json'
    manifest = json.loads(manifest_path.read_text())
    if prepared['schema_version'] != 1 or manifest['schema_version'] != 1:
        raise ValueError('unsupported prepared schema')
    for key in ('web_table_sha256', 'source_metadata_sha256'):
        if not re.fullmatch('[0-9a-f]{64}', str(prepared[key])) or prepared[key] != manifest[key]:
            raise ValueError(f'mismatched prepared parent {key}')
    if prepared['web_table_sha256'] != digest(table(web, 'vdjdb.txt')) or prepared['structures_metadata_sha256'] != digest(table(web, 'structures_metadata.tsv')) or prepared['structure_manifest_sha256'] != digest(manifest_path):
        raise ValueError('prepared input digest mismatch')
    listed = set()
    for record in manifest['files']:
        name = record['path']
        if Path(name).name != name or name in listed:
            raise ValueError('unsafe/duplicate structure path')
        listed.add(name)
        path = directory / name
        if path.is_symlink() or path.stat().st_size != record['bytes'] or digest(path) != record['sha256']:
            raise ValueError(f'structure digest mismatch: {name}')
    actual = {p.name for p in directory.iterdir()} - {'asset-manifest.json'}
    if actual != listed:
        raise ValueError('structure member set mismatch')
    keys = manifest['hashes']
    if not keys or keys != sorted(set(keys)) or any(not re.fullmatch('[0-9a-f]{64}', k) for k in keys):
        raise ValueError('invalid structure hashes')
    if not set(keys) <= {r['TCR_hash'].lower() for r in rows(table(web, 'vdjdb.txt'))} or not set(keys) <= {r['hash'] for r in rows(table(web, 'structures_metadata.tsv'))}:
        raise ValueError('structure hashes absent from table/metrics')
    for key in keys:
        if not {p.name for p in required_files(directory, key)} <= listed:
            raise ValueError('required file not sealed')


def prepare_record(web, source):
    identity = bindings(web, source)
    manifest = web / 'structure/asset-manifest.json'
    data = json.loads(manifest.read_text())
    if any(data[k] != v for k, v in identity.items()):
        raise ValueError('map inputs differ from metadata inputs')
    record = web / 'prepared-assets.json'
    previous = record.read_bytes() if record.exists() else None
    try:
        write_json(record, dict(schema_version=1, **identity,
                   structures_metadata_sha256=digest(table(web, 'structures_metadata.tsv')),
                   structure_manifest_sha256=digest(manifest)))
        validate(web)
    except Exception:
        if previous is None:
            record.unlink(missing_ok=True)
        else:
            record.write_bytes(previous)
        raise


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--web', required=True, type=Path)
    ap.add_argument('--source-metadata', required=True, type=Path)
    args = ap.parse_args()
    seal(args.web / 'structure', bindings(args.web, args.source_metadata))
    prepare_record(args.web, args.source_metadata)
