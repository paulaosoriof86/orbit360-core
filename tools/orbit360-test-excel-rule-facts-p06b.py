import importlib.util, json, sys, tempfile, zipfile
from pathlib import Path

tool_path=Path(__file__).with_name('orbit360-extract-excel-rule-facts-p06b.py')
spec=importlib.util.spec_from_file_location('orbit360_excel_rule_facts_p06b',tool_path)
mod=importlib.util.module_from_spec(spec);sys.modules[spec.name]=mod;spec.loader.exec_module(mod)

def fixture(path:Path):
    files={
      '[Content_Types].xml':'<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
      '_rels/.rels':'<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      'xl/workbook.xml':'<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Cotización Tarifas" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm.Print_Area" localSheetId="0">Tarifas!$A$1:$D$10</definedName></definedNames></workbook>',
      'xl/_rels/workbook.xml.rels':'<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
      'xl/sharedStrings.xml':'<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="11" uniqueCount="11"><si><t>PLAN DEMO</t></si><si><t>Tasa</t></si><si><t>Prima mínima</t></si><si><t>Asistencia</t></si><si><t>Pagos</t></si><si><t>Recargo</t></si><si><t>Cliente:</t></si><si><t>Persona secreta</t></si><si><t>Tipo de vehículo</t></si><si><t>Automóvil</t></si><si><t>Cotización</t></si></sst>',
      'xl/styles.xml':'<?xml version="1.0"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="0.00%"/></numFmts><cellXfs count="2"><xf numFmtId="0"/><xf numFmtId="164"/></cellXfs></styleSheet>',
      'xl/worksheets/sheet1.xml':'<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:D10"/><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c></row><row r="2"><c r="A2" t="s"><v>1</v></c><c r="B2" s="1"><v>0.032</v></c></row><row r="3"><c r="A3" t="s"><v>2</v></c><c r="B3"><v>1800</v></c></row><row r="4"><c r="A4" t="s"><v>3</v></c><c r="B4"><v>350</v></c></row><row r="5"><c r="A5" t="s"><v>4</v></c><c r="B5"><v>8</v></c><c r="C5" t="s"><v>5</v></c><c r="D5" s="1"><v>0.0537</v></c></row><row r="6"><c r="A6" t="s"><v>6</v></c><c r="B6" t="s"><v>7</v></c></row><row r="7"><c r="A7" t="s"><v>8</v></c><c r="B7" t="s"><v>9</v></c></row><row r="8"><c r="A8" t="s"><v>10</v></c></row><row r="9"><c r="A9" t="s"><v>2</v></c><c r="B9"><f>MAX(B2*100000,B3)</f><v>3200</v></c></row></sheetData></worksheet>'
    }
    with zipfile.ZipFile(path,'w',zipfile.ZIP_DEFLATED) as archive:
        for name,data in files.items():archive.writestr(name,data)

with tempfile.TemporaryDirectory() as directory:
    path=Path(directory)/'fixture.xlsx';fixture(path)
    result=mod.inspect_workbook(path,'training',{'tenantId':'tenant-demo','aseguradoraId':'insurer-demo','pais':'GT','moneda':'GTQ','ramo':'Vehículos','producto':'Seguro de vehículo'})
    assert result['summary']['numericFactCount']>=5
    assert result['summary']['piiRedactedCells']>=1
    assert result['outputRoutes'] and result['candidateGroups']
    assert any(f['factType']=='rate' and abs(f['numericValue']-0.032)<1e-9 for f in result['facts'])
    assert any(f['factType']=='minimum_premium' and f['numericValue']==1800 for f in result['facts'])
    assert any(f['factType']=='assistance' and f['numericValue']==350 for f in result['facts'])
    assert any(f['formula'] for f in result['facts'])
    assert 'Persona secreta' not in json.dumps(result)
    assert result['flags']['writeAllowed'] is False and result['flags']['requiresSecondGateForEnablement'] is True
print('OK orbit360-test-excel-rule-facts-p06b')
