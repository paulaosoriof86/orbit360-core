/* CXOrbia · Soporte (Asistente IA + Bandeja de solicitudes) */
CX.supportStore = CX.supportStore || {
  _t:null,
  TIPOS:['Plataforma','Capacitación plataforma','Capacitación personal','Técnica','Comercial','Servicio','Otra'],
  seed(){ return [
    {id:'t1',de:'Evaluador 03',rol:'shopper',tipo:'Plataforma',asunto:'No puedo subir evidencia',estado:'abierto',prio:'alta',fecha:'2026-06-22'},
    {id:'t2',de:'Cliente Retail',rol:'cliente',tipo:'Comercial',asunto:'Solicito propuesta para 2 marcas más',estado:'abierto',prio:'media',fecha:'2026-06-21'},
    {id:'t3',de:'Evaluador 07',rol:'shopper',tipo:'Capacitación personal',asunto:'Dudas sobre el protocolo de tiempos',estado:'en_proceso',prio:'media',fecha:'2026-06-20'},
    {id:'t4',de:'Coordinación HN',rol:'admin',tipo:'Técnica',asunto:'Sincronizar HR externa de Honduras',estado:'resuelto',prio:'baja',fecha:'2026-06-18'},
  ]; },
  list(){ if(!this._t) this._t=this.seed(); return this._t; },
  add(t){ this.list().unshift(Object.assign({id:'t'+Date.now().toString(36),estado:'abierto',prio:'media',fecha:new Date().toISOString().slice(0,10)},t));
    CX.notif&&CX.notif.push({to:'admin',tipo:'soporte',icon:'🆘',tono:'a',titulo:'Nueva solicitud de soporte',txt:(t.de||'')+' · '+(t.asunto||''),nav:'soporte'});
    CX.bus&&CX.bus.emit('support'); },
  setEstado(id,e){ const t=this.list().find(x=>x.id===id); if(t){const prev=t.estado;t.estado=e;
    /* #173 — notificar al solicitante el cambio de estado (datos vivos, sincronía real) */
    if(prev!==e && t.rol){ const lbl={abierto:'Abierto',en_proceso:'En proceso',resuelto:'Resuelto'}[e]||e;
      CX.notif&&CX.notif.push({to:t.rol,tipo:'soporte',icon:'🆘',tono:e==='resuelto'?'g':'b',titulo:'Tu solicitud de soporte: '+lbl,txt:(t.asunto||'')+(t.nota?' · '+t.nota:''),nav:'soporte'});
      if(CX.automations&&CX.automations.fire)CX.automations.fire('soporte_estado',{de:t.de,rol:t.rol,asunto:t.asunto,estado:e}); }
    CX.bus&&CX.bus.emit('support');} },
};

