#!/usr/bin/env node
/* Orbit 360 · Auditoria calidad datos A&S v1.104
   Sin red, sin Firebase y sin escritura remota. */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2);
const val = (n,d='') => { const i=args.indexOf(n); return i>=0 ? (args[i+1]||d) : d; };
const inputDir = path.resolve(val('--input', path.join(root,'_orbit360_imports','ays_real')));
const reportDir = path.join(root,'_orbit360_reports');
const schemaPath = path.join(root,'tools','orbit360-schema-importacion-ays-v104.json');
const stamp = new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,14);
const txtReport = path.join(reportDir,`AUDITORIA-CALIDAD-DATOS-AYS-V104-${stamp}.txt`);
const jsonReport = path.join(reportDir,`AUDITORIA-CALIDAD-DATOS-AYS-V104-${stamp}.json`);
const errors = [], warnings = [], info = [];

function norm(s){ return String(s??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
function key(s){ return String(s??'').trim(); }
function h(s){ return String(s||'').trim().replace(/^\uFEFF/,'').replace(/\s+/g,'_').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9_]/g,'_').replace(/_+/g,'_').replace(/^_|_$/g,''); }
function num(v){ const n=Number(String(v??'').replace(/,/g,'').trim()); return Number.isFinite(n)?n:null; }
function dateOk(v){ if(!v) return true; const d=new Date(v); return !Number.isNaN(d.getTime()); }
function pais(v){ const n=norm(v); if(n==='gt'||n==='guatemala')return'GT'; if(n==='co'||n==='colombia')return'CO'; return n?n.toUpperCase():''; }
function mon(v){ return String(v||'').trim().toUpperCase(); }
function stPol(v){ const n=norm(v); if(['vigente','activa','activo'].includes(n))return'vigente'; if(['por renovar','renovacion','a renovar'].includes(n))return'por renovar'; if(['cancelada','cancelado','anulada','anulado'].includes(n))return'cancelada'; if(['vencida','vencido'].includes(n))return'vencida'; return n; }
function pendiente(v){ return ['pendiente','por cobrar','pendiente pago','pendiente de pago','vencido'].includes(norm(v)); }
function parseCsv(t){
  const rows=[]; let r=[], c='', q=false;
  for(let i=0;i<t.length;i++){ const ch=t[i], nx=t[i+1];
    if(q&&ch==='"'&&nx==='"'){c+='"';i++;continue} if(ch==='"'){q=!q;continue}
    if(!q&&ch===','){r.push(c);c='';continue} if(!q&&(ch==='\n'||ch==='\r')){ if(ch==='\r'&&nx==='\n')i++; r.push(c); c=''; if(r.some(x=>String(x||'').trim()))rows.push(r); r=[]; continue }
    c+=ch;
  }
  r.push(c); if(r.some(x=>String(x||'').trim()))rows.push(r); return rows;
}
function files(dir){
  if(!fs.existsSync(dir))return[]; const out=[];
  for(const it of fs.readdirSync(dir,{withFileTypes:true})){ const p=path.join(dir,it.name);
    if(it.isDirectory()){ if(['_excel','_convertidos'].includes(it.name))continue; out.push(...files(p)); }
    else if(/\.(csv|json)$/i.test(p))out.push(p);
  } return out;
}
function collName(file){ const b=path.basename(file).toLowerCase().replace(/\.(csv|json)$/,''); return (b.split('__')[0]||b).split(/[._ -]/).find(Boolean)||b; }
function readRows(file){
  const coll=collName(file), ext=path.extname(file).toLowerCase(), src=path.relative(root,file).replaceAll(path.sep,'/');
  if(ext==='.csv'){ const p=parseCsv(fs.readFileSync(file,'utf8')); if(!p.length)return{coll,rows:[]}; const hs=p[0].map(h); return{coll,rows:p.slice(1).map((row,i)=>{const o={__source:src,__line:i+2}; hs.forEach((x,j)=>o[x]=row[j]??''); return o;})}; }
  const data=JSON.parse(fs.readFileSync(file,'utf8')); const arr=Array.isArray(data)?data:(Array.isArray(data.rows)?data.rows:[]); return{coll,rows:arr.map((r,i)=>({...r,__source:src,__line:i+1}))};
}
function index(rows,coll){ const m=new Map(); for(const r of rows){ const id=key(r.id); if(!id)continue; if(m.has(id))errors.push(`${coll}: id duplicado ${id}`); m.set(id,r); } return m; }
function ref(coll,row,field,target,targetName){ const v=key(row[field]); if(!v){errors.push(`${coll}: fila ${row.__line} sin ${field}`);return} if(!target.has(v))errors.push(`${coll}: fila ${row.__line} ${field} inexistente ${v} en ${targetName}`); }

