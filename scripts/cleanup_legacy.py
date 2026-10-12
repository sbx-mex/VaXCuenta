"""Remove verified old copies; protect inputs, newer edits and unrelated files."""
import argparse
import hashlib
import json
import shutil
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SOURCES=("data/Va X Cuenta.csv","data/VaxCuenta Objetivos 26.xlsx","data/Directorio.xlsx","config.json")
REQUIRED=("index.html","app.mjs","model.mjs","export.mjs","pwa.mjs","styles.css","manifest.webmanifest","scripts/sw.template.js","assets/icon.svg","data/dashboard.json")

def git_blob(path):
    data=path.read_bytes()
    return hashlib.sha1(f"blob {len(data)}\0".encode()+data).hexdigest()

def source_hashes(root):
    return {name:hashlib.sha256((root/name).read_bytes()).hexdigest() for name in SOURCES}

def validate_canonical(root):
    for name in (*REQUIRED,*SOURCES):
        file=root/name
        if not file.is_file() or file.is_symlink():
            raise ValueError(f"Falta archivo correcto en raíz: {name}")
    html=(root/"index.html").read_text(encoding="utf-8")
    if 'id="dashboard"' not in html or './app.mjs' not in html:
        raise ValueError("index.html no es la entrada del tablero VaXCuenta.")
    data=json.loads((root/"data/dashboard.json").read_text())
    audit=json.loads((root/"docs/audit.json").read_text())
    if data.get("schemaVersion")!=1 or not data.get("actuals"):
        raise ValueError("La raíz no tiene datos preparados de VaXCuenta.")
    if data["cutoff"]!=max(row[1] for row in data["actuals"]) or sum(row[2] for row in data["actuals"])!=audit["campaignCents"]:
        raise ValueError("Los datos no concilian; no se eliminarán las copias anteriores.")
    hashes=source_hashes(root)
    for name,value in hashes.items():
        if audit["sourceHashes"].get(Path(name).name)!=value:
            raise ValueError(f"La auditoría no corresponde al origen vigente: {name}")
    return hashes

def plan(root=ROOT, manifest=None):
    manifest=manifest or json.loads((root/"scripts/legacy-files.json").read_text())
    validate_canonical(root)
    if set(manifest["directories"])!={"site","dist"}:
        raise ValueError("La limpieza sólo admite site/ y dist/ anteriores.")
    expected={row["path"]:row["gitBlobSha"] for row in manifest["files"]}
    candidates=[];errors=[];directories=[]
    for name in manifest["directories"]:
        directory=root/name
        if not directory.exists() and not directory.is_symlink():
            continue
        if directory.is_symlink() or not directory.is_dir():
            raise ValueError(f"Ruta inesperada: {name}")
        directories.append(name)
        for file in sorted(directory.rglob("*")):
            relative=file.relative_to(root).as_posix()
            if file.is_symlink():
                errors.append(f"Enlace no permitido: {relative}")
            elif file.is_file():
                if relative not in expected:
                    errors.append(f"Archivo no identificado: {relative}")
                elif git_blob(file)!=expected[relative]:
                    errors.append(f"Archivo modificado; requiere revisar: {relative}")
                else:
                    candidates.append(relative)
    if errors:
        raise ValueError("No se eliminó nada. "+" | ".join(errors))
    return {"manifest":manifest,"directories":directories,"files":candidates}

def cleanup(root=ROOT, apply=False, manifest=None):
    result=plan(root,manifest)
    if not apply:
        print(f"Limpieza validada: {len(result['files'])} copias identificadas. Orígenes conservados.")
        return result
    before=source_hashes(root)
    for name in result["directories"]:
        shutil.rmtree(root/name)
    if source_hashes(root)!=before:
        raise ValueError("Cambió un archivo de origen durante la limpieza.")
    report_path=root/"docs/LIMPIEZA_OBSOLETOS.json"
    history=json.loads(report_path.read_text()) if report_path.exists() else {}
    removed=sorted(set(history.get("removedFiles",[]))|set(result["files"]))
    report={"schemaVersion":1,"snapshotCommit":result["manifest"]["snapshotCommit"],
            "obsoleteDirectories":["site","dist"],"removedFiles":removed,
            "protectedSourcesSha256":before,"canonicalEntry":"index.html","remainingLegacyFiles":0}
    report_path.parent.mkdir(parents=True,exist_ok=True)
    temporary=report_path.with_suffix(".tmp")
    temporary.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    temporary.replace(report_path)
    print(f"Limpieza realizada: {len(result['files'])} copias retiradas. CSV, Excel y configuración sin cambios.")
    return result

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--apply",action="store_true")
    args=parser.parse_args()
    try: cleanup(apply=args.apply)
    except (ValueError,OSError,KeyError) as error: raise SystemExit(f"Limpieza detenida: {error}")
