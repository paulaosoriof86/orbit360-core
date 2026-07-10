#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import json
import tempfile
import zipfile
from pathlib import Path

SCRIPT = Path(__file__).with_name("orbit360-inspect-excel-p04.py")
spec = importlib.util.spec_from_file_location("orbit360_inspect_excel_p04", SCRIPT)
module = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(module)

CONTENT_TYPES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
</Types>"""
WORKBOOK = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <workbookPr date1904="0"/>
  <workbookProtection lockStructure="1"/>
  <sheets>
    <sheet name="Cotización" sheetId="1" r:id="rId1"/>
    <sheet name="Cálculos Internos" sheetId="2" state="veryHidden" r:id="rId2"/>
  </sheets>
  <definedNames>
    <definedName name="_xlnm.Print_Area" localSheetId="0">'Cotización'!$A$1:$N$68</definedName>
    <definedName name="_xlnm.Print_Titles" localSheetId="0">'Cotización'!$1:$3</definedName>
    <definedName name="TasaBase" localSheetId="1">'Cálculos Internos'!$B$2</definedName>
    <definedName name="Externo">'[TarifasExternas.xlsx]Tasas'!$A$1</definedName>
  </definedNames>
  <externalReferences><externalReference r:id="rId9"/></externalReferences>
  <calcPr calcMode="manual"/>
</workbook>"""
WORKBOOK_RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/externalLink" Target="externalLinks/externalLink1.xml"/>
</Relationships>"""
SHEET1 = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="A1:N68"/>
  <sheetData>
    <row r="1"><c r="A1" t="inlineStr"><is><t>Cliente Real No Exportar</t></is></c></row>
    <row r="2"><c r="B2"><v>100</v></c><c r="C2"><f>IF(B2&gt;0,SUM(B2,10),0)</f><v>110</v></c></row>
    <row r="3"><c r="C3" t="e"><f>VLOOKUP(A3,Tabla,2,FALSE)</f><v>#N/A</v></c></row>
  </sheetData>
  <mergeCells count="1"><mergeCell ref="A1:N2"/></mergeCells>
  <conditionalFormatting sqref="B2:C3"><cfRule type="cellIs" priority="1" operator="greaterThan"><formula>0</formula></cfRule></conditionalFormatting>
  <dataValidations count="2"><dataValidation type="list" sqref="A4"/><dataValidation type="list" sqref="A5"/></dataValidations>
  <sheetProtection sheet="1"/>
  <printOptions horizontalCentered="1"/>
  <pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>
  <pageSetup paperSize="1" orientation="portrait" fitToWidth="1" fitToHeight="2"/>
  <headerFooter><oddHeader>Aseguradora</oddHeader><oddFooter>Página &amp;P de &amp;N</oddFooter></headerFooter>
  <tableParts count="1"><tablePart r:id="rIdTable1"/></tableParts>
</worksheet>"""
SHEET1_RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdTable1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table1.xml"/>
</Relationships>"""
SHEET2 = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:Z800"/>
  <sheetData><row r="1"><c r="A1"><f>INDIRECT(&quot;B2&quot;)</f><v>1</v></c></row></sheetData>
</worksheet>"""
TABLE1 = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="1" name="TablaCotizacion" displayName="TablaCotizacion" ref="A1:C3"/>"""
CONNECTIONS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<connections xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><connection id="1" name="ConexionExterna" type="5"/></connections>"""
EXTERNAL_LINK = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<externalLink xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"/>"""


def build_fixture(path: Path) -> None:
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", CONTENT_TYPES)
        archive.writestr("xl/workbook.xml", WORKBOOK)
        archive.writestr("xl/_rels/workbook.xml.rels", WORKBOOK_RELS)
        archive.writestr("xl/worksheets/sheet1.xml", SHEET1)
        archive.writestr("xl/worksheets/_rels/sheet1.xml.rels", SHEET1_RELS)
        archive.writestr("xl/worksheets/sheet2.xml", SHEET2)
        archive.writestr("xl/tables/table1.xml", TABLE1)
        archive.writestr("xl/connections.xml", CONNECTIONS)
        archive.writestr("xl/externalLinks/externalLink1.xml", EXTERNAL_LINK)
        archive.writestr("xl/vbaProject.bin", b"VBA_PAYLOAD_MUST_NOT_LEAK")


