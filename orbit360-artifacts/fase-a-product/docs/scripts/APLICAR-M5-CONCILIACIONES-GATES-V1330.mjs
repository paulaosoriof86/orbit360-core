import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const expectedBranch = 'ays/backend-tenant-lab-v99-20260703';
const finanzasPath = path.join(ROOT, 'orbit360-platform/modules/finanzas.js');
const docPath = path.join(ROOT, 'orbit360-platform/docs/CIERRE-M5-CONCILIACIONES-GATES-V1330-20260708.md');
const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const backupDir = path.join(ROOT, `_backups/pre_m5_conciliaciones_gates_v1330_${stamp}`);
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
function marked(text, start, end, block) {
  const full = `${start}\n${block.trim()}\n${end}`;
  const a = text.indexOf(start), b = text.indexOf(end);
  if (a >= 0 && b > a) return text.slice(0, a) + full + text.slice(b + end.length);
  return `${text.trimEnd()}\n\n${full}\n`;
}

const patch = String.raw`
(function orbit360M5ConciliacionesGatesV1330(){
  'use strict';
  if (window.__orbit360M5ConciliacionesGatesV1330) return;
  window.__orbit360M5ConciliacionesGatesV1330 = true;

  function O(){ return window.Orbit || {}; }
  function S(){ return O().store || {}; }
  function UI(){ return O().ui || {}; }
  function esc(v){ return UI().esc ? UI().esc(v == null ? '' : String(v)) : String(v == null ? '' : v).replace(/[&<>"']/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); }
  function money(v, cur){ return UI().money ? UI().money(+v || 0, cur || 'GTQ') : ((cur || '') + ' ' + (+v || 0).toFixed(2)); }
  function toast(t){ try{ if(UI().toast) return UI().toast(t); var e=document.createElement('div'); e.className='ciclo-toast'; e.textContent=t; document.body.appendChild(e); setTimeout(function(){e.remove();},2600); }catch(x){} }
  function paisActual(){ return (O().pais && O().pais !== 'TODOS') ? O().pais : ''; }
  function rows(){ try{ var p=paisActual(); return (S().all('conciliacionBanco')||[]).filter(function(x){ return !p || x.pais === p; }); }catch(e){ return []; } }
  function audit(action, id, before, after, motivo){
    var entry={id:'audit_m5_conc_'+Date.now()+'_'+Math.random().toString(16).slice(2), fecha:new Date().toISOString(), modulo:'finanzas', submodulo:'conciliaciones', accion:action, conciliacionId:id, motivo:motivo||'', before:before||null, after:after||null, resultado:'registrado', aplicaClaude:'Si', patronClaude:'Conciliaciones con motivo obligatorio, bitacora, validada no aplicada y bloqueo por pais/moneda.'};
    try{ if(S().insert) S().insert('auditoria', entry); }catch(e){}
    try{ window.dispatchEvent(new CustomEvent('orbit:audit-gate',{detail:entry})); }catch(e){}
  }
  function estadoBadge(st){
    st = st || 'pendiente_conciliacion';
    var tone = /validad|conciliad/.test(st) ? 'ok' : /rechaz|bloque|anulad/.test(st) ? 'danger' : 'warn';
    return '<span class="badge '+tone+'">'+esc(st.replace(/_/g,' '))+'</span>';
  }
  function validacion(r){
    var errs=[];
    if(!r.pais) errs.push('falta pais');
    if(!r.moneda) errs.push('falta moneda');
    if(r.pais==='GT' && r.moneda && r.moneda!=='GTQ') errs.push('GT requiere GTQ');
    if(r.pais==='CO' && r.moneda && r.moneda!=='COP') errs.push('CO requiere COP');
    if(r.bloqueo || r.bloqueado || /bloque|anulad/.test(String(r.estado||''))) errs.push('registro bloqueado/anulado');
    return errs;
  }
  function requiereMotivo(accion){
    var label={validar:'validar conciliacion', rechazar:'rechazar conciliacion', bloquear:'bloquear conciliacion', anular:'anular conciliacion'}[accion]||accion;
    if(accion==='anular'){
      var ok=prompt('Confirmación reforzada: escribe ANULAR para continuar.');
      if(ok!=='ANULAR') return '';
    }
    var m=prompt('Motivo obligatorio para '+label+':');
    if(!m || m.trim().length<5){ alert('Acción cancelada. Debe indicar un motivo claro.'); return ''; }
    return m.trim();
  }
  function accion(id, accion){
    var r = S().get ? S().get('conciliacionBanco', id) : null;
    if(!r){ toast('No se encontró la conciliación.'); return; }
    var before=JSON.parse(JSON.stringify(r));
    var motivo=requiereMotivo(accion); if(!motivo) return;
    var patch={m5: true, actualizadoEn:new Date().toISOString(), motivoUltimaAccion:motivo, pagoAplicado:false};
    if(accion==='validar'){
      var errs=validacion(r);
      if(errs.length){ alert('No se puede validar: '+errs.join(', ')+'.'); audit('validar_bloqueada',id,before,Object.assign({},r,{bloqueosM5:errs}),motivo); return; }
      patch.estado='validada';
      patch.validadaNoAplicada=true;
      patch.requiereAplicacionPago=true;
      patch.notaM5='VALIDADA no equivale a pago aplicado; requiere aplicación/conciliación posterior autorizada.';
    } else if(accion==='rechazar') patch.estado='rechazada';
    else if(accion==='bloquear') { patch.estado='bloqueada'; patch.bloqueo=true; }
    else if(accion==='anular') { patch.estado='anulada'; patch.bloqueo=true; }
    try{ S().update('conciliacionBanco', id, patch); }catch(e){ toast('No se pudo actualizar conciliación.'); return; }
    audit(accion,id,before,Object.assign({},r,patch),motivo);
    toast('✓ Conciliación '+accion+' registrada en bitácora');
    setTimeout(inject,80);
  }
  function inject(){
    var body=document.getElementById('fin-body');
    if(!body || !/Conciliaci/.test(body.textContent||'')) return;
    var old=document.getElementById('m5-conc-panel'); if(old) old.remove();
    var rs=rows();
    var html='<div id="m5-conc-panel" class="card" style="overflow:hidden;margin-top:14px;border-left:4px solid var(--red)">';
    html+='<div style="padding:12px 14px;border-bottom:1px solid var(--line);display:flex;gap:10px;align-items:center;flex-wrap:wrap"><b style="font-family:var(--f-display);font-size:14px">M5 · Gates de conciliación</b><span class="badge warn">Validada ≠ pago aplicado</span><span class="muted" style="font-size:12px">Toda acción exige motivo y bitácora. País/moneda bloquean validación si faltan o no coinciden.</span></div>';
    html+='<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Referencia</th><th>País/moneda</th><th class="num">Monto</th><th>Estado</th><th>Bloqueos</th><th></th></tr></thead><tbody>';
    if(!rs.length){ html+='<tr><td colspan="6" class="muted" style="text-align:center;padding:18px">Sin registros importados en conciliacionBanco. Importa estado bancario para generar propuestas; no se aplican cobros automáticamente.</td></tr>'; }
    rs.slice(0,24).forEach(function(r){
      var errs=validacion(r), can=!errs.length;
      html+='<tr><td><b>'+esc(r.ref||r.referencia||r.id)+'</b><div class="muted" style="font-size:11px">'+esc(r.fecha||r.periodo||'')+' · '+esc(r.banco||r.cuenta||r.concepto||'')+'</div></td>';
      html+='<td><span class="badge '+(can?'ok':'warn')+'">'+esc(r.pais||'S/D')+' · '+esc(r.moneda||'S/D')+'</span></td>';
      html+='<td class="num"><b>'+money(r.monto||r.valor||0,r.moneda||'')+'</b></td><td>'+estadoBadge(r.estado)+'</td><td style="font-size:12px">'+(errs.length?esc(errs.join(' · ')):'—')+'</td>';
      html+='<td style="text-align:right;display:flex;gap:5px;justify-content:flex-end;flex-wrap:wrap"><button class="btn ghost sm" '+(can?'':'disabled title="Falta país/moneda o hay bloqueo"')+' onclick="Orbit.modules.finanzas.conciliacionM5Accion(\''+esc(r.id)+'\',\'validar\')">Validar</button><button class="btn ghost sm" onclick="Orbit.modules.finanzas.conciliacionM5Accion(\''+esc(r.id)+'\',\'rechazar\')">Rechazar</button><button class="btn ghost sm" onclick="Orbit.modules.finanzas.conciliacionM5Accion(\''+esc(r.id)+'\',\'bloquear\')">Bloquear</button><button class="btn ghost sm" style="color:var(--danger)" onclick="Orbit.modules.finanzas.conciliacionM5Accion(\''+esc(r.id)+'\',\'anular\')">Anular</button></td></tr>';
    });
    html+='</tbody></table></div><div class="cfg-note" style="margin:12px 14px">Este panel no crea clientes, pólizas, cobros ni cartera. La validación deja una propuesta lista para aplicación posterior autorizada.</div></div>';
    body.insertAdjacentHTML('beforeend', html);
  }
  if(O().modules && O().modules.finanzas) O().modules.finanzas.conciliacionM5Accion=accion;
  document.addEventListener('click', function(){ setTimeout(inject,120); }, true);
  document.addEventListener('orbit:pais', function(){ setTimeout(inject,120); });
  setInterval(inject,1200);
  setTimeout(inject,500);
})();`;

