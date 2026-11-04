"""Focused standalone checks; run with the TCRen environment's Python."""
import importlib.util
from pathlib import Path
import tempfile
import unittest


def load(name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(name + '.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class Adapters(unittest.TestCase):
    def test_metadata_zero_contact_projection_preserves_prediction_scores(self):
        import csv
        from unittest.mock import patch
        module = load('build_structures_metadata')
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source, target = root / 'source.tsv', root / 'result.tsv'
            with source.open('w') as stream:
                writer = csv.writer(stream, delimiter='\t')
                writer.writerow(['tcr_pmhc_hash', 'is_native', 'num_contacts', 'tcr_pmhc_iptm',
                                 'ranking_confidence', 'scanning_angle', 'pitch_angle'])
                for key, native in [('a' * 64, 'true'), ('b' * 64, 'false')]:
                    writer.writerow([key, native, 17, .8, .9, '', ''])
                    (root / (key + '.html')).write_text('<svg xmlns="http://www.w3.org/2000/svg">'
                        '<g class="residue" data-chain="P" data-aa-index="0" data-complex-chain="peptide"/></svg>')
            with patch('sys.argv', ['metadata', str(source), '-o', str(target), '--structure-dir', str(root)]):
                self.assertEqual(module.main(), 0)
            with target.open() as stream:
                rows = list(csv.DictReader(stream, delimiter='\t'))
            self.assertEqual([r['num_contacts'] for r in rows], ['0', '0'])
            self.assertEqual(float(rows[0]['iptm']), 1.0)
            self.assertEqual(float(rows[1]['iptm']), .8)
            self.assertEqual(float(rows[1]['confidence']), .9)

    def test_native_counts_exclude_receptor_internal_edges(self):
        module = load('build_structures_metadata')
        key = 'a' * 64
        svg = '''<svg xmlns="http://www.w3.org/2000/svg">
          <g class="residue" data-chain="A" data-aa-index="7" data-complex-chain="tra" data-region="cdr3"/>
          <g class="residue" data-chain="B" data-aa-index="8" data-complex-chain="trb" data-region="cdr3"/>
          <g class="residue" data-chain="P" data-aa-index="0" data-complex-chain="peptide"/>
          <g class="contacts-dashed"><line data-chain-1="A" data-res-1="7" data-chain-2="B" data-res-2="8"/></g>
          </svg>'''
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            path = root / (key + '.html')
            path.write_text(svg)
            self.assertEqual(module.map_contacts(root, key), 0)
            path.write_text(svg.replace('</svg>', '<g class="contacts-dashed"><line data-chain-1="A" data-res-1="7" data-chain-2="P" data-res-2="0"/></g></svg>'))
            self.assertEqual(module.map_contacts(root, key), 1)
            self.assertIsNone(module.map_contacts(root, 'b' * 64))
            with self.assertRaises(ValueError):
                module.map_contacts(root, '../bad')

    def test_download_contacts_use_the_rendered_tcren_vertices(self):
        import csv
        import zipfile
        import polars as pl
        from types import SimpleNamespace
        module = load('build_structure_maps')
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / 'source.pdb'
            source.write_text('END\n')
            structure = SimpleNamespace(pdb_id='a' * 64, chains=[])
            markup = pl.DataFrame({'structure_chain': ['A', 'P'], 'aa_index': [7, 0],
                                  'complex_chain': ['tra', 'peptide'], 'aa': ['R', 'N']})
            contacts = pl.DataFrame({'structure_chain_1': ['A', 'B'], 'aa_index_1': [7, 8],
                                     'structure_chain_2': ['P', 'P'], 'aa_index_2': [0, 0]})
            module.write_downloads(structure, root, source, contacts, markup)
            with (root / (structure.pdb_id + '_contacts_aa.txt')).open() as stream:
                rows = list(csv.DictReader(stream, delimiter='\t'))
            self.assertEqual(len(rows), 1)
            self.assertEqual(rows[0], dict(chain_from='CDR3_alpha', aa_from='R', res_num_from='8',
                                          aa_to='N', res_num_to='1', chain_to='peptide'))
            with zipfile.ZipFile(root / (structure.pdb_id + '_all.zip')) as bundle:
                self.assertIsNone(bundle.testzip())
                self.assertEqual(len(bundle.namelist()), 3)

    def test_exact_raw_peptide_recovery_and_shared_locus_role(self):
        from tcren.structure.model import Chain, Residue, Structure
        module = load('build_structure_maps')
        def residues(sequence):
            return [Residue(i, i + 1, '', aa, 'UNK', ()) for i, aa in enumerate(sequence)]
        key = 'b' * 64
        alpha = Chain('A', residues('XXCAVRFXX'), chain_type='TRD')
        structure = Structure(key, [alpha])
        with tempfile.TemporaryDirectory() as directory:
            metadata = Path(directory) / 'metadata.tsv'
            metadata.write_text('tcr_pmhc_hash\tcdr3.alpha\tcdr3.beta\tantigen.epitope\n' +
                                key + '\tCAVRF\t\tFEAQKAKANKAVD\n')
            module.validate_identities([structure], metadata, repair_roles=True,
                raw_chains={key: [('B', residues('FEAQKAKANKAVDMHCDOMAIN'))]})
            self.assertEqual(alpha.chain_type, 'TRA')
            self.assertEqual(alpha.regions[-1].sequence, 'AVR')
            self.assertEqual(structure.by_type('PEPTIDE')[0].sequence(), 'FEAQKAKANKAVD')

    def test_maps_reject_a_hash_with_different_receptor_sequences(self):
        from types import SimpleNamespace
        module = load('build_structure_maps')
        key = 'a' * 64
        chains = {'TRA': 'XXCAVRFXX', 'TRB': 'XXCASSFXX', 'PEPTIDE': 'NLVPMVATV'}
        structure = SimpleNamespace(pdb_id=key, by_type=lambda role:
            [SimpleNamespace(sequence=lambda: chains[role])])
        with tempfile.TemporaryDirectory() as directory:
            metadata = Path(directory) / 'metadata.tsv'
            metadata.write_text('tcr_pmhc_hash\tcdr3.alpha\tcdr3.beta\tantigen.epitope\n' +
                                key + '\tCAVRF\tCASSF\tNLVPMVATV\n')
            module.validate_identities([structure], metadata)
            chains['TRA'] = 'OTHER'
            with self.assertRaisesRegex(ValueError, 'TRA sequence'):
                module.validate_identities([structure], metadata)

    def test_manifest_rejects_unsafe_and_duplicate_hashes(self):
        module = load('build_structure_maps')
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'input.pdb').write_text('END\n')
            manifest = root / 'manifest.tsv'
            row = 'input.pdb\t' + 'a' * 64 + '\n'
            manifest.write_text('path\thash\n' + row)
            self.assertEqual(module.read_manifest(manifest)[0]['path'], root / 'input.pdb')
            for rows in [row + row, 'input.pdb\t../bad\n']:
                manifest.write_text('path\thash\n' + rows)
                with self.assertRaises(ValueError):
                    module.read_manifest(manifest)

    def test_asset_preparation_uses_fresh_local_inputs_and_served_download_names(self):
        import gzip
        import io
        import tarfile
        module = load('prepare_structure_assets')
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            web, dataset, out = root / 'web', root / 'dataset', root / 'structure'
            web.mkdir()
            (dataset / 'data').mkdir(parents=True)
            (dataset / 'metadata/current').mkdir(parents=True)
            key = 'a' * 64
            with gzip.open(dataset / 'metadata/current/vdjdb_structures_metadata_current.tsv.gz', 'wt') as stream:
                stream.write('tcr_pmhc_hash\tis_native\tmeta.structure.id\n' + key + '\ttrue\t1abc\n')
            (web / 'vdjdb.txt').write_text('TCR_hash\n' + key + '\n')
            jobs = [('pdb_files.tgz', '../../' + key + '.pdb', b'MODEL'),
                    ('pdb_files_native.tgz', 'aligned_1abc.pdb', b'NATIVE')]
            for archive, name, data in jobs:
                with tarfile.open(dataset / 'data' / archive, 'w:gz') as target:
                    item = tarfile.TarInfo(name)
                    item.size = len(data)
                    target.addfile(item, io.BytesIO(data))
                    if archive == 'pdb_files_native.tgz':
                        target.addfile(item, io.BytesIO(data))
            module.prepare(web, dataset, out)
            self.assertEqual((out / ('aligned_aligned_' + key + '.pdb')).read_bytes(), b'NATIVE')
            self.assertFalse((out / (key + '_contacts_aa.txt')).exists())
            maps = load('build_structure_maps')
            self.assertEqual(maps.read_manifest(out / 'map-inputs.tsv.gz')[0]['hash'], key)
            with self.assertRaises(ValueError):
                module.prepare(web, dataset, out)

    def test_metadata_writer_compresses_deterministically(self):
        module = load('build_structures_metadata')
        import gzip
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'metadata.tsv'
            with module._output(path) as stream:
                stream.write('x' * 1_000_001)
            zipped = Path(str(path) + '.gz')
            first = zipped.read_bytes()
            self.assertFalse(path.exists())
            self.assertEqual(len(gzip.decompress(first)), 1_000_001)
            with module._output(path) as stream:
                stream.write('x' * 1_000_001)
            self.assertEqual(zipped.read_bytes(), first)

    def test_native_metadata_is_preferred_without_predicted_confidence(self):
        import csv
        from unittest.mock import patch
        module = load('build_structures_metadata')
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source, target = root / 'source.tsv', root / 'result.tsv'
            columns = ['tcr_pmhc_hash', 'is_native', 'num_contacts', 'tcr_pmhc_iptm',
                       'ranking_confidence', 'scanning_angle', 'pitch_angle']
            with source.open('w') as stream:
                writer = csv.writer(stream, delimiter='\t')
                writer.writerow(columns)
                writer.writerow(['a' * 64, 'false', 1, 0, 0, '', ''])
                writer.writerow(['a' * 64, 'true', 2, .8, .9, '', ''])
            with patch('sys.argv', ['metadata', str(source), '-o', str(target)]):
                self.assertEqual(module.main(), 0)
            with target.open() as stream:
                rows = list(csv.DictReader(stream, delimiter='\t'))
            self.assertEqual(len(rows), 1)
            self.assertEqual(rows[0]['is_native'], 'true')
            self.assertEqual(rows[0]['num_contacts'], '2')
            self.assertEqual(float(rows[0]['iptm']), 1.0)
            self.assertEqual(rows[0]['confidence'], '')

    def test_zero_confidence_is_an_observation(self):
        import numpy as np
        module = load('build_structures_metadata')
        values = np.array([module._to_float(v) for v in ['0', '', '1']], dtype=float)
        self.assertEqual(values[0], 0)
        self.assertTrue(np.isnan(values[1]))
        self.assertEqual(module._pct_rank(values[~np.isnan(values)]).tolist(), [50., 100.])


if __name__ == '__main__':
    unittest.main()
