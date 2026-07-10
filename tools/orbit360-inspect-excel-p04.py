#!/usr/bin/env python3
"""Orbit 360 P0.4: inventario estructural seguro de XLSX/XLSM.

No ejecuta macros ni fórmulas, no devuelve valores de celdas y no escribe en
Orbit.store. Usa únicamente la biblioteca estándar de Python.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Any
from xml.etree import ElementTree as ET

NS_MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
NS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
NS_PKG_REL = "http://schemas.openxmlformats.org/package/2006/relationships"
NS = {"m": NS_MAIN, "r": NS_REL, "pr": NS_PKG_REL}
FORMULA_FUNCTION_RE = re.compile(r"(?<![A-Z0-9_.])(?:_xlfn\.)?([A-Z][A-Z0-9_.]*)\s*\(", re.I)
EMAIL_RE = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.I)
PHONE_RE = re.compile(r"\+?\d[\d\s().-]{7,}\d")
SUPPORTED = {".xlsx", ".xlsm"}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def safe_text(value: Any, limit: int = 300) -> str:
    text = str(value or "").strip()
    if len(text) > limit:
        return "[contenido_omitido]"
    text = EMAIL_RE.sub("[correo_oculto]", text)
    text = PHONE_RE.sub("[numero_oculto]", text)
    return text


def normalize_formula(formula: str) -> str:
    return re.sub(r"\s+", "", formula or "").upper()


def sha256_text(parts: list[str]) -> str:
    digest = hashlib.sha256()
    for part in parts:
        digest.update(part.encode("utf-8", errors="replace"))
        digest.update(b"\n")
    return digest.hexdigest()


def parse_xml(archive: zipfile.ZipFile, name: str) -> ET.Element | None:
    try:
        with archive.open(name) as handle:
            return ET.parse(handle).getroot()
    except KeyError:
        return None
    except ET.ParseError as exc:
        raise ValueError(f"XML_INVALIDO:{name}:{exc}") from exc


def resolve_target(base_file: str, target: str) -> str:
    base = PurePosixPath(base_file).parent
    path = base.joinpath(target)
    parts: list[str] = []
    for part in path.parts:
        if part in ("", "."):
            continue
        if part == "..":
            if parts:
                parts.pop()
            continue
        parts.append(part)
    return "/".join(parts)


def relationships(archive: zipfile.ZipFile, rels_path: str, base_file: str) -> dict[str, dict[str, str]]:
    root = parse_xml(archive, rels_path)
    result: dict[str, dict[str, str]] = {}
    if root is None:
        return result
    for rel in root:
        if local_name(rel.tag) != "Relationship":
            continue
        rid = rel.attrib.get("Id", "")
        target = rel.attrib.get("Target", "")
        result[rid] = {
            "type": rel.attrib.get("Type", ""),
            "target": resolve_target(base_file, target),
            "targetMode": rel.attrib.get("TargetMode", ""),
        }
    return result


def defined_names(workbook_root: ET.Element | None) -> list[dict[str, Any]]:
    output: list[dict[str, Any]] = []
    if workbook_root is None:
        return output
    parent = workbook_root.find("m:definedNames", NS)
    if parent is None:
        return output
    for index, node in enumerate(parent.findall("m:definedName", NS)):
        raw = (node.text or "").strip()
        external = bool(re.search(r"\[[^\]]+\]", raw)) or "file:///" in raw.lower()
        output.append(
            {
                "id": f"name_{index + 1}",
                "name": node.attrib.get("name", ""),
                "localSheetId": int(node.attrib["localSheetId"]) if node.attrib.get("localSheetId", "").isdigit() else None,
                "scopeSheet": "",
                "refersTo": "[referencia_externa_omitida]" if external else safe_text(raw, 300),
                "hidden": node.attrib.get("hidden") in {"1", "true", "True"},
                "externalReference": external,
            }
        )
    return output


def print_names(names: list[dict[str, Any]], sheet_index: int) -> tuple[list[str], str, str]:
    areas: list[str] = []
    title_rows = ""
    title_columns = ""
    for item in names:
        if item.get("localSheetId") != sheet_index or item.get("externalReference"):
            continue
        value = str(item.get("refersTo") or "")
        name = str(item.get("name") or "")
        if name == "_xlnm.Print_Area":
            areas.extend([part.strip() for part in value.split(",") if part.strip()])
        elif name == "_xlnm.Print_Titles":
            for part in [part.strip() for part in value.split(",") if part.strip()]:
                if re.search(r"\$\d+:\$\d+", part):
                    title_rows = part
                elif re.search(r"\$[A-Z]+:\$[A-Z]+", part, re.I):
                    title_columns = part
    return areas, title_rows, title_columns


def table_names(archive: zipfile.ZipFile, sheet_path: str) -> list[str]:
    path = PurePosixPath(sheet_path)
    rels_path = str(path.parent / "_rels" / f"{path.name}.rels")
    rels = relationships(archive, rels_path, sheet_path)
    names: list[str] = []
    for rel in rels.values():
        if not rel["type"].endswith("/table"):
            continue
        root = parse_xml(archive, rel["target"])
        if root is not None:
            value = root.attrib.get("displayName") or root.attrib.get("name")
            if value:
                names.append(safe_text(value, 100))
    return sorted(set(names))


def inspect_sheet(
    archive: zipfile.ZipFile,
    sheet_path: str,
    sheet_name: str,
    sheet_index: int,
    state: str,
    names: list[dict[str, Any]],
) -> dict[str, Any]:
    root = parse_xml(archive, sheet_path)
    if root is None:
        return {
            "id": f"sheet_{sheet_index + 1}",
            "index": sheet_index,
            "name": sheet_name,
            "visibility": state,
            "warnings": ["HOJA_XML_NO_ENCONTRADA"],
        }

    dimension = root.find("m:dimension", NS)
    used_range = dimension.attrib.get("ref", "") if dimension is not None else ""
    formula_count = 0
    numeric_count = 0
    text_count = 0
    blank_count = 0
    formula_errors = 0
    functions: set[str] = set()
    formula_fingerprint_parts: list[str] = []

    for cell in root.findall(".//m:c", NS):
        cell_type = cell.attrib.get("t", "")
        ref = cell.attrib.get("r", "")
        formula_node = cell.find("m:f", NS)
        value_node = cell.find("m:v", NS)
        inline_node = cell.find("m:is", NS)
        if formula_node is not None:
            formula_count += 1
            formula = formula_node.text or ""
            normalized = normalize_formula(formula)
            formula_fingerprint_parts.append(f"{ref}:{normalized}")
            functions.update(match.upper() for match in FORMULA_FUNCTION_RE.findall(normalized))
        elif cell_type in {"s", "inlineStr", "str"}:
            text_count += 1
        elif value_node is not None:
            numeric_count += 1
        elif inline_node is None:
            blank_count += 1
        if cell_type == "e":
            formula_errors += 1

    data_validations = root.find("m:dataValidations", NS)
    validation_count = 0
    if data_validations is not None:
        raw_count = data_validations.attrib.get("count", "")
        validation_count = int(raw_count) if raw_count.isdigit() else len(data_validations.findall("m:dataValidation", NS))

    conditional_count = len(root.findall("m:conditionalFormatting", NS))
    merged_ranges = [node.attrib.get("ref", "") for node in root.findall(".//m:mergeCell", NS) if node.attrib.get("ref")][:100]
    page_setup = root.find("m:pageSetup", NS)
    page_margins = root.find("m:pageMargins", NS)
    header_footer = root.find("m:headerFooter", NS)
    areas, titles_rows, titles_columns = print_names(names, sheet_index)

    headers: list[str] = []
    footers: list[str] = []
    if header_footer is not None:
        for child in list(header_footer):
            text = safe_text(child.text, 200)
            if not text:
                continue
            if "Header" in local_name(child.tag):
                headers.append(text)
            if "Footer" in local_name(child.tag):
                footers.append(text)

    print_profile = {
        "areas": areas,
        "titlesRows": titles_rows,
        "titlesColumns": titles_columns,
        "orientation": page_setup.attrib.get("orientation", "") if page_setup is not None else "",
        "paperSize": page_setup.attrib.get("paperSize", "") if page_setup is not None else "",
        "fitToWidth": int(page_setup.attrib.get("fitToWidth", "0") or 0) if page_setup is not None else 0,
        "fitToHeight": int(page_setup.attrib.get("fitToHeight", "0") or 0) if page_setup is not None else 0,
        "scale": int(page_setup.attrib.get("scale", "0") or 0) if page_setup is not None else 0,
        "margins": {key: float(value) for key, value in (page_margins.attrib.items() if page_margins is not None else []) if _is_number(value)},
        "header": " | ".join(headers),
        "footer": " | ".join(footers),
        "centerHorizontally": root.find("m:printOptions", NS) is not None and root.find("m:printOptions", NS).attrib.get("horizontalCentered") in {"1", "true"},
        "centerVertically": root.find("m:printOptions", NS) is not None and root.find("m:printOptions", NS).attrib.get("verticalCentered") in {"1", "true"},
    }

    row_count, column_count = range_size(used_range)
    return {
        "id": f"sheet_{sheet_index + 1}",
        "index": sheet_index,
        "name": sheet_name,
        "visibility": state,
        "usedRange": used_range,
        "rowCount": row_count,
        "columnCount": column_count,
        "formulaCount": formula_count,
        "numericConstantCount": numeric_count,
        "textConstantCount": text_count,
        "blankCellCount": blank_count,
        "formulaFunctions": sorted(functions),
        "formulaFingerprint": sha256_text(formula_fingerprint_parts) if formula_fingerprint_parts else "",
        "formulaErrorCount": formula_errors,
        "circularReferenceCount": 0,
        "circularReferenceAnalysis": "not_evaluated",
        "dataValidationCount": validation_count,
        "conditionalFormatCount": conditional_count,
        "mergedRanges": merged_ranges,
        "tableNames": table_names(archive, sheet_path),
        "namedRanges": [item["name"] for item in names if item.get("localSheetId") == sheet_index],
        "labels": [],
        "sectionLabels": [],
        "print": print_profile,
        "hasExternalReferences": any(item.get("externalReference") for item in names if item.get("localSheetId") == sheet_index),
        "protected": root.find("m:sheetProtection", NS) is not None,
    }


def _is_number(value: str) -> bool:
    try:
        float(value)
        return True
    except (TypeError, ValueError):
        return False


def column_number(reference: str) -> int:
    letters = re.match(r"\$?([A-Z]+)", reference.upper())
    if not letters:
        return 0
    total = 0
    for char in letters.group(1):
        total = total * 26 + (ord(char) - 64)
    return total


def range_size(reference: str) -> tuple[int, int]:
    if not reference:
        return 0, 0
    last = reference.split(":")[-1].replace("$", "")
    match = re.match(r"([A-Z]+)(\d+)", last, re.I)
    if not match:
        return 0, 0
    return int(match.group(2)), column_number(match.group(1))


def inspect_workbook(file_path: Path) -> dict[str, Any]:
    extension = file_path.suffix.lower()
    if extension not in SUPPORTED:
        return {
            "ok": False,
            "code": "UNSUPPORTED_FORMAT",
            "format": extension.lstrip("."),
            "supportedFormats": sorted(item.lstrip(".") for item in SUPPORTED),
            "writeAllowed": False,
        }
    if not file_path.exists() or not file_path.is_file():
        return {"ok": False, "code": "FILE_NOT_FOUND", "writeAllowed": False}

    try:
        file_hash = hashlib.sha256(file_path.read_bytes()).hexdigest()
        with zipfile.ZipFile(file_path, "r") as archive:
            names_in_zip = set(archive.namelist())
            workbook_root = parse_xml(archive, "xl/workbook.xml")
            if workbook_root is None:
                return {"ok": False, "code": "WORKBOOK_XML_NOT_FOUND", "writeAllowed": False}
            rels = relationships(archive, "xl/_rels/workbook.xml.rels", "xl/workbook.xml")
            names = defined_names(workbook_root)
            sheets_parent = workbook_root.find("m:sheets", NS)
            worksheets: list[dict[str, Any]] = []
            sheet_names: list[str] = []
            if sheets_parent is not None:
                for index, node in enumerate(sheets_parent.findall("m:sheet", NS)):
                    sheet_name = safe_text(node.attrib.get("name", ""), 120)
                    sheet_names.append(sheet_name)
                    rid = node.attrib.get(f"{{{NS_REL}}}id", "")
                    target = rels.get(rid, {}).get("target", "")
                    state = node.attrib.get("state", "visible")
                    worksheets.append(inspect_sheet(archive, target, sheet_name, index, state, names))
            for item in names:
                local_id = item.get("localSheetId")
                if isinstance(local_id, int) and 0 <= local_id < len(sheet_names):
                    item["scopeSheet"] = sheet_names[local_id]

            workbook_pr = workbook_root.find("m:workbookPr", NS)
            calc_pr = workbook_root.find("m:calcPr", NS)
            external_ref_nodes = workbook_root.findall(".//m:externalReference", NS)
            external_files = sorted(PurePosixPath(name).name for name in names_in_zip if name.startswith("xl/externalLinks/") and name.endswith(".xml"))
            connection_root = parse_xml(archive, "xl/connections.xml")
            connection_count = len(connection_root) if connection_root is not None else 0
            has_macros = "xl/vbaProject.bin" in names_in_zip

            structural = {
                "format": extension.lstrip("."),
                "dateSystem": "1904" if workbook_pr is not None and workbook_pr.attrib.get("date1904") in {"1", "true"} else "1900",
                "calculationMode": calc_pr.attrib.get("calcMode", "unknown") if calc_pr is not None else "unknown",
                "hasMacros": has_macros,
                "externalLinkCount": max(len(external_ref_nodes), len(external_files)),
                "connectionCount": connection_count,
                "protectedWorkbook": workbook_root.find("m:workbookProtection", NS) is not None,
                "customXmlCount": len([name for name in names_in_zip if name.startswith("customXml/item") and name.endswith(".xml")]),
                "definedNames": names,
                "worksheets": worksheets,
            }
            fingerprint_payload = json.dumps(structural, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
            workbook_fingerprint = hashlib.sha256(fingerprint_payload.encode("utf-8")).hexdigest()
            warnings: list[str] = ["FORMULAS_NOT_CALCULATED", "CELL_VALUES_NOT_EXPORTED"]
            if has_macros:
                warnings.append("MACROS_DETECTED_NOT_EXECUTED")
            if structural["externalLinkCount"]:
                warnings.append("EXTERNAL_LINKS_BLOCKED")
            if connection_count:
                warnings.append("EXTERNAL_CONNECTIONS_BLOCKED")
            if any(sheet.get("visibility") == "veryHidden" for sheet in worksheets):
                warnings.append("VERY_HIDDEN_SHEETS_PRESENT")

            return {
                "ok": True,
                "code": "INVENTORY_READY",
                "sourceFileName": safe_text(file_path.name, 200),
                "sourceHash": file_hash,
                "format": structural["format"],
                "workbookFingerprint": workbook_fingerprint,
                "dateSystem": structural["dateSystem"],
                "calculationMode": structural["calculationMode"],
                "hasMacros": has_macros,
                "vbaProjectPresent": has_macros,
                "macrosExecuted": False,
                "formulasExecuted": False,
                "externalLinks": external_files,
                "externalLinkCount": structural["externalLinkCount"],
                "connectionCount": connection_count,
                "protectedWorkbook": structural["protectedWorkbook"],
                "customXmlCount": structural["customXmlCount"],
                "definedNames": names,
                "worksheets": worksheets,
                "warnings": warnings,
                "parser": {
                    "provider": "orbit360_python_stdlib_ooxml",
                    "version": "p04.1",
                    "generatedAt": utc_now(),
                },
                "containsCellValues": False,
                "containsBinaryPayload": False,
                "containsSecrets": False,
                "writeAllowed": False,
            }
    except zipfile.BadZipFile:
        return {"ok": False, "code": "CORRUPTED_WORKBOOK", "writeAllowed": False}
    except (OSError, ValueError) as exc:
        return {"ok": False, "code": "INSPECTION_FAILED", "message": safe_text(exc, 300), "writeAllowed": False}


def main() -> int:
    parser = argparse.ArgumentParser(description="Inventario seguro XLSX/XLSM para Orbit 360 P0.4")
    parser.add_argument("file", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--pretty", action="store_true")
    args = parser.parse_args()
    report = inspect_workbook(args.file)
    text = json.dumps(report, ensure_ascii=False, indent=2 if args.pretty else None, sort_keys=True)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(text + "\n", encoding="utf-8")
    else:
        print(text)
    return 0 if report.get("ok") else 2


if __name__ == "__main__":
    sys.exit(main())