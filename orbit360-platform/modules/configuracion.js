/* ============================================================
   Orbit 360 · Configuración  — BETA (núcleo de personalización)
   Dos niveles:
   · Self-service del cliente (según plan): marca, usuarios/roles,
     países/monedas, add-ons, APIs, portal.
   · Interna (nuestra): módulos activos por cliente, plan, white-label.
   Fuente de verdad: Orbit.tenant. El sidebar lee modulosActivos.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.configuracion = (function () {
  const U = Orbit.ui, K = Orbit.kit, T = () => Orbit.tenant;
  let tab = 'marca';

  const TABS = [
    ['marca', '🎨 Marca', 'cli'],
    ['usuarios', '👥 Usuarios y permisos', 'cli'],
    ['paises', '🌎 Países y monedas', 'cli'],
    ['addons', '🧩 Integraciones', 'cli'],
    ['apis', '🔌 APIs', 'cli'],
    ['planes', '⭐ Plan', 'cli'],
    ['interna', '🔒 Interno (Orbit)', 'int']
  ];

  function render(host) {
    host.innerHTML = `<div class="page">
      ${K.banner({ icon: '⚙', title: 'Configuración', sub: 'Personalización sin código', features: ['White-label', 'Roles y permisos', 'Módulos por cliente'], actions: '' })}
      <div class="cfg-wrap">
        <div class="cfg-side">
          ${TABS.map(t => `<button class="cfg-navi ${tab === t[0] ? 'on' : ''} ${t[2]}" data-t="${t[0]}">${t[1]}${t[2] === 'int' ? '<span class="cfg-int">Orbit</span>' : ''}</button>`).join('')}
        </div>
        <div class="cfg-body" id="cfg-body"></div>
      </div>
    </div>`;
    host.querySelectorAll('.cfg-navi').forEach(el => el.addEventListener('click', () => { tab = el.dataset.t; render(host); }));
    paint(host);
  }

  function paint(host) {
    const body = document.getElementById('cfg-body');
    const fns = { marca, usuarios, paises, addons, apis, planes, interna };
    body.innerHTML = (fns[tab] || marca)();
    wire(host);
  }

  function sectionHead(t, s) { return `<div class="cfg-h"><b>${t}</b><span>${s}</span></div>`; }
  function row(label, ctrl, hint) {
    return `<div class="cfg-row"><div class="cfg-lab">${label}${hint ? `<small>${hint}</small>` : ''}</div><div class="cfg-ctrl">${ctrl}</div></div>`;
  }
  function toggle(id, on) { return `<button class="cfg-tog ${on ? 'on' : ''}" data-tog="${id}"><span></span></button>`; }

  /* ---------- MARCA ---------- */
  function marca() {
    const t = T().get(), plan = Orbit.PLANES[t.plan];
    const lock = !plan.personalizacion;
    return `${sectionHead('Marca y apariencia', 'Logo, paleta y menú — white-label')}
      ${lock ? `<div class="cfg-lock">🔒 El plan <b>${plan.nombre}</b> usa plantillas estándar. La personalización de marca está disponible en planes Profesional y Personalizado.</div>` : ''}
      ${row('Nombre de la empresa', `<input class="o-sel" id="cf-empresa" value="${U.esc(t.empresa)}" ${lock ? 'disabled' : ''} style="min-width:240px">`)}
      ${row('Logo del cliente', `<div style="display:flex;align-items:center;gap:10px"><span class="cfg-logo">${t.branding.logo ? `<img src="${U.esc(t.branding.logo)}">` : '🏢'}</span><button class="btn ghost sm" ${lock ? 'disabled' : ''} onclick="alert('Demo: subir logo (PNG/SVG)')">Subir logo</button></div>`, 'Aparece en la cintilla y el login')}
      ${row('Paleta de marca', `<button class="btn ghost sm" ${lock ? 'disabled' : ''} onclick="Orbit.theme.picker(this)">🎨 Elegir paleta</button>`, 'Cambia el acento en toda la plataforma')}
      ${row('Menú lateral', `<div class="cfg-seg" id="cf-sb">${['oscuro', 'claro'].map(m => `<button data-sb="${m}" class="${Orbit.theme.getSidebar() === m ? 'on' : ''}" ${lock ? 'disabled' : ''}>${m === 'oscuro' ? 'Oscuro' : 'Claro'}</button>`).join('')}</div>`)}
      ${row('Auto-branding por IA', `<button class="btn ghost sm" ${lock ? 'disabled' : ''} onclick="alert('Demo: sube el manual de identidad / logo y la IA propone tipografía y colores corporativos.')">📄 Subir manual de marca</button>`, 'La IA adapta tipografía y colores corporativos (plan Personalizado)')}`;
  }

  /* ---------- USUARIOS Y PERMISOS ---------- */
  function usuarios() {
    const roles = Orbit.ROLES;
    const team = Orbit.store.all('asesores');
    return `${sectionHead('Usuarios y permisos', 'Roles por módulo, metas y visibilidad')}
      <div class="card" style="overflow:hidden;margin-bottom:16px"><table class="tbl">
        <thead><tr><th>Usuario</th><th>Rol</th><th>Comisión</th><th>Meta prima</th><th></th></tr></thead>
        <tbody>${team.map(a => `<tr>
          <td><div style="display:flex;align-items:center;gap:9px">${U.avatar(a.nombre, a.color, 'sm')}<b>${U.esc(a.nombre)}</b></div></td>
          <td><select class="o-sel" data-role="${a.id}">${Object.keys(roles).map(r => `<option ${a.rol === r || (a.rol && a.rol.includes(r)) ? 'selected' : ''}>${r}</option>`).join('')}</select></td>
          <td>${a.comTipo ? `<span class="badge ${a.comTipo === 'variable' ? 'info' : 'neutral'}">${a.comTipo} · ${a.comPct}%</span>` : '—'}</td>
          <td class="num">${U.money(a.metaPrima, 'GTQ')}</td>
          <td style="text-align:right"><button class="btn ghost sm" onclick="alert('Demo: editar permisos por módulo de ${U.esc(a.nombre)}')">Permisos</button></td>
        </tr>`).join('')}</tbody>
      </table></div>
      <div class="cfg-grid2">
        ${Object.entries(roles).map(([r, d]) => `<div class="cfg-rolecard"><b>${r}</b><span class="cfg-nivel">Nivel ${d.nivel}</span><p>${d.desc}</p></div>`).join('')}
      </div>
      <button class="btn primary" style="margin-top:14px" onclick="alert('Demo: invitar usuario')">+ Invitar usuario</button>`;
  }

  /* ---------- PAÍSES Y MONEDAS ---------- */
  function paises() {
    const t = T().get();
    const all = (Orbit.PAISES || []).filter(p => p.id !== 'TODOS');
    return `${sectionHead('Países y monedas', 'Operación multipaís — cada país con su moneda, sin mezclar')}
      <div class="cfg-grid2">
        ${all.map(p => {
          const on = t.paises.includes(p.id);
          return `<div class="cfg-paiscard ${on ? 'on' : ''}">
            <div style="display:flex;align-items:center;gap:10px">
              <span style="font-size:22px">${p.id === 'GT' ? '🇬🇹' : p.id === 'CO' ? '🇨🇴' : '🌎'}</span>
              <div><b>${p.label}</b><div class="muted" style="font-size:12px">Moneda: ${p.moneda || '—'}</div></div>
              ${toggle('pais-' + p.id, on)}
            </div></div>`;
        }).join('')}
      </div>
      <div class="cfg-note" style="margin-top:14px">💱 Las monedas <b>no se mezclan</b> entre países en ninguna sección: los totales se muestran por país o se normalizan explícitamente. Moneda base de reportes: <b>${t.monedaBase}</b>.</div>
      <button class="btn ghost" style="margin-top:14px" onclick="alert('Demo: agregar país (catálogo configurable)')">+ Agregar país</button>`;
  }

  /* ---------- INTEGRACIONES / ADD-ONS ---------- */
  function addons() {
    const t = T().get(), plan = Orbit.PLANES[t.plan];
    const lock = !plan.addons;
    const items = [
      ['make', '🔗 Make (Integromat)', 'Automatizaciones entre módulos y servicios externos por cadencia.', t.addons.make],
      ['drive', '📁 Google Drive', 'Expedientes y documentos enlazados por cliente y aseguradora.', t.addons.drive],
      ['whatsapp', '💬 WhatsApp Business', 'Recordatorios, renovaciones y encuestas automatizadas.', t.addons.whatsapp]
    ];
    return `${sectionHead('Integraciones y add-ons', 'Conecta servicios externos — activables por plan')}
      ${lock ? `<div class="cfg-lock">🔒 Add-ons disponibles desde el plan Profesional.</div>` : ''}
      <div class="cfg-grid2">
        ${items.map(([id, t2, d, on]) => `<div class="cfg-addon ${on ? 'on' : ''}">
          <div style="flex:1"><b>${t2}</b><p>${d}</p></div>
          ${toggle('addon-' + id, on)}
        </div>`).join('')}
      </div>
      <div class="cfg-note" style="margin-top:14px">⚡ Cada módulo declara sus <b>automatizaciones</b> (recordatorios de pago/renovación, cadencias de seguimiento Ops/Leads, generación de movimientos). Make las orquesta cuando está activo.</div>`;
  }

  /* ---------- APIs ---------- */
  function apis() {
    const t = T().get(), plan = Orbit.PLANES[t.plan];
    const lock = !plan.apis;
    return `${sectionHead('APIs y credenciales', 'Conexiones seguras con el nivel de seguridad correcto')}
      ${lock ? `<div class="cfg-lock">🔒 Gestión de APIs disponible en el plan Personalizado.</div>` : ''}
      <div class="cfg-note" style="margin-bottom:14px">🔐 Las credenciales se guardan <b>cifradas</b>, con <b>scopes mínimos</b> y visibilidad por rol. Nunca se exponen en el front (demo: solo la UI de gestión).</div>
      <div class="card" style="overflow:hidden"><table class="tbl">
        <thead><tr><th>Servicio</th><th>Estado</th><th>Scope</th><th></th></tr></thead>
        <tbody>
          ${[['WhatsApp Cloud API', 'Conectado', 'mensajería'], ['Aseguradora — Cotizador', 'Pendiente', 'tarifas'], ['SIGA / CRM externo', 'No configurado', 'importación']].map(r => `<tr>
            <td><b>${r[0]}</b></td>
            <td><span class="badge ${r[1] === 'Conectado' ? 'ok' : r[1] === 'Pendiente' ? 'warn' : 'neutral'}">${r[1]}</span></td>
            <td>${r[2]}</td>
            <td style="text-align:right"><button class="btn ghost sm" ${lock ? 'disabled' : ''} onclick="alert('Demo: configurar credenciales (cifradas)')">Configurar</button></td>
          </tr>`).join('')}
        </tbody>
      </table></div>`;
  }

  /* ---------- PLAN ---------- */
  function planes() {
    const t = T().get();
    return `${sectionHead('Plan contratado', 'Define qué puede personalizar el cliente')}
      <div class="cfg-grid3">
        ${Object.values(Orbit.PLANES).map(p => `<div class="cfg-plan ${t.plan === p.id ? 'on' : ''}">
          <div class="cfg-plan-h">${p.nombre}${t.plan === p.id ? '<span class="badge ok">Actual</span>' : ''}</div>
          <p>${p.desc}</p>
          <ul>
            <li class="${p.personalizacion ? 'y' : 'n'}">Marca configurable</li>
            <li class="${p.addons ? 'y' : 'n'}">Integraciones / add-ons</li>
            <li class="${p.apis ? 'y' : 'n'}">APIs y auto-branding IA</li>
          </ul>
        </div>`).join('')}
      </div>
      <div class="cfg-note" style="margin-top:14px">El plan se asigna desde la <b>configuración interna</b> (Orbit). El cliente ve aquí lo que su plan habilita.</div>`;
  }

  /* ---------- INTERNA (Orbit) ---------- */
  function interna() {
    const t = T().get();
    const nav = Orbit.NAV.flatMap(b => b.type === 'home' ? [{ route: b.route, label: b.label, icon: b.icon }] : b.items);
    const planes = Object.values(Orbit.PLANES).concat(loadCustomPlans());
    return `${sectionHead('Configuración interna · Orbit', 'Solo nuestro equipo — provisioning del cliente')}
      <div class="cfg-int-banner">🔒 Esta sección NO es visible para el cliente. Aquí definimos plan, white-label y los <b>módulos activos</b> de cada cuenta.</div>

      ${sectionHead('Planes comercializables', 'Importá tu catálogo o creá planes; editables por acuerdos y promociones')}
      <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
        <button class="btn ghost sm" onclick="Orbit.importa.open('clientes',{})">⬇ Importar catálogo de planes</button>
        <button class="btn primary sm" id="cf-plan-new">+ Crear plan</button>
      </div>
      <div class="card" style="overflow:hidden;margin-bottom:18px"><table class="tbl">
        <thead><tr><th>Plan</th><th>Marca</th><th>Add-ons</th><th>APIs</th><th>Descripción</th><th></th></tr></thead>
        <tbody>${planes.map(p => `<tr>
          <td><b>${U.esc(p.nombre)}</b>${p.custom ? ' <span class="badge info">propio</span>' : ''}</td>
          <td>${p.personalizacion ? '✓' : '—'}</td>
          <td>${p.addons ? '✓' : '—'}</td>
          <td>${p.apis ? '✓' : '—'}</td>
          <td class="muted" style="font-size:12.5px">${U.esc(p.desc)}</td>
          <td style="text-align:right"><button class="btn ghost sm" onclick="alert('Demo: editar funcionalidades, precio y vigencia del plan — ajustable por acuerdos comerciales o promociones.')">Editar</button></td>
        </tr>`).join('')}</tbody>
      </table></div>
      <div class="cfg-note" style="margin-bottom:18px">💡 Al asignar un plan al cliente se configuran de una vez sus funcionalidades; podés <b>modificar más o menos según acuerdos o promociones</b> sin cambiar el catálogo base.</div>

      ${row('Plan del cliente', `<select class="o-sel" id="cf-plan">${planes.map(p => `<option value="${p.id}" ${t.plan === p.id ? 'selected' : ''}>${p.nombre}</option>`).join('')}</select>`, 'Cambia lo que el cliente puede personalizar')}
      ${sectionHead('Módulos activos por cliente', 'Enciende/apaga módulos de esta cuenta — el menú se ajusta solo')}
      <div class="cfg-mods">
        ${nav.map(it => {
          const on = t.modulosActivos.includes(it.route);
          return `<label class="cfg-mod ${on ? 'on' : ''}"><input type="checkbox" data-mod="${it.route}" ${on ? 'checked' : ''}><span class="cfg-mod-ico">${it.icon}</span><span>${U.esc(it.label)}</span></label>`;
        }).join('')}
      </div>
      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn primary" id="cf-mods-save">Guardar módulos activos</button>
        <button class="btn ghost" id="cf-reset" onclick="if(confirm('¿Restablecer configuración del cliente a valores por defecto?')){Orbit.tenant.reset();location.reload();}">Restablecer</button>
      </div>`;
  }
  // planes propios (importados/creados), persistentes
  const PKEY = 'orbit360_planes';
  function loadCustomPlans() { try { const r = localStorage.getItem(PKEY); if (r) return JSON.parse(r); } catch (e) {} return []; }
  function saveCustomPlans(d) { try { localStorage.setItem(PKEY, JSON.stringify(d)); } catch (e) {} }

  /* ---------- wiring ---------- */
  function wire(host) {
    // toggles genéricos
    host.querySelectorAll('[data-tog]').forEach(b => b.addEventListener('click', () => {
      const key = b.dataset.tog, t = T().get();
      if (key.startsWith('pais-')) { const id = key.slice(5); const arr = new Set(t.paises); arr.has(id) ? arr.delete(id) : arr.add(id); T().setDeep('paises', [...arr]); }
      else if (key.startsWith('addon-')) { const id = key.slice(6); const a = Object.assign({}, t.addons); a[id] = !a[id]; T().setDeep('addons', a); }
      paint(host);
    }));
    // sidebar seg
    host.querySelectorAll('#cf-sb button').forEach(b => b.addEventListener('click', () => { Orbit.theme.applySidebar(b.dataset.sb); paint(host); }));
    // empresa
    const emp = document.getElementById('cf-empresa');
    if (emp) emp.addEventListener('change', () => { T().setDeep('empresa', emp.value); applyBrandToTopbar(); });
    // plan interno
    const pl = document.getElementById('cf-plan');
    if (pl) pl.addEventListener('change', () => { T().setDeep('plan', pl.value); paint(host); });
    // crear plan propio
    const np = document.getElementById('cf-plan-new');
    if (np) np.addEventListener('click', () => {
      const nombre = prompt('Nombre del nuevo plan comercializable:'); if (!nombre) return;
      const cp = loadCustomPlans();
      const id = 'plan-' + Date.now();
      cp.push({ id, nombre, personalizacion: confirm('¿Incluye personalización de marca?'), addons: confirm('¿Incluye add-ons/integraciones?'), apis: confirm('¿Incluye APIs y auto-branding?'), desc: 'Plan propio — editable por acuerdos comerciales.', custom: true });
      saveCustomPlans(cp);
      paint(host);
    });
    // módulos activos
    const save = document.getElementById('cf-mods-save');
    if (save) save.addEventListener('click', () => {
      const mods = [...host.querySelectorAll('[data-mod]:checked')].map(i => i.dataset.mod);
      if (!mods.includes('configuracion')) mods.push('configuracion'); // nunca apagar config
      T().setDeep('modulosActivos', mods);
      if (Orbit.router && Orbit.router.rebuildSidebar) Orbit.router.rebuildSidebar();
      alert('Módulos actualizados. El menú lateral se ajustó a esta cuenta.');
    });
    host.querySelectorAll('.cfg-mod input').forEach(i => i.addEventListener('change', () => i.closest('.cfg-mod').classList.toggle('on', i.checked)));
  }
  function applyBrandToTopbar() {
    const t = T().get();
    const cn = document.querySelector('.tb-logo .cn');
    if (cn) cn.firstChild.textContent = t.empresa;
  }

  return { render };
})();
