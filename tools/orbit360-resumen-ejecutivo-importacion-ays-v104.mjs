#!/usr/bin/env node
/* Orbit 360 · Resumen ejecutivo importación A&S v1.104
   Consolida reportes locales del ensayo sin exponer datos fila a fila.
   Sin red, sin Firebase, sin escritura remota. */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2);
const val = (n,d='') => { const i=args.indexOf(n); return i>=0 ? (args[i+1]||d) : d; };
const reportDir = path.resolve(val('--reports', path.join(root,'_orbit360_reports')));
const outDir = reportDir;
const stamp = new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,14);
const mdPath = path.join(outDir,`RESUMEN-EJECUTIVO-IMPORTACION-AYS-V104-${stamp}.md`);
const txtPath = path.join(outDir,`RESUMEN-EJECUTIVO-IMPORTACION-AYS-V104-${stamp}.txt`);
const jsonPath = path.join(outDir,`RESUMEN-EJECUTIVO-IMPORTACION-AYS-V104-${stamp}.json`);

const checks = [
  { key:'conversion', label:'Conversión Excel → CSV', patterns:[/^CONVERTIR-EXCEL-IMPORTACION-AYS-V104.*\.(txt|json)$/i] },
  { key:'mapeo', label:'Mapeo por sinónimos', patterns:[/^MAPEO-COLUMNAS-IMPORTACION-AYS-V104.*\.(txt|json)$/i,/^MAPEAR-COLUMNAS-IMPORTACION-AYS-V104.*\.txt$/i] },
  { key:'validacion', label:'Validación estructura', patterns:[/^VALIDACION-IMPORTACION-AYS-V104\.txt$/i] },
  { key:'calidad', label:'Auditoría calidad/relaciones', patterns:[/^AUDITORIA-CALIDAD-DATOS-AYS-V104.*\.(txt|json)$/i,/^AUDITAR-CALIDAD-DATOS-AYS-V104.*\.txt$/i] },
  { key:'payload', label:'Payload dry-run', patterns:[/^CARGA-IMPORTACION-AYS-LAB-V104.*\.txt$/i] },
  { key:'lotes', label:'Listado de lotes', patterns:[/^LOTES-IMPORTACION-AYS-V104\.txt$/i] },
  { key:'rollback', label:'Rollback dry-run', patterns:[/^ROLLBACK-IMPORTACION-AYS-LAB-V104.*\.txt$/i] }
];

function latest(patterns){
  if(!fs.existsSync(reportDir)) return null;
  const files = fs.readdirSync(reportDir,{withFileTypes:true}).filter(x=>x.isFile()).map(x=>path.join(reportDir,x.name));
  const candidates = files.filter(f => patterns.some(p => p.test(path.basename(f))));
  candidates.sort((a,b)=>fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return candidates[0] || null;
}
function read(file){ try{return fs.readFileSync(file,'utf8')}catch{return''} }
function countLine(text,label){ const m=text.match(new RegExp(`${label}:\\s*(\\d+)`,'i')); return m?Number(m[1]):null; }
function resultOf(text,file){
  if(!file) return 'PENDIENTE';
  if(/RESULTADO:\s*FAIL/i.test(text)) return 'FAIL';
  if(/ERROR GENERAL|BLOQUEADO|errores criticos|fallo/i.test(text) && !/Errores:\s*0/i.test(text)) return 'REVISAR';
  if(/RESULTADO:\s*(OK|DRY_RUN_OK|EJECUTADO|EXCEL_CONVERTIDO|MAPEO_COLUMNAS_EJECUTADO|AUDITORIA_CALIDAD_OK|EJECUTADO_SIN_ESCRITURA)/i.test(text)) return 'OK';
  return 'REVISAR';
}
function summarize(check){
  const file=latest(check.patterns); const text=file?read(file):'';
  const errors=countLine(text,'Errores'); const warnings=countLine(text,'Warnings');
  const resultado=resultOf(text,file);
  const useful=[];
  for(const line of text.split(/\r?\n/)){
    if(/^(INFO|WARN|ERROR|MAPEO|LOTE|Colecciones|Filas preparadas|Filas escritas|CSV generados|CSV evaluados|Candidatos rollback|Eliminados|RESULTADO)/.test(line)) useful.push(line);
    if(useful.length>=18) break;
  }
  return { key:check.key, label:check.label, file:file?path.relative(root,file).replaceAll(path.sep,'/'):null, result:resultado, errors, warnings, excerpt:useful };
}
const items=checks.map(summarize);
const hasFail=items.some(x=>['FAIL','REVISAR'].includes(x.result));
const hasPending=items.some(x=>x.result==='PENDIENTE');
let decision='APTO_PARA_SOLICITAR_AUTORIZACION_LAB';
if(hasFail) decision='NO_AUTORIZAR_ESCRITURA_LAB'; else if(hasPending) decision='PENDIENTE_COMPLETAR_ENSAYO';

const recommendations=[];
if(decision==='NO_AUTORIZAR_ESCRITURA_LAB') recommendations.push('Corregir errores/revisiones antes de generar escritura LAB. No usar --write.');
if(decision==='PENDIENTE_COMPLETAR_ENSAYO') recommendations.push('Ejecutar el primer ensayo completo antes de decidir escritura LAB.');
if(decision==='APTO_PARA_SOLICITAR_AUTORIZACION_LAB') recommendations.push('Revisar manualmente reportes y solicitar autorización explícita antes de usar --write.');
recommendations.push('No subir archivos de _orbit360_imports, _orbit360_exports ni _orbit360_reports al repo.');
recommendations.push('Mantener datos reales fuera de seed.js y fuera de módulos.');

const report={version:'v1.104',createdAt:new Date().toISOString(),decision,items,recommendations};
fs.mkdirSync(outDir,{recursive:true}); fs.writeFileSync(jsonPath,JSON.stringify(report,null,2),'utf8');
const md=['# Resumen ejecutivo importación A&S v1.104','',`**Fecha:** ${report.createdAt}`,`**Decisión:** ${decision}`,'','## Resultado por control','', '| Control | Estado | Errores | Warnings | Reporte |','|---|---:|---:|---:|---|', ...items.map(x=>`| ${x.label} | ${x.result} | ${x.errors ?? ''} | ${x.warnings ?? ''} | ${x.file || 'pendiente'} |`),'','## Recomendaciones','',...recommendations.map(x=>`- ${x}`),'','## Extractos relevantes','',...items.flatMap(x=>[`### ${x.label}`, '', ...(x.excerpt.length?x.excerpt.map(l=>`- ${l}`):['- Sin extracto disponible.']), ''])].join('\n');
fs.writeFileSync(mdPath,md,'utf8');
const txt=md.replace(/^#/gm,'').replace(/\|/g,' ');
fs.writeFileSync(txtPath,txt,'utf8');
console.log(txt);
console.log(`\nReporte Markdown: ${mdPath}`);
console.log(`Reporte JSON: ${jsonPath}`);
process.exit(decision==='NO_AUTORIZAR_ESCRITURA_LAB'?1:0);
