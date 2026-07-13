#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(process.argv[2] || path.join(process.cwd(), 'orbit360-platform'));
const repo = path.resolve(root, '..');
const files = {
  access:'core/aseguradoras-op2-operational-access-policy.js',
  provider:'core/aseguradoras-op2-secure-provider-policy-guard.js',
  resources:'modules/aseguradoras-op2-operational-resources.js',
  closure:'modules/aseguradoras-op2-closure-bridge.js',
  academy:'data/academia-v1217-aseguradoras-op2.js',
  style:'styles/aseguradoras-op2-v1217.css',
  index:'index.html'
};
const pipelinePath = path.join(repo, 'tools', 'orbit360-aplicar-cachebust-cotizador-comparativo-v1215.ps1');
const pass=[], fail=[];
const p=f=>path.join(root,f);
const read=f=>fs.existsSync(p(f))?fs.readFileSync(p(f),'utf8'):'';
const all=(src,terms)=>terms.every(t=>src.includes(t));
function check(id,ok,message,file){(ok?pass:fail).push({id,message,file});}

Object.values(files).forEach(file=>check('FILE_'+file.replace(/\W+/g,'_'),fs.existsSync(p(file)),'Archivo presente',file));
check('FILE_PIPELINE',fs.existsSync(pipelinePath),'Pipeline de integración presente','../tools/orbit360-aplicar-cachebust-cotizador-comparativo-v1215.ps1');

const access=read(files.access),provider=read(files.provider),resources=read(files.resources),closure=read(files.closure),academy=read(files.academy),style=read(files.style),index=read(files.index);
const pipeline=fs.existsSync(pipelinePath)?fs.readFileSync(pipelinePath,'utf8'):'';

check('ACCOUNTS_ALL_VIEWERS',all(access,["accessClass:'operational_all_viewers'",'function canViewBankAccounts','function canCopyBankAccounts']), 'Cuentas para usuarios con acceso al directorio',files.access);
check('CREDENTIALS_ADMIN_OPERATIONAL',all(access,["accessClass:'administrative_operational'","'Dirección','SuperAdmin','AdminTenant','Admin','Operativo'",'function canViewCredentials','function canCopyCredentials']), 'Credenciales para Dirección/Admin/Operativo',files.access);
check('RESTRICTIONS_WIN',all(access,['aseguradoras_cuentas_ver','aseguradoras_cuentas_copiar','aseguradoras_credenciales_ver','aseguradoras_credenciales_copiar']), 'Restricciones explícitas prevalecen',files.access);

check('PROVIDER_DIRECT_GUARD',all(provider,['R.revealField = function','R.copyField = function','R.revealCredential = function','R.copyCredential = function']), 'Llamadas directas al proveedor están protegidas',files.provider);
check('PROVIDER_ACCOUNT_POLICY',all(provider,['P.canViewBankAccounts()','P.canCopyBankAccounts()','fieldType === \'bank_account\'']), 'Proveedor permite cuentas según consulta del módulo',files.provider);
check('PROVIDER_CREDENTIAL_POLICY',all(provider,['P.canViewCredentials()','P.canCopyCredentials()','Las credenciales están disponibles únicamente para Dirección, Administración y Operativo']), 'Proveedor restringe credenciales por rol',files.provider);
check('PROVIDER_AUDIT_DENIAL',all(provider,['denegado_politica_op2','R.audit']), 'Denegaciones directas se auditan',files.provider);

check('ACCOUNT_VISIBLE',all(resources,['data-op2-account-value','R.revealField','value.textContent = out.value','data-op2-copy-account','R.copyField']), 'Cuenta completa visible y copiable',files.resources);
check('ACCOUNT_LEGACY',all(resources,['c.numero || c.accountNumber','Orbit.vault.copyText(value)']), 'Cuenta legacy continúa operativa',files.resources);
check('CREDENTIAL_VISIBLE_ALLOWED',all(resources,['Ver usuario y contraseña','Copiar usuario','Copiar contraseña','R.revealCredential','R.copyCredential']), 'Credenciales visibles y copiables para roles autorizados',files.resources);
check('CREDENTIAL_HIDDEN_ADVISOR',all(resources,['Credenciales disponibles para Dirección, Administración y Operativo','P.canViewCredentials()']), 'Asesor recibe estado sin credenciales',files.resources);
check('PASSWORD_TEMPORARY',all(resources,['const transient = new Map()','15000','transient.delete(index)']), 'Contraseña se revela temporalmente',files.resources);

