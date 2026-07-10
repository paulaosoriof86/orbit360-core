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
assert(dry.status===0,'dry-run debe pasar');
assert(JSON.parse(dry.stdout).changed===true,'dry-run debe detectar cambio');
assert(fs.readFileSync(path.join(tmp,'orbit360-platform','index.html'),'utf8')===html,'dry-run no modifica');
const source=fs.readFileSync(tool,'utf8');
assert(source.includes('CORE_MUST_LOAD_BEFORE_ASEGURADORAS'),'debe validar orden');
assert(source.includes('SERVICE_MUST_LOAD_AFTER_ASEGURADORAS'),'debe validar servicio');
assert(source.includes('protectedFilesTouched: false'),'debe declarar backend protegido intacto');
assert(!source.includes('git commit')&&!source.includes('firebase deploy'),'no commit/deploy');
const bad=html.replace('</body>','<script src="modules/aseguradoras.js?v9999"></script></body>');
fs.writeFileSync(path.join(tmp,'orbit360-platform','index.html'),bad,'utf8');
const duplicate=spawnSync(process.execPath,[tool],{cwd:tmp,encoding:'utf8'});
assert(duplicate.status!==0,'duplicado debe bloquear');
console.log('OK orbit360-test-integrar-aseguradoras-knowledge-p09-index');