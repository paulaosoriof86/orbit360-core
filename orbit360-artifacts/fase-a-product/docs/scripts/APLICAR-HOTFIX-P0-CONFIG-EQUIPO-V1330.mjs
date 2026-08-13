#!/usr/bin/env node
/**
 * Orbit 360 A&S — aplicar hotfix P0 Config/Equipo v1330.
 *
 * Uso desde raíz del repo:
 *   node orbit360-platform/docs/scripts/APLICAR-HOTFIX-P0-CONFIG-EQUIPO-V1330.mjs
 *
 * Hace backup, toca solo modules/configuracion.js y modules/equipo.js,
 * valida sintaxis y genera reporte. No commit, no push, no deploy.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const configPath = path.join(ROOT, 'orbit360-platform/modules/configuracion.js');
const equipoPath = path.join(ROOT, 'orbit360-platform/modules/equipo.js');
const backupRoot = path.join(ROOT, '_backups', `pre_hotfix_p0_config_equipo_v1330_${stamp}`);
const reportRoot = path.join(ROOT, '_orbit360_reports');
const reportFile = path.join(reportRoot, `hotfix_p0_config_equipo_v1330_${stamp}.md`);
const marker = 'ORBIT360 V1330 HOTFIX P0 CONFIG EQUIPO';

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

function patchConfiguracion() {
  let s = read(configPath);
  backup(configPath);
  if (!s.includes(marker + ' CONFIG START')) {
    const helpers = `  // ${marker} CONFIG START
  function cfgActorName() {
    try { const u = Orbit.auth && Orbit.auth.user && Orbit.auth.user(); return (u && (u.nombre || u.email)) || 'Usuario'; } catch(e) { return 'Usuario'; }
  }
  function cfgAudit(accion, motivo, patch, resultado) {
    try { Orbit.store.insert('auditoria', { id: 'audcfg' + Date.now() + Math.floor(Math.random()*999), tenantId: (Orbit.tenant && Orbit.tenant.id) || 'tenant-demo', fecha: new Date().toISOString(), actorRol: (Orbit.auth && Orbit.auth.role && Orbit.auth.role()) || '', actorNombre: cfgActorName(), modulo: 'configuracion', categoria: accion.indexOf('integracion') >= 0 ? 'integracion' : 'configuracion', accion, severidad: accion.indexOf('reset') >= 0 ? 'critical' : 'warning', motivo: motivo || 'Cambio administrativo registrado', entidadTipo: 'tenant_config', entidadId: (Orbit.tenant && Orbit.tenant.id) || 'tenant-demo', before: {}, after: patch || {}, resultado: resultado || 'registrado', bloqueos: [] }); } catch(e) {}
  }
  function motivoConfig(label) {
    const m = (prompt('Motivo obligatorio para ' + label + ':','') || '').trim();
    if (!m || m.length < 5) { Orbit.ui.toast('Se requiere motivo claro'); return ''; }
    return m;
  }
  // ${marker} CONFIG END
`;
    s = insertBeforeOnce(s, '  /* ---------- wiring ---------- */', helpers);
  }

  const configIntegracion = `  function configIntegracion(nombre, titulo) {
    const label = titulo || nombre;
    const esOutlook = nombre === 'correo';
    let back = document.getElementById('cf-integ'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'cf-integ'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 96;
    const saved = Orbit.store.pref('integ_' + nombre, {}) || {};
    const perms = saved.permisos || {};
    const body = esOutlook
      ? '<label class="ce-l">Cuenta de correo (del usuario)<input id="ci-user" class="o-sel" value="' + U.esc(saved.cuenta || saved.user || '') + '" placeholder="nombre@tudominio.com"></label>'
        + '<label class="ce-l">Tipo de buzón<select id="ci-tipo" class="o-sel"><option ' + (saved.tipo !== 'Compartido' ? 'selected' : '') + '>Personal</option><option ' + (saved.tipo === 'Compartido' ? 'selected' : '') + '>Compartido</option></select></label>'
        + '<div class="ce-l">Permisos<div style="display:grid;gap:6px;margin-top:5px">'
        + '<label class="ce-l ck" style="margin:0"><input type="checkbox" id="ci-p-leer" ' + (perms.leer !== false ? 'checked' : '') + '> Leer bandeja y asociar correos a clientes/pólizas/gestiones</label>'
        + '<label class="ce-l ck" style="margin:0"><input type="checkbox" id="ci-p-enviar" ' + (perms.enviar !== false ? 'checked' : '') + '> Preparar envío en nombre del usuario cuando el canal esté conectado</label>'
        + '<label class="ce-l ck" style="margin:0"><input type="checkbox" id="ci-p-adj" ' + (perms.adjuntos ? 'checked' : '') + '> Registrar adjuntos como documentos metadata-only</label>'
        + '</div></div>'
        + '<label class="ce-l">Patrón de asunto<input id="ci-pat" class="o-sel" value="' + U.esc(saved.patronAsunto || '{cliente} · {poliza} · {gestion}') + '"></label>'
        + '<label class="ce-l">Referencia OAuth / tenantRef<input id="ci-url" class="o-sel" value="' + U.esc(saved.credentialRef || saved.url || 'backend_required') + '" placeholder="backend_required"></label>'
      : '<label class="ce-l">Referencia segura de conexión<input id="ci-ref" class="o-sel" value="' + U.esc(saved.credentialRef || 'backend_required') + '" placeholder="backend_required"></label>'
        + '<label class="ce-l">Webhook / Endpoint / OAuth URL conceptual (opcional)<input id="ci-url" class="o-sel" value="' + U.esc(saved.url || '') + '" placeholder="pendiente proveedor seguro"></label>'
        + '<label class="ce-l">Cuenta / usuario (opcional)<input id="ci-user" class="o-sel" value="' + U.esc(saved.user || '') + '"></label>';
    back.innerHTML = '<div class="card" style="width:min(500px,94vw);padding:0">'
      + '<div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display);font-size:16px">🔌 Preparar ' + U.esc(label) + '</b><button class="imp-x" id="ci-x">✕</button></div>'
      + '<div style="padding:18px 20px;display:grid;gap:11px">' + body
      + '<label class="ce-l ck"><input type="checkbox" id="ci-on" ' + (saved.activa ? 'checked' : '') + '> Dejar preparado para este tenant</label>'
      + '<div id="ci-status" class="cfg-note">No se guardan claves ni secretos en el prototipo. La conexión real requiere proveedor/canal seguro; aquí queda como <b>Pendiente de conexión</b>.</div>'
      + '<label class="ce-l">Motivo de configuración *<textarea id="ci-motivo" class="o-sel" rows="2" placeholder="Ej.: preparar integración para revisión técnica"></textarea></label>'
      + '</div><div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:space-between"><button class="btn ghost" id="ci-test">🔌 Validar referencia</button><div style="display:flex;gap:8px"><button class="btn ghost" id="ci-cancel">Cancelar</button><button class="btn primary" id="ci-ok">Guardar referencia</button></div></div></div>';
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#ci-x').onclick = close; back.querySelector('#ci-cancel').onclick = close;
    back.querySelector('#ci-test').onclick = () => {
      const ref = (back.querySelector('#ci-ref') || back.querySelector('#ci-url') || {}).value || '';
      const st = back.querySelector('#ci-status');
      st.innerHTML = ref ? '✅ Referencia preparada. Estado: <b>Pendiente de conexión</b>.' : '⚠️ Usa una referencia conceptual como backend_required; no pegues secretos aquí.';
      st.style.color = ref ? 'var(--ok)' : 'var(--warn)';
    };
    back.querySelector('#ci-ok').onclick = () => {
      const motivo = (back.querySelector('#ci-motivo').value || '').trim();
      if (!motivo || motivo.length < 5) { Orbit.ui.toast('Se requiere motivo claro'); return; }
      const activa = back.querySelector('#ci-on').checked;
      const data = esOutlook
        ? { cuenta: back.querySelector('#ci-user').value, tipo: back.querySelector('#ci-tipo').value, credentialRef: back.querySelector('#ci-url').value || 'backend_required', patronAsunto: back.querySelector('#ci-pat').value, permisos: { leer: back.querySelector('#ci-p-leer').checked, enviar: back.querySelector('#ci-p-enviar').checked, adjuntos: back.querySelector('#ci-p-adj').checked }, activa, estadoConexion: 'pendiente_conexion', requiereBackend: true }
        : { credentialRef: (back.querySelector('#ci-ref') || {}).value || 'backend_required', url: back.querySelector('#ci-url').value, user: (back.querySelector('#ci-user') || {}).value, activa, estadoConexion: 'pendiente_conexion', requiereBackend: true };
      try { if (window.Orbit && Orbit.integraciones && typeof Orbit.integraciones.configurar === 'function') Orbit.integraciones.configurar(nombre, data); } catch (x) {}
      try { if (window.Orbit && Orbit.integraciones && typeof Orbit.integraciones.mark === 'function') Orbit.integraciones.mark(nombre, activa ? 'pendiente' : 'no_configurado'); } catch (x) {}
      Orbit.store.setPref('integ_' + nombre, data);
      cfgAudit('integracion_configurada_referencia_segura', motivo, Object.assign({ nombre }, data), 'registrado');
      try { const tn = T().get(); tn.addons = tn.addons || {}; tn.addons[nombre] = activa; T().save && T().save(tn); } catch (e) {}
      close(); const host = document.getElementById('host'); if (host) render(host);
      const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = '✓ ' + label + ' preparada · pendiente de conexión segura'; document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
    };
  }`;
  s = replaceFunction(s, 'configIntegracion', configIntegracion);
  s = s.replace("if (pl) pl.addEventListener('change', () => { T().setDeep('plan', pl.value); paint(host); });", "if (pl) pl.addEventListener('change', () => { const motivo = motivoConfig('cambiar plan'); if (!motivo) { pl.value = T().get().plan; return; } T().setDeep('plan', pl.value); cfgAudit('plan_cambiado', motivo, { plan: pl.value }, 'registrado'); paint(host); });");
  s = s.replace("T().setDeep('modulosActivos', mods);", "const motivo = motivoConfig('guardar módulos activos'); if (!motivo) return; T().setDeep('modulosActivos', mods); cfgAudit('modulos_activos_cambiados', motivo, { modulosActivos: mods }, 'registrado');");
  s = s.replace(/key: back\.querySelector\('#ci-key'\)\.value, /g, '');
  if (/ci-key|saved\.key|key:\s*back\.querySelector|Referencia segura \/ Token/.test(s)) fail('configuracion.js aún contiene captura directa de key/token en integración');
  write(configPath, s);
}

