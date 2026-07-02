/* ============================================================
   Orbit 360 Â· ConfiguraciÃ³n  â€” BETA (nÃºcleo de personalizaciÃ³n)
   Dos niveles:
   Â· Self-service del cliente (segÃºn plan): marca, usuarios/roles,
     paÃ­ses/monedas, add-ons, APIs, portal.
   Â· Interna (nuestra): mÃ³dulos activos por cliente, plan, white-label.
   Fuente de verdad: Orbit.tenant. El sidebar lee modulosActivos.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.configuracion = (function () {
  const U = Orbit.ui, K = Orbit.kit, T = () => Orbit.tenant;
  let tab = 'marca';

  const TABS = [
    ['marca', 'ðŸŽ¨ Marca', 'cli'],
    ['usuarios', 'ðŸ‘¥ Usuarios y permisos', 'cli'],
    ['paises', 'ðŸŒŽ PaÃ­ses y monedas', 'cli'],
    ['addons', 'ðŸ§© Integraciones', 'cli'],
    ['apis', 'ðŸ”Œ APIs', 'cli'],
    ['planes', 'â­ Plan', 'cli'],
    ['interna', 'ðŸ”’ Interno (Orbit)', 'int']
  ];

  function render(host) {
    host.innerHTML = `<div class="page">
      ${K.banner({ icon: 'âš™', title: 'ConfiguraciÃ³n', sub: 'PersonalizaciÃ³n sin cÃ³digo', features: ['White-label', 'Roles y permisos', 'MÃ³dulos por cliente'], actions: '' })}
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
    return `${sectionHead('Marca y apariencia', 'Logo, paleta y menÃº â€” white-label')}
      ${lock ? `<div class="cfg-lock">ðŸ”’ El plan <b>${plan.nombre}</b> usa plantillas estÃ¡ndar. La personalizaciÃ³n de marca estÃ¡ disponible en planes Profesional y Personalizado.</div>` : ''}
      ${row('Nombre de la empresa', `<input class="o-sel" id="cf-empresa" value="${U.esc(t.empresa)}" ${lock ? 'disabled' : ''} style="min-width:240px">`)}
      ${row('Logo del cliente', `<div style="display:flex;align-items:center;gap:10px"><span class="cfg-logo">${t.branding.logo ? `<img src="${U.esc(t.branding.logo)}">` : 'ðŸ¢'}</span><button class="btn ghost sm" ${lock ? 'disabled' : ''} onclick="(function(){var fi=document.createElement('input');fi.type='file';fi.accept='image/*';fi.onchange=function(){var r=new FileReader();r.onload=function(e){try{if(Orbit.store&&Orbit.store.setPref)Orbit.store.setPref('orbit360_logo',e.target.result);var b=Orbit.tenant.get().branding||{};b.logo=e.target.result;Orbit.tenant.setDeep('branding',b);}catch(x){}if(Orbit.applyBrand)Orbit.applyBrand();var img=document.getElementById('cfg-logo-prev');if(img){img.src=e.target.result;img.style.display='inline-block';}var t=document.createElement('div');t.className='ciclo-toast';t.textContent='\u2713 Logo aplicado en cintilla y login';document.body.appendChild(t);setTimeout(function(){t.remove();},2600);};r.readAsDataURL(fi.files[0]);};fi.click();})()">Subir logo</button><button class="btn ghost sm" ${lock ? 'disabled' : ''} onclick="(function(){try{if(Orbit.store&&Orbit.store.setPref)Orbit.store.setPref('orbit360_logo','');var b=Orbit.tenant.get().branding||{};b.logo='';Orbit.tenant.setDeep('branding',b);}catch(x){}if(Orbit.applyBrand)Orbit.applyBrand();})()">Quitar</button><img id="cfg-logo-prev" style="height:36px;border-radius:6px;margin-left:8px;vertical-align:middle;display:none"></div>`, 'Se refleja en la cintilla y el login. Sube el logo del cliente para white-label.')}
      ${row('Paleta de marca', `<button class="btn ghost sm" ${lock ? 'disabled' : ''} onclick="Orbit.theme.picker(this)">ðŸŽ¨ Elegir paleta</button>`, 'Cambia el acento en toda la plataforma')}
      ${row('MenÃº lateral', `<div class="cfg-seg" id="cf-sb">${['oscuro', 'claro'].map(m => `<button data-sb="${m}" class="${Orbit.theme.getSidebar() === m ? 'on' : ''}" ${lock ? 'disabled' : ''}>${m === 'oscuro' ? 'Oscuro' : 'Claro'}</button>`).join('')}</div>`)}
      ${row('Auto-branding por IA', `<button class="btn ghost sm" ${lock ? 'disabled' : ''} onclick="Orbit.modules.configuracion.subirManualMarca()">ðŸ“„ Subir manual de marca</button>`, 'La IA lee tu manual y propone tipografÃ­a y colores corporativos (plan Personalizado)')}
      ${row('Ocultar etiquetas tÃ©cnicas', toggle('hideTechnicalBadges', !!t.hideTechnicalBadges), 'Oculta los distintivos NÃšCLEO/BETA/PRÃ“X. del menÃº para el modo cliente/implementaciÃ³n')}`;
  }

  /* ---------- USUARIOS Y PERMISOS ---------- */
  function usuarios() {
    const roles = Orbit.ROLES;
    const team = Orbit.store.all('asesores');
    return `${sectionHead('Usuarios y permisos', 'Roles por mÃ³dulo, metas y visibilidad')}
      <div class="card" style="overflow:hidden;margin-bottom:16px"><table class="tbl">
        <thead><tr><th>Usuario</th><th>Rol</th><th>ComisiÃ³n</th><th>Meta prima</th><th></th></tr></thead>
        <tbody>${team.map(a => `<tr>
          <td><div style="display:flex;align-items:center;gap:9px">${U.avatar(a.nombre, a.color, 'sm')}<b>${U.esc(a.nombre)}</b></div></td>
          <td><select class="o-sel" data-role="${a.id}">${Object.keys(roles).map(r => `<option ${a.rol === r || (a.rol && a.rol.includes(r)) ? 'selected' : ''}>${r}</option>`).join('')}</select></td>
          <td>${a.comTipo ? `<span class="badge ${a.comTipo === 'variable' ? 'info' : 'neutral'}">${a.comTipo} Â· ${a.comPct}%</span>` : 'â€”'}</td>
          <td class="num">${U.money(a.metaPrima, 'GTQ')}</td>
          <td style="text-align:right"><button class="btn ghost sm" onclick="Orbit.modules.equipo.editar('${a.id}')">Permisos</button></td>
        </tr>`).join('')}</tbody>
      </table></div>
      <div class="cfg-grid2">
        ${Object.entries(roles).map(([r, d]) => `<div class="cfg-rolecard"><b>${r}</b><span class="cfg-nivel">Nivel ${d.nivel}</span><p>${d.desc}</p></div>`).join('')}
      </div>
      <button class="btn primary" style="margin-top:14px" onclick="Orbit.modules.equipo.editar(null)">+ Invitar usuario</button>`;
  }

  /* ---------- PAÃSES Y MONEDAS ---------- */
  function paises() {
    const t = T().get();
    const all = (Orbit.PAISES || []).filter(p => p.id !== 'TODOS');
    return `${sectionHead('PaÃ­ses y monedas', 'OperaciÃ³n multipaÃ­s â€” cada paÃ­s con su moneda, sin mezclar')}
      <div class="cfg-grid2">
        ${all.map(p => {
          const on = t.paises.includes(p.id);
          return `<div class="cfg-paiscard ${on ? 'on' : ''}">
            <div style="display:flex;align-items:center;gap:10px">
              <span style="font-size:22px">${p.id === 'GT' ? 'ðŸ‡¬ðŸ‡¹' : p.id === 'CO' ? 'ðŸ‡¨ðŸ‡´' : 'ðŸŒŽ'}</span>
              <div><b>${p.label}</b><div class="muted" style="font-size:12px">Moneda: ${p.moneda || 'â€”'}</div></div>
              ${toggle('pais-' + p.id, on)}
            </div></div>`;
        }).join('')}
      </div>
      <div class="cfg-note" style="margin-top:14px">ðŸ’± Las monedas <b>no se mezclan</b> entre paÃ­ses en ninguna secciÃ³n: los totales se muestran por paÃ­s o se normalizan explÃ­citamente. Moneda base de reportes: <b>${t.monedaBase}</b>.</div>
      <button class="btn ghost" style="margin-top:14px" onclick="Orbit.modules.configuracion.agregarPais()">+ Agregar paÃ­s</button>`;
  }

  /* ---------- INTEGRACIONES / ADD-ONS ---------- */
  function addons() {
    const t = T().get(), plan = Orbit.PLANES[t.plan];
    const lock = !plan.addons;
    // CatÃ¡logo amplio por categorÃ­as (ecosistema completo). on = estado guardado en tenant.addons[id]
    const CATS = [
      ['Correo y comunicaciÃ³n', [
        ['correo', 'âœ‰ Correo (Outlook / Microsoft 365)', 'Bandeja integrada; vincula correos a clientes, pÃ³lizas, gestiones y aseguradoras.'],
        ['imap', 'ðŸ“¨ IMAP / POP3 (dominio propio)', 'Conecta cualquier proveedor o correo corporativo con dominio propio.'],
        ['gmail', 'ðŸ“© Gmail / Google Workspace', 'Sincroniza correos y contactos de Google.'],
        ['whatsapp', 'ðŸ’¬ WhatsApp Business (API + Web)', 'Recordatorios, renovaciones, encuestas y mensajerÃ­a por lote.'],
        ['telegram', 'âœˆ Telegram', 'Notificaciones internas del equipo y alertas.'],
        ['sms', 'ðŸ“± SMS', 'Avisos de cobro y renovaciÃ³n por mensaje de texto.']
      ]],
      ['Ecosistema Google', [
        ['drive', 'ðŸ“ Google Drive', 'Expedientes y documentos por cliente y aseguradora.'],
        ['gcalendar', 'ðŸ“† Google Calendar', 'Cronograma, citas y vencimientos sincronizados.'],
        ['gsheets', 'ðŸ“Š Google Sheets', 'ImportaciÃ³n/exportaciÃ³n de datos y reportes.'],
        ['gdocs', 'ðŸ“ Google Docs', 'Plantillas y documentos generados.'],
        ['gmeet', 'ðŸŽ¥ Google Meet', 'AsesorÃ­as y reuniones agendadas desde el CRM.'],
        ['gcontacts', 'ðŸ‘¤ Google Contacts', 'Sincroniza la libreta de contactos.'],
        ['gforms', 'ðŸ§¾ Google Forms', 'Formularios de captaciÃ³n â†’ leads.'],
        ['looker', 'ðŸ“ˆ Looker Studio', 'Dashboards externos sobre los datos del CRM.']
      ]],
      ['Inteligencia artificial', [
        ['ia', 'âœ¨ Gemini (Google IA)', 'ExtracciÃ³n de documentos, anÃ¡lisis crÃ­tico, comparativos y redacciÃ³n. EconÃ³mica â€” recomendada como base.'],
        ['openai', 'ðŸ¤– ChatGPT / OpenAI', 'GeneraciÃ³n de contenido y asistentes.'],
        ['claude', 'ðŸ§  Claude (Anthropic)', 'AnÃ¡lisis de documentos largos y redacciÃ³n.'],
        ['notebooklm', 'ðŸ““ NotebookLM', 'Base de conocimiento por aseguradora (productos, procesos) para consulta y Academia.'],
        ['perplexity', 'ðŸ”Ž Perplexity', 'InvestigaciÃ³n y respuestas con fuentes.']
      ]],
      ['Contenido y diseÃ±o', [
        ['canva', 'ðŸŽ¨ Canva', 'Piezas y plantillas de diseÃ±o para campaÃ±as y Academia.'],
        ['gamma', 'ðŸ“‘ Gamma', 'Presentaciones y material comercial.'],
        ['heygen', 'ðŸŽ¬ HeyGen', 'Videos con avatar para capacitaciÃ³n y marketing.'],
        ['adobe', 'ðŸ…° Adobe Express', 'EdiciÃ³n rÃ¡pida de piezas grÃ¡ficas.'],
        ['capcut', 'ðŸŽž CapCut', 'EdiciÃ³n de video para redes.']
      ]],
      ['Redes y marketing', [
        ['metricool', 'ðŸ“… Metricool', 'Programa, publica y mide redes y pauta desde un solo lugar.'],
        ['meta', 'ðŸ“˜ Facebook / Instagram (Meta)', 'PublicaciÃ³n, mensajes y captaciÃ³n de leads.'],
        ['linkedin', 'ðŸ’¼ LinkedIn', 'PublicaciÃ³n corporativa y captaciÃ³n B2B.'],
        ['tiktok', 'ðŸŽµ TikTok', 'PublicaciÃ³n y captaciÃ³n de audiencia.'],
        ['youtube', 'â–¶ YouTube', 'Canal de video y contenidos.'],
        ['web', 'ðŸŒ PÃ¡gina web de la empresa', 'Formularios web â†’ leads; contenidos publicados al sitio.'],
        ['mailchimp', 'ðŸ“§ Mailchimp', 'CampaÃ±as de correo masivo y segmentaciÃ³n.']
      ]],
      ['AutomatizaciÃ³n y productividad', [
        ['make', 'ðŸ”— Make (Integromat)', 'Orquesta automatizaciones entre mÃ³dulos y servicios (genera â†’ publica).'],
        ['zapier', 'âš¡ Zapier', 'Automatizaciones con miles de apps.'],
        ['n8n', 'ðŸ” n8n', 'AutomatizaciÃ³n self-hosted y flujos a medida.'],
        ['notion', 'ðŸ—’ Notion', 'Base de conocimiento, procesos y wikis del equipo.'],
        ['slack', 'ðŸ’¬ Slack', 'Alertas y colaboraciÃ³n del equipo.'],
        ['teams', 'ðŸ‘” Microsoft Teams', 'ColaboraciÃ³n y reuniones.'],
        ['trello', 'ðŸ“‹ Trello', 'Tableros de tareas conectados a Ops/Leads.']
      ]],
      ['Datos y facturaciÃ³n', [
        ['onedrive', 'â˜ OneDrive / Excel', 'Documentos y hojas de Microsoft.'],
        ['fel_gt', 'ðŸ§¾ FEL Guatemala (SAT)', 'FacturaciÃ³n electrÃ³nica en lÃ­nea (GT).'],
        ['dian_co', 'ðŸ§¾ FacturaciÃ³n DIAN (CO)', 'FacturaciÃ³n electrÃ³nica (CO).'],
        ['openbank', 'ðŸ¦ Banca / Open Banking', 'Importar movimientos y conciliar estados de cuenta.']
      ]]
    ];
    return `${sectionHead('Integraciones y add-ons', 'Conecta todo tu ecosistema â€” activables por plan')}
      ${lock ? `<div class="cfg-lock">ðŸ”’ Add-ons disponibles desde el plan Profesional.</div>` : ''}
      ${CATS.map(([cat, items]) => `
        <div class="cfg-intgroup"><div class="cfg-intgroup-h">${cat}</div>
        <div class="cfg-grid2">
          ${items.map(([id, t2, d]) => { const on = !!t.addons[id]; const cfgd = (() => { const s = Orbit.store.pref('integ_' + id, {}) || {}; return !!s.key; })(); return `<div class="cfg-addon ${on ? 'on' : ''}">
            <div style="flex:1"><b>${t2}</b><p>${d}</p>
              <button class="btn ghost sm" style="margin-top:7px" onclick="Orbit.modules.configuracion.configIntegracion('${id}','${U.esc(t2).replace(/'/g, '')}')">âš™ Configurar${cfgd ? ' âœ“' : ''}</button>
            </div>
            ${toggle('addon-' + id, on)}
          </div>`; }).join('')}
        </div></div>`).join('')}
      <div class="cfg-note" style="margin-top:14px">âš¡ Receta de <b>generaciÃ³n y publicaciÃ³n de contenido</b>: <b>IA (Gemini/Claude)</b> redacta â†’ <b>Canva/Gamma/HeyGen</b> crean las piezas â†’ <b>Metricool</b> programa, publica y mide en redes â†’ <b>Make/Zapier</b> orquestan el flujo disparado por eventos de Orbit. <b>NotebookLM</b> alimenta el conocimiento por aseguradora (productos/procesos) para Academia, Cotizador y la IA del sistema.</div>`;
  }

  /* ---------- APIs ---------- */
  function apis() {
    const t = T().get(), plan = Orbit.PLANES[t.plan];
    const lock = !plan.apis;
    return `${sectionHead('APIs y credenciales', 'Conexiones seguras con el nivel de seguridad correcto')}
      ${lock ? `<div class="cfg-lock">ðŸ”’ GestiÃ³n de APIs disponible en el plan Personalizado.</div>` : ''}
      <div class="cfg-note" style="margin-bottom:14px">ðŸ” Las credenciales se guardan <b>cifradas</b>, con <b>scopes mÃ­nimos</b> y visibilidad por rol. Nunca se exponen en el front (demo: solo la UI de gestiÃ³n).</div>
      <div class="card" style="overflow:hidden"><table class="tbl">
        <thead><tr><th>Servicio</th><th>Estado</th><th>Scope</th><th></th></tr></thead>
        <tbody>
          ${[['WhatsApp Cloud API', 'Conectado', 'mensajerÃ­a'], ['Aseguradora â€” Cotizador', 'Pendiente', 'tarifas'], ['SIGA / CRM externo', 'No configurado', 'importaciÃ³n']].map(r => `<tr>
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
    return `${sectionHead('Plan contratado', 'Define quÃ© puede personalizar el cliente')}
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
      <div class="cfg-note" style="margin-top:14px">El plan se asigna desde la <b>configuraciÃ³n interna</b> (Orbit). El cliente ve aquÃ­ lo que su plan habilita.</div>`;
  }

  /* ---------- INTERNA (Orbit) ---------- */
  function interna() {
    const t = T().get();
    const nav = Orbit.NAV.flatMap(b => b.type === 'home' ? [{ route: b.route, label: b.label, icon: b.icon }] : b.items);
    const planes = Object.values(Orbit.PLANES).concat(loadCustomPlans());
    return `${sectionHead('ConfiguraciÃ³n interna Â· Orbit', 'Solo nuestro equipo â€” provisioning del cliente')}
      <div class="cfg-int-banner">ðŸ”’ Esta secciÃ³n NO es visible para el cliente. AquÃ­ definimos plan, white-label y los <b>mÃ³dulos activos</b> de cada cuenta.</div>

      ${sectionHead('Planes comercializables', 'ImportÃ¡ tu catÃ¡logo o creÃ¡ planes; editables por acuerdos y promociones')}
      <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
        <button class="btn ghost sm" onclick="Orbit.importa.open('clientes',{})">â¬‡ Importar catÃ¡logo de planes</button>
        <button class="btn primary sm" id="cf-plan-new">+ Crear plan</button>
      </div>
      <div class="card" style="overflow:hidden;margin-bottom:18px"><table class="tbl">
        <thead><tr><th>Plan</th><th>Marca</th><th>Add-ons</th><th>APIs</th><th>DescripciÃ³n</th><th></th></tr></thead>
        <tbody>${planes.map(p => `<tr>
          <td><b>${U.esc(p.nombre)}</b>${p.custom ? ' <span class="badge info">propio</span>' : ''}</td>
          <td>${p.personalizacion ? 'âœ“' : 'â€”'}</td>
          <td>${p.addons ? 'âœ“' : 'â€”'}</td>
          <td>${p.apis ? 'âœ“' : 'â€”'}</td>
          <td class="muted" style="font-size:12.5px">${U.esc(p.desc)}</td>
          <td style="text-align:right"><button class="btn ghost sm" onclick="Orbit.modules.configuracion.editarPlan('${p.id}')">Editar</button></td>itar</button></td>
        </tr>`).join('')}</tbody>
      </table></div>
      <div class="cfg-note" style="margin-bottom:18px">ðŸ’¡ Al asignar un plan al cliente se configuran de una vez sus funcionalidades; podÃ©s <b>modificar mÃ¡s o menos segÃºn acuerdos o promociones</b> sin cambiar el catÃ¡logo base.</div>

      ${row('Plan del cliente', `<select class="o-sel" id="cf-plan">${planes.map(p => `<option value="${p.id}" ${t.plan === p.id ? 'selected' : ''}>${p.nombre}</option>`).join('')}</select>`, 'Cambia lo que el cliente puede personalizar')}
      ${sectionHead('MÃ³dulos activos por cliente', 'Enciende/apaga mÃ³dulos de esta cuenta â€” el menÃº se ajusta solo')}
      <div class="cfg-mods">
        ${nav.map(it => {
          const on = t.modulosActivos.includes(it.route);
          return `<label class="cfg-mod ${on ? 'on' : ''}"><input type="checkbox" data-mod="${it.route}" ${on ? 'checked' : ''}><span class="cfg-mod-ico">${it.icon}</span><span>${U.esc(it.label)}</span></label>`;
        }).join('')}
      </div>
      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn primary" id="cf-mods-save">Guardar mÃ³dulos activos</button>
        <button class="btn ghost" id="cf-reset" onclick="Orbit.ui.confirm('Â¿Restablecer configuraciÃ³n del cliente a valores por defecto?',{title:'Restablecer configuraciÃ³n',ok:'Restablecer'}).then(function(ok){if(ok){Orbit.tenant.reset();location.reload();}})">Restablecer</button>
      </div>`;
  }
  // planes propios (importados/creados), persistentes
  const PKEY = 'orbit360_planes';
  function loadCustomPlans() { return Orbit.store.pref('planes', []) || []; }
  function saveCustomPlans(d) { Orbit.store.setPref('planes', d); }

  /* ---------- wiring ---------- */
  function wire(host) {
    // toggles genÃ©ricos
    host.querySelectorAll('[data-tog]').forEach(b => b.addEventListener('click', () => {
      const key = b.dataset.tog, t = T().get();
      if (key.startsWith('pais-')) { const id = key.slice(5); const arr = new Set(t.paises); arr.has(id) ? arr.delete(id) : arr.add(id); T().setDeep('paises', [...arr]); }
      else if (key.startsWith('addon-')) { const id = key.slice(6); const a = Object.assign({}, t.addons); a[id] = !a[id]; T().setDeep('addons', a); }
      else { T().setDeep(key, !t[key]); if (key === 'hideTechnicalBadges' && Orbit.router && Orbit.router.rebuildSidebar) Orbit.router.rebuildSidebar(); }
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
    if (np) np.addEventListener('click', async () => {
      const nombre = await Orbit.ui.prompt('Nombre del nuevo plan comercializable:', { title: 'Nuevo plan' }); if (!nombre) return;
      const cp = loadCustomPlans();
      const id = 'plan-' + Date.now();
      cp.push({ id, nombre, personalizacion: await Orbit.ui.confirm('Â¿Incluye personalizaciÃ³n de marca?', { title: 'PersonalizaciÃ³n de marca', danger: false }), addons: await Orbit.ui.confirm('Â¿Incluye add-ons / integraciones?', { title: 'Add-ons e integraciones', danger: false }), apis: await Orbit.ui.confirm('Â¿Incluye APIs y auto-branding?', { title: 'APIs y auto-branding', danger: false }), desc: 'Plan propio â€” editable por acuerdos comerciales.', custom: true });
      saveCustomPlans(cp);
      paint(host);
    });
    // mÃ³dulos activos
    const save = document.getElementById('cf-mods-save');
    if (save) save.addEventListener('click', () => {
      const mods = [...host.querySelectorAll('[data-mod]:checked')].map(i => i.dataset.mod);
      if (!mods.includes('configuracion')) mods.push('configuracion'); // nunca apagar config
      T().setDeep('modulosActivos', mods);
      if (Orbit.router && Orbit.router.rebuildSidebar) Orbit.router.rebuildSidebar();
      Orbit.ui.toast('MÃ³dulos actualizados. El menÃº lateral se ajustÃ³ a esta cuenta.');
    });
    host.querySelectorAll('.cfg-mod input').forEach(i => i.addEventListener('change', () => i.closest('.cfg-mod').classList.toggle('on', i.checked)));
  }
  function applyBrandToTopbar() {
    const t = T().get();
    const logo = (t.branding && t.branding.logo) || Orbit.store.pref('logo', '') || '';
    const tieneMarca = !!(t.empresa && t.empresa !== 'Tu marca') || !!logo;
    const cn = document.querySelector('.tb-logo .cn');
    if (cn) { cn.innerHTML = (t.empresa && t.empresa !== 'Tu marca' ? U.esc(t.empresa) : 'Tu marca') + '<small>' + (tieneMarca ? 'Cliente' : 'White-label') + '</small>'; }
    // logo en el slot del topbar
    const slot = document.getElementById('client-logo');
    if (slot) { if (logo) { slot.innerHTML = '<img src="' + logo + '" style="width:100%;height:100%;object-fit:contain">'; slot.style.border = 'none'; } else { slot.textContent = 'ðŸ¢'; slot.style.borderStyle = 'dashed'; } }
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
      + '<div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display);font-size:16px">â­ Editar plan</b><button class="imp-x" id="pe-x">âœ•</button></div>'
      + '<div style="padding:18px 20px;display:grid;gap:11px">'
      + '<label class="ce-l">Nombre<input id="pe-nombre" class="o-sel" value="' + U.esc(p.nombre) + '"></label>'
      + '<label class="ce-l">Precio / mes (opcional)<input id="pe-precio" class="o-sel" value="' + U.esc(p.precio || '') + '" placeholder="Ej. $99 / mes"></label>'
      + '<label class="ce-l">DescripciÃ³n<textarea id="pe-desc" class="o-sel" style="min-height:54px">' + U.esc(p.desc || '') + '</textarea></label>'
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
      const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = 'âœ“ Plan actualizado'; document.body.appendChild(t); setTimeout(() => t.remove(), 2400);
    };
  }

  function subirManualMarca() {
    const fi = document.createElement('input'); fi.type = 'file'; fi.accept = '.pdf,.txt,.docx,image/*';
    fi.onchange = () => {
      const f = fi.files[0]; if (!f) return;
      const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = 'ðŸ§  Analizando manual de marca con IAâ€¦'; document.body.appendChild(t);
      const finish = (sugerencia) => {
        t.remove();
        let back = document.getElementById('cf-brand-ai'); if (back) back.remove();
        back = document.createElement('div'); back.id = 'cf-brand-ai'; back.className = 'drawer-back open'; back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 96;
        back.innerHTML = '<div class="card" style="width:min(440px,94vw);padding:0">'
          + '<div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display);font-size:16px">ðŸŽ¨ Auto-branding por IA</b><button class="imp-x" id="ba-x">âœ•</button></div>'
          + '<div style="padding:18px 20px">' + sugerencia + '</div>'
          + '<div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;justify-content:flex-end;gap:8px"><button class="btn ghost" id="ba-close">Cerrar</button><button class="btn primary" onclick="Orbit.theme.picker(this)">ðŸŽ¨ Elegir paleta</button></div></div>';
        document.body.appendChild(back);
        back.addEventListener('click', e => { if (e.target === back) back.remove(); });
        back.querySelector('#ba-x').onclick = () => back.remove(); back.querySelector('#ba-close').onclick = () => back.remove();
      };
      const fallback = '<p style="font-size:13.5px;line-height:1.6">Manual <b>' + (f.name) + '</b> recibido. Sugerencia: usÃ¡ la <b>paleta corporativa</b> de tu manual como acento, tipografÃ­a display tipo <b>Manrope/serif institucional</b>, y mantenÃ© el grafito para el chrome. AplicÃ¡ la paleta abajo.</p>';
      if (window.claude && window.claude.complete && /\.(txt|md)$/i.test(f.name)) {
        const r = new FileReader();
        r.onload = async () => {
          try { const out = await window.claude.complete({ messages: [{ role: 'user', content: 'Eres diseÃ±ador de marca. De este manual de identidad sugiere en 3-4 lÃ­neas: color primario (hex aproximado), tipografÃ­a y tono visual para una plataforma de seguros. Manual:\n' + String(r.result).slice(0, 4000) }] }); finish('<p style="font-size:13.5px;line-height:1.6">' + Orbit.ui.esc(String(out)) + '</p>'); }
          catch (e) { finish(fallback); }
        };
        r.readAsText(f);
      } else { setTimeout(() => finish(fallback), 900); }
    };
    fi.click();
  }

  function agregarPais() {
    let back = document.getElementById('cf-pais'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'cf-pais'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 97;
    back.innerHTML = `<div class="card" style="width:min(480px,94vw);padding:0">
      <div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display);font-size:16px">ðŸŒŽ Agregar paÃ­s</b><button class="imp-x" id="cp-x">âœ•</button></div>
      <div style="padding:18px 20px;display:grid;gap:12px">
        <div class="cgrid"><label class="ce-l">Nombre del paÃ­s<input id="cp-nombre" class="o-sel" placeholder="MÃ©xico"></label><label class="ce-l">CÃ³digo (2 letras)<input id="cp-code" class="o-sel" maxlength="2" placeholder="MX" style="text-transform:uppercase"></label></div>
        <div class="cgrid"><label class="ce-l">IVA / impuesto seguros (%)<input id="cp-iva" class="o-sel" type="number" value="12"></label><label class="ce-l">Moneda<input id="cp-moneda" class="o-sel" placeholder="MXN" value="USD"></label></div>
        <label class="ce-l">Gastos de emisiÃ³n por defecto (% sobre prima neta)<input id="cp-gem" class="o-sel" type="number" value="0"></label>
        <div class="cfg-note">Tasas e impuestos configurables por paÃ­s. Al crear se registran en el motor de primas (Orbit.primas) y quedan disponibles para pÃ³lizas y cotizaciones.</div>
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" id="cp-cancel">Cancelar</button><button class="btn primary" id="cp-ok">Agregar paÃ­s</button></div>
    </div>`;
    document.body.appendChild(back);
    const $ = s => back.querySelector(s); const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    $('#cp-x').addEventListener('click', close); $('#cp-cancel').addEventListener('click', close);
    $('#cp-ok').addEventListener('click', () => {
      const nombre = ($('#cp-nombre').value || '').trim(); if (!nombre) { Orbit.ui.toast('Escribe el nombre del paÃ­s'); return; }
      const code = ($('#cp-code').value || '').toUpperCase().slice(0, 2); if (!code) { Orbit.ui.toast('Escribe el cÃ³digo de 2 letras'); return; }
      const iva = +$('#cp-iva').value || 0, moneda = ($('#cp-moneda').value || 'USD').toUpperCase(), gem = +$('#cp-gem').value || 0;
      try {
        const arr = Orbit.store.pref('paises', []) || [];
        arr.push({ code, nombre, iva, moneda, gastosEmisionPct: gem });
        Orbit.store.setPref('paises', arr);
        if (Orbit.primas && Orbit.primas.registrarPais) Orbit.primas.registrarPais(code, { iva, moneda, gastosEmisionPct: gem });
      } catch (e) {}
      close();
      Orbit.ui.toast('âœ“ PaÃ­s ' + nombre + ' agregado (IVA ' + iva + '%)');
      const host = document.getElementById('host'); if (host) render(host);
    });
  }
  function configIntegracion(nombre, titulo) {
    const label = titulo || nombre;
    let back = document.getElementById('cf-integ'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'cf-integ'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 96;
    const saved = Orbit.store.pref('integ_' + nombre, {}) || {};
    back.innerHTML = '<div class="card" style="width:min(460px,94vw);padding:0">'
      + '<div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display);font-size:16px">ðŸ”Œ Conectar ' + U.esc(label) + '</b><button class="imp-x" id="ci-x">âœ•</button></div>'
      + '<div style="padding:18px 20px;display:grid;gap:11px">'
      + '<label class="ce-l">API key / Token<input id="ci-key" class="o-sel" type="password" value="' + U.esc(saved.key || '') + '" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"></label>'
      + '<label class="ce-l">Webhook / Endpoint / OAuth URL (opcional)<input id="ci-url" class="o-sel" value="' + U.esc(saved.url || '') + '" placeholder="https://hook.make.com/..."></label>'
      + '<label class="ce-l">Cuenta / usuario (opcional)<input id="ci-user" class="o-sel" value="' + U.esc(saved.user || '') + '"></label>'
      + '<label class="ce-l ck"><input type="checkbox" id="ci-on" ' + (saved.activa ? 'checked' : '') + '> IntegraciÃ³n activa</label>'
      + '<div id="ci-status" class="cfg-note">ðŸ”’ Las credenciales se guardan en el backend del cliente. En el prototipo quedan en este navegador.</div>'
      + '</div>'
      + '<div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:space-between"><button class="btn ghost" id="ci-test">ðŸ”Œ Probar conexiÃ³n</button><div style="display:flex;gap:8px"><button class="btn ghost" id="ci-cancel">Cancelar</button><button class="btn primary" id="ci-ok">Guardar</button></div></div></div>';
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#ci-x').onclick = close; back.querySelector('#ci-cancel').onclick = close;
    back.querySelector('#ci-test').onclick = () => {
      const k = back.querySelector('#ci-key').value.trim(), u = back.querySelector('#ci-url').value.trim();
      const st = back.querySelector('#ci-status');
      if (!k && !u) { st.innerHTML = 'âš ï¸ Ingresa una API key, endpoint u OAuth para probar.'; st.style.color = 'var(--warn)'; return; }
      st.innerHTML = 'â³ Probando conexiÃ³n con ' + U.esc(label) + 'â€¦'; st.style.color = '';
      setTimeout(() => { st.innerHTML = 'âœ… Credenciales detectadas. La conexiÃ³n real se valida al activar el backend en migraciÃ³n.'; st.style.color = 'var(--ok)'; }, 700);
    };
    back.querySelector('#ci-ok').onclick = () => {
      const data = { key: back.querySelector('#ci-key').value, url: back.querySelector('#ci-url').value, user: back.querySelector('#ci-user').value, activa: back.querySelector('#ci-on').checked };
      Orbit.store.setPref('integ_' + nombre, data);
      try { const tn = T().get(); tn.addons = tn.addons || {}; tn.addons[nombre] = data.activa; T().save && T().save(tn); } catch (e) {}
      close(); const host = document.getElementById('host'); if (host) render(host);
      const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = 'âœ“ ' + label + (data.activa ? ' conectada' : ' guardada'); document.body.appendChild(t); setTimeout(() => t.remove(), 2400);
    };
  }

  return { render, editarPlan, subirManualMarca, agregarPais, configIntegracion };
})();

