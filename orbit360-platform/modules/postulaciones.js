/* CXOrbia · Postulaciones (admin) — full fidelity */
CX.module('postulaciones', ({data,ui})=>{
  const p=data.project(), posts=data._posts.slice();
  const projName=(id)=>{const pr=data.projects.find(x=>x.id===id);return pr?pr.name:'';};
  const c=(s)=>posts.filter(x=>x.estado===s).length;
  const reprog=posts.filter(x=>x.reprog);
  const agendadas=data.visitas().filter(v=>v.agendada&&v.shopperId);

  /* agrupar por sucursal */
  const groups={};
  posts.forEach(x=>{(groups[x.sucursal]=groups[x.sucursal]||[]).push(x);});

  const estTag=(e)=>e==='pendiente'?ui.bdg('PENDIENTE','a'):e==='standby'?ui.bdg('STANDBY','n'):ui.bdg('APROBADA','g');

  const card=(x)=>{
    const hon=`${x.currency} ${x.honorario}`+(x.boleto?' + boleto':'')+(x.comboAmt?' + reembolso':'');
    return `<div data-pid="${x.id}" style="background:#fff;border:1px solid var(--border);border-radius:11px;padding:13px 15px;margin-bottom:10px">
      <div class="between" style="margin-bottom:8px">
        <div class="flex" style="gap:8px">${estTag(x.estado)}<span style="font-size:11px;color:var(--t3)">${x.fechaProp}</span>${x.reprog?ui.bdg('Reprog.','a'):''}</div>
        <span style="font-size:11px;color:var(--t3)">${x.quincena}</span>
      </div>
      <div class="between" style="align-items:flex-start;gap:14px;flex-wrap:wrap">
        <div style="flex:1;min-width:220px">
          <div style="font-size:14px;font-weight:700;color:var(--t1)">${x.shopper} <span class="muted" style="font-weight:500;font-size:12px">· ${x.shopperCode}</span></div>
          <div style="font-size:10px;font-weight:700;color:var(--brand);background:var(--brand-light);display:inline-block;padding:1px 7px;border-radius:6px;margin-top:3px">🗂️ ${projName(x.projectId)}</div>
          <div style="font-size:12px;color:var(--t2);margin-top:3px">📍 ${x.sucursal} · ${x.ciudad}</div>
          <div style="font-size:11.5px;color:var(--t3);margin-top:4px">📅 ${x.fechaProp} · ⏱️ ${x.franjaCode} · 📞 ${x.phone} · desde ${x.disponibleDesde}</div>
          <div style="font-size:12px;color:var(--green);font-weight:600;margin-top:4px">💲 ${hon}</div>
          ${x.estado==='aprobada'?`<div style="font-size:11px;color:var(--t3);margin-top:5px">✅ ${x.quincena} · WA enviado al shopper · Aprobada por <b style="color:var(--t2)">${x.aprobadaPor}</b></div>`:''}
        </div>
        <div style="display:flex;flex-direction:column;gap:7px;align-items:flex-end">
          ${x.estado==='pendiente'
            ? `<button class="btn btn-green btn-sm" data-ap="${x.id}">✅ Aprobar</button>
               <div class="flex"><button class="btn btn-ghost btn-sm" data-sb="${x.id}">Standby</button><button class="btn bt-x btn-sm" data-rj="${x.id}" style="background:var(--red-bg);color:var(--red)">Rechazar</button></div>`
            : `<div style="background:var(--green-bg);border-radius:9px;padding:8px 14px;text-align:center"><div style="font-size:12px;font-weight:700;color:var(--green)">✅ Aprobada</div><div style="font-size:10px;color:var(--t3)">${x.quincena}</div></div>
               <div class="flex" style="flex-wrap:wrap;justify-content:flex-end"><button class="btn btn-ghost btn-sm" data-perfil="${x.shopperId}">👤 Perfil</button><button class="btn btn-ghost btn-sm" data-edit="${x.id}">✏️ Editar</button><button class="btn btn-ghost btn-sm" data-reasig="${x.id}">🔁 Reasig.</button><button class="btn btn-ghost btn-sm" data-cancel="${x.id}" style="color:var(--red)">✕ Cancelar</button></div>`}
        </div>
      </div>
    </div>`;
  };

  const groupHTML=Object.keys(groups).slice(0,8).map(suc=>{
    const items=groups[suc];const pend=items.filter(x=>x.estado==='pendiente').length;
    return `<div class="card card-p" style="margin-bottom:12px">
      <div class="between" style="margin-bottom:10px"><div style="font-size:12px;font-weight:700;color:var(--brand-dark);text-transform:uppercase;letter-spacing:.5px">📍 ${suc}</div>
        <span class="muted" style="font-size:11px">${items.length} postulación(es) · ${pend} pendiente(s)</span></div>
      ${items.map(card).join('')}</div>`;
  }).join('');

  const html=`
  <div class="between" style="margin-bottom:6px">
    <div>${ui.ph('Gestión de Postulaciones', `${c('pendiente')} pendientes · ${c('aprobada')} aprobadas · ${reprog.length} reprogramación(es) · ${agendadas.length} agendamientos`)}</div>
    <div class="flex"><span class="bdg bdg-g">● En vivo</span><span class="bdg bdg-b">${p.name}</span></div>
  </div>

  <div class="flex wrap" style="gap:8px;margin-bottom:12px">
    <button class="btn btn-soft btn-sm" id="syncHR">🔄 Sincronizar HR</button>
    <button class="btn btn-green btn-sm" id="asignManual">＋ Asignar visita manual</button>
    <button class="btn btn-ghost btn-sm">⤓ Exportar</button>
    <div class="spacer"></div>
    <button class="btn btn-pr btn-sm" id="reqShopper">📤 Pedir al shopper…</button>
    <button class="btn btn-pr btn-sm" id="openAgenda">🗓️ Gestionar agendamientos</button>
  </div>

  <div class="flex wrap" style="gap:8px;margin-bottom:12px">
    <input class="inp" id="pSearch" placeholder="🔎 Buscar shopper, sucursal…" style="flex:1;min-width:200px">
    <select class="sel" id="pProj" style="width:auto"><option value="">🗂️ Todos los proyectos</option>${[...new Set(posts.map(x=>x.projectId))].map(id=>`<option value="${id}">${projName(id)}</option>`).join('')}</select>
    <select class="sel" id="pPais" style="width:auto"><option value="">Todos los países</option>${[...new Set(posts.map(x=>x.pais))].map(c=>`<option>${c}</option>`).join('')}</select>
    <select class="sel" id="pEst" style="width:auto"><option value="">Todos los estados</option><option value="pendiente">Pendiente</option><option value="aprobada">Aprobada</option><option value="standby">Standby</option></select>
    <label class="flex" style="font-size:12px;color:var(--t2);gap:6px"><input type="checkbox" id="pHist"> Ver históricas</label>
  </div>

  <div class="grid" style="grid-template-columns:repeat(5,1fr);gap:11px;margin-bottom:16px" id="poKpis">
    <div data-k="pend" style="cursor:pointer">${ui.kpi('Pendientes',c('pendiente'),'a')}</div>
    <div data-k="reprog" style="cursor:pointer">${ui.kpi('Reprogramaciones',reprog.length,'r')}</div>
    <div data-k="aprob" style="cursor:pointer">${ui.kpi('Aprobadas',c('aprobada'),'g')}</div>
    <div data-k="todas" style="cursor:pointer">${ui.kpi('Todas',posts.length,'b')}</div>
    <div data-k="agenda" style="cursor:pointer">${ui.kpi('Agendamientos',agendadas.length,'n')}</div>
  </div>

  ${reprog.length?`<div class="card card-p" style="border-left:3px solid var(--amber);margin-bottom:16px">
    <div class="card-t" style="margin-bottom:10px">🗓️ Solicitudes de reprogramación pendientes <span class="bdg bdg-a">${reprog.length}</span></div>
    ${reprog.slice(0,3).map(x=>`<div class="between wrap" style="gap:12px;padding:10px 0;border-bottom:1px solid var(--border-2)">
      <div><b style="font-size:13px">${x.shopper}</b> · <span style="font-size:12px;color:var(--t2)">${x.sucursal}</span>
      <div style="font-size:11px;color:var(--t3)">Fecha vigente → propuesta · aplicación tarde 😬</div></div>
      <div class="flex" style="flex-wrap:wrap;gap:4px"><button class="btn btn-ghost btn-sm" data-revpost="${x.id}">👁 Revisar reprog.</button><button class="btn btn-green btn-sm" data-authfecha="${x.id}">✅ Nueva fecha</button><button class="btn btn-ghost btn-sm" data-keepfecha="${x.id}">Conservar anterior</button></div>
    </div>`).join('')}</div>`:''}

  <div id="pGroups">${groupHTML}</div>
  <div class="card card-p">${ui.aiBox('Sugiero el mejor shopper por historial y certificación, detecto reprogramaciones tardías y disparo WhatsApp y notificaciones automáticamente al aprobar. Cada decisión queda firmada y trazada.','Asistente de asignación')}</div>`;

  setTimeout(()=>{
    const poList=(title,arr,render)=>ui.modal(title+' ('+arr.length+')', arr.length?(render?arr.map(render).join(''):`<table class="tbl"><thead><tr><th>Shopper</th><th>Sucursal</th><th>Estado</th><th>Honorario</th></tr></thead><tbody>${arr.map(x=>`<tr><td><b style="font-size:12.5px">${x.shopper}</b><div style="font-size:10px;color:var(--t3)">${x.shopperCode}</div></td><td style="font-size:12px">${x.sucursal}<div style="font-size:10px;color:var(--t3)">${CX.paisFlag(x.pais)} ${x.ciudad}</div></td><td>${estTag(x.estado)}</td><td style="font-size:12px;color:var(--green)">${x.currency} ${x.honorario}</td></tr>`).join('')}</tbody></table>`):ui.empty('📭','Sin elementos en esta categoría.'));
    const poKp={
      pend:['Postulaciones pendientes',posts.filter(x=>x.estado==='pendiente')],
      reprog:['Reprogramaciones',reprog],
      aprob:['Postulaciones aprobadas',posts.filter(x=>x.estado==='aprobada')],
      todas:['Todas las postulaciones',posts],
      agenda:['Agendamientos autorizados',agendadas.map(v=>({shopper:v.shopper,shopperCode:v.shopperCode||'',sucursal:v.sucursal,ciudad:v.ciudad,pais:v.pais,estado:v.estado,currency:v.currency,honorario:v.honorario}))],
    };
    document.querySelectorAll('#poKpis [data-k]').forEach(el=>el.addEventListener('click',()=>{const d=poKp[el.dataset.k];poList(d[0],d[1]);}));
    const gestor=()=>(CX.session.user&&CX.session.user.name)||'Equipo';
    const act=(id,label,tone,extra)=>{const el=document.querySelector(`[data-pid="${id}"]`);if(!el)return;
      const x=posts.find(z=>z.id===id); if(x){x.estado=(tone==='green'?'aprobada':tone==='amber'?'standby':'rechazada');x.gestionadoPor=gestor();
        CX.automations&&CX.automations.logAction(label.replace(/[^\wáéíóúñ ]/gi,'').trim(),x.visitaId||x.id,(x.shopper||'')+' · '+(x.sucursal||''));}
      el.querySelector('div[style*="flex-direction:column"]').innerHTML=`<div style="background:var(--${tone}-bg);border-radius:9px;padding:8px 14px;text-align:center"><div style="font-size:12px;font-weight:700;color:var(--${tone})">${label}</div><div style="font-size:10px;color:var(--t3)">por ${gestor()}</div></div>`;
      // marca trazabilidad en el cuerpo y "saca de pendientes" visualmente
      el.style.opacity=tone==='green'?'1':'.7';
      ui.toast(extra+' · gestionado por '+gestor(),'ok');};

    /* perfil real del shopper (no el listado) — tarjetas clickeables + historial + requisitos */
    const profileModal=(sid)=>{ const s=data.getShopper?data.getShopper(sid):data.shoppers.find(x=>x.id===sid); if(!s){ui.toast('Shopper no encontrado','warn');return;}
      const st=data.shopperStats?data.shopperStats(s.id):{total:0,realizadas:0,liquidadas:0,enCurso:0,cumpl:0};
      const hist=data.visitsForShopper?data.visitsForShopper(s.id):[];
      const reqs=[['Perfil completo',s.perfilCompleto!==false],['Datos bancarios',!!(s.banco||s.ctaNum)],['WhatsApp',!!(s.whatsapp||s.phone)],['Certificado',(st.realizadas||0)>0||s.certificado]];
      ui.modal(s.nombre+' · '+s.code,`
        <div class="flex" style="gap:12px;margin-bottom:12px"><div class="rail-av" style="width:42px;height:42px;font-size:15px;background:linear-gradient(135deg,var(--brand),var(--brand-dark))">${s.code.slice(-2)}</div>
        <div><div class="card-t" style="font-size:15px">${s.nombre}</div><div style="font-size:12px;color:var(--t3)">${s.ciudad?s.ciudad+', ':''}${CX.paisName(s.pais)} · ${s.whatsapp||s.phone||'sin WhatsApp'}</div>
        <div style="margin-top:4px"><span style="font-size:13px;font-weight:800;color:var(--amber)">★ ${s.rating||'—'}</span> ${s.perfilCompleto===false?ui.bdg('perfil incompleto','a'):''}</div></div></div>
        <div class="grid g4" style="margin-bottom:12px"><div data-ph="all" style="cursor:pointer">${ui.kpi('Visitas',st.total,'b')}</div><div data-ph="real" style="cursor:pointer">${ui.kpi('Realizadas',st.realizadas,'g')}</div><div data-ph="liq" style="cursor:pointer">${ui.kpi('Liquidadas',st.liquidadas,'p')}</div>${ui.kpi('Cumpl.',(st.cumpl||0)+'%','a')}</div>
        <div class="card-t" style="font-size:12.5px;margin-bottom:6px">✔ Verificación de requisitos</div>
        <div class="flex wrap" style="gap:6px;margin-bottom:12px">${reqs.map(r=>`<span class="bdg ${r[1]?'bdg-g':'bdg-a'}">${r[1]?'✓':'⚠'} ${r[0]}</span>`).join('')}</div>
        <div style="font-size:11px;color:var(--t3);margin-bottom:6px">↑ toca un indicador para ver el historial de visitas</div>
        <div class="flex" style="justify-content:flex-end;gap:8px"><button class="btn btn-soft btn-sm" id="pmWa">📲 WhatsApp</button><button class="btn btn-pr btn-sm" id="pmGo">Ver perfil completo →</button></div>
      `,{onMount:(ov,close)=>{
        ov.querySelector('#pmGo').addEventListener('click',()=>{close();CX.session._focusShopper=s.id;CX.router.nav('shoppers');});
        ov.querySelector('#pmWa').addEventListener('click',()=>{close();ui.toast('WhatsApp a '+s.nombre+' (Make)','ok');});
        const histModal=(filter,title)=>{ const arr=hist.filter(filter);
          ui.modal(title+' · '+s.nombre, arr.length?`<table class="tbl"><thead><tr><th>Sucursal</th><th>Escenario</th><th>Fecha</th><th>Estado</th></tr></thead><tbody>${arr.map(v=>`<tr><td><b>${v.sucursal}</b><div style="font-size:10px;color:var(--t3)">${CX.paisFlag(v.pais)} ${v.ciudad}</div></td><td style="font-size:12px">${v.escenario||''}</td><td style="font-size:12px">${v.realizada||v.agendada||'—'}</td><td>${ui.estadoBadge(v.estado)}</td></tr>`).join('')}</tbody></table>`:ui.empty('🗒️','Sin visitas en esta categoría.')); };
        ov.querySelectorAll('[data-ph]').forEach(el=>el.addEventListener('click',()=>{const k=el.dataset.ph; if(k==='all')histModal(()=>true,'Historial completo'); else if(k==='real')histModal(v=>['realizada','cuestionario','liquidada'].includes(v.estado),'Realizadas'); else histModal(v=>v.estado==='liquidada','Liquidadas');}));
      }});
    };
    document.querySelectorAll('[data-ap]').forEach(b=>b.addEventListener('click',()=>{const x=posts.find(z=>z.id===b.dataset.ap);if(x&&CX.automations)CX.automations.fire('aprobacion',{shopper:x.shopper,sucursal:x.sucursal});act(b.dataset.ap,'✅ Aprobada','green','Aprobada · WhatsApp enviado al shopper');}));
    document.querySelectorAll('[data-sb]').forEach(b=>b.addEventListener('click',()=>act(b.dataset.sb,'⏸ Standby','amber','Postulación en standby')));
    document.querySelectorAll('[data-rj]').forEach(b=>b.addEventListener('click',()=>act(b.dataset.rj,'✕ Rechazada','red','Postulación rechazada · shopper notificado')));
    const search=()=>{const q=(document.getElementById('pSearch').value||'').toLowerCase(),fpr=document.getElementById('pProj').value,fp=document.getElementById('pPais').value,fe=document.getElementById('pEst').value;
      document.querySelectorAll('#pGroups [data-pid]').forEach(el=>{const x=posts.find(z=>z.id===el.dataset.pid);
        const ok=(!q||(x.shopper+x.shopperCode+x.sucursal).toLowerCase().includes(q))&&(!fpr||x.projectId===fpr)&&(!fp||x.pais===fp)&&(!fe||x.estado===fe);el.style.display=ok?'':'none';});
      // ocultar grupos sin tarjetas visibles
      document.querySelectorAll('#pGroups .card').forEach(g=>{const any=[...g.querySelectorAll('[data-pid]')].some(el=>el.style.display!=='none');g.style.display=any?'':'none';});};
    ['pSearch','pProj','pPais','pEst'].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('input',search);});
    /* botones de reprogramación (revisar / autorizar nueva fecha / conservar anterior) */
    document.querySelectorAll('[data-revpost]').forEach(b=>b.addEventListener('click',()=>{const x=posts.find(z=>z.id===b.dataset.revpost);ui.modal('Revisar solicitud de reprogramación · '+(x&&x.shopper||''),`<p style="font-size:12.5px;color:var(--t2);margin-bottom:10px">Fecha actual: <b>${x&&x.fechaActual||'—'}</b> · Fecha propuesta: <b>${x&&x.fechaProp||'—'}</b></p><div style="background:var(--amber-bg);border-radius:9px;padding:9px 12px;font-size:12px;color:#8a5b00">Usa "Autorizar nueva fecha" para aprobar la reprogramación o "Conservar anterior" para mantener la fecha actual.</div>`);}));
    document.querySelectorAll('[data-authfecha]').forEach(b=>b.addEventListener('click',()=>{const x=posts.find(z=>z.id===b.dataset.authfecha);if(x){const v=data._visitas.find(z=>z.id===x.visitaId);if(v&&x.fechaProp){v.agendada=x.fechaProp;x.reprog=false;}CX.notif&&CX.notif.push({to:'shopper',tipo:'reprog_aprobada',icon:'✅',tono:'g',titulo:'Reprogramación aprobada',txt:'Tu visita en '+(x.sucursal||'')+' fue reprogramada a '+(x.fechaProp||'nueva fecha'),nav:'misvisitas'});CX.automations&&CX.automations.fire('aprobacion',{shopper:x.shopper,sucursal:x.sucursal,fecha:x.fechaProp});CX.bus&&CX.bus.emit('visit-flow');}ui.toast('Nueva fecha autorizada · shopper notificado · HR sincronizada','ok',3600);}));
    document.querySelectorAll('[data-keepfecha]').forEach(b=>b.addEventListener('click',()=>{const x=posts.find(z=>z.id===b.dataset.keepfecha);if(x){x.reprog=false;x.fechaProp=null;}CX.notif&&CX.notif.push({to:'shopper',tipo:'reprog_rechazada',icon:'⚠️',tono:'a',titulo:'Reprogramación no autorizada',txt:'La visita en '+(x&&x.sucursal||'')+' conserva la fecha original',nav:'misvisitas'});CX.bus&&CX.bus.emit('visit-flow');ui.toast('Fecha original conservada · shopper notificado','ok');}));

    /* editar fecha/franja de la visita de una postulación */
    document.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>{ const x=posts.find(z=>z.id===b.dataset.edit); if(!x)return;
      ui.modal('Editar asignación · '+x.shopper,`
        <div style="font-size:12px;color:var(--t2);margin-bottom:10px">📍 ${x.sucursal} · ${x.ciudad}</div>
        <label class="lbl">Fecha</label><input class="inp" id="edF" type="date" value="${x.fechaProp||''}" style="margin-bottom:10px">
        <label class="lbl">Franja</label><select class="sel" id="edFr" style="margin-bottom:14px">${['AM 8–12h','PM 14–18h','WK fin de semana'].map(o=>`<option ${o.startsWith(x.franjaCode||'')?'selected':''}>${o}</option>`).join('')}</select>
        <div style="text-align:right"><button class="btn btn-pr btn-sm" id="edOk">Guardar</button></div>
      `,{onMount:(ov,close)=>{ov.querySelector('#edOk').addEventListener('click',()=>{ const f=ov.querySelector('#edF').value; x.fechaProp=f; const v=data._visitas.find(z=>z.id===x.visitaId); if(v){v.agendada=f;} CX.hr&&CX.hr.writeBack&&CX.hr.writeBack(p,v); close(); ui.toast('Asignación actualizada · HR sincronizada · por '+gestor(),'ok'); });}});
    }));

    /* reasignar a otro shopper */
    document.querySelectorAll('[data-reasig]').forEach(b=>b.addEventListener('click',()=>{ const x=posts.find(z=>z.id===b.dataset.reasig); if(!x)return;
      const cands=data.shoppersFor().filter(s=>s.id!==x.shopperId);
      ui.modal('Reasignar visita · '+x.sucursal,`
        <p style="font-size:12px;color:var(--t2);margin-bottom:10px">Actualmente: <b>${x.shopper}</b>. Elige el nuevo evaluador.</p>
        <select class="sel" id="rsSh" style="margin-bottom:14px">${cands.slice(0,30).map(s=>`<option value="${s.id}">${s.nombre} · ${s.code} · ${s.ciudad||CX.paisName(s.pais)}</option>`).join('')}</select>
        <div style="text-align:right"><button class="btn btn-pr btn-sm" id="rsOk">Reasignar</button></div>
      `,{onMount:(ov,close)=>{ov.querySelector('#rsOk').addEventListener('click',()=>{ const nid=ov.querySelector('#rsSh').value; data.assignVisit&&data.assignVisit(x.visitaId,nid); const ns=data.getShopper(nid); if(ns){x.shopperId=ns.id;x.shopper=ns.nombre;x.shopperCode=ns.code;x.gestionadoPor=gestor();} close(); CX.notif&&CX.notif.push({to:'admin',tipo:'reasig',icon:'🔁',tono:'a',titulo:'Visita reasignada',txt:x.sucursal+' → '+(ns?ns.nombre:''),nav:'postulaciones'}); ui.toast('Reasignada a '+(ns?ns.nombre:'')+' · por '+gestor(),'ok',3600); });}});
    }));

    /* cancelar: la visita vuelve a disponible */
    document.querySelectorAll('[data-cancel]').forEach(b=>b.addEventListener('click',()=>{ const x=posts.find(z=>z.id===b.dataset.cancel); if(!x)return;
      ui.modal('Cancelar visita · '+x.sucursal,`
        <p style="font-size:12.5px;color:var(--t2);margin-bottom:12px">La visita de <b>${x.shopper}</b> volverá a <b>disponible</b> y el shopper será notificado.</p>
        <label class="lbl">Motivo</label><textarea class="inp" id="cnM" rows="2" placeholder="Motivo de la cancelación…" style="margin-bottom:14px"></textarea>
        <div style="text-align:right"><button class="btn btn-sm" style="background:var(--red-bg);color:var(--red)" id="cnOk">Confirmar cancelación</button></div>
      `,{onMount:(ov,close)=>{ov.querySelector('#cnOk').addEventListener('click',()=>{ const v=data._visitas.find(z=>z.id===x.visitaId); if(v){v.estado='disponible';v.shopperId=null;v.shopper=null;v.agendada=null;} x.estado='cancelada';x.gestionadoPor=gestor(); CX.notif&&CX.notif.push({to:'shopper',tipo:'cancel',icon:'❌',tono:'r',titulo:'Visita cancelada',txt:x.sucursal+' · puedes postularte a otras',nav:'misvisitas'}); CX.bus&&CX.bus.emit('visit-flow'); close(); act(x.id,'✕ Cancelada','red','Visita cancelada · vuelve a disponible'); });}});
    }));

    /* asignar visita manual — con búsqueda y opción de crear shopper en el momento */
    const am=document.getElementById('asignManual');
    if(am)am.addEventListener('click',()=>{
      const projName=(id)=>{const pr=data.projects.find(x=>x.id===id);return pr?pr.name:'';};
      const disp=data._visitas.filter(v=>v.estado==='disponible'||!v.shopperId);
      const cands=data.shoppersFor();
      ui.modal('Asignar visita manual',`
        <p style="font-size:12px;color:var(--t2);margin-bottom:12px">Busca la visita y el shopper (no tienes que recorrer toda la lista). Si el shopper no existe, créalo aquí mismo.</p>
        <label class="lbl">Visita disponible</label>
        <input class="inp" id="amVQ" placeholder="🔎 Buscar sucursal, ciudad, proyecto…" style="margin-bottom:6px">
        <select class="sel" id="amV" size="5" style="margin-bottom:12px;height:auto">${disp.length?disp.map(v=>`<option value="${v.id}" data-t="${(v.sucursal+' '+v.ciudad+' '+projName(v.projectId)+' '+v.quincena).toLowerCase()}">${v.sucursal} · ${v.ciudad} · ${projName(v.projectId)} · ${v.quincena}</option>`).join(''):'<option value="">— no hay disponibles —</option>'}</select>

        <div class="between" style="margin-bottom:6px"><label class="lbl" style="margin:0">Shopper</label><label class="flex" style="gap:6px;font-size:11.5px;color:var(--t2);cursor:pointer"><input type="checkbox" id="amNew"> ✚ Crear nuevo</label></div>
        <div id="amExist">
          <input class="inp" id="amSQ" placeholder="🔎 Buscar shopper o código…" style="margin-bottom:6px">
          <select class="sel" id="amS" size="5" style="height:auto">${cands.map(s=>`<option value="${s.id}" data-t="${(s.nombre+' '+s.code+' '+(s.ciudad||'')).toLowerCase()}">${s.nombre} · ${s.code} · ${s.ciudad||CX.paisName(s.pais)}</option>`).join('')}</select>
        </div>
        <div id="amCreate" style="display:none">
          <div class="grid g2" style="gap:8px 10px"><div><label class="lbl">Nombre</label><input class="inp" id="amF"></div><div><label class="lbl">Apellido</label><input class="inp" id="amL"></div></div>
          <label class="lbl" style="margin-top:8px">WhatsApp</label><input class="inp" id="amW" placeholder="+502 ...">
          <div style="background:var(--amber-bg);border-radius:9px;padding:8px 11px;font-size:11px;color:#8a5b00;margin-top:8px">Se crea con perfil <b>incompleto</b>; al ingresar se le pedirá (en notificaciones y Mi Día) completar sus datos.</div>
        </div>
        <div style="text-align:right;margin-top:14px"><button class="btn btn-pr btn-sm" id="amOk" ${disp.length?'':'disabled'}>Asignar</button></div>
      `,{onMount:(ov,close)=>{
        const filt=(q,sel)=>{const v=(q.value||'').toLowerCase();ov.querySelectorAll('#'+sel+' option').forEach(o=>{o.style.display=(!v||(o.dataset.t||'').includes(v))?'':'none';});};
        ov.querySelector('#amVQ').addEventListener('input',e=>filt(e.target,'amV'));
        ov.querySelector('#amSQ').addEventListener('input',e=>filt(e.target,'amS'));
        const nw=ov.querySelector('#amNew');
        nw.addEventListener('change',()=>{ov.querySelector('#amExist').style.display=nw.checked?'none':'';ov.querySelector('#amCreate').style.display=nw.checked?'':'none';});
        ov.querySelector('#amOk').addEventListener('click',()=>{
          const vid=ov.querySelector('#amV').value; if(!vid){ui.toast('Elige una visita','warn');return;}
          let sid, s;
          if(nw.checked){ const f=(ov.querySelector('#amF').value||'').trim(), l=(ov.querySelector('#amL').value||'').trim(), w=(ov.querySelector('#amW').value||'').trim();
            if(!f){ui.toast('Escribe al menos el nombre','warn');return;}
            s=data.addShopper&&data.addShopper({via:'asignacion_manual',firstName:f,lastName:l,whatsapp:w,perfilCompleto:false});
            sid=s&&s.id;
            if(s){ CX.notif&&CX.notif.push({to:'shopper',tipo:'completar',icon:'📝',tono:'a',titulo:'Completa tu perfil',txt:'Te asignaron una visita · actualiza tus datos para continuar',nav:'miperfil'}); }
          } else { sid=ov.querySelector('#amS').value; s=data.getShopper(sid); }
          const v=data.assignVisit&&data.assignVisit(vid,sid);
          CX.hr&&CX.hr.writeBack&&CX.hr.writeBack(p,v);
          CX.notif&&CX.notif.push({to:'admin',tipo:'asignacion',icon:'📌',tono:'g',titulo:'Visita asignada manual',txt:(v?v.sucursal:'')+' → '+(s?s.nombre:''),nav:'postulaciones'});
          close(); ui.toast('Visita asignada a '+(s?s.nombre:'')+(nw.checked?' (nuevo · perfil incompleto)':'')+' · HR sincronizada · por '+gestor(),'ok',4200);
        });
      }});
    });
    const reqBtn=document.getElementById('reqShopper');
    if(reqBtn)reqBtn.addEventListener('click',()=>{
      ui.modal('📤 Pedir acción al shopper',`
        <p style="font-size:12.5px;color:var(--t2);margin-bottom:14px">El equipo puede <b>solicitar</b> al shopper (no solo gestionar lo que él pide). La solicitud le llega en Mi Día, Tablón y por WhatsApp.</p>
        <label class="lbl">Shopper</label>
        <select class="sel" id="rqSh" style="margin-bottom:12px">${posts.slice(0,10).map(x=>`<option>${x.shopper} · ${x.sucursal}</option>`).join('')}</select>
        <label class="lbl">Solicitud</label>
        <select class="sel" id="rqTipo" style="margin-bottom:12px">
          <option value="confirmar">Confirmar fecha propuesta</option>
          <option value="cambio">Pedir cambio de fecha</option>
          <option value="reprog">Solicitar reprogramación</option>
          <option value="agendar">Recordar que agende</option>
        </select>
        <label class="lbl">Nota (opcional)</label>
        <textarea class="inp" id="rqNota" rows="2" placeholder="Detalle para el shopper…" style="margin-bottom:14px"></textarea>
        <div class="flex" style="justify-content:flex-end;gap:8px"><button class="btn btn-ghost btn-sm" data-x4>Cancelar</button><button class="btn btn-pr btn-sm" id="rqSend">📲 Enviar solicitud</button></div>
      `,{onMount:(ov,close)=>{
        ov.querySelector('[data-x4]').addEventListener('click',close);
        ov.querySelector('#rqSend').addEventListener('click',()=>{
          const tipo=ov.querySelector('#rqTipo').value, sh=ov.querySelector('#rqSh').value.split(' · ')[0];
          const map={confirmar:['📅','El equipo pide confirmar fecha','confirmar_fecha'],cambio:['📅','El equipo pide cambio de fecha','confirmar_fecha'],reprog:['🔄','El equipo solicita reprogramación',''],agendar:['📅','Recordatorio: agenda tu visita','']};
          const m=map[tipo];
          CX.notif.push({to:'shopper',tipo,icon:m[0],tono:'a',titulo:m[1],txt:sh+' · responde desde Mis Visitas',nav:'misvisitas',accion:m[2]||undefined});
          close();ui.toast('Solicitud enviada a '+sh+' · Mi Día + Tablón + WhatsApp','ok',3500);
        });
      }});
    });
    document.getElementById('openAgenda').addEventListener('click',()=>{
      const rows=agendadas.slice(0,4).map(v=>`<div class="between" style="padding:9px 11px;border:1px solid var(--border);border-radius:10px;margin-bottom:8px">
        <div><b style="font-size:13px">${v.shopper}</b> · ${v.sucursal}<div style="font-size:11px;color:var(--t3)">📅 ${v.agendada} · ${v.franjaCode} · autorizada por Coordinación</div></div>
        <button class="btn btn-ghost btn-sm aprAdjust" data-vid="${v.id}" data-sh="${v.shopper}">🗓️ Solicitar ajuste</button></div>`).join('');
      ui.modal('Gestión de agendamientos',`
        <p style="font-size:12.5px;color:var(--t2);margin-bottom:14px">Separa las fechas enviadas por shoppers de las referencias HR y de las propuestas al postularse.</p>
        <div style="background:var(--green-bg);border-radius:10px;padding:12px 14px;margin-bottom:14px">
          <div style="font-size:12px;font-weight:700;color:var(--green)">⌛ Fechas pendientes de autorización <span class="bdg bdg-n">0</span></div>
          <div style="font-size:12px;color:var(--t3);margin-top:4px">No hay fechas nuevas pendientes de autorización.</div></div>
        <div style="font-size:12px;font-weight:700;color:var(--t1);margin-bottom:9px">✅ Agendas autorizadas desde la plataforma <span class="bdg bdg-g">${agendadas.length}</span></div>
        ${rows||ui.empty('🗓️','Sin agendas')}
        <div style="margin-top:8px">${ui.aiBox('Estas fechas provienen de HR o de una postulación aprobada; se reflejan para coordinación y shopper sin contarse como pendientes.','Referencias')}</div>`,
      {onMount:(ov,close)=>ov.querySelectorAll('.aprAdjust').forEach(b=>b.addEventListener('click',()=>{
        const sh=b.dataset.sh;
        CX.notif&&CX.notif.push({to:'shopper',tipo:'ajuste',icon:'🗓️',tono:'a',titulo:'El equipo solicita ajustar tu agenda',txt:sh+' · revisa la fecha de tu visita en Mis Visitas',nav:'misvisitas'});
        if(CX.automations&&CX.automations.fire)CX.automations.fire('reprog',{shopper:sh});
        close();ui.toast('Ajuste solicitado a '+sh+' · notificado (Mi Día + WhatsApp)','ok',3500);
      }))});
    });
  },0);
  return html;
});
