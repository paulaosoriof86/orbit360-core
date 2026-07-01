/* CXOrbia · Visitas (admin: tabla operativa editable · shopper: marketplace) */
CX.module('visitas', ({data,role,ui})=>{
  const p=data.project();

  /* ---------------- SHOPPER: marketplace de oportunidades (TODOS los proyectos) ---------------- */
  if(role==='shopper'){
    const projName=(id)=>{const pr=data.projects.find(x=>x.id===id);return pr?pr.name:'';};
    const projAccent=(id)=>{const pr=data.projects.find(x=>x.id===id);return pr?pr.accent:p.accent;};
    // ofertas de TODOS los proyectos (no solo el seleccionado)
    const list=data._visitas.filter(v=>v.estado==='disponible');
    const allProjects=[...new Set(list.map(v=>v.projectId))].map(id=>({id,name:projName(id)}));
    const escEmoji=(s)=>{const t=(s||'').toLowerCase();
      if(t.includes('fin de semana')||t.includes('estreno'))return '🎉';
      if(t.includes('incógnito')||t.includes('incognito'))return '🕵️';
      if(t.includes('almuerzo')||t.includes('cena')||t.includes('combo'))return '🍽️';
      if(t.includes('drive'))return '🚗'; if(t.includes('préstamo')||t.includes('cuenta'))return '🏦';
      if(t.includes('telef'))return '📞'; return '🎯';};
    const cell=(lbl,val)=>`<div><div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--t3)">${lbl}</div><div style="font-size:13px;font-weight:700;color:var(--t1)">${val}</div></div>`;
    const card=(v)=>`<div class="card hov" style="overflow:hidden;display:flex;flex-direction:column">
      <div style="background:linear-gradient(135deg,${projAccent(v.projectId)},var(--brand-dark));color:#fff;padding:12px 15px" class="between">
        <div><b style="font-size:14px">${v.sucursal.split(' · ')[0]}</b><div style="font-size:11px;opacity:.9">📍 ${v.ciudad}, ${CX.paisName(v.pais)}</div></div>
        <span style="background:rgba(255,255,255,.22);border-radius:20px;padding:3px 11px;font-size:11px;font-weight:700">Disponible</span></div>
      <div class="card-p" style="padding:13px 15px;flex:1">
        <div style="font-size:10px;font-weight:700;color:var(--brand);background:var(--brand-light);display:inline-block;padding:2px 8px;border-radius:6px;margin-bottom:10px">🗂️ ${projName(v.projectId)}</div>
        <div class="grid g2" style="gap:11px;margin-bottom:11px">
          ${cell('Quincena',v.quincena)}${cell('Franja',(v.franja==='Fin de semana'?'🎉 ':'📅 ')+v.franja)}
          ${cell('Canal',v.canal||'—')}${cell('Escenario',escEmoji(v.escenario)+' '+v.escenario)}
        </div>
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--t3)">📅 Disponible desde</div>
        <div style="font-size:12.5px;font-weight:600;color:var(--t1);margin-bottom:10px">${v.disponibleDesde||v.rango}</div>
        ${v.combo?`<div style="background:var(--amber-bg);border-radius:8px;padding:7px 10px;font-size:11.5px;color:#8a5b00;margin-bottom:11px">🍿 ${v.combo}</div>`:''}
        <div class="between">
          <div><span style="font-size:16px;font-weight:800;color:var(--green);font-family:var(--disp)">${ui.money(v.currency,v.honorario)}</span>
          <div style="font-size:10.5px;color:var(--t3)">${v.reembolso||v.boleto||v.comboAmt?'+ reembolso':'honorario base'}</div></div>
          <button class="btn btn-pr btn-sm" data-detail="${v.id}">Ver detalle →</button>
        </div>
      </div></div>`;
    const html=`
      ${ui.ph('Visitas Disponibles', list.length+' oportunidades en '+allProjects.length+' proyecto(s) para tu perfil')}
      <div class="flex wrap" style="gap:8px;margin-bottom:12px">
        <select class="sel" id="fProj" style="width:auto"><option value="">🗂️ Todos los proyectos</option>${allProjects.map(pr=>`<option value="${pr.id}">${pr.name}</option>`).join('')}</select>
        <select class="sel" id="fQuin" style="width:auto"><option value="">📆 Toda quincena</option>${[...new Set(list.map(v=>v.quincena))].map(q=>`<option>${q}</option>`).join('')}</select>
        <select class="sel" id="fEsc" style="width:auto"><option value="">🎯 Todo escenario</option>${[...new Set(list.map(v=>v.escenario))].map(s=>`<option>${s}</option>`).join('')}</select>
        <select class="sel" id="fCanal" style="width:auto"><option value="">📲 Todo canal</option>${[...new Set(list.map(v=>v.canal).filter(Boolean))].map(s=>`<option>${s}</option>`).join('')}</select>
      </div>
      ${ui.aiBox('Ahora ves la oferta de <b>todos los proyectos</b> a la vez. Filtra por proyecto, quincena, escenario o canal. Las visitas se derivan de cada hoja de ruta (online, importada o creada en la plataforma).','Toda la oferta ✨')}
      <div id="vList" style="margin-top:14px">${list.length?`<div class="grid g3">${list.map(card).join('')}</div>`:ui.empty('🔍','Sin visitas disponibles')}</div>`;
    setTimeout(()=>{
      const bind=()=>document.querySelectorAll('[data-detail]').forEach(b=>b.addEventListener('click',()=>{const v=list.find(x=>x.id===b.dataset.detail);CX.shopperVisitDetail(data,data.projects.find(x=>x.id===v.projectId)||p,v,ui);}));
      const apply=()=>{const fpr=document.getElementById('fProj').value,fq=document.getElementById('fQuin').value,fe=document.getElementById('fEsc').value,fc=document.getElementById('fCanal').value;const a=list.filter(v=>(!fpr||v.projectId===fpr)&&(!fq||v.quincena===fq)&&(!fe||v.escenario===fe)&&(!fc||v.canal===fc));document.getElementById('vList').innerHTML=a.length?`<div class="grid g3">${a.map(card).join('')}</div>`:ui.empty('🔍','Sin resultados');bind();};
      ['fProj','fQuin','fEsc','fCanal'].forEach(id=>document.getElementById(id).addEventListener('change',apply));bind();
    },0);
    return html;
  }

  /* ---------------- ADMIN: tabla operativa completa ---------------- */
  const ALL=!!CX.session._visAll;
  const all=ALL?data._visitas.slice():data.visitas();
  const projName=(id)=>{const pr=data.projects.find(x=>x.id===id);return pr?pr.name:'';};
  const k=data.kpis();
  const row=(v)=>`<tr data-vid="${v.id}">
    <td><b style="color:var(--brand)">#${v.num}</b>${ALL?`<div style="font-size:9px;color:var(--t3)">${projName(v.projectId)}</div>`:''}</td>
    <td><b>${v.sucursal}</b><div style="font-size:10px;color:var(--t3)">${v.ciudad} · ${v.pais}</div></td>
    <td style="font-size:12px">${v.quincena}<div style="font-size:10px;color:var(--t3)">${v.escenario}</div></td>
    <td>${v.shopper?`<b style="font-size:12px">${v.shopper}</b><div style="font-size:10px;color:var(--t3)">${v.shopperCode}</div>`:'<span class="muted">— sin asignar</span>'}</td>
    <td>${ui.estadoBadge(v.estado)}</td>
    <td style="font-size:12px">${v.agendada||'<span class="muted">—</span>'}</td>
    <td style="font-size:12px;font-weight:600;color:var(--green)">${ui.money(v.currency,v.honorario)}</td>
    <td style="text-align:right"><button class="btn btn-ghost btn-sm" data-vdetail="${v.id}" title="Ver detalle completo">🔍</button> ${!v.shopper&&v.estado!=='fuera_rango'?`<button class="btn btn-soft btn-sm" data-assign="${v.id}">Asignar</button> `:''}<button class="btn btn-ghost btn-sm" data-edit="${v.id}">✏️</button></td>
  </tr>`;
  const html=`
    <div class="between" style="margin-bottom:6px"><div>${ui.ph('Visitas', (ALL?('Todos los proyectos · '+all.length+' visitas'):(p.name+' · base operativa'))+' · publica, asigna y edita cada visita')}</div>
      <div class="flex"><span class="bdg bdg-g">● En vivo</span><span class="bdg bdg-b">${all.length} visitas</span></div></div>
    <div class="flex wrap" style="gap:8px;margin-bottom:12px">
      <button class="btn btn-green btn-sm" id="addV">＋ Publicar visita</button>
      <button class="btn btn-soft btn-sm">⤒ Importar HR</button>
      <button class="btn btn-ghost btn-sm">⤓ Exportar</button>
      <div class="spacer"></div>
      <input class="inp" id="vSearch" placeholder="🔎 Sucursal, shopper, ciudad…" style="max-width:240px">
      <select class="sel" id="vProj" style="width:auto"><option value="all" ${ALL?'selected':''}>🌐 Todos los proyectos</option>${data.projects.map(pr=>`<option value="${pr.id}" ${(!ALL&&pr.id===p.id)?'selected':''}>${pr.name}</option>`).join('')}</select>
      <select class="sel" id="vEst" style="width:auto"><option value="">Todos los estados</option>${['disponible','postulada','asignada','agendada','realizada','cuestionario','liquidada','fuera_rango'].map(e=>`<option value="${e}">${e}</option>`).join('')}</select>
      <select class="sel" id="vPais" style="width:auto"><option value="">País</option>${[...new Set(all.map(v=>v.pais))].map(c=>`<option>${c}</option>`).join('')}</select>
    </div>
    <div class="grid" style="grid-template-columns:repeat(5,1fr);gap:11px;margin-bottom:16px" id="vKpis">
      <div data-k="disp" style="cursor:pointer">${ui.kpi('Disponibles',all.filter(v=>v.estado==='disponible').length,'b')}</div>
      <div data-k="asig" style="cursor:pointer">${ui.kpi('Asignadas',k.asignadas.t,'b')}</div>
      <div data-k="real" style="cursor:pointer">${ui.kpi('Realizadas',k.realizadas.t,'g')}</div>
      <div data-k="sinasig" style="cursor:pointer">${ui.kpi('Sin asignar',k.sinAsignar.t,'r')}</div>
      <div data-k="fuera" style="cursor:pointer">${ui.kpi('Fuera de rango',k.fueraRango.t,'a')}</div>
    </div>
    <div class="card card-p">
      <table class="tbl"><thead><tr><th>#</th><th>Sucursal</th><th>Quincena</th><th>Shopper</th><th>Estado</th><th>Agenda</th><th>Honorario</th><th></th></tr></thead>
      <tbody id="vBody">${all.map(row).join('')}</tbody></table>
      <div style="margin-top:14px">${ui.aiBox('Cada visita es editable: sucursal, escenario, honorario, shopper y estado. Detecto solapamientos, fuera de rango y faltantes de cobertura antes de publicar.','Base operativa inteligente')}</div>
    </div>`;
  setTimeout(()=>{
    const filt=()=>{const q=(document.getElementById('vSearch').value||'').toLowerCase(),fe=document.getElementById('vEst').value,fp=document.getElementById('vPais').value;
      document.querySelectorAll('#vBody tr').forEach(tr=>{const v=all.find(z=>z.id===tr.dataset.vid);const ok=(!q||(v.sucursal+(v.shopper||'')+v.ciudad).toLowerCase().includes(q))&&(!fe||v.estado===fe)&&(!fp||v.pais===fp);tr.style.display=ok?'':'none';});};
    ['vSearch','vEst','vPais'].forEach(id=>document.getElementById(id).addEventListener('input',filt));
    const vp=document.getElementById('vProj');
    if(vp)vp.addEventListener('change',()=>{ if(vp.value==='all'){CX.session._visAll=true;} else {CX.session._visAll=false;data.setProject(vp.value);} CX.router.nav('visitas'); });
    const vKp={disp:['Visitas disponibles',v=>v.estado==='disponible'],asig:['Visitas asignadas',v=>v.shopperId],real:['Visitas realizadas',v=>['realizada','cuestionario','liquidada'].includes(v.estado)],sinasig:['Visitas sin asignar',v=>!v.shopperId&&v.estado!=='fuera_rango'],fuera:['Fuera de rango',v=>v.estado==='fuera_rango']};
    document.querySelectorAll('#vKpis [data-k]').forEach(el=>el.addEventListener('click',()=>{ const d=vKp[el.dataset.k]; const L=all.filter(d[1]);
      ui.modal(d[0]+' ('+L.length+')', L.length?`<table class="tbl"><thead><tr><th>Sucursal</th><th>Shopper</th><th>Estado</th><th>Honorario</th></tr></thead><tbody>${L.map(v=>`<tr><td><b style="font-size:12.5px">${v.sucursal}</b><div style="font-size:10px;color:var(--t3)">${CX.paisFlag(v.pais)} ${v.ciudad}</div></td><td style="font-size:12px">${v.shopper||'<span class="muted">—</span>'}</td><td>${ui.estadoBadge(v.estado)}</td><td style="font-size:12px;color:var(--green)">${ui.money(v.currency,v.honorario)}</td></tr>`).join('')}</tbody></table>`:ui.empty('🔍','Sin visitas en esta categoría.')); }));
    const editor=(v)=>ui.modal((v?'Editar':'Publicar')+' visita',`
      <div class="grid g2" style="gap:12px">
        <div style="grid-column:1/3"><label class="lbl">Sucursal (elige o escribe nueva)</label>
         <select class="sel" id="vSucSel" style="margin-bottom:5px"><option value="">— elegir existente —</option>${[...new Set(data._visitas.filter(x=>x.projectId===p.id).map(z=>z.sucursal)),(CX.hr?CX.hr.external(p).map(r=>r.sucursal).filter(Boolean):[])].flat().filter((s,i,a)=>s&&a.indexOf(s)===i).map(s=>`<option ${v&&v.sucursal===s?'selected':''}>${s}</option>`).join('')}</select>
         <input class="inp" id="vSucFree" value="${v?v.sucursal:''}" placeholder="o escribe una nueva sucursal · Ciudad"></div>
        <div><label class="lbl">País</label><select class="sel">${p.countries.map(c=>`<option ${v&&v.pais===c?'selected':''}>${c}</option>`).join('')}</select></div>
        <div><label class="lbl">Quincena</label><select class="sel">${p.quincenas.map(q=>`<option ${v&&v.quincena===q?'selected':''}>${q}</option>`).join('')}</select></div>
        <div><label class="lbl">Escenario</label><select class="sel">${p.scenarios.map(s=>`<option ${v&&v.escenario===s?'selected':''}>${s}</option>`).join('')}</select></div>
        <div><label class="lbl">Honorario</label><input class="inp" type="number" value="${v?v.honorario:''}"></div>
        <div><label class="lbl">Shopper asignado</label><select class="sel"><option value="">— sin asignar</option>${data.shoppersFor().map(s=>`<option ${v&&v.shopperId===s.id?'selected':''}>${s.nombre}</option>`).join('')}</select></div>
      </div>
      <div style="text-align:right;margin-top:16px"><button class="btn btn-pr btn-sm" onclick="CX.ui.toast('Visita guardada','ok');this.closest('.cx-ov').remove()">💾 Guardar</button></div>`);
    document.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>editor(all.find(z=>z.id===b.dataset.edit))));
    document.getElementById('addV').addEventListener('click',()=>editor(null));
    const assignModal=(v)=>{
      const shoppers=data.shoppersFor();
      ui.modal('Asignar visita · '+v.sucursal, `
        <div style="background:var(--brand-light);border-radius:10px;padding:9px 12px;font-size:12px;color:var(--brand-dark);margin-bottom:12px">${v.escenario} · ${v.ciudad} · ${ui.money(v.currency,v.honorario)} · ${v.quincena}</div>
        <div class="flex" style="gap:0;border:1px solid var(--border);border-radius:9px;overflow:hidden;margin-bottom:12px">
          <button class="btn btn-sm btn-pr asgTab" data-t="exist" style="border-radius:0;flex:1">Shopper existente</button>
          <button class="btn btn-sm btn-ghost asgTab" data-t="new" style="border-radius:0;flex:1">Crear nuevo</button>
        </div>
        <div id="asgExist"><input class="inp" id="asgSearch" placeholder="Buscar shopper…" style="margin-bottom:8px"><div id="asgList" style="max-height:240px;overflow:auto"></div></div>
        <div id="asgNew" style="display:none"><div class="grid g2" style="gap:10px 12px">
          <div><label class="lbl">Primer nombre <b style="color:var(--accent)">*</b></label><input class="inp" id="an_f"></div>
          <div><label class="lbl">Primer apellido <b style="color:var(--accent)">*</b></label><input class="inp" id="an_l"></div>
          <div style="grid-column:1/3"><label class="lbl">WhatsApp <b style="color:var(--accent)">*</b></label><input class="inp" id="an_w" placeholder="+502 ..."></div>
        </div><div style="text-align:right;margin-top:12px"><button class="btn btn-green btn-sm" id="an_save">Crear y asignar</button></div></div>
      `, {onMount:(ov,close)=>{
        const renderList=(q)=>{ const f=shoppers.filter(s=>!q||s.nombre.toLowerCase().includes(q.toLowerCase()));
          ov.querySelector('#asgList').innerHTML=f.length?f.map(s=>`<button class="btn btn-ghost btn-sm asgPick" data-id="${s.id}" style="width:100%;justify-content:space-between;margin-bottom:6px">${s.nombre}<span class="bdg bdg-n">${s.ciudad||CX.paisName(s.pais)}</span></button>`).join(''):ui.empty('🔍','Sin shoppers en este país. Crea uno nuevo.');
          ov.querySelectorAll('.asgPick').forEach(b=>b.addEventListener('click',()=>{ data.assignVisit(v.id,b.dataset.id); close(); ui.toast('Visita asignada a '+data.getShopper(b.dataset.id).nombre,'ok'); CX.router.nav('visitas'); })); };
        renderList('');
        ov.querySelector('#asgSearch').addEventListener('input',e=>renderList(e.target.value));
        ov.querySelectorAll('.asgTab').forEach(b=>b.addEventListener('click',()=>{ ov.querySelectorAll('.asgTab').forEach(x=>x.classList.replace('btn-pr','btn-ghost')); b.classList.replace('btn-ghost','btn-pr'); ov.querySelector('#asgExist').style.display=b.dataset.t==='exist'?'':'none'; ov.querySelector('#asgNew').style.display=b.dataset.t==='new'?'':'none'; }));
        ov.querySelector('#an_save').addEventListener('click',()=>{ const f=ov.querySelector('#an_f').value.trim(),l=ov.querySelector('#an_l').value.trim(),w=ov.querySelector('#an_w').value.trim(); if(!f||!l||!w){ui.toast('Nombre, apellido y WhatsApp','err');return;} const s=data.addShopper({via:'asignacion',estado:'Pendiente',firstName:f,lastName:l,whatsapp:w,pais:v.pais,ciudad:v.ciudad}); data.assignVisit(v.id,s.id); close(); ui.toast('Shopper creado y visita asignada','ok',3200); CX.router.nav('visitas'); });
      }});
    };
    document.querySelectorAll('[data-assign]').forEach(b=>b.addEventListener('click',()=>assignModal(all.find(z=>z.id===b.dataset.assign))));
  },0);
  return html;
});
