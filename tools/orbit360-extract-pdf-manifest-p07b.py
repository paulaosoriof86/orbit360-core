#!/usr/bin/env python3
"""Orbit 360 P0.7b - extractor determinístico y sanitizado de PDF.

No ejecuta adjuntos, no sigue enlaces, no devuelve bytes/base64 y no escribe.
Modo training redacta PII; operational solo la conserva con flag explícito.
"""
from __future__ import annotations

import argparse, hashlib, json, re, statistics, sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import fitz
except Exception as exc:
    raise SystemExit(f"PYMUPDF_REQUIRED:{exc}") from exc

MAX_FILE = 80 * 1024 * 1024
MAX_PAGES = 350
MAX_BLOCKS = 1500
MAX_CHARS = 12000
EMAIL_RE = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.I)
PHONE_RE = re.compile(r"(?<!\d)(?:\+?\d[\d\s().-]{7,}\d)(?!\d)")
ID_RE = re.compile(r"(?<!\d)\d{8,18}(?!\d)")
MONEY_RE = re.compile(r"(?:Q\.?|GTQ|COP|USD|US\$|\$)\s*[\d.,]+", re.I)
PII_RE = re.compile(
    r"^(?:nombre(?:\s+del\s+cliente)?|cliente|asegurado|contratante|correo(?:\s+electr[oó]nico)?|email|"
    r"tel[eé]fono|celular|dpi|c[eé]dula|documento|nit|placa|intermediario|agente|direcci[oó]n|"
    r"fecha\s+de\s+nacimiento|cotizado\s+por)\s*[:\-]", re.I)
SECTION_PATTERNS = [
    ("datos_generales", ["datos personales", "datos del cliente", "datos de servicio", "datos del vehiculo", "datos del riesgo"]),
    ("formas_pago", ["formas de pago", "opciones de pago"]),
    ("seccion_1", ["seccion i", "seccion 1"]),
    ("seccion_2", ["seccion ii", "seccion 2"]),
    ("seccion_3", ["seccion iii", "seccion 3"]),
    ("coberturas_principales", ["coberturas principales"]),
    ("coberturas_adicionales", ["coberturas adicionales"]),
    ("beneficios_adicionales", ["beneficios adicionales"]),
    ("asistencia", ["asistencia vial", "beneficios de asistencia"]),
    ("pasos_contratacion", ["pasos para contratar"]),
    ("condiciones", ["condiciones", "importante"]),
    ("notas", ["observaciones", "notas"]),
    ("vigencia_agente", ["cotizacion valida", "datos agente"]),
]


def clean(v: Any) -> str: return str(v or "").strip()
def norm(v: Any) -> str:
    text = clean(v).lower().translate(str.maketrans("áéíóúüñ", "aeiouun"))
    return re.sub(r"[^a-z0-9]+", " ", text).strip()
def slug(v: Any) -> str: return norm(v).replace(" ", "_")
def now() -> str: return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""): h.update(chunk)
    return h.hexdigest()
def box(v: Any) -> list[float]:
    try: raw = list(v or [])[:4]
    except TypeError: raw = []
    raw += [0] * (4 - len(raw))
    return [round(float(x or 0), 2) for x in raw]
def pii_label(line: str) -> tuple[bool, bool, str]:
    text = clean(line); match = PII_RE.search(text)
    if not match: return False, False, ""
    parts = re.split(r"[:\-]", text, maxsplit=1)
    return True, len(parts) > 1 and bool(clean(parts[1])), clean(parts[0])
