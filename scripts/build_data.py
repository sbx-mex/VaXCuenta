"""Validate sources, reconcile pesos and publish one small, deterministic data file."""
import csv
import hashlib
import io
import json
import re
import unicodedata
from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path
from xlsx_reader import read_xlsx

ROOT = Path(__file__).resolve().parents[1]
PENDING_DM = "DM pendiente de asignación"


def normalized(value):
    text = unicodedata.normalize("NFKD", str(value or ""))
    return re.sub(r"[^a-z0-9]", "", "".join(c for c in text if not unicodedata.combining(c)).lower())


def ceco(value):
    if isinstance(value, (int, float)) and float(value).is_integer():
        value = str(int(value))
    value = str(value or "").strip()
    return value if re.fullmatch(r"\d{5}", value) else None


def cents(value):
    text = str(value).strip().replace("$", "").replace(",", "").replace(" ", "")
    number = Decimal(text)
    if not number.is_finite() or number * 100 != (number * 100).to_integral_value():
        raise ValueError(f"Importe inválido: {value}")
    return int(number * 100)


def source_date(value, date_format):
    value = str(value).strip()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        return date.fromisoformat(value)
    parts = value.split("/")
    if len(parts) != 3:
        raise ValueError(f"Fecha inválida: {value}")
    first, second, year = map(int, parts)
    return date(year, first, second) if date_format == "MDY" else date(year, second, first)


def read_real(path, config):
    raw = path.read_bytes()
    if raw.startswith((b"\xff\xfe", b"\xfe\xff")):
        text = raw.decode("utf-16")
    else:
        try:
            text = raw.decode("utf-8-sig")
        except UnicodeDecodeError:
            text = raw.decode("cp1252")
    lines = text.splitlines()
    header_line = next((i for i, line in enumerate(lines)
                        if "tiendas" in normalized(line) and "vaxcuenta" in normalized(line)), None)
    if header_line is None:
        raise ValueError("No se encontró encabezado Tiendas, Dia, vaXcuenta$.")
    reader = csv.DictReader(io.StringIO("\n".join(lines[header_line:])))
    columns = {normalized(name): name for name in reader.fieldnames}
    for key in ("tiendas", "dia", "vaxcuenta"):
        if key not in columns:
            raise ValueError(f"Falta columna {key}.")
    records, keys = [], set()
    for index, row in enumerate(reader, header_line + 2):
        if not any(str(value or "").strip() for value in row.values()):
            continue
        store = ceco(row.get(columns["tiendas"]))
        if not store:
            raise ValueError(f"CeCo inválido en CSV, fila {index}.")
        day = source_date(row.get(columns["dia"]), config["realDateFormat"])
        amount = cents(row.get(columns["vaxcuenta"]))
        key = (store, day)
        if key in keys:
            raise ValueError(f"Tiendas + Día repetidos en CSV: {store}, {day}. Revisa el origen antes de sumar.")
        keys.add(key)
        records.append((store, day, amount))
    if not records:
        raise ValueError("El CSV no tiene información real.")
    return records


def read_directory(path):
    rows = read_xlsx(path, "Directorio")
    columns = {normalized(v): i for i, v in enumerate(rows[0])}
    for name in ("cc", "region", "dm"):
        if name not in columns:
            raise ValueError(f"Falta {name} en Directorio.")
    grouped = defaultdict(list)
    for row in rows[1:]:
        store = ceco(row[columns["cc"]])
        if store:
            grouped[store].append(row)
    mapping, conflicts, duplicate_keys = {}, [], []
    for store, group in grouped.items():
        regions = {str(r[columns["region"]] or "").strip() for r in group}
        dms = {str(r[columns["dm"]] or "").strip() for r in group}
        if len(group) > 1:
            duplicate_keys.append(store)
        if len(regions) != 1 or len(dms) != 1:
            conflicts.append(store)
            mapping[store] = {"region": None, "dm": PENDING_DM}
        else:
            mapping[store] = {"region": next(iter(regions)) or None, "dm": next(iter(dms)) or PENDING_DM}
    return mapping, conflicts, duplicate_keys


