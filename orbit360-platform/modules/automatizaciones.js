/* ============================================================
   Orbit 360 · Automatizaciones (R10.3)
   Motor de automatizaciones para intermediarios de seguros.
   Tabla evento→destino→canal→plantilla→webhook propio.
   Webhook Make por tenant, asistente IA (Gemini), alertas de
   pendientes y registro de disparos.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.automatizaciones = (function () {
  const U = Orbit.ui, K = Orbit.kit, S = () => Orbit.store;
  const KEY_AUT = 'orbit360_aut_cfg';
  let cfg = {};
  cfg = Orbit.store.pref('aut_cfg', {}) || {};
  function saveCfg() { Orbit.store.setPref('aut_cfg', cfg); }
  const LOG = Orbit.store.pref('aut_log', []) || [];
  function addLog(ev, canal, msg) { LOG.unshift({ ts: new Date().toISOString().slice(0,16).replace('T',' '), ev, canal, msg }); if (LOG.length > 50) LOG.pop(); Orbit.store.setPref('aut_log', LOG); }

  const CANALES = ['WhatsApp (Make)', 'Correo (Outlook)', 'Notificación in-app', 'Google Sheets (Make)'];
  const EVENTOS = [
    { id: 'gestion_creada',   icon: '🗂', label: 'Gestión creada en Ops',          dest: 'Equipo',   tpl: 'Nueva gestión: {tipo} para {cliente}' },
    { id: 'cobro_vence',      icon: '💳', label: 'Cobro próximo a vencer (3 días)', dest: 'Cliente',  tpl: 'Hola {nombre}, tu recibo de {poliza} vence el {fecha}. ¿Cómo prefieres pagar?' },
    { id: 'cobro_vencido',    icon: '⚠️', label: 'Cobro vencido',                  dest: 'Asesor',   tpl: '{cliente} tiene un recibo vencido de {monto}. Gestionar hoy.' },
    { id: 'renovacion_prox',  icon: '🔄', label: 'Renovación próxima (30 días)',   dest: 'Cliente',  tpl: 'Hola {nombre}, tu póliza {poliza} de {ramo} vence el {fecha}. Preparamos tu renovación.' },
    { id: 'poliza_emitida',   icon: '🏆', label: 'Póliza emitida / cliente creado', dest: 'Cliente',  tpl: '¡Bienvenido/a {nombre}! Tu póliza {poliza} fue emitida. Aquí tu acceso al portal: {link}' },
    { id: 'siniestro_creado', icon: '🚨', label: 'Siniestro reportado',            dest: 'Equipo',   tpl: 'Reclamo {numero} de {cliente} recibido. Asignar a aseguradora.' },
    { id: 'sol_cliente',      icon: '🙋', label: 'Solicitud desde el portal',      dest: 'Asesor',   tpl: '{cliente} solicitó: {tipo}. Ver en Orbit Ops.' },
    { id: 'pago_aplicado',    icon: '✅', label: 'Pago aplicado',                  dest: 'Cliente',  tpl: 'Hola {nombre}, confirmamos tu pago de {monto}. ¡Gracias!' },
    { id: 'lead_propuesta',   icon: '📨', label: 'Propuesta enviada (Leads)',       dest: 'Lead',     tpl: 'Hola {nombre}, adjunto la propuesta de {ramo}. ¿Podemos agendar 10 min?' },
    { id: 'cumple',           icon: '🎂', label: 'Cumpleaños del cliente',          dest: 'Cliente',  tpl: '¡Feliz cumpleaños {nombre}! De parte de todo el equipo. 🎉' }
  ];

  function getEvCfg(id) { return cfg['ev_' + id] || { activo: true, canal: CANALES[0], tpl: '', hook: '' }; }
  function setEvCfg(id, k, v) { if (!cfg['ev_' + id]) cfg['ev_' + id] = getEvCfg(id); cfg['ev_' + id][k] = v; saveCfg(); }
  function customEvents() { return cfg.customEvents || []; }
  function allEventos() { return EVENTOS.concat(customEvents()); }
  function addCustom(ev) { cfg.customEvents = customEvents().concat([ev]); saveCfg(); }
  function updateCustom(id, patch) { cfg.customEvents = customEvents().map(e => e.id === id ? Object.assign({}, e, patch) : e); saveCfg(); }
  function removeCustom(id) { cfg.customEvents = customEvents().filter(e => e.id !== id); delete cfg['ev_' + id]; saveCfg(); }
  const IA_PROVS = [
    { id: 'Gemini',   nombre: 'Gemini',  ico: '✦', cost: '💲',     ideal: 'Económico · OCR y volumen masivo', modelos: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'], keylbl: 'API Key (Google AI Studio)' },
    { id: 'ChatGPT',  nombre: 'ChatGPT', ico: '◎', cost: '💲💲',   ideal: 'Equilibrio · extracción estructurada fiable', modelos: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1'], keylbl: 'API Key (OpenAI)' },
    { id: 'Claude',   nombre: 'Claude',  ico: '✲', cost: '💲💲💲', ideal: 'Máxima calidad · documentos de seguros complejos', modelos: ['claude-3-5-haiku', 'claude-3-5-sonnet', 'claude-3-7-sonnet'], keylbl: 'API Key (Anthropic)' },
    { id: 'Endpoint', nombre: 'Endpoint propio', ico: '⚙', cost: '🏷️', ideal: 'Tu modelo / proxy interno', modelos: ['custom'], keylbl: 'URL del endpoint' }
  ];
  function getIA() { return cfg.ia || { proveedor: '', key: '', modelo: '', activo: false }; }
  function getWH() { return cfg.webhook || ''; }

  function render(h) {
    const alertas = alertasPendientes();
    const logRows = LOG.slice(0, 12);
    h.innerHTML = `<div class="page">
      ${K.banner({ icon: '⚡', title: 'Automatizaciones & Integraciones', sub: 'Conecta eventos de la operación con Make, WhatsApp, correo/Outlook y más · IA opcional', features: [], actions: '<button class="btn ghost" style="background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.25)" onclick="Orbit.integraciones&&Orbit.integraciones.openPanel&&Orbit.integraciones.openPanel()">🔌 Eventos de integración</button>' })}

      <div class="aut-grid">
        <div class="aut-col-main">
          <!-- Webhook Make -->
          <div class="card pad" style="margin-bottom:14px">
            <b style="font-family:var(--f-display);font-size:15px">🔗 Webhook de Make (escenario)</b>
            <div class="muted" style="font-size:12.5px;margin-top:4px;margin-bottom:12px">Pega aquí la URL del escenario ya creado en Make. Cada automatización activa enviará su payload (evento, datos, plantilla) a ese escenario; desde Make ramifica a WhatsApp, correo, Sheets, CRM, etc.</div>
            <div style="display:flex;gap:8px">
              <input id="aut-wh" class="o-sel" style="flex:1" placeholder="https://hook.eu2.make.com/xxxxx" value="${U.esc(getWH())}">
              <button class="btn primary" id="aut-wh-save">Guardar webhook</button>
              <button class="btn ghost" id="aut-wh-test">Probar disparo</button>
            </div>
          </div>

          <!-- Tabla de automatizaciones -->
          <div class="card" style="overflow:hidden;margin-bottom:14px">
            <div style="padding:12px 14px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
              <b style="font-family:var(--f-display);font-size:15px">⚡ Automatizaciones por evento</b>
              <button class="btn primary sm" id="aut-new">+ Nueva automatización</button>
            </div>
            <div style="overflow-x:auto"><table class="tbl aut-tbl">
              <thead><tr><th>Evento → Destino</th><th style="min-width:170px">Canal</th><th style="min-width:260px">Plantilla del mensaje</th><th style="min-width:180px">Webhook propio</th><th></th></tr></thead>
              <tbody>${allEventos().map(ev => {
                const ec = getEvCfg(ev.id); const esCustom = !!ev.custom;
                return `<tr>
                  <td><label style="display:flex;align-items:center;gap:9px;cursor:pointer"><input type="checkbox" class="aut-act" data-ev="${ev.id}" ${ec.activo ? 'checked' : ''} style="accent-color:var(--red);width:16px;height:16px">
                    <span>${ev.icon} <b>${U.esc(ev.label)}</b><div class="muted" style="font-size:11px">→ ${U.esc(ev.dest)}${esCustom ? ' · personalizada' : ''}</div></span></label></td>
                  <td><select class="o-sel aut-canal" data-ev="${ev.id}" style="font-size:12px">${CANALES.map(c => `<option ${c === ec.canal ? 'selected' : ''}>${c}</option>`).join('')}</select></td>
                  <td><input class="o-sel aut-tpl" data-ev="${ev.id}" value="${U.esc(ec.tpl || ev.tpl)}" style="font-size:12px" placeholder="${U.esc(ev.tpl)}"></td>
                  <td><input class="o-sel aut-hook" data-ev="${ev.id}" value="${U.esc(ec.hook || '')}" style="font-size:11.5px" placeholder="hook propio (opcional)"></td>
                  <td>${esCustom ? `<button class="btn ghost sm aut-del" data-ev="${ev.id}" title="Eliminar">✕</button>` : ''}</td>
                </tr>`;
              }).join('')}</tbody>
            </table></div>
            <div style="padding:10px 14px;border-top:1px solid var(--line)"><span class="muted" style="font-size:12px">Variables disponibles: {nombre} {cliente} {poliza} {ramo} {monto} {fecha} {tipo} {numero} {link} {asesor}</span></div>
          </div>

          <!-- Registro de disparos -->
          <div class="card" style="overflow:hidden">
            <div style="padding:12px 14px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center">
              <b style="font-family:var(--f-display);font-size:15px">📋 Registro de disparos</b>
              <span class="muted" style="font-size:12px">últimos eventos enviados</span>
            </div>
            <div style="overflow-x:auto"><table class="tbl">
              <thead><tr><th>Fecha</th><th>Canal</th><th>Evento</th><th>Mensaje (preview)</th></tr></thead>
              <tbody>${logRows.length ? logRows.map(l => `<tr>
                <td class="mono" style="font-size:11.5px">${l.ts}</td>
                <td><span class="badge info" style="font-size:10px">${U.esc(l.canal)}</span></td>
                <td style="font-size:12.5px">${U.esc(l.ev)}</td>
                <td style="font-size:12px;color:var(--ink-2)">${U.esc(l.msg.slice(0, 60))}…</td>
              </tr>`).join('') : `<tr><td colspan="4" class="muted" style="text-align:center;padding:20px">Sin disparos registrados todavía. Activa automatizaciones y ejecuta acciones en el CRM.</td></tr>`}
              </tbody>
            </table></div>
          </div>
        </div>

        <!-- Columna derecha -->
        <div class="aut-col-side">
          <!-- Alertas de pendientes -->
          <div class="card pad" style="margin-bottom:14px">
            <b style="font-family:var(--f-display);font-size:15px">🔔 Alertas de pendientes</b>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px">
              <div class="cx-kpi"><span>Cobros vencidos</span><b style="color:var(--danger)">${alertas.cobrosVenc}</b><small>requieren gestión</small></div>
              <div class="cx-kpi"><span>Renovaciones &lt;30d</span><b style="color:var(--warn)">${alertas.renovProx}</b><small>pendientes</small></div>
              <div class="cx-kpi"><span>Gestiones abiertas</span><b style="color:var(--info)">${alertas.gestAbiertas}</b><small>en Ops</small></div>
              <div class="cx-kpi"><span>Leads atrasados</span><b style="color:var(--red)">${alertas.leadsAtr}</b><small>sin tocar &gt;7d</small></div>
            </div>
            <button class="btn primary" style="margin-top:12px;width:100%" id="aut-scan">🔍 Escanear y notificar</button>
          </div>

          <!-- Asistente IA (multi-proveedor, sin sesgo) -->
          <div class="card pad" style="margin-bottom:14px">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
              <b style="font-family:var(--f-display);font-size:15px">🤖 Motor de IA</b>
              <button class="btn ghost sm" id="ia-compare">📊 Comparar modelos</button>
            </div>
            <div class="muted" style="font-size:12px;margin-top:4px;margin-bottom:12px">Potencia importadores (mapeo/extracción), comparativo de pólizas, análisis crítico, generación de cursos y copy. Elige el proveedor que prefieras — <b>ninguno viene preseleccionado</b>. Sin API key → heurística gratuita.</div>
            <div class="ia-cards">${IA_PROVS.map(p => `
              <button class="ia-card ${getIA().proveedor === p.id ? 'on' : ''}" data-iap="${p.id}">
                <div class="ia-card-top"><span class="ia-ico">${p.ico}</span><span class="ia-cost" title="Costo relativo">${p.cost}</span></div>
                <b>${p.nombre}</b>
                <small>${p.ideal}</small>
              </button>`).join('')}</div>
            <label class="ce-l" style="margin-top:12px">Modelo<select id="ia-mod" class="o-sel"></select></label>
            <label class="ce-l" style="margin-top:8px"><span id="ia-keylbl">API Key</span><input id="ia-key" class="o-sel" type="password" placeholder="Pega tu API key" value="${U.esc(getIA().key)}"></label>
            <label class="ce-l ck" style="margin-top:10px"><input type="checkbox" id="ia-act" ${getIA().activo ? 'checked' : ''}> Activar IA como asistente</label>
            <div style="display:flex;gap:8px;margin-top:12px"><button class="btn primary" id="ia-save" style="flex:1">💾 Guardar</button><button class="btn ghost" id="ia-test">🔌 Probar</button></div>
            <div class="cfg-note" style="margin-top:10px">La elección se guarda por cliente (tenant). La IA es opcional: sin ella, todo funciona con heurística (sin costo).</div>
            <details style="margin-top:12px;border-top:1px solid var(--line);padding-top:12px">
              <summary style="cursor:pointer;font-weight:700;font-size:13px">🧩 IA por módulo (opcional)</summary>
              <div class="muted" style="font-size:12px;margin:6px 0 10px">Por defecto todos los módulos usan el motor de arriba. Aquí puedes asignar un motor distinto a un módulo según el comparativo (ej. extracción con uno económico, redacción con otro). Vacío = usa el global.</div>
              <div id="ia-mods" style="display:grid;gap:8px">${[['extraccion','📄 Extracción de documentos / importadores'],['comparativo','⚖️ Comparativo de pólizas'],['marketing','📣 Marketing (contenidos)'],['academia','🎓 Academia (cursos / quizzes)'],['insights','📈 Insights (análisis crítico)'],['redaccion','✍️ Redacción de mensajes']].map(function(m){ var sel=(cfg.iaPorModulo||{})[m[0]]||''; return '<label class="ce-l" style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0"><span style="font-size:12.5px">'+m[1]+'</span><select class="o-sel ia-modsel" data-iam="'+m[0]+'" style="width:190px"><option value="">— usar global —</option>'+IA_PROVS.map(function(p){return '<option value="'+p.id+'" '+(sel===p.id?'selected':'')+'>'+p.nombre+'</option>';}).join('')+'</select></label>'; }).join('')}</div>
            </details>
          </div>

          <!-- Integraciones rápidas -->
          <div class="card pad">
            <b style="font-family:var(--f-display);font-size:15px">🔌 Integraciones</b>
            <div style="display:grid;gap:9px;margin-top:12px">
              ${['Make', 'Outlook / M365', 'Gmail / Workspace', 'Google Sheets', 'WhatsApp Cloud'].map(i => `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border:1px solid var(--line);border-radius:8px"><div><b style="font-size:13px">${i}</b><div class="muted" style="font-size:11px">${{'Make':'Orquestador de escenarios','Outlook / M365':'Correo y calendario','Gmail / Workspace':'Correo','Google Sheets':'HR viva + export','WhatsApp Cloud':'Mensajería vía Make'}[i]}</div></div><button class="btn ghost sm" onclick="location.hash='#/configuracion'">Configurar →</button></div>`).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>`;

    wire(h);
  }

  function alertasPendientes() {
    const q = Orbit.q;
    const cobrosVenc = (q && q.cobrosVencidos ? q.cobrosVencidos() : []).length;
    const renovProx = (q && q.renovacionesProximas ? q.renovacionesProximas(30) : []).length;
    const gestAbiertas = S().all('gestiones').filter(g => !g.archivado && g.estado !== 'Resuelta').length;
    const hoy = new Date(); const hace7 = new Date(hoy.getTime() - 7 * 86400000).toISOString().slice(0, 10);
    const leadsAtr = (Orbit.ciclo ? Orbit.ciclo.negocios({ ignoreRol: true }) : []).filter(n => !['emitido','perdido'].includes(n.etapa) && n.proximoToque && n.proximoToque < hace7).length;
    return { cobrosVenc, renovProx, gestAbiertas, leadsAtr };
  }

  function wire(h) {
    // Webhook
    h.querySelector('#aut-wh-save').addEventListener('click', () => { cfg.webhook = h.querySelector('#aut-wh').value.trim(); saveCfg(); toast('✓ Webhook guardado'); });
    h.querySelector('#aut-wh-test').addEventListener('click', () => {
      const wh = getWH();
      if (!wh) { Orbit.ui.toast('Pega primero la URL del webhook de Make.'); return; }
      addLog('prueba_disparo', 'Make', 'Test de conexión desde Orbit 360');
      toast('🔄 Disparo de prueba enviado a Make. Verifica en tu escenario.');
      render(h);
    });
    // Tabla
    h.querySelectorAll('.aut-act').forEach(c => c.addEventListener('change', () => setEvCfg(c.dataset.ev, 'activo', c.checked)));
    h.querySelectorAll('.aut-canal').forEach(s => s.addEventListener('change', () => setEvCfg(s.dataset.ev, 'canal', s.value)));
    h.querySelectorAll('.aut-tpl').forEach(i => i.addEventListener('change', () => setEvCfg(i.dataset.ev, 'tpl', i.value)));
    h.querySelectorAll('.aut-hook').forEach(i => i.addEventListener('change', () => setEvCfg(i.dataset.ev, 'hook', i.value)));
    h.querySelectorAll('.aut-del').forEach(b => b.addEventListener('click', async () => { if (!(await U.confirm('¿Eliminar esta automatización personalizada?', { title: 'Eliminar automatización', ok: 'Eliminar' }))) return; removeCustom(b.dataset.ev); render(h); }));
    const nb = h.querySelector('#aut-new'); if (nb) nb.addEventListener('click', () => nuevaAuto(h));
    // IA — selector de tarjetas
    function refreshModelos() {
      const cur = getIA();
      const p = IA_PROVS.find(x => x.id === cur.proveedor);
      const modSel = h.querySelector('#ia-mod'), keylbl = h.querySelector('#ia-keylbl');
      if (modSel) modSel.innerHTML = p ? p.modelos.map(m => `<option ${cur.modelo === m ? 'selected' : ''}>${m}</option>`).join('') : '<option value="">— elige un proveedor —</option>';
      if (keylbl) keylbl.textContent = p ? p.keylbl : 'API Key';
    }
    refreshModelos();
    h.querySelectorAll('.ia-card').forEach(c => c.addEventListener('click', () => {
      const id = c.dataset.iap; const p = IA_PROVS.find(x => x.id === id);
      cfg.ia = Object.assign({}, getIA(), { proveedor: id, modelo: (p && p.modelos[0]) || '' });
      saveCfg();
      h.querySelectorAll('.ia-card').forEach(x => x.classList.toggle('on', x.dataset.iap === id));
      refreshModelos();
    }));
    h.querySelector('#ia-save').addEventListener('click', () => {
      const cur = getIA();
      if (!cur.proveedor) { toast('Elige primero un proveedor de IA'); return; }
      cfg.ia = { proveedor: cur.proveedor, key: h.querySelector('#ia-key').value.trim(), modelo: h.querySelector('#ia-mod').value, activo: h.querySelector('#ia-act').checked };
      saveCfg();
      if (Orbit.ia && Orbit.ia.conectar) Orbit.ia.conectar(cfg.ia.proveedor, cfg.ia.key, cfg.ia.modelo);
      try { const t = Orbit.tenant && Orbit.tenant.get(); if (t) { t.ia = { proveedor: cfg.ia.proveedor, modelo: cfg.ia.modelo, activo: cfg.ia.activo }; Orbit.tenant.save && Orbit.tenant.save(t); } } catch (e) {}
      toast('✓ Motor de IA guardado (' + cfg.ia.proveedor + ')');
    });
    const tb = h.querySelector('#ia-test'); if (tb) tb.addEventListener('click', () => {
      const cur = getIA();
      if (!cur.proveedor) { toast('Elige un proveedor primero'); return; }
      const k = h.querySelector('#ia-key').value.trim();
      toast(k ? ('🔌 ' + cur.proveedor + ': clave detectada — conexión real al migrar backend') : ('⚠️ ' + cur.proveedor + ' sin API key — opera en heurística gratuita'));
    });
    const cmp = h.querySelector('#ia-compare'); if (cmp) cmp.addEventListener('click', compararModelos);
    h.querySelectorAll('.ia-modsel').forEach(s => s.addEventListener('change', () => {
      cfg.iaPorModulo = cfg.iaPorModulo || {};
      if (s.value) cfg.iaPorModulo[s.dataset.iam] = s.value; else delete cfg.iaPorModulo[s.dataset.iam];
      saveCfg();
      try { const t = Orbit.tenant && Orbit.tenant.get(); if (t) { t.iaPorModulo = cfg.iaPorModulo; Orbit.tenant.save && Orbit.tenant.save(t); } } catch (e) {}
      toast('✓ Motor de ' + s.dataset.iam + ': ' + (s.value || 'global'));
    }));
    // Escanear
    h.querySelector('#aut-scan').addEventListener('click', () => {
      const a = alertasPendientes();
      const msgs = [];
      if (a.cobrosVenc) msgs.push('⚠️ ' + a.cobrosVenc + ' cobros vencidos — campaña de cobro enviada');
      if (a.renovProx) msgs.push('🔄 ' + a.renovProx + ' renovaciones próximas — campaña enviada');
      if (a.gestAbiertas) msgs.push('🗂 ' + a.gestAbiertas + ' gestiones abiertas — notificado al equipo');
      if (a.leadsAtr) msgs.push('🎯 ' + a.leadsAtr + ' leads atrasados — recordatorio al asesor');
      msgs.forEach(m => addLog('escaneo_manual', getEvCfg('cobro_vence').canal || 'WhatsApp (Make)', m));
      Orbit.ui.toast('🔍 Escaneo completado:\n\n' + (msgs.length ? msgs.join('\n') : '✅ Todo al día — sin pendientes urgentes.'));
      render(h);
    });
  }

  function compararModelos() {
    let back = document.getElementById('ia-cmp'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'ia-cmp'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 97;
    const rows = [
      ['Costo / token', '💲 Muy bajo', '💲💲 Medio', '💲💲💲 Alto', '🏷️ Tu tarifa'],
      ['Extracción de PDF de seguros', 'Buena (Pro)', 'Muy buena', 'Excelente', 'Depende'],
      ['OCR / imagen', 'Excelente', 'Muy buena', 'Muy buena', 'Depende'],
      ['Volumen masivo', 'Ideal', 'Bueno', 'Costoso', 'Depende'],
      ['Salida JSON estructurada', 'Buena', 'Excelente', 'Excelente', 'Depende'],
      ['Ideal para', 'Importaciones masivas, OCR', 'Equilibrio calidad/costo', 'Comparativo y casos complejos', 'Control total / on-premise']
    ];
    back.innerHTML = '<div class="card" style="width:min(720px,96vw);max-height:88vh;overflow:auto;padding:0">'
      + '<div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display);font-size:16px">📊 Comparar motores de IA</b><button class="imp-x" id="cmp-x">✕</button></div>'
      + '<div style="padding:16px 20px">'
      + '<div class="muted" style="font-size:12.5px;margin-bottom:12px">Referencia honesta para que <b>elijas según tu prioridad</b> (calidad vs costo). Ninguno está preseleccionado.</div>'
      + '<table class="tbl" style="font-size:13px"><thead><tr><th></th><th>✦ Gemini</th><th>◎ ChatGPT</th><th>✲ Claude</th><th>⚙ Endpoint</th></tr></thead><tbody>'
      + rows.map(r => '<tr><td style="font-weight:700">' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td><td>' + r[3] + '</td><td>' + r[4] + '</td></tr>').join('')
      + '</tbody></table>'
      + '<div class="cfg-note" style="margin-top:14px">💡 Para <b>extracción de pólizas con garantía de calidad</b>, Claude o ChatGPT suelen superar a Gemini Flash. Para <b>volumen/costo</b>, Gemini es muy rentable. Valida con una muestra antes de decidir.</div>'
      + '</div></div>';
    document.body.appendChild(back);
    back.addEventListener('click', e => { if (e.target === back) back.remove(); });
    back.querySelector('#cmp-x').addEventListener('click', () => back.remove());
  }

  function toast(msg) { const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }

  function nuevaAuto(h) {
    let back = document.getElementById('aut-edit'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'aut-edit'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 96;
    const emojis = ['⚡', '🎯', '📣', '🔔', '🎁', '📅', '💡', '🤝', '📊', '🏷'];
    back.innerHTML = `<div class="card" style="width:min(520px,94vw);max-height:92vh;overflow:auto;padding:0">
      <div style="padding:17px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center">
        <b style="font-family:var(--f-display);font-size:16px">+ Nueva automatización</b><button class="imp-x" id="na-x">✕</button></div>
      <div style="padding:18px 20px;display:grid;gap:12px">
        <label class="ce-l">Nombre del evento / regla<input id="na-label" class="o-sel" placeholder="Ej. Felicitación por aniversario de póliza"></label>
        <div class="cgrid">
          <label class="ce-l">Ícono<select id="na-icon" class="o-sel">${emojis.map(e => `<option>${e}</option>`).join('')}</select></label>
          <label class="ce-l">Destino<select id="na-dest" class="o-sel">${['Cliente', 'Asesor', 'Equipo', 'Lead', 'Aseguradora'].map(d => `<option>${d}</option>`).join('')}</select></label>
          <label class="ce-l">Canal<select id="na-canal" class="o-sel">${CANALES.map(c => `<option>${c}</option>`).join('')}</select></label>
        </div>
        <label class="ce-l">Plantilla del mensaje<textarea id="na-tpl" class="o-sel" style="min-height:70px" placeholder="Hola {nombre}, ..."></textarea></label>
        <label class="ce-l">Webhook propio (opcional)<input id="na-hook" class="o-sel" placeholder="https://hook.make.com/..."></label>
        <div class="cfg-note">Variables: {nombre} {cliente} {poliza} {ramo} {monto} {fecha} {tipo} {numero} {link} {asesor}</div>
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn ghost" id="na-cancel">Cancelar</button><button class="btn primary" id="na-ok">Crear automatización</button></div>
    </div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#na-x').addEventListener('click', close); back.querySelector('#na-cancel').addEventListener('click', close);
    back.querySelector('#na-ok').addEventListener('click', () => {
      const label = back.querySelector('#na-label').value.trim(); if (!label) { toast('Ponle un nombre a la regla'); return; }
      const id = 'cst_' + Date.now().toString(36);
      addCustom({ id, custom: true, icon: back.querySelector('#na-icon').value, label, dest: back.querySelector('#na-dest').value, tpl: back.querySelector('#na-tpl').value || ('Hola {nombre}') });
      setEvCfg(id, 'canal', back.querySelector('#na-canal').value);
      setEvCfg(id, 'tpl', back.querySelector('#na-tpl').value || 'Hola {nombre}');
      setEvCfg(id, 'hook', back.querySelector('#na-hook').value);
      setEvCfg(id, 'activo', true);
      close(); render(h); toast('✓ Automatización creada');
    });
  }

  /* API pública para disparar automatizaciones desde otros módulos */
  function disparar(evId, datos) {
    const ec = getEvCfg(evId);
    if (!ec.activo) return;
    const ev = allEventos().find(e => e.id === evId);
    if (!ev) return;
    let msg = ec.tpl || ev.tpl;
    Object.keys(datos || {}).forEach(k => { msg = msg.replace(new RegExp('{' + k + '}', 'g'), datos[k]); });
    addLog(ev.label, ec.canal, msg);
    // si hay webhook, lo dispararíamos aquí en producción
    return msg;
  }

  return { render, disparar };
})();
