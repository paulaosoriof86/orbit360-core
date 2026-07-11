import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.cwd(),'orbit360-platform');
const read=rel=>fs.existsSync(path.join(root,rel))?fs.readFileSync(path.join(root,rel),'utf8'):'';
const errors=[];
const files=['modules/renewals-v1200-operational-bridge.js','data/academia-v1200-renewals.js'];
files.forEach(rel=>{if(!fs.existsSync(path.join(root,rel)))errors.push('Falta '+rel);});
const index=read('index.html'),bridge=read(files[0]),academy=read(files[1]);
files.forEach(rel=>{if(!index.includes(rel))errors.push('index.html no carga '+rel);});
if(index.indexOf('modules/renewals-v1200-operational-bridge.js')<index.indexOf('modules/renovaciones.js'))errors.push('Bridge carga antes del módulo base');
if(!bridge.includes("location.hash='#/cotizador?renueva='"))errors.push('Renovación no abre Cotizador con contexto');
if(!bridge.includes('existingManagement'))errors.push('No reutiliza gestión de renovación');
if(!bridge.includes('Pendiente de cotización real'))errors.push('No declara cotización real pendiente');
if(!bridge.includes('preparados; no enviados'))errors.push('Campaña aún puede simular envío');
if(!bridge.includes('Separada por moneda'))errors.push('KPI aún mezcla monedas');
if(/primaEstimada|hashStr\(/.test(bridge))errors.push('Bridge conserva estimaciones deterministas');
if(/Orbit\.correo\.enviar|wa\.me/.test(bridge))errors.push('Bridge intenta envío directo');
if(!academy.includes('Fuentes vigentes')||!academy.includes('canal conectado y verificado'))errors.push('Academia incompleta');
['core/backend-lab-loader.js','data/store.js','data/store-firestore-lab.local.js','core/auth.js','core/importa.js'].forEach(rel=>{if(!index.includes(rel))errors.push('index perdió protegido '+rel);});
if(errors.length){console.error('RENOVACIONES V1200: BLOQUEADO');errors.forEach(e=>console.error('- '+e));process.exit(1);}
console.log('RENOVACIONES V1200: OK');
console.log('- sin primas estimadas como propuestas');
console.log('- campaña prepara y no simula envío');
console.log('- gestión única + Cotizador con contexto');
console.log('- KPI por moneda y Academia actualizada');
