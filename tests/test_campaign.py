"""Independent financial regression: objective cohort is the only evaluation universe."""
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from build_data import build, read_targets

class CampaignTests(unittest.TestCase):
    def test_real_without_goal_and_zero_goal_are_excluded_and_reconciled(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);(root/'data').mkdir()
            for path in ['config.json','data/Directorio.xlsx','data/VaxCuenta Objetivos 26.xlsx']:
                shutil.copy2(ROOT/path,root/path)
            (root/'data/Va X Cuenta.csv').write_text('Tiendas,Dia,vaXcuenta$\n38101,10/1/2026,$100\n38101,10/12/2026,$200\n49998,10/13/2026,$900\n49999,10/12/2026,$500\n38101,9/30/2026,$10')
            stores={'38101':{'ceco':'38101','name':'Angel','targetRegion':'Centro Centro','state':'CDMX'},'49999':{'ceco':'49999','name':'Cero','targetRegion':'Otra','state':''}}
            with patch('build_data.read_targets',return_value=(stores,[['38101',40,100000,100,100/7],['38101',48,200000,200,200/7],['49999',40,0,0,0]],[])):
                payload,audit=build(root)
            self.assertEqual([s['ceco'] for s in payload['stores']],['38101'])
            self.assertEqual(payload['cutoff'],'2026-10-12')
            self.assertEqual(sum(row[2] for row in payload['actuals']),30000)
            self.assertEqual(audit['objectiveCents'],300000)
            self.assertEqual(audit['campaignCompletion'],0.1)
            self.assertEqual(audit['excludedNoObjectiveCents'],140000)
            self.assertEqual(audit['excludedNoObjectiveRows'],2)
            self.assertEqual(audit['zeroObjectiveStores'],['49999'])
            self.assertEqual(audit['rawCents'],audit['campaignCents']+audit['excludedCents']+audit['excludedNoObjectiveCents'])
            self.assertFalse(audit['campaignGoalComplete'])
            self.assertIn(49,audit['campaignMissingTargets']['38101'])

    def test_published_campaign_totals_match_original_positive_objectives(self):
        payload=json.loads((ROOT/'data/dashboard.json').read_text())
        _,targets,_=read_targets(ROOT/'data/VaxCuenta Objetivos 26.xlsx',10)
        sums={}
        for key,_,amount,*_ in targets:sums[key]=sums.get(key,0)+amount
        eligible={key for key,amount in sums.items() if amount>0}
        self.assertEqual({row['ceco'] for row in payload['stores']},eligible)
        self.assertEqual(sum(row[2] for row in payload['targets']),sum(sums[key] for key in eligible))
        self.assertTrue(all(row[0] in eligible for row in payload['actuals']))

if __name__=='__main__':unittest.main()
