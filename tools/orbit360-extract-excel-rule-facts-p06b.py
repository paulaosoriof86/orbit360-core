#!/usr/bin/env python3
"""Orbit 360 P0.6b: extracción determinística y sanitizada de hechos tarifarios XLSX/XLSM.

Lee XML OOXML y valores cacheados sin ejecutar fórmulas, macros, vínculos ni Excel.
Emite candidatos con evidencia hoja/rango; nunca valida, escribe ni habilita reglas.
"""
from __future__ import annotations
import argparse, hashlib, json, re, sys, zipfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Any
from xml.etree import ElementTree as ET

M='http://schemas.openxmlformats.org/spreadsheetml/2006/main'; R='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
NS={'m':M,'r':R}; SUPPORTED={'.xlsx','.xlsm'}
LIMIT_FILE=150*1024*1024; LIMIT_XML=80*1024*1024; LIMIT_UNZIPPED=750*1024*1024; LIMIT_ENTRIES=20000; LIMIT_SHEETS=500; LIMIT_FACTS=8000
EMAIL=re.compile(r'[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}',re.I); PHONE=re.compile(r'(?<!\d)(?:\+?\d[\d\s().-]{7,}\d)(?!\d)'); LONG_ID=re.compile(r'(?<!\d)\d{8,18}(?!\d)')
PII=re.compile(r'\b(?:cliente|asegurado|contratante|nombre(?:\s+del\s+cliente)?|correo|email|tel[eé]fono|celular|dpi|c[eé]dula|documento|nit|placa|chasis|motor|direcci[oó]n|fecha\s+de\s+nacimiento|intermediario|agente|cotizado\s+por)\b',re.I)
PATTERNS=[
 ('minimum_premium',r'prima\s*(?:neta\s*)?m[ií]nim|m[ií]nim[oa].*prima'),('base_premium',r'prima\s*neta'),('total_premium',r'prima\s*(?:total|anual)|total\s*(?:a\s*pagar|prima)'),
 ('issuance_expense',r'gastos?\s*(?:de\s*)?emisi[oó]n'),('expedition_expense',r'gastos?\s*(?:de\s*)?expedici[oó]n'),('tax',r'\biva\b|i\.v\.a|impuesto'),('assistance',r'asistencia'),
 ('financing_surcharge',r'recargo|fraccionamiento'),('installment',r'cuotas?|pagos?|contado|visa\s*cuotas?|visacuotas|neo\s*cuotas?|credicuotas'),('rate',r'\btasa\b|\btarifa\b|porcentaje'),
 ('deductible',r'deducible'),('discount',r'descuento'),('maternity',r'maternidad'),('dental',r'dental|odontol'),('age_band',r'\bedad\b|rango\s*de\s*edad|antig[uü]edad'),
 ('gender',r'hombre|mujer|masculino|femenino|sexo'),('plan',r'\bplan\b'),('vehicle_type',r'autom[oó]vil|camioneta|pick\s*up|pickup|microb[uú]s|moto(?:cicleta)?|cami[oó]n|bus|cabezal|panel|veh[ií]culo'),
 ('usage',r'uso\s*(?:del\s*)?veh[ií]culo|particular|comercial|taxi|uber|plataforma'),('coverage',r'cobertura|secci[oó]n\s*(?:i{1,3}|[123])|beneficio|exclusi[oó]n'),('output',r'cotizaci[oó]n|impresi[oó]n|formato\s*de\s*salida')]
PATTERNS=[(k,re.compile(p,re.I)) for k,p in PATTERNS]
NUMERIC={'minimum_premium','base_premium','total_premium','issuance_expense','expedition_expense','tax','assistance','financing_surcharge','installment','rate','deductible','discount','maternity','dental','age_band'}
DEFAULT_FMT={0:'General',1:'0',2:'0.00',3:'#,##0',4:'#,##0.00',9:'0%',10:'0.00%',14:'mm-dd-yy',49:'@'}

