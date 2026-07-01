/* ============================================================
   CXOrbia · Automatizaciones (Make) + alertas de pendientes
   - Cada evento del bus puede disparar una automatización (webhook
     Make / WhatsApp / correo). Editable y configurable por tenant.
   - Notifica al equipo TODOS los movimientos del shopper.
   - Detecta visitas atrasadas / pendientes / desactualizadas y
     genera alertas.
   Genérico/white-label. En demo "dispara" = notif + log; en
   producción = POST al webhook de Make configurado.
   ============================================================ */
window.CX = window.CX || {};

(function(){
  const LS='cx_automations', LS_HOOK='cx_make_hook', LS_LOG='cx_auto_log';

  /* catálogo por defecto de automatizaciones (todas editables/activables) */
  function defaults(){
    return [
      {id:'a_postulacion', evento:'postulacion', activa:true,  canal:'whatsapp', to:'admin', titulo:'Nueva postulación', plantilla:'{shopper} se postuló a {sucursal}'},
      {id:'a_agenda',      evento:'agenda',      activa:true,  canal:'push',     to:'admin', titulo:'Visita agendada', plantilla:'{shopper} agendó {sucursal} para {fecha}'},
      {id:'a_realizada',   evento:'realizada',   activa:true,  canal:'push',     to:'admin', titulo:'Visita realizada', plantilla:'{shopper} realizó {sucursal} · validar cuestionario'},
      {id:'a_cuestionario',evento:'cuestionario',activa:true,  canal:'push',     to:'admin', titulo:'Cuestionario enviado', plantilla:'{shopper} envió el cuestionario de {sucursal} (score {score})'},
      {id:'a_reprog',      evento:'reprog',      activa:true,  canal:'whatsapp', to:'admin', titulo:'Reprogramación solicitada', plantilla:'{shopper} pide reprogramar {sucursal}'},
      {id:'a_pago',        evento:'pago',        activa:true,  canal:'whatsapp', to:'shopper', titulo:'Pago realizado', plantilla:'Tu liquidación de {sucursal} pasó a pagada'},
      {id:'a_atraso',      evento:'atraso',      activa:true,  canal:'whatsapp', to:'admin', titulo:'Visita atrasada', plantilla:'{sucursal} sin avance · vence {fecha}'},
      {id:'a_aprobacion',  evento:'aprobacion',  activa:true,  canal:'whatsapp', to:'shopper', titulo:'Postulación aprobada', plantilla:'Tu visita a {sucursal} fue aprobada'},
      {id:'a_hr_writeback',evento:'hr_writeback', activa:true,  canal:'sheet',    to:'admin', titulo:'HR actualizada', plantilla:'{sucursal}: {shopper} · {fecha} · {estado} (sincronizado a la HR)'},
      {id:'a_shopper_edit',evento:'shopper_edit', activa:true,  canal:'push',     to:'admin', titulo:'Datos de shopper actualizados', plantilla:'{shopper} actualizó: {campos}'},
    ];
  }

  /* ---------- Proveedor de IA (configurable · por defecto Gemini económico) ---------- */
  CX.ai = {
    _cfg:null,
    defaults(){ return {provider:'', model:'', apiKey:'', endpoint:'', activa:false, cacheTpl:true}; },
    cfg(){ if(this._cfg)return this._cfg; try{ this._cfg=Object.assign(this.defaults(), JSON.parse(localStorage.getItem('cx_ai')||'{}')); }catch(e){ this._cfg=this.defaults(); } return this._cfg; },
    save(patch){ this._cfg=Object.assign(this.cfg(), patch||{}); try{ localStorage.setItem('cx_ai', JSON.stringify(this._cfg)); }catch(e){} },
    ready(){ const c=this.cfg(); return c.activa && c.provider && (c.apiKey||c.endpoint); },
    /* Llamada REAL al proveedor configurado. Enruta a Gemini/OpenAI/Anthropic según provider.
       Devuelve Promise<string>. Si no hay key, rechaza (los módulos caen a su heurística). */
    ask(prompt, opts){
      const c=this.cfg(); opts=opts||{};
      if(!c.activa || !c.provider || !(c.apiKey||c.endpoint)) return Promise.reject(new Error('IA no configurada'));
      const model=c.model||(this.PROVIDERS[c.provider]&&this.PROVIDERS[c.provider].modelos[0]);
      try{
        if(c.provider==='gemini'){
          const url='https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent?key='+encodeURIComponent(c.apiKey);
          return fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}]})})
            .then(r=>r.json()).then(j=>{const t=j&&j.candidates&&j.candidates[0]&&j.candidates[0].content&&j.candidates[0].content.parts[0].text; if(!t)throw new Error('Sin respuesta'); return t;});
        }
        if(c.provider==='openai'){
          return fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+c.apiKey},body:JSON.stringify({model:model,messages:[{role:'user',content:prompt}]})})
            .then(r=>r.json()).then(j=>{const t=j&&j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content; if(!t)throw new Error('Sin respuesta'); return t;});
        }
        if(c.provider==='anthropic'){
          return fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':c.apiKey,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:model,max_tokens:opts.maxTokens||1500,messages:[{role:'user',content:prompt}]})})
            .then(r=>r.json()).then(j=>{const t=j&&j.content&&j.content[0]&&j.content[0].text; if(!t)throw new Error('Sin respuesta'); return t;});
        }
        if(c.provider==='custom' && c.endpoint){
          return fetch(c.endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(c.apiKey?{'Authorization':'Bearer '+c.apiKey}:{})},body:JSON.stringify({prompt:prompt,model:model})})
            .then(r=>r.json()).then(j=>j.text||j.output||j.response||JSON.stringify(j));
        }
      }catch(e){ return Promise.reject(e); }
      return Promise.reject(new Error('Proveedor no soportado'));
    },
    /* Catálogo SIN sesgo: cada consultora elige el modelo por costo/beneficio.
       costo = índice relativo de costo por 1M tokens (1=más barato). */
    PROVIDERS:{
      gemini:{label:'Google Gemini', modelos:['gemini-2.0-flash','gemini-1.5-flash','gemini-1.5-flash-8b','gemini-1.5-pro'], costo:1, fuerte:'Costo bajo + multimodal + tokens largos', ideal:'Operación diaria, importadores, alto volumen'},
      openai:{label:'OpenAI (ChatGPT)', modelos:['gpt-4o-mini','gpt-4o','o1-mini'], costo:2, fuerte:'Ecosistema maduro, razonamiento sólido', ideal:'Set-up complejo, propuestas, análisis'},
      anthropic:{label:'Anthropic (Claude)', modelos:['claude-3-5-haiku','claude-3-5-sonnet','claude-3-opus'], costo:3, fuerte:'Mejor redacción y documentos largos', ideal:'Instructivos, manuales, copy de marca'},
      custom:{label:'Endpoint propio / otro', modelos:['custom'], costo:0, fuerte:'Modelo local o proveedor propio', ideal:'Cumplimiento/privacidad estricta'}
    },
  };

  /* ---------- Iterar/refinar lo entregado por IA (reutilizable en todo importador) ----------
     ui.modal con una caja de "instrucción de ajuste" + botón Regenerar. onRegen(instruccion)
     debe devolver el nuevo resultado; onAccept(resultado) lo confirma. */
  CX.aiIterate = function(opts){
    const ui=CX.ui; let result=opts.initial;
    const preview=(r)=> (opts.render? opts.render(r) : '<pre style="white-space:pre-wrap;font-size:12px;color:var(--t2);max-height:34vh;overflow:auto">'+JSON.stringify(r,null,2)+'</pre>');
    const body=()=>`
      <div style="font-size:11.5px;color:var(--t3);margin-bottom:8px">${opts.hint||'Revisa lo que generó la IA. Si quieres ajustarlo, escribe una instrucción y regenera; repite hasta que quede bien.'}</div>
      <div id="aiPrev" style="border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:12px;background:var(--panel-2)">${preview(result)}</div>
      <label class="lbl">Instrucción de ajuste (opcional)</label>
      <textarea class="inp" id="aiInstr" rows="2" placeholder="Ej. agrega una sección de limpieza; sube el peso de atención; menos preguntas…" style="margin-bottom:10px"></textarea>
      <div class="between"><button class="btn btn-soft btn-sm" id="aiRegen">🔄 Regenerar con ajuste</button>
        <button class="btn btn-green btn-sm" id="aiAccept">✓ Usar este resultado</button></div>`;
    ui.modal(opts.title||'🤖 Resultado de la IA · iterar', body(),{onMount:(ov,close)=>{
      const wire=()=>{
        ov.querySelector('#aiRegen').addEventListener('click',()=>{
          const instr=(ov.querySelector('#aiInstr').value||'').trim();
          result = opts.onRegen ? opts.onRegen(instr, result) : result;
          ov.querySelector('#aiPrev').innerHTML=preview(result);
          ov.querySelector('#aiInstr').value='';
          ui.toast(CX.ai&&CX.ai.ready()?'Regenerado con IA':'Ajustado (configura Gemini para refinamiento real)','ok');
          wire();
        });
        ov.querySelector('#aiAccept').addEventListener('click',()=>{ close(); opts.onAccept&&opts.onAccept(result); });
      };
      wire();
    }});
  };

  CX.automations = {
    /* #167 — asignación de responsables a ítems que requieren gestión interna */
    _akey:'cx_asignaciones',
    asignaciones(){ try{return JSON.parse(localStorage.getItem(this._akey)||'[]');}catch(e){return [];} },
    asignar(item){ const a=this.asignaciones(); a.unshift(Object.assign({id:'asg'+Date.now().toString(36),fecha:new Date().toISOString().slice(0,10),estado:'pendiente'},item));
      try{localStorage.setItem(this._akey,JSON.stringify(a));}catch(e){}
      CX.notif&&CX.notif.push({to:item.responsableRol||'admin',tipo:'asignacion',icon:'📌',tono:'a',titulo:'Tarea asignada: '+(item.titulo||''),txt:(item.detalle||'')+' · responsable: '+(item.responsable||''),nav:item.nav||'midia'});
      CX.bus&&CX.bus.emit('asignaciones'); return a[0]; },
    resolverAsignacion(id){ const a=this.asignaciones(); const x=a.find(i=>i.id===id); if(x){x.estado='resuelta';x.resueltaFecha=new Date().toISOString().slice(0,10);} try{localStorage.setItem(this._akey,JSON.stringify(a));}catch(e){} CX.bus&&CX.bus.emit('asignaciones'); },
    pendientesPara(rol){ return this.asignaciones().filter(a=>a.estado==='pendiente'&&(!rol||a.responsableRol===rol||a.responsableRol==='admin')); },
    /* #185 — bitácora de acciones operativas persistible (aprobar/rechazar/reprogramar/reasignar/pagar) */
    _aud:'cx_audit_ops',
    audit(){ try{return JSON.parse(localStorage.getItem(this._aud)||'[]');}catch(e){return [];} },
    logAction(accion, ref, detalle){
      const a=this.audit();
      const por=(CX.session&&CX.session.user&&CX.session.user.name)||'—';
      a.unshift({id:'au'+Date.now().toString(36),accion,ref:ref||'',detalle:detalle||'',por,fecha:new Date().toISOString().replace('T',' ').slice(0,16)});
      try{localStorage.setItem(this._aud,JSON.stringify(a.slice(0,1000)));}catch(e){}
      CX.bus&&CX.bus.emit('audit'); return a[0];
    },
    auditFor(ref){ return this.audit().filter(x=>x.ref===ref); },
    CANALES:{push:'Notificación in-app', whatsapp:'WhatsApp (Make)', correo:'Correo (Make)', sheet:'Google Sheets (Make)'},
    EVENTOS:{postulacion:'Postulación creada', agenda:'Visita agendada', realizada:'Visita realizada', cuestionario:'Cuestionario enviado', reprog:'Reprogramación', pago:'Pago/liquidación', atraso:'Visita atrasada/pendiente', aprobacion:'Postulación aprobada', hr_writeback:'Escritura de vuelta a HR', shopper_edit:'Cambio de datos del shopper'},

    list(){ try{ const s=JSON.parse(localStorage.getItem(LS)||'null'); if(s&&s.length) return s; }catch(e){} return defaults(); },
    save(list){ try{ localStorage.setItem(LS, JSON.stringify(list)); }catch(e){} CX.bus&&CX.bus.emit('automations'); },
    get(id){ return this.list().find(a=>a.id===id); },
    update(id, patch){ const l=this.list(); const a=l.find(x=>x.id===id); if(a){Object.assign(a,patch); this.save(l);} return a; },
    reset(){ try{ localStorage.removeItem(LS); }catch(e){} CX.bus&&CX.bus.emit('automations'); },

    /* tenant activo (cada consultora guarda SUS propios webhooks; p.ej. TyA usa los suyos) */
    tenantId(){ try{ return (CX.session&&CX.session.tenant)|| (CX.theme&&CX.theme.active&&CX.theme.active())||'default'; }catch(e){ return 'default'; } },
    _hooks(){ try{ return JSON.parse(localStorage.getItem(LS_HOOK)||'{}'); }catch(e){ return {}; } },
    /* hook efectivo: override por automatación > webhook del tenant */
    hook(autoId){ const h=this._hooks(); if(autoId){ const a=this.list().find(x=>x.id===autoId); if(a&&a.hook) return a.hook; } if(typeof h==='string') return h; return h[this.tenantId()]||''; },
    setHook(url){ const h=this._hooks(); const map=(typeof h==='string')?{}:h; map[this.tenantId()]=url||''; try{ localStorage.setItem(LS_HOOK, JSON.stringify(map)); }catch(e){} },

    log(){ try{ return JSON.parse(localStorage.getItem(LS_LOG)||'[]'); }catch(e){ return []; } },
    _pushLog(rec){ try{ const l=this.log(); l.unshift(rec); localStorage.setItem(LS_LOG, JSON.stringify(l.slice(0,40))); }catch(e){} },

    _fill(tpl, ctx){ return (tpl||'').replace(/\{(\w+)\}/g, (_,k)=> ctx[k]!=null?ctx[k]:''); },

    /* dispara las automatizaciones activas para un evento de negocio */
    fire(evento, ctx={}){
      this.list().filter(a=>a.activa && a.evento===evento).forEach(a=>{
        const txt=this._fill(a.plantilla, ctx);
        // notificación in-app siempre (centro de eventos)
        CX.notif && CX.notif.push({to:a.to, tipo:evento, icon:this._icon(evento), tono:this._tone(evento), titulo:a.titulo, txt, nav:this._nav(a.to,evento)});
        // canal externo vía Make (demo = log) — usa el webhook de la automatación o el del tenant
        if(a.canal!=='push'){
          this._pushLog({fecha:new Date().toISOString().slice(0,16).replace('T',' '), canal:a.canal, evento, titulo:a.titulo, txt, hook:this.hook(a.id)||'(webhook Make sin configurar)'});
        }
      });
    },
    _icon(e){ return {postulacion:'📩',agenda:'📅',realizada:'✅',cuestionario:'📝',reprog:'🔄',pago:'💰',atraso:'⏰',aprobacion:'✅',hr_writeback:'🔃',shopper_edit:'✏️'}[e]||'🔔'; },
    _tone(e){ return {postulacion:'b',agenda:'g',realizada:'b',cuestionario:'b',reprog:'a',pago:'g',atraso:'r',aprobacion:'g',hr_writeback:'b',shopper_edit:'b'}[e]||'b'; },
    _nav(to,e){ if(to==='shopper') return e==='pago'?'beneficios':'misvisitas'; return e==='atraso'?'visitas':'postulaciones'; },

    /* escanea visitas y detecta atrasadas / pendientes / desactualizadas */
    scanPendientes(){
      const hoy=new Date(); const out={atrasadas:[],pendientes:[],desactualizadas:[]};
      (CX.data._visitas||[]).filter(v=>v.projectId===CX.data.currentProjectId).forEach(v=>{
        const ref=v.agendada||v.disponibleDesde; const d=ref?new Date(ref+'T12:00:00'):null;
        if(['asignada','agendada'].includes(v.estado) && d && d<hoy) out.atrasadas.push(v);
        else if(v.estado==='realizada') out.pendientes.push(v);          // pend. cuestionario
        else if(v.estado==='asignada' && !v.agendada) out.desactualizadas.push(v); // sin agendar
      });
      return out;
    },
    /* genera alertas (notif) para lo atrasado/pendiente */
    notifyPendientes(){
      const s=this.scanPendientes(); let n=0;
      s.atrasadas.forEach(v=>{ this.fire('atraso',{sucursal:v.sucursal, fecha:v.agendada||v.disponibleDesde||'—', shopper:v.shopper||'sin asignar'}); n++; });
      return {alertas:n, ...s};
    },
  };
})();