def read_targets(path, donation):
    rows = read_xlsx(path)
    expected = ["tienda", "nombre", "region", "estado", "semalsea", "7ordproyectadassemanal",
                "7ordproyectadasdiarias", "donacionsemanalestimada"]
    if [normalized(x) for x in rows[0]] != expected:
        raise ValueError("El Excel de objetivos debe conservar sus ocho encabezados originales.")
    stores, targets, excluded, seen = {}, [], [], set()
    for source_row, row in enumerate(rows[1:], 2):
        row = row + [None] * max(0, 8 - len(row))
        if not any(value is not None for value in row):
            continue
        key = ceco(row[0])
        if not key:
            excluded.append({"sourceRow": source_row, "ceco": row[0], "name": row[1], "week": row[4], "targetPesos": row[7]})
            continue
        week = int(row[4])
        if (key, week) in seen:
            raise ValueError(f"Meta repetida: CeCo {key}, semana {week}.")
        seen.add((key, week))
        if row[5] is None or row[6] is None or row[7] is None:
            raise ValueError(f"Meta incompleta: CeCo {key}, semana {week}.")
        weekly, daily, amount = float(row[5]), float(row[6]), cents(row[7])
        if min(weekly, daily, amount) < 0 or abs(weekly * donation * 100 - amount) > 1:
            raise ValueError(f"Meta semanal no concilia con donativo de ${donation}: {key}, semana {week}.")
        identity = {"ceco": key, "name": str(row[1] or key).strip(), "targetRegion": str(row[2] or "Por asignar").strip(), "state": str(row[3] or "").strip()}
        if key in stores and stores[key] != identity:
            raise ValueError(f"Identidad de tienda inconsistente: {key}.")
        stores[key] = identity
        targets.append([key, week, amount, weekly, daily])
    return stores, targets, excluded


def calendar(config):
    anchor = date.fromisoformat(config["calendar"]["anchorMonday"])
    start, end = map(date.fromisoformat, (config["campaign"]["start"], config["campaign"]["end"]))
    if anchor.weekday() != 0 or start > end:
        raise ValueError("Calendario inválido.")
    result = []
    offset = (start - anchor).days // 7
    monday = anchor + timedelta(days=offset * 7)
    while monday <= end:
        sunday = monday + timedelta(days=6)
        result.append({"week": config["calendar"]["anchorWeek"] + offset,
                       "start": monday.isoformat(), "end": sunday.isoformat(),
                       "campaignStart": max(monday, start).isoformat(), "campaignEnd": min(sunday, end).isoformat()})
        offset += 1
        monday += timedelta(days=7)
    return result


def atomic_write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(content, encoding="utf-8")
    temporary.replace(path)


def validate_cumulative(root, config, campaign):
    """A replacement must preserve the campaign history and not roll the cut back."""
    previous_path = root / "site/data/dashboard.json"
    if not previous_path.exists():
        return
    previous = json.loads(previous_path.read_text(encoding="utf-8"))
    if previous.get("config", {}).get("campaign", {}).get("start") != config["campaign"]["start"] or not previous.get("actuals"):
        return
    latest = max(r[1] for r in campaign).isoformat()
    earliest = min(r[1] for r in campaign).isoformat()
    if latest < previous["cutoff"]:
        raise ValueError(f"El CSV retrocede el corte de {previous['cutoff']} a {latest}. Exporta el acumulado actualizado.")
    previous_first = min(r[1] for r in previous["actuals"])
    if earliest > previous_first:
        raise ValueError(f"El CSV perdió el inicio del acumulado ({previous_first}). Exporta la campaña completa desde el 1 de octubre, no sólo la semana o el mes nuevo.")


