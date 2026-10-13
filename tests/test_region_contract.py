import json
import sys
import unittest
from collections import defaultdict
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from build_data import read_targets,read_directory

class RegionContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data=json.loads((ROOT/'data/dashboard.json').read_text())
        cls.sources,cls.targets,_=read_targets(ROOT/'data/VaxCuenta Objetivos 26.xlsx',cls.data['config']['campaign']['donationPesos'])
        cls.directory,_,_=read_directory(ROOT/'data/Directorio.xlsx')
        cls.stores={r['ceco']:r for r in cls.data['stores']}

    def test_every_target_store_retains_the_original_financial_region(self):
        for key,source in self.sources.items():
            with self.subTest(ceco=key):
                self.assertEqual(self.stores[key]['region'],source['targetRegion'])
                self.assertEqual(self.stores[key]['directoryRegion'],self.directory.get(key,{}).get('region'))

    def test_each_week_and_region_matches_original_store_set_and_objective(self):
        expected=defaultdict(dict);actual=defaultdict(dict)
        for row in self.targets:
            expected[(row[1],self.sources[row[0]]['targetRegion'])][row[0]]=row[2]
        for row in self.data['targets']:
            actual[(row[1],self.stores[row[0]]['region'])][row[0]]=row[2]
        self.assertEqual(dict(actual),dict(expected))

    def test_reclassification_never_changes_national_real_or_target_totals(self):
        audit=json.loads((ROOT/'docs/audit.json').read_text())
        self.assertEqual(sum(row[2] for row in self.data['actuals']),audit['campaignCents'])
        self.assertEqual(sum(row[2] for row in self.data['targets']),sum(row[2] for row in self.targets))

if __name__=='__main__':unittest.main()