function patchEquipo() {
  let s = read(equipoPath);
  backup(equipoPath);
  if (!s.includes(marker + ' EQUIPO START')) {
    const helpers = `  // ${marker} EQUIPO START
  function equipoActorName() { try { const u = Orbit.auth && Orbit.auth.user && Orbit.auth.user(); return (u && (u.nombre || u.email)) || 'Usuario'; } catch(e) { return 'Usuario'; } }
  function esAdminRol(txt) { return /admin|administrador|direccion|dirección|it|seguridad|super/.test(String(txt || '').toLowerCase()); }
  function adminsActivosExcept(id) { try { return S().all('asesores').filter(a => a.id !== id && !a.inactivo && esAdminRol([a.rol].concat(a.roles || []).join(' '))).length; } catch(e) { return 1; } }
  function equipoMotivo(label) { const m = (prompt('Motivo obligatorio para ' + label + ':','') || '').trim(); if (!m || m.length < 5) { Orbit.ui.toast('Se requiere motivo claro'); return ''; } return m; }
  function equipoAudit(accion, motivo, entidadId, patch, resultado, bloqueos) { try { S().insert('auditoria', { id: 'audeq' + Date.now() + Math.floor(Math.random()*999), tenantId: (Orbit.tenant && Orbit.tenant.id) || 'tenant-demo', fecha: new Date().toISOString(), actorRol: (Orbit.auth && Orbit.auth.role && Orbit.auth.role()) || '', actorNombre: equipoActorName(), modulo: 'equipo', categoria: 'roles_permisos', accion, severidad: bloqueos && bloqueos.length ? 'blocked' : 'warning', motivo, entidadTipo: 'usuario', entidadId, before: {}, after: patch || {}, resultado: resultado || 'registrado', bloqueos: bloqueos || [] }); } catch(e) {} }
  // ${marker} EQUIPO END
`;
    s = insertBeforeOnce(s, '  /* ---------- editar usuario ---------- */', helpers);
  }
  s = s.replace("const data = { nombre: $('#eu-nombre').value || 'Usuario', rol: rolesFinal[0], roles: rolesFinal, telefono: $('#eu-tel').value, email: $('#eu-email').value, color: $('#eu-color').value, metaPrima: +$('#eu-meta').value || 0, metaRecaudo: +$('#eu-rec').value || 0, inactivo: $('#eu-inact').checked, modulosOverride: modOverride };", "const data = { nombre: $('#eu-nombre').value || 'Usuario', rol: rolesFinal[0], roles: rolesFinal, telefono: $('#eu-tel').value, email: $('#eu-email').value, color: $('#eu-color').value, metaPrima: +$('#eu-meta').value || 0, metaRecaudo: +$('#eu-rec').value || 0, inactivo: $('#eu-inact').checked, modulosOverride: modOverride };\n      const motivo = equipoMotivo(id ? 'editar usuario/roles/permisos' : 'crear usuario'); if (!motivo) return;\n      if (data.inactivo && esAdminRol([data.rol].concat(data.roles || []).join(' ')) && adminsActivosExcept(id) < 1) { equipoAudit('usuario_inactivacion_bloqueada_ultimo_admin', motivo, id || data.email || 'nuevo', data, 'bloqueado', ['ultimo_admin_activo']); Orbit.ui.toast('No se puede dejar el tenant sin administrador activo'); return; }\n      data.ultimoMotivo = motivo; data.auditAt = new Date().toISOString();");
  s = s.replace("if (id) S().update('asesores', id, data);", "if (id) { S().update('asesores', id, data); equipoAudit('usuario_editado', motivo, id, data, 'registrado', []); }");
  s = s.replace("S().insert('asesores', data); const t = document.createElement('div');", "S().insert('asesores', data); equipoAudit('usuario_creado', motivo, data.id, data, 'registrado', []); const t = document.createElement('div');");
  s = s.replace("const pr = host.querySelector('#perm-reset'); if (pr) pr.addEventListener('click', () => { const c = Orbit.cat.all(); delete c.permisos; Orbit.cat.setList('permisos', undefined); getPermisos(); render(host); });", "const pr = host.querySelector('#perm-reset'); if (pr) pr.addEventListener('click', () => { const conf = (prompt('Confirmación reforzada: escribe RESTABLECER para continuar.','') || '').trim(); if (conf !== 'RESTABLECER') { Orbit.ui.toast('Restablecimiento cancelado'); return; } const motivo = equipoMotivo('restablecer permisos'); if (!motivo) return; const c = Orbit.cat.all(); delete c.permisos; Orbit.cat.setList('permisos', undefined); getPermisos(); equipoAudit('permisos_reseteados', motivo, 'matriz_permisos', { reset: true }, 'registrado', []); render(host); });");
  write(equipoPath, s);
}