def redact_text(text: str, keep: bool) -> str:
    lines = [clean(x) for x in str(text or "").splitlines() if clean(x)]
    if keep: return "\n".join(lines)[:MAX_CHARS]
    out, redact_next = [], False
    for line in lines:
        sensitive, inline, label = pii_label(line)
        if redact_next and not sensitive:
            out.append("[valor_sensible_omitido]"); redact_next = False; continue
        if sensitive:
            out.append(f"{label}: [valor_sensible_omitido]"); redact_next = not inline; continue
        line = EMAIL_RE.sub("[correo_oculto]", line)
        line = PHONE_RE.sub("[numero_oculto]", line)
        if not MONEY_RE.search(line) and not re.search(r"\b(?:19|20)\d{2}\b", line):
            line = ID_RE.sub("[identificador_oculto]", line)
        out.append(line)
    return "\n".join(out)[:MAX_CHARS]
def section_key(title: str) -> str:
    value = norm(title)
    for key, patterns in SECTION_PATTERNS:
        if any(norm(p) in value for p in patterns): return key
    return slug(title) or "otra"


def text_block(raw: dict[str, Any]) -> tuple[str, list[float], list[str], float, bool]:
    lines, fonts, sizes, bold = [], [], [], False
    for line in raw.get("lines", []) or []:
        spans = line.get("spans", []) or []
        value = "".join(clean(s.get("text")) for s in spans).strip()
        if value: lines.append(value)
        for span in spans:
            font = clean(span.get("font")); size = float(span.get("size") or 0)
            if font:
                fonts.append(font); bold = bold or any(x in font.lower() for x in ["bold", "black", "semibold"])
            if size > 0: sizes.append(size)
    return "\n".join(lines), box(raw.get("bbox")), sorted(set(fonts))[:12], max(sizes or [0]), bold

def heading(text: str, size: float, median: float, bold: bool) -> bool:
    value = clean(text)
    if not value or len(value) > 180 or len(value.splitlines()) > 3: return False
    alpha = re.sub(r"[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]", "", value)
    upper = sum(c.isupper() for c in alpha) / max(1, len(alpha))
    return (median and size >= median * 1.23) or (bold and len(value) <= 100) or (upper >= .82 and len(alpha) >= 5)


def detect_dimensions(raw: str, hints: dict[str, Any]) -> dict[str, str]:
    text = norm(raw)
    country = clean(hints.get("pais") or hints.get("country")).upper()
    if not country:
        country = "GT" if ("guatemala" in text or re.search(r"\bq\.?\s*\d", raw, re.I)) else ("CO" if ("colombia" in text or " cop " in f" {text} ") else "")
    currency = clean(hints.get("moneda") or hints.get("currency")).upper() or ({"GT": "GTQ", "CO": "COP"}.get(country, ""))
    vehicle = clean(hints.get("tipoVehiculo") or hints.get("vehicleType"))
    if not vehicle:
        match = re.search(r"\bTipo\s*:\s*([^\n]{2,80})", raw, re.I)
        vehicle = clean(match.group(1)) if match else ""
    product, ramo = clean(hints.get("producto") or hints.get("product")), clean(hints.get("ramo"))
    if not product:
        if vehicle or any(x in text for x in ["seguro de automovil", "seguro de vehiculo", "datos del vehiculo", "valor comercial", "robo o hurto total"]):
            product, ramo = "Seguro de vehículo", ramo or "Vehículos"
        elif any(x in text for x in ["gastos medicos", "salud", "maternidad", "hospitalizacion"]):
            product, ramo = "Gastos Médicos", ramo or "Salud"
        elif "seguro de vida" in text: product, ramo = "Vida", ramo or "Vida"
    return {"pais": country, "moneda": currency, "ramo": ramo, "producto": product,
            "familiaProducto": clean(hints.get("familiaProducto")), "subtipoProducto": clean(hints.get("subtipoProducto")),
            "segmento": clean(hints.get("segmento")), "tipoRiesgo": clean(hints.get("tipoRiesgo")),
            "tipoVehiculo": vehicle, "usoVehiculo": clean(hints.get("usoVehiculo")), "plan": clean(hints.get("plan"))}


