import copy
import json
import sys
import tempfile
import unittest
from unittest.mock import patch
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from build_data import build, calendar, cents, read_real, read_targets, read_directory, source_date, validate_cumulative


class SourceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = json.loads((ROOT / "config.json").read_text())
        cls.records = read_real(ROOT / "data/Va X Cuenta.csv", cls.config)
        cls.stores, cls.targets, cls.excluded = read_targets(ROOT / "data/VaxCuenta Objetivos 26.xlsx", 10)

    def test_source_dates_are_month_day(self):
        self.assertEqual(source_date("10/11/2026", "MDY"), date(2026, 10, 11))
        self.assertEqual(source_date("11/30/2026", "MDY"), date(2026, 11, 30))
        self.assertEqual(source_date("2026-10-01", "MDY"), date(2026, 10, 1))

    def test_bad_date_rejected(self):
        with self.assertRaises(ValueError):
            source_date("13/1/2026", "MDY")

    def test_cents_preserve_real_amounts(self):
        self.assertEqual(cents("$496"), 49600)
        self.assertEqual(cents("$1,610"), 161000)
        self.assertEqual(cents("$0.01"), 1)
        self.assertEqual(cents("-$10"), -1000)

    def test_invalid_amount_rejected(self):
        for value in ("NaN", "$1.001", ""):
            with self.subTest(value=value), self.assertRaises((ArithmeticError, ValueError)):
                cents(value)

    def test_duplicate_store_date_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "real.csv"
            path.write_text('"Tiendas","Dia","vaXcuenta$"\n"38101","10/1/2026","$10"\n"38101","10/1/2026","$10"', encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "repetidos"):
                read_real(path, self.config)

    def test_later_cutoff_comes_from_new_real_record(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "real.csv"
            path.write_text('Tiendas,Dia,vaXcuenta$\n38101,10/11/2026,$10\n38101,10/12/2026,$20', encoding="utf-8-sig")
            self.assertEqual(max(r[1] for r in read_real(path, self.config)), date(2026,10,12))

    def test_raw_reconciles_to_campaign_and_pre_campaign(self):
        campaign = [r for r in self.records if date(2026,10,1) <= r[1] <= date(2026,11,30)]
        pre = [r for r in self.records if r[1] < date(2026,10,1)]
        public = json.loads((ROOT / "site/data/dashboard.json").read_text())
        self.assertEqual(sum(r[2] for r in campaign), sum(r[2] for r in public["actuals"]))
        self.assertEqual(len(campaign), len(public["actuals"]))
        self.assertEqual(sum(r[2] for r in self.records), sum(r[2] for r in campaign) + sum(r[2] for r in pre))

    def test_source_cutoff_and_uniqueness(self):
        public = json.loads((ROOT / "site/data/dashboard.json").read_text())
        campaign = [r for r in self.records if date(2026,10,1)<=r[1]<=date(2026,11,30)]
        self.assertEqual(max(r[1] for r in campaign).isoformat(), public["cutoff"])
        self.assertEqual(len(self.records), len({(r[0],r[1]) for r in self.records}))

    def test_week40_anchor_and_final_day(self):
        weeks = calendar(self.config)
        self.assertEqual((weeks[0]["week"], weeks[0]["start"], weeks[0]["end"]), (40,"2026-09-28","2026-10-04"))
        self.assertEqual((weeks[-1]["week"], weeks[-1]["campaignStart"],weeks[-1]["campaignEnd"]), (49,"2026-11-30","2026-11-30"))

    def test_target_example_and_numeric_daily(self):
        source = [["TIENDA","NOMBRE","REGIÓN","ESTADO","SEM_ALSEA","7% - ORD_PROYECTADAS_SEMANAL","7% - ORD_PROYECTADAS_DIARIAS","DONACIÓN SEMANAL ESTIMADA"], [38101,"Angel","Centro Centro","CDMX",40,161,23,1610]]
        with patch("build_data.read_xlsx", return_value=source):
            _, rows, _ = read_targets(None,10)
        row = rows[0]
        self.assertEqual(row, ["38101",40,161000,161.0,23.0])
        self.assertIsInstance(row[4], float)

    def test_source_daily_base_is_preserved(self):
        source = [["TIENDA","NOMBRE","REGIÓN","ESTADO","SEM_ALSEA","7% - ORD_PROYECTADAS_SEMANAL","7% - ORD_PROYECTADAS_DIARIAS","DONACIÓN SEMANAL ESTIMADA"], [38179,"Universidad Anáhuac","Centro Poniente","Edo Méx",40,213,38.72727272727273,2130]]
        with patch("build_data.read_xlsx", return_value=source):
            _, rows, _ = read_targets(None,10)
        row=rows[0]
        self.assertAlmostEqual(row[4], 38.72727272727273)
        self.assertNotAlmostEqual(row[4], row[3] / 7)

    def test_weekly_target_reconciliation(self):
        self.assertTrue(all(abs(r[2]-r[3]*1000)<1 for r in self.targets))
        self.assertEqual(len(self.targets), len({(r[0],r[1]) for r in self.targets}))

    def test_unassigned_ceco_not_joined_to_revenue(self):
        self.assertTrue(all(not str(r["ceco"]).isdigit() for r in self.excluded))
        self.assertNotIn("pendiente", self.stores)

    def test_missing_week49_is_not_invented(self):
        public = json.loads((ROOT / "site/data/dashboard.json").read_text())
        missing = set(range(40,50)) - {r[1] for r in self.targets}
        self.assertEqual(set(public["sourceSummary"]["missingCampaignWeeks"]), missing)

    def test_directory_duplicates_do_not_multiply_targets(self):
        source = [["CC","CC Nombre","Región","Estatus","DM"],[43194,"Atana Lindavista ","Centro Norte","Abierta","Vanessa Carreño Rios"],[43194,"Atana Lindavista","Centro Norte","Abierta","Vanessa Carreño Rios"],[43256,"Zumpango","Bajío","Abierta","David Carrasco Hernandez"]]
        with patch("build_data.read_xlsx", return_value=source):
            directory, conflicts, duplicates = read_directory(None)
        self.assertEqual(len(duplicates), 1)
        self.assertEqual(conflicts, [])
        self.assertEqual(directory["43194"]["dm"], "Vanessa Carreño Rios")
        self.assertEqual(directory["43256"]["region"], "Bajío")

    def test_every_campaign_real_ceco_is_preserved(self):
        public = json.loads((ROOT / "site/data/dashboard.json").read_text())
        campaign = [r for r in self.records if date(2026,10,1)<=r[1]<=date(2026,11,30)]
        self.assertEqual({r[0] for r in campaign},{r[0] for r in public["actuals"]})

    def test_build_is_idempotent_and_public_data_is_sanitized(self):
        first, audit = build(ROOT)
        before = (ROOT / "site/data/dashboard.json").read_bytes()
        second, _ = build(ROOT)
        self.assertEqual(first["revision"], second["revision"])
        self.assertEqual(before, (ROOT / "site/data/dashboard.json").read_bytes())
        self.assertEqual(second["cutoff"], audit["cutoff"])
        self.assertEqual(len(second["sourceSummary"]["missingDm"]), len(audit["missingDm"]))
        campaign = [r for r in self.records if date(2026,10,1)<=r[1]<=date(2026,11,30)]
        self.assertEqual(audit["amountsNotMultipleOf10"],len([r for r in campaign if r[2]%1000]))
        for store in first["stores"]:
            self.assertFalse({"email","phone","Fecha de Apertura"}.intersection(store))

    def test_cumulative_replacement_cannot_drop_campaign_start_or_go_back(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            (root/"site/data").mkdir(parents=True)
            (root/"site/data/dashboard.json").write_text(json.dumps({"config":self.config,"cutoff":"2026-10-11","actuals":[["38101","2026-10-01",1000],["38101","2026-10-11",2000]]}))
            with self.assertRaisesRegex(ValueError,"retrocede"):
                validate_cumulative(root,self.config,[("38101",date(2026,10,1),1000)])
            with self.assertRaisesRegex(ValueError,"perdió"):
                validate_cumulative(root,self.config,[("38101",date(2026,11,1),1000)])
            validate_cumulative(root,self.config,[("38101",date(2026,10,1),1000),("38101",date(2026,10,12),3000)])

    def test_future_csv_build_advances_and_corrects_same_cut_without_stale_data(self):
        import shutil
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            (root/"data").mkdir()
            shutil.copy2(ROOT/"config.json",root/"config.json")
            for name in ("Directorio.xlsx","VaxCuenta Objetivos 26.xlsx"):
                shutil.copy2(ROOT/"data"/name,root/"data"/name)
            real=root/"data/Va X Cuenta.csv"
            real.write_text('Tiendas,Dia,vaXcuenta$\n38101,10/1/2026,$40\n38101,10/11/2026,$220',encoding="utf-8")
            first,_=build(root)
            real.write_text('Tiendas,Dia,vaXcuenta$\n38101,10/1/2026,$40\n38101,10/11/2026,$220\n38101,10/12/2026,$100',encoding="utf-8")
            second,_=build(root)
            self.assertEqual(second["cutoff"],"2026-10-12")
            self.assertEqual(sum(r[2] for r in second["actuals"]),36000)
            self.assertNotEqual(first["revision"],second["revision"])
            real.write_text(real.read_text().replace("$100","$110"),encoding="utf-8")
            corrected,_=build(root)
            self.assertEqual(corrected["cutoff"],second["cutoff"])
            self.assertNotEqual(corrected["revision"],second["revision"])
            self.assertEqual(sum(r[2] for r in corrected["actuals"]),37000)


if __name__ == "__main__":
    unittest.main()