check('NON_DESTRUCTIVE_MIGRATION',all(closure,['function flagLegacySensitive','pendiente_migracion_segura_no_destructiva','rawPersisted:true','migrationPerformed:false','destructive:false']), 'Migración legacy no destructiva',files.closure);
check('NO_PREMATURE_MIGRATION',!closure.includes("audit('migrar_recursos_sensibles_legacy'")&&!closure.includes('rawPersisted:false'),'No se declara migración antes de verificar',files.closure);
check('ACADEMY_POLICY',all(academy,['Cuentas bancarias operativas','Usuarios y contraseñas por rol','Migración sin pérdida','Cuarentena de hojas','Identidad exacta antes de actualizar','Mensajes operativos','next._cv = 1220']), 'Academia enseña recursos, identidad exacta y copy operativo v1.220',files.academy);
check('RESPONSIVE_POLICY',all(style,['.asg218-bank','.asg218-platform','.asg218-credentials','@media(max-width:640px)']), 'Recursos operativos responsive',files.style);

const refs = {
  access:'core/aseguradoras-op2-operational-access-policy.js?v=20260713-op2-v1218',
  provider:'core/aseguradoras-op2-secure-provider-policy-guard.js?v=20260713-op2-v1218',
  resources:'modules/aseguradoras-op2-operational-resources.js?v=20260713-op2-v1218'
};
const indexIntegrated = Object.values(refs).every(ref=>index.includes(ref));
const pipelinePrepared = Object.values(refs).every(ref=>pipeline.includes(ref));
check('INDEX_OR_PIPELINE_ACCESS',index.includes(refs.access)||pipeline.includes(refs.access),'Política integrada o preparada por pipeline',files.index);
check('INDEX_OR_PIPELINE_PROVIDER',index.includes(refs.provider)||pipeline.includes(refs.provider),'Guard proveedor integrado o preparado por pipeline',files.index);
check('INDEX_OR_PIPELINE_RESOURCES',index.includes(refs.resources)||pipeline.includes(refs.resources),'Recursos operativos integrados o preparados por pipeline',files.index);
check('INTEGRATION_CONTRACT',indexIntegrated||pipelinePrepared,'Index integrado o pipeline completo disponible',indexIntegrated?files.index:'../tools/orbit360-aplicar-cachebust-cotizador-comparativo-v1215.ps1');

if (indexIntegrated) {
  const accessPos=index.indexOf(refs.access);
  const providerPos=index.indexOf(refs.provider);
  check('INDEX_POLICY_ORDER',accessPos>=0&&providerPos>accessPos,'Política carga antes del guard de proveedor',files.index);
} else {
  const accessPos=pipeline.indexOf(refs.access);
  const providerPos=pipeline.indexOf(refs.provider);
  check('PIPELINE_POLICY_ORDER',accessPos>=0&&providerPos>accessPos,'Pipeline inserta política antes del guard de proveedor','../tools/orbit360-aplicar-cachebust-cotizador-comparativo-v1215.ps1');
}

[files.access,files.provider,files.resources,files.closure,files.academy].forEach(file=>{
  const out=spawnSync(process.execPath,['--check',p(file)],{encoding:'utf8'});
  check('SYNTAX_'+file.replace(/\W+/g,'_'),out.status===0,out.status===0?'Sintaxis válida':String(out.stderr||out.stdout).trim(),file);
});

const result={validator:'orbit360-validar-politica-recursos-aseguradoras-v1220',generatedAt:new Date().toISOString(),root,mode:indexIntegrated?'index_integrated':'pipeline_prepared',summary:{pass:pass.length,fail:fail.length},pass,fail};
console.log(JSON.stringify(result,null,2));
process.exit(fail.length?1:0);