def insurer_candidates(raw: str, directory: list[dict[str, Any]]) -> list[dict[str, Any]]:
    haystack = f" {norm(raw)} "; tokens = set(haystack.split())
    generic = {"seguros", "seguro", "aseguradora", "compania", "sociedad", "anonima", "plus", "premium", "riesgo"}
    out = []
    for item in directory:
        names = [clean(item.get("nombre") or item.get("name"))] + [clean(x) for x in item.get("aliases", []) or []]
        best, matched = 0.0, ""
        for name in filter(None, names):
            n = norm(name)
            if f" {n} " in haystack: score = 98.0
            else:
                distinctive = {x for x in n.split() if x not in generic and len(x) >= 4}
                score = (len(distinctive & tokens) / len(distinctive) * 82.0) if distinctive else 0.0
            if score > best: best, matched = score, name
        if best >= 50:
            out.append({"id": clean(item.get("id") or item.get("aseguradoraId")), "name": clean(item.get("nombre") or item.get("name")),
                        "confidence": round(best, 2), "source": "directory_text_match",
                        "evidence": {"matchedName": matched, "containsRawPayload": False}})
    return sorted(out, key=lambda x: x["confidence"], reverse=True)[:8]


def tables(page: fitz.Page, number: int, keep: bool) -> list[dict[str, Any]]:
    try: found = list(page.find_tables().tables or [])[:20]
    except Exception: return []
    out = []
    for i, table in enumerate(found):
        try: rows = table.extract() or []
        except Exception: continue
        safe_rows = []
        for row in rows[:500]:
            cells = list(row or [])[:80]; sensitive_at = None
            for j, cell in enumerate(cells):
                if pii_label(clean(cell))[0]: sensitive_at = j; break
            safe_rows.append(["[valor_sensible_omitido]" if (sensitive_at is not None and j > sensitive_at and not keep and clean(cell)) else redact_text(clean(cell), keep)
                              for j, cell in enumerate(cells)])
        out.append({"id": f"p{number}_table_{i+1}", "kind": "table", "rows": safe_rows, "bbox": box(table.bbox),
                    "order": 10000 + i, "confidence": 78,
                    "sourceLocation": {"page": number, "block": f"table_{i+1}", "bbox": box(table.bbox)}})
    return out


