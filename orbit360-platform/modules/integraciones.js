/* CXOrbia · Integraciones & Add-ons — catálogo completo activable por plan/tenant
   Basado en el ecosistema de herramientas modernas; configuración real por tenant.
   Cada integración tiene: nombre, categoría, descripción, toggleable, config modal. */
window.CX = window.CX || {};

CX.intStore = {
  _state: null,
  _key: 'cx_integraciones',
  CATS: ['CORREO Y COMUNICACIÓN','ECOSISTEMA GOOGLE','ECOSISTEMA MICROSOFT','INTELIGENCIA ARTIFICIAL','CONTENIDO Y DISEÑO','REDES Y MARKETING','AUTOMATIZACIÓN Y PRODUCTIVIDAD','DATOS Y FACTURACIÓN'],
  ITEMS: [
    // CORREO Y COMUNICACIÓN
    {id:'outlook', cat:'CORREO Y COMUNICACIÓN', icon:'✉️', n:'Outlook / Microsoft 365', desc:'Bandeja integrada; vincula correos a proyectos, shoppers, clientes y gestiones.', cfg:['email','client_id'], plan:'pro'},
    {id:'gmail', cat:'CORREO Y COMUNICACIÓN', icon:'📧', n:'Gmail / Google Workspace', desc:'Sincroniza correos y contactos de Google.', cfg:['email'], plan:'pro'},
    {id:'imap', cat:'CORREO Y COMUNICACIÓN', icon:'📬', n:'IMAP / POP3 (dominio propio)', desc:'Conecta cualquier proveedor con dominio corporativo.', cfg:['host','port','email','pass'], plan:'estandar'},
    {id:'whatsapp', cat:'CORREO Y COMUNICACIÓN', icon:'💬', n:'WhatsApp Business (API + Web)', desc:'Recordatorios, notificaciones, encuestas y mensajería a shoppers y clientes.', cfg:['phone','token'], plan:'estandar'},
    {id:'telegram', cat:'CORREO Y COMUNICACIÓN', icon:'✈️', n:'Telegram', desc:'Notificaciones internas del equipo y alertas operativas.', cfg:['bot_token'], plan:'pro'},
    {id:'sms', cat:'CORREO Y COMUNICACIÓN', icon:'📱', n:'SMS', desc:'Avisos de visita, recordatorios y alertas por mensaje de texto.', cfg:['api_key'], plan:'enterprise'},
    // ECOSISTEMA GOOGLE
    {id:'gsheets', cat:'ECOSISTEMA GOOGLE', icon:'📊', n:'Google Sheets', desc:'HR viva colaborativa; importación/exportación de datos y reportes.', cfg:['sheet_url'], plan:'estandar'},
    {id:'gdrive', cat:'ECOSISTEMA GOOGLE', icon:'💛', n:'Google Drive', desc:'Expedientes y documentos por cliente, shopper y proyecto.', cfg:['folder_id'], plan:'pro'},
    {id:'gcal', cat:'ECOSISTEMA GOOGLE', icon:'📅', n:'Google Calendar', desc:'Cronograma, citas, visitas y vencimientos sincronizados.', cfg:['calendar_id'], plan:'pro'},
    {id:'gmeet', cat:'ECOSISTEMA GOOGLE', icon:'🎥', n:'Google Meet', desc:'Reuniones y convocatorias desde el CRM; guarda actas automáticamente.', cfg:['oauth'], plan:'pro'},
    {id:'gforms', cat:'ECOSISTEMA GOOGLE', icon:'📝', n:'Google Forms', desc:'Formularios de captación, cuestionarios y NPS vinculados al portal.', cfg:['form_id'], plan:'pro'},
    {id:'looker', cat:'ECOSISTEMA GOOGLE', icon:'📈', n:'Looker Studio', desc:'Dashboards ejecutivos sobre los datos del proyecto y del CRM.', cfg:['report_url'], plan:'enterprise'},
    // ECOSISTEMA MICROSOFT
    {id:'teams', cat:'ECOSISTEMA MICROSOFT', icon:'🟦', n:'Microsoft Teams', desc:'Colaboración del equipo, alertas y videollamadas internas.', cfg:['webhook_url'], plan:'pro'},
    {id:'onedrive', cat:'ECOSISTEMA MICROSOFT', icon:'☁️', n:'OneDrive / Excel', desc:'Documentos y hojas de datos de Microsoft; importación de HR.', cfg:['client_id'], plan:'pro'},
    // INTELIGENCIA ARTIFICIAL
    {id:'gemini', cat:'INTELIGENCIA ARTIFICIAL', icon:'✨', n:'Gemini (Google IA)', desc:'IA transversal: extracción de documentos, análisis crítico, generación de cuestionarios, propuestas y marketing. Recomendada.', cfg:['api_key','model'], plan:'estandar', recommended:true},
    {id:'chatgpt', cat:'INTELIGENCIA ARTIFICIAL', icon:'🤖', n:'ChatGPT / OpenAI', desc:'Generación de contenidos, asistente de propuestas y análisis.', cfg:['api_key','model'], plan:'pro'},
    {id:'claude', cat:'INTELIGENCIA ARTIFICIAL', icon:'🔷', n:'Claude (Anthropic)', desc:'Análisis de documentos largos y redacción precisa.', cfg:['api_key'], plan:'pro'},
    {id:'notebooklm', cat:'INTELIGENCIA ARTIFICIAL', icon:'📚', n:'NotebookLM', desc:'Base de conocimiento del cliente; alimenta cuestionarios y capacitación.', cfg:['notebook_url'], plan:'enterprise'},
    {id:'perplexity', cat:'INTELIGENCIA ARTIFICIAL', icon:'🔍', n:'Perplexity', desc:'Investigación web con fuentes para propuestas y relevamiento de clientes.', cfg:['api_key'], plan:'pro'},
    // CONTENIDO Y DISEÑO
    {id:'canva', cat:'CONTENIDO Y DISEÑO', icon:'🎨', n:'Canva', desc:'Piezas y plantillas de diseño para campañas, propuestas y Academia.', cfg:['api_key'], plan:'pro'},
    {id:'gamma', cat:'CONTENIDO Y DISEÑO', icon:'📊', n:'Gamma', desc:'Presentaciones y material comercial generados con IA.', cfg:['api_key'], plan:'pro'},
    {id:'heygen', cat:'CONTENIDO Y DISEÑO', icon:'🎬', n:'HeyGen', desc:'Videos con avatar IA para capacitación y marketing.', cfg:['api_key'], plan:'enterprise'},
    {id:'capcut', cat:'CONTENIDO Y DISEÑO', icon:'✂️', n:'CapCut', desc:'Edición rápida de video para redes sociales.', cfg:[], plan:'pro'},
    // REDES Y MARKETING
    {id:'metricool', cat:'REDES Y MARKETING', icon:'📅', n:'Metricool', desc:'Programa, publica y mide redes y pauta desde un solo lugar.', cfg:['api_key'], plan:'pro', recommended:true},
    {id:'meta', cat:'REDES Y MARKETING', icon:'🔵', n:'Facebook / Instagram (Meta)', desc:'Publicación, mensajes y captación de leads.', cfg:['token','page_id'], plan:'pro'},
    {id:'linkedin', cat:'REDES Y MARKETING', icon:'🔷', n:'LinkedIn', desc:'Publicación corporativa y captación B2B.', cfg:['token'], plan:'enterprise'},
    {id:'tiktok', cat:'REDES Y MARKETING', icon:'🎵', n:'TikTok', desc:'Publicación y captación de audiencia.', cfg:['token'], plan:'enterprise'},
    {id:'youtube', cat:'REDES Y MARKETING', icon:'▶️', n:'YouTube', desc:'Canal de video y contenidos de capacitación.', cfg:['channel_id'], plan:'pro'},
    {id:'mailchimp', cat:'REDES Y MARKETING', icon:'🐒', n:'Mailchimp', desc:'Campañas de correo masivo y segmentación.', cfg:['api_key'], plan:'pro'},
    {id:'website', cat:'REDES Y MARKETING', icon:'🌐', n:'Página web de la empresa', desc:'Formularios web → leads; contenidos publicados al sitio.', cfg:['webhook_url'], plan:'estandar'},
    // AUTOMATIZACIÓN Y PRODUCTIVIDAD
    {id:'make', cat:'AUTOMATIZACIÓN Y PRODUCTIVIDAD', icon:'⚡', n:'Make (Integromat)', desc:'Orquesta automatizaciones entre módulos y servicios (genera → publica → notifica → registra).', cfg:['webhook_url'], plan:'estandar', recommended:true},
    {id:'zapier', cat:'AUTOMATIZACIÓN Y PRODUCTIVIDAD', icon:'⚡', n:'Zapier', desc:'Automatizaciones entre miles de apps.', cfg:['webhook_url'], plan:'pro'},
    {id:'n8n', cat:'AUTOMATIZACIÓN Y PRODUCTIVIDAD', icon:'🔧', n:'n8n', desc:'Automatización self-hosted y flujos a medida.', cfg:['host','api_key'], plan:'enterprise'},
    {id:'notion', cat:'AUTOMATIZACIÓN Y PRODUCTIVIDAD', icon:'📓', n:'Notion', desc:'Base de conocimiento, procesos y wikis del equipo; sincroniza actas.', cfg:['api_key'], plan:'pro'},
    {id:'slack', cat:'AUTOMATIZACIÓN Y PRODUCTIVIDAD', icon:'#️⃣', n:'Slack', desc:'Alertas y colaboración del equipo en tiempo real.', cfg:['webhook_url'], plan:'pro'},
    {id:'zoom', cat:'AUTOMATIZACIÓN Y PRODUCTIVIDAD', icon:'📹', n:'Zoom', desc:'Reuniones y capacitaciones; guarda grabaciones y actas.', cfg:['api_key'], plan:'pro'},
    {id:'trello', cat:'AUTOMATIZACIÓN Y PRODUCTIVIDAD', icon:'📋', n:'Trello', desc:'Tableros de tareas conectados a gestiones del CRM.', cfg:['api_key'], plan:'pro'},
    // DATOS Y FACTURACIÓN
    {id:'fel_gt', cat:'DATOS Y FACTURACIÓN', icon:'🧾', n:'FEL Guatemala (SAT)', desc:'Facturación electrónica en línea (GT).', cfg:['nit','api_key'], plan:'enterprise'},
    {id:'dian_co', cat:'DATOS Y FACTURACIÓN', icon:'🧾', n:'Facturación DIAN (CO)', desc:'Facturación electrónica Colombia.', cfg:['api_key'], plan:'enterprise'},
    {id:'openbanking', cat:'DATOS Y FACTURACIÓN', icon:'🏦', n:'Banca / Open Banking', desc:'Importar movimientos y conciliar estados de cuenta automáticamente.', cfg:['api_key'], plan:'enterprise'},
  ],
  state(){ if(this._state)return this._state;try{this._state=JSON.parse(localStorage.getItem(this._key)||'{}');}catch(e){this._state={};} return this._state; },
  isOn(id){ return !!this.state()[id]; },
  toggle(id){ const s=this.state(); s[id]=!s[id]; try{localStorage.setItem(this._key,JSON.stringify(s));}catch(e){} CX.bus&&CX.bus.emit('integraciones'); },
  setConfig(id,cfg){ const s=this.state(); if(!s[id+'_cfg'])s[id+'_cfg']={}; Object.assign(s[id+'_cfg'],cfg); try{localStorage.setItem(this._key,JSON.stringify(s));}catch(e){} },
  getConfig(id){ return this.state()[id+'_cfg']||{}; },
};

