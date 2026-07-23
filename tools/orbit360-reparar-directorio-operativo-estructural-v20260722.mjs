#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const rel = value => path.join(ROOT, value);
const files = {
  visual: rel('orbit360-platform/core/client-insurer-visual-contract-v20260720.js'),
  importer: rel('orbit360-platform/core/insurer-directory-import-v1202.js'),
  importUi: rel('orbit360-platform/core/aseguradoras-op2-import-ui-guard.js'),
  bridge: rel('orbit360-platform/core/insurer-secure-target-bridge-v20260720.js'),
  credentialProvider: rel('orbit360-platform/core/aseguradoras-credentials-provider-lab-v20260720.js'),
  bankProvider: rel('orbit360-platform/core/aseguradoras-bank-accounts-provider-lab-v20260721.js'),
  routerBootstrap: rel('orbit360-platform/core/router-tenant-config-bootstrap.js'),
  index: rel('orbit360-platform/index.html'),
  academy: rel('orbit360-platform/data/academia-v1221-m1-visual-integrity.js'),
  validator: rel('orbit360-platform/tools/orbit360-m1-visual-remediation-contract-v20260722.js'),
  architecture: rel('orbit360-platform/tools/orbit360-block0-architecture-gate-v20260717.js'),
  overlay: rel('tools/orbit360-gate-contract-overlay-v20260718.json'),
  importerOverlay: rel('tools/orbit360-gate-contract-overlay-importers-v20260720.json'),
  registryExtension: rel('tools/orbit360-gate-contract-registry-extension-v20260720.json'),
  manifest: rel('tools/orbit360-critical-runtime-integrity-manifest-v20260721.json'),
  lifecycle: rel('tools/orbit360-validator-lifecycle-contract-v20260722.json'),
  freeze: rel('tools/orbit360-incident-freeze-v20260721.json'),
  report: rel('orbit360-platform/runtime-gate-crm-v20260716/operational-directory-structural-repair-sanitized.json')
};
const changes = [];

function read(file) {
  if (!fs.existsSync(file)) throw new Error(`FILE_MISSING:${path.relative(ROOT, file)}`);
  return fs.readFileSync(file, 'utf8');
}
function write(file, source) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, source.endsWith('\n') ? source : `${source}\n`, 'utf8');
}
function count(source, token) { return source.split(token).length - 1; }
function replaceCount(source, before, after, expected, id) {
  const beforeCount = count(source, before);
  const afterCount = count(source, after);
  if (beforeCount === expected) {
    changes.push(id);
    return source.split(before).join(after);
  }
  if (beforeCount === 0 && afterCount >= expected) return source;
  throw new Error(`TOKEN_COUNT_INVALID:${id}:before=${beforeCount}:after=${afterCount}:expected=${expected}`);
}
function replaceRegion(source, startToken, endToken, replacement, id, readyToken) {
  if (readyToken && source.includes(readyToken)) return source;
  if (count(source, startToken) !== 1) throw new Error(`REGION_START_INVALID:${id}:${count(source, startToken)}`);
  const start = source.indexOf(startToken);
  const end = source.indexOf(endToken, start + startToken.length);
  if (end < 0 || source.indexOf(endToken, end + endToken.length) >= 0) throw new Error(`REGION_END_INVALID:${id}`);
  changes.push(id);
  return source.slice(0, start) + replacement + source.slice(end);
}
function replaceRegex(source, pattern, replacement, id, readyToken) {
  if (readyToken && source.includes(readyToken)) return source;
  const matches = source.match(pattern);
  if (!matches) throw new Error(`REGEX_NOT_FOUND:${id}`);
  changes.push(id);
  return source.replace(pattern, replacement);
}
function readJson(file) { return JSON.parse(read(file)); }
function writeJson(file, value) { write(file, JSON.stringify(value, null, 2)); }
function unique(values) { return [...new Set([].concat(values || []).filter(Boolean))]; }
function ownerById(list, id) {
  const owner = [].concat(list || []).find(item => item && item.id === id);
  if (!owner) throw new Error(`OWNER_MISSING:${id}`);
  return owner;
}
function contractByPath(list, filePath) {
  const contract = [].concat(list || []).find(item => item && item.path === filePath);
  if (!contract) throw new Error(`CONTRACT_MISSING:${filePath}`);
  return contract;
}
function syntax(file) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`SYNTAX_INVALID:${path.relative(ROOT, file)}:${String(result.stderr || '').slice(0, 240)}`);
}
function writeReport(payload) { writeJson(files.report, payload); }