def clean(v:Any)->str:return str(v or '').strip()
def norm(v:Any)->str:return re.sub(r'[^a-z0-9]+',' ',clean(v).lower().translate(str.maketrans('áéíóúüñ','aeiouun'))).strip()
def slug(v:Any)->str:return norm(v).replace(' ','_')
def now()->str:return datetime.now(timezone.utc).isoformat().replace('+00:00','Z')
def uniq(seq):
 out=[]; seen=set()
 for x in seq:
  if x in (None,''):continue
  k=json.dumps(x,ensure_ascii=False,sort_keys=True) if isinstance(x,(dict,list)) else str(x)
  if k not in seen:seen.add(k);out.append(x)
 return out
def sha_file(path:Path)->str:
 h=hashlib.sha256()
 with path.open('rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
def sha_text(*parts)->str:
 h=hashlib.sha256()
 for x in parts:h.update(str(x).encode());h.update(b'\n')
 return h.hexdigest()
def local(tag):return tag.rsplit('}',1)[-1]
def resolve(base,target):
 parts=[]
 for p in PurePosixPath(base).parent.joinpath(target).parts:
  if p in ('','.'):continue
  if p=='..':
   if parts:parts.pop()
  else:parts.append(p)
 return '/'.join(parts)
def validate_zip(z):
 info=z.infolist()
 if len(info)>LIMIT_ENTRIES:raise ValueError('ARCHIVE_ENTRY_LIMIT_EXCEEDED')
 if sum(max(0,x.file_size) for x in info)>LIMIT_UNZIPPED:raise ValueError('ARCHIVE_UNCOMPRESSED_LIMIT_EXCEEDED')
 for x in info:
  p=PurePosixPath(x.filename)
  if p.is_absolute() or '..' in p.parts:raise ValueError('ARCHIVE_UNSAFE_PATH')
def xml(z,name):
 try:i=z.getinfo(name)
 except KeyError:return None
 if i.file_size>LIMIT_XML:raise ValueError('XML_ENTRY_LIMIT_EXCEEDED:'+name)
 data=z.read(i)
 if b'<!DOCTYPE' in data[:4096].upper() or b'<!ENTITY' in data[:4096].upper():raise ValueError('XML_DTD_FORBIDDEN:'+name)
 try:return ET.fromstring(data)
 except ET.ParseError as e:raise ValueError('XML_INVALID:'+name) from e
def rels(z,path,base):
 root=xml(z,path); out={}
 if root is None:return out
 for n in root:
  if local(n.tag)=='Relationship':out[n.attrib.get('Id','')]={'type':n.attrib.get('Type',''),'target':resolve(base,n.attrib.get('Target','')),'mode':n.attrib.get('TargetMode','')}
 return out
def col_num(reference):
 m=re.match(r'\$?([A-Z]+)',reference.upper()); n=0
 if not m:return 0
 for c in m.group(1):n=n*26+ord(c)-64
 return n
def col_letters(n):
 s=''
 while n:n,r=divmod(n-1,26);s=chr(65+r)+s
 return s
def rc(reference):
 m=re.match(r'\$?([A-Z]+)\$?(\d+)',reference.upper());return (int(m.group(2)),col_num(m.group(1))) if m else (0,0)
def ref(r,c):return f'{col_letters(c)}{r}'

def shared(z):
 root=xml(z,'xl/sharedStrings.xml'); out=[]
 if root is None:return out
 for si in root.findall('m:si',NS):out.append(''.join((n.text or '') for n in si.iter(f'{{{M}}}t')))
 return out
def style_info(z):
 root=xml(z,'xl/styles.xml'); formats=dict(DEFAULT_FMT); xfs=[]
 if root is None:return formats,xfs
 for n in root.findall('.//m:numFmt',NS):
  try:formats[int(n.attrib.get('numFmtId','0'))]=n.attrib.get('formatCode','')
  except ValueError:pass
 parent=root.find('m:cellXfs',NS)
 if parent is not None:
  for n in parent.findall('m:xf',NS):
   try:xfs.append(int(n.attrib.get('numFmtId','0')))
   except ValueError:xfs.append(0)
 return formats,xfs
def defined_names(root):
 out=[]; p=root.find('m:definedNames',NS) if root is not None else None
 if p is None:return out
 for i,n in enumerate(p.findall('m:definedName',NS)[:2000]):
  raw=clean(n.text); external=bool(re.search(r'\[[^]]+\]',raw)) or 'file:///' in raw.lower()
  out.append({'id':f'name_{i+1}','name':clean(n.attrib.get('name')),'sheetIndex':int(n.attrib['localSheetId']) if n.attrib.get('localSheetId','').isdigit() else None,'refersTo':'[referencia_externa_omitida]' if external else raw[:500],'externalReference':external})
 return out
def print_areas(names,index):return [x['refersTo'] for x in names if x['sheetIndex']==index and x['name']=='_xlnm.Print_Area' and not x['externalReference']]
def calc_props(root):
 n=root.find('m:calcPr',NS) if root is not None else None
 return {'mode':n.attrib.get('calcMode','') if n is not None else '','fullCalcOnLoad':n is not None and n.attrib.get('fullCalcOnLoad') in ('1','true')}

def sanitize_text(v,keep=False):
 s=clean(v)[:1000]; sensitive=bool(PII.search(s))
 if keep:return s,False
 if sensitive:
  if ':' in s:return s.split(':',1)[0].strip()+': [valor_sensible_omitido]',True
  return '[valor_sensible_omitido]',True
 s=EMAIL.sub('[correo_oculto]',s);s=PHONE.sub('[numero_oculto]',s)
 if not re.search(r'(?:Q\.?|GTQ|COP|USD|US\$|\$)\s*[\d.,]+',s,re.I):s=LONG_ID.sub('[identificador_oculto]',s)
 return s,s!=clean(v)
def num(v):
 if isinstance(v,(int,float)):return v
 s=clean(v).replace(' ','')
 if not s:return None
 s=re.sub(r'[^\d,.-]','',s)
 if ',' in s and '.' in s:s=s.replace('.','').replace(',','.') if s.rfind(',')>s.rfind('.') else s.replace(',','')
 elif ',' in s:s=s.replace(',','.') if len(s.rsplit(',',1)[-1])<=2 else s.replace(',','')
 try:
  x=float(s);return int(x) if x.is_integer() else x
 except (TypeError,ValueError):return None

@dataclass
class Cell:
 ref:str;row:int;col:int;text:str;value:Any;number:float|int|None;formula:str;fmt:str;kind:str;pii:bool=False

def read_cell(node,strings,formats,xfs):
 address=node.attrib.get('r','');r,c=rc(address);typ=node.attrib.get('t','');style=int(node.attrib.get('s','0') or 0);fmt=formats.get(xfs[style] if style<len(xfs) else 0,'General')
 f=node.find('m:f',NS);formula=clean(f.text) if f is not None else '';v=node.find('m:v',NS);raw=clean(v.text) if v is not None else '';inline=node.find('m:is',NS);text=''
 if typ=='s' and raw.isdigit() and int(raw)<len(strings):text=strings[int(raw)]
 elif typ=='inlineStr' and inline is not None:text=''.join(clean(x.text) for x in inline.iter(f'{{{M}}}t'))
 elif typ in ('str','e','b'):text=raw
 number=num(raw) if typ not in ('s','inlineStr','str','e') else None
 if not text and number is not None:text=str(number)
 return Cell(address,r,c,text,raw if raw!='' else text,number,formula,fmt,typ)
def fact_types(text):return [k for k,p in PATTERNS if p.search(clean(text))]
def dimensions(text,hints):
 t=norm(text);country=clean(hints.get('pais')).upper() or ('GT' if 'guatemala' in t or ' quetzal' in t else ('CO' if 'colombia' in t else ''));currency=clean(hints.get('moneda')).upper() or {'GT':'GTQ','CO':'COP'}.get(country,'')
 product=clean(hints.get('producto'));ramo=clean(hints.get('ramo'));vehicle=clean(hints.get('tipoVehiculo'));plan=clean(hints.get('plan'));usage=clean(hints.get('usoVehiculo'))
 if not product:
  if any(x in t for x in ('gastos medicos','salud','maternidad','hospitalizacion')):product='Gastos Médicos';ramo=ramo or 'Salud'
  elif any(x in t for x in ('vehiculo','automovil','microbus','moto','camioneta')):product='Seguro de vehículo';ramo=ramo or 'Vehículos'
 if not vehicle:
  for label in ('Microbús','Motocicleta','Pick Up','Camión','Bus','Automóvil','Camioneta'):
   if norm(label) in t:vehicle=label;break
 if not usage:usage='Comercial' if ' comercial' in ' '+t else ('Particular' if 'particular' in t else '')
 m=re.search(r'\bplan\s+([a-z0-9]+)',t);plan=plan or (('Plan '+m.group(1).upper()) if m else '')
 return {'pais':country,'moneda':currency,'ramo':ramo,'producto':product,'familiaProducto':clean(hints.get('familiaProducto')),'subtipoProducto':clean(hints.get('subtipoProducto')),'segmento':clean(hints.get('segmento')),'tipoRiesgo':clean(hints.get('tipoRiesgo')),'tipoVehiculo':vehicle,'usoVehiculo':usage,'plan':plan}
def nearby(cells,label):
 out=[]
 for d in range(1,9):
  for pos in ((label.row,label.col+d),(label.row+d,label.col)):
   x=cells.get(pos)
   if x and (x.number is not None or x.formula):out.append(x)
  if out:return out
 return out
def inline_value(text,ft):
 vals=[]
 for m in re.finditer(r'(?<!\d)(\d+(?:[.,]\d+)?)\s*%',text):vals.append(('rate',float(m.group(1).replace(',','.'))/100))
 for m in re.finditer(r'(?:Q\.?|GTQ|COP|USD|US\$|\$)\s*([\d.,]+)',text,re.I):vals.append(('amount',num(m.group(1))))
 if not vals:
  for m in re.finditer(r'(?<![\d.])(\d+(?:[.,]\d+)?)(?![\d.])',text):vals.append(('number',num(m.group(1))))
 if not vals:return None
 if ft in ('rate','tax','financing_surcharge','discount'):return next((v for k,v in vals if k=='rate'),vals[0][1])
 if ft in ('minimum_premium','base_premium','total_premium','issuance_expense','expedition_expense','assistance','dental','maternity'):return next((v for k,v in vals if k=='amount'),vals[0][1])
 return vals[0][1]
def classify_value(ft,cell):
 if cell is None:return 'marker',''
 fmt=cell.fmt.lower();txt=cell.text
 if ft in ('rate','tax','financing_surcharge','discount','deductible') and ('%' in fmt or '%' in txt):return 'rate','ratio'
 if ft in ('installment','age_band'):return 'number','count_or_range'
 return 'amount','currency_or_number'
def make_fact(doc,sheet,label,cell,ft,dims):
 kind,unit=classify_value(ft,cell);iv=inline_value(label.text,ft) if cell is None else None;value=cell.number if cell and cell.number is not None else (iv if iv is not None else (cell.text if cell else label.text));nr=value if isinstance(value,(int,float)) else None
 if cell is None and nr is not None:kind='rate' if ft in ('rate','tax','financing_surcharge','discount') and nr<=1 else ('number' if ft in ('installment','age_band') else 'amount')
 if kind=='rate' and nr is not None and nr>1:nr=nr/100
 evidence_ref=cell.ref if cell else label.ref
 return {'id':'excel_fact_'+sha_text(doc,sheet,label.ref,evidence_ref,ft)[:18],'factType':ft,'label':label.text,'value':value,'numericValue':nr,'valueKind':kind,'unit':unit,'formula':cell.formula if cell else '','numberFormat':cell.fmt if cell else '','sectionAnchor':'','context':{'labelCell':label.ref},'dimensionsProposal':dims,'confidence':86 if cell and cell.number is not None else 62,'status':'requires_validation','evidence':{'mediaKind':'spreadsheet','documentId':doc,'sheet':sheet,'range':evidence_ref,'labelRange':label.ref,'formulaRef':cell.ref if cell and cell.formula else '','method':'deterministic_excel_rule_facts_p06b'},'containsCustomerPayload':False,'writeAllowed':False}

def inspect_sheet(z,path,name,index,state,strings,formats,xfs,names,doc,purpose,hints):
 root=xml(z,path)
 if root is None:return {'name':name,'state':state,'facts':[],'tables':[],'warnings':['SHEET_XML_NOT_FOUND']}
 cells={};formula_count=errors=redacted=0
 for n in root.findall('.//m:c',NS):
  x=read_cell(n,strings,formats,xfs)
  if not x.ref:continue
  if x.formula:formula_count+=1
  if x.kind=='e':errors+=1
  if x.text:x.text,x.pii=sanitize_text(x.text,purpose=='operational');redacted+=1 if x.pii else 0
  cells[(x.row,x.col)]=x
 for (r,c),x in list(cells.items()):
  if x.pii:
   y=cells.get((r,c+1))
   if y and y.text and not y.pii:y.text='[valor_sensible_omitido]';y.value=y.text;y.number=None;y.pii=True;redacted+=1
 joined=' '.join(x.text for x in cells.values() if x.text and not x.pii);base_dims=dimensions(joined,hints);facts=[]
 for x in list(cells.values()):
  if not x.text or x.pii:continue
  for ft in fact_types(x.text):
   if len(facts)>=LIMIT_FACTS:break
   candidates=nearby(cells,x) if ft in NUMERIC else []
   if candidates:
    for y in candidates[:4]:facts.append(make_fact(doc,name,x,y,ft,dimensions(joined+' '+x.text,base_dims)))
   else:facts.append(make_fact(doc,name,x,None,ft,dimensions(joined+' '+x.text,base_dims)))
 used='';d=root.find('m:dimension',NS)
 if d is not None:used=d.attrib.get('ref','')
 types=uniq(f['factType'] for f in facts);tables=[]
 if len(types)>=2 and used:tables.append({'id':'excel_table_'+sha_text(doc,name,used)[:18],'sheet':name,'range':used,'semanticType':'health_matrix' if {'age_band','gender'} & set(types) else 'tariff_or_rule_table','factTypes':types,'dimensionsProposal':base_dims,'evidence':{'mediaKind':'spreadsheet','documentId':doc,'sheet':name,'range':used,'method':'deterministic_excel_rule_facts_p06b'},'status':'requires_semantic_mapping','writeAllowed':False})
 return {'name':name,'index':index,'state':state,'usedRange':used,'formulaCount':formula_count,'errorCount':errors,'piiRedactedCells':redacted,'printAreas':print_areas(names,index),'dimensionsProposal':base_dims,'facts':facts,'tables':tables,'warnings':[]}
def groups(facts,routes):
 grouped={}
 for f in facts:
  ft=f['factType'];d=f.get('dimensionsProposal',{});cluster='financing' if ft in ('installment','financing_surcharge') else ('presentation' if ft in ('coverage','output') else ('health_matrix' if ft in ('age_band','gender','maternity','dental') and d.get('ramo')=='Salud' else ('pricing' if ft in NUMERIC else 'dimensions')))
  key='|'.join(slug(x) or '*' for x in [f['evidence']['sheet'],cluster,d.get('producto'),d.get('tipoVehiculo'),d.get('usoVehiculo'),d.get('plan')]);grouped.setdefault(key,[]).append(f)
 out=[]
 for key,rows in grouped.items():
  types=uniq(x['factType'] for x in rows);numeric=[x for x in rows if x.get('numericValue') is not None or x.get('formula')]
  if not numeric and not set(types)&{'plan','vehicle_type','output','coverage'}:continue
  calc='manual_validated'
  if {'rate','minimum_premium','assistance'}.issubset(types):calc='rate_plus_fixed_with_minimum'
  elif {'rate','minimum_premium'}.issubset(types):calc='rate_with_minimum'
  elif 'rate' in types:calc='rate'
  elif set(types)&{'minimum_premium','base_premium'}:calc='fixed'
  if {'age_band','gender','maternity'}.issubset(types):calc='matrix_age_gender_maternity'
  elif {'age_band','gender'}.issubset(types):calc='matrix_age_gender'
  sheet=rows[0]['evidence']['sheet'];out.append({'id':'excel_group_'+sha_text(key,*[x['id'] for x in rows])[:18],'groupKey':key,'semanticCluster':key.split('|')[1],'sheet':sheet,'dimensionsProposal':rows[0].get('dimensionsProposal',{}),'factIds':[x['id'] for x in rows],'factTypes':types,'numericFactCount':len(numeric),'recommendedCalculationType':calc,'outputRouteIds':[r['id'] for r in routes if r['sheet']==sheet],'confidence':round(sum(x['confidence'] for x in rows)/len(rows),2),'status':'requires_semantic_mapping','requiresHumanValidation':True,'writeAllowed':False})
 return out[:1000]
def inspect_workbook(path:Path,purpose='training',hints=None):
 hints=hints or {}
 if not path.is_file():raise ValueError('FILE_NOT_FOUND')
 if path.suffix.lower() not in SUPPORTED:raise ValueError('UNSUPPORTED_FORMAT')
 if path.stat().st_size>LIMIT_FILE:raise ValueError('FILE_LIMIT_EXCEEDED')
 source_hash=sha_file(path);doc=clean(hints.get('documentId')) or 'excel_doc_'+source_hash[:18]
 with zipfile.ZipFile(path) as z:
  validate_zip(z);wb=xml(z,'xl/workbook.xml')
  if wb is None:raise ValueError('WORKBOOK_XML_REQUIRED')
  rr=rels(z,'xl/_rels/workbook.xml.rels','xl/workbook.xml');strings=shared(z);formats,xfs=style_info(z);names=defined_names(wb);parent=wb.find('m:sheets',NS)
  if parent is None:raise ValueError('SHEETS_REQUIRED')
  nodes=parent.findall('m:sheet',NS)
  if len(nodes)>LIMIT_SHEETS:raise ValueError('SHEET_LIMIT_EXCEEDED')
  sheets=[]
  for i,n in enumerate(nodes):
   rid=n.attrib.get(f'{{{R}}}id','');target=rr.get(rid,{}).get('target','');name=clean(n.attrib.get('name'));state=clean(n.attrib.get('state') or 'visible')
   sheets.append(inspect_sheet(z,target,name,i,state,strings,formats,xfs,names,doc,purpose,hints) if target else {'name':name,'state':state,'facts':[],'tables':[],'warnings':['SHEET_TARGET_NOT_FOUND']})
  facts=[f for s in sheets for f in s.get('facts',[])][:LIMIT_FACTS];tables=[t for s in sheets for t in s.get('tables',[])][:120];routes=[]
  for s in sheets:
   if re.search(r'cot|impresi[oó]n|salida|plan\s*\d+|vip|esencial|completo|terceros|robo|\brc\b',s['name'],re.I):
    rng=(s.get('printAreas') or [s.get('usedRange','')])[0];routes.append({'id':'excel_route_'+sha_text(doc,s['name'])[:18],'sheet':s['name'],'state':s.get('state'),'printAreas':s.get('printAreas',[]),'dimensionsProposal':s.get('dimensionsProposal',{}),'evidence':{'mediaKind':'spreadsheet','documentId':doc,'sheet':s['name'],'range':rng,'method':'deterministic_excel_rule_facts_p06b'},'status':'requires_validation','writeAllowed':False})
  warnings=[]
  if any(s.get('errorCount') for s in sheets):warnings.append('FORMULA_ERRORS_DETECTED')
  if any(x.get('externalReference') for x in names):warnings.append('EXTERNAL_REFERENCES_DETECTED')
  has_macros=path.suffix.lower()=='.xlsm' and 'xl/vbaProject.bin' in z.namelist()
  if has_macros:warnings.append('MACROS_DETECTED_NOT_EXECUTED')
  by={}
  for f in facts:by[f['factType']]=by.get(f['factType'],0)+1
  candidate_groups=groups(facts,routes)
  return {'schemaVersion':'orbit360_excel_rule_facts_p06b_v1','generatedAt':now(),'document':{'id':doc,'fileName':path.name,'extension':path.suffix.lower().lstrip('.'),'sourceHash':source_hash,'sizeBytes':path.stat().st_size,'purpose':purpose,'tenantId':clean(hints.get('tenantId')),'aseguradoraId':clean(hints.get('aseguradoraId')),'version':clean(hints.get('version') or 'v1')},'workbook':{'sheetCount':len(sheets),'hiddenSheetCount':sum(1 for s in sheets if s.get('state')!='visible'),'hasMacros':has_macros,'externalReferenceCount':sum(1 for x in names if x.get('externalReference')),'definedNameCount':len(names),'calculation':calc_props(wb)},'sheets':[{k:v for k,v in s.items() if k not in ('facts','tables')} for s in sheets],'facts':facts,'candidateTables':tables,'outputRoutes':routes,'candidateGroups':candidate_groups,'summary':{'factCount':len(facts),'tableCount':len(tables),'outputRouteCount':len(routes),'candidateGroupCount':len(candidate_groups),'numericFactCount':sum(f.get('numericValue') is not None for f in facts),'formulaBackedFactCount':sum(bool(f.get('formula')) for f in facts),'factsByType':dict(sorted(by.items())),'piiRedactedCells':sum(s.get('piiRedactedCells',0) for s in sheets),'formulaCount':sum(s.get('formulaCount',0) for s in sheets),'formulaErrorCount':sum(s.get('errorCount',0) for s in sheets)},'warnings':warnings,'flags':{'containsBytes':False,'containsBase64':False,'containsSecrets':False,'containsCustomerPayload':False,'macrosExecuted':False,'formulasCalculated':False,'externalLinksFollowed':False,'writeAllowed':False,'requiresHumanValidation':True,'requiresSemanticMapping':True,'requiresSecondGateForEnablement':True}}
def parse_json(v):
 if not v:return {}
 p=Path(v);return json.loads(p.read_text()) if p.is_file() else json.loads(v)
def main():
 a=argparse.ArgumentParser();a.add_argument('input');a.add_argument('--output');a.add_argument('--purpose',choices=['training','operational'],default='training');a.add_argument('--hints');x=a.parse_args()
 try:
  result=inspect_workbook(Path(x.input),x.purpose,parse_json(x.hints));payload=json.dumps(result,ensure_ascii=False,indent=2)
  Path(x.output).write_text(payload,encoding='utf-8') if x.output else print(payload);return 0
 except Exception as e:print(json.dumps({'ok':False,'code':clean(e),'writeAllowed':False},ensure_ascii=False),file=sys.stderr);return 1
if __name__=='__main__':raise SystemExit(main())
