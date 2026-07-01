    document.querySelectorAll('#midKpis [data-mk]').forEach(el=>el.addEventListener('click',()=>{const d=kDrills[el.dataset.mk];if(!d)return;const L=d[1]();ui.modal(d[0]+' ('+L.length+')',L.length?'<table class="tbl"><tbody>'+L.slice(0,20).map(v=>'<tr><td><b>'+v.sucursal+'</b></td><td style="font-size:12px">'+(v.shopper||'—')+'</td><td>'+(v.estado||'')+'</td></tr>').join('')+'</tbody></table>':ui.empty('✅','Sin registros.'));}));
/* CXOrbia · Mi Día (admin + shopper) */
let _cgMonth='2026-06', _cgByDay={}, _cgProj='';
function _shiftMonth(ym,delta){let[y,m]=ym.split('-').map(Number);m+=delta;if(m<1){m=12;y--;}if(m>12){m=1;y++;}return y+'-'+String(m).padStart(2,'0');}
CX.module('midia', ({data,role,ui})=>{
  const p=data.project();
  /* bloque de notificaciones (común a ambos roles) */
  const notifBlock=()=>{
    const fe=CX.notif.for(role).slice(0,4), un=CX.notif.unread(role);
    return `<div class="card card-p" style="margin-bottom:16px">
      <div class="card-h"><div class="card-t">🔔 Notificaciones ${un?`<span class="bdg bdg-r">${un} sin leer</span>`:''}</div><button class="btn btn-ghost btn-sm" data-nav="tablon">Ver todas →</button></div>
      ${fe.length?fe.map(n=>`<div class="between" data-ngo="${n.id}" style="cursor:pointer;padding:9px 11px;border-radius:9px;${n.leida?'':'background:var(--'+CX.notif.toneVar(n.tono)+'-bg)'};margin-bottom:6px">
        <div class="flex"><span style="font-size:16px">${n.icon}</span><div><div style="font-size:12.5px;font-weight:700;color:var(--t1)">${n.titulo}</div><div style="font-size:11px;color:var(--t3)">${n.txt} · ${n.fecha}</div></div></div>
        ${n.accion==='confirmar_fecha'?'<span class="btn btn-green btn-sm">Confirmar</span>':'<span style="color:var(--t3)">›</span>'}</div>`).join(''):ui.empty('🔔','Sin notificaciones')}
    </div>`;
  };
  const bindNotif=()=>{setTimeout(()=>{
    document.querySelectorAll('[data-ngo]').forEach(b=>b.addEventListener('click',()=>{const n=CX.notif.for(role).find(x=>x.id===b.dataset.ngo);CX.notif.markRead(n.id);CX.router.nav(n.nav||'tablon');}));
    document.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',()=>CX.router.nav(b.dataset.nav)));
    document.querySelectorAll('.asgDone').forEach(b=>b.addEventListener('click',()=>{CX.automations.resolverAsignacion(b.dataset.id);CX.router.nav('midia');CX.ui&&CX.ui.toast('Asignación resuelta','ok');}));
    document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>CX.router.nav(b.dataset.go)));
    document.querySelectorAll('[data-cgo]').forEach(b=>b.addEventListener('click',()=>CX.router.nav(b.dataset.cgo)));
    document.querySelectorAll('[data-day]').forEach(c=>c.addEventListener('click',()=>{
      const its=_cgByDay[c.dataset.day]||[];
      const body=its.map(it=>`<div class="between" data-cgo2="${it.nav}" style="cursor:pointer;padding:9px 11px;border:1px solid var(--border);border-radius:9px;margin-bottom:8px"><div class="flex"><span style="font-size:16px">${it.icon}</span><div><div style="font-size:13px;font-weight:700">${it.titulo}</div><div style="font-size:11px;color:var(--t3)">${it.sub}</div></div></div>${it.estado==='tarea'?CX.ui.bdg('Tarea','a'):CX.ui.estadoBadge(it.estado)}</div>`).join('');
      CX.ui.modal('Agenda · '+c.dataset.day, body, {onMount:(ov,close)=>ov.querySelectorAll('[data-cgo2]').forEach(b=>b.addEventListener('click',()=>{close();CX.router.nav(b.dataset.cgo2);}))});
    }));
    const pv=document.getElementById('cgPrev'); if(pv)pv.addEventListener('click',()=>{_cgMonth=_shiftMonth(_cgMonth,-1);CX.router.nav('midia');});
    const nx=document.getElementById('cgNext'); if(nx)nx.addEventListener('click',()=>{_cgMonth=_shiftMonth(_cgMonth,1);CX.router.nav('midia');});
    const cp=document.getElementById('cgProj'); if(cp)cp.addEventListener('change',()=>{_cgProj=cp.value;CX.router.nav('midia');});
    document.querySelectorAll('#midKpis [data-mk]').forEach(el=>el.addEventListener('click',()=>{const kD={agd:['Agendadas',data.visitas().filter(v=>['agendada','realizada','cuestionario','liquidada'].includes(v.estado)),'visitas'],post:['Por aprobar',data._posts.filter(p=>p.estado==='pendiente'),'postulaciones'],real:['Realizadas',data.visitas().filter(v=>['realizada','cuestionario','liquidada'].includes(v.estado)),'visitas'],sinA:['Sin asignar',data.visitas().filter(v=>!v.shopperId&&v.estado!=='fuera_rango'),'visitas']};const d=kD[el.dataset.mk];if(!d)return;const L=d[1];ui.modal(d[0]+' ('+L.length+')',L.length?'<table class="tbl"><thead><tr><th>Sucursal</th><th>Shopper</th><th>Estado</th></tr></thead><tbody>'+L.slice(0,20).map(v=>'<tr><td><b>'+v.sucursal+'</b></td><td style="font-size:12px">'+(v.shopper||'—')+'</td><td>'+(v.estado||'')+'</td></tr>').join('')+'</tbody></table>':ui.empty('✅','Sin registros.'));}));
  },0);};

  /* Cronograma: visitas + tareas agrupadas por día (admin y shopper) — TODOS los proyectos + filtro */
  const cronograma=()=>{
    const sid=CX.session.user.shopperId;
    const projName=(id)=>{const pr=data.projects.find(x=>x.id===id);return pr?pr.name:'';};
    let pool=data._visitas; if(_cgProj) pool=pool.filter(v=>v.projectId===_cgProj);
    let vis;
    if(role==='shopper') vis=pool.filter(v=>v.shopperId===sid||['asignada','agendada','realizada'].includes(v.estado));
    else vis=pool.filter(v=>v.agendada||['asignada','realizada','cuestionario'].includes(v.estado));
    const items=[];
    vis.forEach(v=>{
      const f=(v.agendada||v.disponibleDesde||'').slice(0,10);
      const pn=projName(v.projectId);
      if(f) items.push({fecha:f, icon:'📍', titulo:v.sucursal, sub:(v.escenario||'')+' · '+pn+(role==='admin'&&v.shopper?(' · '+v.shopper):(' · '+v.ciudad)), estado:v.estado, nav:role==='shopper'?'misvisitas':'visitas'});
      if(v.estado==='realizada') items.push({fecha:(v.realizada||f||'').slice(0,10), icon:'📝', titulo:'Cuestionario pendiente', sub:v.sucursal+' · '+pn, estado:'tarea', nav:role==='shopper'?'misvisitas':'visitas'});
    });
    if(role==='admin'){ const k=data.kpis(); const hoy='2026-06-21';
      if(k.postPend) items.push({fecha:hoy,icon:'📩',titulo:k.postPend+' postulaciones por revisar',sub:'Gestión de postulaciones',estado:'tarea',nav:'postulaciones'});
      if(k.sinAsignar.t) items.push({fecha:hoy,icon:'📌',titulo:k.sinAsignar.t+' visitas sin asignar',sub:'Asignar shoppers',estado:'tarea',nav:'visitas'});
    }
    const byDay={}; items.forEach(it=>{ if(!it.fecha)return; (byDay[it.fecha]=byDay[it.fecha]||[]).push(it); });
    _cgByDay=byDay;
    const allP=[...new Set(data._visitas.map(v=>v.projectId))].map(id=>({id,name:projName(id)}));
    const [Y,M]=_cgMonth.split('-').map(Number);
    const first=new Date(Y,M-1,1); const startDow=(first.getDay()+6)%7;
    const daysIn=new Date(Y,M,0).getDate(); const today='2026-06-21';
    const monthLabel=first.toLocaleDateString('es-GT',{month:'long',year:'numeric'});
    const wd=['L','M','M','J','V','S','D'];
    let cells='';
    for(let i=0;i<startDow;i++) cells+='<div class="cg-cell cg-empty"></div>';
    for(let dd=1;dd<=daysIn;dd++){
      const ds=Y+'-'+String(M).padStart(2,'0')+'-'+String(dd).padStart(2,'0');
      const its=byDay[ds]||[]; const isT=ds===today;
      cells+=`<div class="cg-cell${its.length?' cg-has':''}${isT?' cg-today':''}"${its.length?` data-day="${ds}"`:''}>
        <div class="cg-num">${dd}</div>
        ${its.length?`<div class="cg-dots">${its.slice(0,4).map(it=>`<span class="cg-dot" style="background:${it.estado==='tarea'?'var(--amber)':'var(--brand)'}"></span>`).join('')}${its.length>4?`<span style="font-size:9px;color:var(--t3)">+${its.length-4}</span>`:''}</div>`:''}
      </div>`;
    }
    return `<div class="card card-p" style="margin-bottom:16px">
      <div class="card-h"><div class="card-t">🗓️ Cronograma <span class="muted" style="font-size:11px">· todos los proyectos</span></div>
        <div class="flex" style="gap:6px"><select class="sel" id="cgProj" style="width:auto;padding:5px 9px;font-size:12px"><option value="">🗂️ Todos</option>${allP.map(pr=>`<option value="${pr.id}" ${pr.id===_cgProj?'selected':''}>${pr.name}</option>`).join('')}</select><button class="btn btn-ghost btn-sm" id="cgPrev">‹</button><span style="font-size:12.5px;font-weight:800;text-transform:capitalize;min-width:120px;text-align:center">${monthLabel}</span><button class="btn btn-ghost btn-sm" id="cgNext">›</button></div></div>
      <div class="cg-grid cg-head">${wd.map(w=>`<div class="cg-wd">${w}</div>`).join('')}</div>
      <div class="cg-grid">${cells}</div>
      <div style="font-size:11px;color:var(--t3);margin-top:10px"><span class="cg-dot" style="background:var(--brand)"></span> visita &nbsp; <span class="cg-dot" style="background:var(--amber)"></span> tarea &nbsp;·&nbsp; toca un día con actividad</div>
    </div>`;
  };
  if(role==='admin'){
    const k=data.kpis();
    const tasks=[
      ['📩',`${k.postPend} postulaciones por revisar`,'postulaciones',k.postPend],
      ['📌',`${k.sinAsignar.t} visitas sin asignar`,'visitas',k.sinAsignar.t],
      ['📝',`${k.cuestPend.t} pendientes de cuestionario`,'dashboard',k.cuestPend.t],
      ['⏰',`${k.fueraRango.t} fuera de rango`,'dashboard',k.fueraRango.t],
    ].filter(t=>t[3]>0);
    bindNotif();
    return `
      ${ui.ph('Mi Día', 'Buen día, '+(CX.session.user.name.split(' ')[0])+' 👋 · '+p.name)}
      <div class="grid g4" style="margin-bottom:18px" id="midKpis">
        <div data-mk="agd" style="cursor:pointer">${ui.kpi('Agendadas',k.agendadas.t,'b')}</div>
        <div data-mk="post" style="cursor:pointer">${ui.kpi('Por aprobar',k.postPend,'a')}</div>
        <div data-mk="real" style="cursor:pointer">${ui.kpi('Realizadas',k.realizadas.t,'g')}</div>
        <div data-mk="sinA" style="cursor:pointer">${ui.kpi('Sin asignar',k.sinAsignar.t,'r')}</div>
      </div>
      ${notifBlock()}
      ${(()=>{const asg=CX.automations&&CX.automations.pendientesPara?CX.automations.pendientesPara('admin'):[];return asg.length?`
      <div class="card card-p" style="margin-bottom:16px;border-left:3px solid var(--amber)">
        <div class="card-h"><div class="card-t">📌 Asignaciones internas pendientes (${asg.length})</div></div>
        ${asg.slice(0,6).map(a=>`<div class="between" style="padding:7px 0;border-bottom:1px solid var(--border-2)"><div><b style="font-size:12.5px">${a.titulo}</b><div style="font-size:11px;color:var(--t3)">${a.detalle||''} · 👤 ${a.responsable||'—'}</div></div><button class="btn btn-soft btn-sm asgDone" data-id="${a.id}">✓ Resuelto</button></div>`).join('')}
      </div>`:'';})()}
      ${cronograma()}
      <div class="card card-p">
        <div class="card-h"><div class="card-t">Lo que requiere tu acción</div></div>
        ${tasks.length?tasks.map(t=>`<div class="between" data-go="${t[2]}" style="cursor:pointer;padding:12px 13px;border:1px solid var(--border);border-radius:11px;margin-bottom:9px">
          <div class="flex"><div style="font-size:20px">${t[0]}</div><span style="font-size:13.5px;font-weight:600;color:var(--t1)">${t[1]}</span></div>
          <span class="btn btn-soft btn-sm">Ir →</span></div>`).join(''):ui.empty('✅','Todo al día')}
        <div style="margin-top:8px">${ui.aiBox('Solo te muestro lo accionable y lo resalto por urgencia, antes de que escale a incumplimiento.','Tu día, priorizado')}</div>
      </div>`;
  }
  // shopper
  bindNotif();
  const mine=data.visitas().filter(v=>v.shopperId==='sh1'||['asignada','agendada'].includes(v.estado)).slice(0,2);
  const steps=['Postulación aprobada|done','Instructivo leído|done','Certificación 88%|done','Visita realizada|now','Cuestionario|todo','Liquidación|todo'];
  return `
    ${ui.ph('Mi Día', 'Hola, '+CX.session.user.name.split(' ')[0]+' 👋')}
    ${notifBlock()}
    ${cronograma()}
    <div class="card card-p" style="margin-bottom:16px">
      <div class="card-h"><div class="card-t">Tu próxima visita</div>${ui.bdg('Por agendar','a')}</div>
      ${mine[0]?`<div style="font-size:15px;font-weight:700;color:var(--t1)">${mine[0].sucursal}</div>
      <div style="font-size:12px;color:var(--t3);margin:3px 0 12px">Rango ${mine[0].rango} · ${ui.money(mine[0].currency,mine[0].honorario)}${mine[0].combo?' + '+mine[0].combo:''}</div>
      <div class="flex wrap"><button class="btn btn-pr btn-sm">📅 Agendar</button><button class="btn btn-ghost btn-sm">📄 Instructivo</button><button class="btn btn-ghost btn-sm">🔄 Reprogramar</button></div>`:ui.empty('🧭','Sin visitas activas')}
    </div>
    <div class="card card-p">
      <div class="card-h"><div class="card-t">Progreso de la visita</div></div>
      ${steps.map(s=>{const[t,st]=s.split('|');const ic=st==='done'?'✅':st==='now'?'⏳':'○';const col=st==='done'?'var(--green)':st==='now'?'var(--brand)':'var(--t3)';
        return `<div class="flex" style="padding:6px 0;font-size:13px;color:${col};font-weight:${st==='now'?'700':'500'}">${ic} <span>${t}</span></div>`;}).join('')}
    </div>`;
});
