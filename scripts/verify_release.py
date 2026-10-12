"""Check the deployable folder, relative assets, manifest and data independently."""
import json
import re
import struct
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "dist"


class Assets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []
        self.ids = []
    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if "id" in values:
            self.ids.append(values["id"])
        if tag in ("script", "img", "image"):
            self.refs.append(values.get("src") or values.get("href"))
        if tag == "link":
            self.refs.append(values.get("href"))


def verify():
    html = (SITE / "index.html").read_text(encoding="utf-8")
    assets = Assets()
    assets.feed(html)
    if len(assets.ids) != len(set(assets.ids)):
        raise ValueError("IDs HTML repetidos.")
    for reference in filter(None, assets.refs):
        if reference.startswith("/") or urlsplit(reference).scheme:
            raise ValueError(f"Recurso no relativo: {reference}")
        if not (SITE / reference).is_file():
            raise ValueError(f"Recurso ausente: {reference}")
    manifest = json.loads((SITE / "manifest.webmanifest").read_text())
    for key in ("id", "scope", "start_url"):
        if manifest[key] != "./":
            raise ValueError(f"PWA {key} no usa la ruta del repositorio.")
    for icon in manifest["icons"]:
        filename = SITE / icon["src"]
        content = filename.read_bytes()
        if content[:8] != b"\x89PNG\r\n\x1a\n":
            raise ValueError("Icono PNG inválido.")
        width, height = struct.unpack(">II", content[16:24])
        if icon["sizes"] != f"{width}x{height}":
            raise ValueError("Tamaño de icono incorrecto.")
    for module in SITE.glob("*.mjs"):
        code = module.read_text()
        for imported in re.findall(r"from\s+['\"](\.[^'\"]+)['\"]", code):
            if not (module.parent / imported).is_file():
                raise ValueError(f"Módulo ausente: {imported}")
    sw = (SITE / "sw.js").read_text()
    if "__BUILD_REVISION__" in sw:
        raise ValueError("El Service Worker conserva una versión sin preparar.")
    for reference in re.findall(r"'([^']+)'", sw[sw.index("const SHELL"):sw.index("self.addEventListener")]):
        if reference.startswith("./") and reference != "./" and not (SITE / reference).is_file():
            raise ValueError(f"Recurso offline ausente: {reference}")
    for file in SITE.rglob("*"):
        if file.is_file() and file.suffix.lower() in (".xlsx", ".csv", ".py", ".zip"):
            raise ValueError(f"El sitio contiene un archivo de origen: {file.name}")
    data = json.loads((SITE / "data/dashboard.json").read_text())
    if len(data["targets"]) != len({(r[0],r[1]) for r in data["targets"]}):
        raise ValueError("Metas duplicadas.")
    if len(data["actuals"]) != len({(r[0],r[1]) for r in data["actuals"]}):
        raise ValueError("Real duplicado.")
    audit = json.loads((ROOT / "docs/audit.json").read_text())
    if sum(r[2] for r in data["actuals"]) != audit["campaignCents"]:
        raise ValueError("Real público no concilia con el origen.")
    if data["cutoff"] != max(row[1] for row in data["actuals"]) or data["cutoff"] != audit["cutoff"]:
        raise ValueError("El corte no proviene del último registro real.")
    count = sum(file.is_file() for file in SITE.rglob("*"))
    size = sum(file.stat().st_size for file in SITE.rglob("*") if file.is_file())
    print(f"Publicación verificada: {count} archivos, {size:,} bytes; corte {data['cutoff']}.")
    return {"files": count, "bytes": size, "cutoff": data["cutoff"]}


if __name__ == "__main__":
    verify()