log('======================================================================');
log('ORBIT 360 A&S — M5 CONCILIACIONES GATES V1330');
log(`Fecha local: ${new Date().toISOString()}`);
log('No commit | No push | No merge | No deploy | No main');
log('======================================================================');
const branch = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
log(`Rama local: ${branch}`);
if (branch !== expectedBranch) { log(`BLOQUEADO: rama incorrecta. Esperada: ${expectedBranch}`); console.log(report.join('\n')); process.exit(1); }
if (!fs.existsSync(finanzasPath)) { log('BLOQUEADO: falta orbit360-platform/modules/finanzas.js'); console.log(report.join('\n')); process.exit(1); }
fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(finanzasPath, path.join(backupDir, 'finanzas.js.before'));
log(`Backup: ${backupDir}`);

let finanzas = fs.readFileSync(finanzasPath, 'utf8');
finanzas = marked(finanzas, '// ORBIT360 V1330 M5 CONCILIACIONES GATES PATCH START', '// ORBIT360 V1330 M5 CONCILIACIONES GATES PATCH END', patch);
fs.writeFileSync(finanzasPath, finanzas, 'utf8');

const doc = `# CIERRE M5 CONCILIACIONES GATES V1330\n\nFecha local: ${new Date().toISOString()}\nProyecto: Orbit 360 A&S\nRama: ${expectedBranch}\nPR vigente: #5 draft, sin merge, sin deploy, sin main.\n\n## Alcance aplicado\n\nArchivo funcional modificado:\n\n- orbit360-platform/modules/finanzas.js\n\nDocumento creado:\n\n- orbit360-platform/docs/CIERRE-M5-CONCILIACIONES-GATES-V1330-20260708.md\n\nNo se tocaron backend protegido, index.html, Auth, importadores, reglas, tools/orbit360-*, producción, deploy, merge ni main.\n\n## Reglas implementadas\n\n- Validar, rechazar, bloquear y anular conciliaciones exige motivo obligatorio.\n- Anular exige confirmación reforzada.\n- Validar se bloquea si falta país, moneda o existe incoherencia GT/GTQ o CO/COP.\n- Validar se bloquea si el registro está bloqueado o anulado.\n- VALIDADA no se interpreta como pago aplicado. Se marca validadaNoAplicada=true, pagoAplicado=false y requiereAplicacionPago=true.\n- Toda acción registra bitácora/auditoría cuando Orbit.store.insert está disponible.\n- El panel M5 no crea clientes, pólizas, cobros ni cartera.\n\n## ¿Aplica a Claude/prototipo?\n\nSí. Claude debe conservar estados honestos de conciliación: propuesta, pendiente, validada no aplicada, rechazada, bloqueada y anulada. Academia debe explicar que validar no equivale a cobrar ni aplicar pago.\n\n## Estado\n\nPatch local aplicado por script corto versionado. Pendiente commit/push solo con autorización expresa de Paula.\n`;
fs.writeFileSync(docPath, doc, 'utf8');

const c1 = run('NODE CHECK finanzas.js', 'node', ['--check', 'orbit360-platform/modules/finanzas.js']);
const c2 = run('CONTRATO BACKEND LAB', 'node', ['tools/orbit360-validar-backend-lab-contrato.mjs']);
run('GIT STATUS', 'git', ['status', '--short']);
if (c1 === 0 && c2 === 0) log('\nRESULTADO: M5 CONCILIACIONES APLICADO Y VALIDADO.');
else log('\nRESULTADO: M5 CONCILIACIONES APLICADO PERO REQUIERE REVISION.');
console.log(report.join('\n'));
