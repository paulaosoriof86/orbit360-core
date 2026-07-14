/* ============================================================
   Orbit 360 · Equipo y permisos
   - Usuarios del equipo (asesores) con rol, estado y datos.
   - Matriz de PERMISOS por módulo y rol (ver/editar), persistente.
   - Esquema de COMISIÓN por asesor (reutiliza Orbit.comeng).
   - METAS por asesor, mes y tipo (nueva/renovada) — fuente única
     para Insights y Finanzas.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.equipo = (function () {
  const U = Orbit.ui, K = Orbit.kit, S = () => Orbit.store;
  let tab = 'usuarios';
  const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  let mesMeta = (U.NOW ? new Date(U.NOW).getMonth() : 5);

  // módulos sobre los que se asignan permisos
  const MODULOS = [
    ['cliente360', '🧑‍💼 Clientes 360'], ['polizas', '📑 Pólizas'], ['cobros', '💳 Cobros'],
    ['renovaciones', '🔄 Renovaciones'], ['ops', '🗂 Ops'], ['leads', '🎯 Leads'],
    ['comisiones', '💵 Comisiones'], ['finanzas', '💰 Finanzas'], ['insights', '📊 Insights'],
    ['configuracion', '⚙ Configuración']
  ];
  const ACCIONES = [['ver', 'Ver'], ['editar', 'Editar']];

  function render(host) {
    const TABS = [['usuarios', '👥 Usuarios'], ['permisos', '🔐 Permisos'], ['comisiones', '💵 Comisiones'], ['metas', '🎯 Metas']];
    host.innerHTML = `<div class="page">
      ${K.banner({ icon: '👥', title: 'Equipo y permisos', sub: 'Usuarios, roles, permisos, comisiones y metas', features: [], actions: `<button class="btn primary" id="eq-add" style="background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.28)">+ Usuario</button>` })}
      <div class="tabs tabs-scroll" style="margin-bottom:16px">${TABS.map(t => `<div class="tab ${tab === t[0] ? 'active' : ''}" data-t="${t[0]}">${t[1]}</div>`).join('')}</div>
      <div id="eq-body"></div>
    </div>`;
    host.querySelectorAll('.tab[data-t]').forEach(el => el.addEventListener('click', () => { tab = el.dataset.t; render(host); }));
    host.querySelector('#eq-add').addEventListener('click', () => editarUsuario(''));
    document.getElementById('eq-body').innerHTML = ({ usuarios, permisos, comisiones, metas }[tab] || usuarios)();
    wire(host);
  }

  /* ---------- USUARIOS ---------- */
  function usuarios() {
    const team = S().all('asesores');
    return `<div class="cfg-note" style="margin-bottom:14px">👥 Equipo del intermediario. El <b>rol</b> define qué ve y edita cada quien (matriz en la pestaña Permisos). Un usuario puede ser asesor y tener rol administrativo.</div>
    ${K.kpis([
      { label: 'Usuarios', val: team.length, color: 'var(--red)', foot: 'en el equipo' },
      { label: 'Asesores', val: team.filter(a => /Asesor/.test(a.rol)).length, color: 'var(--info)', foot: 'comercial' },
      { label: 'Administrativos', val: team.filter(a => !/Asesor/.test(a.rol)).length, color: 'var(--ok)', foot: 'dirección/admin/finanzas' }
    ])}
    <div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table class="tbl">
      <thead><tr><th>Usuario</th><th>Rol</th><th>Comisión</th><th class="num">Meta prima</th><th>Estado</th><th></th></tr></thead>
      <tbody>${team.map(a => {
        const esquema = a.comModo === 'fijo' ? ('Q' + (a.comValor || 0) + ' fijo') : a.comModo === 'neta' ? ((a.shareCom || 0) + '% s/neta') : ((a.shareCom || 50) + '% s/comisión');
        return `<tr class="clickable" onclick="Orbit.modules.equipo.editar('${a.id}')">
          <td><div style="display:flex;align-items:center;gap:9px">${U.avatar(a.nombre, a.color, 'sm')}<b>${U.esc(a.nombre)}</b></div></td>
          <td><span class="badge ${/Direcci/.test(a.rol) ? 'danger' : /Asesor/.test(a.rol) ? 'info' : 'neutral'}">${U.esc(a.rol)}</span></td>
          <td style="font-size:12.5px">${esquema}</td>
          <td class="num">${U.money(a.metaPrima || 0, Orbit.q.monedaPais())}</td>
          <td><span class="badge ${a.inactivo ? 'neutral' : 'ok'}">${a.inactivo ? 'Inactivo' : 'Activo'}</span></td>
          <td style="text-align:right;color:var(--ink-3)">›</td></tr>`;
      }).join('')}</tbody>
    </table></div></div>`;
  }

  /* ---------- PERMISOS (matriz rol × módulo) ---------- */
  function getPermisos() {
    const cfg = Orbit.cat.all();
    if (!cfg.permisos) {
      // por defecto: por nivel de rol
      const def = {};
      Object.keys(Orbit.ROLES).forEach(rol => {
        def[rol] = {};
        const nivel = Orbit.ROLES[rol].nivel;
        MODULOS.forEach(([m]) => {
          const admin = ['comisiones', 'finanzas', 'configuracion'].includes(m);
          const ver = admin ? nivel >= 3 : true;
          const editar = admin ? nivel >= 4 : nivel >= 2;
          def[rol][m] = { ver, editar };
        });
      });
      Orbit.cat.setList('permisos', def);
      return def;
    }
    return cfg.permisos;
  }
  function permisos() {
    const P = getPermisos();
    const roles = Object.keys(Orbit.ROLES || {'Dirección':1,'Admin':1,'Comercial':1,'Finanzas':1,'Marketing':1,'Operativo':1,'Asesor':1,'Asistente':1});
    return `<div class="cfg-note" style="margin-bottom:14px">🔐 Matriz de permisos por <b>rol × módulo</b>. Marca <b>Ver</b> y/o <b>Editar</b>. Se aplica en toda la plataforma. (El asesor, por diseño, solo ve su cartera y su comisión.)</div>
    <div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table class="tbl perm-tbl">
      <thead><tr><th>Módulo</th>${roles.map(r => `<th colspan="2" style="text-align:center;border-left:1px solid var(--line)">${r}</th>`).join('')}</tr>
      <tr><th></th>${roles.map(() => ACCIONES.map(a => `<th style="text-align:center;font-size:10.5px;font-weight:600;color:var(--ink-3)">${a[1]}</th>`).join('')).join('')}</tr></thead>
      <tbody>${MODULOS.map(([m, lbl]) => `<tr><td><b style="font-size:12.5px">${lbl}</b></td>${roles.map(r => ACCIONES.map(([ac]) => {
        const on = P[r] && P[r][m] && P[r][m][ac];
        return `<td style="text-align:center"><input type="checkbox" data-perm="${r}|${m}|${ac}" ${on ? 'checked' : ''}></td>`;
      }).join('')).join('')}</tr>`).join('')}</tbody>
    </table></div></div>
    <div style="margin-top:10px"><button class="btn ghost sm" id="perm-reset">Restablecer por defecto</button></div>`;
  }

  /* ---------- COMISIONES por asesor (reutiliza comeng) ---------- */
  function comisiones() {
    const team = S().all('asesores');
    return `<div class="cfg-note" style="margin-bottom:14px">💵 Esquema de comisión de cada asesor. <b>% sobre la comisión</b> de la aseguradora, <b>% sobre prima neta</b>, o <b>monto fijo</b> por póliza. Las tarifas que paga cada aseguradora se gestionan en <a style="color:var(--red);cursor:pointer" onclick="location.hash='#/comisiones'">Comisiones › Tarifas</a>.</div>
    <div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table class="tbl">
      <thead><tr><th>Asesor</th><th>Modelo</th><th class="num">Valor</th><th class="num">Meta recaudo</th></tr></thead>
      <tbody>${team.map(a => {
        const modo = a.comModo || 'comision';
        return `<tr>
          <td><div style="display:flex;align-items:center;gap:9px">${U.avatar(a.nombre, a.color, 'sm')}<b>${U.esc(a.nombre)}</b></div></td>
          <td><select data-modo="${a.id}" class="o-sel" style="padding:5px 8px;font-size:12px">
            <option value="comision" ${modo === 'comision' ? 'selected' : ''}>% de la comisión</option>
            <option value="neta" ${modo === 'neta' ? 'selected' : ''}>% de prima neta</option>
            <option value="fijo" ${modo === 'fijo' ? 'selected' : ''}>Monto fijo</option></select></td>
          <td class="num"><div class="ct-inp" style="justify-content:flex-end">${modo === 'fijo'
            ? `<input type="number" min="0" value="${a.comValor || 0}" data-vval="${a.id}" style="width:80px"><span>Q</span>`
            : `<input type="number" min="0" max="100" value="${a.shareCom != null ? a.shareCom : 50}" data-vend="${a.id}"><span>%</span>`}</div></td>
          <td class="num">${U.money(a.metaRecaudo || 0, Orbit.q.monedaPais())}</td></tr>`;
      }).join('')}</tbody>
    </table></div></div>`;
  }

  /* ---------- METAS por asesor / mes / tipo ---------- */
  function metasStore() { const c = Orbit.cat.all(); return c.metas || {}; }
  function setMeta(aseId, mes, campo, val) {
    const c = Orbit.cat.all(); c.metas = c.metas || {};
    const k = aseId + '|' + mes; c.metas[k] = c.metas[k] || {};
    c.metas[k][campo] = +val || 0; Orbit.cat.setList('metas', c.metas);
  }
  function metaDe(aseId, mes) {
    const m = metasStore()[aseId + '|' + mes] || {};
    const a = S().get('asesores', aseId) || {};
    return { nueva: m.nueva != null ? m.nueva : Math.round((a.metaPrima || 0) * 0.45), renovada: m.renovada != null ? m.renovada : Math.round((a.metaPrima || 0) * 0.55) };
  }
  function metas() {
    const team = S().all('asesores').filter(a => /Asesor|Direcc/.test(a.rol));
    const totN = team.reduce((s, a) => s + metaDe(a.id, mesMeta).nueva, 0);
    const totR = team.reduce((s, a) => s + metaDe(a.id, mesMeta).renovada, 0);
    return `<div class="cfg-note" style="margin-bottom:14px">🎯 Metas por asesor, <b>mes</b> y <b>tipo</b> (nueva vs renovada), sobre prima neta.</div>
    <div style="display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap">
      <select id="meta-mes" class="o-sel">${MESES.map((m, i) => `<option value="${i}" ${i === mesMeta ? 'selected' : ''}>${m} 2026</option>`).join('')}</select>
      <span class="muted" style="font-size:12.5px">Meta total del mes: <b style="color:var(--ok)">${U.moneyShort(totN, Orbit.q.monedaPais())}</b> nuevas · <b style="color:var(--info)">${U.moneyShort(totR, Orbit.q.monedaPais())}</b> renovadas</span>
    </div>
    <div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table class="tbl">
      <thead><tr><th>Asesor</th><th class="num">Meta NUEVA</th><th class="num">Meta RENOVADA</th><th class="num">Meta total</th></tr></thead>
      <tbody>${team.map(a => { const m = metaDe(a.id, mesMeta); return `<tr>
        <td><div style="display:flex;align-items:center;gap:9px">${U.avatar(a.nombre, a.color, 'sm')}<b>${U.esc(a.nombre)}</b></div></td>
        <td class="num"><div class="ct-inp" style="justify-content:flex-end"><span>Q</span><input type="number" min="0" value="${m.nueva}" data-meta="${a.id}|nueva" style="width:100px"></div></td>
        <td class="num"><div class="ct-inp" style="justify-content:flex-end"><span>Q</span><input type="number" min="0" value="${m.renovada}" data-meta="${a.id}|renovada" style="width:100px"></div></td>
        <td class="num"><b>${U.money(m.nueva + m.renovada, Orbit.q.monedaPais())}</b></td></tr>`; }).join('')}</tbody>
    </table></div></div>`;
  }

  /* ---------- editar usuario ---------- */
  function editarUsuario(id) {
    const a = id ? S().get('asesores', id) : { id: '', nombre: '', rol: 'Asesor', roles: ['Asesor'], color: '#1f3a5f', comModo: 'comision', shareCom: 50, metaPrima: 100000, metaRecaudo: 85000 };
    const roles = Object.keys(Orbit.ROLES);
    const rolesSel = a.roles && a.roles.length ? a.roles : [a.rol];
    const TODOS_MOD = (Orbit.ROLES['Dirección'] && Orbit.ROLES['Dirección'].modulos) || [];
    const modLabel = (Orbit.MODULE_TITLES) || {};
    const modActual = (a.modulosOverride && a.modulosOverride.length) ? a.modulosOverride : null;
    let back = document.getElementById('eq-edit'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'eq-edit'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center';
    back.innerHTML = `<div class="card" style="width:min(560px,94vw);max-height:92vh;overflow:auto;padding:0">
      <div style="padding:17px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center">
        <b style="font-family:var(--f-display);font-size:16px">${id ? '✏ Editar usuario' : '+ Nuevo usuario'}</b><button class="imp-x" id="eu-x">✕</button></div>
      <div style="padding:18px 20px;display:grid;gap:13px">
        <div class="cgrid">
          <label class="ce-l">Nombre<input id="eu-nombre" class="o-sel" value="${U.esc(a.nombre)}"></label>
          <label class="ce-l">Teléfono / WhatsApp<input id="eu-tel" class="o-sel" value="${U.esc(a.telefono || '')}" placeholder="+502 5555 5555"></label>
          <label class="ce-l">Correo del usuario<input id="eu-email" class="o-sel" value="${U.esc(a.email || '')}" placeholder="nombre@tudominio.com"></label>
          <label class="ce-l">Color<input id="eu-color" class="o-sel" type="color" value="${a.color || '#1f3a5f'}" style="height:38px"></label>
          <label class="ce-l">Meta prima (mes)<input id="eu-meta" class="o-sel" type="number" value="${a.metaPrima || 0}"></label>
          <label class="ce-l">Meta recaudo<input id="eu-rec" class="o-sel" type="number" value="${a.metaRecaudo || 0}"></label>
        </div>
        <div>
          <div class="ce-l" style="margin-bottom:6px">Roles del usuario <span class="muted">(puede tener varios)</span></div>
          <div style="display:flex;flex-wrap:wrap;gap:8px">${roles.map(r => `<label class="chiprole"><input type="checkbox" class="eu-role" value="${r}" ${rolesSel.indexOf(r) >= 0 ? 'checked' : ''}> ${r}</label>`).join('')}</div>
          <label class="ce-l" style="margin-top:8px">Rol por defecto al iniciar sesión<select id="eu-roldef" class="o-sel">${rolesSel.map(r => `<option ${r === (a.rolDefault || rolesSel[0]) ? 'selected' : ''}>${r}</option>`).join('')}</select></label>
          <div class="muted" style="font-size:11px;margin-top:3px">Solo puede elegir entre los roles marcados arriba. El selector de rol del topbar solo ofrecerá estos roles.</div>
        </div>
        <label class="ce-l">Alcance de cartera que ve este usuario<select id="eu-scope" class="o-sel">
          <option value="propia" ${(a.dataScope || (rolesSel.some(r => Orbit.ROLES[r] && Orbit.ROLES[r].nivel >= 4) ? 'todo' : 'propia')) === 'propia' ? 'selected' : ''}>Solo su propia cartera</option>
          <option value="equipo" ${a.dataScope === 'equipo' ? 'selected' : ''}>Su equipo (si tiene reportes directos)</option>
          <option value="todo" ${(a.dataScope || (rolesSel.some(r => Orbit.ROLES[r] && Orbit.ROLES[r].nivel >= 4) ? 'todo' : 'propia')) === 'todo' ? 'selected' : ''}>Toda la cartera (Dirección/Admin)</option>
          <option value="ninguno" ${a.dataScope === 'ninguno' ? 'selected' : ''}>Ninguna (acceso bloqueado a datos de cartera)</option>
        </select><div class="muted" style="font-size:11.5px;margin-top:4px">Este alcance ahora SÍ se aplica en vivo (Cliente360, Pólizas, Cobros, Renovaciones, Siniestros, Comisiones, Ops, Leads) — cambiarlo afecta inmediatamente lo que ese usuario puede consultar.</div></label>
        <label class="ce-l">Equipo <span class="muted">(para alcance "su equipo")</span><input id="eu-team" class="o-sel" value="${U.esc(a.teamId || '')}" placeholder="ej. equipo-norte"></label>
        <div>
          <div class="ce-l" style="margin-bottom:6px">Países habilitados para este usuario</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px">${Orbit.PAISES.filter(p => p.id !== 'TODOS').map(p => `<label class="chiprole"><input type="checkbox" class="eu-pais" value="${p.id}" ${(a.countries && a.countries.length ? a.countries.indexOf(p.id) >= 0 : true) ? 'checked' : ''}> ${p.label}</label>`).join('')}</div>
        </div>
        <details>
          <summary style="cursor:pointer;font-weight:700;font-size:13px;font-family:var(--f-display)">⚙ Módulos visibles para este usuario <span class="muted" style="font-weight:400">(opcional — por defecto los del rol)</span></summary>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:5px 12px;margin-top:10px">${TODOS_MOD.map(m => `<label class="ce-l ck" style="font-size:12.5px"><input type="checkbox" class="eu-mod" value="${m}" ${modActual ? (modActual.indexOf(m) >= 0 ? 'checked' : '') : 'checked'}> ${U.esc((modLabel[m] || m))}</label>`).join('')}</div>
          <div class="muted" style="font-size:11.5px;margin-top:6px">Si dejás todos marcados, manda el rol. Desmarcá para restringir módulos a este usuario en particular.</div>
        </details>
        <label class="ce-l ck"><input type="checkbox" id="eu-inact" ${a.inactivo ? 'checked' : ''}> Usuario inactivo</label>
        <details>
          <summary style="cursor:pointer;font-weight:700;font-size:13px;font-family:var(--f-display)">🔐 Permisos avanzados <span class="muted" style="font-weight:400">(extras/restricciones puntuales, además del rol)</span></summary>
          <div style="display:grid;gap:6px;margin-top:10px;font-size:12.5px">
            <label class="ce-l ck"><input type="checkbox" id="eu-perm-asg-extra" ${(a.permisosExtra || []).indexOf('aseguradoras_editar') >= 0 ? 'checked' : ''}> Extra: puede <b>editar Aseguradoras</b> aunque su rol no lo permita</label>
            <label class="ce-l ck"><input type="checkbox" id="eu-perm-asg-restr" ${(a.restricciones || []).indexOf('aseguradoras_editar') >= 0 ? 'checked' : ''}> Restricción: <b>no puede editar Aseguradoras</b> aunque su rol sí lo permita</label>
            <hr style="border:none;border-top:1px solid var(--line);margin:2px 0">
            <label class="ce-l ck"><input type="checkbox" id="eu-perm-plat-extra" ${(a.permisosExtra || []).indexOf('aseguradoras_plataformas_credenciales') >= 0 ? 'checked' : ''}> Extra: puede <b>ver/copiar credenciales de plataformas</b> de aseguradoras</label>
            <label class="ce-l ck"><input type="checkbox" id="eu-perm-plat-restr" ${(a.restricciones || []).indexOf('aseguradoras_plataformas_credenciales') >= 0 ? 'checked' : ''}> Restricción: <b>no puede ver/copiar credenciales de plataformas</b></label>
          </div>
          <div class="muted" style="font-size:11.5px;margin-top:6px">Las cuentas bancarias operativas son visibles/copiables para cualquiera con acceso a Aseguradoras — no tienen restricción por usuario. Solo las credenciales de plataformas requieren permiso explícito (Dirección/Admin/Operativo, o extra). La restricción siempre gana sobre el extra.</div>
        </details>
        <div class="cfg-note">🔐 Al guardar un usuario nuevo, se prepara la <b>invitación de acceso</b> al correo y WhatsApp indicados, pendiente de confirmación de entrega. El correo configurado acá será su usuario de ingreso y el que se asocia a su bandeja.</div>
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn ghost" id="eu-cancel">Cancelar</button><button class="btn primary" id="eu-ok">Guardar</button></div>
    </div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    const $ = s => back.querySelector(s);
    back.addEventListener('click', e => { if (e.target === back) close(); });
    $('#eu-x').addEventListener('click', close); $('#eu-cancel').addEventListener('click', close);
    $('#eu-ok').addEventListener('click', async () => {
      const rolesChecked = [...back.querySelectorAll('.eu-role:checked')].map(c => c.value);
      const rolesFinal = rolesChecked.length ? rolesChecked : ['Asesor'];
      const roldefSel = $('#eu-roldef') ? $('#eu-roldef').value : rolesFinal[0];
      const rolDefault = rolesFinal.indexOf(roldefSel) >= 0 ? roldefSel : rolesFinal[0];
      const modsChecked = [...back.querySelectorAll('.eu-mod:checked')].map(c => c.value);
      const modOverride = (modsChecked.length && modsChecked.length < TODOS_MOD.length) ? modsChecked : null;
      const permisosExtra = ['aseguradoras_editar', 'aseguradoras_plataformas_credenciales'].filter(k => {
        const map = { aseguradoras_editar: '#eu-perm-asg-extra', aseguradoras_plataformas_credenciales: '#eu-perm-plat-extra' };
        const el = $(map[k]); return el && el.checked;
      });
      const restricciones = ['aseguradoras_editar', 'aseguradoras_plataformas_credenciales'].filter(k => {
        const map = { aseguradoras_editar: '#eu-perm-asg-restr', aseguradoras_plataformas_credenciales: '#eu-perm-plat-restr' };
        const el = $(map[k]); return el && el.checked;
      });
      const scopeNuevo = $('#eu-scope').value;
      const teamId = $('#eu-team').value.trim();
      const countries = [...back.querySelectorAll('.eu-pais:checked')].map(c => c.value);
      const scopeAntes = a.dataScope || 'propia';
      const inactAntes = !!a.inactivo, inactDespues = $('#eu-inact').checked;
      const rolesAntes = a.roles || (a.rol ? [a.rol] : []);
      const PRIVILEGIADOS = ['Dirección', 'Admin'];
      const agregaRolPrivilegiado = rolesFinal.some(r => PRIVILEGIADOS.indexOf(r) >= 0 && rolesAntes.indexOf(r) < 0);
      const ampliaScope = (scopeAntes === 'ninguno' && scopeNuevo !== 'ninguno') || (scopeAntes === 'propia' && (scopeNuevo === 'equipo' || scopeNuevo === 'todo')) || (scopeAntes === 'equipo' && scopeNuevo === 'todo');
      const retiraRestriccion = (a.restricciones || []).some(r => restricciones.indexOf(r) < 0);
      const reactivaMembresia = inactAntes && !inactDespues;
      const agregaModulo = modOverride && (!a.modulosOverride || modOverride.some(m => a.modulosOverride.indexOf(m) < 0));
      const paisesAntes = a.countries || [];
      const agregaPais = paisesAntes.length && countries.some(p => paisesAntes.indexOf(p) < 0);
      const ampliaAcceso = ampliaScope || permisosExtra.some(p => (a.permisosExtra || []).indexOf(p) < 0) || agregaRolPrivilegiado || retiraRestriccion || reactivaMembresia || agregaModulo || agregaPais;
      let motivoExacto = '';
      if (ampliaAcceso) {
        const motivos = [];
        if (ampliaScope) motivos.push('alcance ' + scopeAntes + '→' + scopeNuevo);
        if (agregaRolPrivilegiado) motivos.push('rol privilegiado agregado');
        if (retiraRestriccion) motivos.push('restricción retirada');
        if (reactivaMembresia) motivos.push('membresía reactivada');
        if (agregaModulo) motivos.push('módulo agregado');
        if (agregaPais) motivos.push('país agregado');
        if (permisosExtra.some(p => (a.permisosExtra || []).indexOf(p) < 0)) motivos.push('permiso extra agregado');
        const conf = (await U.prompt('Estás ampliando el acceso de este usuario (' + motivos.join(', ') + '). Escribí exactamente CONFIRMO AMPLIAR ACCESO y el motivo:', { title: '⚠ Confirmación reforzada' }) || '').trim();
        if (conf.indexOf('CONFIRMO AMPLIAR ACCESO') !== 0) { U.toast('Cambio cancelado — no se amplió el acceso.'); return; }
        motivoExacto = conf;
      }
      const modulesExtra = modOverride ? modOverride.filter(m => TODOS_MOD.indexOf(m) >= 0 && (Orbit.ROLES[rolDefault] && (Orbit.ROLES[rolDefault].modulos || []).indexOf(m) < 0)) : [];
      const modulesRestricted = modOverride ? TODOS_MOD.filter(m => (Orbit.ROLES[rolDefault] && (Orbit.ROLES[rolDefault].modulos || []).indexOf(m) >= 0) && modOverride.indexOf(m) < 0) : [];
      const data = { nombre: $('#eu-nombre').value || 'Usuario', rol: rolDefault, roles: rolesFinal, rolDefault, dataScope: scopeNuevo, teamId: teamId || null, countries, telefono: $('#eu-tel').value, email: $('#eu-email').value, color: $('#eu-color').value, metaPrima: +$('#eu-meta').value || 0, metaRecaudo: +$('#eu-rec').value || 0, inactivo: inactDespues, modulosOverride: modOverride, modulesExtra, modulesRestricted, dataScopes: { default: scopeNuevo, modules: (a.dataScopes && a.dataScopes.modules) || {} }, permisosExtra, restricciones };
      if (id) {
        const before = { rol: a.rol, roles: a.roles, dataScope: a.dataScope, dataScopes: a.dataScopes, permisosExtra: a.permisosExtra, restricciones: a.restricciones, inactivo: a.inactivo, modulosOverride: a.modulosOverride, modulesExtra: a.modulesExtra, modulesRestricted: a.modulesRestricted, countries: a.countries };
        S().update('asesores', id, data);
        const diffIntegral = {
          roles: { antes: before.roles || [], despues: rolesFinal },
          rolDefault: { antes: before.rol || '', despues: rolDefault },
          scopeDefault: { antes: (before.dataScopes && before.dataScopes.default) || before.dataScope || 'propia', despues: scopeNuevo },
          scopePorModulo: { antes: (before.dataScopes && before.dataScopes.modules) || {}, despues: data.dataScopes.modules },
          modulesExtra: { antes: before.modulesExtra || [], despues: modulesExtra },
          modulesRestricted: { antes: before.modulesRestricted || [], despues: modulesRestricted },
          paises: { antes: before.countries || [], despues: countries },
          permisosExtra: { antes: before.permisosExtra || [], despues: permisosExtra },
          restricciones: { antes: before.restricciones || [], despues: restricciones },
          estado: { antes: before.inactivo ? 'inactivo' : 'activo', despues: inactDespues ? 'inactivo' : 'activo' }
        };
        S().insert('actividades', {
          id: 'act' + Date.now(), clienteId: '', asesorId: id, tipo: 'sistema', icon: '🔐', fecha: Orbit.ui.today(),
          titulo: 'Permisos actualizados: ' + U.esc(data.nombre),
          detalle: 'Actor: ' + (Orbit.session ? Orbit.session.rol() : '—') + ' · Antes: rol ' + (before.rol || '—') + ', scope ' + (diffIntegral.scopeDefault.antes) + ', países ' + (paisesAntes.join(',') || 'todos') + ', activo ' + !before.inactivo + ' → Ahora: rol ' + rolDefault + ', scope ' + scopeNuevo + ', países ' + (countries.join(',') || 'todos') + ', activo ' + !inactDespues + (ampliaAcceso ? ' [AMPLIACIÓN CONFIRMADA — motivo exacto: "' + motivoExacto + '"]' : ''),
          motivoExacto: motivoExacto || null, diffIntegral, ampliacionConfirmada: !!ampliaAcceso, timestamp: Date.now(), rolActor: (Orbit.session ? Orbit.session.rol() : '—')
        });
      }
      else { data.id = 'ase' + Date.now().toString().slice(-5); data.iniciales = data.nombre.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase(); data.comModo = 'comision'; data.shareCom = 50; S().insert('asesores', data); const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = '✓ Usuario creado · invitación preparada, pendiente de confirmación (' + (data.email || 'su correo') + ')'; document.body.appendChild(t); setTimeout(() => t.remove(), 3000); }
      close(); render(document.getElementById('host') || document.getElementById('mod-host'));
    });
  }

  function wire(host) {
    host.querySelectorAll('[data-perm]').forEach(c => c.addEventListener('change', () => {
      const [rol, m, ac] = c.dataset.perm.split('|'); const P = getPermisos();
      P[rol] = P[rol] || {}; P[rol][m] = P[rol][m] || {}; P[rol][m][ac] = c.checked; Orbit.cat.setList('permisos', P);
    }));
    const pr = host.querySelector('#perm-reset'); if (pr) pr.addEventListener('click', () => { const c = Orbit.cat.all(); delete c.permisos; Orbit.cat.setList('permisos', undefined); getPermisos(); render(host); });
    host.querySelectorAll('[data-modo]').forEach(sel => sel.addEventListener('change', () => { Orbit.comeng.setVendModo(sel.dataset.modo, sel.value); render(host); }));
    host.querySelectorAll('[data-vend]').forEach(inp => inp.addEventListener('change', () => Orbit.comeng.setVendShare(inp.dataset.vend, inp.value)));
    host.querySelectorAll('[data-vval]').forEach(inp => inp.addEventListener('change', () => Orbit.comeng.setVendValor(inp.dataset.vval, inp.value)));
    host.querySelectorAll('[data-meta]').forEach(inp => inp.addEventListener('change', () => { const [aid, campo] = inp.dataset.meta.split('|'); setMeta(aid, mesMeta, campo, inp.value); render(host); }));
    const mm = host.querySelector('#meta-mes'); if (mm) mm.addEventListener('change', () => { mesMeta = +mm.value; render(host); });
  }

  return { render, editar: editarUsuario, metaDe };
})();
