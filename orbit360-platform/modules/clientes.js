/* ============================================================
   CXOrbia · Clientes (capa de administración sobre proyectos)
   La consultora administra CLIENTES (empresas/marcas); cada
   proyecto cuelga de un cliente. Persistente y genérico.
   ============================================================ */
window.CX = window.CX || {};

(function(){
  const D=CX.data; if(!D) return;
  const LS_ADD='cx_clients', LS_PATCH='cx_client_patches';
  const slug=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

  /* semilla: agrupa proyectos existentes por su campo client */
  const seedMap={};
  D.projects.forEach(p=>{
    const name=p.client||p.name; const id='cl-'+slug(name);
    if(!seedMap[id]) seedMap[id]={id,name,industry:p.industry||'',pais:(p.countries&&p.countries[0])||'GT',
      estado:'Activo', plan:p.plan||'pro', desde:'2025',
      contactos:[{nombre:'Contacto Principal',rol:'Gerente de Marca',email:'contacto@'+slug(name)+'.com',whatsapp:''}]};
    p.clientId=id;
  });
  const seeds=Object.values(seedMap);
  seeds.push({id:'cl-prospecto-norte',name:'Prospecto Cadena Norte',industry:'Retail · Supermercados',pais:'GT',estado:'Prospecto',plan:'estandar',desde:'2026',contactos:[]});
  seeds.push({id:'cl-prospecto-salud',name:'Prospecto Red Salud',industry:'Salud · Clínicas',pais:'HN',estado:'Prospecto',plan:'pro',desde:'2026',contactos:[]});
  const SEED_IDS=new Set(seeds.map(c=>c.id));
  D.clients=seeds;

  let patches={}; try{patches=JSON.parse(localStorage.getItem(LS_PATCH)||'{}');}catch(e){}
  D.clients.forEach(c=>{ if(patches[c.id]) Object.assign(c,patches[c.id]); });
  try{ (JSON.parse(localStorage.getItem(LS_ADD)||'[]')).forEach(c=>{ if(!D.clients.some(x=>x.id===c.id)) D.clients.push(c); }); }catch(e){}

  function persist(){ const added=D.clients.filter(c=>!SEED_IDS.has(c.id));
    try{ localStorage.setItem(LS_ADD,JSON.stringify(added)); localStorage.setItem(LS_PATCH,JSON.stringify(patches)); }catch(e){} }

  D.getClient=function(id){ return this.clients.find(c=>c.id===id)||null; };
  D.projectsForClient=function(id){ return this.projects.filter(p=>p.clientId===id); };

  /* estadísticas operativas agregadas de un cliente (todas sus proyectos) */
  D.clientStats=function(id){
    const pids=this.projectsForClient(id).map(p=>p.id);
    const vis=this._visitas.filter(v=>pids.includes(v.projectId));
    const real=vis.filter(v=>['realizada','cuestionario','liquidada'].includes(v.estado));
    const liq=vis.filter(v=>v.estado==='liquidada');
    const cumpl=vis.length?Math.round(real.length/vis.length*100):0;
    // puntuación promedio: de los scores de cuestionario si existen, si no de rating de shoppers involucrados
    const scored=real.filter(v=>typeof v.score==='number');
    const score=scored.length?Math.round(scored.reduce((a,v)=>a+v.score,0)/scored.length)
      : (()=>{ const ids=[...new Set(vis.map(v=>v.shopperId).filter(Boolean))]; const rs=ids.map(i=>{const s=this.getShopper&&this.getShopper(i);return s&&s.rating;}).filter(Boolean); return rs.length?Math.round(rs.reduce((a,b)=>a+b,0)/rs.length*20):0; })();
    const fechas=vis.map(v=>v.realizada||v.agendada||v.disponibleDesde).filter(Boolean).sort();
    // ranking de sucursales por cumplimiento
    const bySuc={}; vis.forEach(v=>{const k=v.sucursal; const s=bySuc[k]=bySuc[k]||{t:0,r:0,suc:k,pais:v.pais}; s.t++; if(['realizada','cuestionario','liquidada'].includes(v.estado))s.r++;});
    const ranking=Object.values(bySuc).map(s=>({...s,pct:s.t?Math.round(s.r/s.t*100):0})).sort((a,b)=>b.pct-a.pct);
    return {visitas:vis.length, realizadas:real.length, liquidadas:liq.length, cumpl, score, ranking, ultima:fechas[fechas.length-1]||null, proyectos:pids.length};
  };

  D.addClient=function(cfg){ const id=cfg.id||('cl-'+slug(cfg.name||'cliente')+'-'+Date.now().toString(36).slice(-3));
    const c=Object.assign({id,estado:'Prospecto',plan:'estandar',contactos:[],industry:'',pais:'GT',desde:String(new Date().getFullYear())},cfg,{id});
    this.clients.push(c); persist();
    /* #174 — sincronizar con CRM: crear/vincular la Cuenta si no existe (misma entidad, una sola fuente) */
    try{ if(CX.crmStore){ const cuentas=CX.crmStore.cuentas();
      let cu=cuentas.find(x=>x.clientId===id || (x.nombre||'').toLowerCase()===(c.name||'').toLowerCase());
      if(!cu){ CX.crmStore.addCuenta({nombre:c.name,rubro:c.industry||'',pais:c.pais,estado:c.estado==='Activo'?'Cliente':'Prospecto',clientId:id}); }
      else { cu.clientId=id; cu.estado=c.estado==='Activo'?'Cliente':cu.estado; CX.crmStore.saveCuentas(); }
    }}catch(e){}
    CX.bus&&CX.bus.emit('clients'); return c; };
  D.updateClient=function(id,patch){ const c=this.getClient(id); if(!c)return null; Object.assign(c,patch);
    if(SEED_IDS.has(id)) patches[id]=Object.assign(patches[id]||{},patch); persist(); CX.bus&&CX.bus.emit('clients'); return c; };
})();

