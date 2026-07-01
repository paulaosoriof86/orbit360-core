/* CXOrbia · CRM Comercial completo (estilo Orbit) — suite con Dashboard/Insights, Pipeline,
   Leads, Cuentas, Contactos, Actividades con cadencias/recordatorios, Fichas 360 con timeline,
   correos vinculados, documentos y Reportes de producción/metas/comparativo. */
CX.crmStore = CX.crmStore || {
  _l:null, _cols:null, _cuentas:null, _contactos:null, _meta:null,
  /* columnas del pipeline (personalizables) */
  COLS_DEFAULT:[
    {id:'nuevo',     ic:'🆕', n:'Nuevo',       color:'#6b7280'},
    {id:'calif',     ic:'🔍', n:'Calificado',  color:'#2a6fdb'},
    {id:'propuesta', ic:'📄', n:'Propuesta',   color:'#f59e0b'},
    {id:'negoc',     ic:'🤝', n:'Negociación', color:'#8b5cf6'},
    {id:'ganado',    ic:'🏆', n:'Ganado',      color:'#10b981'},
    {id:'perdido',   ic:'❌', n:'Perdido',     color:'#ef4444'},
  ],
  cols(){ if(!this._cols)try{this._cols=JSON.parse(localStorage.getItem('cx_crm_cols')||'null')||JSON.parse(JSON.stringify(this.COLS_DEFAULT));}catch(e){this._cols=JSON.parse(JSON.stringify(this.COLS_DEFAULT));} return this._cols; },
  saveCols(){ try{localStorage.setItem('cx_crm_cols',JSON.stringify(this._cols||this.COLS_DEFAULT));}catch(e){} CX.bus&&CX.bus.emit('crm'); },
  addCol(cfg){ this.cols().push(Object.assign({id:'col'+Date.now().toString(36)},cfg)); this.saveCols(); },
  editCol(id,patch){ const c=this.cols().find(x=>x.id===id); if(c)Object.assign(c,patch); this.saveCols(); },
  delCol(id){ if(['ganado','perdido','nuevo'].includes(id))return; this._cols=this.cols().filter(x=>x.id!==id); this.saveCols(); },

  /* ── Oportunidades ── */
  seed(){
    return [
      {id:'op1',empresa:'Cadena Norte',rubro:'Supermercados',pais:'GT',etapa:'propuesta',valor:48000,contacto:'Ana Pérez',cargo:'Gerencia de Operaciones',contactoEmail:'ops@cadenanorte.gt',tel:'+502 5555 1010',prob:60,fuente:'LinkedIn',cuentaId:'ac1',proximaAccion:'Enviar propuesta revisada',proximaFecha:'2026-06-28',nota:'Solicitaron mystery + auditoría de imagen.',acts:[{id:'a01',tipo:'reunion',texto:'Reunión de relevamiento inicial',fecha:'2026-06-10 10:00',hecho:true},{id:'a02',tipo:'tarea',texto:'Enviar propuesta revisada',vence:'2026-06-28',hecho:false}],correos:[{de:'ops@cadenanorte.gt',asunto:'Re: Propuesta mystery shopping',fecha:'2026-06-18',preview:'Gracias por la información, quedamos atentos…'}],docs:[{n:'Brief del cliente.pdf',tipo:'pdf'},{n:'Protocolo de servicio.pdf',tipo:'pdf'}]},
      {id:'op2',empresa:'Grupo Vértice',rubro:'Restaurantes · Multimarca',pais:'GT',etapa:'calif',valor:32000,contacto:'Luis Marroquín',cargo:'Dirección de Marca',contactoEmail:'marca@vertice.com',tel:'+502 5555 2020',prob:35,fuente:'Referido',cuentaId:'ac2',proximaAccion:'Llamada de seguimiento',proximaFecha:'2026-06-26',nota:'Interés en experiencia al cliente trimestral.',acts:[{id:'a03',tipo:'llamada',texto:'Llamada de calificación inicial',fecha:'2026-06-15 14:00',hecho:true}],correos:[],docs:[]},
      {id:'op3',empresa:'Banca del Istmo',rubro:'Banca · Red de agencias',pais:'HN',etapa:'negoc',valor:75000,contacto:'Carla Méndez',cargo:'Subgerencia Comercial',contactoEmail:'comercial@banca-istmo.hn',tel:'+504 9999 3030',prob:75,fuente:'RFP',cuentaId:'ac3',proximaAccion:'Ajustar estructura de precios',proximaFecha:'2026-06-27',nota:'Programa anual, varias agencias. Precio es el principal punto.',acts:[{id:'a04',tipo:'reunion',texto:'Demo de la plataforma',fecha:'2026-06-20 09:00',hecho:true},{id:'a05',tipo:'tarea',texto:'Ajustar estructura de precios',vence:'2026-06-27',hecho:false}],correos:[{de:'comercial@banca-istmo.hn',asunto:'RFP — requisitos técnicos',fecha:'2026-06-12',preview:'Adjunto los requisitos del programa anual…'}],docs:[{n:'RFP Banca del Istmo.pdf',tipo:'pdf'}]},
      {id:'op4',empresa:'FarmaPlus',rubro:'Farmacias',pais:'GT',etapa:'nuevo',valor:21000,contacto:'Diego Ramos',cargo:'Mercadeo',contactoEmail:'mktg@farmaplus.gt',tel:'+502 5555 4040',prob:15,fuente:'Referido',cuentaId:'ac4',proximaAccion:'Agendar relevamiento',proximaFecha:'2026-06-30',nota:'Referido. Pendiente reunión de relevamiento.',acts:[],correos:[],docs:[]},
    ];
  },
  list(){ if(!this._l)this._l=this.seed(); return this._l; },
  add(o){ this.list().push(Object.assign({id:'op'+Date.now().toString(36),etapa:'nuevo',prob:15,valor:0,acts:[],docs:[],correos:[]},o)); CX.bus&&CX.bus.emit('crm'); },
  move(id,etapa){ const o=this.list().find(x=>x.id===id); if(o){o.etapa=etapa;if(etapa==='ganado')o.prob=100;if(etapa==='perdido')o.prob=0;CX.bus&&CX.bus.emit('crm');} return o; },
  acts(id){ const o=this.list().find(x=>x.id===id);if(o&&!o.acts)o.acts=[];return o?o.acts:[]; },
  addAct(id,a){ const o=this.list().find(x=>x.id===id);if(o){o.acts=o.acts||[];o.acts.unshift(Object.assign({id:'a'+Date.now().toString(36),fecha:new Date().toISOString().slice(0,16).replace('T',' ')},a));CX.bus&&CX.bus.emit('crm');} },
  tareas(){ const out=[];this.list().forEach(o=>{(o.acts||[]).forEach(a=>{if(a.tipo==='tarea'&&!a.hecho)out.push(Object.assign({op:o.empresa,opId:o.id},a));});});return out.sort((a,b)=>(a.vence||'').localeCompare(b.vence||'')); },
  toggleTarea(opId,aId){ const o=this.list().find(x=>x.id===opId);if(o){const a=(o.acts||[]).find(x=>x.id===aId);if(a){a.hecho=!a.hecho;CX.bus&&CX.bus.emit('crm');}} },

  /* ── Cuentas (empresas) ── */
  cuentasSeed(){
    return [
      {id:'ac1',nombre:'Cadena Norte',rubro:'Supermercados',pais:'GT',sitio:'cadenanorte.gt',empleados:'500+',estado:'Prospecto',salud:72,owner:'Comercial 1',sucursales:24},
      {id:'ac2',nombre:'Grupo Vértice',rubro:'Restaurantes · Multimarca',pais:'GT',sitio:'vertice.com',empleados:'200-500',estado:'Prospecto',salud:55,owner:'Comercial 2',sucursales:18},
      {id:'ac3',nombre:'Banca del Istmo',rubro:'Banca',pais:'HN',sitio:'banca-istmo.hn',empleados:'1000+',estado:'En negociación',salud:80,owner:'Comercial 1',sucursales:42},
      {id:'ac4',nombre:'FarmaPlus',rubro:'Farmacias',pais:'GT',sitio:'farmaplus.gt',empleados:'100-200',estado:'Prospecto',salud:40,owner:'Comercial 2',sucursales:31},
    ];
  },
  cuentas(){ if(!this._cuentas)try{this._cuentas=JSON.parse(localStorage.getItem('cx_crm_cuentas')||'null')||this.cuentasSeed();}catch(e){this._cuentas=this.cuentasSeed();} return this._cuentas; },
  saveCuentas(){ try{localStorage.setItem('cx_crm_cuentas',JSON.stringify(this._cuentas));}catch(e){} CX.bus&&CX.bus.emit('crm'); },
  addCuenta(c){ this.cuentas().unshift(Object.assign({id:'ac'+Date.now().toString(36),salud:50,estado:'Prospecto'},c)); this.saveCuentas(); },

  /* ── Contactos ── */
  contactosSeed(){
    return [
      {id:'ct1',nombre:'Ana Pérez',cargo:'Gerencia de Operaciones',cuentaId:'ac1',email:'ops@cadenanorte.gt',tel:'+502 5555 1010',rol:'Decisor'},
      {id:'ct2',nombre:'Luis Marroquín',cargo:'Dirección de Marca',cuentaId:'ac2',email:'marca@vertice.com',tel:'+502 5555 2020',rol:'Influenciador'},
      {id:'ct3',nombre:'Carla Méndez',cargo:'Subgerencia Comercial',cuentaId:'ac3',email:'comercial@banca-istmo.hn',tel:'+504 9999 3030',rol:'Decisor'},
      {id:'ct4',nombre:'Diego Ramos',cargo:'Mercadeo',cuentaId:'ac4',email:'mktg@farmaplus.gt',tel:'+502 5555 4040',rol:'Contacto'},
    ];
  },
  contactos(){ if(!this._contactos)try{this._contactos=JSON.parse(localStorage.getItem('cx_crm_contactos')||'null')||this.contactosSeed();}catch(e){this._contactos=this.contactosSeed();} return this._contactos; },
  saveContactos(){ try{localStorage.setItem('cx_crm_contactos',JSON.stringify(this._contactos));}catch(e){} CX.bus&&CX.bus.emit('crm'); },
  addContacto(c){ this.contactos().unshift(Object.assign({id:'ct'+Date.now().toString(36),rol:'Contacto'},c)); this.saveContactos(); },

  /* ── Metas comerciales ── */
  meta(){ if(!this._meta)try{this._meta=JSON.parse(localStorage.getItem('cx_crm_meta')||'null')||{mensual:100000,trimestral:300000};}catch(e){this._meta={mensual:100000,trimestral:300000};} return this._meta; },
  setMeta(m){ this._meta=Object.assign(this.meta(),m); try{localStorage.setItem('cx_crm_meta',JSON.stringify(this._meta));}catch(e){} CX.bus&&CX.bus.emit('crm'); },
};

