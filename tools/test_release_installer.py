#!/usr/bin/env python3
"""Small offline checks for prepared identity, archive boundaries and immutable installs."""
import json
import tempfile
import unittest
import warnings
import zipfile
from pathlib import Path
from install_release import extract, install
from structure_asset_identity import bindings, digest, prepare_record, seal, validate


class ReleaseChecks(unittest.TestCase):
    def test_complete_install_and_corruption(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            web = root / 'web'
            web.mkdir()
            source = root / 'source.tsv'
            source.write_text('original metadata\n')
            key = 'a' * 64
            (web / 'vdjdb.txt').write_text('TCR_hash\tcdr3\tgene\n' + key + '\tCASSF\tTRB\n')
            (web / 'vdjdb.meta.txt').write_text('meta\n')
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
