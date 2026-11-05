#!/usr/bin/env python3
"""Verify and install an explicit release into a fresh immutable directory (stdlib only)."""
import argparse
import csv
import hashlib
import json
import re
import shutil
import stat
import tempfile
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path, PurePosixPath
from structure_asset_identity import digest, rows, table, validate

MAX_FILE = 2 * 1024**3
MAX_TOTAL = 32 * 1024**3


def safe_name(name):
    path = PurePosixPath(name)
    if not name or '\\' in name or path.is_absolute() or any(p in ('..', '.') for p in name.split('/')) or ':' in name or '\x00' in name:
        raise ValueError(f'unsafe archive path: {name}')
    return path


def extract(archive, target, expected=None):
    with zipfile.ZipFile(archive) as bundle:
        infos = bundle.infolist()
        names = [i.filename for i in infos]
        if len(names) != len(set(names)):
            raise ValueError('duplicate archive members')
        files = {i.filename for i in infos if not i.is_dir()}
        if expected is not None and files != set(expected):
            raise ValueError('archive member set mismatch')
        if sum(i.file_size for i in infos) > MAX_TOTAL:
            raise ValueError('archive exceeds total limit')
        for info in infos:
            safe_name(info.filename.rstrip('/'))
            mode = info.external_attr >> 16
            if stat.S_ISLNK(mode) or (stat.S_IFMT(mode) not in (0, stat.S_IFREG, stat.S_IFDIR)) or info.file_size > MAX_FILE:
                raise ValueError('unsafe archive member type or size')
            path = target.joinpath(*PurePosixPath(info.filename).parts)
            if info.is_dir():
                path.mkdir(parents=True, exist_ok=True)
                continue
            path.parent.mkdir(parents=True, exist_ok=True)
            with bundle.open(info) as src, path.open('xb') as dst:
                shutil.copyfileobj(src, dst)


def check_core(root):
    core = table(root, 'vdjdb.txt')
    if not (root / 'vdjdb.meta.txt').is_file():
        raise ValueError('missing vdjdb.meta.txt')
    first = next(rows(core), None)
    if first is None or not {'TCR_hash', 'cdr3', 'gene'} <= first.keys():
        raise ValueError('invalid web table')
    for path in root.rglob('*'):
        if path.is_file() and path.suffix == '.gz' and path.with_suffix('').exists():
            raise ValueError('ambiguous plain/gzip files')
        if path.is_file() and path.suffix in ('.txt', '.tsv') and path.stat().st_size > 1_000_000:
            raise ValueError('oversize uncompressed generated table')
    for family, suffix in (('tcrnet', ''), ('tcremp', '_tcremp')):
        members_name, pwm_name = f'cluster_members{suffix}.txt', f'motif_pwms{suffix}.txt'
        present = [any((root / (name + ext)).exists() for ext in ('', '.gz'))
                   for name in (members_name, pwm_name)]
        if any(present):
            if not all(present):
                raise ValueError('motif members/PWM pair incomplete')
            table(root, pwm_name)
            if not (root / 'motif-charts/plotly.min.js').is_file():
                raise ValueError('missing chart runtime')
            for row in rows(table(root, members_name)):
                species, gene, epitope = (row[k] for k in ('species', 'gene', 'antigen.epitope'))
                parts = (species, gene, epitope) if family == 'tcrnet' else (species, epitope, gene)
                name = '_'.join(re.sub('[^a-z0-9]', '', value.lower()) for value in parts) + '.html'
                if not (root / 'motif-charts' / family / name).is_file():
                    raise ValueError(f'missing motif chart {family}/{name}')