CX.module('crm', ({data,ui})=>{
  const host=ui.el('div');
  let crmView='dashboard'; // dashboard | pipeline | leads | cuentas | contactos | actividades | reportes
  const cur=()=>((data.project().currency&&data.project().currency.GT)||'$');
  const k=(n)=>cur()+' '+(n/1000).toFixed(0)+'k';
  const emojis={llamada:'📞',reunion:'👥',nota:'🗒️',tarea:'⏰',acta:'📝',meet:'🎥',correo:'✉️'};

  /* ─── Ficha 360 con timeline + correos vinculados ─── */
  const ficha360=(o)=>{
    if(!o)return;
    const cuenta=CX.crmStore.cuentas().find(c=>c.id===o.cuentaId);
    const actCount=(o.acts||[]).length, docCount=(o.docs||[]).length, mailCount=(o.correos||[]).length;
    /* timeline combina actividades + correos ordenados por fecha desc */
    const timeline=[...(o.acts||[]).map(a=>({...a,_t:a.fecha||a.vence||''})),
      ...(o.correos||[]).map(c=>({tipo:'correo',texto:c.asunto,sub:c.preview,_t:c.fecha}))]
      .sort((a,b)=>(b._t||'').localeCompare(a._t||''));
    ui.modal('🗂️ Ficha 360 · '+o.empresa, `
      <div style="display:grid;grid-template-columns:1fr 1.2fr;gap:16px">
        <div>
          <div class="card-t" style="font-size:12.5px;margin-bottom:10px">🏢 Datos del prospecto</div>
          <div style="font-size:12.5px;line-height:1.95;color:var(--t2)">
            <div><b>Empresa:</b> ${o.empresa}</div>
            <div><b>Rubro:</b> ${o.rubro}</div>
            <div><b>País:</b> ${CX.paisFlag?CX.paisFlag(o.pais):''} ${o.pais}</div>
            <div><b>Contacto:</b> ${o.contacto||'—'} ${o.cargo?'· '+o.cargo:''}</div>
            <div><b>Correo:</b> <a href="mailto:${o.contactoEmail||''}" style="color:var(--brand)">${o.contactoEmail||'—'}</a></div>
            <div><b>Teléfono:</b> ${o.tel||'—'}</div>
            <div><b>Fuente:</b> ${o.fuente||'—'}</div>
            <div><b>Valor est.:</b> ${cur()} ${(o.valor||0).toLocaleString()}</div>
            <div><b>Probabilidad:</b> ${o.prob||0}%</div>
          </div>
          ${o.proximaAccion?`<div style="margin-top:10px;padding:9px 12px;background:var(--amber-bg);border-radius:9px"><div style="font-size:11px;font-weight:700;color:#92400e">⏰ Próxima acción</div><div style="font-size:12px;color:var(--t2)">${o.proximaAccion} · ${o.proximaFecha||''}</div></div>`:''}
          <div style="margin-top:12px">
            <div class="card-t" style="font-size:12.5px;margin-bottom:8px">📎 Documentos (${docCount})</div>
            ${(o.docs||[]).length?o.docs.map(d=>`<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border-2)"><span style="font-size:14px">📄</span><span style="font-size:12px">${d.n}</span></div>`).join('')
              :'<div style="font-size:12px;color:var(--t3)">Sin documentos.</div>'}
            <button class="btn btn-ghost btn-sm" id="addDoc" style="margin-top:8px">＋ Subir documento</button>
          </div>
        </div>
        <div>
          <div class="card-t" style="font-size:12.5px;margin-bottom:10px">🕐 Timeline · actividades y correos (${actCount+mailCount})</div>
          <div style="max-height:240px;overflow:auto;border-left:2px solid var(--border-2);padding-left:12px">
            ${timeline.length?timeline.map(a=>`<div style="position:relative;padding:7px 0 7px 4px;margin-bottom:2px">
              <div style="position:absolute;left:-18px;top:9px;width:10px;height:10px;border-radius:50%;background:var(--brand);border:2px solid #fff"></div>
              <div style="font-size:12px;font-weight:700;color:var(--t1)${a.hecho?';text-decoration:line-through;opacity:.6':''}">${emojis[a.tipo]||'•'} ${a.texto}</div>
              ${a.sub?`<div style="font-size:11px;color:var(--t3)">${a.sub}</div>`:''}
              <div style="font-size:10.5px;color:var(--t3)">${a._t||''}</div>
            </div>`).join('')
            :'<div style="font-size:12px;color:var(--t3)">Sin actividades ni correos. Registra el primer contacto.</div>'}
          </div>
          <div class="flex wrap" style="gap:6px;margin-top:10px">
            <button class="btn btn-ghost btn-sm" data-newact="nota">＋ Nota</button>
            <button class="btn btn-ghost btn-sm" data-newact="llamada">📞 Llamada</button>
            <button class="btn btn-ghost btn-sm" data-newact="meet">🎥 Reunión</button>
            <button class="btn btn-ghost btn-sm" data-newact="tarea">⏰ Tarea</button>
            <button class="btn btn-ghost btn-sm" data-newact="correo">✉️ Correo</button>
          </div>
          ${cuenta?`<div style="margin-top:12px;padding:10px 12px;background:var(--brand-light);border-radius:9px"><div style="font-size:12px;font-weight:700;color:var(--brand-dark)">🏢 Cuenta vinculada: ${cuenta.nombre}</div><div style="font-size:11px;color:var(--t3)">Salud ${cuenta.salud}% · ${cuenta.sucursales||0} sucursales · owner ${cuenta.owner||'—'}</div></div>`:''}
        </div>
      </div>
      <div class="between" style="margin-top:14px;border-top:1px solid var(--border-2);padding-top:12px">
        <div class="flex" style="gap:8px">
          <button class="btn btn-soft btn-sm" id="fWa">📲 WhatsApp</button>
          <button class="btn btn-soft btn-sm" id="fMail">✉️ Correo</button>
          <button class="btn btn-pr btn-sm" id="fProp">📄 Generar propuesta</button>
        </div>
        <button class="btn btn-green btn-sm" id="fGanar">🏆 Marcar ganado</button>
      </div>
    `,{onMount:(ov,close)=>{
      ov.querySelector('#addDoc')?.addEventListener('click',()=>{o.docs=o.docs||[];o.docs.push({n:'Documento_'+Date.now().toString(36)+'.pdf',tipo:'pdf'});CX.bus&&CX.bus.emit('crm');close();ficha360(o);});
      ov.querySelectorAll('[data-newact]').forEach(b=>b.addEventListener('click',()=>{
        const tipo=b.dataset.newact;
        const isMeet=(tipo==='meet'), isMail=(tipo==='correo');
        ui.modal((isMeet?'🎥 Crear reunión':isMail?'✉️ Registrar correo':'＋ Actividad · '+tipo),`
          <textarea class="inp" id="actTxt" rows="2" placeholder="${isMeet?'Agenda de la reunión…':isMail?'Asunto del correo…':'Descripción…'}" style="margin-bottom:10px"></textarea>
          ${isMeet?`<div class="grid g2" style="gap:8px;margin-bottom:10px"><div><label class="lbl">Fecha</label><input class="inp" id="actF" type="date" value="${new Date().toISOString().slice(0,10)}"></div><div><label class="lbl">Hora</label><input class="inp" id="actH" type="time" value="10:00"></div></div>
            <input class="inp" id="actLink" placeholder="Link de Meet/Zoom (opcional)" style="margin-bottom:10px">`:
          tipo==='tarea'?`<input class="inp" id="actVence" type="date" style="margin-bottom:10px">
            <label class="lbl">Vincular a módulo (navegación cruzada)</label>
            <select class="sel" id="actLink2" style="margin-bottom:10px"><option value="">— Sin vínculo —</option><option value="proyectos">📁 Proyecto</option><option value="costos">📄 Propuesta / Costos</option><option value="visitas">📍 Visita</option><option value="postulaciones">📋 Postulación</option></select>`:''}
          <div style="text-align:right"><button class="btn btn-pr btn-sm" id="actSave">Guardar</button></div>
        `,{onMount:(o2,close2)=>{o2.querySelector('#actSave').addEventListener('click',()=>{
          const txt=(o2.querySelector('#actTxt').value||'').trim();if(!txt){ui.toast('Describe la actividad','warn');return;}
          if(isMail){o.correos=o.correos||[];o.correos.unshift({de:o.contactoEmail||'',asunto:txt,fecha:new Date().toISOString().slice(0,10),preview:'Registrado manualmente'});CX.bus&&CX.bus.emit('crm');}
          else{const act={tipo,texto:txt};if(isMeet){act.fecha=(o2.querySelector('#actF').value||'')+' '+(o2.querySelector('#actH').value||'');act.link=(o2.querySelector('#actLink')?.value||'').trim();}else if(tipo==='tarea'){act.vence=(o2.querySelector('#actVence')?.value||'');act.modulo=(o2.querySelector('#actLink2')?.value||'');}CX.crmStore.addAct(o.id,act);}
          close2();close();ficha360(CX.crmStore.list().find(x=>x.id===o.id)||o);
          ui.toast('Registrado','ok');
        });}});
      }));
      ov.querySelector('#fWa')?.addEventListener('click',()=>{const msg=encodeURIComponent('Hola '+(o.contacto||'')+', me comunico de parte de la consultora sobre '+o.empresa+'.');window.open('https://wa.me/?text='+msg,'_blank');});
      ov.querySelector('#fMail')?.addEventListener('click',()=>window.open('mailto:'+o.contactoEmail,'_blank'));
      ov.querySelector('#fProp')?.addEventListener('click',()=>{close();CX.router.nav('costos');ui.toast('Genera la propuesta para '+o.empresa,'ok');});
      ov.querySelector('#fGanar')?.addEventListener('click',()=>{CX.crmStore.move(o.id,'ganado');const exists=data.clients&&data.clients.find(c=>c.name.toLowerCase()===o.empresa.toLowerCase());if(!exists&&data.addClient)data.addClient({name:o.empresa,industry:o.rubro,pais:o.pais,estado:'Activo',plan:'estandar'});close();draw();ui.toast('🏆 '+o.empresa+' ganado · creado como Cliente','ok',4000);});
    }});
  };

  /* ─── Dashboard / Insights ─── */
  const dashboardView=(ops)=>{
    const activos=ops.filter(o=>!['ganado','perdido'].includes(o.etapa));
    const pipeline=activos.reduce((a,o)=>a+(o.valor||0),0);
    const ponderado=activos.reduce((a,o)=>a+(o.valor||0)*(o.prob||0)/100,0);
    const ganados=ops.filter(o=>o.etapa==='ganado');
    const ganado$=ganados.reduce((a,o)=>a+(o.valor||0),0);
    const perdidos=ops.filter(o=>o.etapa==='perdido');
    const winRate=(ganados.length+perdidos.length)?Math.round(ganados.length/(ganados.length+perdidos.length)*100):0;
    const meta=CX.crmStore.meta();
    const metaPct=Math.min(100,Math.round(ganado$/meta.mensual*100));
    const tareas=CX.crmStore.tareas();
    const vencidas=tareas.filter(t=>t.vence&&t.vence<new Date().toISOString().slice(0,10));
    /* embudo por etapa */
    const cols=CX.crmStore.cols().filter(c=>!['perdido'].includes(c.id));
    const funnel=cols.map(c=>({...c,n2:ops.filter(o=>o.etapa===c.id).length,v:ops.filter(o=>o.etapa===c.id).reduce((a,o)=>a+(o.valor||0),0)}));
    const maxF=Math.max(1,...funnel.map(f=>f.v));
    /* insights */
    const insights=[];
    if(metaPct<70)insights.push({t:'r',i:'⚠',x:`Meta mensual al ${metaPct}%. Faltan ${k(meta.mensual-ganado$)} para cerrar la cuota.`});
    if(vencidas.length)insights.push({t:'r',i:'⏰',x:`${vencidas.length} tarea(s) VENCIDAS sin completar. Riesgo de enfriar oportunidades.`});
    if(ponderado<pipeline*0.3)insights.push({t:'a',i:'📉',x:'Pipeline ponderado bajo (<30%). Muchas oportunidades en etapas tempranas o baja probabilidad.'});
    const concentracion=activos.length?Math.max(...activos.map(o=>o.valor||0))/Math.max(1,pipeline):0;
    if(concentracion>0.4)insights.push({t:'a',i:'🎯',x:'Alta concentración: una sola oportunidad representa >40% del pipeline. Diversifica.'});
    if(winRate>=50)insights.push({t:'g',i:'✓',x:`Win rate sano (${winRate}%). El proceso de calificación está funcionando.`});
    if(!insights.length)insights.push({t:'g',i:'✓',x:'Pipeline equilibrado. Mantén la cadencia de seguimiento.'});

    return `
    <div class="grid g4" style="margin-bottom:16px" id="crmKpis">
      <div data-ck="pipe" style="cursor:pointer">${ui.kpi('Pipeline activo',k(pipeline),'b',activos.length+' oportunidades')}</div>
      <div data-ck="pond" style="cursor:pointer">${ui.kpi('Ponderado',k(ponderado),'p','por probabilidad')}</div>
      <div data-ck="gan" style="cursor:pointer">${ui.kpi('Ganado (mes)',k(ganado$),'g',ganados.length+' cerrados')}</div>
      <div data-ck="task" style="cursor:pointer">${ui.kpi('Tareas pend.',tareas.length,vencidas.length?'r':'a',vencidas.length+' vencidas')}</div>
    </div>
    <div class="grid g2" style="gap:14px;margin-bottom:16px">
      <div class="card card-p">
        <div class="card-t" style="margin-bottom:12px">🎯 Meta del mes</div>
        <div class="between" style="margin-bottom:6px"><span style="font-size:12.5px;color:var(--t2)">Cerrado vs meta</span><b>${k(ganado$)} / ${k(meta.mensual)}</b></div>
        <div class="bar" style="height:12px;margin-bottom:6px"><i style="width:${metaPct}%;background:${metaPct>=100?'var(--green)':metaPct>=70?'var(--brand)':'var(--amber)'}"></i></div>
        <div style="font-size:12px;color:var(--t3)">${metaPct}% de la cuota mensual · win rate ${winRate}%</div>
        <button class="btn btn-ghost btn-sm" id="editMeta" style="margin-top:10px">✎ Ajustar meta</button>
      </div>
      <div class="card card-p">
        <div class="card-t" style="margin-bottom:12px">📊 Embudo de conversión</div>
        ${funnel.map(f=>`<div style="margin-bottom:9px"><div class="between" style="margin-bottom:3px"><span style="font-size:12px;color:var(--t2)">${f.ic} ${f.n}</span><span style="font-size:11.5px;color:var(--t3)">${f.n2} · ${k(f.v)}</span></div><div class="bar" style="height:7px"><i style="width:${Math.round(f.v/maxF*100)}%;background:${f.color}"></i></div></div>`).join('')}
      </div>
    </div>
    <div class="card card-p" style="margin-bottom:16px;border-color:#e3d9f5">
      <div class="card-h"><div class="card-t">🧠 Insights comerciales</div><span class="bdg bdg-p">IA · análisis del pipeline</span></div>
      <div class="grid g2" style="gap:10px">
        ${insights.map(h=>`<div style="display:flex;gap:10px;padding:11px 12px;background:var(--${h.t}-bg);border-radius:10px">
          <div style="font-size:16px">${h.i}</div><div style="font-size:12px;color:var(--t2);line-height:1.5">${h.x}</div></div>`).join('')}
      </div>
    </div>
    <div class="card card-p">
      <div class="card-t" style="margin-bottom:10px">⏰ Próximas acciones y tareas</div>
      ${tareas.length?`<table class="tbl"><thead><tr><th>Empresa</th><th>Tarea</th><th>Vence</th><th></th></tr></thead><tbody>
        ${tareas.slice(0,8).map(t=>{const venc=t.vence&&t.vence<new Date().toISOString().slice(0,10);return `<tr><td><b>${t.op}</b></td><td style="font-size:12px">${t.texto}${t.modulo?` <span class="bdg bdg-b crm-goto" data-mod="${t.modulo}" style="cursor:pointer;font-size:9px">${({proyectos:'📁 Proyecto',costos:'📄 Propuesta',visitas:'📍 Visita',postulaciones:'📋 Postulación'})[t.modulo]||'→'}</span>`:''}</td><td style="font-size:11.5px;color:${venc?'var(--red)':'var(--t3)'}">${t.vence||''} ${venc?'⚠':''}</td><td style="text-align:right"><button class="btn btn-ghost btn-sm crm-done" data-op="${t.opId}" data-act="${t.id}" style="padding:2px 8px;font-size:11px">✓ Hecho</button></td></tr>`;}).join('')}
      </tbody></table>`:'<div style="font-size:12.5px;color:var(--t3);padding:14px 0">Sin tareas pendientes. ¡Buen trabajo!</div>'}
    </div>`;
  };

  /* ─── Pipeline (kanban) ─── */
  const kanbanView=(ops)=>{
    const cols=CX.crmStore.cols();
    return `<div style="overflow-x:auto"><div style="display:flex;gap:14px;min-width:${cols.length*200}px;align-items:flex-start">
      ${cols.map(col=>{
        const items=ops.filter(o=>o.etapa===col.id);
        const total=items.reduce((a,o)=>a+(o.valor||0),0);
        return `<div style="flex:1;min-width:180px">
          <div class="between" style="margin-bottom:10px;padding:8px 11px;background:${col.color}18;border-radius:9px;border-left:3px solid ${col.color}">
            <div><span style="font-size:13px;font-weight:800;color:${col.color}">${col.ic} ${col.n}</span>
            <div style="font-size:10.5px;color:var(--t3)">${items.length} · ${k(total)}</div></div>
            <button class="btn btn-ghost btn-sm" data-editcol="${col.id}" style="padding:1px 6px;font-size:10px">✎</button>
          </div>
          ${items.map(o=>`<div class="card hov" data-op="${o.id}" style="padding:11px 12px;margin-bottom:8px;cursor:pointer;border-left:3px solid ${col.color}">
            <div style="font-size:13px;font-weight:700;color:var(--t1);margin-bottom:4px">${o.empresa}</div>
            <div style="font-size:11px;color:var(--t3)">${o.rubro}</div>
            <div class="between" style="margin-top:8px"><b style="font-size:12px;color:var(--green)">${k(o.valor)}</b><span style="font-size:10.5px;color:var(--t3)">${o.prob}% · ${(o.acts||[]).length} act.</span></div>
            ${(o.acts||[]).some(a=>a.tipo==='tarea'&&!a.hecho)?`<div style="font-size:10px;color:var(--amber);margin-top:4px">⏰ tarea pendiente</div>`:''}
          </div>`).join('')}
          <button class="btn btn-ghost btn-sm" data-newcol="${col.id}" style="width:100%;margin-top:6px;border-style:dashed">＋ Agregar</button>
        </div>`;
      }).join('')}
      <div style="min-width:44px;display:flex;align-items:flex-start;padding-top:6px"><button class="btn btn-ghost btn-sm" id="addCol" style="writing-mode:vertical-rl;height:120px;border-style:dashed">＋ Columna</button></div>
    </div></div>`;
  };

  /* ─── Leads (entrantes sin calificar) ─── */
  const leadsView=(ops)=>{
    const leads=ops.filter(o=>['nuevo','calif'].includes(o.etapa));
    return `<div class="card card-p">
      <div class="between" style="margin-bottom:12px"><div class="card-t">🆕 Leads por calificar (${leads.length})</div><button class="btn btn-pr btn-sm" id="newLead">＋ Nuevo lead</button></div>
      ${leads.length?`<table class="tbl"><thead><tr><th>Empresa</th><th>Rubro</th><th>Fuente</th><th>Contacto</th><th>Valor est.</th><th></th></tr></thead><tbody>
        ${leads.map(o=>`<tr data-fic="${o.id}" style="cursor:pointer"><td><b>${o.empresa}</b></td><td style="font-size:12px">${o.rubro}</td><td style="font-size:12px">${o.fuente||'—'}</td><td style="font-size:12px">${o.contacto||'—'}</td><td>${k(o.valor)}</td><td style="text-align:right"><span class="bdg bdg-b">${(CX.crmStore.cols().find(c=>c.id===o.etapa)||{}).n}</span></td></tr>`).join('')}
      </tbody></table>`:ui.empty('🆕','Sin leads por calificar.')}
    </div>`;
  };

  /* ─── Cuentas ─── */
  const cuentasView=()=>{
    const cuentas=CX.crmStore.cuentas();
    return `<div class="card card-p">
      <div class="between" style="margin-bottom:12px"><div class="card-t">🏢 Cuentas (${cuentas.length})</div><button class="btn btn-pr btn-sm" id="newCuenta">＋ Nueva cuenta</button></div>
      <div class="grid g2" style="gap:12px">
        ${cuentas.map(c=>{const ops=CX.crmStore.list().filter(o=>o.cuentaId===c.id);const val=ops.reduce((a,o)=>a+(o.valor||0),0);return `<div class="card hov card-p" data-cuenta="${c.id}" style="cursor:pointer">
          <div class="between" style="margin-bottom:6px"><b style="font-size:14px">${c.nombre}</b><span class="bdg ${c.salud>=70?'bdg-g':c.salud>=50?'bdg-a':'bdg-r'}">salud ${c.salud}%</span></div>
          <div style="font-size:11.5px;color:var(--t3);margin-bottom:8px">${CX.paisFlag?CX.paisFlag(c.pais):''} ${c.rubro} · ${c.sucursales||0} sucursales · ${c.empleados||''}</div>
          <div class="flex" style="gap:12px;font-size:12px;color:var(--t2)"><span>📊 ${ops.length} oport.</span><span>💰 ${k(val)}</span><span>👤 ${c.owner||'—'}</span></div>
          <div style="margin-top:6px"><span class="bdg bdg-n">${c.estado}</span></div>
        </div>`;}).join('')}
      </div>
    </div>`;
  };

  /* ─── Contactos ─── */
  const contactosView=()=>{
    const contactos=CX.crmStore.contactos();
    const cuentas=CX.crmStore.cuentas();
    return `<div class="card card-p">
      <div class="between" style="margin-bottom:12px"><div class="card-t">👥 Contactos (${contactos.length})</div><button class="btn btn-pr btn-sm" id="newContacto">＋ Nuevo contacto</button></div>
      <table class="tbl"><thead><tr><th>Nombre</th><th>Cargo</th><th>Cuenta</th><th>Rol</th><th>Correo</th><th>Teléfono</th></tr></thead><tbody>
        ${contactos.map(ct=>{const cu=cuentas.find(c=>c.id===ct.cuentaId);return `<tr><td><b>${ct.nombre}</b></td><td style="font-size:12px">${ct.cargo}</td><td style="font-size:12px">${cu?cu.nombre:'—'}</td><td><span class="bdg ${ct.rol==='Decisor'?'bdg-g':ct.rol==='Influenciador'?'bdg-b':'bdg-n'}">${ct.rol}</span></td><td style="font-size:12px"><a href="mailto:${ct.email}" style="color:var(--brand)">${ct.email}</a></td><td style="font-size:12px">${ct.tel||'—'}</td></tr>`;}).join('')}
      </tbody></table>
    </div>`;
  };

  /* ─── Actividades (todas, con cadencia) ─── */
  const actividadesView=(ops)=>{
    const all=[];ops.forEach(o=>(o.acts||[]).forEach(a=>all.push({...a,emp:o.empresa,opId:o.id})));
    all.sort((a,b)=>(b.fecha||b.vence||'').localeCompare(a.fecha||a.vence||''));
    const pend=all.filter(a=>a.tipo==='tarea'&&!a.hecho);
    return `<div class="grid g2" style="gap:14px">
      <div class="card card-p"><div class="card-t" style="margin-bottom:10px">⏰ Tareas y seguimientos (${pend.length})</div>
        ${pend.length?pend.map(a=>{const venc=a.vence&&a.vence<new Date().toISOString().slice(0,10);return `<div class="between" style="padding:8px 0;border-bottom:1px solid var(--border-2)"><div><div style="font-size:12.5px;font-weight:700">${a.emp}</div><div style="font-size:11.5px;color:var(--t3)">${a.texto}</div></div><div style="text-align:right"><div style="font-size:11px;color:${venc?'var(--red)':'var(--t3)'}">${a.vence||''} ${venc?'⚠':''}</div><button class="btn btn-ghost btn-sm crm-done" data-op="${a.opId}" data-act="${a.id}" style="padding:1px 7px;font-size:10px;margin-top:3px">✓</button></div></div>`;}).join(''):'<div style="font-size:12.5px;color:var(--t3);padding:12px 0">Sin tareas pendientes.</div>'}
      </div>
      <div class="card card-p"><div class="card-t" style="margin-bottom:10px">🕐 Actividad reciente</div>
        <div style="max-height:340px;overflow:auto">
          ${all.slice(0,20).map(a=>`<div style="display:flex;gap:8px;padding:7px 0;border-bottom:1px solid var(--border-2)"><div style="font-size:14px">${emojis[a.tipo]||'•'}</div><div style="flex:1"><div style="font-size:12px;font-weight:600${a.hecho?';text-decoration:line-through;opacity:.6':''}">${a.emp} · ${a.texto}</div><div style="font-size:10.5px;color:var(--t3)">${a.fecha||a.vence||''}</div></div></div>`).join('')||'<div style="font-size:12px;color:var(--t3)">Sin actividad.</div>'}
        </div>
      </div>
    </div>`;
  };

  /* ─── Reportes ─── */
  const reportesView=(ops)=>{
    const ganados=ops.filter(o=>o.etapa==='ganado');
    const perdidos=ops.filter(o=>o.etapa==='perdido');
    const meta=CX.crmStore.meta();
    const ganado$=ganados.reduce((a,o)=>a+(o.valor||0),0);
    const porRubro={};ops.forEach(o=>{porRubro[o.rubro]=(porRubro[o.rubro]||0)+(o.valor||0);});
    const porFuente={};ops.forEach(o=>{porFuente[o.fuente||'Directo']=(porFuente[o.fuente||'Directo']||0)+1;});
    const topRubro=Object.entries(porRubro).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const maxR=Math.max(1,...topRubro.map(r=>r[1]));
    const winRate=(ganados.length+perdidos.length)?Math.round(ganados.length/(ganados.length+perdidos.length)*100):0;
    const ticket=ganados.length?ganado$/ganados.length:0;
    return `
    <div class="grid g4" style="margin-bottom:16px">
      ${ui.kpi('Cerrado',k(ganado$),'g')}
      ${ui.kpi('Win rate',winRate+'%',winRate>=50?'g':'a')}
      ${ui.kpi('Ticket promedio',k(ticket),'b')}
      ${ui.kpi('vs Meta',Math.round(ganado$/meta.mensual*100)+'%',ganado$>=meta.mensual?'g':'a')}
    </div>
    <div class="grid g2" style="gap:14px;margin-bottom:16px">
      <div class="card card-p"><div class="card-t" style="margin-bottom:12px">🏆 Producción por rubro</div>
        ${topRubro.map(([r,v])=>`<div style="margin-bottom:10px"><div class="between" style="margin-bottom:4px"><span style="font-size:12px;color:var(--t2)">${r}</span><b style="font-size:12px">${k(v)}</b></div><div class="bar" style="height:7px"><i style="width:${Math.round(v/maxR*100)}%;background:var(--brand)"></i></div></div>`).join('')}
      </div>
      <div class="card card-p"><div class="card-t" style="margin-bottom:12px">📥 Oportunidades por fuente</div>
        ${Object.entries(porFuente).sort((a,b)=>b[1]-a[1]).map(([f,n])=>`<div class="between" style="padding:6px 0;border-bottom:1px solid var(--border-2)"><span style="font-size:12.5px;color:var(--t2)">${f}</span><b>${n}</b></div>`).join('')}
        <div style="margin-top:10px">${ui.aiBox('Las fuentes con mejor conversión deben recibir más inversión comercial. Los referidos suelen tener mayor win rate.','Análisis de origen')}</div>
      </div>
    </div>
    <div class="card card-p"><div class="between" style="margin-bottom:10px"><div class="card-t">📋 Detalle de cierres</div><button class="btn btn-ghost btn-sm" id="expRep">⤓ Exportar</button></div>
      <table class="tbl"><thead><tr><th>Empresa</th><th>Rubro</th><th>Etapa</th><th>Valor</th><th>Prob.</th></tr></thead><tbody>
        ${ops.map(o=>`<tr><td><b>${o.empresa}</b></td><td style="font-size:12px">${o.rubro}</td><td><span class="bdg ${o.etapa==='ganado'?'bdg-g':o.etapa==='perdido'?'bdg-r':'bdg-b'}">${(CX.crmStore.cols().find(c=>c.id===o.etapa)||{}).n||o.etapa}</span></td><td>${k(o.valor)}</td><td style="font-size:12px">${o.prob}%</td></tr>`).join('')}
      </tbody></table>
    </div>`;
  };

  /* ─── Ficha 360 hub con pestañas navegables (Orbit360 style) ─── */
  const fichaHub=(cu)=>{
    let tab='resumen';
    const ops2=()=>CX.crmStore.list().filter(o=>o.cuentaId===cu.id);
    const cts=()=>CX.crmStore.contactos().filter(x=>x.cuentaId===cu.id);
    const correos=()=>{const a=[];ops2().forEach(o=>(o.correos||[]).forEach(c=>a.push({...c,op:o.empresa})));return a.sort((x,y)=>(''+y.fecha).localeCompare(''+x.fecha));};
    const acts=()=>{const a=[];ops2().forEach(o=>(o.acts||[]).forEach(x=>a.push({...x,op:o.empresa,opId:o.id})));return a;};
    const docs=()=>{const a=[];ops2().forEach(o=>(o.docs||[]).forEach(d=>a.push({...d,op:o.empresa})));return a;};
    const proyectos=()=>((data.projects&&typeof data.projects==='function'?data.projects():data.projects)||[]).filter(p=>p&&((p.client&&p.client.toLowerCase&&p.client.toLowerCase()===cu.nombre.toLowerCase())||(cu.proyectos&&cu.proyectos.includes(p.id))));
    const props=()=>CX.propStore?CX.propStore.forClient(cu.nombre):[];
    const esCliente=()=>data.clients&&data.clients.find&&data.clients.find(c=>c.name&&c.name.toLowerCase()===cu.nombre.toLowerCase());
    const tone=cu.salud>=70?'g':cu.salud>=50?'a':'r';
    const estC={borrador:'n',enviada:'b',aceptada:'g',rechazada:'r'};

    const TABS=[['resumen','📋 Resumen'],['oportunidades','📊 Oportunidades'],['proyectos','📁 Proyectos'],['propuestas','📄 Propuestas'],['contactos','👥 Contactos'],['correos','📨 Correos'],['docs','📎 Documentos'],['timeline','🕐 Timeline']];

    const body=()=>{
      if(tab==='resumen')return `
        <div class="grid g2" style="gap:12px">
          <div class="card card-p">
            <div class="card-t" style="font-size:12.5px;margin-bottom:8px">🏢 Datos de la cuenta</div>
            <div style="font-size:12.5px;line-height:1.9;color:var(--t2)">
              <div><b>Rubro:</b> ${cu.rubro}</div><div><b>País:</b> ${cu.pais}</div>
              <div><b>Sucursales:</b> ${cu.sucursales||0} · <b>Empleados:</b> ${cu.empleados||'—'}</div>
              <div><b>Owner:</b> ${cu.owner||'—'}</div>
              ${cu.sitio?`<div><b>Sitio:</b> <a href="https://${cu.sitio}" target="_blank" style="color:var(--brand)">${cu.sitio}</a></div>`:''}
            </div>
            <div style="margin-top:10px"><span class="bdg bdg-${tone}">salud ${cu.salud}%</span> ${esCliente()?'<span class="bdg bdg-g">✓ Cliente activo</span>':'<span class="bdg bdg-n">Prospecto</span>'}</div>
            <button class="btn btn-ghost btn-sm" id="hubEditCu" style="margin-top:10px">✎ Editar datos</button>
          </div>
          <div class="card card-p">
            <div class="card-t" style="font-size:12.5px;margin-bottom:8px">📈 Resumen 360</div>
            <div class="grid g2" style="gap:8px">
              <div class="hubStat" data-go="oportunidades" style="cursor:pointer;text-align:center;padding:10px;background:var(--panel-2);border-radius:9px"><div style="font-size:20px;font-weight:800;color:var(--brand)">${ops2().length}</div><div style="font-size:10px;color:var(--t3)">Oportunidades</div></div>
              <div class="hubStat" data-go="proyectos" style="cursor:pointer;text-align:center;padding:10px;background:var(--panel-2);border-radius:9px"><div style="font-size:20px;font-weight:800;color:var(--green)">${proyectos().length}</div><div style="font-size:10px;color:var(--t3)">Proyectos</div></div>
              <div class="hubStat" data-go="propuestas" style="cursor:pointer;text-align:center;padding:10px;background:var(--panel-2);border-radius:9px"><div style="font-size:20px;font-weight:800;color:var(--amber)">${props().length}</div><div style="font-size:10px;color:var(--t3)">Propuestas</div></div>
              <div class="hubStat" data-go="correos" style="cursor:pointer;text-align:center;padding:10px;background:var(--panel-2);border-radius:9px"><div style="font-size:20px;font-weight:800;color:var(--t1)">${correos().length}</div><div style="font-size:10px;color:var(--t3)">Correos</div></div>
            </div>
            <div style="margin-top:10px;font-size:11.5px;color:var(--t3)">Haz clic en cualquier indicador para abrir su pestaña.</div>
          </div>
        </div>`;
      if(tab==='oportunidades'){const L=ops2();return L.length?`<table class="tbl"><thead><tr><th>Oportunidad</th><th>Etapa</th><th>Valor</th><th>Prob.</th></tr></thead><tbody>${L.map(o=>`<tr class="hubOp" data-id="${o.id}" style="cursor:pointer"><td><b>${o.empresa}</b></td><td>${(CX.crmStore.cols().find(c=>c.id===o.etapa)||{}).n||o.etapa}</td><td>${k(o.valor)}</td><td>${o.prob}%</td></tr>`).join('')}</tbody></table>`:ui.empty('📊','Sin oportunidades.');}
      if(tab==='proyectos'){const L=proyectos();return `<div class="between" style="margin-bottom:10px"><span class="muted" style="font-size:12px">Proyectos/programas del cliente</span><button class="btn btn-pr btn-sm" id="hubNewProj">＋ Crear proyecto</button></div>${L.length?L.map(p=>`<div class="between hubProj" data-pid="${p.id}" style="padding:9px 11px;border:1px solid var(--border);border-radius:9px;margin-bottom:8px;cursor:pointer"><div><b style="font-size:13px">📁 ${p.name||p.nombre}</b><div style="font-size:11px;color:var(--t3)">${(p.countries||[]).join('/')} · ${p.sucursales||0} sucursales</div></div><span class="btn btn-ghost btn-sm">Abrir →</span></div>`).join(''):ui.empty('📁','Sin proyectos. Crea el programa y quedará vinculado con su HR, set-up y trazabilidad.')}`;}
      if(tab==='propuestas'){const L=props();return `<div class="between" style="margin-bottom:10px"><span class="muted" style="font-size:12px">Propuestas y cálculos del cliente</span><button class="btn btn-pr btn-sm" id="hubNewProp">＋ Nueva propuesta</button></div>${L.length?L.map(pr=>`<div class="between hubProp" data-pid="${pr.id}" style="padding:9px 11px;border:1px solid var(--border);border-radius:9px;margin-bottom:8px;cursor:pointer"><div><b style="font-size:13px">${pr.proyecto||pr.modalidad||'Propuesta'}</b><div style="font-size:11px;color:var(--t3)">${pr.moneda||''} ${(pr.total||0).toLocaleString()} · ${pr.fecha}</div></div><span class="bdg bdg-${estC[pr.estado]||'n'}">${pr.estado}</span></div>`).join(''):ui.empty('📄','Sin propuestas. Genérala desde Costos & Propuestas.')}`;}
      if(tab==='contactos'){const L=cts();return `<div class="between" style="margin-bottom:10px"><span class="muted" style="font-size:12px">Contactos del cliente</span><button class="btn btn-pr btn-sm" id="hubNewCt">＋ Contacto</button></div>${L.length?`<table class="tbl"><thead><tr><th>Nombre</th><th>Cargo</th><th>Rol</th><th>Correo</th><th></th></tr></thead><tbody>${L.map(ct=>`<tr><td><b>${ct.nombre}</b></td><td style="font-size:12px">${ct.cargo}</td><td><span class="bdg ${ct.rol==='Decisor'?'bdg-g':'bdg-n'}">${ct.rol}</span></td><td style="font-size:12px"><a href="mailto:${ct.email}" style="color:var(--brand)">${ct.email}</a></td><td style="text-align:right"><button class="btn btn-ghost btn-sm hubCtMail" data-em="${ct.email}">✉️</button></td></tr>`).join('')}</tbody></table>`:ui.empty('👥','Sin contactos.')}`;}
      if(tab==='correos'){const L=correos();return `<div class="between" style="margin-bottom:10px"><span class="muted" style="font-size:12px">Trazabilidad de correos vinculados</span><button class="btn btn-pr btn-sm" id="hubNewMail">＋ Registrar correo</button></div>${L.length?L.map(c=>`<div class="hubMail" style="padding:10px 12px;background:var(--panel-2);border-radius:9px;margin-bottom:8px;cursor:pointer"><div class="between"><b style="font-size:12.5px">✉️ ${c.asunto}</b><span style="font-size:10.5px;color:var(--t3)">${c.fecha||''}</span></div><div style="font-size:11px;color:var(--t3)">${c.de||''}</div>${c.preview?`<div style="font-size:11.5px;color:var(--t2);margin-top:3px">${c.preview}</div>`:''}</div>`).join(''):ui.empty('📨','Sin correos. Conecta el correo (Integraciones) o registra uno manual; queda con trazabilidad por cliente.')}`;}
      if(tab==='docs'){const L=docs();return `<div class="between" style="margin-bottom:10px"><span class="muted" style="font-size:12px">Documentos del cliente (briefs, protocolos, set-up)</span><label class="btn btn-pr btn-sm" style="cursor:pointer">＋ Subir<input type="file" id="hubDocF" style="display:none"></label></div>${L.length?L.map(d=>`<div style="display:flex;align-items:center;gap:10px;padding:8px 11px;border:1px solid var(--border);border-radius:9px;margin-bottom:7px"><span style="font-size:18px">📄</span><span style="font-size:12.5px;flex:1">${d.n}</span><span style="font-size:10.5px;color:var(--t3)">${d.op||''}</span></div>`).join(''):ui.empty('📎','Sin documentos. Sube briefs, protocolos o el set-up; alimentan el modelo de IA del cliente.')}`;}
      if(tab==='timeline'){const tl=[...acts().map(a=>({i:emojis[a.tipo]||'•',t:a.texto,d:a.fecha||a.vence||'',done:a.hecho})),...correos().map(c=>({i:'✉️',t:c.asunto,s:c.preview,d:c.fecha}))].sort((a,b)=>(''+b.d).localeCompare(''+a.d));return tl.length?`<div style="border-left:2px solid var(--border-2);padding-left:14px">${tl.map(a=>`<div style="position:relative;padding:8px 0"><div style="position:absolute;left:-20px;top:11px;width:9px;height:9px;border-radius:50%;background:var(--brand);border:2px solid #fff"></div><div style="font-size:12.5px;font-weight:600${a.done?';text-decoration:line-through;opacity:.6':''}">${a.i} ${a.t}</div>${a.s?`<div style="font-size:11px;color:var(--t3)">${a.s}</div>`:''}<div style="font-size:10.5px;color:var(--t3)">${a.d||''}</div></div>`).join('')}</div>`:ui.empty('🕐','Sin actividad registrada.');}
      return '';
    };

    const draw360=(ov)=>{
      ov.querySelector('#hubTabs').innerHTML=TABS.map(([t,l])=>`<button class="btn btn-sm ${tab===t?'btn-pr':'btn-ghost'} hubTab" data-t="${t}" style="font-size:11px">${l}</button>`).join('');
      ov.querySelector('#hubBody').innerHTML=body();
      ov.querySelectorAll('.hubTab').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.t;draw360(ov);}));
      ov.querySelectorAll('.hubStat,[data-go]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.go){tab=b.dataset.go;draw360(ov);}}));
      ov.querySelectorAll('.hubProj,.hubProj *').forEach(b=>{}); 
      ov.querySelectorAll('.hubProj').forEach(b=>b.addEventListener('click',()=>{const pid=b.dataset.pid;ov.__close();data.setProject&&data.setProject(pid);CX.router.nav('proyectos');}));
      ov.querySelectorAll('.hubOp').forEach(b=>b.addEventListener('click',()=>{const o=CX.crmStore.list().find(x=>x.id===b.dataset.id);if(o)ficha360(o);}));
      ov.querySelectorAll('.hubCtMail,[data-em]').forEach(b=>b.addEventListener('click',()=>window.open('mailto:'+b.dataset.em,'_blank')));
      ov.querySelector('#hubNewProj')?.addEventListener('click',()=>{ov.__close();CX.router.nav('proyectos');ui.toast('Crea el programa para '+cu.nombre,'ok');});
      ov.querySelector('#hubNewProp')?.addEventListener('click',()=>{ov.__close();CX.router.nav('costos');ui.toast('Genera la propuesta para '+cu.nombre,'ok');});
      ov.querySelector('#hubNewMail')?.addEventListener('click',()=>ui.modal('＋ Registrar correo',`<label class="lbl">Asunto</label><input class="inp" id="hmA" style="margin-bottom:8px"><label class="lbl">De</label><input class="inp" id="hmD" placeholder="correo@cliente.com" style="margin-bottom:8px"><label class="lbl">Resumen</label><textarea class="inp" id="hmP" rows="2" style="margin-bottom:10px"></textarea><div style="text-align:right"><button class="btn btn-pr btn-sm" id="hmOk">Vincular</button></div>`,{onMount:(o2,c2)=>o2.querySelector('#hmOk').addEventListener('click',()=>{const o=ops2()[0];if(o){o.correos=o.correos||[];o.correos.unshift({asunto:o2.querySelector('#hmA').value||'(sin asunto)',de:o2.querySelector('#hmD').value||'',fecha:new Date().toISOString().slice(0,10),preview:o2.querySelector('#hmP').value||''});CX.bus&&CX.bus.emit('crm');}c2();draw360(ov);ui.toast('Correo vinculado a la ficha','ok');})}));
      ov.querySelector('#hubNewCt')?.addEventListener('click',()=>ui.modal('＋ Contacto',`<label class="lbl">Nombre</label><input class="inp" id="hcN" style="margin-bottom:8px"><label class="lbl">Cargo</label><input class="inp" id="hcC" style="margin-bottom:8px"><div class="grid g2" style="gap:8px;margin-bottom:8px"><div><label class="lbl">Correo</label><input class="inp" id="hcE"></div><div><label class="lbl">Rol</label><select class="sel" id="hcR"><option>Decisor</option><option>Influenciador</option><option>Contacto</option></select></div></div><div style="text-align:right"><button class="btn btn-pr btn-sm" id="hcOk">Crear</button></div>`,{onMount:(o2,c2)=>o2.querySelector('#hcOk').addEventListener('click',()=>{const n=(o2.querySelector('#hcN').value||'').trim();if(!n){ui.toast('Nombre requerido','warn');return;}CX.crmStore.addContacto({nombre:n,cargo:o2.querySelector('#hcC').value,cuentaId:cu.id,email:o2.querySelector('#hcE').value,rol:o2.querySelector('#hcR').value});c2();draw360(ov);ui.toast('Contacto creado','ok');})}));
      ov.querySelector('#hubDocF')?.addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const o=ops2()[0];if(o){o.docs=o.docs||[];o.docs.push({n:f.name,tipo:'doc'});CX.bus&&CX.bus.emit('crm');}draw360(ov);ui.toast('Documento "'+f.name+'" vinculado','ok');});
      ov.querySelector('#hubEditCu')?.addEventListener('click',()=>ui.modal('✎ Editar cuenta',`<label class="lbl">Nombre</label><input class="inp" id="heN" value="${(cu.nombre||'').replace(/"/g,'&quot;')}" style="margin-bottom:8px"><div class="grid g2" style="gap:8px;margin-bottom:8px"><div><label class="lbl">Sucursales</label><input class="inp" id="heS" type="number" value="${cu.sucursales||0}"></div><div><label class="lbl">Salud %</label><input class="inp" id="heH" type="number" value="${cu.salud||50}"></div></div><label class="lbl">Owner</label><input class="inp" id="heO" value="${cu.owner||''}" style="margin-bottom:10px"><div style="text-align:right"><button class="btn btn-pr btn-sm" id="heOk">Guardar</button></div>`,{onMount:(o2,c2)=>o2.querySelector('#heOk').addEventListener('click',()=>{cu.nombre=o2.querySelector('#heN').value||cu.nombre;cu.sucursales=+o2.querySelector('#heS').value||cu.sucursales;cu.salud=+o2.querySelector('#heH').value||cu.salud;cu.owner=o2.querySelector('#heO').value;CX.crmStore.saveCuentas();c2();draw360(ov);ui.toast('Cuenta actualizada','ok');})}));
      ov.querySelectorAll('.hubProp').forEach(b=>b.addEventListener('click',()=>{const pr=(CX.propStore.all()).find(x=>x.id===b.dataset.pid);if(!pr)return;const introHtml=pr.intro?'<div style="font-size:12px;background:var(--panel-2);border-radius:8px;padding:10px;max-height:140px;overflow:auto">'+pr.intro+'</div>':'';ui.modal('📄 '+(pr.proyecto||'Propuesta'),'<div style="font-size:12.5px;line-height:1.8;color:var(--t2);margin-bottom:10px"><div><b>Total:</b> '+(pr.moneda||'')+' '+(pr.total||0).toLocaleString()+'</div><div><b>Estado:</b> '+pr.estado+' · <b>Creada:</b> '+pr.fecha+'</div></div>'+introHtml+'<div style="text-align:right;margin-top:10px"><button class="btn btn-pr btn-sm" id="hprEdit">✎ Retomar en Costos</button></div>',{onMount:(o2,c2)=>o2.querySelector('#hprEdit').addEventListener('click',()=>{c2();ov.__close();CX.router.nav('costos');})});}));
    };

    ui.modal('🗂️ Ficha 360 · '+cu.nombre, `
      <div id="hubTabs" class="flex wrap" style="gap:5px;margin-bottom:14px;position:sticky;top:0"></div>
      <div id="hubBody"></div>
      <div class="between" style="margin-top:14px;border-top:1px solid var(--border-2);padding-top:12px">
        <div class="flex" style="gap:8px"><button class="btn btn-soft btn-sm" id="hubMail">✉️ Enviar correo</button></div>
        ${esCliente()?`<button class="btn btn-pr btn-sm" id="hubVerCli">Ver en Clientes →</button>`:`<button class="btn btn-green btn-sm" id="hubCrearCli">＋ Convertir en Cliente</button>`}
      </div>`,
    {full:true,onMount:(ov,close)=>{
      ov.__close=close;
      draw360(ov);
      ov.querySelector('#hubMail')?.addEventListener('click',()=>{const ct=cts()[0];window.open('mailto:'+(ct?ct.email:''),'_blank');});
      ov.querySelector('#hubVerCli')?.addEventListener('click',()=>{close();CX.router.nav('clientes');});
      ov.querySelector('#hubCrearCli')?.addEventListener('click',()=>{if(data.addClient)data.addClient({name:cu.nombre,industry:cu.rubro,pais:cu.pais,estado:'Activo',plan:'estandar'});cu.estado='Cliente';CX.crmStore.saveCuentas();close();draw();ui.toast('🏆 '+cu.nombre+' ahora es Cliente activo · ficha sincronizada','ok',4000);});
    }});
  };

  const draw=()=>{
    const ops=CX.crmStore.list();
    const tabs=[['dashboard','📊 Dashboard'],['pipeline','📋 Pipeline'],['leads','🆕 Leads'],['cuentas','🏢 Cuentas'],['contactos','👥 Contactos'],['actividades','⏰ Actividades'],['reportes','📈 Reportes']];
    host.innerHTML=`
      <div class="between" style="margin-bottom:10px">
        <div>${ui.ph('CRM Comercial','Suite completa · Dashboard · Pipeline · Leads · Cuentas · Contactos · Actividades · Reportes')}</div>
        <button class="btn btn-pr btn-sm" id="crmNew">＋ Oportunidad</button>
      </div>
      <div class="flex wrap" style="gap:6px;margin-bottom:16px">
        ${tabs.map(([v,l])=>`<button class="btn btn-sm ${crmView===v?'btn-pr':'btn-ghost'}" data-view="${v}">${l}</button>`).join('')}
      </div>
      <div id="crmBody">
        ${crmView==='dashboard'?dashboardView(ops):crmView==='pipeline'?kanbanView(ops):crmView==='leads'?leadsView(ops):crmView==='cuentas'?cuentasView():crmView==='contactos'?contactosView():crmView==='actividades'?actividadesView(ops):reportesView(ops)}
      </div>`;

    host.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{crmView=b.dataset.view;draw();}));
    host.querySelectorAll('[data-op]').forEach(c=>c.addEventListener('click',()=>ficha360(CX.crmStore.list().find(x=>x.id===c.dataset.op))));
    host.querySelectorAll('[data-fic]').forEach(c=>c.addEventListener('click',()=>ficha360(CX.crmStore.list().find(x=>x.id===c.dataset.fic))));
    host.querySelectorAll('.crm-done').forEach(b=>b.addEventListener('click',(e)=>{e.stopPropagation();CX.crmStore.toggleTarea(b.dataset.op,b.dataset.act);draw();ui.toast('Tarea completada','ok');}));
    host.querySelectorAll('.crm-goto').forEach(b=>b.addEventListener('click',(e)=>{e.stopPropagation();if(b.dataset.mod)CX.router.nav(b.dataset.mod);}));

    /* Cuenta → Ficha 360 hub con pestañas (Orbit360 style) */
    host.querySelectorAll('[data-cuenta]').forEach(c=>c.addEventListener('click',()=>{
      const cu=CX.crmStore.cuentas().find(x=>x.id===c.dataset.cuenta);if(!cu)return;
      fichaHub(cu);
    }));

    /* nueva oportunidad / por columna */
    const newOpModal=(etapa)=>{const col=CX.crmStore.cols().find(c=>c.id===etapa)||CX.crmStore.cols()[0];
      ui.modal('＋ Nueva oportunidad en '+col.n,`
        <label class="lbl">Empresa</label><input class="inp" id="ncE" placeholder="Nombre de la empresa" style="margin-bottom:8px">
        <label class="lbl">Rubro</label><select class="sel" id="ncR" style="margin-bottom:8px">${(CX.RUBROS||['General']).map(r=>`<option>${r}</option>`).join('')}</select>
        <div class="grid g2" style="gap:8px;margin-bottom:8px"><div><label class="lbl">Valor est.</label><input class="inp" id="ncV" type="number"></div><div><label class="lbl">País</label><select class="sel" id="ncP">${(CX.COUNTRIES||[{c:'GT'}]).map(c=>`<option value="${c.c}">${c.c}</option>`).join('')}</select></div></div>
        <div class="grid g2" style="gap:8px;margin-bottom:8px"><div><label class="lbl">Contacto</label><input class="inp" id="ncC" placeholder="Nombre"></div><div><label class="lbl">Fuente</label><select class="sel" id="ncF"><option>Referido</option><option>LinkedIn</option><option>RFP</option><option>Web</option><option>Evento</option><option>Directo</option></select></div></div>
        <div style="text-align:right"><button class="btn btn-pr btn-sm" id="ncSave">Crear</button></div>
      `,{onMount:(ov,close)=>ov.querySelector('#ncSave').addEventListener('click',()=>{const e=(ov.querySelector('#ncE').value||'').trim();if(!e){ui.toast('Nombre requerido','warn');return;}CX.crmStore.add({empresa:e,rubro:ov.querySelector('#ncR').value,pais:ov.querySelector('#ncP').value,valor:+ov.querySelector('#ncV').value||0,contacto:ov.querySelector('#ncC').value,fuente:ov.querySelector('#ncF').value,etapa});close();draw();ui.toast('Oportunidad creada','ok');})});
    };
    host.querySelectorAll('[data-newcol]').forEach(b=>b.addEventListener('click',()=>newOpModal(b.dataset.newcol)));
    host.querySelector('#crmNew')?.addEventListener('click',()=>newOpModal('nuevo'));
    host.querySelector('#newLead')?.addEventListener('click',()=>newOpModal('nuevo'));

    /* columnas */
    host.querySelector('#addCol')?.addEventListener('click',()=>ui.modal('＋ Nueva columna',`
      <div class="grid g2" style="gap:8px;margin-bottom:12px"><div><label class="lbl">Nombre</label><input class="inp" id="clN" placeholder="Ej. Demo"></div><div><label class="lbl">Icono</label><input class="inp" id="clI" value="📌" style="max-width:80px"></div></div>
      <label class="lbl">Color</label><input class="inp" id="clC" type="color" value="#6366f1" style="height:36px;margin-bottom:12px">
      <div style="text-align:right"><button class="btn btn-pr btn-sm" id="clSave">Agregar</button></div>
    `,{onMount:(ov,close)=>ov.querySelector('#clSave').addEventListener('click',()=>{CX.crmStore.addCol({ic:ov.querySelector('#clI').value,n:ov.querySelector('#clN').value.trim()||'Nueva',color:ov.querySelector('#clC').value});close();draw();ui.toast('Columna agregada','ok');})}));
    host.querySelectorAll('[data-editcol]').forEach(b=>b.addEventListener('click',(e)=>{e.stopPropagation();const col=CX.crmStore.cols().find(c=>c.id===b.dataset.editcol);if(!col)return;
      ui.modal('✎ Editar columna · '+col.n,`
        <div class="grid g2" style="gap:8px;margin-bottom:10px"><div><label class="lbl">Nombre</label><input class="inp" id="ecN" value="${col.n}"></div><div><label class="lbl">Icono</label><input class="inp" id="ecI" value="${col.ic}" style="max-width:80px"></div></div>
        <label class="lbl">Color</label><input class="inp" id="ecC" type="color" value="${col.color}" style="height:36px;margin-bottom:12px">
        <div class="between"><button class="btn btn-ghost btn-sm" id="ecDel" style="color:var(--red)">🗑 Eliminar</button><button class="btn btn-pr btn-sm" id="ecSave">Guardar</button></div>
      `,{onMount:(ov,close)=>{ov.querySelector('#ecSave').addEventListener('click',()=>{CX.crmStore.editCol(col.id,{n:ov.querySelector('#ecN').value.trim()||col.n,ic:ov.querySelector('#ecI').value||col.ic,color:ov.querySelector('#ecC').value});close();draw();ui.toast('Columna actualizada','ok');});ov.querySelector('#ecDel').addEventListener('click',()=>{CX.crmStore.delCol(col.id);close();draw();ui.toast('Columna eliminada','');});}});
    }));

    /* nueva cuenta / contacto */
    host.querySelector('#newCuenta')?.addEventListener('click',()=>ui.modal('＋ Nueva cuenta / cliente',`
      <div id="cuIAbox" style="margin-bottom:14px;border:1px dashed var(--brand);border-radius:10px;padding:12px">
        <div style="font-size:12.5px;font-weight:700;color:var(--brand-dark);margin-bottom:4px">✨ Crear inteligente desde documento (opcional)</div>
        <div style="font-size:11.5px;color:var(--t2);margin-bottom:8px">Sube un brief, RFP, tarjeta de presentación o cualquier documento del cliente (PDF, Word, Excel, imagen). La IA extrae empresa, rubro, contacto y datos, y rellena el formulario.</div>
        <label class="btn btn-soft btn-sm" style="cursor:pointer;display:block;text-align:center">📎 Subir documento (PDF · Word · Excel · imagen)<input type="file" id="cuFile" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt" style="display:none"></label>
        <div id="cuFileName" style="font-size:11.5px;color:var(--t3);margin-top:6px;text-align:center"></div>
      </div>
      <div class="card-t" style="font-size:12px;margin-bottom:8px">🏢 Datos de la empresa</div>
      <label class="lbl">Nombre de la empresa *</label><input class="inp" id="cuN" style="margin-bottom:8px">
      <div class="grid g2" style="gap:8px;margin-bottom:8px"><div><label class="lbl">Rubro</label><select class="sel" id="cuR">${(CX.RUBROS||['General']).map(r=>`<option>${r}</option>`).join('')}</select></div><div><label class="lbl">País</label><select class="sel" id="cuP">${(CX.COUNTRIES||[{c:'GT'}]).map(c=>`<option value="${c.c}">${c.c}</option>`).join('')}</select></div></div>
      <div class="grid g2" style="gap:8px;margin-bottom:8px"><div><label class="lbl">Ciudad</label><input class="inp" id="cuCity"></div><div><label class="lbl">Sitio web</label><input class="inp" id="cuWeb" placeholder="empresa.com"></div></div>
      <div class="grid g2" style="gap:8px;margin-bottom:12px"><div><label class="lbl">Sucursales</label><input class="inp" id="cuS" type="number"></div><div><label class="lbl">Empleados</label><input class="inp" id="cuE" placeholder="100-200"></div></div>
      <div class="card-t" style="font-size:12px;margin-bottom:8px">👤 Contacto principal</div>
      <div class="grid g2" style="gap:8px;margin-bottom:8px"><div><label class="lbl">Nombre</label><input class="inp" id="cuCtN"></div><div><label class="lbl">Cargo</label><input class="inp" id="cuCtC"></div></div>
      <div class="grid g2" style="gap:8px;margin-bottom:8px"><div><label class="lbl">Correo</label><input class="inp" id="cuCtE"></div><div><label class="lbl">Teléfono</label><input class="inp" id="cuCtT"></div></div>
      <label class="lbl">Notas</label><textarea class="inp" id="cuNota" rows="2" placeholder="Contexto, necesidad detectada, origen del contacto…" style="margin-bottom:10px"></textarea>
      <label class="flex" style="gap:7px;font-size:12.5px;margin-bottom:12px;cursor:pointer"><input type="checkbox" id="cuEsCli"> Registrar también como Cliente activo (crea expediente y trazabilidad)</label>
      <div style="text-align:right"><button class="btn btn-pr btn-sm" id="cuSave">Crear cuenta + contacto</button></div>
    `,{onMount:(ov,close)=>{
      ov.querySelector('#cuModoManual').addEventListener('click',()=>{ov.querySelector('#cuIAbox').style.display='none';ov.querySelector('#cuModoManual').className='btn btn-sm btn-pr';ov.querySelector('#cuModoIA').className='btn btn-sm btn-ghost';});
      ov.querySelector('#cuModoIA').addEventListener('click',()=>{ov.querySelector('#cuIAbox').style.display='block';ov.querySelector('#cuModoIA').className='btn btn-sm btn-pr';ov.querySelector('#cuModoManual').className='btn btn-sm btn-ghost';});
      ov.querySelector('#cuFile').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;ov.querySelector('#cuFileName').textContent='Analizando '+f.name+'…';
        const fill=()=>{const base=f.name.replace(/\.[^.]+$/,'').replace(/[_-]/g,' ');ov.querySelector('#cuN').value=ov.querySelector('#cuN').value||base.replace(/\b\w/g,c=>c.toUpperCase());ov.querySelector('#cuNota').value=ov.querySelector('#cuNota').value||('Extraído de '+f.name+' con IA.');ov.querySelector('#cuFileName').textContent='✓ Datos extraídos de '+f.name+' — revisa y completa.';ui.toast('IA extrajo los datos del documento','ok');};
        if(CX.ai&&CX.ai.ready()){CX.ai.ask('Extrae de este documento ('+f.name+') el nombre de la empresa, rubro, contacto y datos. Responde breve.').then(fill).catch(fill);}else setTimeout(fill,800);
      });
      ov.querySelector('#cuSave').addEventListener('click',()=>{
        const n=(ov.querySelector('#cuN').value||'').trim();if(!n){ui.toast('Nombre requerido','warn');return;}
        const nuevaCuenta={nombre:n,rubro:ov.querySelector('#cuR').value,pais:ov.querySelector('#cuP').value,ciudad:ov.querySelector('#cuCity').value,sitio:ov.querySelector('#cuWeb').value,sucursales:+ov.querySelector('#cuS').value||0,empleados:ov.querySelector('#cuE').value,nota:ov.querySelector('#cuNota').value};
        CX.crmStore.addCuenta(nuevaCuenta);
        const cuId=CX.crmStore.cuentas()[0].id;
        const ctN=(ov.querySelector('#cuCtN').value||'').trim();
        if(ctN)CX.crmStore.addContacto({nombre:ctN,cargo:ov.querySelector('#cuCtC').value,cuentaId:cuId,email:ov.querySelector('#cuCtE').value,tel:ov.querySelector('#cuCtT').value,rol:'Decisor'});
        if(ov.querySelector('#cuEsCli').checked&&data.addClient){data.addClient({name:n,industry:ov.querySelector('#cuR').value,pais:ov.querySelector('#cuP').value,estado:'Activo',plan:'estandar'});}
        close();draw();ui.toast('✓ Cuenta'+(ctN?' + contacto':'')+(ov.querySelector('#cuEsCli').checked?' + cliente':'')+' creados y vinculados','ok',4000);
      });
    }}));
    host.querySelector('#newContacto')?.addEventListener('click',()=>{const cuentas=CX.crmStore.cuentas();ui.modal('＋ Nuevo contacto',`
      <label class="lbl">Nombre</label><input class="inp" id="coN" style="margin-bottom:8px">
      <label class="lbl">Cargo</label><input class="inp" id="coC" style="margin-bottom:8px">
      <label class="lbl">Cuenta</label><select class="sel" id="coAc" style="margin-bottom:8px">${cuentas.map(c=>`<option value="${c.id}">${c.nombre}</option>`).join('')}</select>
      <div class="grid g2" style="gap:8px;margin-bottom:8px"><div><label class="lbl">Correo</label><input class="inp" id="coE"></div><div><label class="lbl">Teléfono</label><input class="inp" id="coT"></div></div>
      <label class="lbl">Rol</label><select class="sel" id="coR" style="margin-bottom:12px"><option>Decisor</option><option>Influenciador</option><option>Contacto</option></select>
      <div style="text-align:right"><button class="btn btn-pr btn-sm" id="coSave">Crear contacto</button></div>
    `,{onMount:(ov,close)=>ov.querySelector('#coSave').addEventListener('click',()=>{const n=(ov.querySelector('#coN').value||'').trim();if(!n){ui.toast('Nombre requerido','warn');return;}CX.crmStore.addContacto({nombre:n,cargo:ov.querySelector('#coC').value,cuentaId:ov.querySelector('#coAc').value,email:ov.querySelector('#coE').value,tel:ov.querySelector('#coT').value,rol:ov.querySelector('#coR').value});close();draw();ui.toast('Contacto creado','ok');})});});

    /* meta */
    host.querySelector('#editMeta')?.addEventListener('click',()=>{const m=CX.crmStore.meta();ui.modal('🎯 Ajustar meta comercial',`
      <label class="lbl">Meta mensual (${cur()})</label><input class="inp" id="mM" type="number" value="${m.mensual}" style="margin-bottom:8px">
      <label class="lbl">Meta trimestral (${cur()})</label><input class="inp" id="mT" type="number" value="${m.trimestral}" style="margin-bottom:12px">
      <div style="text-align:right"><button class="btn btn-pr btn-sm" id="mSave">Guardar</button></div>
    `,{onMount:(ov,close)=>ov.querySelector('#mSave').addEventListener('click',()=>{CX.crmStore.setMeta({mensual:+ov.querySelector('#mM').value||m.mensual,trimestral:+ov.querySelector('#mT').value||m.trimestral});close();draw();ui.toast('Meta actualizada','ok');})})});
    host.querySelector('#expRep')?.addEventListener('click',()=>ui.toast('Reporte exportado (demo)','ok'));

    /* KPI drills */
    const allOps=CX.crmStore.list();
    const km={pipe:['Pipeline activo',allOps.filter(o=>!['ganado','perdido'].includes(o.etapa))],pond:['Ponderado',allOps.filter(o=>!['ganado','perdido'].includes(o.etapa))],gan:['Ganados',allOps.filter(o=>o.etapa==='ganado')],task:['Tareas pendientes',CX.crmStore.tareas()]};
    host.querySelectorAll('#crmKpis [data-ck]').forEach(el=>el.addEventListener('click',()=>{const d=km[el.dataset.ck];const L=d[1];ui.modal(d[0]+' ('+L.length+')',L.length?`<table class="tbl"><thead><tr><th>Empresa</th><th>Etapa/Tipo</th><th>Valor</th></tr></thead><tbody>${L.map(x=>`<tr><td><b>${x.empresa||x.op||x.texto}</b></td><td style="font-size:12px">${(x.etapa&&(CX.crmStore.cols().find(c=>c.id===x.etapa)||{}).n)||x.tipo||''}</td><td>${x.valor?k(x.valor):'—'}</td></tr>`).join('')}</tbody></table>`:ui.empty('🤝','Sin registros.'));}));
  };

  draw();
  CX.bus.on('crm',()=>draw());
  return host;
});
