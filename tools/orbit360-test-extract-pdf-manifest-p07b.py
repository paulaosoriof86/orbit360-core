#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import json
import tempfile
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "tools" / "orbit360-extract-pdf-manifest-p07b.py"
spec = importlib.util.spec_from_file_location("orbit_pdf_manifest_p07b", MODULE_PATH)
module = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(module)


def assert_true(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def make_pdf(path: Path, insurer: str, vehicle_type: str) -> None:
    doc = fitz.open()
    page1 = doc.new_page(width=595, height=842)
    y = 55
    rows = [
        ("COTIZACIÓN DE SEGURO DE VEHÍCULO", 18),
        (insurer, 14),
        ("Cliente:", 10),
        ("Persona Ficticia", 10),
        ("Teléfono:", 10),
        ("phone-demo", 10),
        (f"Tipo: {vehicle_type}", 10),
        ("Suma Asegurada: Q 35,000.00", 10),
        ("FORMAS DE PAGO", 15),
        ("Pago de contado Q 3,000.00", 10),
        ("COBERTURAS PRINCIPALES", 15),
        ("Daños propios 3% / mínimo", 10),
    ]
    for text, size in rows:
        page1.insert_text((45, y), text, fontsize=size)
        y += size + 8

    sparse = doc.new_page(width=595, height=842)
    sparse.insert_text((40, 35), "REF-HEADER", fontsize=8)
    sparse.insert_text((40, 810), "FOOTER", fontsize=8)

    page3 = doc.new_page(width=595, height=842)
    page3.insert_text((45, 55), "COBERTURAS ADICIONALES", fontsize=15)
    page3.insert_text((45, 85), "Deducible cero: Amparado", fontsize=10)
    page3.insert_text((45, 120), "IMPORTANTE", fontsize=15)
    page3.insert_text((45, 150), "Territorio cubierto y condiciones del producto.", fontsize=10)
    doc.save(path)
    doc.close()


def walk_strings(value):
    if isinstance(value, dict):
        for item in value.values():
            yield from walk_strings(item)
    elif isinstance(value, list):
        for item in value:
            yield from walk_strings(item)
    elif isinstance(value, str):
        yield value


with tempfile.TemporaryDirectory() as temp_dir:
    temp = Path(temp_dir)
    pdf_a = temp / "quote-a.pdf"
    pdf_b = temp / "quote-b.pdf"
    make_pdf(pdf_a, "Compañía Alfa", "Automóvil")
    make_pdf(pdf_b, "Compañía Beta", "Microbús")
    directory = [
        {"id": "insurer-a", "nombre": "Compañía Alfa", "aliases": ["Alfa Seguros"]},
        {"id": "insurer-b", "nombre": "Compañía Beta", "aliases": ["Beta Seguros"]},
    ]

    manifest_a = module.inspect_pdf(pdf_a, "training", False, directory, {"documentId": "doc-a"})
    manifest_b = module.inspect_pdf(pdf_b, "training", False, directory, {"documentId": "doc-b"})

    assert_true(manifest_a["documentId"] == "doc-a", "Debe conservar documentId del wire")
    assert_true(manifest_a["insurerCandidates"][0]["id"] == "insurer-a", "Debe resolver aseguradora A")
    assert_true(manifest_b["insurerCandidates"][0]["id"] == "insurer-b", "Debe resolver aseguradora B")
    assert_true(manifest_a["dimensiones"]["producto"] == "Seguro de vehículo", "Debe inferir producto")
    assert_true(manifest_a["dimensiones"]["tipoVehiculo"] == "Automóvil", "Debe detectar automóvil")
    assert_true(manifest_b["dimensiones"]["tipoVehiculo"] == "Microbús", "Debe separar microbús")
    assert_true([p["number"] for p in manifest_a["pages"] if p["blank"]] == [2], "Debe detectar página sparse")
    assert_true(manifest_a["sections"], "Debe proponer secciones")
    assert_true(manifest_a["flags"]["containsRawPayload"] is False, "No debe devolver raw payload")
    assert_true(manifest_a["flags"]["embeddedContentExecuted"] is False, "No debe ejecutar contenido")
    assert_true(manifest_a["writeAllowed"] is False and manifest_a["requiresHumanValidation"], "Debe conservar dry-run")

    serialized = json.dumps(manifest_a, ensure_ascii=False)
    assert_true("Persona Ficticia" not in serialized and "phone-demo" not in serialized, "Training debe redactar PII")
    assert_true("Q 35,000.00" in serialized, "Debe conservar valor técnico no sensible")
    assert_true(manifest_a["file"]["containsBytes"] is False, "No debe incluir bytes")

    operational = module.inspect_pdf(pdf_a, "operational", True, directory, {"documentId": "doc-op"})
    operational_text = "\n".join(walk_strings(operational))
    assert_true("Persona Ficticia" in operational_text, "Operational explícito puede conservar datos del caso")
    assert_true(operational["flags"]["containsCustomerPayload"] is True, "Operational debe declarar payload")

    assert_true(module.insurer_candidates("Documento sin nombre claro", directory) == [], "No debe inventar aseguradora")

print("OK orbit360-test-extract-pdf-manifest-p07b")
