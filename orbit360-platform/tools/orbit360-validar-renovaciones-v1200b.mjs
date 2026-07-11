import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.cwd(),'orbit360-platform');
const read=rel=>fs.existsSync(path.join(root,rel))?fs.readFileSync(path.join(root,rel),'utf8'):'';
const errors=[];
const index=read('index.html');
const bridge=read('modules/renewals-v1200-operational-bridge.js');
const guard=read('modules/renewals-v1200-permission-guard.js');
const academy=read('data/academia-v1200-renewals.js');
[
  'modules/renewals-v1200-operational-bridge.js',
  'modules/renewals-v1200-permission-guard.js',
  'data/academia-v1200-renewals.js'
].forEach(rel=>{if(!read(rel))errors.push('Falta '+rel);if(!index.includes(rel))errors.push('index no carga '+rel);});
if(index.indexOf('modules/renewals-v1200-permission-guard.js')<index.indexOf('modules/renewals-v1200-operational-bridge.js'))errors.push('Guard de permiso carga antes del bridge');
if(!guard.includes("A.can('renovaciones', 'edit')"))errors.push('Campaña no verifica permiso editar');
if(!guard.includes('b.remove()'))errors.push('Botón de campaña no se oculta para rol sin permiso');
if(/primaEstimada|hashStr\(/.test(bridge))errors.push('Bridge conserva primas artificiales');
if(/Orbit\.correo\.enviar|wa\.me/.test(bridge))errors.push('Bridge intenta envío directo');
if(!bridge.includes('preparados; no enviados'))errors.push('Copy de campaña no es honesto');
if(!bridge.includes("#/cotizador?renueva="))errors.push('No abre Cotizador con contexto');
if(!academy.includes('canal conectado y verificado'))errors.push('Academia no enseña estado real del canal');
if(errors.length){console.error('RENOVACIONES V1200B: BLOQUEADO');errors.forEach(e=>console.error('- '+e));process.exit(1);}
console.log('RENOVACIONES V1200B: OK');
console.log('- campaña restringida por permiso');
console.log('- sin estimaciones ni envíos simulados');
console.log('- Cotizador con contexto y Academia actualizada');
