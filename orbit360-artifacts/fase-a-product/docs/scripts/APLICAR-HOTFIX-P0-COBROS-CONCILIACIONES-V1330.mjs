#!/usr/bin/env node
/**
 * Orbit 360 A&S — aplicar hotfix P0 Cobros + Conciliaciones v1330.
 *
 * Uso desde raíz del repo:
 *   node orbit360-platform/docs/scripts/APLICAR-HOTFIX-P0-COBROS-CONCILIACIONES-V1330.mjs
 *
 * Hace backup, toca solo modules/cobros.js y modules/conciliaciones.js,
 * valida sintaxis y genera reporte. No commit, no push, no deploy.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const cobrosPath = path.join(ROOT, 'orbit360-platform/modules/cobros.js');
const concPath = path.join(ROOT, 'orbit360-platform/modules/conciliaciones.js');
const backupRoot = path.join(ROOT, '_backups', `pre_hotfix_p0_cobros_conciliaciones_v1330_${stamp}`);
const reportRoot = path.join(ROOT, '_orbit360_reports');
const reportFile = path.join(reportRoot, `hotfix_p0_cobros_conciliaciones_v1330_${stamp}.md`);
const marker = 'ORBIT360 V1330 HOTFIX P0 COBROS CONCILIACIONES';

function fail(msg) { console.error('ERROR: ' + msg); process.exit(1); }
function read(file) { if (!fs.existsSync(file)) fail('No existe ' + file); return fs.readFileSync(file, 'utf8'); }
function write(file, txt) { fs.writeFileSync(file, txt, 'utf8'); }
function backup(file) { fs.mkdirSync(backupRoot, { recursive: true }); fs.copyFileSync(file, path.join(backupRoot, path.basename(file))); }
function check(file) { const r = spawnSync('node', ['--check', file], { cwd: ROOT, encoding: 'utf8' }); return { file, code: r.status || 0, stderr: r.stderr || '' }; }
function branch() { const r = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }); return (r.stdout || '').trim(); }
function replaceFunction(src, fnName, replacement) {
  const start = src.indexOf('  function ' + fnName + '(');
  if (start < 0) fail('No se encontró función ' + fnName);
  const open = src.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') depth++;
    if (ch === '}') depth--;
    if (depth === 0) {
      return src.slice(0, start) + replacement + src.slice(i + 1);
    }
  }
  fail('No se pudo cerrar función ' + fnName);
}
function insertBeforeOnce(src, needle, block) {
  if (src.includes(block.split('\n')[0])) return src;
  const i = src.indexOf(needle);
  if (i < 0) fail('No se encontró punto de inserción: ' + needle);
  return src.slice(0, i) + block + '\n' + src.slice(i);
}

function patchCobros() {
  let s = read(cobrosPath);
  backup(cobrosPath);
  if (!s.includes(marker + ' COBROS START')) {
    s = s.replace("if (c.validadoReporte && (c.estado === 'Pendiente' || c.estado === 'Vencido')) return 'Validada (por aplicar)';", "if (c.validadoReporte && (c.estado === 'Pendiente' || c.estado === 'Vencido')) return 'Validada (por confirmar)';");
    s = s.replace("e === 'Validada (por aplicar)' ? 'ok'", "e === 'Validada (por confirmar)' ? 'ok'");
    const helpers = `  // ${marker} COBROS START
  function actorName() {
    try { const u = Orbit.auth && Orbit.auth.user && Orbit.auth.user(); return (u && (u.nombre || u.email)) || 'Usuario'; } catch(e) { return 'Usuario'; }
  }
  function paisMonedaCobro(c) {
    const cli = S().get('clientes', c.clienteId) || {};
    const pol = S().get('polizas', c.polizaId) || {};
    const pais = c.pais || cli.pais || pol.pais || (Orbit.pais && Orbit.pais !== 'TODOS' ? Orbit.pais : '');
    const moneda = c.moneda || pol.moneda || cli.moneda || '';
    const bloqueos = [];
    if (!pais || !moneda) bloqueos.push('pais_moneda_faltante');
    if (pais === 'GT' && moneda !== 'GTQ') bloqueos.push('moneda_incoherente_gt_gtq');
    if (pais === 'CO' && moneda !== 'COP') bloqueos.push('moneda_incoherente_co_cop');
    return { ok: !bloqueos.length, pais, moneda, bloqueos };
  }
  function auditCobro(c, accion, motivo, patch, resultado, bloqueos) {
    try { S().insert('auditoria', {
      id: 'aud' + Date.now() + Math.floor(Math.random() * 999), tenantId: (Orbit.tenant && Orbit.tenant.id) || 'tenant-demo', fecha: new Date().toISOString(),
      actorRol: (Orbit.auth && Orbit.auth.role && Orbit.auth.role()) || '', actorNombre: actorName(), modulo: 'cobros', categoria: 'cobro', accion,
      severidad: bloqueos && bloqueos.length ? 'blocked' : 'warning', motivo: motivo || 'Acción operativa registrada', entidadTipo: 'cobro', entidadId: c.id,
      pais: (patch && patch.pais) || c.pais || '', moneda: (patch && patch.moneda) || c.moneda || '', before: { estado: c.estado, reportado: !!c.reportado, validadoReporte: !!c.validadoReporte, conciliado: !!c.conciliado },
      after: patch || {}, resultado: resultado || 'registrado', bloqueos: bloqueos || []
    }); } catch(e) {}
  }
  // ${marker} COBROS END
`;
    s = insertBeforeOnce(s, '  function render(host) {', helpers);
  }

  const validar = `  function validarReporte(cobroId) {
    const c = S().get('cobros', cobroId); if (!c) return;
    const cli = S().get('clientes', c.clienteId) || {};
    let pm = document.getElementById('cob-val'); if (pm) pm.remove();
    pm = document.createElement('div'); pm.id = 'cob-val'; pm.className = 'drawer-back open'; pm.style.cssText = 'display:grid;place-items:center;z-index:210';
    pm.innerHTML = \`<div class="card" style="width:min(460px,94vw);padding:0"><div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display);font-size:16px">🔎 Validar pago reportado</b><button class="imp-x" id="cv-x">✕</button></div><div style="padding:18px 20px;display:grid;gap:12px"><div class="cfg-note">El cliente <b>\${U.esc(cli.nombre || '')}</b> reportó este pago (cuota \${c.cuota}, \${U.money(c.monto, c.moneda)}) el \${U.fmtDate(c.reportado)}. \${c.soporteNombre ? 'Soporte: <b>' + U.esc(c.soporteNombre) + '</b>.' : 'Sin soporte adjunto.'} Revisa contra el estado de cuenta antes de aplicar.</div>\${c.notaReporte ? '<div style="font-size:12.5px"><b>Nota del cliente:</b> ' + U.esc(c.notaReporte) + '</div>' : ''}<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ghost sm" id="cv-rev">◷ Marcar en revisión</button><button class="btn ghost sm" id="cv-rej" style="color:var(--danger)">✕ Rechazar reporte</button></div></div><div style="padding:13px 20px;border-top:1px solid var(--line);display:flex;justify-content:flex-end;gap:8px"><button class="btn ghost" id="cv-close">Cerrar</button><button class="btn primary" id="cv-ok">✓ Validar reporte</button></div></div>\`;
    document.body.appendChild(pm);
    const close = () => pm.remove();
    pm.addEventListener('click', e => { if (e.target === pm) close(); });
    pm.querySelector('#cv-x').onclick = close; pm.querySelector('#cv-close').onclick = close;
    const hist = (accion, motivo) => (c.historial || []).concat([{ accion, motivo: motivo || '', responsable: actorName(), ts: new Date().toISOString() }]);
    pm.querySelector('#cv-rev').onclick = () => { const patch = { enRevision: true, historial: hist('en_revision','') }; S().update('cobros', cobroId, patch); auditCobro(c, 'pago_reportado_en_revision', 'Marcado para revisión', patch, 'registrado', []); close(); const h = document.getElementById('host'); if (h) render(h); Orbit.ui.toast('◷ Pago en revisión'); };
    pm.querySelector('#cv-rej').onclick = () => { const motivo = (prompt('Motivo del rechazo (obligatorio):','') || '').trim(); if (!motivo) { Orbit.ui.toast('Se requiere motivo'); return; } const patch = { reporteRechazado: true, reporteRechazoMotivo: motivo, enRevision: false, validadoReporte: false, historial: hist('rechazar', motivo) }; S().update('cobros', cobroId, patch); auditCobro(c, 'pago_reportado_rechazado', motivo, patch, 'rechazado', []); close(); const h = document.getElementById('host'); if (h) render(h); Orbit.ui.toast('✕ Reporte rechazado · soporte conservado'); };
    pm.querySelector('#cv-ok').onclick = () => { const motivo = (prompt('Motivo de validación (obligatorio · no aplica pago):','') || '').trim(); if (!motivo) { Orbit.ui.toast('Se requiere motivo'); return; } const patch = { validadoReporte: true, enRevision: false, reporteRechazado: false, validadoPor: actorName(), validadoFecha: Orbit.ui.today(), validacionMotivo: motivo, historial: hist('validar_no_aplicar', motivo) }; S().update('cobros', cobroId, patch); auditCobro(c, 'pago_reportado_validado_no_aplicado', motivo, patch, 'registrado', []); close(); const h = document.getElementById('host'); if (h) render(h); Orbit.ui.toast('✓ Reporte validado · pendiente de aplicación autorizada'); };
  }`;
  s = replaceFunction(s, 'validarReporte', validar);

  const aplicar = `  function aplicarPago(cobroId) {
    const c = S().get('cobros', cobroId); if (!c) return;
    const cur = c.moneda; let pm = document.getElementById('cob-pay'); if (pm) pm.remove();
    pm = document.createElement('div'); pm.id = 'cob-pay'; pm.className = 'drawer-back open'; pm.style.cssText = 'display:grid;place-items:center;z-index:210';
    const hoy = new Date().toISOString().slice(0, 10);
    pm.innerHTML = '<div class="card" style="width:min(500px,95vw);padding:0;max-height:92vh;overflow:auto"><div style="padding:16px 20px;background:linear-gradient(120deg,var(--graph),#10141a);display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:11px;font-weight:700;letter-spacing:.1em;color:rgba(255,255,255,.6);text-transform:uppercase">Cobros · aplicar pago autorizado</div><b style="font-family:var(--f-display);font-size:16px;color:#fff">💳 Aplicar pago — ' + U.money(c.monto, cur) + '</b></div><button class="imp-x" id="pm-x" style="background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.25);color:#fff">✕</button></div><div style="padding:18px 20px;display:grid;gap:12px"><div class="cfg-note">Aplicar pago exige motivo y país/moneda válidos. La factura queda como documento en revisión y no concilia automáticamente.</div><label class="ce-l">Fecha de aplicación *<input id="pm-fecha" class="o-sel" type="date" value="' + hoy + '"></label><label class="ce-l">Método de pago<select id="pm-metodo" class="o-sel"><option>Transferencia bancaria</option><option>Tarjeta de crédito</option><option>Tarjeta de débito</option><option>Cheque</option><option>Efectivo</option><option>Visa cuotas</option></select></label><label class="ce-l">Motivo de aplicación autorizada *<textarea id="pm-motivo" class="o-sel" rows="2" placeholder="Ej.: soporte revisado y autorizado por cobros"></textarea></label><div class="ce-l"><span style="font-size:12.5px;font-weight:600;color:var(--ink-2);margin-bottom:7px;display:block">📄 Factura de la aseguradora (metadata-only opcional)</span><div style="display:flex;gap:8px;align-items:center"><button class="btn ghost sm" id="pm-fact-btn">⬆ Registrar factura</button><span id="pm-fact-name" class="muted" style="font-size:12px">Sin factura</span></div><div class="muted" style="font-size:11.5px;margin-top:5px">La factura se registra como evidencia documental. No guarda archivo/base64 y no concilia automáticamente.</div></div><label class="ce-l">Fecha real de pago (si aplica)<input id="pm-fecha-real" class="o-sel" type="date"></label></div><div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" id="pm-cancel">Cancelar</button><button class="btn primary" id="pm-ok">✅ Aplicar pago</button></div></div>';
    document.body.appendChild(pm);
    let factMeta = null;
    const pmClose = () => pm.remove();
    pm.addEventListener('click', e => { if (e.target === pm) pmClose(); });
    pm.querySelector('#pm-x').onclick = pmClose; pm.querySelector('#pm-cancel').onclick = pmClose;
    pm.querySelector('#pm-fact-btn').onclick = () => { const fi = document.createElement('input'); fi.type = 'file'; fi.accept = '.pdf,image/*'; fi.onchange = () => { if (!fi.files[0]) return; const f = fi.files[0]; factMeta = { nombre: f.name, tipo: f.type || '', tamano: f.size || 0 }; pm.querySelector('#pm-fact-name').textContent = '📄 ' + factMeta.nombre + ' · metadata-only'; }; fi.click(); };
    pm.querySelector('#pm-ok').onclick = () => {
      const fecha = pm.querySelector('#pm-fecha').value, metodo = pm.querySelector('#pm-metodo').value, motivo = (pm.querySelector('#pm-motivo').value || '').trim(), fechaReal = pm.querySelector('#pm-fecha-real').value;
      if (!motivo) { Orbit.ui.toast('Se requiere motivo para aplicar pago'); return; }
      const chk = paisMonedaCobro(c);
      if (!chk.ok) { auditCobro(c, 'pago_aplicacion_bloqueada', motivo, { requiereValidacion: true, pais: chk.pais, moneda: chk.moneda }, 'bloqueado', chk.bloqueos); Orbit.ui.toast('Aplicación bloqueada: falta o no coincide país/moneda'); return; }
      let facturaDocumentoId = c.facturaDocumentoId || '';
      if (factMeta) { facturaDocumentoId = 'docfact' + Date.now() + Math.floor(Math.random()*999); try { S().insert('documentos', { id: facturaDocumentoId, tenantId: (Orbit.tenant && Orbit.tenant.id) || 'tenant-demo', clienteId: c.clienteId, polizaId: c.polizaId, cobroId, tipo: 'factura_aseguradora', nombre: factMeta.nombre, mimeType: factMeta.tipo, tamano: factMeta.tamano, origen: 'cobros', estado: 'en_revision', metaOnly: true, storageEstado: 'pendiente_storage', fecha }); } catch(e) {} }
      const patch = { estado: 'Pagado', fechaPago: fecha, metodo, conciliado: c.conciliado === true, motivoAplicacion: motivo, pais: chk.pais, moneda: chk.moneda, aplicadoPor: actorName(), aplicadoFecha: new Date().toISOString() };
      if (factMeta) Object.assign(patch, { facturaNombre: factMeta.nombre, facturaMetaOnly: true, facturaEstado: 'en_revision', facturaDocumentoId, fechaReal: fechaReal || fecha });
      S().update('cobros', cobroId, patch); auditCobro(c, 'pago_aplicado_autorizado', motivo, patch, 'aplicado', []);
      if (Orbit.q && Orbit.q.postRecaudo) Orbit.q.postRecaudo(Object.assign({}, c, patch), fecha, metodo);
      S().insert('actividades', { id: 'act'+Date.now(), clienteId: c.clienteId, asesorId: c.asesorId, tipo: 'cobro', icon: '💳', fecha, titulo: 'Pago aplicado con autorización', detalle: U.money(c.monto, cur) + ' · ' + metodo + ' · pendiente conciliación' + (factMeta ? ' · factura en revisión documental' : '') });
      const cliObj = S().get('clientes', c.clienteId); if (Orbit.modules.automatizaciones && cliObj) Orbit.modules.automatizaciones.disparar('pago_aplicado', { nombre: (cliObj.nombre||'').split(' ')[0], monto: U.money(c.monto, cur) });
      pmClose(); const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = '✅ Pago aplicado · pendiente conciliación'; document.body.appendChild(t); setTimeout(() => t.remove(), 2800); const h = document.getElementById('host'); if (h) render(h);
    };
  }`;
  s = replaceFunction(s, 'aplicarPago', aplicar);
  if (/readAsDataURL|base64|factData/.test(s)) fail('cobros.js aún contiene readAsDataURL/base64/factData');
  write(cobrosPath, s);
}

function patchConciliaciones() {
  let s = read(concPath);
  backup(concPath);
  if (!s.includes(marker + ' CONCILIACIONES START')) {
    const helpers = `  // ${marker} CONCILIACIONES START
  function estadoLabel(est) { return est === 'VALIDADA' ? 'VALIDADA · no aplicada' : String(est || '').replace('_', ' '); }
  function paisMonedaOk(r) {
    const pais = r.pais || (r.pais_moneda && String(r.pais_moneda).split('/')[0].trim()) || '';
    const moneda = r.moneda || (r.pais_moneda && String(r.pais_moneda).split('/')[1] && String(r.pais_moneda).split('/')[1].trim()) || '';
    const bloqueos = [];
    if (!pais || !moneda) bloqueos.push('pais_moneda_faltante');
    if (pais === 'GT' && moneda !== 'GTQ') bloqueos.push('moneda_incoherente_gt_gtq');
    if (pais === 'CO' && moneda !== 'COP') bloqueos.push('moneda_incoherente_co_cop');
    return { ok: !bloqueos.length, pais, moneda, bloqueos };
  }
  function auditarConciliacion(r, accion, motivo, patch, resultado, bloqueos) {
    try { S().insert('auditoria', { id: 'audconc' + Date.now() + Math.floor(Math.random() * 999), tenantId: (Orbit.tenant && Orbit.tenant.id) || 'tenant-demo', fecha: new Date().toISOString(), actorRol: (Orbit.auth && Orbit.auth.role && Orbit.auth.role()) || '', actorNombre: ((Orbit.auth && Orbit.auth.user && Orbit.auth.user() && (Orbit.auth.user().nombre || Orbit.auth.user().email)) || 'Usuario'), modulo: 'conciliaciones', categoria: 'conciliacion', accion, severidad: bloqueos && bloqueos.length ? 'blocked' : (accion === 'conciliacion_anulada' ? 'critical' : 'warning'), motivo, entidadTipo: 'conciliacion', entidadId: r.id, pais: (patch && patch.pais) || r.pais || '', moneda: (patch && patch.moneda) || r.moneda || '', before: { estado_bandeja: r.estado_bandeja || r.estado }, after: patch || {}, resultado: resultado || 'registrado', bloqueos: bloqueos || [] }); } catch(e) {}
  }
  // ${marker} CONCILIACIONES END
`;
    s = insertBeforeOnce(s, '  function render(host) {', helpers);
  }
  s = s.replace(/Validadas/g, 'Validadas no aplicadas');
  s = s.replace(/para proceso posterior autorizado/g, 'sin aplicar pagos desde esta bandeja');
  s = s.replace(/\$\{e\.replace\('_', ' '\)\}/g, '${estadoLabel(e)}');
  s = s.replace(/\$\{est\.replace\('_', ' '\)\}/g, '${estadoLabel(est)}');

  const accion = `  function accion(id, a) {
    const r = S().get('conciliaciones', id); if (!r) return;
    const permitidas = r.acciones_permitidas || ACCIONES[r.estado_bandeja || r.estado] || [];
    if (permitidas.indexOf(a) < 0) { U.toast('Acción no permitida en este estado'); return; }
    const nuevo = TRANS[a]; if (!nuevo) return;
    let motivo = '';
    if (a === 'validar') { const chk = paisMonedaOk(r); if (!chk.ok) { const histBloq = (r.historial || []).concat([{ accion: 'validacion_bloqueada', estado: r.estado_bandeja || r.estado, motivo: chk.bloqueos.join(', '), responsable: 'Sistema', ts: new Date().toISOString() }]); const patchBloq = { estado_revision: 'Validación bloqueada', bloqueos: Array.from(new Set([].concat(r.bloqueos || [], chk.bloqueos))), historial: histBloq, ultima_actualizacion: new Date().toISOString(), requiereValidacion: true }; S().update('conciliaciones', id, patchBloq); auditarConciliacion(r, 'conciliacion_validacion_bloqueada', 'País/moneda faltante o incoherente', patchBloq, 'bloqueado', chk.bloqueos); U.toast('Validación bloqueada: falta o no coincide país/moneda'); const h = document.getElementById('host'); if (h) render(h); return; } }
    if (a === 'anular') { const conf = (prompt('Confirmación reforzada: escribe ANULAR para anular la propuesta.','') || '').trim(); if (conf !== 'ANULAR') { U.toast('Anulación cancelada'); return; } }
    if (a === 'validar' || a === 'rechazar' || a === 'bloquear' || a === 'anular') { motivo = (prompt('Motivo de ' + a + ' (obligatorio):','') || '').trim(); if (!motivo) { U.toast('Se requiere motivo'); return; } }
    const quien = (Orbit.auth && Orbit.auth.user && Orbit.auth.user() && Orbit.auth.user().nombre) || 'Usuario';
    const estadoRev = a === 'validar' ? 'Validada por usuario · no aplicada' : a === 'rechazar' ? 'Rechazada' : a === 'tomar_en_revision' ? 'En revisión' : a === 'bloquear' ? 'Bloqueada' : 'Anulada';
    const hist = (r.historial || []).concat([{ accion: a, estado: nuevo, motivo: motivo || '', responsable: quien, ts: new Date().toISOString() }]);
    const patch = { estado_bandeja: nuevo, estado_revision: estadoRev, motivo: motivo || r.motivo || '', historial: hist, ultima_actualizacion: new Date().toISOString(), responsable: quien };
    if (a === 'validar') Object.assign(patch, { validadaNoAplicada: true, pagoAplicado: false, aplicaPagos: false });
    if (a === 'anular') patch.confirmacion = 'ANULAR';
    S().update('conciliaciones', id, patch);
    auditarConciliacion(r, a === 'validar' ? 'conciliacion_validada_no_aplicada' : a === 'anular' ? 'conciliacion_anulada' : 'conciliacion_' + a, motivo || 'Acción registrada', patch, 'registrado', []);
    U.toast('✓ Propuesta → ' + estadoLabel(nuevo) + (motivo ? ' · motivo registrado' : ''));
    const h = document.getElementById('host'); if (h) render(h);
  }`;
  s = replaceFunction(s, 'accion', accion);
  write(concPath, s);
}

const br = branch();
fs.mkdirSync(reportRoot, { recursive: true });
patchCobros();
patchConciliaciones();
const checks = [check(cobrosPath), check(concPath)];
const failed = checks.filter(x => x.code !== 0);
const report = ['# Hotfix P0 Cobros + Conciliaciones v1330', '', 'Fecha: ' + new Date().toISOString(), 'Rama detectada: ' + (br || 'S/D'), 'Backup: ' + backupRoot, '', '## Validaciones'].concat(checks.map(x => '- ' + path.relative(ROOT, x.file) + ': ' + (x.code === 0 ? 'OK' : 'ERROR ' + x.code)));
write(reportFile, report.join('\n'));
console.log(JSON.stringify({ ok: failed.length === 0, branch: br, backupRoot: path.relative(ROOT, backupRoot), reportFile: path.relative(ROOT, reportFile), checks: checks.map(x => ({ file: path.relative(ROOT, x.file), code: x.code })) }, null, 2));
if (failed.length) process.exit(1);
