import json
import sys
import unittest
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from build_data import read_targets, read_directory, PENDING_DM

class RegionContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads((ROOT / 'data/dashboard.json').read_text())
        cls.sources, cls.targets, _ = read_targets(ROOT / 'data/VaxCuenta Objetivos 26.xlsx', 10)
        cls.directory, _, _ = read_directory(ROOT / 'data/Directorio.xlsx')
        cls.stores = {r['ceco']: r for r in cls.data['stores']}

    def test_every_store_follows_current_directory_identity(self):
        for key, store in self.stores.items():
            entry = self.directory.get(key, {})
            with self.subTest(ceco=key):
                self.assertEqual(store['region'], entry.get('region') or 'Por asignar')
                self.assertEqual(store['dm'], entry.get('dm') or PENDING_DM)
                if entry.get('name'):
                    self.assertEqual(store['name'], entry['name'])
                if key in self.sources:
                    self.assertEqual(store['targetRegion'], self.sources[key]['targetRegion'])
                self.assertEqual(store['directoryRegion'], entry.get('region'))

    def test_each_week_and_region_match_directory_store_set_and_original_objective(self):
        expected = defaultdict(dict); actual = defaultdict(dict)
        for row in self.targets:
            region = self.directory.get(row[0], {}).get('region') or 'Por asignar'
            expected[(row[1], region)][row[0]] = row[2]
        for row in self.data['targets']:
            actual[(row[1], self.stores[row[0]]['region'])][row[0]] = row[2]
        self.assertEqual(dict(actual), dict(expected))

    def test_reclassification_never_changes_national_real_or_target_totals(self):
        audit = json.loads((ROOT / 'docs/audit.json').read_text())
        self.assertEqual(sum(row[2] for row in self.data['actuals']), audit['campaignCents'])
        self.assertEqual(sum(row[2] for row in self.data['targets']), sum(row[2] for row in self.targets))

    def test_missing_directory_stores_remain_visible_without_stale_region(self):
        missing = set(self.stores) - set(self.directory)
        self.assertEqual(missing, set(self.data['sourceSummary']['missingDirectory']))
        for key in missing:
            self.assertEqual(self.stores[key]['region'], 'Por asignar')
            self.assertEqual(self.stores[key]['assignmentSource'], 'Pendiente en Directorio.xlsx')

    def test_atana_is_in_current_centro_norte_with_unchanged_goals(self):
        self.assertEqual(self.stores['43194']['region'], 'Centro Norte')
        self.assertEqual(self.stores['43194']['targetRegion'], self.sources['43194']['targetRegion'])
        original = [row for row in self.targets if row[0] == '43194']
        self.assertEqual(original, [row for row in self.data['targets'] if row[0] == '43194'])

if __name__ == '__main__': unittest.main()