def assert_true(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    workbook = root / "Cotizador Demo.xlsm"
    build_fixture(workbook)
    report = module.inspect_workbook(workbook)
    assert_true(report["ok"] and report["code"] == "INVENTORY_READY", "Debe inventariar XLSM")
    assert_true(report["format"] == "xlsm" and report["hasMacros"], "Debe detectar macros")
    assert_true(not report["macrosExecuted"] and not report["formulasExecuted"], "No debe ejecutar contenido")
    assert_true(report["externalLinkCount"] == 1 and report["connectionCount"] == 1, "Debe detectar vínculos/conexiones")
    assert_true(report["protectedWorkbook"], "Debe detectar protección de libro")
    assert_true(len(report["worksheets"]) == 2, "Debe inventariar dos hojas")
    quote = report["worksheets"][0]
    calc = report["worksheets"][1]
    assert_true(quote["name"] == "Cotización" and quote["usedRange"] == "A1:N68", "Debe conservar hoja/rango")
    assert_true(quote["rowCount"] == 68 and quote["columnCount"] == 14, "Debe calcular dimensiones")
    assert_true(quote["formulaCount"] == 2 and quote["formulaErrorCount"] == 1, "Debe contar fórmulas/errores")
    assert_true(set(quote["formulaFunctions"]) >= {"IF", "SUM", "VLOOKUP"}, "Debe inventariar funciones")
    assert_true(quote["dataValidationCount"] == 2 and quote["conditionalFormatCount"] == 1, "Debe contar reglas visuales")
    assert_true(quote["mergedRanges"] == ["A1:N2"] and quote["tableNames"] == ["TablaCotizacion"], "Debe inventariar merges/tablas")
    assert_true(quote["print"]["areas"] == ["'Cotización'!$A$1:$N$68"], "Debe conservar área de impresión")
    assert_true(quote["print"]["titlesRows"] == "'Cotización'!$1:$3", "Debe conservar títulos repetidos")
    assert_true(quote["print"]["orientation"] == "portrait" and quote["print"]["fitToWidth"] == 1, "Debe conservar página")
    assert_true(quote["protected"], "Debe detectar protección de hoja")
    assert_true(calc["visibility"] == "veryHidden" and "INDIRECT" in calc["formulaFunctions"], "Debe detectar hoja muy oculta/función volátil")
    assert_true(report["definedNames"][3]["refersTo"] == "[referencia_externa_omitida]", "Debe ocultar referencia externa")
    assert_true("MACROS_DETECTED_NOT_EXECUTED" in report["warnings"], "Debe advertir macros")
    assert_true("EXTERNAL_LINKS_BLOCKED" in report["warnings"] and "EXTERNAL_CONNECTIONS_BLOCKED" in report["warnings"], "Debe advertir externos")
    assert_true(report["containsCellValues"] is False and report["containsBinaryPayload"] is False, "No debe exportar payload")
    serialized = json.dumps(report, ensure_ascii=False)
    assert_true("Cliente Real No Exportar" not in serialized, "No debe exportar valores de celda")
    assert_true("VBA_PAYLOAD_MUST_NOT_LEAK" not in serialized, "No debe exportar VBA")
    assert_true(str(root) not in serialized, "No debe exportar ruta local")
    assert_true(len(report["workbookFingerprint"]) == 64 and len(report["sourceHash"]) == 64, "Debe generar fingerprints")

    unsupported = root / "legacy.xls"
    unsupported.write_bytes(b"legacy")
    invalid = module.inspect_workbook(unsupported)
    assert_true(not invalid["ok"] and invalid["code"] == "UNSUPPORTED_FORMAT", "XLS legacy debe quedar pendiente honesto")

print("OK orbit360-test-inspect-excel-p04")