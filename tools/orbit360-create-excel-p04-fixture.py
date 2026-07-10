#!/usr/bin/env python3
"""Genera un XLSM sintético y ficticio para smokes P0.4."""
from __future__ import annotations

import argparse
import zipfile
from pathlib import Path

CONTENT_TYPES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
</Types>"""
WORKBOOK = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <workbookPr date1904="0"/><sheets>
    <sheet name="Datos Cotizador" sheetId="1" r:id="rId1"/>
    <sheet name="Tarifas Autos" sheetId="2" r:id="rId2"/>
    <sheet name="Cálculos Internos" sheetId="3" state="veryHidden" r:id="rId3"/>
    <sheet name="Cotización" sheetId="4" r:id="rId4"/>
  </sheets>
  <definedNames>
    <definedName name="TasaBase" localSheetId="1">'Tarifas Autos'!$B$2</definedName>
    <definedName name="PrimaMinima" localSheetId="1">'Tarifas Autos'!$B$3</definedName>
    <definedName name="_xlnm.Print_Area" localSheetId="3">'Cotización'!$A$1:$N$68</definedName>
    <definedName name="_xlnm.Print_Titles" localSheetId="3">'Cotización'!$1:$3</definedName>
  </definedNames><calcPr calcMode="manual"/>
</workbook>"""
RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet4.xml"/>
</Relationships>"""
SHEET1 = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:H40"/>
<sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Dato ficticio no exportable</t></is></c></row></sheetData>
<dataValidations count="8"><dataValidation type="list" sqref="A2"/><dataValidation type="list" sqref="A3"/></dataValidations></worksheet>"""
SHEET2 = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:J250"/><sheetData>
<row r="2"><c r="A2"><v>1</v></c><c r="B2"><v>0.035</v></c><c r="C2"><f>IF(B2&gt;0,B2,0)</f><v>0.035</v></c></row>
<row r="3"><c r="A3"><v>2</v></c><c r="B3"><v>2500</v></c><c r="C3"><f>ROUND(B3*1.05,2)</f><v>2625</v></c></row>
</sheetData></worksheet>"""
SHEET3 = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:Z800"/><sheetData>
<row r="1"><c r="A1"><f>INDIRECT(&quot;B2&quot;)</f><v>1</v></c></row></sheetData></worksheet>"""
SHEET4 = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:N68"/><sheetData>
<row r="1"><c r="A1"><f>SUM('Tarifas Autos'!B2:B3)</f><v>2500.035</v></c></row></sheetData>
<pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5"/><pageSetup paperSize="1" orientation="portrait" fitToWidth="1" fitToHeight="2"/>
<headerFooter><oddHeader>Cotización ficticia</oddHeader><oddFooter>Página &amp;P de &amp;N</oddFooter></headerFooter></worksheet>"""


def create_fixture(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", CONTENT_TYPES)
        archive.writestr("xl/workbook.xml", WORKBOOK)
        archive.writestr("xl/_rels/workbook.xml.rels", RELS)
        archive.writestr("xl/worksheets/sheet1.xml", SHEET1)
        archive.writestr("xl/worksheets/sheet2.xml", SHEET2)
        archive.writestr("xl/worksheets/sheet3.xml", SHEET3)
        archive.writestr("xl/worksheets/sheet4.xml", SHEET4)
        archive.writestr("xl/vbaProject.bin", b"FICTITIOUS_VBA_NOT_EXECUTED")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    create_fixture(args.output)
    print(args.output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())