CX.module('integraciones', ({ui,data})=>{
  const host=ui.el('div');
  const PLAN=CX.session.plan||(data.project()&&data.project().plan)||'estandar';
  const planLevel={estandar:0,pro:1,enterprise:2};
  const canUse=(p)=> (planLevel[p]||0) <= (planLevel[PLAN]||0);

  const configModal=(item)=>{
    if(!item.cfg||!item.cfg.length){ui.toast(item.n+' activado','ok');return;}
    const cfg=CX.intStore.getConfig(item.id);
    const LABELS={api_key:'API Key',webhook_url:'Webhook URL',email:'Correo',token:'Token de acceso',host:'Host / servidor',port:'Puerto',pass:'Contraseña',client_id:'Client ID',model:'Modelo',phone:'Número de teléfono',calendar_id:'Calendar ID',folder_id:'Folder ID',sheet_url:'URL de Hoja',form_id:'Form ID',report_url:'Report URL',oauth:'OAuth',nit:'NIT / RUT',page_id:'Page ID',notebook_url:'URL Notebook',bot_token:'Bot Token',channel_id:'Channel ID'};
    ui.modal('⚙️ Configurar · '+item.n,`
      <p style="font-size:12.5px;color:var(--t2);margin-bottom:12px">${item.desc}</p>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${item.cfg.map(k=>`<div><label class="lbl">${LABELS[k]||k}</label><input class="inp cfg-fld" data-k="${k}" value="${(cfg[k]||'').replace(/"/g,'&quot;')}" type="${k==='pass'?'password':'text'}" placeholder="${LABELS[k]||k}…"></div>`).join('')}
      </div>
      <div class="between" style="margin-top:14px"><button class="btn btn-ghost btn-sm" id="cfTest">🔌 Probar conexión</button><button class="btn btn-pr btn-sm" id="cfSave">Guardar configuración</button></div>
      <div style="font-size:10.5px;color:var(--t3);margin-top:8px">🔒 En producción, las credenciales se guardan de forma segura en el backend (no en el navegador). Aquí se guardan localmente solo para configurar el flujo.</div>
    `,{onMount:(ov,close)=>{
      ov.querySelector('#cfTest').addEventListener('click',()=>ui.toast('⚠️ Prueba simulada · la validación real de credenciales ocurre en el backend de producción.','',3600));
      ov.querySelector('#cfSave').addEventListener('click',()=>{
        const patch={};ov.querySelectorAll('.cfg-fld').forEach(i=>{patch[i.dataset.k]=i.value.trim();});
        CX.intStore.setConfig(item.id,patch);if(!CX.intStore.isOn(item.id))CX.intStore.toggle(item.id);
        close();draw();ui.toast(item.n+' configurado · pendiente de validación en backend','ok',3200);
      });
    }});
  };

  const card=(item)=>{
    const on=CX.intStore.isOn(item.id); const ok=canUse(item.plan);
    const planBadge=!ok?ui.bdg(item.plan.toUpperCase(),'r'):(item.recommended?ui.bdg('recomendado','g'):'');
    return `<div class="card ${on?'':''}" style="padding:14px 16px;background:${on?'var(--brand-light)':'var(--panel)'};border:1px solid ${on?'var(--brand)':'var(--border)'};border-radius:12px;display:flex;align-items:center;gap:14px">
      <div style="font-size:26px">${item.icon}</div>
      <div style="flex:1;min-width:0">
        <div class="between"><div><b style="font-size:13px;color:var(--t1)">${item.n}</b> ${planBadge}</div></div>
        <div style="font-size:11.5px;color:var(--t2);margin-top:3px;line-height:1.4">${item.desc}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex-shrink:0">
        <label class="flex" style="cursor:${ok?'pointer':'not-allowed'};gap:6px;align-items:center">
          <input type="checkbox" class="intTog" data-id="${item.id}" ${on?'checked':''} ${!ok?'disabled':''} style="width:18px;height:18px;cursor:${ok?'pointer':'not-allowed'}">
          <span style="font-size:11px;color:${on?'var(--brand)':'var(--t3)'};font-weight:700">${on?'Activo':'Inactivo'}</span></label>
        ${ok?`<button class="btn btn-ghost btn-sm intCfg" data-id="${item.id}" style="padding:2px 8px;font-size:10.5px">⚙️ Config.</button>`:'<span style="font-size:10px;color:var(--t3)">Plan '+item.plan+'</span>'}
      </div></div>`;
  };

  const draw=()=>{
    const items=CX.intStore.ITEMS;
    const activeCount=items.filter(i=>CX.intStore.isOn(i.id)).length;
    host.innerHTML=`
      <div class="between" style="margin-bottom:6px"><div>${ui.ph('Integraciones & Add-ons','Conecta tu ecosistema — activables por plan · configura una vez, funciona en toda la plataforma')}</div>
        <div class="flex" style="gap:8px"><span class="bdg bdg-g">${activeCount} activas</span></div></div>
      <div style="background:var(--brand-light);border-radius:10px;padding:11px 14px;font-size:12.5px;color:var(--brand-dark);margin-bottom:16px">
        ⚡ <b>Receta de automatización inteligente:</b> IA (Gemini/Claude) redacta → Canva/Gamma crean piezas → Metricool programa y publica → Make/Zapier orquesta → NotebookLM alimenta el conocimiento del cliente y la Academia.
      </div>
      ${CX.intStore.CATS.map(cat=>{
        const catItems=items.filter(i=>i.cat===cat);
        if(!catItems.length)return '';
        return `<div style="margin-bottom:20px"><div style="font-size:11px;font-weight:800;color:var(--t3);letter-spacing:.6px;text-transform:uppercase;border-bottom:1px solid var(--border-2);padding-bottom:6px;margin-bottom:10px">${cat}</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px">${catItems.map(card).join('')}</div></div>`;
      }).join('')}
      <div style="margin-top:8px">${ui.aiBox('Cada integración activa alimenta los módulos correspondientes: WhatsApp para notificaciones y recordatorios, Sheets para HR viva, Gemini para toda la IA de la plataforma, Metricool para publicar contenido de Marketing, Make para automatizar flujos. Configura una vez, funciona en todo.','Ecosistema conectado')}</div>`;
    host.querySelectorAll('.intTog').forEach(c=>c.addEventListener('change',()=>{
      const item=CX.intStore.ITEMS.find(i=>i.id===c.dataset.id);
      if(c.checked&&item&&item.cfg&&item.cfg.length){c.checked=false;configModal(item);}
      else{CX.intStore.toggle(c.dataset.id);draw();ui.toast(c.checked?item.n+' activado':item.n+' desactivado','ok');}
    }));
    host.querySelectorAll('.intCfg').forEach(b=>b.addEventListener('click',()=>{
      const item=CX.intStore.ITEMS.find(i=>i.id===b.dataset.id);if(item)configModal(item);
    }));
  };
  draw();
  CX.bus.on('integraciones',()=>draw());
  return host;
});
