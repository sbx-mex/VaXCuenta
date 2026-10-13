"""Read the app's real XLSX with Python stdlib and compare original CSV/Excel."""
import csv
import io
import json
import subprocess
import sys
import tempfile
import unittest
import zipfile
import xml.etree.ElementTree as ET
from collections import Counter
from datetime import date, datetime, timedelta
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from xlsx_reader import read_xlsx, NS
from build_data import read_directory


class NativeExcelTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.folder = tempfile.TemporaryDirectory()
        cls.addClassCleanup(cls.folder.cleanup)
        cls.output = Path(cls.folder.name) / 'consulta.xlsx'
        code = '\n'.join([
            "import {readFile,writeFile} from 'node:fs/promises';",
            f"import {{prepare,selectStores,aggregate,groupRows}} from {json.dumps((ROOT/'model.mjs').as_uri())};",
            f"import {{buildXLSX}} from {json.dumps((ROOT/'xlsx-export.mjs').as_uri())};",
            f"const data=JSON.parse(await readFile({json.dumps(str(ROOT/'data/dashboard.json'))},'utf8'));",
            "const state={region:'Centro Norte',period:'40',view:'store',sort:'name'};",
            "const stores=selectStores(prepare(data),state),rows=groupRows(stores,'store','name'),total=aggregate(stores);",
            f"await writeFile({json.dumps(str(cls.output))},buildXLSX(rows,total,data,state,{{title:'Centro Norte'}},stores));",
        ])
        subprocess.run(['node', '--input-type=module', '-e', code], check=True, capture_output=True, text=True, timeout=30)
        cls.directory, _, _ = read_directory(ROOT / 'data/Directorio.xlsx')
        cls.goals = {}
        for row in read_xlsx(ROOT / 'data/VaxCuenta Objetivos 26.xlsx')[1:]:
            if len(row)>7 and row[4]==40 and cls.directory.get(str(int(row[0])) if isinstance(row[0],(int,float)) else str(row[0]),{}).get('region')=='Centro Norte':
                cls.goals[str(int(row[0]))] = row
        cls.actuals = []
        raw=(ROOT / 'data/Va X Cuenta.csv').read_bytes()
        if raw.startswith((b'\xff\xfe',b'\xfe\xff')): text=raw.decode('utf-16')
        else:
            try: text=raw.decode('utf-8-sig')
            except UnicodeDecodeError: text=raw.decode('cp1252')
        lines=text.splitlines()
        header=next(i for i,line in enumerate(lines) if {'Tiendas','Dia','vaXcuenta$'}.issubset(set(next(csv.reader([line])))))
        with io.StringIO('\n'.join(lines[header:])) as stream:
            for row in csv.DictReader(stream):
                key=row['Tiendas'].strip()
                value=row['Dia'].strip()
                day=date.fromisoformat(value) if '-' in value else datetime.strptime(value,'%m/%d/%Y').date()
                if key in cls.goals and date(2026,10,1)<=day<=date(2026,10,4):
                    amount=Decimal(row['vaXcuenta$'].replace('$','').replace(',','').strip())
                    cls.actuals.append((key,day,int(amount*100)))
        with zipfile.ZipFile(cls.output) as book:
            workbook=ET.fromstring(book.read('xl/workbook.xml'))
            cls.names=[sheet.attrib['name'] for sheet in workbook.findall('m:sheets/m:sheet',NS)]
            cls.sheets={name:ET.fromstring(book.read(f'xl/worksheets/sheet{i+1}.xml')) for i,name in enumerate(cls.names)}

    @classmethod
    def cells(cls, name):
        output={}
        for cell in cls.sheets[name].findall('m:sheetData/m:row/m:c',NS):
            kind=cell.attrib.get('t')
            if kind=='inlineStr': value=''.join(cell.find('m:is',NS).itertext())
            elif kind=='str': value=cell.findtext('m:v',namespaces=NS)
            else:
                value=cell.findtext('m:v',namespaces=NS)
                value=Decimal(value) if value is not None else None
            output[cell.attrib['r']]=value
        return output

    def test_summary_money_matches_original_sources_and_weighted_rate(self):
        cells=self.cells('Resumen')
        real=sum(row[2] for row in self.actuals)
        target=sum(int(Decimal(str(row[7]))*100) for row in self.goals.values())
        self.assertEqual(cells['A8']*100,real)
        self.assertEqual(cells['C8']*100,target)
        self.assertAlmostEqual(float(cells['E8']),real/target,places=12)
        self.assertEqual(cells['C9']*100,target-real)

    def test_campaign_summary_matches_all_source_weeks_and_all_real_dates(self):
        from build_data import read_targets, read_real
        _, goals, _ = read_targets(ROOT / 'data/VaxCuenta Objetivos 26.xlsx', 10)
        totals = {}
        for key, _, amount, *_ in goals:
            totals[key] = totals.get(key, 0) + amount
        eligible = {key for key, amount in totals.items() if amount > 0 and self.directory.get(key, {}).get('region') == 'Centro Norte'}
        config = json.loads((ROOT / 'config.json').read_text())
        public = json.loads((ROOT / 'data/dashboard.json').read_text())
        records = [row for row in read_real(ROOT / 'data/Va X Cuenta.csv', config)
                   if row[0] in eligible and config['campaign']['start'] <= row[1].isoformat() <= public['cutoff']]
        target = sum(totals[key] for key in eligible)
        real = sum(row[2] for row in records)
        cells = self.cells('Campaña')
        self.assertEqual(cells['A8'] * 100, target)
        self.assertEqual(cells['C8'] * 100, real)
        self.assertAlmostEqual(float(cells['E8']), real / target, places=12)
        self.assertEqual(cells['C9'] * 100, max(0, target - real))
        full = self.cells('Tiendas')
        ids = {str(full[f'A{i}']) for i in range(6, 6 + len(eligible))}
        self.assertEqual(ids, eligible)
        self.assertEqual(sum(full[f'P{i}'] for i in range(6, 6 + len(eligible))) * 100, target)
        self.assertEqual(sum(full[f'Q{i}'] for i in range(6, 6 + len(eligible))) * 100, real)

    def test_all_store_ids_match_current_directory_without_duplicates(self):
        cells=self.cells('Tiendas')
        keys=[str(cells[f'A{i}']) for i in range(6,6+len(self.goals))]
        self.assertEqual(len(keys),len(set(keys)))
        self.assertEqual(set(keys),set(self.goals))
        for line in range(6,6+len(self.goals)):
            key=str(cells[f'A{line}']);entry=self.directory[key]
            self.assertEqual(cells[f'B{line}'],entry['name'])
            self.assertEqual(cells[f'C{line}'],entry['region'])
            self.assertEqual(cells[f'D{line}'],entry['dm'])
            self.assertEqual(cells[f'M{line}'],self.goals[key][2])
            self.assertEqual(cells[f'N{line}'],'Directorio.xlsx')
        self.assertEqual(sum(cells[f'F{i}'] for i in range(6,6+len(self.goals))),sum(row[2] for row in self.actuals)/Decimal(100))
        self.assertEqual(sum(cells[f'G{i}'] for i in range(6,6+len(self.goals))),sum(Decimal(str(row[7])) for row in self.goals.values()))

    def test_exported_actual_rows_equal_every_original_csv_record(self):
        cells=self.cells('Real diario')
        actual=[]
        for i in range(6,6+len(self.actuals)):
            day=date(1899,12,30)+timedelta(days=int(cells[f'B{i}']))
            actual.append((str(cells[f'A{i}']),day,int(cells[f'D{i}']*100)))
        self.assertEqual(len(actual),len(self.actuals))
        self.assertEqual(Counter(actual),Counter(self.actuals))

    def test_week40_full_target_and_daily_numbers_match_goal_workbook(self):
        cells=self.cells('Metas')
        for i in range(6,6+len(self.goals)):
            original=self.goals[str(cells[f'A{i}'])]
            self.assertEqual(cells[f'D{i}'],40)
            self.assertEqual(cells[f'F{i}'],7)
            self.assertEqual(cells[f'E{i}'],Decimal(str(original[7])))
            self.assertEqual(cells[f'G{i}'],Decimal(str(original[7])))
            self.assertAlmostEqual(float(cells[f'H{i}']),float(original[6]),places=10)
            self.assertAlmostEqual(float(cells[f'I{i}']),float(original[5]),places=10)

    def test_validation_has_eight_zero_differences_and_explicit_results(self):
        self.assertEqual(self.names,['Campaña','Resumen','Validación','Tiendas','Real diario','Metas','Real campaña','Metas campaña'])
        cells=self.cells('Validación')
        for i in range(9,21):
            self.assertEqual(cells[f'D{i}'],0)
            self.assertEqual(cells[f'E{i}'],'OK')
            self.assertIn('IF(',self.sheets['Validación'].find(f'.//m:c[@r="E{i}"]/m:f',NS).text)
        self.assertEqual(cells['B15'],len(set(self.goals)-{row[0] for row in self.actuals}))
        self.assertEqual(cells['B16'],0)

    def test_store_status_and_numeric_daily_projection_follow_original_records(self):
        cells=self.cells('Tiendas')
        counts=Counter(row[0] for row in self.actuals)
        for line in range(6,6+len(self.goals)):
            key=str(cells[f'A{line}'])
            self.assertEqual(cells[f'K{line}'],counts[key])
            self.assertEqual(cells[f'L{line}'],'Con registro' if counts[key] else 'Sin registro')
            self.assertIsInstance(cells[f'J{line}'],Decimal)
            self.assertAlmostEqual(float(cells[f'J{line}']),float(self.goals[key][6]),places=10)
            if not counts[key]:
                self.assertEqual(cells[f'F{line}'],0)
                self.assertEqual(cells[f'G{line}'],Decimal(str(self.goals[key][7])))


if __name__=='__main__':unittest.main()