if(!fs.existsSync(schemaPath))errors.push(`Falta schema ${schemaPath}`);
if(!fs.existsSync(inputDir))warnings.push(`No existe input ${inputDir}`);
const schema=fs.existsSync(schemaPath)?JSON.parse(fs.readFileSync(schemaPath,'utf8')):{collections:{}};
const data=Object.fromEntries(Object.keys(schema.collections||{}).map(c=>[c,[]]));
for(const f of files(inputDir)){ try{ const {coll,rows}=readRows(f); if(!data[coll]){warnings.push(`${path.relative(root,f)}: coleccion no reconocida ${coll}`);continue} data[coll].push(...rows); }catch(e){errors.push(`${path.relative(root,f)}: ${e.message}`)} }
const idx=Object.fromEntries(Object.entries(data).map(([c,rows])=>[c,index(rows,c)]));
for(const [c,rows] of Object.entries(data))info.push(`${c}: ${rows.length}`);
for(const [c,def] of Object.entries(schema.collections||{})) for(const r of data[c]||[]) for(const field of def.required||[]) if(!key(r[field])) errors.push(`${c}: fila ${r.__line} falta ${field}`);
for(const r of data.vehiculos||[])ref('vehiculos',r,'clienteId',idx.clientes,'clientes');
for(const r of data.polizas||[]){ref('polizas',r,'clienteId',idx.clientes,'clientes');ref('polizas',r,'aseguradoraId',idx.aseguradoras,'aseguradoras'); if(key(r.vehiculoId)&&!idx.vehiculos.has(key(r.vehiculoId)))warnings.push(`polizas: fila ${r.__line} vehiculoId no encontrado ${r.vehiculoId}`)}
for(const r of data.cobros||[]){ref('cobros',r,'polizaId',idx.polizas,'polizas');ref('cobros',r,'clienteId',idx.clientes,'clientes')}
for(const r of data.comisiones||[]){ref('comisiones',r,'polizaId',idx.polizas,'polizas');ref('comisiones',r,'aseguradoraId',idx.aseguradoras,'aseguradoras')}
for(const r of data.reclamos||[]){ref('reclamos',r,'clienteId',idx.clientes,'clientes');ref('reclamos',r,'polizaId',idx.polizas,'polizas')}
const polByClient=new Map(); for(const p of data.polizas||[]){const c=key(p.clienteId); if(c)polByClient.set(c,(polByClient.get(c)||0)+1)}
for(const c of data.clientes||[]) if(key(c.id)&&!polByClient.has(key(c.id))) warnings.push(`clientes: fila ${c.__line} sin poliza asociada id ${c.id}`);
const exp={GT:'GTQ',CO:'COP'}; for(const c of ['polizas','cobros','comisiones','facturas','finmovs']) for(const r of data[c]||[]){ const p=pais(r.pais), m=mon(r.moneda); if(p&&exp[p]&&m&&m!==exp[p]&&m!=='USD')warnings.push(`${c}: fila ${r.__line} moneda ${m} no coincide con pais ${p}`); if(r.monto!==undefined&&num(r.monto)==null)warnings.push(`${c}: fila ${r.__line} monto no numerico ${r.monto}`); }
for(const p of data.polizas||[]){ const s=stPol(p.estado); if(!['vigente','por renovar','cancelada','vencida'].includes(s))warnings.push(`polizas: fila ${p.__line} estado no estandar ${p.estado}`); if(num(p.primaNeta)==null||num(p.primaNeta)<0)warnings.push(`polizas: fila ${p.__line} primaNeta invalida ${p.primaNeta}`); for(const f of ['fechaInicio','fechaFin']) if(!dateOk(p[f]))warnings.push(`polizas: fila ${p.__line} fecha invalida ${f} ${p[f]}`); }
for(const c of data.cobros||[]){ const p=idx.polizas.get(key(c.polizaId)); if(p&&pendiente(c.estado)&&!['vigente','por renovar'].includes(stPol(p.estado)))errors.push(`cobros: fila ${c.__line} pendiente ligado a poliza no cartera ${c.polizaId}`); if(!dateOk(c.fechaVencimiento))warnings.push(`cobros: fila ${c.__line} fechaVencimiento invalida ${c.fechaVencimiento}`); }
for(const f of data.finmovs||[]){ const t=norm(f.tipo); if(t&&!['ingreso','egreso','entrada','salida'].includes(t))warnings.push(`finmovs: fila ${f.__line} tipo no estandar ${f.tipo}`); if(!dateOk(f.fecha))warnings.push(`finmovs: fila ${f.__line} fecha invalida ${f.fecha}`); }

const result={version:'v1.104',createdAt:new Date().toISOString(),inputDir,counts:Object.fromEntries(Object.entries(data).map(([k,v])=>[k,v.length])),errors,warnings,info,result:errors.length?'FAIL':'OK'};
fs.mkdirSync(reportDir,{recursive:true}); fs.writeFileSync(jsonReport,JSON.stringify(result,null,2),'utf8');
const lines=['============================================================','ORBIT 360 - AUDITORIA CALIDAD DATOS A&S v1.104',`Fecha: ${result.createdAt}`,`Input: ${inputDir}`,'Restricciones: sin red, sin Firebase, sin escritura remota, sin datos reales en repo.','============================================================','',...info.map(x=>`INFO: ${x}`),'',`Errores: ${errors.length}`,...errors.map(e=>`ERROR: ${e}`),'',`Warnings: ${warnings.length}`,...warnings.map(w=>`WARN: ${w}`),'',`Reporte JSON: ${jsonReport}`,errors.length?'RESULTADO: FAIL':'RESULTADO: OK'];
fs.writeFileSync(txtReport,lines.join('\n'),'utf8'); console.log(lines.join('\n')); process.exit(errors.length?1:0);