def sections_from_pages(pages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    sections, active = [], None
    for page in pages:
        if page["blank"]: continue
        for block in sorted(page["blocks"], key=lambda x: x["order"]):
            title = clean(block.get("title") or block.get("text"))
            if block["kind"] == "heading" and title:
                active = {"id": f"section_{len(sections)+1}", "title": title, "key": section_key(title), "page": page["number"],
                          "order": len(sections), "fields": [], "sourceLocation": block["sourceLocation"]}
                sections.append(active); continue
            if active is None:
                active = {"id": f"section_{len(sections)+1}", "title": "Contenido general", "key": "datos_generales", "page": page["number"],
                          "order": len(sections), "fields": [], "sourceLocation": block["sourceLocation"]}
                sections.append(active)
            if block["kind"] == "table":
                for row in block.get("rows", []):
                    label = clean(row[0]) if row else "Fila"
                    value = row[1:] if len(row) > 2 else (row[1] if len(row) > 1 else "")
                    active["fields"].append({"label": label or "Fila", "value": value, "valueType": "fila_tabla", "order": len(active["fields"]),
                                             "confidence": block["confidence"], "sourceLocation": block["sourceLocation"]})
            elif clean(block.get("text")):
                active["fields"].append({"label": clean(block.get("title")) or "Contenido", "value": block["text"], "valueType": block["kind"],
                                         "order": len(active["fields"]), "confidence": block["confidence"], "sourceLocation": block["sourceLocation"]})
    return sections


def inspect_pdf(path: Path, purpose: str, include_sensitive: bool, directory: list[dict[str, Any]], hints: dict[str, Any]) -> dict[str, Any]:
    if not path.is_file(): raise ValueError("PDF_NOT_FOUND")
    if path.suffix.lower() != ".pdf": raise ValueError("PDF_EXTENSION_REQUIRED")
    if path.stat().st_size > MAX_FILE: raise ValueError("PDF_FILE_LIMIT_EXCEEDED")
    keep = purpose == "operational" and include_sensitive
    source_hash = sha256(path)
    doc = fitz.open(path)
    try:
        if doc.is_encrypted and not doc.authenticate(""): raise ValueError("PDF_ENCRYPTED")
        if doc.page_count > MAX_PAGES: raise ValueError("PDF_PAGE_LIMIT_EXCEEDED")
        raw_parts, pages, warnings = [], [], []
        for index in range(doc.page_count):
            page, number = doc.load_page(index), index + 1
            data = page.get_text("dict", sort=True)
            raw_blocks, font_sizes, image_blocks = [], [], []
            for raw in (data.get("blocks", []) or [])[:MAX_BLOCKS]:
                if int(raw.get("type", 0)) == 0:
                    text, bbox, fonts, size, bold = text_block(raw)
                    if text:
                        raw_blocks.append((text, bbox, fonts, size, bold)); raw_parts.append(text)
                        for line in raw.get("lines", []) or []:
                            font_sizes += [float(span.get("size") or 0) for span in line.get("spans", []) or [] if float(span.get("size") or 0) > 0]
                elif int(raw.get("type", 0)) == 1:
                    image_blocks.append({"id": f"p{number}_image_{len(image_blocks)+1}", "kind": "image", "title": "Imagen", "text": "",
                                         "bbox": box(raw.get("bbox")), "order": 20000 + len(image_blocks), "confidence": 100,
                                         "layout": {"width": raw.get("width", 0), "height": raw.get("height", 0)},
                                         "sourceLocation": {"page": number, "block": f"image_{len(image_blocks)+1}", "bbox": box(raw.get("bbox"))}})
            median = statistics.median(font_sizes) if font_sizes else 0.0
            blocks, redact_next = [], False
            for i, (raw_text, bbox, fonts, size, bold) in enumerate(raw_blocks):
                if redact_next and not keep:
                    safe = "[valor_sensible_omitido]"; redact_next = False
                else:
                    safe = redact_text(raw_text, keep)
                    lines = [clean(x) for x in raw_text.splitlines() if clean(x)]
                    if lines and not keep:
                        sensitive, inline, _ = pii_label(lines[-1]); redact_next = sensitive and not inline
                if not safe: continue
                is_head = heading(safe, size, median, bold)
                blocks.append({"id": f"p{number}_block_{i+1}", "kind": "heading" if is_head else "paragraph",
                               "title": safe if is_head else "", "text": "" if is_head else safe, "bbox": bbox, "order": i,
                               "confidence": 92 if is_head else 96, "layout": {"fonts": fonts, "maxFontSize": round(size, 2), "bold": bold},
                               "sourceLocation": {"page": number, "block": f"text_{i+1}", "bbox": bbox}})
            found_tables = tables(page, number, keep); blocks += found_tables + image_blocks
            blocks.sort(key=lambda x: (x.get("bbox", [0, 0])[1], x.get("bbox", [0, 0])[0], x.get("order", 0)))
            for order, item in enumerate(blocks): item["order"] = order
            raw_page = "\n".join(x[0] for x in raw_blocks); chars = len(re.sub(r"\s+", "", raw_page))
            sparse = chars < 80 and len(raw_blocks) <= 5 and not found_tables
            blank = chars == 0 or sparse
            if sparse and chars: warnings.append(f"SPARSE_PAGE:{number}")
            pages.append({"number": number, "width": round(page.rect.width, 2), "height": round(page.rect.height, 2),
                          "orientation": "landscape" if page.rect.width > page.rect.height else "portrait", "blank": blank,
                          "contentChars": chars, "blocks": [] if blank else blocks, "imageCount": len(image_blocks), "tableCount": len(found_tables),
                          "sourceLocation": {"mediaKind": "pdf", "page": number}})
        raw = "\n".join(raw_parts); dims = detect_dimensions(raw, hints); candidates = insurer_candidates(raw, directory); sections = sections_from_pages(pages)
        if not candidates: warnings.append("ASEGURADORA_REQUIERE_VALIDACION")
        if not dims["producto"]: warnings.append("PRODUCTO_REQUIERE_VALIDACION")
        if not sections: warnings.append("SECCIONES_REQUIEREN_VALIDACION")
        if any(p["blank"] for p in pages): warnings.append("PAGINAS_VACIAS_DETECTADAS")
        confidence = min(95, (72 if any(not p["blank"] for p in pages) else 0) + (10 if candidates and candidates[0]["confidence"] >= 85 else 0) + (8 if dims["producto"] else 0) + (5 if sections else 0))
        return {"schemaVersion": "orbit360.pdf.manifest.p07b.v1", "generatedAt": now(),
                "documentId": clean(hints.get("documentId")) or f"pdf_{source_hash[:16]}", "sourceHash": source_hash,
                "file": {"name": path.name, "extension": ".pdf", "mimeType": "application/pdf", "sizeBytes": path.stat().st_size,
                         "fileRef": clean(hints.get("fileRef")), "containsBytes": False, "containsBase64": False},
                "purpose": purpose, "includeSensitiveValues": keep, "pageCount": doc.page_count, "pages": pages, "sections": sections,
                "insurerCandidates": candidates, "dimensiones": dims, "confidence": confidence, "warnings": list(dict.fromkeys(warnings)),
                "parser": {"name": "pymupdf_deterministic", "version": clean(getattr(fitz, "VersionBind", "")), "ocrExecuted": False},
                "flags": {"containsRawPayload": False, "containsCustomerPayload": keep, "containsSecrets": False,
                          "embeddedContentExecuted": False, "externalLinksFollowed": False, "ocrExecuted": False},
                "writeAllowed": False, "requiresHumanValidation": True}
    finally:
        doc.close()


def load_json(path: str | None, fallback: Any) -> Any:
    return json.loads(Path(path).read_text(encoding="utf-8")) if path else fallback

def main() -> int:
    parser = argparse.ArgumentParser(description="Orbit 360 P0.7b PDF manifest extractor")
    parser.add_argument("input"); parser.add_argument("--output", "-o", required=True)
    parser.add_argument("--purpose", choices=["training", "operational"], default="training")
    parser.add_argument("--include-sensitive-values", action="store_true")
    parser.add_argument("--directory-json"); parser.add_argument("--hints-json")
    args = parser.parse_args()
    try:
        directory, hints = load_json(args.directory_json, []), load_json(args.hints_json, {})
        if not isinstance(directory, list): raise ValueError("DIRECTORY_JSON_ARRAY_REQUIRED")
        if not isinstance(hints, dict): raise ValueError("HINTS_JSON_OBJECT_REQUIRED")
        manifest = inspect_pdf(Path(args.input), args.purpose, args.include_sensitive_values, directory, hints)
        output = Path(args.output); output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps({"ok": True, "code": "PDF_MANIFEST_READY", "output": str(output), "documentId": manifest["documentId"],
                          "pageCount": manifest["pageCount"], "contentPages": sum(not p["blank"] for p in manifest["pages"]),
                          "blankPages": [p["number"] for p in manifest["pages"] if p["blank"]], "sections": len(manifest["sections"]),
                          "insurerCandidates": len(manifest["insurerCandidates"]), "writeAllowed": False}, ensure_ascii=False))
        return 0
    except Exception as exc:
        print(json.dumps({"ok": False, "code": clean(exc), "writeAllowed": False}, ensure_ascii=False), file=sys.stderr); return 1

if __name__ == "__main__": raise SystemExit(main())