def build(root=ROOT):
    config = json.loads((root / "config.json").read_text(encoding="utf-8"))
    start, end = map(date.fromisoformat, (config["campaign"]["start"], config["campaign"]["end"]))
    real_path = root / "data/Va X Cuenta.csv"
    target_path = root / "data/VaxCuenta Objetivos 26.xlsx"
    directory_path = root / "data/Directorio.xlsx"
    records = read_real(real_path, config)
    directory, directory_conflicts, duplicates = read_directory(directory_path)
    stores, targets, excluded_targets = read_targets(target_path, config["campaign"]["donationPesos"])
    campaign = [r for r in records if start <= r[1] <= end]
    excluded = [r for r in records if not start <= r[1] <= end]
    if not campaign:
        raise ValueError("No hay datos dentro del 1/oct–30/nov/2026.")
    validate_cumulative(root, config, campaign)
    cutoff = max(r[1] for r in campaign)
    target_keys = set(stores)
    real_without_target = sorted({r[0] for r in campaign} - target_keys)
    for key, _, _ in campaign:
        if key not in stores:
            stores[key] = {"ceco": key, "name": f"Tienda {key}", "targetRegion": "Por asignar", "state": ""}
    missing_dm, region_changes = [], []
    for key, store in stores.items():
        entry = directory.get(key)
        store["region"] = (entry or {}).get("region") or store["targetRegion"]
        store["dm"] = (entry or {}).get("dm") or PENDING_DM
        if store["dm"] == PENDING_DM:
            missing_dm.append(key)
        if entry and entry["region"] and store["region"] != store["targetRegion"]:
            region_changes.append({"ceco": key, "targetRegion": store["targetRegion"], "directoryRegion": store["region"]})
    weeks = calendar(config)
    expected_weeks = {week["week"] for week in weeks}
    if any(row[1] not in expected_weeks for row in targets):
        raise ValueError("El Excel contiene semanas fuera de la campaña.")
    real_rows = [[key, day.isoformat(), amount] for key, day, amount in sorted(campaign)]
    available_weeks = {row[1] for row in targets}
    day_counts = defaultdict(int)
    for _, day, _ in campaign:
        day_counts[day.isoformat()] += 1
    missing_days = []
    day = start
    while day <= cutoff:
        if day.isoformat() not in day_counts:
            missing_days.append(day.isoformat())
        day += timedelta(days=1)
    non_ten = [r for r in campaign if r[2] % (config["campaign"]["donationPesos"] * 100)]
    active_targets = {row[0] for row in targets if any(w["week"] == row[1] and w["campaignStart"] <= cutoff.isoformat() for w in weeks)}
    missing_real = sorted(active_targets - {r[0] for r in campaign})
    source_hashes = {path.name: hashlib.sha256(path.read_bytes()).hexdigest()
                     for path in (real_path, target_path, directory_path, root / "config.json")}
    warnings = []
    if missing_days:
        warnings.append(f"La exportación no tiene registros en {len(missing_days)} días hasta el corte. No se inventan importes; el objetivo conserva los días calendario del periodo.")
    if real_without_target:
        warnings.append(f"{len(real_without_target)} tiendas tienen recaudación sin una meta en el Excel; sus pesos se conservan y la comparación del alcance afectado se marca como incompleta.")
    if missing_dm:
        warnings.append(f"{len(missing_dm)} tiendas sin DM confirmado; sus importes se conservan en Región y Tienda y en el grupo DM pendiente de asignación.")
    if expected_weeks - available_weeks:
        warnings.append("Falta el objetivo de la semana 49 (30 de noviembre). No se extrapola ni se presenta una meta total de campaña completa.")
    if excluded_targets:
        warnings.append(f"{len(excluded_targets)} metas de Miguel Aleman MTY tienen CeCo pendiente; se conservan en la auditoría sin atribuirles recaudación.")
    if non_ten:
        warnings.append(f"{len(non_ten)} importes no son múltiplos de $10; se preservan. Recaudado / $10 expresa donativos equivalentes, no tickets comprobados.")
    if region_changes:
        warnings.append(f"{len(region_changes)} tiendas tienen regiones distintas entre Excel y directorio. Región y DM se toman del directorio operativo.")
    audit = {
        "status": "verified-with-source-notes", "cutoff": cutoff.isoformat(),
        "rawRows": len(records), "campaignRows": len(campaign), "excludedRows": len(excluded),
        "rawCents": sum(r[2] for r in records), "campaignCents": sum(r[2] for r in campaign),
        "excludedCents": sum(r[2] for r in excluded),
        "objectiveRows": len(targets), "targetStores": len(stores), "actualStores": len({r[0] for r in campaign}),
        "directoryDuplicateKeysCollapsed": duplicates, "directoryConflicts": directory_conflicts,
        "missingDm": missing_dm, "regionChanges": region_changes,
        "missingCampaignWeeks": sorted(expected_weeks - available_weeks),
        "excludedTargets": excluded_targets, "amountsNotMultipleOf10": len(non_ten),
        "noRealRecord": missing_real, "missingDays": missing_days, "realWithoutTarget": real_without_target, "dailyRecordCounts": dict(sorted(day_counts.items())),
        "sourceHashes": source_hashes, "warnings": warnings
    }
    if audit["rawCents"] != audit["campaignCents"] + audit["excludedCents"]:
        raise ValueError("No conciliaron los importes del CSV.")
    payload = {"schemaVersion": 1, "config": config, "cutoff": cutoff.isoformat(),
               "calendar": weeks, "stores": sorted(stores.values(), key=lambda x: x["ceco"]),
               "targets": sorted(targets), "actuals": real_rows,
               "notes": warnings, "sourceSummary": {key: audit[key] for key in ("campaignRows", "excludedRows", "excludedCents", "actualStores", "missingDm", "missingCampaignWeeks", "amountsNotMultipleOf10", "noRealRecord", "missingDays")}}
    canonical = json.dumps(payload, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    payload["revision"] = hashlib.sha256(canonical.encode()).hexdigest()[:16]
    atomic_write(root / "site/data/dashboard.json", json.dumps(payload, ensure_ascii=False, separators=(",", ":")))
    atomic_write(root / "docs/audit.json", json.dumps(audit, ensure_ascii=False, indent=2))
    summary = ["# Auditoría de VaXCuenta", "", f"Información real al **{cutoff.isoformat()}**.", "",
               f"- CSV completo: {len(records):,} filas; ${audit['rawCents']/100:,.2f}.",
               f"- Campaña: {len(campaign):,} filas; **${audit['campaignCents']/100:,.2f}**.",
               f"- Fuera de campaña: {len(excluded):,} filas; ${audit['excludedCents']/100:,.2f}.",
               f"- Metas válidas: {len(targets):,} filas por CeCo y semana; sin claves repetidas.",
               f"- Tiendas con meta o real: {len(stores):,}; con recaudación: {audit['actualStores']:,}.",
               f"- Claves duplicadas del directorio consolidadas sin sumar importes: {len(duplicates)}.",
               "- Fechas del CSV interpretadas como mes/día/año (10/11/2026 = 11 de octubre).",
               "- El corte proviene de las fechas dentro de campaña, nunca de la fecha de publicación.",
               "- Conciliación: CSV completo = real de campaña + importes fuera de campaña.",
               "", "## Notas del origen", ""] + ["- " + warning for warning in warnings]
    summary += ["", "## Tiendas con DM pendiente", "", ", ".join(missing_dm), "", "## Procedencia", "",
                "Recaudación y metas: archivos adjuntos originales, conservados en data/.",
                "Región y DM: https://github.com/sbx-mex/Esfuerzo_Operativo/blob/main/data/Directorio.xlsx",
                f"Blob GitHub del directorio: {config['directoryBlobSha']}.",
                "Los hashes SHA-256 y el detalle de incidencias están en audit.json.", ""]
    atomic_write(root / "docs/AUDITORIA.md", "\n".join(summary))
    print(f"VaXCuenta: corte {cutoff}; {len(campaign):,} registros; ${audit['campaignCents']/100:,.2f}; revisión {payload['revision']}.")
    return payload, audit


if __name__ == "__main__":
    try:
        build()
    except (ValueError, KeyError, OSError, ArithmeticError) as error:
        raise SystemExit(f"Carga rechazada: {error}")
