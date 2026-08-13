/* ============================================================
   Orbit 360 · Equipo, permisos y metas self-service
   - Multirol con rol predeterminado y alcance de datos.
   - Países autorizados por usuario; metas separadas por país/moneda.
   - Módulos base por rol + extras - restringidos.
   - Alta sin prompts; edición sensible con motivo y auditoría visible.
   - Invitaciones honestas: se preparan, no se envían sin integración.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.equipo = (function () {
  const U = Orbit.ui, K = Orbit.kit, S = () => Orbit.store;
  let tab = 'usuarios';
  let userFilter = 'todos';
  const now = U.NOW ? new Date(U.NOW) : new Date();
  let metaPeriodo = now.toISOString().slice(0, 7);
  let metaPais = (Orbit.pais && Orbit.pais !== 'TODOS') ? Orbit.pais : 'GT';

  const ROLE_ORDER = ['Dirección', 'Admin', 'Finanzas', 'Marketing', 'Operativo', 'Asesor', 'Asistente'];
  const LEGACY_ROLE = 'Comercial';
  const SCOPE_LABELS = { propios: 'Solo propios', equipo: 'Equipo', todos: 'Todos', ninguno: 'Ninguno' };
  const MODULE_LABELS = {
    inicio: 'Orbit Inicio', cronograma: 'Cronograma', ops: 'Orbit Ops', leads: 'Orbit Leads',
    aseguradoras: 'Orbit Aseguradoras', cotizador: 'Cotizador', comparativo: 'Comparativo',
    cliente360: 'Clientes 360', polizas: 'Pólizas', cobros: 'Cobros y cartera',
    conciliaciones: 'Conciliaciones', renovaciones: 'Renovaciones', cancelaciones: 'Cancelaciones',
    siniestros: 'Siniestros', historial: 'Historial y actividades', comisiones: 'Comisiones',
    importar: 'Importación inteligente', calidad: 'Calidad de datos', plantillas: 'Plantillas de mensajes',
    finanzas: 'Orbit Finanzas', insights: 'Orbit Insights', reportes: 'Reportes',
    automatizaciones: 'Automatizaciones', correo: 'Correo', marketing: 'Orbit Marketing',
    academia: 'Orbit Academia', portal: 'Portal del cliente', equipo: 'Equipo y permisos',
    configuracion: 'Configuración'
  };
  const MODULE_ICONS = {
    inicio: '🌅', cronograma: '📅', ops: '🗂', leads: '🎯', aseguradoras: '🏢', cotizador: '🧮',
    comparativo: '📊', cliente360: '🧑‍💼', polizas: '📑', cobros: '💳', conciliaciones: '🔗',
    renovaciones: '🔄', cancelaciones: '✕', siniestros: '🚨', historial: '📝', comisiones: '💼',
    importar: '⬇', calidad: '🩺', plantillas: '✉', finanzas: '💰', insights: '📈', reportes: '📄',
    automatizaciones: '⚡', correo: '📨', marketing: '📣', academia: '🎓', portal: '🚪', equipo: '👥', configuracion: '⚙'
  };
  const ACCIONES = [['ver', 'Ver'], ['editar', 'Editar']];

  function arr(v) { return Array.isArray(v) ? v.filter(Boolean) : (v ? [v] : []); }
  function uniq(v) { return [...new Set(arr(v))]; }
  function rolesOf(a) {
    const roles = uniq((a && a.roles && a.roles.length) ? a.roles : [a && a.rol]);
    return roles.length ? roles : [];
  }
  function hasRole(a, role) { return rolesOf(a).includes(role); }
  function hasAnyRole(a, roles) { return roles.some(r => hasRole(a, r)); }
  function active(a) { return !(a && (a.inactivo || a.activo === false || a.estado === 'inactivo')); }
  function slug(v) {
    return String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'usuario';
  }
  function moduleLabel(id) {
    const meta = Orbit.MODULE_TITLES && Orbit.MODULE_TITLES[id];
    if (meta && typeof meta === 'object') return `${meta.icon || MODULE_ICONS[id] || '•'} ${meta.title || MODULE_LABELS[id] || id}`;
    if (typeof meta === 'string') return meta;
    return `${MODULE_ICONS[id] || '•'} ${MODULE_LABELS[id] || id}`;
  }
  function allModuleIds() {
    const ids = new Set(Object.keys(MODULE_LABELS));
    Object.values(Orbit.ROLES || {}).forEach(def => arr(def && def.modulos).forEach(m => ids.add(typeof m === 'string' ? m : m && (m.route || m.id))));
    return [...ids].filter(Boolean);
  }
  function baseModules(roles) {
    const out = new Set();
    arr(roles).forEach(role => {
      const def = Orbit.ROLES && Orbit.ROLES[role];
      arr(def && def.modulos).forEach(m => out.add(typeof m === 'string' ? m : m && (m.route || m.id)));
    });
    return [...out].filter(Boolean);
  }
  function userCountries(a) {
    const ps = uniq((a && a.paises && a.paises.length) ? a.paises : [a && a.pais]);
    return ps.length ? ps : [];
  }
  function currencyForCountry(pais) { return pais === 'CO' ? 'COP' : 'GTQ'; }
  function roleBadge(role) {
    const tone = role === 'Dirección' ? 'danger' : role === 'Asesor' ? 'info' : role === 'Operativo' ? 'ok' : 'neutral';
    return `<span class="badge ${tone}" style="margin:1px 3px 1px 0">${U.esc(role)}${role === LEGACY_ROLE ? ' · legado' : ''}</span>`;
  }
  function audit(action, motivo, before, after) {
    const user = (() => { try { return (Orbit.auth && Orbit.auth.user && Orbit.auth.user()) || {}; } catch (e) { return {}; } })();
    const entry = {
      id: 'audit_equipo_' + Date.now() + '_' + Math.random().toString(16).slice(2),
      fecha: new Date().toISOString(), modulo: 'equipo', accion: action,
      motivo: motivo || '', usuario: user.email || user.nombre || user.uid || 'usuario_actual',
      tenantId: (OrbitBackend && (OrbitBackend.tenantId || OrbitBackend.tenant)) || 'tenant_actual',
      before: before || null, after: after || null
    };
    try { S().insert('auditoria', entry); } catch (e) {}
    return entry;
  }
  function toast(text) {
    if (U.toast) return U.toast(text);
    const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = text;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2800);
  }

  function render(host) {
    const TABS = [
      ['usuarios', '👥 Usuarios'], ['permisos', '🔐 Permisos por rol'], ['comisiones', '💵 Comisiones'],
      ['metas', '🎯 Metas'], ['auditoria', '📝 Historial de cambios']
    ];
    host.innerHTML = `<div class="page">
      ${K.banner({ icon: '👥', title: 'Equipo y permisos', sub: 'Usuarios, multirol, países, permisos, comisiones y metas', features: [], actions: `<button class="btn primary" id="eq-add" style="background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.28)">+ Usuario</button>` })}
      <div class="tabs tabs-scroll" style="margin-bottom:16px">${TABS.map(t => `<div class="tab ${tab === t[0] ? 'active' : ''}" data-t="${t[0]}">${t[1]}</div>`).join('')}</div>
      <div id="eq-body"></div>
    </div>`;
    host.querySelectorAll('.tab[data-t]').forEach(el => el.addEventListener('click', () => { tab = el.dataset.t; render(host); }));
    host.querySelector('#eq-add').addEventListener('click', () => editarUsuario(''));
    document.getElementById('eq-body').innerHTML = ({ usuarios, permisos, comisiones, metas, auditoria: auditoriaView }[tab] || usuarios)();
    wire(host);
  }

  function filteredTeam(team) {
    if (userFilter === 'asesor') return team.filter(a => hasRole(a, 'Asesor'));
    if (userFilter === 'operativo') return team.filter(a => hasRole(a, 'Operativo'));
    if (userFilter === 'admin') return team.filter(a => hasAnyRole(a, ['Dirección', 'Admin', 'Finanzas']));
    if (userFilter === 'multirol') return team.filter(a => rolesOf(a).length > 1);
    return team;
  }

  function usuarios() {
    const team = S().all('asesores') || [];
    const shown = filteredTeam(team);
    const asesores = team.filter(a => hasRole(a, 'Asesor')).length;
    const operativos = team.filter(a => hasRole(a, 'Operativo')).length;
    const admins = team.filter(a => hasAnyRole(a, ['Dirección', 'Admin', 'Finanzas'])).length;
    const multi = team.filter(a => rolesOf(a).length > 1).length;
    return `<div class="cfg-note" style="margin-bottom:14px">👥 Un usuario puede tener varios roles. Los conteos se superponen: una persona puede ser asesora y administrativa u operativa. <b>Comercial</b> queda como rol legado; para nuevas configuraciones usa <b>Asesor</b> y agrega módulos extra cuando corresponda.</div>
    ${K.kpis([
      { label: 'Usuarios', val: team.length, color: 'var(--red)', foot: 'activos e inactivos', onclick: "Orbit.modules.equipo.filtrar('todos')" },
      { label: 'Asesores', val: asesores, color: 'var(--info)', foot: 'incluye multirol', onclick: "Orbit.modules.equipo.filtrar('asesor')" },
      { label: 'Operativos', val: operativos, color: 'var(--ok)', foot: 'incluye multirol', onclick: "Orbit.modules.equipo.filtrar('operativo')" },
      { label: 'Multirol', val: multi, color: 'var(--warn)', foot: admins + ' administrativos', onclick: "Orbit.modules.equipo.filtrar('multirol')" }
    ])}
    ${userFilter !== 'todos' ? `<div class="cfg-note" style="margin:0 0 10px">Filtro activo: <b>${U.esc(userFilter)}</b> · <a style="cursor:pointer;color:var(--red)" onclick="Orbit.modules.equipo.filtrar('todos')">Ver todos</a></div>` : ''}
    <div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table class="tbl">
      <thead><tr><th>Usuario</th><th>Roles</th><th>Rol predeterminado</th><th>País(es)</th><th>Acceso</th><th>Estado</th><th></th></tr></thead>
      <tbody>${shown.map(a => {
        const roles = rolesOf(a);
        const paises = userCountries(a);
        const access = a.accessProvisioned || a.invitacionEstado === 'enviada' ? 'Habilitado' : 'Pendiente';
        return `<tr class="clickable" onclick="Orbit.modules.equipo.editar('${a.id}')">
          <td><div style="display:flex;align-items:center;gap:9px">${U.avatar(a.nombre, a.color, 'sm')}<div><b>${U.esc(a.nombre)}</b><div class="muted" style="font-size:11px">${U.esc(a.email || 'Sin correo')}</div></div></div></td>
          <td>${roles.map(roleBadge).join('') || '<span class="badge warn">Sin rol</span>'}</td>
          <td>${roleBadge(a.rolDefault || a.rol || 'Sin definir')}</td>
          <td>${paises.map(p => `<span class="badge neutral">${p === 'CO' ? '🇨🇴 CO' : '🇬🇹 GT'}</span>`).join(' ') || '<span class="badge warn">Sin país</span>'}</td>
          <td><span class="badge ${access === 'Habilitado' ? 'ok' : 'warn'}">${access}</span></td>
          <td><span class="badge ${active(a) ? 'ok' : 'neutral'}">${active(a) ? 'Activo' : 'Inactivo'}</span></td>
          <td style="text-align:right;color:var(--ink-3)">›</td></tr>`;
      }).join('') || '<tr><td colspan="7" class="muted" style="text-align:center;padding:22px">No hay usuarios para este filtro.</td></tr>'}</tbody>
    </table></div></div>`;
  }

  function defaultPermissions() {
    const def = {};
    const roles = [...ROLE_ORDER, LEGACY_ROLE].filter(r => Orbit.ROLES && Orbit.ROLES[r]);
    roles.forEach(rol => {
      def[rol] = {};
      const nivel = Orbit.ROLES[rol].nivel;
      allModuleIds().forEach(m => {
        const admin = ['comisiones', 'finanzas', 'configuracion', 'equipo'].includes(m);
        def[rol][m] = { ver: admin ? nivel >= 3 : baseModules([rol]).includes(m), editar: admin ? nivel >= 4 : nivel >= 2 && baseModules([rol]).includes(m) };
      });
    });
    return def;
  }
  function getPermisos() {
    const cfg = Orbit.cat.all();
    return cfg.permisos || defaultPermissions();
  }
  function permisos() {
    const P = getPermisos();
    const roles = [...ROLE_ORDER, LEGACY_ROLE].filter(r => Orbit.ROLES && Orbit.ROLES[r]);
    return `<div class="cfg-note" style="margin-bottom:14px">🔐 Esta matriz define los módulos estándar de cada rol. Los ajustes particulares se hacen dentro de la ficha del usuario como <b>extras</b> o <b>restricciones</b>. Los cambios se guardan juntos y exigen un motivo.</div>
    <div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table class="tbl perm-tbl">
      <thead><tr><th>Módulo</th>${roles.map(r => `<th colspan="2" style="text-align:center;border-left:1px solid var(--line)">${U.esc(r)}${r === LEGACY_ROLE ? ' · legado' : ''}</th>`).join('')}</tr>
      <tr><th></th>${roles.map(() => ACCIONES.map(a => `<th style="text-align:center;font-size:10.5px;font-weight:600;color:var(--ink-3)">${a[1]}</th>`).join('')).join('')}</tr></thead>
      <tbody>${allModuleIds().map(m => `<tr><td><b style="font-size:12.5px">${U.esc(moduleLabel(m))}</b></td>${roles.map(r => ACCIONES.map(([ac]) => {
        const on = P[r] && P[r][m] && P[r][m][ac];
        return `<td style="text-align:center"><input type="checkbox" data-perm="${r}|${m}|${ac}" ${on ? 'checked' : ''}></td>`;
      }).join('')).join('')}</tr>`).join('')}</tbody>
    </table></div></div>
    <div style="margin-top:10px;display:flex;gap:8px"><button class="btn primary sm" id="perm-save">Guardar matriz</button><button class="btn ghost sm" id="perm-reset">Restablecer por defecto</button></div>`;
  }

  function comisiones() {
    const team = (S().all('asesores') || []).filter(a => hasRole(a, 'Asesor'));
    return `<div class="cfg-note" style="margin-bottom:14px">💵 Esquema de comisión de asesores. Las metas comerciales y de recaudo se configuran en la pestaña <b>Metas</b>, separadas por país y moneda.</div>
    <div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table class="tbl">
      <thead><tr><th>Asesor</th><th>País predeterminado</th><th>Modelo</th><th class="num">Valor</th></tr></thead>
      <tbody>${team.map(a => {
        const modo = a.comModo || 'comision';
        const pais = a.paisDefault || userCountries(a)[0] || 'GT';
        const cur = currencyForCountry(pais);
        return `<tr>
          <td><div style="display:flex;align-items:center;gap:9px">${U.avatar(a.nombre, a.color, 'sm')}<b>${U.esc(a.nombre)}</b></div></td>
          <td><span class="badge neutral">${pais === 'CO' ? '🇨🇴 Colombia · COP' : '🇬🇹 Guatemala · GTQ'}</span></td>
          <td><select data-modo="${a.id}" class="o-sel" style="padding:5px 8px;font-size:12px">
            <option value="comision" ${modo === 'comision' ? 'selected' : ''}>% de la comisión</option>
            <option value="neta" ${modo === 'neta' ? 'selected' : ''}>% de prima neta</option>
            <option value="fijo" ${modo === 'fijo' ? 'selected' : ''}>Monto fijo</option></select></td>
          <td class="num"><div class="ct-inp" style="justify-content:flex-end">${modo === 'fijo'
            ? `<span>${cur}</span><input type="number" min="0" value="${a.comValor || 0}" data-vval="${a.id}" style="width:100px">`
            : `<input type="number" min="0" max="100" value="${a.shareCom != null ? a.shareCom : 50}" data-vend="${a.id}"><span>%</span>`}</div></td></tr>`;
      }).join('')}</tbody>
    </table></div></div>`;
  }

  function metasStore() { const c = Orbit.cat.all(); return c.metas || {}; }
  function metaKey(aseId, periodo, pais) { return `${aseId}|${periodo}|${pais}`; }
  function setMeta(aseId, periodo, pais, campo, val) {
    const c = Orbit.cat.all(); c.metas = c.metas || {};
    const k = metaKey(aseId, periodo, pais); c.metas[k] = c.metas[k] || { periodo, pais, moneda: currencyForCountry(pais) };
    c.metas[k][campo] = +val || 0; Orbit.cat.setList('metas', c.metas);
  }
  function normalizePeriodo(value) {
    if (typeof value === 'number') return `${now.getFullYear()}-${String(value + 1).padStart(2, '0')}`;
    return /^\d{4}-\d{2}$/.test(String(value || '')) ? String(value) : metaPeriodo;
  }
  function metaDe(aseId, periodo, pais) {
    const p = pais || metaPais || 'GT';
    const per = normalizePeriodo(periodo);
    const current = metasStore()[metaKey(aseId, per, p)];
    if (current) return Object.assign({ nueva: 0, renovada: 0, recaudo: 0, pais: p, moneda: currencyForCountry(p), periodo: per }, current);
    const a = S().get('asesores', aseId) || {};
    return {
      nueva: Math.round((a.metaPrima || 0) * 0.45), renovada: Math.round((a.metaPrima || 0) * 0.55),
      recaudo: a.metaRecaudo || 0, pais: p, moneda: currencyForCountry(p), periodo: per, provisional: true
    };
  }
  function metas() {
    const all = (S().all('asesores') || []).filter(a => hasRole(a, 'Asesor'));
    const team = all.filter(a => { const ps = userCountries(a); return !ps.length || ps.includes(metaPais); });
    const cur = currencyForCountry(metaPais);
    const totN = team.reduce((s, a) => s + metaDe(a.id, metaPeriodo, metaPais).nueva, 0);
    const totR = team.reduce((s, a) => s + metaDe(a.id, metaPeriodo, metaPais).renovada, 0);
    const totC = team.reduce((s, a) => s + metaDe(a.id, metaPeriodo, metaPais).recaudo, 0);
    const countryOptions = (Orbit.PAISES || []).filter(p => p.id !== 'TODOS');
    return `<div class="cfg-note" style="margin-bottom:14px">🎯 Metas mensuales por asesor y país: <b>producción nueva</b>, <b>producción de renovación</b> y <b>recaudo</b>, siempre sobre prima neta y sin mezclar monedas. Es la fuente que deben leer Insights y Finanzas.</div>
    <div style="display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap">
      <input id="meta-periodo" class="o-sel" type="month" value="${metaPeriodo}" style="width:auto">
      <select id="meta-pais" class="o-sel" style="width:auto">${countryOptions.map(p => `<option value="${p.id}" ${p.id === metaPais ? 'selected' : ''}>${p.id === 'CO' ? '🇨🇴' : '🇬🇹'} ${p.label} · ${p.moneda}</option>`).join('')}</select>
      <span class="muted" style="font-size:12.5px"><b>${cur} ${U.moneyShort(totN, cur)}</b> nuevas · <b>${cur} ${U.moneyShort(totR, cur)}</b> renovaciones · <b>${cur} ${U.moneyShort(totC, cur)}</b> recaudo</span>
    </div>
    <div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table class="tbl">
      <thead><tr><th>Asesor</th><th class="num">Producción nueva</th><th class="num">Renovaciones</th><th class="num">Recaudo</th><th class="num">Producción total</th></tr></thead>
      <tbody>${team.map(a => { const m = metaDe(a.id, metaPeriodo, metaPais); return `<tr>
        <td><div style="display:flex;align-items:center;gap:9px">${U.avatar(a.nombre, a.color, 'sm')}<div><b>${U.esc(a.nombre)}</b><div class="muted" style="font-size:10.5px">${m.provisional ? 'valor provisional heredado' : `${metaPeriodo} · ${metaPais}`}</div></div></div></td>
        <td class="num"><div class="ct-inp" style="justify-content:flex-end"><span>${cur}</span><input type="number" min="0" value="${m.nueva}" data-meta="${a.id}|nueva" style="width:110px"></div></td>
        <td class="num"><div class="ct-inp" style="justify-content:flex-end"><span>${cur}</span><input type="number" min="0" value="${m.renovada}" data-meta="${a.id}|renovada" style="width:110px"></div></td>
        <td class="num"><div class="ct-inp" style="justify-content:flex-end"><span>${cur}</span><input type="number" min="0" value="${m.recaudo}" data-meta="${a.id}|recaudo" style="width:110px"></div></td>
        <td class="num"><b>${U.money(m.nueva + m.renovada, cur)}</b></td></tr>`; }).join('') || '<tr><td colspan="5" class="muted" style="text-align:center;padding:20px">No hay asesores habilitados para este país.</td></tr>'}
    </table></div></div>`;
  }

  function auditoriaView() {
    const rows = (S().all('auditoria') || []).filter(x => x.modulo === 'equipo').sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
    return `<div class="cfg-note" style="margin-bottom:14px">📝 Los motivos no son solicitudes enviadas a otra persona. Son registros de auditoría del tenant y se consultan aquí por Dirección/Admin.</div>
    <div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table class="tbl">
      <thead><tr><th>Fecha</th><th>Acción</th><th>Usuario</th><th>Motivo</th></tr></thead>
      <tbody>${rows.slice(0, 100).map(r => `<tr><td>${U.esc((r.fecha || '').replace('T', ' ').slice(0, 19))}</td><td><span class="badge neutral">${U.esc(r.accion || '')}</span></td><td>${U.esc(r.usuario || '')}</td><td>${U.esc(r.motivo || '—')}</td></tr>`).join('') || '<tr><td colspan="4" class="muted" style="text-align:center;padding:20px">Sin cambios auditados.</td></tr>'}
    </table></div></div>`;
  }

  function userSnapshot(a) {
    return {
      nombre: a.nombre || '', email: a.email || '', telefono: a.telefono || '', roles: rolesOf(a),
      rolDefault: a.rolDefault || a.rol || '', scopeDatos: a.scopeDatos || 'propios',
      paises: userCountries(a), paisDefault: a.paisDefault || a.pais || '',
      modulosExtra: uniq(a.modulosExtra), modulosRestringidos: uniq(a.modulosRestringidos), inactivo: !!a.inactivo
    };
  }
  function sensitiveChanged(before, after) {
    const fields = ['roles', 'rolDefault', 'scopeDatos', 'paises', 'paisDefault', 'modulosExtra', 'modulosRestringidos', 'inactivo'];
    return fields.some(k => JSON.stringify(before[k] || null) !== JSON.stringify(after[k] || null));
  }
  function nextStableId(name) {
    const base = 'ase-' + slug(name);
    if (!S().get('asesores', base)) return base;
    let n = 2; while (S().get('asesores', `${base}-${n}`)) n++;
    return `${base}-${n}`;
  }

  function editarUsuario(id) {
    const existing = id ? S().get('asesores', id) : null;
    const a = existing || { id: '', nombre: '', roles: [], rol: '', rolDefault: '', color: '#1f3a5f', comModo: 'comision', shareCom: 50, scopeDatos: 'propios', paises: [], modulosExtra: [], modulosRestringidos: [] };
    const existingRoles = rolesOf(a);
    const availableRoles = uniq(ROLE_ORDER.concat(existingRoles.includes(LEGACY_ROLE) ? [LEGACY_ROLE] : []));
    const activeCountries = (() => {
      try {
        const t = Orbit.tenant && Orbit.tenant.get && Orbit.tenant.get();
        const ids = t && Array.isArray(t.paises) && t.paises.length ? t.paises : ['GT', 'CO'];
        return (Orbit.PAISES || []).filter(p => p.id !== 'TODOS' && ids.includes(p.id));
      } catch (e) { return (Orbit.PAISES || []).filter(p => p.id !== 'TODOS'); }
    })();
    const initialCountries = userCountries(a);
    const initialBase = baseModules(existingRoles);
    const initialEffective = new Set(initialBase.concat(uniq(a.modulosExtra)).filter(m => !uniq(a.modulosRestringidos).includes(m)));
    if (Array.isArray(a.modulosOverride) && a.modulosOverride.length) {
      initialEffective.clear(); a.modulosOverride.forEach(m => initialEffective.add(m));
    }
    const before = userSnapshot(a);
    let dirty = false;
    let modulesTouched = !!(a.modulosExtra && a.modulosExtra.length) || !!(a.modulosRestringidos && a.modulosRestringidos.length) || !!(a.modulosOverride && a.modulosOverride.length);

    let back = document.getElementById('eq-edit'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'eq-edit'; back.className = 'drawer-back open';
    back.dataset.existing = id ? '1' : '0';
    back.style.display = 'grid'; back.style.placeItems = 'center';
    back.innerHTML = `<div class="card" style="width:min(720px,96vw);max-height:94vh;display:flex;flex-direction:column;padding:0">
      <div style="padding:17px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center">
        <b style="font-family:var(--f-display);font-size:16px">${id ? '✏ Editar usuario' : '+ Nuevo usuario'}</b><button class="imp-x" id="eu-x">✕</button></div>
      <div style="padding:18px 20px;display:grid;gap:14px;overflow:auto">
        <div class="cgrid">
          <label class="ce-l">Nombre<input id="eu-nombre" class="o-sel" value="${U.esc(a.nombre)}"></label>
          <label class="ce-l">Teléfono / WhatsApp<input id="eu-tel" class="o-sel" value="${U.esc(a.telefono || '')}" placeholder="+502 / +57 …"></label>
          <label class="ce-l">Correo del usuario<input id="eu-email" class="o-sel" value="${U.esc(a.email || '')}" placeholder="nombre@dominio.com"></label>
          <label class="ce-l">Color<input id="eu-color" class="o-sel" type="color" value="${a.color || '#1f3a5f'}" style="height:38px"></label>
        </div>
        <div>
          <div class="ce-l" style="margin-bottom:6px">Roles del usuario <span class="muted">(selecciona uno o varios)</span></div>
          <div style="display:flex;flex-wrap:wrap;gap:8px">${availableRoles.map(r => `<label class="chiprole"><input type="checkbox" class="eu-role" value="${r}" ${existingRoles.includes(r) ? 'checked' : ''}> ${r}${r === LEGACY_ROLE ? ' · legado' : ''}</label>`).join('')}</div>
          <div class="muted" style="font-size:11.5px;margin-top:6px">Asesor = cartera propia y actividad comercial. Operativo = gestión transversal. Para funciones comerciales adicionales usa Asesor + módulos extra; no crees nuevos usuarios con Comercial.</div>
        </div>
        <div class="cgrid">
          <label class="ce-l">Rol predeterminado<select id="eu-role-default" class="o-sel"></select></label>
          <label class="ce-l">Alcance de datos<select id="eu-scope" class="o-sel">${Object.entries(SCOPE_LABELS).map(([v, l]) => `<option value="${v}" ${(a.scopeDatos || 'propios') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        </div>
        <div>
          <div class="ce-l" style="margin-bottom:6px">Países autorizados</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">${activeCountries.map(p => `<label class="chiprole"><input type="checkbox" class="eu-pais" value="${p.id}" ${initialCountries.includes(p.id) ? 'checked' : ''}> ${p.id === 'CO' ? '🇨🇴' : '🇬🇹'} ${p.label} · ${p.moneda}</label>`).join('')}</div>
          <label class="ce-l" style="margin-top:8px">País predeterminado<select id="eu-pais-default" class="o-sel" style="max-width:260px"></select></label>
        </div>
        <details id="eu-mod-details">
          <summary style="cursor:pointer;font-weight:700;font-size:13px;font-family:var(--f-display)">⚙ Módulos visibles para este usuario <span class="muted" style="font-weight:400">(base por roles + excepciones)</span></summary>
          <div style="display:flex;justify-content:flex-end;margin-top:8px"><button type="button" class="btn ghost sm" id="eu-reset-mod">Aplicar estándar de roles</button></div>
          <div id="eu-mod-grid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 14px;margin-top:10px">${allModuleIds().map(m => `<label class="ce-l ck" style="font-size:12.5px"><input type="checkbox" class="eu-mod" value="${m}" ${initialEffective.has(m) ? 'checked' : ''}> <span>${U.esc(moduleLabel(m))}</span> <small data-mod-hint="${m}"></small></label>`).join('')}</div>
          <div class="muted" style="font-size:11.5px;margin-top:7px">Los módulos estándar provienen de todos los roles seleccionados. Marca extras o desmarca restricciones particulares.</div>
        </details>
        <label class="ce-l ck"><input type="checkbox" id="eu-inact" ${a.inactivo ? 'checked' : ''}> Usuario inactivo</label>
        <div class="cfg-note">🔐 Guardar crea o actualiza el registro del equipo. <b>No envía correos ni habilita acceso todavía.</b> La invitación se enviará cuando Auth e integración de correo estén aprobadas y conectadas.</div>
        <div class="cfg-note">🎯 Las metas no se definen aquí. Usa la pestaña <b>Metas</b> para separarlas por mes, país, moneda, producción nueva, renovación y recaudo.</div>
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn ghost" id="eu-cancel">Cancelar</button><button class="btn primary" id="eu-ok">Guardar</button></div>
    </div>`;
    document.body.appendChild(back);
    const $ = s => back.querySelector(s);
    const $$ = s => [...back.querySelectorAll(s)];
    const selectedRoles = () => $$('.eu-role:checked').map(c => c.value);
    const selectedCountries = () => $$('.eu-pais:checked').map(c => c.value);
    const markDirty = () => { dirty = true; };
    const refreshRoleDefault = () => {
      const roles = selectedRoles();
      const current = $('#eu-role-default').value || a.rolDefault || a.rol || roles[0] || '';
      $('#eu-role-default').innerHTML = roles.map(r => `<option value="${r}" ${r === current ? 'selected' : ''}>${r}</option>`).join('') || '<option value="">Selecciona roles primero</option>';
    };
    const refreshCountryDefault = () => {
      const ps = selectedCountries();
      const current = $('#eu-pais-default').value || a.paisDefault || a.pais || ps[0] || '';
      $('#eu-pais-default').innerHTML = ps.map(p => `<option value="${p}" ${p === current ? 'selected' : ''}>${p === 'CO' ? 'Colombia · COP' : 'Guatemala · GTQ'}</option>`).join('') || '<option value="">Selecciona país primero</option>';
    };
    const refreshModuleHints = (reset) => {
      const base = new Set(baseModules(selectedRoles()));
      $$('.eu-mod').forEach(c => {
        if (reset || !modulesTouched) c.checked = base.has(c.value);
        const hint = back.querySelector(`[data-mod-hint="${c.value}"]`);
        if (hint) hint.textContent = base.has(c.value) ? 'por rol' : (c.checked ? 'extra' : 'no incluido');
      });
    };
    const close = force => {
      if (!force && dirty && !window.confirm('Hay cambios sin guardar. ¿Deseas cerrar este formulario?')) return;
      back.remove();
    };
    back.addEventListener('click', e => { if (e.target === back) toast('Usa Guardar o Cancelar; el formulario no se cierra al hacer clic fuera.'); });
    $('#eu-x').addEventListener('click', () => close(false));
    $('#eu-cancel').addEventListener('click', () => close(false));
    $$('.eu-role').forEach(c => c.addEventListener('change', () => { markDirty(); refreshRoleDefault(); if (!modulesTouched) refreshModuleHints(true); }));
    $$('.eu-pais').forEach(c => c.addEventListener('change', () => { markDirty(); refreshCountryDefault(); }));
    $$('.eu-mod').forEach(c => c.addEventListener('change', () => { modulesTouched = true; markDirty(); refreshModuleHints(false); }));
    back.querySelectorAll('input,select').forEach(el => el.addEventListener('change', markDirty));
    $('#eu-reset-mod').addEventListener('click', () => { modulesTouched = false; refreshModuleHints(true); markDirty(); });
    refreshRoleDefault(); refreshCountryDefault(); refreshModuleHints(false);

    $('#eu-ok').addEventListener('click', () => {
      const nombre = $('#eu-nombre').value.trim();
      const roles = selectedRoles();
      const paises = selectedCountries();
      if (!nombre) return alert('Indica el nombre del usuario.');
      if (!roles.length) return alert('Selecciona al menos un rol.');
      if (!paises.length) return alert('Selecciona al menos un país autorizado.');
      const rolDefault = $('#eu-role-default').value;
      const paisDefault = $('#eu-pais-default').value;
      if (!roles.includes(rolDefault)) return alert('El rol predeterminado debe estar entre los roles seleccionados.');
      if (!paises.includes(paisDefault)) return alert('El país predeterminado debe estar entre los países seleccionados.');
      const selectedMods = $$('.eu-mod:checked').map(c => c.value);
      const base = baseModules(roles);
      const modulosExtra = selectedMods.filter(m => !base.includes(m));
      const modulosRestringidos = base.filter(m => !selectedMods.includes(m));
      const data = {
        nombre, telefono: $('#eu-tel').value.trim(), email: $('#eu-email').value.trim(), color: $('#eu-color').value,
        roles, rol: rolDefault, rolDefault, scopeDatos: $('#eu-scope').value,
        paises, pais: paisDefault, paisDefault,
        modulosExtra, modulosRestringidos, modulosOverride: selectedMods,
        inactivo: $('#eu-inact').checked, estado: $('#eu-inact').checked ? 'inactivo' : 'activo', activo: !$('#eu-inact').checked,
        updatedAt: new Date().toISOString()
      };
      const after = userSnapshot(data);
      let motivo = 'Alta manual desde Equipo';
      if (id && sensitiveChanged(before, after)) {
        motivo = window.prompt('Motivo del cambio de roles, permisos, países, alcance o estado:') || '';
        if (motivo.trim().length < 5) return alert('Indica un motivo claro de al menos 5 caracteres.');
      }
      if (id) {
        S().update('asesores', id, data);
        audit('editar_usuario', motivo || 'Actualización de datos de contacto', before, after);
        toast('✓ Usuario actualizado');
      } else {
        data.id = nextStableId(nombre);
        data.iniciales = nombre.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase();
        data.comModo = 'comision'; data.shareCom = 50;
        data.accessProvisioned = false; data.invitacionEstado = 'pendiente_habilitacion'; data.createdAt = new Date().toISOString();
        S().insert('asesores', data);
        audit('crear_usuario', motivo, null, userSnapshot(data));
        toast('✓ Usuario creado · acceso e invitación pendientes');
      }
      dirty = false; close(true); render(document.getElementById('host') || document.getElementById('mod-host'));
    });
  }

  function wire(host) {
    const ps = host.querySelector('#perm-save');
    if (ps) ps.addEventListener('click', () => {
      const motivo = window.prompt('Motivo del cambio de la matriz de permisos:') || '';
      if (motivo.trim().length < 5) return alert('Indica un motivo claro de al menos 5 caracteres.');
      const before = getPermisos();
      const next = {};
      host.querySelectorAll('[data-perm]').forEach(c => {
        const [rol, m, ac] = c.dataset.perm.split('|'); next[rol] = next[rol] || {}; next[rol][m] = next[rol][m] || {}; next[rol][m][ac] = c.checked;
      });
      Orbit.cat.setList('permisos', next); audit('editar_matriz_permisos', motivo, before, next); toast('✓ Matriz de permisos guardada');
    });
    const pr = host.querySelector('#perm-reset');
    if (pr) pr.addEventListener('click', () => {
      const ok = window.prompt('Escribe RESTABLECER para volver a los permisos estándar:'); if (ok !== 'RESTABLECER') return;
      const motivo = window.prompt('Motivo del restablecimiento:') || ''; if (motivo.trim().length < 5) return alert('Indica un motivo claro.');
      const before = getPermisos(), next = defaultPermissions(); Orbit.cat.setList('permisos', next); audit('restablecer_permisos', motivo, before, next); render(host);
    });
    host.querySelectorAll('[data-modo]').forEach(sel => sel.addEventListener('change', () => { Orbit.comeng.setVendModo(sel.dataset.modo, sel.value); render(host); }));
    host.querySelectorAll('[data-vend]').forEach(inp => inp.addEventListener('change', () => Orbit.comeng.setVendShare(inp.dataset.vend, inp.value)));
    host.querySelectorAll('[data-vval]').forEach(inp => inp.addEventListener('change', () => Orbit.comeng.setVendValor(inp.dataset.vval, inp.value)));
    host.querySelectorAll('[data-meta]').forEach(inp => inp.addEventListener('change', () => {
      const [aid, campo] = inp.dataset.meta.split('|'); setMeta(aid, metaPeriodo, metaPais, campo, inp.value); render(host);
    }));
    const mp = host.querySelector('#meta-periodo'); if (mp) mp.addEventListener('change', () => { metaPeriodo = mp.value || metaPeriodo; render(host); });
    const mc = host.querySelector('#meta-pais'); if (mc) mc.addEventListener('change', () => { metaPais = mc.value || metaPais; render(host); });
  }

  function filtrar(tipo) { userFilter = tipo || 'todos'; const host = document.getElementById('host') || document.getElementById('mod-host'); if (host) render(host); }
  return { render, editar: editarUsuario, metaDe, filtrar };
})();