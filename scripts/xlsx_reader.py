"""Read cached worksheet values with Python's standard library; no pip required."""
import posixpath
import re
import zipfile
import xml.etree.ElementTree as ET

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
      "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}


def read_xlsx(path, sheet_name=None):
    with zipfile.ZipFile(path) as book:
        strings = []
        if "xl/sharedStrings.xml" in book.namelist():
            tree = ET.fromstring(book.read("xl/sharedStrings.xml"))
            strings = ["".join(node.itertext()) for node in tree.findall("m:si", NS)]
        workbook = ET.fromstring(book.read("xl/workbook.xml"))
        sheets = workbook.findall("m:sheets/m:sheet", NS)
        sheet = next((s for s in sheets if s.attrib["name"] == sheet_name), sheets[0])
        relation_id = sheet.attrib[f"{{{NS['r']}}}id"]
        relations = ET.fromstring(book.read("xl/_rels/workbook.xml.rels"))
        target = next(r.attrib["Target"] for r in relations if r.attrib["Id"] == relation_id)
        filename = target.lstrip("/") if target.startswith("/") else posixpath.normpath("xl/" + target)
        rows = []
        for row in ET.fromstring(book.read(filename)).findall("m:sheetData/m:row", NS):
            values = {}
            for cell in row.findall("m:c", NS):
                letters = re.match(r"[A-Z]+", cell.attrib["r"])[0]
                col = 0
                for char in letters:
                    col = col * 26 + ord(char) - 64
                value = cell.find("m:v", NS)
                kind = cell.attrib.get("t")
                if kind == "inlineStr":
                    value = "".join(cell.find("m:is", NS).itertext())
                elif value is None or value.text is None:
                    value = None
                elif kind == "s":
                    value = strings[int(value.text)]
                elif kind in ("str", "e"):
                    value = value.text
                else:
                    number = float(value.text)
                    value = int(number) if number.is_integer() else number
                values[col - 1] = value
            if values:
                rows.append([values.get(i) for i in range(max(values) + 1)])
        return rows
