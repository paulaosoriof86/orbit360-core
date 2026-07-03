#!/usr/bin/env python3
"""Orbit 360 · Convertir Excel a CSV para importación A&S v1.104.

Lee archivos .xlsx/.xlsm locales desde una carpeta ignorada por Git y exporta
cada hoja visible a CSV UTF-8 en _orbit360_imports/ays_real/_convertidos.
No escribe Firestore, no usa red y no sube datos reales al repo.
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from datetime import datetime, date
from pathlib import Path
from typing import Any

try:
    import openpyxl
except Exception as exc:  # pragma: no cover
    print("ERROR: falta openpyxl. Ejecuta el wrapper PowerShell para crear venv local o instala openpyxl.")
    print(f"Detalle: {exc}")
    sys.exit(2)


def slug(value: str) -> str:
    text = value.strip().lower()
    replacements = {
        "á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u", "ü": "u", "ñ": "n",
        "Á": "a", "É": "e", "Í": "i", "Ó": "o", "Ú": "u", "Ü": "u", "Ñ": "n",
    }
    for a, b in replacements.items():
        text = text.replace(a, b)
    text = re.sub(r"[^a-z0-9]+", "_", text)
    return re.sub(r"_+", "_", text).strip("_") or "hoja"


def clean_cell(value: Any) -> Any:
    if value is None:
        return ""
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def row_has_value(row: list[Any]) -> bool:
    return any(str(v or "").strip() for v in row)


def convert_workbook(path: Path, out_dir: Path) -> dict[str, Any]:
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    book_slug = slug(path.stem)
    exported: list[dict[str, Any]] = []

    for ws in wb.worksheets:
        if getattr(ws, "sheet_state", "visible") != "visible":
            continue
        rows = []
        for raw in ws.iter_rows(values_only=True):
            row = [clean_cell(v) for v in raw]
            if row_has_value(row):
                rows.append(row)
        if not rows:
            continue

        max_len = max(len(r) for r in rows)
        normalized = [r + [""] * (max_len - len(r)) for r in rows]
        file_name = f"{book_slug}__{slug(ws.title)}.csv"
        out_path = out_dir / file_name
        with out_path.open("w", encoding="utf-8-sig", newline="") as fh:
            writer = csv.writer(fh)
            writer.writerows(normalized)
        exported.append({
            "sheet": ws.title,
            "csv": str(out_path),
            "rows": max(0, len(normalized) - 1),
            "columns": max_len,
        })

    return {"workbook": str(path), "sheets": exported}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="_orbit360_imports/ays_real/_excel")
    parser.add_argument("--output", default="_orbit360_imports/ays_real/_convertidos")
    parser.add_argument("--report", default="_orbit360_reports/CONVERTIR-EXCEL-IMPORTACION-AYS-V104.json")
    args = parser.parse_args()

    root = Path.cwd()
    input_dir = (root / args.input).resolve() if not Path(args.input).is_absolute() else Path(args.input)
    out_dir = (root / args.output).resolve() if not Path(args.output).is_absolute() else Path(args.output)
    report_path = (root / args.report).resolve() if not Path(args.report).is_absolute() else Path(args.report)
    out_dir.mkdir(parents=True, exist_ok=True)
    report_path.parent.mkdir(parents=True, exist_ok=True)

    warnings: list[str] = []
    errors: list[str] = []
    results: list[dict[str, Any]] = []

    if not input_dir.exists():
        warnings.append(f"No existe carpeta Excel: {input_dir}")
    else:
        files = sorted([p for p in input_dir.rglob("*") if p.suffix.lower() in {".xlsx", ".xlsm"}])
        if not files:
            warnings.append(f"No hay archivos .xlsx/.xlsm en: {input_dir}")
        for file in files:
            try:
                results.append(convert_workbook(file, out_dir))
            except Exception as exc:
                errors.append(f"{file}: {exc}")

    total_csv = sum(len(r.get("sheets", [])) for r in results)
    report = {
        "version": "v1.104",
        "createdAt": datetime.utcnow().isoformat() + "Z",
        "inputDir": str(input_dir),
        "outputDir": str(out_dir),
        "workbooks": results,
        "totalCsv": total_csv,
        "warnings": warnings,
        "errors": errors,
        "result": "FAIL" if errors else "OK",
    }
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print("============================================================")
    print("ORBIT 360 - CONVERTIR EXCEL IMPORTACION A&S v1.104")
    print(f"Input: {input_dir}")
    print(f"Output: {out_dir}")
    print(f"CSV generados: {total_csv}")
    print(f"Warnings: {len(warnings)}")
    for w in warnings:
        print(f"WARN: {w}")
    print(f"Errores: {len(errors)}")
    for e in errors:
        print(f"ERROR: {e}")
    print(f"Reporte JSON: {report_path}")
    print("RESULTADO:", report["result"])
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
