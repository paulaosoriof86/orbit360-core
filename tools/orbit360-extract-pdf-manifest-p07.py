#!/usr/bin/env python3
"""Orbit 360 P0.7b: manifiesto estructural y sanitizado de cotizaciones PDF.

Parser determinístico para backend/herramientas. No ejecuta contenido embebido,
no sigue enlaces, no devuelve bytes/base64 y no escribe en Orbit.store.

Requiere PyMuPDF (`pymupdf`). El modo por defecto es `training`, que redacta
PII antes de emitir el manifiesto. El modo `operational` solo conserva valores
sensibles cuando se pasa explícitamente `--include-sensitive-values`.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import statistics
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

try:
    import fitz  # PyMuPDF
except Exception as exc:  # pragma: no cover - explicit runtime diagnostic
    raise SystemExit(f"PYMUPDF_REQUIRED:{exc}") from exc

MAX_FILE_BYTES = 80 * 1024 * 1024
MAX_PAGES = 350
MAX_BLOCKS_PER_PAGE = 1500
MAX_TEXT_CHARS_PER_BLOCK = 12_000
MAX_TABLE_ROWS = 500
MAX_TABLE_COLS = 80

EMAIL_RE = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.I)
PHONE_RE = re.compile(r"(?<!\d)(?:\+?\d[\d\s().-]{7,}\d)(?!\d)")
ID_RE = re.compile(r"(?<!\d)\d{8,18}(?!\d)")
MONEY_RE = re.compile(r"(?:Q\.?|GTQ|COP|USD|US\$|\$)\s*[\d.,]+", re.I)
PII_LABEL_RE = re.compile(
    r"^(?:nombre(?:\s+del\s+cliente)?|cliente|asegurado|contratante|correo(?:\s+electr[oó]nico)?|email|"
    r"tel[eé]fono|celular|dpi|c[eé]dula|documento|nit|placa|intermediario|agente|direcci[oó]n|"
    r"fecha\s+de\s+nacimiento|cotizado\s+por)\s*[:\-]",
    re.I,
)
TECHNICAL_LABELS = {
    "marca", "linea", "línea", "tipo", "modelo", "suma asegurada", "valor comercial",
    "prima neta", "prima total", "total a pagar", "deducible", "vigencia", "plan",
}
SECTION_PATTERNS = [
    ("datos_generales", ["datos personales", "datos del cliente", "datos de servicio", "datos del vehiculo", "datos del vehículo", "datos del riesgo"]),
    ("formas_pago", ["formas de pago", "opciones de pago", "payment options"]),
    ("seccion_1", ["seccion i", "sección i", "seccion 1", "sección 1"]),
    ("seccion_2", ["seccion ii", "sección ii", "seccion 2", "sección 2"]),
    ("seccion_3", ["seccion iii", "sección iii", "seccion 3", "sección 3"]),
    ("coberturas_principales", ["coberturas principales"]),
    ("coberturas_adicionales", ["coberturas adicionales"]),
    ("beneficios_adicionales", ["beneficios adicionales"]),
    ("asistencia", ["asistencia vial", "beneficios de asistencia"]),
    ("pasos_contratacion", ["pasos para contratar", "cómo contratar", "como contratar"]),
    ("condiciones", ["condiciones", "importante"]),
    ("notas", ["observaciones", "notas"]),
    ("vigencia_agente", ["cotizacion valida", "cotización válida", "datos agente"]),
]


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def clean(value: Any) -> str:
    return str(value or "").strip()


def norm(value: Any) -> str:
    text = clean(value).lower()
    replacements = str.maketrans("áéíóúüñ", "aeiouun")
    text = text.translate(replacements)
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


def slug(value: Any) -> str:
    return norm(value).replace(" ", "_")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def bbox_list(value: Any) -> list[float]:
    try:
        seq = list(value or [])[:4]
        return [round(safe_float(item), 2) for item in seq] + [0.0] * (4 - len(seq))
    except TypeError:
        return [0.0, 0.0, 0.0, 0.0]


def classify_section(title: str) -> str:
    value = norm(title)
    for key, patterns in SECTION_PATTERNS:
        if any(norm(pattern) in value for pattern in patterns):
            return key
    return slug(title) or "otra"


def redact_line(line: str, keep_sensitive: bool) -> str:
    text = clean(line)
    if keep_sensitive or not text:
        return text[:MAX_TEXT_CHARS_PER_BLOCK]
    text = EMAIL_RE.sub("[correo_oculto]", text)
    text = PHONE_RE.sub("[numero_oculto]", text)
    if not MONEY_RE.search(text) and not re.search(r"\b(?:19|20)\d{2}\b", text):
        text = ID_RE.sub("[identificador_oculto]", text)
    return text[:MAX_TEXT_CHARS_PER_BLOCK]


def sensitive_label_info(line: str) -> tuple[bool, bool, str]:
    """Return (is_sensitive, has_inline_value, preserved_label)."""
    text = clean(line)
    match = PII_LABEL_RE.search(text)
    if not match:
        return False, False, ""
    label = re.split(r"[:\-]", text, maxsplit=1)[0].strip()
    if norm(label) in {norm(item) for item in TECHNICAL_LABELS}:
        return False, False, label
    parts = re.split(r"[:\-]", text, maxsplit=1)
    inline = len(parts) > 1 and bool(clean(parts[1]))
    return True, inline, label


def sanitize_text(text: str, keep_sensitive: bool) -> str:
    raw_lines = str(text or "").splitlines()
    if keep_sensitive:
        return "\n".join(clean(line) for line in raw_lines if clean(line))[:MAX_TEXT_CHARS_PER_BLOCK]
    output: list[str] = []
    redact_next = False
    for raw_line in raw_lines:
        line = clean(raw_line)
        if not line:
            continue
        sensitive, inline, label = sensitive_label_info(line)
        if redact_next and not sensitive:
            output.append("[valor_sensible_omitido]")
            redact_next = False
            continue
        if sensitive:
            output.append(f"{label}: [valor_sensible_omitido]")
            redact_next = not inline
            continue
        output.append(redact_line(line, False))
    return "\n".join(output).strip()[:MAX_TEXT_CHARS_PER_BLOCK]


def block_text(block: dict[str, Any]) -> tuple[str, list[float], list[str], float, bool]:
    lines_out: list[str] = []
    fonts: list[str] = []
    sizes: list[float] = []
    bold = False
    for line in block.get("lines", []) or []:
        spans = line.get("spans", []) or []
        line_text = "".join(clean(span.get("text")) for span in spans).strip()
        if line_text:
            lines_out.append(line_text)
        for span in spans:
            font = clean(span.get("font"))
            if font:
                fonts.append(font)
                if "bold" in font.lower() or "black" in font.lower() or "semibold" in font.lower():
                    bold = True
            size = safe_float(span.get("size"))
            if size > 0:
                sizes.append(size)
    return "\n".join(lines_out), bbox_list(block.get("bbox")), sorted(set(fonts))[:12], max(sizes or [0.0]), bold


def is_heading(text: str, max_size: float, median_size: float, bold: bool) -> bool:
    value = clean(text)
    if not value or len(value) > 180 or "\n" in value and len(value.splitlines()) > 3:
        return False
    alpha = re.sub(r"[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]", "", value)
    upper_ratio = sum(1 for char in alpha if char.isupper()) / max(1, len(alpha))
    return (median_size > 0 and max_size >= median_size * 1.23) or (bold and len(value) <= 100) or (upper_ratio >= 0.82 and len(alpha) >= 5)


def detect_dimensions(raw_text: str, hints: dict[str, Any]) -> dict[str, str]:
    text = norm(raw_text)
    country = clean(hints.get("pais") or hints.get("country")).upper()
    currency = clean(hints.get("moneda") or hints.get("currency")).upper()
    if not country:
        if "guatemala" in text or re.search(r"\bq\.?\s*\d", raw_text, re.I):
            country = "GT"
        elif "colombia" in text or " cop " in f" {text} ":
            country = "CO"
    if not currency:
        currency = "GTQ" if country == "GT" else ("COP" if country == "CO" else "")

    vehicle_type = clean(hints.get("tipoVehiculo") or hints.get("vehicleType"))
    if not vehicle_type:
        match = re.search(r"\bTipo\s*:\s*([^\n]{2,80})", raw_text, re.I)
        if match:
            vehicle_type = clean(match.group(1))

    product = clean(hints.get("producto") or hints.get("product"))
    ramo = clean(hints.get("ramo"))
    if not product:
        if vehicle_type or any(token in text for token in ["seguro de automovil", "seguro de vehiculo", "datos del vehiculo", "valor comercial", "robo o hurto total"]):
            product = "Seguro de vehículo"
            ramo = ramo or "Vehículos"
        elif any(token in text for token in ["gastos medicos", "salud", "maternidad", "hospitalizacion"]):
            product = "Gastos Médicos"
            ramo = ramo or "Salud"
        elif "seguro de vida" in text or "muerte accidental" in text:
            product = "Vida"
            ramo = ramo or "Vida"

    return {
        "pais": country,
        "moneda": currency,
        "ramo": ramo,
        "producto": product,
        "familiaProducto": clean(hints.get("familiaProducto")),
        "subtipoProducto": clean(hints.get("subtipoProducto")),
        "segmento": clean(hints.get("segmento")),
        "tipoRiesgo": clean(hints.get("tipoRiesgo")),
        "tipoVehiculo": vehicle_type,
        "usoVehiculo": clean(hints.get("usoVehiculo")),
        "plan": clean(hints.get("plan")),
    }


def load_json(path: str | None, fallback: Any) -> Any:
    if not path:
        return fallback
    return json.loads(Path(path).read_text(encoding="utf-8"))


def insurer_candidates(raw_text: str, directory: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized_text = f" {norm(raw_text)} "
    tokens = set(normalized_text.split())
    generic = {"seguros", "seguro", "aseguradora", "aseguradoras", "compania", "sociedad", "anonima", "sa", "plus", "premium", "riesgo"}
    output: list[dict[str, Any]] = []
    for item in directory:
        names = [clean(item.get("nombre") or item.get("name"))]
        names.extend(clean(value) for value in item.get("aliases", []) or [])
        names = [name for name in names if name]
        best_score = 0.0
        best_name = ""
        for name in names:
            n = norm(name)
            if not n:
                continue
            if f" {n} " in normalized_text:
                score = 98.0
            else:
                distinctive = {token for token in n.split() if token not in generic and len(token) >= 4}
                if not distinctive:
                    score = 0.0
                else:
                    overlap = len(distinctive & tokens) / len(distinctive)
                    score = overlap * 82.0
            if score > best_score:
                best_score, best_name = score, name
        if best_score >= 50:
            output.append({
                "id": clean(item.get("id") or item.get("aseguradoraId") or item.get("directoryId")),
                "name": clean(item.get("nombre") or item.get("name")),
                "confidence": round(best_score, 2),
                "source": "directory_text_match",
                "evidence": {"matchedName": best_name, "containsRawPayload": False},
            })
    return sorted(output, key=lambda item: item["confidence"], reverse=True)[:8]


def extract_tables(page: fitz.Page, page_number: int, keep_sensitive: bool) -> list[dict[str, Any]]:
    output: list[dict[str, Any]] = []
    try:
        finder = page.find_tables()
        tables = list(getattr(finder, "tables", []) or [])[:20]
    except Exception:
        return output
    for index, table in enumerate(tables):
        try:
            rows = table.extract() or []
        except Exception:
            continue
        safe_rows: list[list[str]] = []
        for row in rows[:MAX_TABLE_ROWS]:
            cells = list(row or [])[:MAX_TABLE_COLS]
            sensitive_index = None
            for probe_index, probe_cell in enumerate(cells):
                probe_sensitive, _, _ = sensitive_label_info(clean(probe_cell))
                if probe_sensitive:
                    sensitive_index = probe_index
                    break
            safe_row: list[str] = []
            for cell_index, cell in enumerate(cells):
                if sensitive_index is not None and cell_index > sensitive_index and not keep_sensitive and clean(cell):
                    safe_row.append("[valor_sensible_omitido]")
                else:
                    safe_row.append(sanitize_text(clean(cell), keep_sensitive))
            safe_rows.append(safe_row)
        output.append({
            "id": f"p{page_number}_table_{index + 1}",
            "kind": "table",
            "rows": safe_rows,
            "bbox": bbox_list(getattr(table, "bbox", [])),
            "order": 10_000 + index,
            "confidence": 78,
            "sourceLocation": {"page": page_number, "block": f"table_{index + 1}", "bbox": bbox_list(getattr(table, "bbox", []))},
        })
    return output


def build_sections(pages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    sections: list[dict[str, Any]] = []
    active: dict[str, Any] | None = None
    for page in pages:
        if page.get("blank"):
            continue
        for block in sorted(page.get("blocks", []), key=lambda item: item.get("order", 0)):
            kind = block.get("kind")
            title = clean(block.get("title") or block.get("text"))
            if kind == "heading" and title:
                active = {
                    "id": f"section_{len(sections) + 1}",
                    "title": title,
                    "key": classify_section(title),
                    "page": page["number"],
                    "order": len(sections),
                    "fields": [],
                    "sourceLocation": block.get("sourceLocation", {}),
                }
                sections.append(active)
                continue
            if active is None:
                active = {
                    "id": f"section_{len(sections) + 1}",
                    "title": "Contenido general",
                    "key": "datos_generales",
                    "page": page["number"],
                    "order": len(sections),
                    "fields": [],
                    "sourceLocation": block.get("sourceLocation", {}),
                }
                sections.append(active)
            if kind == "table":
                for row_index, row in enumerate(block.get("rows", [])):
                    label = clean(row[0] if row else f"Fila {row_index + 1}")
                    value = row[1:] if len(row) > 2 else (row[1] if len(row) > 1 else "")
                    active["fields"].append({
                        "label": label or f"Fila {row_index + 1}",
                        "value": value,
                        "valueType": "fila_tabla",
                        "order": len(active["fields"]),
                        "confidence": block.get("confidence", 0),
                        "sourceLocation": block.get("sourceLocation", {}),
                    })
            elif clean(block.get("text")):
                active["fields"].append({
                    "label": clean(block.get("title")) or "Contenido",
                    "value": clean(block.get("text")),
                    "valueType": kind or "paragraph",
                    "order": len(active["fields"]),
                    "confidence": block.get("confidence", 0),
                    "sourceLocation": block.get("sourceLocation", {}),
                })
    return sections


def inspect_pdf(path: Path, purpose: str, include_sensitive: bool, directory: list[dict[str, Any]], hints: dict[str, Any]) -> dict[str, Any]:
    if not path.exists() or not path.is_file():
        raise ValueError("PDF_NOT_FOUND")
    size = path.stat().st_size
    if size > MAX_FILE_BYTES:
        raise ValueError("PDF_FILE_LIMIT_EXCEEDED")
    if path.suffix.lower() != ".pdf":
        raise ValueError("PDF_EXTENSION_REQUIRED")

    keep_sensitive = purpose == "operational" and include_sensitive
    source_hash = sha256_file(path)
    try:
        document = fitz.open(path)
    except Exception as exc:
        raise ValueError(f"PDF_OPEN_FAILED:{exc}") from exc
    try:
        if document.is_encrypted and not document.authenticate(""):
            raise ValueError("PDF_ENCRYPTED")
        if document.page_count > MAX_PAGES:
            raise ValueError("PDF_PAGE_LIMIT_EXCEEDED")

        raw_text_parts: list[str] = []
        page_dicts: list[dict[str, Any]] = []
        parser_warnings: list[str] = []

        for page_index in range(document.page_count):
            page = document.load_page(page_index)
            page_number = page_index + 1
            try:
                data = page.get_text("dict", sort=True)
            except Exception as exc:
                data = {"blocks": []}
                parser_warnings.append(f"PAGE_TEXT_FAILED:{page_number}:{type(exc).__name__}")

            text_blocks_raw: list[tuple[dict[str, Any], str, list[float], list[str], float, bool]] = []
            font_sizes: list[float] = []
            image_blocks: list[dict[str, Any]] = []
            for raw_block in (data.get("blocks", []) or [])[:MAX_BLOCKS_PER_PAGE]:
                block_type = int(raw_block.get("type", 0))
                if block_type == 0:
                    text, box, fonts, max_size, bold = block_text(raw_block)
                    if text:
                        text_blocks_raw.append((raw_block, text, box, fonts, max_size, bold))
                        for line in raw_block.get("lines", []) or []:
                            for span in line.get("spans", []) or []:
                                size_value = safe_float(span.get("size"))
                                if size_value > 0:
                                    font_sizes.append(size_value)
                        raw_text_parts.append(text)
                elif block_type == 1:
                    image_blocks.append({
                        "id": f"p{page_number}_image_{len(image_blocks) + 1}",
                        "kind": "image",
                        "title": "Imagen",
                        "text": "",
                        "bbox": bbox_list(raw_block.get("bbox")),
                        "order": 20_000 + len(image_blocks),
                        "confidence": 100,
                        "layout": {"width": raw_block.get("width", 0), "height": raw_block.get("height", 0)},
                        "sourceLocation": {"page": page_number, "block": f"image_{len(image_blocks) + 1}", "bbox": bbox_list(raw_block.get("bbox"))},
                    })

            median_size = statistics.median(font_sizes) if font_sizes else 0.0
            blocks: list[dict[str, Any]] = []
            for index, (_, text, box, fonts, max_size, bold) in enumerate(text_blocks_raw):
                safe_text = sanitize_text(text, keep_sensitive)
                if not safe_text:
                    continue
                heading = is_heading(safe_text, max_size, median_size, bold)
                blocks.append({
                    "id": f"p{page_number}_block_{index + 1}",
                    "kind": "heading" if heading else "paragraph",
                    "title": safe_text if heading else "",
                    "text": "" if heading else safe_text,
                    "bbox": box,
                    "order": index,
                    "confidence": 92 if heading else 96,
                    "layout": {"fonts": fonts, "maxFontSize": round(max_size, 2), "bold": bold},
                    "sourceLocation": {"page": page_number, "block": f"text_{index + 1}", "bbox": box},
                })

            tables = extract_tables(page, page_number, keep_sensitive)
            blocks.extend(tables)
            blocks.extend(image_blocks)
            blocks.sort(key=lambda item: (item.get("bbox", [0, 0])[1], item.get("bbox", [0, 0])[0], item.get("order", 0)))
            for order, block in enumerate(blocks):
                block["order"] = order

            raw_page_text = "\n".join(item[1] for item in text_blocks_raw)
            chars = len(re.sub(r"\s+", "", raw_page_text))
            sparse = chars < 130 and len(text_blocks_raw) <= 5 and len(tables) == 0
            blank = chars == 0 or sparse
            if sparse and chars > 0:
                parser_warnings.append(f"SPARSE_PAGE:{page_number}")
            page_dicts.append({
                "number": page_number,
                "width": round(page.rect.width, 2),
                "height": round(page.rect.height, 2),
                "orientation": "landscape" if page.rect.width > page.rect.height else "portrait",
                "blank": blank,
                "contentChars": chars,
                "blocks": [] if blank else blocks,
                "imageCount": len(image_blocks),
                "tableCount": len(tables),
                "sourceLocation": {"mediaKind": "pdf", "page": page_number},
            })

        raw_text = "\n".join(raw_text_parts)
        dimensions = detect_dimensions(raw_text, hints)
        candidates = insurer_candidates(raw_text, directory)
        sections = build_sections(page_dicts)
        content_pages = [page for page in page_dicts if not page["blank"]]
        confidence = 0
        if content_pages:
            confidence = 72
            if candidates and candidates[0]["confidence"] >= 85:
                confidence += 10
            if dimensions.get("producto"):
                confidence += 8
            if sections:
                confidence += 5
        warnings = list(dict.fromkeys(parser_warnings))
        if not candidates:
            warnings.append("ASEGURADORA_REQUIERE_VALIDACION")
        if not dimensions.get("producto"):
            warnings.append("PRODUCTO_REQUIERE_VALIDACION")
        if not sections:
            warnings.append("SECCIONES_REQUIEREN_VALIDACION")
        if any(page["blank"] for page in page_dicts):
            warnings.append("PAGINAS_VACIAS_DETECTADAS")

        return {
            "schemaVersion": "orbit360.pdf.manifest.p07b.v1",
            "generatedAt": utc_now(),
            "documentId": clean(hints.get("documentId")) or f"pdf_{source_hash[:16]}",
            "sourceHash": source_hash,
            "file": {
                "name": path.name,
                "extension": ".pdf",
                "mimeType": "application/pdf",
                "sizeBytes": size,
                "fileRef": clean(hints.get("fileRef")),
                "containsBytes": False,
                "containsBase64": False,
            },
            "purpose": purpose,
            "includeSensitiveValues": keep_sensitive,
            "pageCount": document.page_count,
            "pages": page_dicts,
            "sections": sections,
            "insurerCandidates": candidates,
            "dimensiones": dimensions,
            "confidence": min(confidence, 95),
            "warnings": warnings,
            "parser": {"name": "pymupdf_deterministic", "version": clean(getattr(fitz, "VersionBind", "")), "ocrExecuted": False},
            "flags": {
                "containsRawPayload": False,
                "containsCustomerPayload": keep_sensitive,
                "containsSecrets": False,
                "embeddedContentExecuted": False,
                "externalLinksFollowed": False,
                "ocrExecuted": False,
            },
            "writeAllowed": False,
            "requiresHumanValidation": True,
        }
    finally:
        document.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Orbit 360 P0.7b PDF manifest extractor")
    parser.add_argument("input", help="PDF input path")
    parser.add_argument("--output", "-o", required=True, help="JSON manifest output path")
    parser.add_argument("--purpose", choices=["training", "operational"], default="training")
    parser.add_argument("--include-sensitive-values", action="store_true")
    parser.add_argument("--directory-json", help="JSON array of insurer directory records")
    parser.add_argument("--hints-json", help="JSON object with tenant/document/dimension hints")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        directory = load_json(args.directory_json, [])
        hints = load_json(args.hints_json, {})
        if not isinstance(directory, list):
            raise ValueError("DIRECTORY_JSON_ARRAY_REQUIRED")
        if not isinstance(hints, dict):
            raise ValueError("HINTS_JSON_OBJECT_REQUIRED")
        manifest = inspect_pdf(
            Path(args.input), args.purpose, args.include_sensitive_values,
            directory, hints,
        )
        output = Path(args.output)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps({
            "ok": True,
            "code": "PDF_MANIFEST_READY",
            "output": str(output),
            "documentId": manifest["documentId"],
            "pageCount": manifest["pageCount"],
            "contentPages": sum(1 for page in manifest["pages"] if not page["blank"]),
            "blankPages": [page["number"] for page in manifest["pages"] if page["blank"]],
            "sections": len(manifest["sections"]),
            "insurerCandidates": len(manifest["insurerCandidates"]),
            "writeAllowed": False,
        }, ensure_ascii=False))
        return 0
    except Exception as exc:
        print(json.dumps({"ok": False, "code": clean(exc), "writeAllowed": False}, ensure_ascii=False), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
