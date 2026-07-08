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
    return `<div class="cfg-note" style="margin-bottom:14px">🎯 Metas por asesor, <b>mes</b> y <b>tipo</b> (nueva vs renovada), sobre prima neta. Es la <b>fuente única</b> que leen Insights y Finanzas.</div>
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
          <div class="ce-l" style="margin-bottom:6px">Roles del usuario <span class="muted">(puede tener varios; el primero es el principal)</span></div>
          <div style="display:flex;flex-wrap:wrap;gap:8px">${roles.map(r => `<label class="chiprole"><input type="checkbox" class="eu-role" value="${r}" ${rolesSel.indexOf(r) >= 0 ? 'checked' : ''}> ${r}</label>`).join('')}</div>
        </div>
        <details>
          <summary style="cursor:pointer;font-weight:700;font-size:13px;font-family:var(--f-display)">⚙ Módulos visibles para este usuario <span class="muted" style="font-weight:400">(opcional — por defecto los del rol)</span></summary>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:5px 12px;margin-top:10px">${TODOS_MOD.map(m => `<label class="ce-l ck" style="font-size:12.5px"><input type="checkbox" class="eu-mod" value="${m}" ${modActual ? (modActual.indexOf(m) >= 0 ? 'checked' : '') : 'checked'}> ${U.esc((modLabel[m] || m))}</label>`).join('')}</div>
          <div class="muted" style="font-size:11.5px;margin-top:6px">Si dejás todos marcados, manda el rol. Desmarcá para restringir módulos a este usuario en particular.</div>
        </details>
        <label class="ce-l ck"><input type="checkbox" id="eu-inact" ${a.inactivo ? 'checked' : ''}> Usuario inactivo</label>
        <div class="cfg-note">🔐 Al guardar un usuario, queda creado en el equipo. La invitación y credenciales de acceso quedan pendientes de canal seguro autorizado. El correo configurado acá será su usuario cuando la autenticación real esté activa.</div>
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn ghost" id="eu-cancel">Cancelar</button><button class="btn primary" id="eu-ok">Guardar</button></div>
    </div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    const $ = s => back.querySelector(s);
    back.addEventListener('click', e => { if (e.target === back) close(); });
    $('#eu-x').addEventListener('click', close); $('#eu-cancel').addEventListener('click', close);
    $('#eu-ok').addEventListener('click', () => {
      const rolesChecked = [...back.querySelectorAll('.eu-role:checked')].map(c => c.value);
      const rolesFinal = rolesChecked.length ? rolesChecked : ['Asesor'];
      const modsChecked = [...back.querySelectorAll('.eu-mod:checked')].map(c => c.value);
      const modOverride = (modsChecked.length && modsChecked.length < TODOS_MOD.length) ? modsChecked : null;
      const data = { nombre: $('#eu-nombre').value || 'Usuario', rol: rolesFinal[0], roles: rolesFinal, telefono: $('#eu-tel').value, email: $('#eu-email').value, color: $('#eu-color').value, metaPrima: +$('#eu-meta').value || 0, metaRecaudo: +$('#eu-rec').value || 0, inactivo: $('#eu-inact').checked, modulosOverride: modOverride };
      if (id) S().update('asesores', id, data);
      else { data.id = 'ase' + Date.now().toString().slice(-5); data.iniciales = data.nombre.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase(); data.comModo = 'comision'; data.shareCom = 50; S().insert('asesores', data); const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = '✓ Usuario creado en equipo · invitación pendiente de canal seguro para ' + (data.email || 'su correo'); document.body.appendChild(t); setTimeout(() => t.remove(), 3000); }
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

// ORBIT360 V1330 EQUIPO GATES PATCH START
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
})();
// ORBIT360 V1330 EQUIPO GATES PATCH END
