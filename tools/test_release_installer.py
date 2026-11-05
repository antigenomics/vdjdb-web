#!/usr/bin/env python3
"""Small offline checks for prepared identity, archive boundaries and immutable installs."""
import json
import tempfile
import unittest
import warnings
import zipfile
from pathlib import Path
from install_release import check_core, extract, install
from structure_asset_identity import bindings, digest, prepare_record, seal, validate


CORE = ['complex.id', 'gene', 'cdr3', 'v.segm', 'j.segm', 'species', 'mhc.a', 'mhc.b',
        'mhc.class', 'antigen.epitope', 'antigen.gene', 'antigen.species', 'reference.id',
        'vdjdb.score', 'TCR_hash', 'method', 'meta', 'cdr3fix', 'web.method',
        'web.method.seq', 'web.cdr3fix.nc', 'web.cdr3fix.unmp']


def core_fixture(web, key):
    values = dict.fromkeys(CORE, '')
    values.update(gene='TRB', cdr3='CASSF', species='HomoSapiens', TCR_hash=key)
    (web / 'vdjdb.txt').write_text('\t'.join(CORE) + '\n' + '\t'.join(values[k] for k in CORE) + '\n')
    (web / 'vdjdb.meta.txt').write_text('name\ttype\tvisible\tsearchable\tautocomplete\tdata.type\ttitle\tcomment\n' +
        ''.join(name + '\ttxt\t0\t0\t0\ttxt\t' + name + '\t\n' for name in CORE))


class ReleaseChecks(unittest.TestCase):
    def test_complete_install_and_corruption(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            web = root / 'web'
            web.mkdir()
            source = root / 'source.tsv'
            source.write_text('original metadata\n')
            key = 'a' * 64
            core_fixture(web, key)
            (web / 'structures_metadata.tsv').write_text('hash\n' + key + '\n')
            structure = web / 'structure'
            structure.mkdir()
            for name in [key + '.html', key + '_simplified.html', 'aligned_aligned_' + key + '.pdb', key + '_contacts_aa.txt', key + '_aa_coordinates.tsv']:
                (structure / name).write_text(name)
            with zipfile.ZipFile(structure / (key + '_all.zip'), 'w') as bundle:
                for path in structure.iterdir():
                    if path.suffix not in ('.html', '.zip'):
                        bundle.write(path, path.name)
            seal(structure, bindings(web, source))
            prepare_record(web, source)
            validate(web)
            artifacts = root / 'artifacts'
            artifacts.mkdir()
            bundles = []
            for role in ('web', 'web-structures'):
                path = artifacts / (role + '.zip')
                with zipfile.ZipFile(path, 'w') as archive:
                    for file in web.rglob('*'):
                        if file.is_file() and ((structure in file.parents) == (role == 'web-structures')):
                            name = file.relative_to(web).as_posix()
                            archive.write(file, name if role == 'web-structures' else 'vdjdb-test/' + name)
                with zipfile.ZipFile(path) as archive:
                    members = archive.namelist()
                bundles.append(dict(role=role, file=path.name, bytes=path.stat().st_size, sha256=digest(path), members=members))
            manifest = artifacts / 'manifest.json'
            data = dict(schema_version=1, tag='test', bundles=bundles)
            manifest.write_text(json.dumps(data))
            dest = root / 'releases'
            final = install(artifacts, dest)
            self.assertTrue((final / 'structure/asset-manifest.json').exists())
            with self.assertRaises(FileExistsError):
                install(artifacts, dest)
            data['tag'] = 'broken'
            data['bundles'][0]['sha256'] = '0' * 64
            manifest.write_text(json.dumps(data))
            with self.assertRaises(ValueError):
                install(artifacts, dest)
            self.assertTrue(final.exists())
            self.assertFalse((dest / 'broken').exists())
            (structure / (key + '.html')).write_text('same hash, stale asset')
            with self.assertRaises(ValueError):
                validate(web)
            source.write_text('different metadata')
            with self.assertRaises(ValueError):
                prepare_record(web, source)

    def test_manifest_and_filename_boundaries(self):
        from unittest.mock import patch
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            manifest = root / 'manifest.json'
            for malformed in ({}, [], None):
                manifest.write_text(json.dumps(malformed))
                with self.assertRaises(ValueError):
                    install(root, root / 'releases', 'test', tables_only=True)
            manifest.write_text(json.dumps(dict(schema_version=1, tag='test', bundles=[
                dict(role='web', file='../outside.zip') ])))
            (root / 'SHA256SUMS').write_text('0' * 64 + '  ../outside.zip\n')
            with patch('install_release.digest', side_effect=AssertionError('must not read unsafe path')):
                with self.assertRaises(ValueError):
                    install(root, root / 'releases', tables_only=True)

    def test_core_column_order_and_shape(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            core_fixture(root, 'a' * 64)
            check_core(root)
            path = root / 'vdjdb.txt'
            valid = path.read_text()
            path.write_text(valid.replace('complex.id\tgene', 'gene\tcomplex.id'))
            with self.assertRaises(ValueError):
                check_core(root)
            path.write_text(valid + 'too\tfew\n')
            with self.assertRaises(ValueError):
                check_core(root)
            path.write_text('TCR_hash\tcdr3\tgene\na\tCASSF\tTRB\n')
            (root / 'vdjdb.meta.txt').write_text('meta\n')
            with self.assertRaises(ValueError):
                check_core(root)

    def test_historical_large_plain_streams_to_deterministic_gzip(self):
        import gzip
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            web = root / 'web'
            web.mkdir()
            core_fixture(web, 'a' * 64)
            table_path = web / 'vdjdb.txt'
            header, row = table_path.read_text().splitlines(keepends=True)
            content = header + row * (1_000_001 // len(row) + 1)
            table_path.write_text(content)
            artifacts = root / 'artifacts'
            artifacts.mkdir()
            with zipfile.ZipFile(artifacts / 'summer.zip', 'w') as bundle:
                for path in web.iterdir():
                    bundle.write(path, 'summer/' + path.name)
            first = install(artifacts, root / 'releases', 'summer', tables_only=True)
            second = install(artifacts, root / 'releases', 'summer-copy', tables_only=True)
            self.assertFalse((first / 'vdjdb.txt').exists())
            zipped = first / 'vdjdb.txt.gz'
            self.assertEqual(gzip.decompress(zipped.read_bytes()).decode(), content)
            self.assertEqual(zipped.read_bytes(), (second / zipped.name).read_bytes())

    def test_archive_rejections(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            archive = root / 'bad.zip'
            for names in [('../escape',), ('/absolute',), ('a', 'a')]:
                with warnings.catch_warnings():
                    warnings.simplefilter('ignore')
                    with zipfile.ZipFile(archive, 'w') as bundle:
                        for name in names:
                            bundle.writestr(name, 'x')
                with self.assertRaises(ValueError):
                    extract(archive, root / 'out')
            with zipfile.ZipFile(archive, 'w') as bundle:
                bundle.writestr('a', 'x')
            with self.assertRaises(ValueError):
                extract(archive, root / 'out', ['missing'])


if __name__ == '__main__':
    unittest.main()
