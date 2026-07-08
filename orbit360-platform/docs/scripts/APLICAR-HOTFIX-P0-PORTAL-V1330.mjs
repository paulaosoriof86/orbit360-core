#!/usr/bin/env node
/**
 * Orbit 360 A&S — aplicar hotfix P0 Portal v1330.
 *
 * Uso desde raíz del repo:
 *   node orbit360-platform/docs/scripts/APLICAR-HOTFIX-P0-PORTAL-V1330.mjs
 *
 * Hace backup, toca solo modules/portal.js, valida sintaxis y genera reporte.
 * No commit, no push, no deploy, no Firestore, no backend protegido, no index.html.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const portalPath = path.join(ROOT, 'orbit360-platform/modules/portal.js');
const backupRoot = path.join(ROOT, '_backups', `pre_hotfix_p0_portal_v1330_${stamp}`);
const reportRoot = path.join(ROOT, '_orbit360_reports');
const reportFile = path.join(reportRoot, `hotfix_p0_portal_v1330_${stamp}.md`);
const marker = 'ORBIT360 V1330 HOTFIX P0 PORTAL';

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
    if (depth === 0) return src.slice(0, start) + replacement + src.slice(i + 1);
  }
  fail('No se pudo cerrar función ' + fnName);
}
function insertBeforeOnce(src, needle, block) {
  if (src.includes(block.split('\n')[0])) return src;
  const i = src.indexOf(needle);
  if (i < 0) fail('No se encontró punto de inserción: ' + needle);
  return src.slice(0, i) + block + '\n' + src.slice(i);
}

function patchPortal() {
  let s = read(portalPath);
  backup(portalPath);
  if (!s.includes(marker + ' START')) {
    const helpers = `  // ${marker} START
  function portalActorName() {
    try { const u = Orbit.auth && Orbit.auth.user && Orbit.auth.user(); return (u && (u.nombre || u.email)) || 'Cliente portal'; } catch(e) { return 'Cliente portal'; }
  }
  function portalAudit(accion, entidadTipo, entidadId, motivo, patch, resultado) {
    try { S().insert('auditoria', {
      id: 'audpt' + Date.now() + Math.floor(Math.random() * 999), tenantId: (Orbit.tenant && Orbit.tenant.id) || 'tenant-demo', fecha: new Date().toISOString(),
      actorRol: 'ClientePortal', actorNombre: portalActorName(), modulo: 'portal_cliente', categoria: accion.indexOf('documento') >= 0 ? 'documento' : 'cobro', accion,
      severidad: 'info', motivo: motivo || 'Acción registrada desde portal cliente', entidadTipo, entidadId, clienteId, before: {}, after: patch || {}, resultado: resultado || 'registrado', bloqueos: []
    }); } catch(e) {}
  }
  function registrarDocumentoPortal(opts) {
    opts = opts || {};
    const id = 'docpt' + Date.now() + Math.floor(Math.random() * 999);
    const doc = {
      id, tenantId: (Orbit.tenant && Orbit.tenant.id) || 'tenant-demo', clienteId,
      polizaId: opts.polizaId || '', cobroId: opts.cobroId || '', tipo: opts.tipo || 'documento', nombre: opts.nombre || opts.tipo || 'Documento',
      mimeType: opts.mimeType || '', tamano: opts.tamano || 0, fecha: Orbit.ui.today(), origen: 'Portal del cliente', estado: 'en_revision',
      metaOnly: true, storageEstado: 'pendiente_storage', visibilidadCliente: true, nota: opts.nota || ''
    };
    S().insert('documentos', doc);
    portalAudit('documento_recibido_metadata_only', 'documento', id, 'Documento recibido desde portal; pendiente revisión', doc, 'registrado');
    return id;
  }
  // ${marker} END
`;
    s = insertBeforeOnce(s, '  function adminNotif()', helpers);
  }

  const reportarPago = `  function reportarPago(cobroId) {
    const c = S().get('cobros', cobroId); if (!c) return;
    const cli = S().get('clientes', clienteId) || {};
    const pol = S().get('polizas', c.polizaId) || {};
    const html = '<div class="cfg-note">Reporta tu pago de la cuota <b>' + U.esc(c.cuota || '') + '</b> por <b>' + U.money(c.monto, c.moneda) + '</b>. El equipo lo valida; este reporte no aplica el pago automáticamente.</div>'
      + '<label class="ce-l" style="margin-top:10px">Fecha del pago<input id="rp-fecha" class="o-sel" type="date" value="' + Orbit.ui.today() + '"></label>'
      + '<label class="ce-l" style="margin-top:10px">Soporte de pago (comprobante)<input id="rp-file" type="file" class="o-sel" accept="image/*,application/pdf"></label>'
      + '<div class="cfg-note" style="margin-top:8px">El soporte queda registrado como documento metadata-only: no se guarda archivo/base64 y requiere revisión del equipo.</div>'
      + '<label class="ce-l" style="margin-top:10px">Nota<input id="rp-nota" class="o-sel" placeholder="Banco, referencia…"></label>';
    const back = drawer('📤 Reportar pago', html, () => {
      const f = back.querySelector('#rp-file').files[0];
      const fechaPagoCliente = back.querySelector('#rp-fecha').value || Orbit.ui.today();
      const nota = back.querySelector('#rp-nota').value || '';
      const docId = f ? registrarDocumentoPortal({ cobroId, polizaId: c.polizaId, tipo: 'soporte_pago', nombre: f.name, mimeType: f.type || '', tamano: f.size || 0, nota }) : '';
      const hist = (c.historial || []).concat([{ accion: 'reportado_cliente', motivo: nota, documentoId: docId, soporte: f ? f.name : '', responsable: 'Cliente portal', ts: new Date().toISOString() }]);
      const patch = { reportado: Orbit.ui.today(), fechaPagoReportada: fechaPagoCliente, soporteNombre: f ? f.name : '', soporteDocumentoId: docId, soporteMetaOnly: !!f, soporteEstado: f ? 'en_revision' : '', notaReporte: nota, enRevision: true, reporteRechazado: false, validadoReporte: false, historial: hist };
      S().update('cobros', cobroId, patch);
      portalAudit('pago_reportado_recibido', 'cobro', cobroId, 'Pago reportado por cliente; pendiente validación', patch, 'registrado');
      S().insert('actividades', { id: 'act' + Date.now(), clienteId, asesorId: pol.asesorId || cli.asesorId, tipo: 'sistema', icon: '📤', fecha: Orbit.ui.today(), titulo: 'Pago reportado por el cliente', detalle: 'Cuota ' + c.cuota + ' · ' + U.money(c.monto, c.moneda) + (f ? ' · soporte metadata-only: ' + f.name : '') + ' · pendiente de validar' });
      if (Orbit.ciclo && Orbit.ciclo.crearGestion) Orbit.ciclo.crearGestion({ lista: 'Gestiones Admin', tipo: 'Validar pago reportado', titulo: 'Validar pago · ' + (cli.nombre || 'cliente'), clienteId, polizaId: c.polizaId, asesorId: pol.asesorId || cli.asesorId, prioridad: 'Alta', vence: Orbit.ui.today(), nota: 'El cliente reportó el pago de la cuota ' + c.cuota + (docId ? ' · documento soporte ' + docId : ''), origen: 'Portal del cliente' });
      back.remove(); toast('✓ Soporte recibido · pendiente de validación por el equipo'); render(host);
    }, 'Enviar reporte');
  }`;
  s = replaceFunction(s, 'reportarPago', reportarPago);

  const subirDoc = `  function subirDoc() {
    const cli = S().get('clientes', clienteId) || {};
    const html = '<label class="ce-l">Tipo de documento<select id="sd-tipo" class="o-sel">' + ['DPI / Cédula', 'RTU / RUT', 'Licencia', 'Comprobante de domicilio', 'Otro'].map(t => '<option>' + t + '</option>').join('') + '</select></label>'
      + '<label class="ce-l" style="margin-top:10px">Archivo<input id="sd-file" type="file" class="o-sel"></label>'
      + '<div class="cfg-note" style="margin-top:10px">Tu documento queda registrado en el expediente para revisión del equipo. No reemplaza datos por sí solo. La carga real del archivo requiere canal seguro de documentos.</div>';
    const back = drawer('⬆ Añadir documento', html, () => {
      const f = back.querySelector('#sd-file').files[0]; const tipo = back.querySelector('#sd-tipo').value;
      const docId = registrarDocumentoPortal({ tipo, nombre: f ? f.name : tipo, mimeType: f ? (f.type || '') : '', tamano: f ? (f.size || 0) : 0 });
      S().insert('actividades', { id: 'act' + Date.now(), clienteId, asesorId: cli.asesorId, tipo: 'sistema', icon: '📁', fecha: Orbit.ui.today(), titulo: 'Documento registrado por el cliente', detalle: tipo + (f ? ' · ' + f.name : '') + ' · revisión pendiente / metadata-only · doc ' + docId });
      back.remove(); toast('✓ Documento registrado en expediente · revisión pendiente'); render(host);
    }, 'Registrar');
  }`;
  s = replaceFunction(s, 'subirDoc', subirDoc);

  if (/readAsDataURL|base64|fileBytes|downloadUrl|publicUrl/.test(s)) fail('portal.js contiene patrón prohibido de archivo/base64/url pública');
  write(portalPath, s);
}

const br = branch();
fs.mkdirSync(reportRoot, { recursive: true });
patchPortal();
const result = check(portalPath);
const report = ['# Hotfix P0 Portal v1330', '', 'Fecha: ' + new Date().toISOString(), 'Rama detectada: ' + (br || 'S/D'), 'Backup: ' + backupRoot, '', '## Validaciones', '- orbit360-platform/modules/portal.js: ' + (result.code === 0 ? 'OK' : 'ERROR ' + result.code), '', '## Cambios', '- soporte de pago como documento metadata-only', '- relación cobro-documento con soporteDocumentoId', '- fecha dinámica', '- auditoría portal', '- documento general metadata-only reforzado'].join('\n');
write(reportFile, report);
console.log(JSON.stringify({ ok: result.code === 0, branch: br, backupRoot: path.relative(ROOT, backupRoot), reportFile: path.relative(ROOT, reportFile), checks: [{ file: 'orbit360-platform/modules/portal.js', code: result.code }] }, null, 2));
if (result.code !== 0) process.exit(1);
