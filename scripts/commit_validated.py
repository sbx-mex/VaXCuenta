"""Commit verified removals and outputs without overwriting later source commits."""
import argparse
import json
import os
import subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
GENERATED=("data/dashboard.json","docs/AUDITORIA.md","docs/audit.json","docs/LIMPIEZA_OBSOLETOS.json","sw.js","version.json",".nojekyll")

def git(*args,read=False):
    if read: return subprocess.check_output(["git",*args],cwd=ROOT)
    subprocess.run(["git",*args],cwd=ROOT,check=True)

def legacy_paths():
    manifest=json.loads((ROOT/"scripts/legacy-files.json").read_text())
    return [item["path"] for item in manifest["files"]]

def stage_obsolete():
    matched=git("ls-files","-z","--",*legacy_paths(),read=True).decode().split("\0")
    tracked=[name for name in matched if name]
    if any((ROOT/name).exists() for name in tracked):
        raise ValueError("La copia antigua sigue presente. Aplica la limpieza antes de preparar el commit.")
    if tracked: git("add","-u","--",*tracked)
    print(f"Eliminaciones preparadas: {len(tracked)}.")

def save(push=False):
    files=[name for name in GENERATED if (ROOT/name).is_file()]
    git("add","--",*files)
    staged={name for name in git("diff","--cached","--name-only","-z",read=True).decode().split("\0") if name}
    allowed=set(GENERATED)|set(legacy_paths())
    if staged-allowed:
        raise ValueError("Cambios fuera de la limpieza validada: "+", ".join(sorted(staged-allowed)))
    if not staged:
        print("Corte y limpieza actualizados. No se crea un commit vacío.");return
    git("-c","user.name=github-actions[bot]","-c","user.email=41898282+github-actions[bot]@users.noreply.github.com",
        "commit","-m","VaXCuenta: validar corte y eliminar copias obsoletas")
    if push:
        branch=os.environ.get("GITHUB_REF_NAME","")
        if branch not in ("main","master"): raise ValueError("Sólo se guarda en main o master.")
        git("push","origin",f"HEAD:refs/heads/{branch}")

if __name__=="__main__":
    parser=argparse.ArgumentParser();parser.add_argument("--stage-obsolete",action="store_true");parser.add_argument("--push",action="store_true");args=parser.parse_args()
    try: stage_obsolete() if args.stage_obsolete else save(push=args.push)
    except (ValueError,subprocess.CalledProcessError) as error: raise SystemExit(f"No se guardó una limpieza insegura: {error}")
