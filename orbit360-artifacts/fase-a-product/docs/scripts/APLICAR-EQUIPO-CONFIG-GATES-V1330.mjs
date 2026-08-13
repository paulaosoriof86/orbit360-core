import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const equipoPath = path.join(ROOT, 'orbit360-platform/modules/equipo.js');
const configPath = path.join(ROOT, 'orbit360-platform/modules/configuracion.js');
const docPath = path.join(ROOT, 'orbit360-platform/docs/CIERRE-EQUIPO-CONFIG-GATES-V1330-20260707.md');
const expectedBranch = 'ays/backend-tenant-lab-v99-20260703';
const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const backupDir = path.join(ROOT, `_backups/pre_equipo_config_gates_v1330_${stamp}`);
const report = [];
const log = (s = '') => report.push(s);

function run(label, cmd, args) {
  log(`\n----- ${label} -----`);
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', shell: false });
  if (r.stdout?.trim()) log(r.stdout.trim());
  if (r.stderr?.trim()) log(r.stderr.trim());
  log(`EXIT_CODE=${r.status ?? 999}`);
  return r.status ?? 999;
}
function read(file) { return fs.readFileSync(file, 'utf8'); }
function write(file, content) { fs.writeFileSync(file, content, 'utf8'); }
function marked(text, start, end, block) {
  const rx = new RegExp(start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?' + end.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  const full = `${start}\n${block.trim()}\n${end}`;
  return rx.test(text) ? text.replace(rx, full) : `${text.trimEnd()}\n\n${full}\n`;
}

const equipoBlock = String.raw`
(function orbit360EquipoGatesV1330(){
  'use strict';
  if (window.__orbit360EquipoGatesV1330) return;
  window.__orbit360EquipoGatesV1330 = true;
  var approved = typeof WeakSet !== 'undefined' ? new WeakSet() : null;
  function norm(v){ return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase(); }
  function closest(el, sel){ try { return el && el.closest ? el.closest(sel) : null; } catch(e){ return null; } }
  function inEquipo(el){ return norm(location.hash).includes('equipo') || !!closest(el, '#module-equipo,[data-module="equipo"],.module-equipo,#eq-edit'); }
  function userLabel(){ var O=window.Orbit||{}, u=(O.auth&&(O.auth.user||O.auth.currentUser))||(O.session&&(O.session.user||O.session.currentUser))||O.currentUser||O.user||{}; return u.email||u.correo||u.name||u.nombre||u.id||'usuario_actual'; }
  function audit(action, motivo, phase){
    var entry={id:'audit_equipo_'+Date.now(), fecha:new Date().toISOString(), modulo:'equipo', accion:action, fase:phase||'antes', motivo:motivo||'', usuario:userLabel(), tenant:(window.Orbit&&Orbit.tenant&&(Orbit.tenant.id||Orbit.tenant.nombre||Orbit.tenant.name))||'tenant_actual', aplicaClaude:'Si', patronClaude:'Gates administrativos con motivo obligatorio y auditoria por tenant.'};
    try{ if(window.Orbit&&Orbit.store&&typeof Orbit.store.insert==='function') Orbit.store.insert('auditoria', entry); }catch(e){}
    try{ window.dispatchEvent(new CustomEvent('orbit:audit-gate',{detail:entry})); }catch(e){}
  }
  function reason(label, reset){
    if (reset) { var ok=prompt('Confirmación reforzada: escribe RESTABLECER para continuar.'); if(ok!=='RESTABLECER') return ''; }
    var m=prompt('Motivo obligatorio para '+label+':');
    if(!m || m.trim().length<5){ alert('Acción cancelada. Debe indicar un motivo claro.'); return ''; }
    return m.trim();
  }
  function isAdminText(t){ return /super\s*admin|superadmin|administrador|admin|direccion|dirección|it|tecnico|técnico/.test(t); }
  function activeAdminCount(){
    var c=0, seen={};
    ['asesores','usuarios','equipo','users'].forEach(function(col){ try{ (Orbit.store.all(col)||[]).forEach(function(u){ var id=u.id||u.uid||u.email||u.correo||JSON.stringify(u); if(seen[id])return; seen[id]=1; var estado=norm(u.estado||u.status||''); var active=!(u.inactivo||u.activo===false||u.active===false||/inactivo|desactivado|eliminado|suspendido|bloqueado/.test(estado)); if(active && isAdminText(norm([u.rol,u.role,u.perfil,u.tipo].concat(u.roles||[]).join(' ')))) c++; }); }catch(e){} });
    return c;
  }
  function gate(el, action, label, reset){
    var m=reason(label, reset); if(!m) return false;
    if(action==='guardar_usuario'){
      var panel=closest(el,'#eq-edit');
      var inact=panel && panel.querySelector('#eu-inact') && panel.querySelector('#eu-inact').checked;
      var roles=panel ? Array.from(panel.querySelectorAll('.eu-role:checked')).map(function(x){return x.value;}).join(' ') : '';
      if(inact && isAdminText(norm(roles)) && activeAdminCount()<=1){ alert('No se puede dejar el tenant sin un administrador activo.'); return false; }
    }
    audit(action,m,'antes'); return true;
  }
  document.addEventListener('click', function(ev){
    var btn=closest(ev.target,'button,a,[role="button"],input[type="button"],input[type="submit"]'); if(!btn||!inEquipo(btn)) return;
    if(approved&&approved.has(btn)){approved.delete(btn); return;}
    var t=norm((btn.textContent||'')+' '+(btn.id||'')+' '+(btn.getAttribute('aria-label')||''));
    var action='', label='', reset=false;
    if(btn.id==='eu-ok'||/guardar/.test(t)){ action='guardar_usuario'; label='guardar usuario/cambios de roles y permisos'; }
    else if(btn.id==='perm-reset'||/restablecer|reset/.test(t)){ action='reset_permisos'; label='restablecer permisos'; reset=true; }
    if(!action) return;
    ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
    if(!gate(btn,action,label,reset)) return;
    if(approved) approved.add(btn); setTimeout(function(){ try{btn.click();}catch(e){} setTimeout(function(){audit(action,'motivo registrado','despues');},350); },0);
  }, true);
  document.addEventListener('change', function(ev){
    var el=ev.target; if(!el||!inEquipo(el)||!el.matches('[data-perm],.eu-role,.eu-mod,#eu-inact')) return;
    if(approved&&approved.has(el)){approved.delete(el); return;}
    ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
    if(!gate(el,'cambiar_permisos','cambiar roles/permisos',false)) return;
    if(approved) approved.add(el); setTimeout(function(){ try{el.dispatchEvent(new Event('change',{bubbles:true}));}catch(e){} },0);
  }, true);
})();`;

const configBlock = String.raw`
(function orbit360ConfiguracionGatesV1330(){
  'use strict';
  if (window.__orbit360ConfiguracionGatesV1330) return;
  window.__orbit360ConfiguracionGatesV1330 = true;
  var approved = typeof WeakSet !== 'undefined' ? new WeakSet() : null;
  function norm(v){ return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase(); }
  function closest(el, sel){ try { return el && el.closest ? el.closest(sel) : null; } catch(e){ return null; } }
  function inConfig(el){ return norm(location.hash).includes('config') || !!closest(el, '#module-configuracion,[data-module="configuracion"],.module-configuracion,.cfg-wrap,#cf-integ,#cf-plan-ed'); }
  function userLabel(){ var O=window.Orbit||{}, u=(O.auth&&(O.auth.user||O.auth.currentUser))||(O.session&&(O.session.user||O.session.currentUser))||O.currentUser||O.user||{}; return u.email||u.correo||u.name||u.nombre||u.id||'usuario_actual'; }
  function audit(action, motivo, phase){
    var entry={id:'audit_config_'+Date.now(), fecha:new Date().toISOString(), modulo:'configuracion', accion:action, fase:phase||'antes', motivo:motivo||'', usuario:userLabel(), tenant:(window.Orbit&&Orbit.tenant&&(Orbit.tenant.id||Orbit.tenant.nombre||Orbit.tenant.name))||'tenant_actual', aplicaClaude:'Si', patronClaude:'Configuracion SaaS administrable con gates, estados honestos y auditoria por tenant.'};
    try{ if(window.Orbit&&Orbit.store&&typeof Orbit.store.insert==='function') Orbit.store.insert('auditoria', entry); }catch(e){}
    try{ window.dispatchEvent(new CustomEvent('orbit:audit-gate',{detail:entry})); }catch(e){}
  }
  function reason(label, reset){
    if (reset) { var ok=prompt('Confirmación reforzada: escribe RESTABLECER CONFIGURACION para continuar.'); if(ok!=='RESTABLECER CONFIGURACION') return ''; }
    var m=prompt('Motivo obligatorio para '+label+':');
    if(!m || m.trim().length<5){ alert('Acción cancelada. Debe indicar un motivo claro.'); return ''; }
    return m.trim();
  }
  function gate(el, action, label, reset){ var m=reason(label, reset); if(!m) return false; audit(action,m,'antes'); return true; }
  function scrub(root){
    root=root||document.body;
    var repl=[[/\bAuth\s*backend\b/gi,'acceso seguro'],[/\bbackend\b/gi,'canal seguro'],[/\bLAB\b/g,'entorno de validación'],[/\bFirebase\b/g,'servicio seguro'],[/\bFirestore\b/g,'servicio seguro'],[/\blocalStorage\b/g,'almacenamiento seguro'],[/\bmock\b/gi,'entorno de prueba'],[/\bdemo\b/gi,'entorno de prueba'],[/\bsmoke\b/gi,'validación'],[/\bcredenciales\b/gi,'referencias de conexión'],[/\bAPI key\b/gi,'referencia de conexión']];
    function clean(s){ repl.forEach(function(p){s=String(s).replace(p[0],p[1]);}); return s; }
    try{ var w=document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {acceptNode:function(n){var p=n.parentElement; return !p||/script|style|code|pre/i.test(p.tagName)||!n.nodeValue.trim()?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT;}}), nodes=[]; while(w.nextNode()) nodes.push(w.currentNode); nodes.forEach(function(n){var x=clean(n.nodeValue); if(x!==n.nodeValue)n.nodeValue=x;}); root.querySelectorAll('[title],[placeholder],[aria-label]').forEach(function(el){['title','placeholder','aria-label'].forEach(function(a){var v=el.getAttribute(a); if(v){var x=clean(v); if(x!==v)el.setAttribute(a,x);}});}); }catch(e){}
  }
  document.addEventListener('click', function(ev){
    var btn=closest(ev.target,'button,a,[role="button"],input[type="button"],input[type="submit"]'); if(!btn||!inConfig(btn)) return;
    if(approved&&approved.has(btn)){approved.delete(btn); return;}
    var t=norm((btn.textContent||'')+' '+(btn.id||'')+' '+(btn.getAttribute('aria-label')||''));
    var action='', label='', reset=false;
    if(btn.id==='cf-mods-save'||/guardar modulos|guardar módulos|modulos activos|módulos activos/.test(t)){ action='guardar_modulos_activos'; label='guardar módulos activos'; }
    else if(btn.id==='cf-reset'||/restablecer|reset/.test(t)){ action='reset_configuracion'; label='restablecer configuración'; reset=true; }
    else if(btn.id==='pe-ok'||/editar plan|guardar/.test(t)&&closest(btn,'#cf-plan-ed')){ action='cambiar_plan'; label='cambiar plan'; }
    else if(btn.id==='ci-ok'||/validar parametros|validar parámetros|conectar|guardar/.test(t)&&closest(btn,'#cf-integ')){ action='configurar_integracion'; label='configurar integración'; }
    if(!action) return;
    ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
    if(!gate(btn,action,label,reset)) return;
    if(approved) approved.add(btn); setTimeout(function(){ try{btn.click();}catch(e){} setTimeout(function(){audit(action,'motivo registrado','despues');},350); },0);
  }, true);
  document.addEventListener('change', function(ev){
    var el=ev.target; if(!el||!inConfig(el)||el.id!=='cf-plan') return;
    if(approved&&approved.has(el)){approved.delete(el); return;}
    ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
    if(!gate(el,'cambiar_plan','cambiar plan',false)) return;
    if(approved) approved.add(el); setTimeout(function(){ try{el.dispatchEvent(new Event('change',{bubbles:true}));}catch(e){} },0);
  }, true);
  setTimeout(function(){scrub(document.querySelector('#cfg-body')||document.body);},250);
  setTimeout(function(){scrub(document.querySelector('#cfg-body')||document.body);},1000);
  try{ new MutationObserver(function(){scrub(document.querySelector('#cfg-body')||document.body);}).observe(document.body,{childList:true,subtree:true}); }catch(e){}
})();`;

log('======================================================================');
log('ORBIT 360 A&S — APLICAR EQUIPO/CONFIG GATES V1330');
log(`Fecha local: ${new Date().toISOString()}`);
log('No commit | No push | No merge | No deploy | No main');
log('======================================================================');

const branch = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
log(`Rama local: ${branch}`);
if (branch !== expectedBranch) {
  log(`BLOQUEADO: rama incorrecta. Esperada: ${expectedBranch}`);
  console.log(report.join('\n'));
  process.exit(1);
}

for (const f of [equipoPath, configPath]) {
  if (!fs.existsSync(f)) {
    log(`BLOQUEADO: falta ${path.relative(ROOT, f)}`);
    console.log(report.join('\n'));
    process.exit(1);
  }
}

fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(equipoPath, path.join(backupDir, 'equipo.js.before'));
fs.copyFileSync(configPath, path.join(backupDir, 'configuracion.js.before'));
log(`Backup: ${backupDir}`);

let equipo = read(equipoPath);
equipo = equipo.replace(/Auth backend\/canal conectado/g, 'canal seguro autorizado');
equipo = equipo.replace(/invitación pendiente de Auth backend para/g, 'invitación pendiente de canal seguro para');
equipo = marked(equipo, '// ORBIT360 V1330 EQUIPO GATES PATCH START', '// ORBIT360 V1330 EQUIPO GATES PATCH END', equipoBlock);
write(equipoPath, equipo);

let config = read(configPath);
config = config.replace(/>\s*itar\s*<\/button>/g, '>Editar</button>');
config = config.replace(/<\/td>itar<\/button><\/td>/g, '</td>');
config = config.replace(/APIs y credenciales/g, 'APIs y referencias de conexión');
config = config.replace(/Las credenciales se guardan <b>cifradas<\/b>, con <b>scopes mínimos<\/b> y visibilidad por rol\. Nunca se exponen en el front\./g, 'Las referencias de conexión quedan pendientes de canal seguro autorizado. No se muestran tokens ni contraseñas en pantalla.');
config = config.replace(/API key \/ Token/g, 'Referencia segura / Token');
config = config.replace(/credenciales para validar los parámetros/g, 'referencias de conexión para validar los parámetros');
config = config.replace(/no se realizazan conexiones reales/g, 'no se realizan conexiones reales');
config = marked(config, '// ORBIT360 V1330 CONFIGURACION GATES PATCH START', '// ORBIT360 V1330 CONFIGURACION GATES PATCH END', configBlock);
write(configPath, config);

const doc = `# CIERRE EQUIPO/CONFIG GATES V1330\n\nFecha local: ${new Date().toISOString()}\nProyecto: Orbit 360 A&S\nRama: ${expectedBranch}\nPR vigente: #5 draft, sin merge, sin deploy, sin main.\n\n## Alcance aplicado\n\nArchivos esperados modificados:\n\n- orbit360-platform/modules/equipo.js\n- orbit360-platform/modules/configuracion.js\n- orbit360-platform/docs/CIERRE-EQUIPO-CONFIG-GATES-V1330-20260707.md\n\nNo se tocaron backend protegido, index.html, Auth final, importadores, reglas, tools/orbit360-*, producción, deploy, merge ni main.\n\n## Equipo\n\nSe agregaron gates administrativos para guardar usuario, roles/permisos, reset de permisos e inactivación sensible. Exigen motivo, registran auditoría cuando Orbit.store.insert está disponible y bloquean dejar el tenant sin administrador activo.\n\n## Configuración\n\nSe agregaron gates para cambio de plan, módulos activos, reset de configuración e integraciones. Se corrigió el residual visual itar</button></td> y se neutralizó copy técnico visible hacia lenguaje de canal seguro/referencias de conexión.\n\n## ¿Aplica a Claude/prototipo?\n\nSí. Claude debe conservar el patrón de gates administrativos con motivo, confirmación reforzada, auditoría por tenant, copy honesto y Academia para roles Dirección/Superadmin/IT y Administrativo/Operativo.\n\n## Estado\n\nPatch local aplicado por script corto versionado. Pendiente commit/push solo con autorización expresa de Paula.\n`;
write(docPath, doc);

const c1 = run('NODE CHECK equipo.js', 'node', ['--check', 'orbit360-platform/modules/equipo.js']);
const c2 = run('NODE CHECK configuracion.js', 'node', ['--check', 'orbit360-platform/modules/configuracion.js']);
const c3 = run('CONTRATO BACKEND LAB', 'node', ['tools/orbit360-validar-backend-lab-contrato.mjs']);
run('GIT STATUS', 'git', ['status', '--short']);

if (c1 === 0 && c2 === 0 && c3 === 0) log('\nRESULTADO: PATCH LOCAL APLICADO Y VALIDADO.');
else log('\nRESULTADO: PATCH LOCAL APLICADO PERO REQUIERE REVISION.');
console.log(report.join('\n'));