const br = branch();
fs.mkdirSync(reportRoot, { recursive: true });
patchConfiguracion();
patchEquipo();
const checks = [check(configPath), check(equipoPath)];
const failed = checks.filter(x => x.code !== 0);
const report = ['# Hotfix P0 Config + Equipo v1330', '', 'Fecha: ' + new Date().toISOString(), 'Rama detectada: ' + (br || 'S/D'), 'Backup: ' + backupRoot, '', '## Validaciones'].concat(checks.map(x => '- ' + path.relative(ROOT, x.file) + ': ' + (x.code === 0 ? 'OK' : 'ERROR ' + x.code)), ['', '## Cambios', '- Config integraciones usa credentialRef/backend_required, sin key/token', '- Config plan y módulos activos exigen motivo/auditoría', '- Equipo crear/editar/inactivar exige motivo/auditoría', '- Equipo bloquea último administrador activo', '- Reset permisos exige RESTABLECER + motivo']).join('\n');
write(reportFile, report);
console.log(JSON.stringify({ ok: failed.length === 0, branch: br, backupRoot: path.relative(ROOT, backupRoot), reportFile: path.relative(ROOT, reportFile), checks: checks.map(x => ({ file: path.relative(ROOT, x.file), code: x.code })) }, null, 2));
if (failed.length) process.exit(1);
