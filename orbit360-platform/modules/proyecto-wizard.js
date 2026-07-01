/* CXOrbia · Wizard de creación de proyecto inteligente
   Países+moneda (lista larga), honorarios recibido/pagado, modelo
   directo/delegado (ISR/regalías), modo de cuestionario, HR, restricciones.
   Crea un proyecto persistente y AISLADO (no afecta a los existentes). */
window.CX = window.CX || {};

CX.projectWizard = function(data, ui){
  const st = {
    step:1, total:5,
    name:'', industry:'', countries:[], currency:{},
    honRecibe:{}, honPaga:{}, boleto:{}, comboAmt:{}, combo:'',
    modelo:'directo', isr:5, regalias:0,
    cuestModo:'interna', cuestUrl:'',
    hrFuente:'Hoja creada en plataforma',
    scenarios:'', restriccion:'', diasPago:30, conocimiento:'',
  };
  const wrap=ui.el('div');

  const head=()=>`<div class="between" style="margin-bottom:14px">
    <div class="card-t" style="font-size:16px">🧩 Nuevo proyecto — paso ${st.step} de ${st.total}</div>
    <div class="flex" style="gap:4px">${[1,2,3,4,5].map(n=>`<span style="width:26px;height:5px;border-radius:3px;background:${n<=st.step?'var(--brand)':'var(--border)'}"></span>`).join('')}</div></div>`;

  const ctrlFooter=()=>`<div class="between" style="margin-top:18px">
    <button class="btn btn-ghost btn-sm" id="wBack" ${st.step===1?'style="visibility:hidden"':''}>← Atrás</button>
    <button class="btn btn-pr btn-sm" id="wNext">${st.step===st.total?'✓ Crear proyecto':'Siguiente →'}</button></div>`;

  const stepHTML=()=>{
    if(st.step===1) return `
      <div style="margin-bottom:12px"><label class="lbl">Nombre del proyecto / cliente</label><input class="inp" id="f_name" value="${st.name}" placeholder="Ej. Cadena de retail"></div>
      <div style="margin-bottom:12px"><label class="lbl">Rubro / industria</label><input class="inp" id="f_ind" list="rubroList" value="${st.industry}" placeholder="Busca o crea uno nuevo…">
      <datalist id="rubroList">${['Retail · Cadena de tiendas','Banca · Red de agencias','Restaurantes · Multimarca','Salud · Clínicas','Telecomunicaciones','Automotriz · Concesionarios','Hotelería & Turismo','Seguros','Educación','Gobierno / Sector público','Supermercados','Farmacias'].map(r=>`<option value="${r}">`).join('')}</datalist>
      <div style="font-size:11px;color:var(--t3);margin-top:4px">Elige de la lista o escribe uno nuevo.</div></div>
      <label class="lbl">Países donde se ejecuta (multipaís)</label>
      <input class="inp" id="f_paisSearch" placeholder="🔎 Buscar país…" style="margin-bottom:8px">
      <div style="max-height:160px;overflow:auto;border:1px solid var(--border);border-radius:10px;padding:8px">
        ${CX.COUNTRIES.map(co=>`<label class="between wPaisRow" data-n="${co.n.toLowerCase()}" style="padding:5px 6px;cursor:pointer"><span style="font-size:13px">${co.n} <span class="muted">(${co.cur})</span></span><input type="checkbox" class="wCountry" data-c="${co.c}" data-cur="${co.cur}" ${st.countries.includes(co.c)?'checked':''}></label>`).join('')}
      </div>
      ${ui.aiBox('La capa IA asocia cada país a su moneda y prepara KPIs y finanzas multipaís. Las monedas nunca se suman entre sí.','Multipaís automático')}`;

    if(st.step===2){
      if(!st.countries.length) return `<div class="empty">Selecciona al menos un país en el paso anterior.</div>`;
      return `<label class="lbl">Honorarios por país (en su moneda)</label>
      <div style="font-size:11.5px;color:var(--t3);margin-bottom:10px">Distingue lo que <b>recibes</b> del cliente y lo que <b>pagas</b> al shopper.</div>
      ${st.countries.map(c=>{const cur=st.currency[c];return `<div style="border:1px solid var(--border);border-radius:10px;padding:11px 13px;margin-bottom:10px">
        <div style="font-weight:700;font-size:13px;margin-bottom:8px">${CX.COUNTRIES.find(x=>x.c===c).n} <span class="muted">(${cur})</span></div>
        <div class="grid g2" style="gap:10px">
          <div><label class="lbl">Recibes (cliente)</label><input class="inp wRec" data-c="${c}" type="number" value="${st.honRecibe[c]||''}" placeholder="${cur} 0"></div>
          <div><label class="lbl">Pagas (shopper)</label><input class="inp wPag" data-c="${c}" type="number" value="${st.honPaga[c]||''}" placeholder="${cur} 0"></div>
          <div><label class="lbl">Boleto reemb.</label><input class="inp wBol" data-c="${c}" type="number" value="${st.boleto[c]||''}" placeholder="${cur} 0"></div>
          <div><label class="lbl">Combo reemb.</label><input class="inp wCom" data-c="${c}" type="number" value="${st.comboAmt[c]||''}" placeholder="${cur} 0"></div>
        </div></div>`;}).join('')}
      <div style="margin-bottom:6px"><label class="lbl">Etiqueta del combo/reembolso (opcional)</label><input class="inp" id="f_combo" value="${st.combo}" placeholder="Ej. Reembolso de compra"></div>`;
    }

    if(st.step===3) return `
      <label class="lbl">Modelo del proyecto</label>
      <div class="grid g2" style="gap:10px;margin-bottom:14px">
        <label class="card hov card-p" style="cursor:pointer;${st.modelo==='directo'?'border-color:var(--brand);box-shadow:0 0 0 2px var(--brand-light)':''}"><input type="radio" name="wmod" value="directo" ${st.modelo==='directo'?'checked':''} style="margin-right:6px"><b>Facturado directamente</b><div style="font-size:11.5px;color:var(--t3);margin-top:4px">Tú facturas al cliente. Se registran costos: honorarios, ISR/impuestos, regalías.</div></label>
        <label class="card hov card-p" style="cursor:pointer;${st.modelo==='delegado'?'border-color:var(--brand);box-shadow:0 0 0 2px var(--brand-light)':''}"><input type="radio" name="wmod" value="delegado" ${st.modelo==='delegado'?'checked':''} style="margin-right:6px"><b>Delegado (franquicia)</b><div style="font-size:11.5px;color:var(--t3);margin-top:4px">Solo se relaciona el honorario recibido y los pagos asociados.</div></label>
      </div>
      <div id="directoCosts" style="${st.modelo==='directo'?'':'display:none'}">
        <div class="grid g2" style="gap:10px">
          <div><label class="lbl">ISR / impuesto local (%)</label><input class="inp" id="f_isr" type="number" value="${st.isr}"></div>
          <div><label class="lbl">Regalías (%)</label><input class="inp" id="f_reg" type="number" value="${st.regalias}"></div>
        </div>
        <div style="background:var(--amber-bg);border-radius:9px;padding:9px 12px;font-size:11.5px;color:#8a5b00;margin-top:10px">Estos costos alimentan el módulo financiero para calcular margen real.</div>
      </div>
      ${ui.aiBox('Según el modelo, el Dashboard Financiero calcula distinto: directo descuenta ISR y regalías; delegado solo netea honorario recibido − pagado.','Finanzas según el modelo')}`;

    if(st.step===4) return `
      <label class="lbl">Modo del cuestionario</label>
      <select class="sel" id="f_cmodo" style="margin-bottom:10px">
        <option value="interna" ${st.cuestModo==='interna'?'selected':''}>En la plataforma (se llena dentro)</option>
        <option value="externa" ${st.cuestModo==='externa'?'selected':''}>Plataforma externa (con credenciales)</option>
        <option value="link" ${st.cuestModo==='link'?'selected':''}>Link distinto por cada visita</option>
      </select>
      <div id="cUrlWrap" style="${st.cuestModo==='interna'?'display:none':''};margin-bottom:12px"><label class="lbl">URL base / plataforma externa</label><input class="inp" id="f_curl" value="${st.cuestUrl}" placeholder="https://..."></div>
      <label class="lbl">Origen de la Hoja de Ruta</label>
      <select class="sel" id="f_hr" style="margin-bottom:12px">
        <option ${st.hrFuente==='Hoja creada en plataforma'?'selected':''}>Hoja creada en plataforma</option>
        <option ${st.hrFuente==='Google Sheets (online)'?'selected':''}>Google Sheets (online)</option>
        <option ${st.hrFuente==='Excel importado'?'selected':''}>Excel importado</option>
      </select>
      <div style="margin-bottom:6px"><label class="lbl">Escenarios (separados por coma)</label><input class="inp" id="f_scn" value="${st.scenarios}" placeholder="Compra estándar, Fin de semana, Incógnito"></div>
      <div class="flex" style="gap:8px;margin:8px 0"><button class="btn btn-soft btn-sm" id="f_import" type="button">📥 Importar instructivo / HR (IA)</button></div>
      <div style="font-size:11.5px;color:var(--t3)">Los cuestionarios pueden tener versiones por escenario, marca o tipo de establecimiento (editables luego en el módulo Cuestionarios).</div>`;

    // step 5
    const recOK=st.countries.every(c=>st.honRecibe[c]!=null);
    return `
      <div style="margin-bottom:12px"><label class="lbl">Restricción del proyecto</label><input class="inp" id="f_res" value="${st.restriccion}" placeholder="Ej. No visitar la misma sucursal en 2 meses"></div>
      <div style="margin-bottom:12px"><label class="lbl">Días para pago estimado (lógica de liquidación)</label><input class="inp" id="f_dias" type="number" value="${st.diasPago}"></div>
      <div style="margin-bottom:12px"><label class="lbl">Base de conocimiento para la IA</label><textarea class="inp" id="f_con" rows="3" placeholder="Qué se evalúa, contexto del cliente, criterios…">${st.conocimiento}</textarea></div>
      <div class="card card-p" style="background:var(--panel-2)">
        <div class="card-t" style="font-size:13px;margin-bottom:8px">Resumen</div>
        <div style="font-size:12px;color:var(--t2);line-height:1.7">
          <b>${st.name||'(sin nombre)'}</b> · ${st.industry||'—'}<br>
          Países: ${st.countries.join(', ')||'—'} · Modelo: <b>${st.modelo}</b>${st.modelo==='directo'?` (ISR ${st.isr}% · regalías ${st.regalias}%)`:''}<br>
          Cuestionario: ${st.cuestModo} · HR: ${st.hrFuente} · pago ≈ ${st.diasPago} días
        </div>
      </div>
      ${ui.aiBox('Al crear, se genera un proyecto AISLADO con su propio dashboard, KPIs, reglas y finanzas. No afecta a los proyectos existentes.','Proyecto aislado e inteligente')}`;
  };

  const render=()=>{ wrap.innerHTML = head()+`<div>${stepHTML()}</div>`+ctrlFooter(); bind(); };

  const persist=()=>{
    // sincroniza inputs visibles del paso actual hacia el estado
    const g=(id)=>{const e=wrap.querySelector('#'+id);return e?e.value:undefined;};
    if(st.step===1){ if(g('f_name')!=null)st.name=g('f_name'); if(g('f_ind')!=null)st.industry=g('f_ind');
      st.countries=[...wrap.querySelectorAll('.wCountry:checked')].map(c=>c.dataset.c);
      st.currency={}; wrap.querySelectorAll('.wCountry:checked').forEach(c=>st.currency[c.dataset.c]=c.dataset.cur); }
    if(st.step===2){ wrap.querySelectorAll('.wRec').forEach(e=>st.honRecibe[e.dataset.c]=+e.value||0);
      wrap.querySelectorAll('.wPag').forEach(e=>st.honPaga[e.dataset.c]=+e.value||0);
      wrap.querySelectorAll('.wBol').forEach(e=>st.boleto[e.dataset.c]=+e.value||0);
      wrap.querySelectorAll('.wCom').forEach(e=>st.comboAmt[e.dataset.c]=+e.value||0);
      if(g('f_combo')!=null)st.combo=g('f_combo'); }
    if(st.step===3){ const r=wrap.querySelector('input[name="wmod"]:checked'); if(r)st.modelo=r.value;
      if(g('f_isr')!=null)st.isr=+g('f_isr')||0; if(g('f_reg')!=null)st.regalias=+g('f_reg')||0; }
    if(st.step===4){ if(g('f_cmodo')!=null)st.cuestModo=g('f_cmodo'); if(g('f_curl')!=null)st.cuestUrl=g('f_curl');
      if(g('f_hr')!=null)st.hrFuente=g('f_hr'); if(g('f_scn')!=null)st.scenarios=g('f_scn'); }
    if(st.step===5){ if(g('f_res')!=null)st.restriccion=g('f_res'); if(g('f_dias')!=null)st.diasPago=+g('f_dias')||30; if(g('f_con')!=null)st.conocimiento=g('f_con'); }
  };

  const create=()=>{
    persist();
    if(!st.name){ui.toast('Ponle nombre al proyecto','warn');st.step=1;render();return;}
    if(!st.countries.length){ui.toast('Selecciona al menos un país','warn');st.step=1;render();return;}
    const cfg={
      name:st.name, client:st.name, industry:st.industry||'Proyecto', countries:st.countries,
      currency:st.currency, honorario:st.honPaga, honRecibe:st.honRecibe, boleto:st.boleto, comboAmt:st.comboAmt, combo:st.combo||null,
      modelo:st.modelo, isr:st.isr, regalias:st.regalias,
      scenarios:(st.scenarios||'General').split(',').map(s=>s.trim()).filter(Boolean),
      canales:['Presencial','Online'], formato:'Evaluación', ronda:'JUN 26',
      restriccion:st.restriccion, conocimiento:st.conocimiento,
      cuestionario:{modo:st.cuestModo,url:st.cuestUrl,label:st.cuestModo==='interna'?'Cuestionario en plataforma':st.cuestModo==='link'?'Link por visita':'Plataforma externa'},
      pago:{diasPago:st.diasPago,logica:'Pago ~'+st.diasPago+' días tras submitir',moneda:'local'},
      hrMap:{fuente:st.hrFuente,cols:['Sucursal','Ciudad','País','Escenario']},
      geoloc:false, accent:'#2196d3', quincenas:['Quincena 1','Quincena 2'], nVisitas:0,
    };
    const p=data.addProject(cfg);
    if(CX._wizClose)CX._wizClose();
    ui.toast('Proyecto "'+p.name+'" creado y activado · plataforma adaptada','ok',4000);
    CX.router.buildRail(CX.session.role); CX.router.nav('proyectos');
  };

  const bind=()=>{
    const back=wrap.querySelector('#wBack'); if(back)back.addEventListener('click',()=>{persist();st.step=Math.max(1,st.step-1);render();});
    wrap.querySelector('#wNext').addEventListener('click',()=>{persist();if(st.step===st.total){create();}else{st.step++;render();}});
    const modR=wrap.querySelectorAll('input[name="wmod"]'); modR.forEach(r=>r.addEventListener('change',()=>{st.modelo=r.value;const d=wrap.querySelector('#directoCosts');if(d)d.style.display=st.modelo==='directo'?'':'none';}));
    const cm=wrap.querySelector('#f_cmodo'); if(cm)cm.addEventListener('change',()=>{const w=wrap.querySelector('#cUrlWrap');if(w)w.style.display=cm.value==='interna'?'none':'';});
    const ps=wrap.querySelector('#f_paisSearch'); if(ps)ps.addEventListener('input',()=>{const q=ps.value.toLowerCase();wrap.querySelectorAll('.wPaisRow').forEach(l=>{l.style.display=l.dataset.n.includes(q)?'':'none';});});
    const imp=wrap.querySelector('#f_import'); if(imp)imp.addEventListener('click',()=>importWizard());
  };

  const importWizard=()=>{ ui.modal('Importar instructivo / HR', `
    <p style="font-size:12.5px;color:var(--t2);margin-bottom:10px">Sube el instructivo, manual de servicio o HR del cliente. La IA <b>extrae</b> escenarios, restricciones y arma la <b>base de conocimiento</b> del proyecto.</p>
    <input type="file" accept=".pdf,.doc,.docx,.xlsx,.csv" class="inp" style="padding:7px;margin-bottom:10px">
    <div style="text-align:right"><button class="btn btn-green btn-sm" id="impGo">✨ Extraer con IA</button></div>`,
    {onMount:(ov,close)=>{ ov.querySelector('#impGo').addEventListener('click',()=>{ persist();
      if(!st.scenarios) st.scenarios='Compra estándar, Fin de semana, Incógnito';
      st.restriccion=st.restriccion||'No visitar la misma sucursal en 2 meses';
      st.conocimiento=((st.conocimiento||'')+' [Extraído del documento: criterios de servicio, tiempos de atención y protocolo de cierre].').trim();
      close(); render(); ui.toast('IA extrajo escenarios, restricción y base de conocimiento (demo)','ok',3400); }); }}); };

  render();
  CX._wizClose = ui.modal('Crear proyecto', '<div id="wizMount"></div>', {onMount:(ov,close)=>{
    CX._wizClose = close;
    const mount=ov.querySelector('#wizMount');
    if(mount){mount.innerHTML='';mount.appendChild(wrap);}
  }});
};