def install(artifacts, destination, tag=None, tables_only=False):
    manifest_path = artifacts / 'manifest.json'
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else None
    if manifest:
        if manifest.get('schema_version') != 1:
            raise ValueError('unsupported release schema')
        version = manifest['tag']
        if tag and version != tag:
            raise ValueError('returned tag differs from requested tag')
        roles = ['web'] + ([] if tables_only else ['web-structures'])
        bundles = []
        for role in roles:
            matches = [b for b in manifest['bundles'] if b['role'] == role]
            if len(matches) != 1:
                raise ValueError(f'expected exactly one {role} bundle')
            bundles += matches
    else:
        archives = list(artifacts.glob('*.zip'))
        if len(archives) != 1:
            raise ValueError('historical release requires one ZIP or a manifest')
        if not tag:
            raise ValueError('historical release requires explicit --tag')
        version, bundles = tag, [dict(file=archives[0].name)]
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]*', version):
        raise ValueError('unsafe release tag')
    final = destination / version
    destination.mkdir(parents=True, exist_ok=True)
    if final.exists():
        raise FileExistsError(f'immutable release already exists: {final}')
    checksums = {}
    sums = artifacts / 'SHA256SUMS'
    if sums.exists():
        for line in sums.read_text().splitlines():
            sha, name = line.split('  ', 1)
            if name in checksums or not re.fullmatch('[0-9a-f]{64}', sha):
                raise ValueError('invalid SHA256SUMS')
            checksums[name] = sha
        for name in ([manifest_path.name] if manifest else []) + [b['file'] for b in bundles]:
            if checksums.get(name) != digest(artifacts / name):
                raise ValueError(f'SHA256SUMS mismatch: {name}')
    with tempfile.TemporaryDirectory(prefix='.staging-', dir=destination) as temp:
        stage = Path(temp) / 'assets'
        stage.mkdir()
        for index, bundle in enumerate(bundles):
            name = bundle['file']
            if safe_name(name).name != name:
                raise ValueError('bundle filename must be flat')
            archive = artifacts / name
            if manifest and (archive.stat().st_size != bundle['bytes'] or digest(archive) != bundle['sha256']):
                raise ValueError('bundle checksum mismatch')
            unpacked = Path(temp) / f'bundle-{index}'
            unpacked.mkdir()
            extract(archive, unpacked, bundle.get('members'))
            children = list(unpacked.iterdir())
            payload = children[0] if len(children) == 1 and children[0].is_dir() and children[0].name != 'structure' else unpacked
            for child in payload.iterdir():
                if (stage / child.name).exists():
                    raise ValueError('overlapping bundle paths')
                child.rename(stage / child.name)
        # Historical archives sometimes have one enclosing directory.
        root = stage
        children = list(stage.iterdir())
        if len(children) == 1 and children[0].is_dir():
            root = children[0]
        check_core(root)
        if not tables_only or (root / 'prepared-assets.json').exists() or any(root.glob('structures_metadata.tsv*')):
            validate(root)
        root.rename(final)
    return final


def fetch(url, path):
    request = urllib.request.Request(url, headers={'User-Agent': 'vdjdb-release-installer'})
    with urllib.request.urlopen(request, timeout=60) as src, path.open('wb') as dst:
        shutil.copyfileobj(src, dst)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--tag')
    ap.add_argument('--artifacts', type=Path, help='local release artifacts directory')
    ap.add_argument('--destination', required=True, type=Path)
    ap.add_argument('--tables-only', action='store_true')
    args = ap.parse_args()
    if not args.tag and not args.artifacts:
        ap.error('provide --tag or --artifacts')
    with tempfile.TemporaryDirectory(prefix='vdjdb-download-') as temp:
        artifacts = args.artifacts
        if artifacts is None:
            artifacts = Path(temp)
            api = 'https://api.github.com/repos/antigenomics/vdjdb-db/releases/tags/' + urllib.parse.quote(args.tag, safe='')
            fetch(api, artifacts / 'release.json')
            release = json.loads((artifacts / 'release.json').read_text())
            if release['tag_name'] != args.tag:
                raise ValueError('GitHub returned wrong release tag')
            assets = {a['name']: a['browser_download_url'] for a in release['assets']}
            if 'manifest.json' in assets:
                fetch(assets['manifest.json'], artifacts / 'manifest.json')
                manifest = json.loads((artifacts / 'manifest.json').read_text())
                roles = {'web'} | (set() if args.tables_only else {'web-structures'})
                names = [b['file'] for b in manifest['bundles'] if b['role'] in roles]
            else:
                names = [name for name in assets if name.endswith('.zip')]
                if len(names) != 1:
                    raise ValueError('no manifest and ambiguous release ZIPs')
            if 'SHA256SUMS' in assets:
                names.append('SHA256SUMS')
            for name in names:
                if safe_name(name).name != name:
                    raise ValueError('unsafe download name')
                fetch(assets[name], artifacts / name)
        selected = install(artifacts, args.destination, args.tag, args.tables_only).resolve()
    print(f'Installed: {selected}\napplication.database.useLocal=true\napplication.database.path="{selected}/"\napplication.motifCharts.path="{selected}/motif-charts/"\nUpdate bind mounts/config and restart explicitly when ready.')


if __name__ == '__main__':
    main()