/* ---------- Módulo Clientes (admin) ---------- */
CX.module('clientes', ({data,ui})=>{
  const estadoTone={Activo:'g',Prospecto:'a',Inactivo:'n',Pausado:'a'};
  const list=()=>data.clients;
  const planLabel=(k)=>(CX.PLANS[k]&&CX.PLANS[k].label)||k||'—';

  const row=(c)=>{ const projs=data.projectsForClient(c.id); const st=data.clientStats?data.clientStats(c.id):{visitas:0,cumpl:0,score:0};
    return `<tr data-cid="${c.id}" style="cursor:pointer">
      <td><div class="flex"><div class="rail-av" style="width:30px;height:30px;font-size:11px;background:linear-gradient(135deg,var(--brand),var(--brand-dark))">${(c.name||'?').split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase()}</div>
        <div><b>${c.name}</b><div style="font-size:11px;color:var(--t3)">${c.industry||'—'}</div></div></div></td>
      <td style="font-size:12px">${CX.paisLabel(c.pais)}</td>
      <td style="font-size:12px">${projs.length}</td>
      <td style="font-size:12px">${st.visitas||0}</td>
      <td>${ui.bdg((st.cumpl||0)+'%',(st.cumpl||0)>=80?'g':(st.cumpl||0)>=50?'a':'r')}</td>
      <td>${st.score?ui.bdg(st.score+'/100','p'):'<span class="muted">—</span>'}</td>
      <td>${ui.bdg(c.estado,estadoTone[c.estado]||'n')}</td>
    </tr>`; };

  /* drill genérico para KPIs */
  const drill=(title,arr,render)=>ui.modal(title, arr.length?arr.map(render).join(''):ui.empty('🗂️','Sin elementos.'));

  const contactRow=(ct)=>`<div class="between" style="padding:8px 0;border-bottom:1px solid var(--border-2)">
    <div><b style="font-size:13px">${ct.nombre}</b><div style="font-size:11px;color:var(--t3)">${ct.rol||''}</div></div>
    <div style="text-align:right;font-size:11.5px;color:var(--t2)">${ct.email||''}<br>${ct.whatsapp||''}</div></div>`;

  const editForm=(c)=>{
    const paisOpts=CX.COUNTRIES.map(co=>`<option value="${co.c}" ${co.c===c.pais?'selected':''}>${CX.paisFlag(co.c)} ${co.n}</option>`).join('');
    const planOpts=Object.keys(CX.PLANS).map(k=>`<option value="${k}" ${k===c.plan?'selected':''}>${CX.PLANS[k].label}</option>`).join('');
    const estOpts=['Activo','Prospecto','Pausado','Inactivo'].map(e=>`<option ${e===c.estado?'selected':''}>${e}</option>`).join('');
    return `<div class="grid g2" style="gap:12px 14px">
      <div style="grid-column:1/3"><label class="lbl">Nombre del cliente</label><input class="inp" id="cl_name" value="${c.name||''}"></div>
      <div style="grid-column:1/3"><label class="lbl">Industria / rubro</label><select class="sel" id="cl_ind">${CX.RUBROS.map(r=>`<option ${r===c.industry?'selected':''}>${r}</option>`).join('')}${CX.RUBROS.includes(c.industry)?'':`<option selected>${c.industry||''}</option>`}</select></div>
      <div><label class="lbl">País principal</label><select class="sel" id="cl_pais">${paisOpts}</select></div>
      <div><label class="lbl">Estado</label><select class="sel" id="cl_est">${estOpts}</select></div>
      <div><label class="lbl">Plan contratado</label><select class="sel" id="cl_plan">${planOpts}</select></div>
      <div><label class="lbl">Cliente desde</label><input class="inp" id="cl_desde" value="${c.desde||''}"></div>
    </div>
    <div class="card-t" style="font-size:13px;margin:16px 0 8px">Agregar contacto</div>
    <div class="grid g2" style="gap:10px 14px">
      <div><label class="lbl">Nombre</label><input class="inp" id="ct_n" placeholder="Nombre"></div>
      <div><label class="lbl">Rol</label><input class="inp" id="ct_r" placeholder="Ej. Gerente regional"></div>
      <div><label class="lbl">Correo</label><input class="inp" id="ct_e" placeholder="correo@cliente.com"></div>
      <div><label class="lbl">WhatsApp</label><input class="inp" id="ct_w" placeholder="+502 ..."></div>
    </div>
    <div class="flex" style="justify-content:flex-end;gap:8px;margin-top:16px">
      <button class="btn btn-ghost btn-sm" data-cancel>Cancelar</button>
      <button class="btn btn-green btn-sm" id="cl_save">Guardar cliente</button>
    </div>`;
  };

  const detail=(c)=>{
    const projs=data.projectsForClient(c.id);
    const st=data.clientStats(c.id);
    ui.modal(c.name, `
      <div class="between" style="margin-bottom:14px;flex-wrap:wrap;gap:10px">
        <div><div class="card-t" style="font-size:16px">${c.name}</div>
          <div style="font-size:12px;color:var(--t3)">${c.industry||'—'} · ${CX.paisLabel(c.pais)}</div>
          <div class="flex" style="gap:6px;margin-top:6px">${ui.bdg(c.estado,estadoTone[c.estado]||'n')} ${ui.bdg(planLabel(c.plan),'b')} <span style="font-size:11px;color:var(--t3)">cliente desde ${c.desde||'—'}</span></div></div>
        <button class="btn btn-soft btn-sm" id="cl_edit">✎ Editar</button>
      </div>
      <div class="card-t" style="font-size:13px;margin-bottom:8px">📊 Desempeño histórico (todos sus proyectos)</div>
      <div class="grid g4" style="margin-bottom:6px">
        ${ui.kpi('Visitas',st.visitas,'b')}${ui.kpi('Cumplimiento',st.cumpl+'%',st.cumpl>=80?'g':'a')}
        ${ui.kpi('Puntuación',st.score?st.score+'/100':'—','p')}${ui.kpi('Proyectos',st.proyectos,'n')}
      </div>
      <div style="font-size:11px;color:var(--t3);margin-bottom:14px">Última actividad: ${st.ultima||'—'} · ${st.realizadas} realizadas · ${st.liquidadas} liquidadas</div>
      ${st.ranking.length?`<div class="card-t" style="font-size:13px;margin-bottom:8px">🏆 Ranking de sucursales por cumplimiento</div>
        <div style="overflow-x:auto;margin-bottom:14px"><table class="tbl"><thead><tr><th>#</th><th>Sucursal</th><th>Realizadas/Total</th><th>Cumplimiento</th></tr></thead><tbody>
        ${st.ranking.slice(0,8).map((s,i)=>`<tr><td style="font-family:var(--disp);color:var(--t3)">${i+1}</td><td><b>${s.suc}</b> <span class="muted">${CX.paisFlag(s.pais)}</span></td><td style="font-size:12px">${s.r}/${s.t}</td><td>${ui.bdg(s.pct+'%',s.pct>=80?'g':s.pct>=50?'a':'r')}</td></tr>`).join('')}
        </tbody></table></div>`:''}
      <div class="card-t" style="font-size:13px;margin-bottom:8px">Proyectos del cliente</div>
      ${projs.length?projs.map(p=>`<div class="card hov between" data-goproj="${p.id}" style="padding:10px 12px;cursor:pointer;margin-bottom:8px">
        <div><b style="font-size:13px">${p.name}</b><div style="font-size:11px;color:var(--t3)">${p.industry||''}</div></div>
        <span class="bdg bdg-b">Abrir →</span></div>`).join(''):ui.empty('🗂️','Sin proyectos. Créalos desde Proyectos.')}
      <div class="card-t" style="font-size:13px;margin:16px 0 8px">Contactos</div>
      <div id="cl_contacts">${(c.contactos||[]).length?c.contactos.map(contactRow).join(''):'<div style="font-size:12.5px;color:var(--t3)">Sin contactos registrados.</div>'}</div>
    `, {onMount:(ov,close)=>{
      ov.querySelectorAll('[data-goproj]').forEach(el=>el.addEventListener('click',()=>{ data.setProject(el.dataset.goproj); close(); CX.router.nav('dashboard'); CX.ui.toast('Proyecto activo: '+data.project().name,'ok'); }));
      ov.querySelector('#cl_edit').addEventListener('click',()=>{
        const body=ov.querySelector('.cx-modal-b'); body.innerHTML=editForm(c);
        body.querySelector('[data-cancel]').addEventListener('click',()=>{ close(); detail(c); });
        body.querySelector('#cl_save').addEventListener('click',()=>{
          const patch={ name:body.querySelector('#cl_name').value.trim()||c.name, industry:body.querySelector('#cl_ind').value.trim(),
            pais:body.querySelector('#cl_pais').value, estado:body.querySelector('#cl_est').value, plan:body.querySelector('#cl_plan').value, desde:body.querySelector('#cl_desde').value.trim() };
          const cn=body.querySelector('#ct_n').value.trim();
          const contactos=(c.contactos||[]).slice();
          if(cn) contactos.push({nombre:cn,rol:body.querySelector('#ct_r').value.trim(),email:body.querySelector('#ct_e').value.trim(),whatsapp:body.querySelector('#ct_w').value.trim()});
          patch.contactos=contactos;
          data.updateClient(c.id,patch); close(); CX.ui.toast('Cliente actualizado','ok'); CX.router.nav('clientes');
        });
      });
    }});
  };

  const addModal=()=>{
    const paisOpts=CX.COUNTRIES.map(co=>`<option value="${co.c}">${CX.paisFlag(co.c)} ${co.n}</option>`).join('');
    const planOpts=Object.keys(CX.PLANS).map(k=>`<option value="${k}" ${k==='estandar'?'selected':''}>${CX.PLANS[k].label}</option>`).join('');
    ui.modal('Nuevo cliente', `
      <div class="grid g2" style="gap:12px 14px">
        <div style="grid-column:1/3"><label class="lbl">Nombre del cliente <b style="color:var(--accent)">*</b></label><input class="inp" id="nc_name" placeholder="Empresa / marca"></div>
        <div style="grid-column:1/3"><label class="lbl">Industria / rubro</label><select class="sel" id="nc_ind">${CX.RUBROS.map(r=>`<option>${r}</option>`).join('')}</select></div>
        <div><label class="lbl">País principal</label><select class="sel" id="nc_pais">${paisOpts}</select></div>
        <div><label class="lbl">Plan</label><select class="sel" id="nc_plan">${planOpts}</select></div>
        <div style="grid-column:1/3"><label class="lbl">Contacto principal (opcional)</label><input class="inp" id="nc_ct" placeholder="Nombre · rol · correo"></div>
      </div>
      <div style="text-align:right;margin-top:16px"><button class="btn btn-green" id="nc_save">Crear cliente</button></div>
    `, {onMount:(ov,close)=>{
      ov.querySelector('#nc_save').addEventListener('click',()=>{
        const name=ov.querySelector('#nc_name').value.trim();
        if(!name){ CX.ui.toast('Ponle nombre al cliente','err'); return; }
        const ct=ov.querySelector('#nc_ct').value.trim();
        data.addClient({ name, industry:ov.querySelector('#nc_ind').value.trim(), pais:ov.querySelector('#nc_pais').value,
          plan:ov.querySelector('#nc_plan').value, estado:'Prospecto',
          contactos: ct?[{nombre:ct,rol:'',email:'',whatsapp:''}]:[] });
        close(); CX.ui.toast('Cliente creado','ok'); CX.router.nav('clientes');
      });
    }});
  };

  setTimeout(()=>{
    const L=list();
    document.getElementById('clNew')?.addEventListener('click',addModal);
    document.querySelectorAll('#clBody [data-cid]').forEach(tr=>tr.addEventListener('click',()=>{const c=data.getClient(tr.dataset.cid); if(c)detail(c);}));
    // KPIs clickeables
    const kp={
      total:['Todos los clientes',L,c=>row(c)],
      activos:['Clientes activos',L.filter(c=>c.estado==='Activo'),c=>row(c)],
      prospectos:['Prospectos',L.filter(c=>c.estado==='Prospecto'),c=>row(c)],
      proyectos:['Proyectos por cliente',L,c=>`<div class="between" style="padding:8px 0;border-bottom:1px solid var(--border-2)"><b style="font-size:13px">${c.name}</b><span class="bdg bdg-b">${data.projectsForClient(c.id).length} proyectos</span></div>`],
    };
    document.querySelectorAll('#clKpis [data-k]').forEach(el=>el.addEventListener('click',()=>{const d=kp[el.dataset.k];ui.modal(d[0],`<table class="tbl"><tbody>${d[1].map(d[2]).join('')}</tbody></table>`);
      // re-enlazar filas dentro del drill
      setTimeout(()=>document.querySelectorAll('.cx-ov [data-cid]').forEach(tr=>tr.addEventListener('click',()=>{const c=data.getClient(tr.dataset.cid);if(c)detail(c);})),0);
    }));
    const s=document.getElementById('clSearch');
    s&&s.addEventListener('input',()=>{ const q=s.value.toLowerCase().trim();
      const f=L.filter(c=>!q||[c.name,c.industry,CX.paisName(c.pais)].join(' ').toLowerCase().includes(q));
      document.getElementById('clBody').innerHTML=f.map(row).join('');
      document.querySelectorAll('#clBody [data-cid]').forEach(tr=>tr.addEventListener('click',()=>{const c=data.getClient(tr.dataset.cid);if(c)detail(c);}));
    });
  },0);

  const L=list();
  return `
    ${ui.ph('Clientes', 'Administra las empresas/marcas que contratan a tu consultora · cada proyecto cuelga de un cliente')}
    <div class="grid g4" style="margin-bottom:16px" id="clKpis">
      <div data-k="total" style="cursor:pointer">${ui.kpi('Clientes',L.length,'b')}</div>
      <div data-k="activos" style="cursor:pointer">${ui.kpi('Activos',L.filter(c=>c.estado==='Activo').length,'g')}</div>
      <div data-k="prospectos" style="cursor:pointer">${ui.kpi('Prospectos',L.filter(c=>c.estado==='Prospecto').length,'a')}</div>
      <div data-k="proyectos" style="cursor:pointer">${ui.kpi('Proyectos activos',data.projects.length,'p')}</div>
    </div>
    <div class="card card-p">
      <div class="card-h"><div class="card-t">Cartera de clientes</div>
        <div class="flex" style="gap:8px"><input class="inp" id="clSearch" placeholder="Buscar cliente, rubro, país…" style="width:230px"><button class="btn btn-pr btn-sm" id="clNew">+ Nuevo cliente</button></div></div>
      <table class="tbl"><thead><tr><th>Cliente</th><th>País</th><th>Proyectos</th><th>Visitas</th><th>Cumplimiento</th><th>Puntuación</th><th>Estado</th></tr></thead>
      <tbody id="clBody">${L.map(row).join('')}</tbody></table>
      <div style="margin-top:14px">${ui.aiBox('Cada fila es un <b>cliente de tu consultora</b> con su desempeño real (visitas, cumplimiento, puntuación). Toca un cliente para ver su historial, ranking de sucursales y contactos; abre un proyecto suyo para activarlo en la operación.','Administración de clientes, no venta de software')}</div>
    </div>`;
});
