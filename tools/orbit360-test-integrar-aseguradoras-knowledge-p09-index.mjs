import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function assert(c,m){if(!c)throw new Error(m)}
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'orbit-p09-index-'));
fs.mkdirSync(path.join(tmp,'orbit360-platform'),{recursive:true});
const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>
<script src="data/store.js"></script>
<script src="modules/aseguradoras.js?v1291"></script>
</body></html>`;
fs.writeFileSync(path.join(tmp,'orbit360-platform','index.html'),html,'utf8');
const tool=path.resolve('tools/orbit360-integrar-aseguradoras-knowledge-p09-index.mjs');
const dry=spawnSync(process.execPath,[tool],{cwd:tmp,encoding:'utf8'});
assert(dry.status===0,`dry-run debe pasar: ${dry.stderr}`);
const report=JSON.parse(dry.stdout);
assert(report.changed===true,'dry-run debe detectar cambio');
assert(report.tenantConfig==='alianzas-soluciones'&&report.tenantConfigLoadedBeforeKnowledgeOperations===true,'debe declarar configuración tenant antes de operar conocimiento');
assert(report.labPersistenceGuarded===true,'debe declarar persistencia LAB protegida');
assert(report.runtimeEntrypoint==='core/aseguradoras-runtime-bootstrap-p09f.js','debe usar entrypoint P09f único');
assert(report.runtimeLoadsDependenciesDynamically===true,'entrypoint debe cargar dependencias dinámicamente');
assert(report.scripts.length===2,'index solo debe recibir guard y entrypoint');
assert(report.scripts[0]==='core/backend-lab-security-guard.js','security guard debe cargar primero');
assert(report.scripts[1]==='core/aseguradoras-runtime-bootstrap-p09f.js','bootstrap debe cargar después del guard');
assert(fs.readFileSync(path.join(tmp,'orbit360-platform','index.html'),'utf8')===html,'dry-run no modifica');
const source=fs.readFileSync(tool,'utf8');
assert(source.includes('SECURITY_GUARD_MUST_LOAD_AFTER_STORE'),'debe validar guard después de store');
assert(source.includes('P09F_ENTRY_MUST_LOAD_AFTER_SECURITY_GUARD'),'debe validar entrypoint después del guard');
assert(source.includes('P09F_ENTRY_MUST_LOAD_BEFORE_ASEGURADORAS'),'debe validar bootstrap antes del módulo');
assert(source.includes('protectedFilesTouched: false'),'debe declarar backend protegido intacto');
assert(!source.includes('git commit')&&!source.includes('firebase deploy'),'no commit/deploy');
const bad=html.replace('</body>','<script src="modules/aseguradoras.js?v9999"></script></body>');
fs.writeFileSync(path.join(tmp,'orbit360-platform','index.html'),bad,'utf8');
const duplicate=spawnSync(process.execPath,[tool],{cwd:tmp,encoding:'utf8'});
assert(duplicate.status!==0,'duplicado debe bloquear');
fs.rmSync(tmp,{recursive:true,force:true});
console.log('OK orbit360-test-integrar-aseguradoras-knowledge-p09-index');