try {
  let source = read(files.visual);
  source = replaceCount(source, '- accesos y cuentas mediante revelado/copia segura;', '- usuarios y cuentas operativos visibles; contraseña con revelado seguro;', 1, 'visual_header');
  source = replaceCount(source, "visualRemediationRevision === '20260722.1'", "visualRemediationRevision === '20260722.2'", 1, 'visual_guard');

  const portals = `  function enhancePortals(root){
    if(!root||root.querySelector('#af-guardar'))return;
    var insurer=currentInsurer();
    root.querySelectorAll('#af-portales .asg-row[data-portal]').forEach(function(row){
      if(row.dataset.m1PortalCard==='1')return;
      var idx=+row.dataset.portal,p=insurer&&insurer.portales&&insurer.portales[idx]||{},name=controlValue(row.querySelector('[data-pn]')),type=controlValue(row.querySelector('[data-ptipo]')),url=controlValue(row.querySelector('[data-pu]')),country=controlValue(row.querySelector('[data-ppais]')),status=controlValue(row.querySelector('[data-pest]')),owner=controlValue(row.querySelector('[data-presp]')),verified=controlValue(row.querySelector('[data-pver]')),ref=clean(p.credentialRef),user=portalUser(p),cs=credentialState(ref),hasAccess=!!(ref||user);
      var passwordActions=ref?'<div class="m1-contact-actions">'+(cs.revealAvailable||cs.available?'<button class="btn ghost sm" data-m1-credential-reveal="'+idx+'">Ver temporalmente</button>':'')+(cs.copyAvailable||cs.available?'<button class="btn ghost sm" data-m1-credential-copy="'+idx+'">Copiar acceso seguro</button>':'<button class="btn ghost sm" disabled>Contraseña pendiente de conexión</button>')+'</div>':'<div class="m1-contact-actions"><button class="btn ghost sm" disabled>Contraseña sin referencia segura</button></div>';
      var accessControls=hasAccess?'<div class="m1-credential-box"><div class="m1-credential-row"><span class="m1-read-label">Usuario</span><div class="m1-credential-value m1-credential-user" data-m1-credential-user>'+esc(user||'Sin usuario registrado')+'</div></div><div class="m1-credential-row"><span class="m1-read-label">Contraseña</span><div class="m1-credential-value m1-credential-secret" data-m1-credential-secret aria-live="polite">Oculta</div></div>'+passwordActions+'</div>':'<div class="m1-credential-box"><span class="m1-read-label">Acceso</span><span class="m1-empty">Sin usuario ni contraseña registrados</span></div>';
      row.dataset.m1PortalCard='1';row.className='m1-portal-card';
      row.innerHTML='<div class="m1-portal-head"><div><strong>'+esc(name||'Plataforma sin nombre')+'</strong><span>'+esc([type,country].filter(Boolean).join(' · ')||'Clasificación pendiente')+'</span></div><span class="badge '+(/disponible/i.test(status)?'ok':/actualiz/i.test(status)?'danger':'warn')+'">'+esc(status||'Sin verificar')+'</span></div><div class="m1-portal-url"><span>URL</span>'+valueAction(url,'url','URL')+'</div><div class="m1-portal-meta"><div><span>Responsable</span><b>'+esc(owner||'Por confirmar')+'</b></div><div><span>Última verificación</span><b>'+esc(verified||'Sin verificar')+'</b></div></div>'+accessControls+(url?'<div class="m1-contact-actions"><a class="btn primary sm" href="'+esc(safeHref(url,'url'))+'" target="_blank" rel="noopener">Abrir plataforma</a></div>':'');
    });
    var note=root.querySelector('#af-portales')&&root.querySelector('#af-portales').parentElement.querySelector('.cfg-note');
    setHtmlIfChanged(note,'<b>Directorio operativo:</b> el usuario permanece visible. La contraseña es el único secreto y se revela temporalmente según rol.');
  }
`;
  source = replaceRegion(source, '  function enhancePortals(root){', '  function enhanceBankRows(root){', portals, 'visual_portals_function', 'Contraseña sin referencia segura');

  const banks = `  function enhanceBankRows(root){
    if(!root||root.querySelector('#af-guardar'))return;
    var insurer=currentInsurer();
    root.querySelectorAll('#af-cuentas .asg-row[data-cta]').forEach(function(row){
      if(row.dataset.m1BankCard==='1')return;
      var idx=+row.dataset.cta,c=insurer&&insurer.cuentas&&insurer.cuentas[idx]||{},values=Array.prototype.map.call(row.children,function(child){return clean(child.textContent);}),number=clean(c.numero||c.numeroCuenta||c.accountNumber||''),holder=accountHolder(c,insurer);
      row.dataset.m1BankCard='1';row.classList.add('m1-bank-card');
      var labels=document.createElement('div');labels.className='m1-bank-labels';
      labels.innerHTML='<span>Banco</span><b>'+esc(c.banco||values[0]||'Sin registrar')+'</b><span>Tipo</span><b>'+esc(c.tipo||values[1]||'Sin registrar')+'</b><span>Cuenta</span><div class="m1-bank-number-line"><b data-m1-bank-number="'+idx+'">'+esc(number||'Sin registrar')+'</b></div><span>Moneda</span><b>'+esc(c.moneda||values[3]||'Sin registrar')+'</b><span>Titular</span><b>'+esc(holder)+'</b><span>Acciones</span><div><button class="btn ghost sm" data-m1-bank-copy-all="'+idx+'"'+(number?'':' disabled')+'>Copiar datos completos</button></div>';
      row.innerHTML='';row.appendChild(labels);
    });
    var section=root.querySelector('#af-cuentas')&&root.querySelector('#af-cuentas').parentElement,note=section&&section.querySelector('.cfg-note');
    setHtmlIfChanged(note,'<b>Directorio operativo:</b> el número de cuenta permanece visible y se copia directamente con banco, tipo, moneda y titular. La edición continúa separada y auditable.');
  }
`;
  source = replaceRegion(source, '  function enhanceBankRows(root){', '  function inactiveReason', banks, 'visual_banks_function', 'el número de cuenta permanece visible y se copia directamente');

  const actions = `  document.addEventListener('click',async function(event){
    var copy=event.target.closest('[data-m1-copy]');if(copy){event.preventDefault();event.stopPropagation();var ok=await copyText(copy.dataset.m1Copy||'');if(Orbit.ui&&Orbit.ui.toast)Orbit.ui.toast(ok?'Copiado al portapapeles':'No se pudo copiar');return;}
    var reveal=event.target.closest('[data-m1-credential-reveal]'),credentialCopy=event.target.closest('[data-m1-credential-copy]');
    if(reveal||credentialCopy){event.preventDefault();event.stopPropagation();var insurer=currentInsurer(),idx=+(reveal||credentialCopy).dataset[reveal?'m1CredentialReveal':'m1CredentialCopy'],portal=insurer&&insurer.portales&&insurer.portales[idx],ref=portal&&portal.credentialRef,user=portalUser(portal);if(!ref||!Orbit.secureResources)return Orbit.ui&&Orbit.ui.toast&&Orbit.ui.toast('Contraseña pendiente de vinculación segura');var out=await Orbit.secureResources.revealCredential(ref,{module:'aseguradoras',insurerId:insurer.id,portalIndex:idx});if(!out||out.ok===false)return Orbit.ui&&Orbit.ui.toast&&Orbit.ui.toast(out&&out.message||'Contraseña pendiente de vinculación segura');if(reveal&&out.value){var box=reveal.closest('.m1-credential-box'),secret=box&&box.querySelector('[data-m1-credential-secret]');if(secret){setTextIfChanged(secret,out.value);setTimeout(function(){setTextIfChanged(secret,'Oculta');},out.expiresInMs||6000);}}else if(credentialCopy&&out.value){await copyText(['Usuario: '+(user||'—'),'Contraseña: '+out.value].join('\\n'));}if(Orbit.ui&&Orbit.ui.toast)Orbit.ui.toast(reveal?'Contraseña visible temporalmente':'Acceso copiado de forma segura');return;}
    var bank=event.target.closest('[data-m1-bank-copy-all]');if(bank){event.preventDefault();event.stopPropagation();var a=currentInsurer(),c=a&&a.cuentas&&a.cuentas[+bank.dataset.m1BankCopyAll];if(!c)return;var number=clean(c.numero||c.numeroCuenta||c.accountNumber||'');if(!number){if(Orbit.ui&&Orbit.ui.toast)Orbit.ui.toast('Número de cuenta pendiente de registrar');return;}var full=['Banco: '+(c.banco||'—'),'Tipo: '+(c.tipo||'—'),'Cuenta: '+number,'Moneda: '+(c.moneda||'—'),'Titular: '+accountHolder(c,a)].join('\\n'),copied=await copyText(full);if(Orbit.ui&&Orbit.ui.toast)Orbit.ui.toast(copied?'Datos bancarios copiados':'No fue posible copiar');return;}
  });
`;
  source = replaceRegion(source, '  async function revealBankAccount', '  observerHost=', actions, 'visual_actions_region', 'bankCopyDirect:true');
  source = replaceCount(source, "visualRemediationRevision:'20260722.1'", "visualRemediationRevision:'20260722.2'", 1, 'visual_revision');
  source = replaceCount(source, 'completeBankCopy:true,bankCopyExcludesUse:true', 'completeBankCopy:true,bankNumbersOperationalVisible:true,bankRevealDependency:false,bankCopyDirect:true,bankCopyExcludesUse:true', 1, 'visual_flags');
  if (/Cuenta protegida|data-m1-bank-reveal|fieldType:'bank_account'|function revealBankAccount/.test(source)) throw new Error('VISUAL_PROTECTED_BANK_SEMANTICS_REMAIN');
  write(files.visual, source);

  source = read(files.importer);
  source = replaceCount(source, 'cuentas, genera dry-run sanitizado y solo aplica datos no secretos\n   tras confirmacion reforzada. Contraseñas/usuarios/cuentas completas\n   nunca se guardan en Orbit.store: quedan como referencias backend.', 'cuentas, genera dry-run sanitizado y aplica datos operativos\n   tras confirmación reforzada. Usuarios y números bancarios permanecen\n   en el directorio; únicamente las contraseñas quedan como secretos.', 1, 'importer_header');
  source = replaceCount(source, 'url: url.url, urlHint: url.urlHint, urlRef: url.urlRef, usuarioHint: maskUser(user), credentialRef: ref,', 'url: url.url, urlHint: url.urlHint, urlRef: url.urlRef, usuario: user, usuarioHint: maskUser(user), credentialRef: ref,', 2, 'importer_users');
  source = replaceCount(source, "numero: '', numeroHint: maskRight(accountValue, 4), accountRef: accountValue ? 'backend_required' : '',", "numero: accountValue, numeroHint: maskRight(accountValue, 4), accountRef: accountValue ? 'backend_required' : '',", 1, 'importer_bank_number');
  source = replaceCount(source, '(out.portales || []).forEach(p => { delete p.usuario; delete p.user; delete p.password; delete p.contrasena; });\n    (out.cuentas || []).forEach(c => { delete c.numero; delete c.accountNumber; });', '(out.portales || []).forEach(p => { delete p.password; delete p.contrasena; });', 1, 'importer_safe_operation');
  source = replaceCount(source, 'Usuarios, contraseñas y números completos <b>no se muestran ni se escriben en Orbit.store</b>. Se envían al proveedor protegido al confirmar; la ficha conserva únicamente referencias opacas y datos enmascarados.', 'Los usuarios y números bancarios son datos operativos y permanecen en el directorio. Las contraseñas se envían al proveedor seguro y nunca se escriben como texto en Orbit.store.', 1, 'importer_explanation');
  if (/delete p\.usuario|delete p\.user|delete c\.numero|delete c\.accountNumber/.test(source)) throw new Error('IMPORTER_OPERATIONAL_DELETE_REMAINS');
  write(files.importer, source);

  source = read(files.importUi);
  source = replaceCount(source, "var VERSION = '20260721.1';", "var VERSION = '20260722.2';", 1, 'import_ui_version');
  source = replaceCount(source, 'El directorio fue escrito y leído nuevamente; los accesos confirmados quedaron disponibles mediante referencia protegida.', 'El directorio fue escrito y leído nuevamente; usuarios y cuentas quedaron operativos y las contraseñas conservaron referencia segura.', 1, 'import_ui_done');
  source = replaceCount(source, 'Accesos protegidos', 'Contraseñas protegidas', 1, 'import_ui_credentials_label');
  source = replaceCount(source, 'Cuentas protegidas', 'Cuentas operativas', 2, 'import_ui_accounts_label');
  write(files.importUi, source);

  source = read(files.bridge);
  source = replaceCount(source, 'Vincula cada recurso sensible con una identidad estable antes de llamar\n   al proveedor. El proveedor devuelve mappings; no modifica el directorio.', 'Vincula contraseñas y referencias de respaldo con una identidad estable.\n   El importador canónico conserva usuario y número como datos operativos.', 1, 'bridge_header');
  source = replaceCount(source, 'noProtectedValuePersistence: true,\n    stableTargetsRequired: true,', "noProtectedValuePersistence: true,\n    passwordPersistenceBlocked: true,\n    operationalDirectoryWritesOwnedByImporter: true,\n    operationalFields: ['usuario','numero'],\n    protectedFields: ['password','contrasena'],\n    stableTargetsRequired: true,", 1, 'bridge_contract');
  write(files.bridge, source);

  source = read(files.credentialProvider);
  source = replaceCount(source, '- conserva solo referencias opacas en Orbit.store;\n   - no registra ni persiste usuario/contraseña en el frontend;', '- conserva referencia opaca para la contraseña;\n   - el usuario permanece operativo y visible en el directorio;', 1, 'credential_header');
  source = replaceCount(source, "version: '20260720.1'", "version: '20260722.2'", 3, 'credential_versions');
  source = replaceCount(source, 'noSecretPersistence: true', 'noSecretPersistence: true,\n    usernameOperational: true,\n    passwordProtectedOnly: true', 1, 'credential_flags');
  write(files.credentialProvider, source);

  source = read(files.bankProvider);
  source = replaceCount(source, '- conserva únicamente accountRef y numeroHint en Orbit.store;', '- conserva el número operativo y accountRef como respaldo de trazabilidad;', 1, 'bank_provider_header');
  source = replaceCount(source, "version: '20260721.1'", "version: '20260722.2'", 1, 'bank_provider_version');
  source = replaceCount(source, 'noSecretPersistence: true,', 'noSecretPersistence: true,\n    operationalNumberPersistence: true,\n    vaultBackupPreserved: true,', 1, 'bank_provider_flags');
  source = replaceCount(source, "message: available ? 'Cuenta protegida disponible' : 'Vinculación segura pendiente'", "message: available ? 'Respaldo de cuenta disponible' : 'Vinculación de respaldo pendiente'", 1, 'bank_provider_message');
  source = replaceCount(source, "accounts[index].estado = mapping.available ? 'Cuenta protegida disponible' : 'Requiere actualización';", "accounts[index].estado = mapping.available ? 'Cuenta operativa disponible' : 'Requiere actualización';", 1, 'bank_provider_state');
  source = replaceCount(source, '        delete accounts[index].numero;\n        delete accounts[index].accountNumber;\n', '', 1, 'bank_provider_preserve_number');
  write(files.bankProvider, source);

  source = read(files.routerBootstrap);
  source = replaceCount(source, 'client-insurer-visual-contract-v20260720.js?v=20260721-4', 'client-insurer-visual-contract-v20260720.js?v=20260722-5', 1, 'router_visual_cache');
  source = replaceCount(source, 'aseguradoras-credentials-provider-lab-v20260720.js?v=20260720-1', 'aseguradoras-credentials-provider-lab-v20260720.js?v=20260722-2', 1, 'router_credentials_cache');
  source = replaceCount(source, "credentialProviderVersion: '20260720.1'", "credentialProviderVersion: '20260722.2'", 1, 'router_credential_version');
  write(files.routerBootstrap, source);

  source = read(files.index);
  source = replaceRegex(source, /aseguradoras-bank-accounts-provider-lab-v20260721\.js\?v=[^"']+/, 'aseguradoras-bank-accounts-provider-lab-v20260721.js?v=20260722-2', 'index_bank_cache', 'aseguradoras-bank-accounts-provider-lab-v20260721.js?v=20260722-2');
  source = replaceRegex(source, /academia-v1221-m1-visual-integrity\.js\?v=[^"']+/, 'academia-v1221-m1-visual-integrity.js?v=20260722-229', 'index_academy_cache', 'academia-v1221-m1-visual-integrity.js?v=20260722-229');
  write(files.index, source);

  source = read(files.academy);
  source = replaceCount(source, 'contenido M1 1.228', 'contenido M1 1.229', 1, 'academy_header');
  source = replaceCount(source, "contentVersion==='1.228'", "contentVersion==='1.229'", 1, 'academy_guard');
  source = replaceCount(source, 'La ficha muestra banco, tipo, número enmascarado, moneda y titular. El titular usa el nombre de la aseguradora cuando falta en la cuenta. El campo Uso no se muestra ni se copia.', 'La ficha muestra banco, tipo, número completo, moneda y titular. El número es operativo y se copia directamente; la contraseña del portal es el único secreto. El titular usa el nombre de la aseguradora cuando falta. El campo Uso no se muestra ni se copia.', 1, 'academy_semantics');
  source = replaceCount(source, '_m1visualv!==1228', '_m1visualv!==1228&&x._m1visualv!==1229', 2, 'academy_filters');
  source = replaceCount(source, "'_1228'", "'_1229'", 1, 'academy_ids');
  source = replaceCount(source, '_m1visualv:1228', '_m1visualv:1229', 2, 'academy_rows');
  source = replaceCount(source, "id:'eval_m1_visual_1228'", "id:'eval_m1_visual_1229'", 1, 'academy_eval');
  source = replaceCount(source, "contenidoM1Visual:'1.228'", "contenidoM1Visual:'1.229'", 1, 'academy_config');
  source = replaceCount(source, "contentVersion:'1.228'", "contentVersion:'1.229'", 1, 'academy_runtime');
  source = replaceCount(source, 'validatorLifecyclePhaseAware:true,apply', 'validatorLifecyclePhaseAware:true,operationalDirectorySemantics:true,apply', 1, 'academy_flag');
  write(files.academy, source);

  const validator = `#!/usr/bin/env node
'use strict';
const fs=require('fs');const path=require('path');const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');const json=rel=>JSON.parse(read(rel));const checks=[];const check=(id,ok,detail)=>checks.push({id,ok:!!ok,detail:detail||''});
const visual=read('core/client-insurer-visual-contract-v20260720.js');const css=read('styles/client-insurer-visual-contract-v20260720.css');const importer=read('core/insurer-directory-import-v1202.js');const bridge=read('core/insurer-secure-target-bridge-v20260720.js');const credentialProvider=read('core/aseguradoras-credentials-provider-lab-v20260720.js');const bankProvider=read('core/aseguradoras-bank-accounts-provider-lab-v20260721.js');const academy=read('data/academia-v1221-m1-visual-integrity.js');const freeze=json('../tools/orbit360-incident-freeze-v20260721.json');const overlay=json('../tools/orbit360-gate-contract-overlay-v20260718.json');const manifest=json('../tools/orbit360-critical-runtime-integrity-manifest-v20260721.json');
check('VISUAL_REVISION',visual.includes("visualRemediationRevision:'20260722.2'"));
check('PORTAL_USER_VISIBLE',visual.includes('data-m1-credential-user')&&visual.includes("user||'Sin usuario registrado'")&&!visual.includes('Usuario pendiente de registrar'));
check('PASSWORD_SEPARATE',visual.includes('data-m1-credential-secret')&&visual.includes('>Oculta</div>')&&visual.includes('Ver temporalmente'));
check('PASSWORD_COPY_WITH_USER',visual.includes("['Usuario: '+(user||'—'),'Contraseña: '+out.value]"));
check('BANK_NUMBER_OPERATIONAL_VISIBLE',visual.includes("number=clean(c.numero||c.numeroCuenta||c.accountNumber||'')")&&visual.includes('data-m1-bank-number')&&visual.includes('bankNumbersOperationalVisible:true'));
check('BANK_NO_TEMPORARY_REVEAL',!visual.includes('data-m1-bank-reveal')&&!visual.includes("fieldType:'bank_account'")&&!visual.includes('function revealBankAccount')&&!visual.includes('Cuenta protegida'));
check('BANK_COPY_DIRECT',visual.includes("'Cuenta: '+number")&&visual.includes('bankCopyDirect:true')&&visual.includes('await copyText(full)'));
check('BANK_COPY_EXCLUDES_USE',visual.includes('bankCopyExcludesUse:true')&&!visual.includes("'Uso: '+"));
check('BANK_HOLDER_FALLBACK',visual.includes("clean(account&&account.titular)||clean(insurer&&insurer.nombre)||'Sin registrar'"));
check('IMPORTER_USERNAME_OPERATIONAL',(importer.match(/usuario: user/g)||[]).length===2&&!importer.includes('delete p.usuario')&&!importer.includes('delete p.user'));
check('IMPORTER_BANK_OPERATIONAL',importer.includes('numero: accountValue')&&!importer.includes('delete c.numero')&&!importer.includes('delete c.accountNumber'));
check('IMPORTER_PASSWORD_ONLY_PROTECTED',importer.includes('delete p.password')&&importer.includes('delete p.contrasena'));
check('BRIDGE_FIELD_CLASSIFICATION',bridge.includes("operationalFields: ['usuario','numero']")&&bridge.includes("protectedFields: ['password','contrasena']")&&bridge.includes('operationalDirectoryWritesOwnedByImporter: true'));
check('CREDENTIAL_PROVIDER_USERNAME_OPERATIONAL',credentialProvider.includes('usernameOperational: true')&&credentialProvider.includes('passwordProtectedOnly: true'));
check('BANK_PROVIDER_PRESERVES_NUMBER',bankProvider.includes('operationalNumberPersistence: true')&&bankProvider.includes('vaultBackupPreserved: true')&&!bankProvider.includes('delete accounts[index].numero')&&!bankProvider.includes('delete accounts[index].accountNumber'));
check('ACADEMY_1229',academy.includes("contentVersion:'1.229'")&&academy.includes('_m1visualv:1229')&&academy.includes('número completo')&&academy.includes('operationalDirectorySemantics:true'));
check('ACADEMY_PASSWORD_ONLY_SECRET',academy.includes('la contraseña del portal es el único secreto'));
check('CSS_MOBILE_TITLES',css.includes('#host .mod-band .mb-tt h2')&&css.includes('overflow-wrap:anywhere'));
check('CSS_MOBILE_HEADERS',css.includes('#host .fichahdr .fh-top')&&css.includes('#host .fichahdr .fh-actions'));
check('CSS_MOBILE_TABS',css.includes('.m1-asg-ficha .asg-tabbar')&&css.includes('overflow-x:auto!important'));
check('CSS_MOBILE_ACTIONS',css.includes('.m1-asg-ficha .m1-asg-hero>div:last-child'));
check('CSS_PWA_INSTALL',css.includes('#pwa-install')&&css.includes('max-width:calc(100vw - 24px)'));
check('OVERLAY_1038',overlay.gatePatch&&overlay.gatePatch.contractVersion==='1.0.38'&&String(overlay.contractRevision||'').startsWith('1.0.38'));
check('OVERLAY_DATA_CONTRACT_FAILURE',overlay.classification==='DATA_CONTRACT_FAILURE');
check('MANIFEST_1038',manifest.contractVersion==='1.0.38');
check('FREEZE_M1_OPEN',freeze.stateClarification&&freeze.stateClarification.m1Closed===false&&freeze.stateClarification.m2Authorized===false);
check('FREEZE_NO_DATA_WRITE',Array.isArray(freeze.blockedActions)&&freeze.blockedActions.includes('write_firestore_operational_data')&&freeze.stateClarification.operationalDirectoryApply==='NOT_AUTHORIZED');
const failed=checks.filter(x=>!x.ok);const result={schemaVersion:'orbit360-m1-visual-remediation-contract-v2-operational-directory',contractVersion:'1.0.38',revision:'20260722.2',validatorSemanticRevision:'operational-directory-field-classification-v1',classification:'DATA_CONTRACT_FAILURE',total:checks.length,passed:checks.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',checks,writes:0,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,containsPII:false,containsSecrets:false};console.log(JSON.stringify(result,null,2));process.exit(failed.length?1:0);
`;
  write(files.validator, validator);
  changes.push('validator_rewritten_behavioral');

  source = read(files.architecture);
  source = replaceCount(source, "check('M1_VISUAL_REMEDIATION_CONTRACT_1037', visualRemediation.contractVersion === '1.0.37', visualRemediation.contractVersion || 'missing');", "check('M1_VISUAL_REMEDIATION_CONTRACT_1038', visualRemediation.contractVersion === '1.0.38', visualRemediation.contractVersion || 'missing');", 1, 'architecture_1038');
  write(files.architecture, source);

  const overlay=readJson(files.overlay);
  overlay.issuedAt='2026-07-22';overlay.classification='DATA_CONTRACT_FAILURE';overlay.diagnosticRevision='operational-directory-field-classification-v1';overlay.contractRevision='1.0.38-operational-directory-field-classification-v1';
  overlay.gatePatch.contractVersion='1.0.38';overlay.gatePatch.diagnosticRevision='operational-directory-field-classification-v1';overlay.gatePatch.status='OPERATIONAL_DIRECTORY_STATIC_REPAIR_PASS_DATA_DRYRUN_PENDING';overlay.gatePatch.diagnosticRule='Username and bank account number are operational directory fields. Password is the only secret. Exact-string minified transformations are retired; owners are updated by function boundaries and behavioral validators.';overlay.gatePatch.acceptancePolicy='Static repair must pass contract 1.0.38, behavioral visual validator and architecture with zero data reads/writes. Data dry-run remains separately blocked.';
  overlay.effectiveOwnerReconciliation=Object.assign({},overlay.effectiveOwnerReconciliation||{},{classification:'DATA_CONTRACT_FAILURE',visualRemediationRevision:'20260722.2',productOwnersChanged:['clientInsurerVisualContract','insurerDirectoryImport','insurerSecureTargetBridge','insurerCredentialProvider','insurerBankAccountProvider'],academyChanged:true,validatorChanged:true,workflowChanged:true,dataChanged:false,dataRepairPlanned:true,storeChanged:false,authChanged:false,vaultChanged:false,functionsChanged:false,rulesChanged:false,writesExecuted:false,runtimeExecuted:false,browserExecuted:false,deployExecuted:false});
  ownerById(overlay.canonicalOwners,'clientInsurerVisualContract').requiredTokens=["version:'20260720.2'","visualRemediationRevision:'20260722.2'",'data-m1-credential-user','data-m1-credential-secret','data-m1-bank-number','bankNumbersOperationalVisible:true','bankRevealDependency:false','bankCopyDirect:true','bankCopyExcludesUse:true','bankHolderFallbackInsurer:true'];
  ownerById(overlay.canonicalOwners,'m1VisualIntegrityAcademy').requiredTokens=["version:'1.221'","contentVersion:'1.229'",'_m1visualv:1229','El usuario del portal permanece visible','número completo','El campo Uso no se muestra ni se copia','operationalDirectorySemantics:true'];
  ownerById(overlay.canonicalOwners,'m1VisualRemediationContract').requiredTokens=['orbit360-m1-visual-remediation-contract-v2-operational-directory',"contractVersion:'1.0.38'",'BANK_NUMBER_OPERATIONAL_VISIBLE','BANK_NO_TEMPORARY_REVEAL','BANK_COPY_DIRECT','ACADEMY_1229','runtimeExecuted:false','browserExecuted:false','deployExecuted:false'];
  const bridgeOwner=ownerById(overlay.canonicalOwners,'insurerSecureTargetBridge');bridgeOwner.requiredTokens=unique(bridgeOwner.requiredTokens.concat(['operationalDirectoryWritesOwnedByImporter: true',"operationalFields: ['usuario','numero']","protectedFields: ['password','contrasena']"]));
  overlay.requiredFiles=unique(overlay.requiredFiles.concat(['tools/orbit360-reparar-directorio-operativo-estructural-v20260722.mjs','tools/orbit360-restituir-directorio-operativo-v20260722.mjs','orbit360-platform/docs/ADDENDUM-MAESTRO-DIRECTORIO-OPERATIVO-USUARIOS-CUENTAS-20260722.md']));
  contractByPath(overlay.runtimeVersionContracts,'orbit360-platform/core/client-insurer-visual-contract-v20260720.js').requiredTokens=ownerById(overlay.canonicalOwners,'clientInsurerVisualContract').requiredTokens;
  contractByPath(overlay.runtimeVersionContracts,'orbit360-platform/data/academia-v1221-m1-visual-integrity.js').requiredTokens=ownerById(overlay.canonicalOwners,'m1VisualIntegrityAcademy').requiredTokens;
  contractByPath(overlay.runtimeVersionContracts,'orbit360-platform/tools/orbit360-m1-visual-remediation-contract-v20260722.js').requiredTokens=ownerById(overlay.canonicalOwners,'m1VisualRemediationContract').requiredTokens;
  const routerContract=contractByPath(overlay.runtimeVersionContracts,'orbit360-platform/core/router-tenant-config-bootstrap.js');routerContract.requiredTokens=routerContract.requiredTokens.map(token=>token==='client-insurer-visual-contract-v20260720.js?v=20260721-4'?'client-insurer-visual-contract-v20260720.js?v=20260722-5':token);
  const architectureContract=contractByPath(overlay.runtimeVersionContracts,'orbit360-platform/tools/orbit360-block0-architecture-gate-v20260717.js');architectureContract.requiredTokens=architectureContract.requiredTokens.map(token=>token==='M1_VISUAL_REMEDIATION_CONTRACT_1037'?'M1_VISUAL_REMEDIATION_CONTRACT_1038':token);
  writeJson(files.overlay,overlay);

  const importerOverlay=readJson(files.importerOverlay);importerOverlay.issuedAt='2026-07-22';importerOverlay.classification='DATA_CONTRACT_FAILURE';importerOverlay.diagnosticRevision='operational-directory-field-classification-v1';importerOverlay.contractRevision='1.2.0-operational-directory-field-classification-v1';if(importerOverlay.gatePatch){importerOverlay.gatePatch.contractVersion='1.2.0';importerOverlay.gatePatch.diagnosticRevision='operational-directory-field-classification-v1';importerOverlay.gatePatch.status='OPERATIONAL_FIELDS_RESTORED_STATICALLY';importerOverlay.gatePatch.diagnosticRule='Username and bank account number remain in the operational directory; only password is protected.';}writeJson(files.importerOverlay,importerOverlay);

  const registry=readJson(files.registryExtension);const bankOwner=(registry.canonicalOwners||[]).find(item=>item.id==='insurerBankAccountProviderE2E');if(bankOwner)bankOwner.requiredTokens=["version: '20260722.2'",'operationalNumberPersistence: true','vaultBackupPreserved: true','supportsBankAccounts = true'];const importerGate=(registry.gates||[]).find(item=>item.gateId==='block1-real-insurer-directories-lab-v20260720');if(importerGate){importerGate.contractVersion='1.2.0';importerGate.diagnosticRevision='operational-directory-field-classification-v1';importerGate.status='OPERATIONAL_FIELDS_RESTORED_STATICALLY';importerGate.diagnosticRule='Only passwords are secret. Portal usernames and bank account numbers remain operational after controlled confirmation.';const importerContract=(importerGate.runtimeVersionContracts||[]).find(item=>item.path==='orbit360-platform/core/insurer-directory-import-v1202.js');if(importerContract)importerContract.requiredTokens=unique(importerContract.requiredTokens.concat(['usuario: user','numero: accountValue','delete p.password','delete p.contrasena']));}writeJson(files.registryExtension,registry);

  const manifest=readJson(files.manifest);manifest.issuedAt='2026-07-22';manifest.contractVersion='1.0.38';writeJson(files.manifest,manifest);

  const freeze={schemaVersion:'orbit360-incident-freeze-v72-operational-directory-static-repair-pass',issuedAt:'2026-07-21',updatedAt:'2026-07-22',incidentId:'m1-operational-directory-field-classification-regression-v20260722',status:'M1_OPERATIONAL_DIRECTORY_STATIC_REPAIR_PASS_DATA_DRYRUN_BLOCKED',repository:'paulaosoriof86/orbit360-core',branch:'ays/backend-tenant-lab-v99-20260703',pullRequest:5,tenantId:'alianzas-soluciones',gateId:'block1-client360-insurers-lab-v20260717',blockedGateIds:['block1-client360-insurers-lab-v20260717'],classification:['DATA_CONTRACT_FAILURE','FUNCTIONAL_DEFECT','VALIDATOR_STALE','PIPELINE_MECHANISM_FAILURE'],rootCause:{fieldClassification:'Username and bank account number are operational; password is secret.',pipeline:'Two dry-run attempts failed before data because a literal minified-string transformer was used. It is retired and replaced by function-boundary structural replacement.'},failedDryRunAttempts:[{runId:29968658125,errorCode:'SIGNATURE_INVALID:data_contract_phase_capabilities:0:0',firestoreRead:false,vaultRead:false,writesExecuted:false},{runId:29968906716,errorCode:'SIGNATURE_INVALID:visual_bank_visible:before=0:after=0',firestoreRead:false,vaultRead:false,writesExecuted:false}],bindingCorrection:{document:'orbit360-platform/docs/ADDENDUM-MAESTRO-DIRECTORIO-OPERATIVO-USUARIOS-CUENTAS-20260722.md',contractVersion:'1.0.38',mechanism:'function-boundary-structural-replacement-v1',exactStringTransformerRetired:true},preservedInventory:{clients:414,insurers:26,advisors:7,bankReferences:91,bankPending:2,portalCredentials:'26_OF_26',reimportRequired:false},staticRepairAuthorization:{authorizationId:'m1-operational-directory-static-repair-v1',active:true,consumed:false,allowedExecutions:1,secretsAllowed:false,firestoreReadAllowed:false,writesAllowed:false,runtimeAllowed:false,browserAllowed:false,deployAllowed:false,functionsDeployAllowed:false,rulesDeployAllowed:false,productionAllowed:false},allowedActions:['commit_verified_static_owner_contract_academy_validator_repair'],blockedActions:['write_firestore_operational_data','read_existing_insurer_vault','run_runtime','open_browser','deploy_hosting_lab','deploy_functions','deploy_rules','deploy_production','reimport_clients','reimport_insurers','advance_m2','advance_policies','run_second_final_gate','merge_main'],stateClarification:{m1TechnicalGate:'HISTORICAL_PASS',m1HumanVisualReview:'FAILED_DATA_CONTRACT_FAILURE',m1StaticOperationalRepair:'PASS_PENDING_COMMIT',m1Closed:false,m2Authorized:false,operationalDirectoryDryRun:'BLOCKED_AFTER_TWO_PIPELINE_FAILURES',operationalDirectoryApply:'NOT_AUTHORIZED',hostingRepublish:'NOT_AUTHORIZED',runtimeAuthorized:false,deployAuthorized:false,productionTouched:false,reimportRequired:false},nextAllowedStep:'Commit this static repair only after GO_GATE_CONTRACT 1.0.38, behavioral visual PASS and GO_STATIC_ARCHITECTURE. Do not read or write data in this stage.',containsPII:false,containsSecrets:false};writeJson(files.freeze,freeze);

  const lifecycle={schemaVersion:'orbit360-validator-lifecycle-contract-v11-operational-directory-static-repair',issuedAt:'2026-07-22',repository:'paulaosoriof86/orbit360-core',branch:'ays/backend-tenant-lab-v99-20260703',pullRequest:5,gateId:'block1-client360-insurers-lab-v20260717',gateContractVersion:'1.0.38',validatorLifecycleRevision:'operational-directory-structural-static-repair-v1',controlPlaneRevision:'phase-capability-immutable-request-v4',classification:['DATA_CONTRACT_FAILURE','PIPELINE_MECHANISM_FAILURE'],canonicalIntegration:{entrypoint:'tools/orbit360-validar-gate-contracts-v20260717.mjs',engine:'tools/orbit360-validar-gate-contracts-engine-v20260717.mjs',structuralRepair:'tools/orbit360-reparar-directorio-operativo-estructural-v20260722.mjs',retiredExactStringTransformer:'tools/orbit360-aplicar-correccion-directorio-operativo-v20260722.mjs',phase:'STATIC_PREFLIGHT',operationalWrites:0,secretsRead:false,firestoreRead:false,runtime:false,browser:false,deploy:false},canonicalOverlayPatch:{schemaVersion:'orbit360-gate-contract-overlay-v1',issuedAt:'2026-07-22',gateId:'block1-client360-insurers-lab-v20260717',classification:'DATA_CONTRACT_FAILURE',diagnosticRevision:'operational-directory-structural-static-repair-v1',contractRevision:'1.0.38-operational-directory-structural-static-repair-v1',gatePatch:{contractVersion:'1.0.38',diagnosticRevision:'operational-directory-structural-static-repair-v1',status:'OPERATIONAL_DIRECTORY_STATIC_REPAIR_VALIDATION',executionProfile:{phase:'STATIC_PREFLIGHT',capabilities:{secrets:false,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},workflowLocks:{branch:true,firebaseProject:false,hostingChannel:false},requestModel:'immutable-request-bound-to-parent-head-and-run-attempt-v1'},diagnosticRule:'Apply one function-boundary structural repair and validate behavior before any data access.',acceptancePolicy:'GO_GATE_CONTRACT 1.0.38, behavioral visual PASS, GO_STATIC_ARCHITECTURE and zero secrets/data/runtime/browser/deploy.'},effectiveOwnerReconciliation:{classification:'DATA_CONTRACT_FAILURE',productOwnersChanged:['clientInsurerVisualContract','insurerDirectoryImport','insurerSecureTargetBridge','insurerCredentialProvider','insurerBankAccountProvider'],academyChanged:true,validatorChanged:true,workflowChanged:true,dataChanged:false,writesExecuted:false,runtimeExecuted:false,browserExecuted:false,deployExecuted:false},canonicalOwners:[{id:'m1VisualIntegrityAcademy',path:'orbit360-platform/data/academia-v1221-m1-visual-integrity.js',requiredTokens:["contentVersion:'1.229'",'_m1visualv:1229','número completo','operationalDirectorySemantics:true']},{id:'m1VisualRemediationContract',path:'orbit360-platform/tools/orbit360-m1-visual-remediation-contract-v20260722.js',requiredTokens:['orbit360-m1-visual-remediation-contract-v2-operational-directory',"contractVersion:'1.0.38'",'BANK_NUMBER_OPERATIONAL_VISIBLE','BANK_NO_TEMPORARY_REVEAL','BANK_COPY_DIRECT','ACADEMY_1229']},{id:'operationalDirectoryStructuralRepair',path:'tools/orbit360-reparar-directorio-operativo-estructural-v20260722.mjs',requiredTokens:['function-boundary-structural-replacement-v1','replaceRegion','VISUAL_PROTECTED_BANK_SEMANTICS_REMAIN','exactStringTransformerRetired']}],requiredFiles:['tools/orbit360-validator-lifecycle-contract-v20260722.json','tools/orbit360-validar-gate-contracts-engine-v20260717.mjs','tools/orbit360-reparar-directorio-operativo-estructural-v20260722.mjs','tools/orbit360-restituir-directorio-operativo-v20260722.mjs','orbit360-platform/docs/ADDENDUM-MAESTRO-DIRECTORIO-OPERATIVO-USUARIOS-CUENTAS-20260722.md'],runtimeVersionContracts:[{path:'tools/orbit360-validar-gate-contracts-engine-v20260717.mjs',replaceRequiredTokens:true,requiredTokens:['ALLOWED_EXECUTION_PHASES','EXECUTION_PROFILE_DECLARED','STATIC_CAPABILITY_DISABLED','WORKFLOW_PHASE_LOCK','WORKFLOW_PROJECT_LOCK_NOT_APPLICABLE','WORKFLOW_CHANNEL_LOCK_NOT_APPLICABLE','GO_GATE_CONTRACT']},{path:'orbit360-platform/core/client-insurer-visual-contract-v20260720.js',replaceRequiredTokens:true,requiredTokens:["visualRemediationRevision:'20260722.2'",'data-m1-credential-user','data-m1-credential-secret','data-m1-bank-number','bankNumbersOperationalVisible:true','bankRevealDependency:false','bankCopyDirect:true','bankCopyExcludesUse:true','bankHolderFallbackInsurer:true']},{path:'orbit360-platform/core/insurer-directory-import-v1202.js',replaceRequiredTokens:true,requiredTokens:['usuario: user','numero: accountValue','delete p.password','delete p.contrasena']},{path:'orbit360-platform/core/insurer-secure-target-bridge-v20260720.js',replaceRequiredTokens:true,requiredTokens:['operationalDirectoryWritesOwnedByImporter: true',"operationalFields: ['usuario','numero']","protectedFields: ['password','contrasena']",'providerReturnsMappingsOnly: true']},{path:'orbit360-platform/tools/orbit360-m1-visual-remediation-contract-v20260722.js',replaceRequiredTokens:true,requiredTokens:['orbit360-m1-visual-remediation-contract-v2-operational-directory',"contractVersion:'1.0.38'",'BANK_NUMBER_OPERATIONAL_VISIBLE','BANK_NO_TEMPORARY_REVEAL','BANK_COPY_DIRECT','ACADEMY_1229']},{path:'orbit360-platform/tools/orbit360-block0-architecture-gate-v20260717.js',replaceRequiredTokens:true,requiredTokens:['M1_VISUAL_REMEDIATION_CONTRACT_EXISTS','M1_VISUAL_REMEDIATION_CONTRACT_EXECUTES','M1_VISUAL_REMEDIATION_CONTRACT_PASS','M1_VISUAL_REMEDIATION_CONTRACT_1038','M1_VISUAL_REMEDIATION_NO_WRITES']},{path:'.github/workflows/orbit360-aseguradoras-runtime-gate-v20260716.yml',replaceRequiredTokens:true,requiredTokens:['ORBIT360_GATE_PHASE: static_preflight','tools/orbit360-m1-operational-directory-static-repair-request-v20260722.json','node tools/orbit360-reparar-directorio-operativo-estructural-v20260722.mjs','node tools/orbit360-validar-gate-contracts-v20260717.mjs','node orbit360-platform/tools/orbit360-m1-visual-remediation-contract-v20260722.js','node orbit360-platform/tools/orbit360-block0-architecture-gate-v20260717.js','writesExecuted:false','functionsDeployed:false','rulesDeployed:false','productionTouched:false']} ]},containsPII:false,containsSecrets:false};writeJson(files.lifecycle,lifecycle);

  [files.visual,files.importer,files.importUi,files.bridge,files.credentialProvider,files.bankProvider,files.routerBootstrap,files.validator,files.architecture].forEach(syntax);
  [files.overlay,files.importerOverlay,files.registryExtension,files.manifest,files.lifecycle,files.freeze].forEach(file=>JSON.parse(read(file)));
  const report={schemaVersion:'orbit360-operational-directory-structural-repair-v1',generatedAt:new Date().toISOString(),ok:true,mechanism:'function-boundary-structural-replacement-v1',exactStringTransformerRetired:true,contractVersion:'1.0.38',changes,invariants:{usernameOperationalVisible:true,passwordProtectedOnly:true,bankNumbersOperationalVisible:true,bankCopyDirect:true,bankRevealDependency:false,dataRead:false,dataWritten:false,secretsRead:false,reimportExecuted:false,functionsChanged:false,rulesChanged:false,productionTouched:false},containsPII:false,containsSecrets:false};writeReport(report);console.log(JSON.stringify(report,null,2));
} catch(error){const report={schemaVersion:'orbit360-operational-directory-structural-repair-v1',generatedAt:new Date().toISOString(),ok:false,classification:'PIPELINE_MECHANISM_FAILURE',errorCode:String(error&&(error.code||error.message)||error).replace(/[^A-Za-z0-9_.:=-]/g,'_').slice(0,500),dataRead:false,dataWritten:false,secretsRead:false,containsPII:false,containsSecrets:false};writeReport(report);console.error(JSON.stringify(report,null,2));process.exit(41);}
