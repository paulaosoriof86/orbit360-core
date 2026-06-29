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
      ${row('Logo del cliente', `<div style="display:flex;align-items:center;gap:10px"><span class="cfg-logo">${t.branding.logo ? `<img src="${U.esc(t.branding.logo)}">` : '🏢'}</span><button class="btn ghost sm" ${lock ? 'disabled' : ''} onclick="(function(){var fi=document.createElement('input');fi.type='file';fi.accept='image/*';fi.onchange=function(){var r=new FileReader();r.onload=function(e){try{localStorage.setItem('orbit360_logo',e.target.result);}catch(x){}try{var b=Orbit.tenant.get().branding||{};b.logo=e.target.result;Orbit.tenant.setDeep('branding',b);}catch(x){}if(Orbit.applyBrand)Orbit.applyBrand();var img=document.getElementById('cfg-logo-prev');if(img){img.src=e.target.result;img.style.display='inline-block';}var t=document.createElement('div');t.className='ciclo-toast';t.textContent='\u2713 Logo aplicado en cintilla y login';document.body.appendChild(t);setTimeout(function(){t.remove();},2600);};r.readAsDataURL(fi.files[0]);};fi.click();})()">Subir logo</button><button class="btn ghost sm" ${lock ? 'disabled' : ''} onclick="(function(){try{localStorage.removeItem('orbit360_logo');var b=Orbit.tenant.get().branding||{};b.logo='';Orbit.tenant.setDeep('branding',b);}catch(x){}if(Orbit.applyBrand)Orbit.applyBrand();})()">Quitar</button><img id="cfg-logo-prev" style="height:36px;border-radius:6px;margin-left:8px;vertical-align:middle;display:none"></div>`, 'Se refleja en la cintilla y el login. Sube el logo del cliente para white-label.')}
      ${row('Paleta de marca', `<button class="btn ghost sm" ${lock ? 'disabled' : ''} onclick="Orbit.theme.picker(this)">🎨 Elegir paleta</button>`, 'Cambia el acento en toda la plataforma')}
      ${row('Menú lateral', `<div class="cfg-seg" id="cf-sb">${['oscuro', 'claro'].map(m => `<button data-sb="${m}" class="${Orbit.theme.getSidebar() === m ? 'on' : ''}" ${lock ? 'disabled' : ''}>${m === 'oscuro' ? 'Oscuro' : 'Claro'}</button>`).join('')}</div>`)}
      ${row('Auto-branding por IA', `<button class="btn ghost sm" ${lock ? 'disabled' : ''} onclick="Orbit.modules.configuracion.subirManualMarca()">📄 Subir manual de marca</button>`, 'La IA lee tu manual y propone tipografía y colores corporativos (plan Personalizado)')}`;
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
          <td style="text-align:right"><button class="btn ghost sm" onclick="Orbit.modules.equipo.editar('${a.id}')">Permisos</button></td>
        </tr>`).join('')}</tbody>
      </table></div>
      <div class="cfg-grid2">
        ${Object.entries(roles).map(([r, d]) => `<div class="cfg-rolecard"><b>${r}</b><span class="cfg-nivel">Nivel ${d.nivel}</span><p>${d.desc}</p></div>`).join('')}
      </div>
      <button class="btn primary" style="margin-top:14px" onclick="Orbit.modules.equipo.editar(null)">+ Invitar usuario</button>`;
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
      <button class="btn ghost" style="margin-top:14px" onclick="Orbit.modules.configuracion.agregarPais()">+ Agregar país</button>`;
  }

  /* ---------- INTEGRACIONES / ADD-ONS ---------- */
  function addons() {
    const t = T().get(), plan = Orbit.PLANES[t.plan];
    const lock = !plan.addons;
    // Catálogo amplio por categorías (ecosistema completo). on = estado guardado en tenant.addons[id]
    const CATS = [
      ['Correo y comunicación', [
        ['correo', '✉ Correo (Outlook / Microsoft 365)', 'Bandeja integrada; vincula correos a clientes, pólizas, gestiones y aseguradoras.'],
        ['imap', '📨 IMAP / POP3 (dominio propio)', 'Conecta cualquier proveedor o correo corporativo con dominio propio.'],
        ['gmail', '📩 Gmail / Google Workspace', 'Sincroniza correos y contactos de Google.'],
        ['whatsapp', '💬 WhatsApp Business (API + Web)', 'Recordatorios, renovaciones, encuestas y mensajería por lote.'],
        ['telegram', '✈ Telegram', 'Notificaciones internas del equipo y alertas.'],
        ['sms', '📱 SMS', 'Avisos de cobro y renovación por mensaje de texto.']
      ]],
      ['Ecosistema Google', [
        ['drive', '📁 Google Drive', 'Expedientes y documentos por cliente y aseguradora.'],
        ['gcalendar', '📆 Google Calendar', 'Cronograma, citas y vencimientos sincronizados.'],
        ['gsheets', '📊 Google Sheets', 'Importación/exportación de datos y reportes.'],
        ['gdocs', '📝 Google Docs', 'Plantillas y documentos generados.'],
        ['gmeet', '🎥 Google Meet', 'Asesorías y reuniones agendadas desde el CRM.'],
        ['gcontacts', '👤 Google Contacts', 'Sincroniza la libreta de contactos.'],
        ['gforms', '🧾 Google Forms', 'Formularios de captación → leads.'],
        ['looker', '📈 Looker Studio', 'Dashboards externos sobre los datos del CRM.']
      ]],
      ['Inteligencia artificial', [
        ['ia', '✨ Gemini (Google IA)', 'Extracción de documentos, análisis crítico, comparativos y redacción. Económica — recomendada como base.'],
        ['openai', '🤖 ChatGPT / OpenAI', 'Generación de contenido y asistentes.'],
        ['claude', '🧠 Claude (Anthropic)', 'Análisis de documentos largos y redacción.'],
        ['notebooklm', '📓 NotebookLM', 'Base de conocimiento por aseguradora (productos, procesos) para consulta y Academia.'],
        ['perplexity', '🔎 Perplexity', 'Investigación y respuestas con fuentes.']
      ]],
      ['Contenido y diseño', [
        ['canva', '🎨 Canva', 'Piezas y plantillas de diseño para campañas y Academia.'],
        ['gamma', '📑 Gamma', 'Presentaciones y material comercial.'],
        ['heygen', '🎬 HeyGen', 'Videos con avatar para capacitación y marketing.'],
        ['adobe', '🅰 Adobe Express', 'Edición rápida de piezas gráficas.'],
        ['capcut', '🎞 CapCut', 'Edición de video para redes.']
      ]],
      ['Redes y marketing', [
        ['metricool', '📅 Metricool', 'Programa, publica y mide redes y pauta desde un solo lugar.'],
        ['meta', '📘 Facebook / Instagram (Meta)', 'Publicación, mensajes y captación de leads.'],
        ['linkedin', '💼 LinkedIn', 'Publicación corporativa y captación B2B.'],
        ['tiktok', '🎵 TikTok', 'Publicación y captación de audiencia.'],
        ['youtube', '▶ YouTube', 'Canal de video y contenidos.'],
        ['web', '🌐 Página web de la empresa', 'Formularios web → leads; contenidos publicados al sitio.'],
        ['mailchimp', '📧 Mailchimp', 'Campañas de correo masivo y segmentación.']
      ]],
      ['Automatización y productividad', [
        ['make', '🔗 Make (Integromat)', 'Orquesta automatizaciones entre módulos y servicios (genera → publica).'],
        ['zapier', '⚡ Zapier', 'Automatizaciones con miles de apps.'],
        ['n8n', '🔁 n8n', 'Automatización self-hosted y flujos a medida.'],
        ['notion', '🗒 Notion', 'Base de conocimiento, procesos y wikis del equipo.'],
        ['slack', '💬 Slack', 'Alertas y colaboración del equipo.'],
        ['teams', '👔 Microsoft Teams', 'Colaboración y reuniones.'],
        ['trello', '📋 Trello', 'Tableros de tareas conectados a Ops/Leads.']
      ]],
      ['Datos y facturación', [
        ['onedrive', '☁ OneDrive / Excel', 'Documentos y hojas de Microsoft.'],
        ['fel_gt', '🧾 FEL Guatemala (SAT)', 'Facturación electrónica en línea (GT).'],
        ['dian_co', '🧾 Facturación DIAN (CO)', 'Facturación electrónica (CO).'],
        ['openbank', '🏦 Banca / Open Banking', 'Importar movimientos y conciliar estados de cuenta.']
      ]]
    ];
    return `${sectionHead('Integraciones y add-ons', 'Conecta todo tu ecosistema — activables por plan')}
      ${lock ? `<div class="cfg-lock">🔒 Add-ons disponibles desde el plan Profesional.</div>` : ''}
      ${CATS.map(([cat, items]) => `
        <div class="cfg-intgroup"><div class="cfg-intgroup-h">${cat}</div>
        <div class="cfg-grid2">
          ${items.map(([id, t2, d]) => { const on = !!t.addons[id]; return `<div class="cfg-addon ${on ? 'on' : ''}">
            <div style="flex:1"><b>${t2}</b><p>${d}</p></div>
            ${toggle('addon-' + id, on)}
          </div>`; }).join('')}
        </div></div>`).join('')}
      <div class="cfg-note" style="margin-top:14px">⚡ Receta de <b>generación y publicación de contenido</b>: <b>IA (Gemini/Claude)</b> redacta → <b>Canva/Gamma/HeyGen</b> crean las piezas → <b>Metricool</b> programa, publica y mide en redes → <b>Make/Zapier</b> orquestan el flujo disparado por eventos de Orbit. <b>NotebookLM</b> alimenta el conocimiento por aseguradora (productos/procesos) para Academia, Cotizador y la IA del sistema.</div>`;
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
            <td style="text-align:right"><button class="btn ghost sm" ${lock ? 'disabled' : ''} onclick="Orbit.modules.configuracion.configIntegracion('${U.esc(r[0])}')">Configurar</button></td>
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
          <td style="text-align:right"><button class="btn ghost sm" onclick="Orbit.modules.configuracion.editarPlan('${p.id}')">Editar</button></td>itar</button></td>
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
    const logo = (t.branding && t.branding.logo) || (function () { try { return localStorage.getItem('orbit360_logo'); } catch (e) { return ''; } })();
    const tieneMarca = !!(t.empresa && t.empresa !== 'Tu marca') || !!logo;
    const cn = document.querySelector('.tb-logo .cn');
    if (cn) { cn.innerHTML = (t.empresa && t.empresa !== 'Tu marca' ? U.esc(t.empresa) : 'Tu marca') + '<small>' + (tieneMarca ? 'Cliente' : 'White-label') + '</small>'; }
    // logo en el slot del topbar
    const slot = document.getElementById('client-logo');
    if (slot) { if (logo) { slot.innerHTML = '<img src="' + logo + '" style="width:100%;height:100%;object-fit:contain">'; slot.style.borderStyle = 'solid'; } else { slot.textContent = '🏢'; slot.style.borderStyle = 'dashed'; } }
    // logo en el login (slot inferior)
    const lgSlot = document.querySelector('.lf-logoslot .slot');
    if (lgSlot) { if (logo) { lgSlot.innerHTML = '<img src="' + logo + '" style="width:100%;height:100%;object-fit:contain">'; lgSlot.style.borderStyle = 'solid'; } }
    // nombre de empresa en el login
    const lgName = document.querySelector('.lf-logoslot .lf-cn');
    if (lgName && t.empresa && t.empresa !== 'Tu marca') lgName.textContent = t.empresa;
  }
  // exponer para que el shell lo invoque al cargar
  Orbit.applyBrand = applyBrandToTopbar;

  function editarPlan(id) {
    const base = Object.values(Orbit.PLANES).concat(loadCustomPlans());
    const p = base.find(x => x.id === id); if (!p) return;
    let back = document.getElementById('cf-plan-ed'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'cf-plan-ed'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 96;
    back.innerHTML = '<div class="card" style="width:min(460px,94vw);padding:0">'
      + '<div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display);font-size:16px">⭐ Editar plan</b><button class="imp-x" id="pe-x">✕</button></div>'
      + '<div style="padding:18px 20px;display:grid;gap:11px">'
      + '<label class="ce-l">Nombre<input id="pe-nombre" class="o-sel" value="' + U.esc(p.nombre) + '"></label>'
      + '<label class="ce-l">Precio / mes (opcional)<input id="pe-precio" class="o-sel" value="' + U.esc(p.precio || '') + '" placeholder="Ej. $99 / mes"></label>'
      + '<label class="ce-l">Descripción<textarea id="pe-desc" class="o-sel" style="min-height:54px">' + U.esc(p.desc || '') + '</textarea></label>'
      + '<label class="ce-l ck"><input type="checkbox" id="pe-marca" ' + (p.personalizacion ? 'checked' : '') + '> Marca configurable (white-label)</label>'
      + '<label class="ce-l ck"><input type="checkbox" id="pe-addons" ' + (p.addons ? 'checked' : '') + '> Add-ons / integraciones</label>'
      + '<label class="ce-l ck"><input type="checkbox" id="pe-apis" ' + (p.apis ? 'checked' : '') + '> APIs y auto-branding IA</label>'
      + '</div>'
      + '<div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" id="pe-cancel">Cancelar</button><button class="btn primary" id="pe-ok">Guardar</button></div>'
      + '</div>';
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#pe-x').onclick = close; back.querySelector('#pe-cancel').onclick = close;
    back.querySelector('#pe-ok').onclick = () => {
      const patch = { nombre: back.querySelector('#pe-nombre').value || p.nombre, precio: back.querySelector('#pe-precio').value, desc: back.querySelector('#pe-desc').value, personalizacion: back.querySelector('#pe-marca').checked, addons: back.querySelector('#pe-addons').checked, apis: back.querySelector('#pe-apis').checked };
      if (p.custom) { const cp = loadCustomPlans().map(x => x.id === id ? Object.assign({}, x, patch) : x); saveCustomPlans(cp); }
      else { Object.assign(Orbit.PLANES[id], patch); } // override en memoria (persistible en backend)
      close(); const host = document.getElementById('host'); if (host) paint(host);
      const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = '✓ Plan actualizado'; document.body.appendChild(t); setTimeout(() => t.remove(), 2400);
    };
  }

  function subirManualMarca() {
    const fi = document.createElement('input'); fi.type = 'file'; fi.accept = '.pdf,.txt,.docx,image/*';
    fi.onchange = () => {
      const f = fi.files[0]; if (!f) return;
      const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = '🧠 Analizando manual de marca con IA…'; document.body.appendChild(t);
      const finish = (sugerencia) => {
        t.remove();
        let back = document.getElementById('cf-brand-ai'); if (back) back.remove();
        back = document.createElement('div'); back.id = 'cf-brand-ai'; back.className = 'drawer-back open'; back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 96;
        back.innerHTML = '<div class="card" style="width:min(440px,94vw);padding:0">'
          + '<div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display);font-size:16px">🎨 Auto-branding por IA</b><button class="imp-x" id="ba-x">✕</button></div>'
          + '<div style="padding:18px 20px">' + sugerencia + '</div>'
          + '<div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;justify-content:flex-end;gap:8px"><button class="btn ghost" id="ba-close">Cerrar</button><button class="btn primary" onclick="Orbit.theme.picker(this)">🎨 Elegir paleta</button></div></div>';
        document.body.appendChild(back);
        back.addEventListener('click', e => { if (e.target === back) back.remove(); });
        back.querySelector('#ba-x').onclick = () => back.remove(); back.querySelector('#ba-close').onclick = () => back.remove();
      };
      const fallback = '<p style="font-size:13.5px;line-height:1.6">Manual <b>' + (f.name) + '</b> recibido. Sugerencia: usá la <b>paleta corporativa</b> de tu manual como acento, tipografía display tipo <b>Manrope/serif institucional</b>, y mantené el grafito para el chrome. Aplicá la paleta abajo.</p>';
      if (window.claude && window.claude.complete && /\.(txt|md)$/i.test(f.name)) {
        const r = new FileReader();
        r.onload = async () => {
          try { const out = await window.claude.complete({ messages: [{ role: 'user', content: 'Eres diseñador de marca. De este manual de identidad sugiere en 3-4 líneas: color primario (hex aproximado), tipografía y tono visual para una plataforma de seguros. Manual:\n' + String(r.result).slice(0, 4000) }] }); finish('<p style="font-size:13.5px;line-height:1.6">' + Orbit.ui.esc(String(out)) + '</p>'); }
          catch (e) { finish(fallback); }
        };
        r.readAsText(f);
      } else { setTimeout(() => finish(fallback), 900); }
    };
    fi.click();
  }

  function agregarPais() {
    const nombre = prompt('Nombre del país:'); if (!nombre) return;
    const code = (prompt('Código de 2 letras (ej. MX, PA, CR):', '') || '').toUpperCase().slice(0, 2); if (!code) return;
    const iva = +prompt('IVA / impuesto de seguros (%) para ' + nombre + ':', '12') || 0;
    const moneda = prompt('Moneda (ej. MXN, USD, PAB):', 'USD') || 'USD';
    const gem = +prompt('Gastos de emisión por defecto (% sobre prima neta):', '0') || 0;
    try {
      const KEY = 'orbit360_paises';
      const arr = JSON.parse(localStorage.getItem(KEY) || '[]');
      arr.push({ code, nombre, iva, moneda, gastosEmisionPct: gem });
      localStorage.setItem(KEY, JSON.stringify(arr));
      if (Orbit.primas && Orbit.primas.registrarPais) Orbit.primas.registrarPais(code, { iva, moneda, gastosEmisionPct: gem });
    } catch (e) {}
    const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = '✓ País ' + nombre + ' agregado (IVA ' + iva + '%)'; document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
    const host = document.getElementById('host'); if (host) render(host);
  }
  function configIntegracion(nombre) {
    let back = document.getElementById('cf-integ'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'cf-integ'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 96;
    const saved = (() => { try { return JSON.parse(localStorage.getItem('orbit360_integ_' + nombre) || '{}'); } catch (e) { return {}; } })();
    back.innerHTML = '<div class="card" style="width:min(460px,94vw);padding:0">'
      + '<div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display);font-size:16px">🔌 Configurar ' + U.esc(nombre) + '</b><button class="imp-x" id="ci-x">✕</button></div>'
      + '<div style="padding:18px 20px;display:grid;gap:11px">'
      + '<label class="ce-l">API key / Token<input id="ci-key" class="o-sel" type="password" value="' + U.esc(saved.key || '') + '" placeholder="••••••••"></label>'
      + '<label class="ce-l">Webhook / Endpoint (opcional)<input id="ci-url" class="o-sel" value="' + U.esc(saved.url || '') + '" placeholder="https://hook.make.com/..."></label>'
      + '<label class="ce-l">Cuenta / usuario (opcional)<input id="ci-user" class="o-sel" value="' + U.esc(saved.user || '') + '"></label>'
      + '<label class="ce-l ck"><input type="checkbox" id="ci-on" ' + (saved.activa ? 'checked' : '') + '> Integración activa</label>'
      + '<div class="cfg-note">🔒 Las credenciales se guardan cifradas en el backend del cliente. En el prototipo quedan en este navegador.</div>'
      + '</div>'
      + '<div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" id="ci-cancel">Cancelar</button><button class="btn primary" id="ci-ok">Guardar</button></div></div>';
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#ci-x').onclick = close; back.querySelector('#ci-cancel').onclick = close;
    back.querySelector('#ci-ok').onclick = () => {
      const data = { key: back.querySelector('#ci-key').value, url: back.querySelector('#ci-url').value, user: back.querySelector('#ci-user').value, activa: back.querySelector('#ci-on').checked };
      try { localStorage.setItem('orbit360_integ_' + nombre, JSON.stringify(data)); } catch (e) {}
      close(); const host = document.getElementById('host'); if (host) render(host);
      const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = '✓ ' + nombre + (data.activa ? ' conectada' : ' guardada'); document.body.appendChild(t); setTimeout(() => t.remove(), 2400);
    };
  }

  return { render, editarPlan, subirManualMarca, agregarPais, configIntegracion };
})();
