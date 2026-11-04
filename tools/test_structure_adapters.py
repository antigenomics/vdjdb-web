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

    def test_zero_confidence_is_an_observation(self):
        import numpy as np
        module = load('build_structures_metadata')
        values = np.array([module._to_float(v) for v in ['0', '', '1']], dtype=float)
        self.assertEqual(values[0], 0)
        self.assertTrue(np.isnan(values[1]))
        self.assertEqual(module._pct_rank(values[~np.isnan(values)]).tolist(), [50., 100.])


if __name__ == '__main__':
    unittest.main()