CX.module('soporte', ({data,role,ui})=>{
  const p=data.project();
  const ctx=`Proyecto activo: ${p.name} (${p.industry}), países ${p.countries.join('/')}, escenarios: ${p.scenarios.join(', ')}. Honorario GT Q60 + combo + boleto reembolsados. Rango de visita típico 12–18 jun.`;
  const host=document.createElement('div');
  let tab=role==='admin'?'bandeja':'ia';

  const estTone={abierto:'a',en_proceso:'b',resuelto:'g'};
  const prioTone={alta:'r',media:'a',baja:'n'};
  const estLbl={abierto:'Abierto',en_proceso:'En proceso',resuelto:'Resuelto'};

  const bandejaHTML=()=>{
    const ts=CX.supportStore.list();
    const ab=ts.filter(t=>t.estado==='abierto').length, pr=ts.filter(t=>t.estado==='en_proceso').length, rs=ts.filter(t=>t.estado==='resuelto').length;
    return `
      <div class="grid g4" style="margin-bottom:16px" id="spKpis">
        <div data-sk="all" style="cursor:pointer">${ui.kpi('Solicitudes',ts.length,'b')}</div>
        <div data-sk="abierto" style="cursor:pointer">${ui.kpi('Abiertas',ab,'a')}</div>
        <div data-sk="en_proceso" style="cursor:pointer">${ui.kpi('En proceso',pr,'b')}</div>
        <div data-sk="resuelto" style="cursor:pointer">${ui.kpi('Resueltas',rs,'g')}</div>
      </div>
      <div class="card card-p">
        <div class="card-h"><div class="card-t">📥 Bandeja de solicitudes</div><span class="muted" style="font-size:11px">de shoppers, clientes y equipo</span></div>
        <div style="overflow-x:auto"><table class="tbl"><thead><tr><th>De</th><th>Tipo</th><th>Asunto</th><th>Prioridad</th><th>Estado</th><th>Fecha</th><th></th></tr></thead><tbody>
        ${ts.map(t=>`<tr><td><b style="font-size:12.5px">${t.de}</b><div style="font-size:10px;color:var(--t3)">${t.rol}</div></td>
          <td style="font-size:12px">${t.tipo}</td><td style="font-size:12.5px">${t.asunto}</td>
          <td>${ui.bdg(t.prio,prioTone[t.prio]||'n')}</td>
          <td><select class="sel spEst" data-id="${t.id}" style="width:auto;padding:4px 8px;font-size:11.5px">${Object.keys(estLbl).map(e=>`<option value="${e}" ${e===t.estado?'selected':''}>${estLbl[e]}</option>`).join('')}</select></td>
          <td style="font-size:11.5px;color:var(--t3)">${t.fecha}</td>
          <td style="text-align:right"><button class="btn btn-soft btn-sm spDet" data-id="${t.id}" title="Ver detalle">📂 Ver</button> <button class="btn btn-soft btn-sm spWa" data-id="${t.id}" title="Responder por WhatsApp">📲</button></td></tr>`).join('')}
        </tbody></table></div>
        <div style="margin-top:12px">${ui.aiBox('Centraliza solicitudes de soporte de shoppers, clientes y equipo: plataforma, capacitación, técnica, comercial y servicio. Cada nueva solicitud te llega como notificación; cámbiale el estado y responde por WhatsApp/correo.','Soporte centralizado')}</div>
      </div>`;
  };

  const iaHTML=()=>`
    <div class="card card-p" style="display:flex;flex-direction:column;height:58vh;min-height:400px">
      <div id="chatLog" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:10px;padding-right:4px"></div>
      <div class="flex" style="margin-top:12px;gap:8px">
        <input class="inp" id="chatIn" placeholder="${role==='shopper'?'Ej. ¿hasta cuándo puedo hacer mi visita?':'Ej. ¿cuántas visitas hay sin asignar?'}">
        <button class="btn btn-pr" id="chatSend">Enviar</button>
      </div>
    </div>`;

  const draw=()=>{
    host.innerHTML=`
      ${ui.ph('Soporte', tab==='ia'?'Asistente con el contexto real de la operación · 24/7':'Solicitudes de soporte · gestión y seguimiento')}
      <div class="flex" style="gap:8px;margin-bottom:14px">
        ${role==='admin'?`<button class="btn btn-sm ${tab==='bandeja'?'btn-pr':'btn-ghost'}" data-tab="bandeja">📥 Bandeja</button>`:`<button class="btn btn-sm ${tab==='nueva'?'btn-pr':'btn-ghost'}" data-tab="nueva">＋ Nueva solicitud</button>`}
        <button class="btn btn-sm ${tab==='ia'?'btn-pr':'btn-ghost'}" data-tab="ia">🤖 Asistente IA</button>
      </div>
      <div id="spBody">${tab==='ia'?iaHTML():tab==='bandeja'?bandejaHTML():nuevaHTML()}</div>`;
    host.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.tab;draw();}));
    if(tab==='ia') wireIA();
    else if(tab==='bandeja') wireBandeja();
    else wireNueva();
  };

  const nuevaHTML=()=>`
    <div class="card card-p" style="max-width:560px">
      <div class="card-t" style="margin-bottom:12px">Crear solicitud de soporte</div>
      <label class="lbl">Tipo</label><select class="sel" id="spTipo" style="margin-bottom:10px">${CX.supportStore.TIPOS.map(t=>`<option>${t}</option>`).join('')}</select>
      <label class="lbl">Asunto</label><input class="inp" id="spAsunto" placeholder="Describe brevemente" style="margin-bottom:10px">
      <label class="lbl">Detalle</label><textarea class="inp" id="spDet" rows="3" placeholder="Cuéntanos qué necesitas…" style="margin-bottom:10px"></textarea>
      <label class="lbl">Prioridad</label><select class="sel" id="spPrio" style="margin-bottom:14px"><option value="baja">Baja</option><option value="media" selected>Media</option><option value="alta">Alta</option></select>
      <div class="flex" style="justify-content:space-between"><span style="font-size:11px;color:var(--t3)">También por WhatsApp o correo desde la 🔔 campanita superior</span><button class="btn btn-pr btn-sm" id="spSend">Enviar solicitud</button></div>
    </div>`;

  const wireNueva=()=>{ const b=host.querySelector('#spSend'); if(b)b.addEventListener('click',()=>{
    const asunto=host.querySelector('#spAsunto').value.trim(); if(!asunto){ui.toast('Escribe el asunto','warn');return;}
    CX.supportStore.add({de:(CX.session.user&&CX.session.user.name)||'Usuario',rol:role,tipo:host.querySelector('#spTipo').value,asunto,prio:host.querySelector('#spPrio').value});
    ui.toast('Solicitud enviada al equipo de soporte','ok',3200); tab='ia'; draw();
  }); };

  const wireBandeja=()=>{
    host.querySelectorAll('.spEst').forEach(s=>s.addEventListener('change',()=>{CX.supportStore.setEstado(s.dataset.id,s.value);ui.toast('Estado actualizado','ok');}));
    host.querySelectorAll('.spDet').forEach(b=>b.addEventListener('click',()=>{
      const t=CX.supportStore.list().find(x=>x.id===b.dataset.id);if(!t)return;
      ui.modal('🎟️ '+t.asunto,`
        <div class="grid g2" style="gap:10px 14px;margin-bottom:12px">
          <div><label class="lbl">Remitente</label><div style="font-size:13px;font-weight:600">${t.de} <span class="muted">(${t.rol})</span></div></div>
          <div><label class="lbl">Tipo</label><div>${t.tipo}</div></div>
          <div><label class="lbl">Prioridad</label>${ui.bdg(t.prio,({alta:'r',media:'a',baja:'n'})[t.prio])}</div>
          <div><label class="lbl">Fecha</label><div style="font-size:12.5px">${t.fecha}</div></div>
        </div>
        <label class="lbl">Nota interna / respuesta</label>
        <textarea class="inp" id="spNota" rows="3" placeholder="Escribe una nota o la respuesta al usuario…" style="margin-bottom:12px">${t.nota||''}</textarea>
        <div class="flex" style="justify-content:space-between">
          <select class="sel" id="spEstDet" style="width:auto">${Object.keys({abierto:'Abierto',en_proceso:'En proceso',resuelto:'Resuelto'}).map(e=>`<option value="${e}" ${e===t.estado?'selected':''}>${({abierto:'Abierto',en_proceso:'En proceso',resuelto:'Resuelto'})[e]}</option>`).join('')}</select>
          <div class="flex" style="gap:8px">
            <button class="btn btn-soft btn-sm" id="spDetWa">📲 Responder WA</button>
            <button class="btn btn-soft btn-sm" id="spDetResp">📌 Asignar responsable</button>
            <button class="btn btn-pr btn-sm" id="spDetSave">Guardar</button></div></div>`,
        {onMount:(ov,close)=>{
          ov.querySelector('#spDetSave').addEventListener('click',()=>{t.nota=ov.querySelector('#spNota').value;CX.supportStore.setEstado(t.id,ov.querySelector('#spEstDet').value);close();draw();ui.toast('Ticket actualizado','ok');});
          ov.querySelector('#spDetResp')?.addEventListener('click',()=>{
            ui.modal('📌 Asignar responsable',`
              <label class="lbl">Responsable (rol)</label>
              <select class="sel" id="rspRol" style="margin-bottom:8px"><option value="admin">Equipo administrativo</option><option value="ops">Equipo operativo</option><option value="coordinador">Coordinador</option></select>
              <label class="lbl">Nombre del responsable</label><input class="inp" id="rspName" placeholder="Nombre" style="margin-bottom:8px">
              <label class="lbl">Nota</label><input class="inp" id="rspNota" placeholder="Qué debe gestionar" style="margin-bottom:12px">
              <div style="text-align:right"><button class="btn btn-pr btn-sm" id="rspSave">Asignar</button></div>
            `,{onMount:(o3,c3)=>o3.querySelector('#rspSave').addEventListener('click',()=>{
              CX.automations.asignar({titulo:'Soporte: '+t.asunto,detalle:o3.querySelector('#rspNota').value||t.asunto,responsable:o3.querySelector('#rspName').value||'—',responsableRol:o3.querySelector('#rspRol').value,nav:'soporte'});
              c3();ui.toast('Responsable asignado · notificado y visible en Mi Día','ok',3500);
            })});
          });
          ov.querySelector('#spDetWa').addEventListener('click',()=>{
            const hasHook=!!(CX.automations&&CX.automations.hook&&CX.automations.hook());
            if(hasHook){CX.automations&&CX.automations._pushLog({fecha:new Date().toISOString().slice(0,16).replace('T',' '),canal:'whatsapp',evento:'soporte',titulo:'Respuesta soporte: '+t.asunto,txt:t.de,hook:CX.automations.hook()});ui.toast('Respuesta enviada vía Make','ok');}
            else{const msg=encodeURIComponent('Hola '+t.de+', sobre tu solicitud "'+t.asunto+'": '+(ov.querySelector('#spNota').value||'nos ponemos en contacto.'));window.open('https://wa.me/?text='+msg,'_blank');}
          });
        }});
    }));
    host.querySelectorAll('.spWa').forEach(b=>b.addEventListener('click',()=>ui.toast('Respondiendo por WhatsApp (Make)…','ok')));
    const km={all:['Todas',()=>true],abierto:['Abiertas',t=>t.estado==='abierto'],en_proceso:['En proceso',t=>t.estado==='en_proceso'],resuelto:['Resueltas',t=>t.estado==='resuelto']};
    host.querySelectorAll('#spKpis [data-sk]').forEach(el=>el.addEventListener('click',()=>{const d=km[el.dataset.sk];const L=CX.supportStore.list().filter(d[1]);
      ui.modal(d[0]+' ('+L.length+')',L.length?`<table class="tbl"><thead><tr><th>De</th><th>Asunto</th><th>Estado</th></tr></thead><tbody>${L.map(t=>`<tr><td><b>${t.de}</b></td><td style="font-size:12px">${t.asunto}</td><td>${ui.bdg(estLbl[t.estado],estTone[t.estado])}</td></tr>`).join('')}</tbody></table>`:ui.empty('📭','Sin solicitudes.'));
    }));
  };

  const wireIA=()=>{
    const log=host.querySelector('#chatLog');
    const add=(who,txt)=>{const me=who==='me';const b=document.createElement('div');
      b.style.cssText=`align-self:${me?'flex-end':'flex-start'};max-width:80%;padding:10px 14px;border-radius:${me?'13px 13px 4px 13px':'13px 13px 13px 4px'};font-size:13px;line-height:1.5;${me?'background:var(--brand);color:#fff':'background:#f6f9fc;border:1px solid var(--border);color:var(--t1)'}`;
      b.innerHTML=(me?'':'🤖 ')+txt; log.appendChild(b); log.scrollTop=log.scrollHeight; return b;};
    add('ai',`Hola 👋 soy tu asistente de <b>${p.name}</b>. Pregúntame sobre visitas, fechas, honorarios, estados o el siguiente paso.`);
    const canned=(q)=>{q=q.toLowerCase();
      if(q.includes('cuándo')||q.includes('cuando')||q.includes('rango'))return 'Tu rango válido es del <b>12 al 18 de junio</b>, franja semana. ¿Quieres que te ayude a elegir fecha?';
      if(q.includes('pagan')||q.includes('cobro')||q.includes('honorario'))return '<b>Q 60 + combo + boleto reembolsados.</b> El instructivo te llega por WhatsApp al ser aprobada la visita.';
      if(q.includes('sin asignar')||q.includes('pendiente')){const k=data.kpis();return `En ${p.name} hay <b>${k.sinAsignar.t} visitas sin asignar</b> y <b>${k.postPend} postulaciones</b> por revisar.`;}
      return `Con el contexto de ${p.name}: ${ctx} ¿Sobre qué visita o paso necesitas ayuda?`;};
    const send=async()=>{const inp=host.querySelector('#chatIn');const q=inp.value.trim();if(!q)return;add('me',q);inp.value='';
      const thinking=add('ai','<span style="opacity:.6">escribiendo…</span>');
      try{ if(window.claude&&window.claude.complete){const prompt=`Eres el asistente operativo de CXOrbia (mystery shopping y auditoría) para ${role==='shopper'?'un shopper':'un administrador'}. Responde breve, claro, español, máx 3 frases. Contexto: ${ctx}\n\nPregunta: ${q}`;const r=await window.claude.complete(prompt);thinking.innerHTML='🤖 '+(r||canned(q)).trim();}else{thinking.innerHTML='🤖 '+canned(q);} }catch(e){thinking.innerHTML='🤖 '+canned(q);}
      log.scrollTop=log.scrollHeight;};
    host.querySelector('#chatSend').addEventListener('click',send);
    host.querySelector('#chatIn').addEventListener('keydown',e=>{if(e.key==='Enter')send();});
  };

  draw();
  CX.bus.on('support',()=>{if(tab==='bandeja')draw();});
  return host;
});
