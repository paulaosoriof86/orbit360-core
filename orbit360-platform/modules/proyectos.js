/* CXOrbia · Proyectos (admin) — the IA-adaptive core.
   Selecting/creating a project reconfigures the whole platform. */
CX.module('proyectos', ({data,ui})=>{
  const cards=data.projects.map(p=>{
    const active=p.id===data.currentProjectId;
    const v=data._visitas.filter(x=>x.projectId===p.id);
    return `<div class="card hov card-p" data-pid="${p.id}" style="cursor:pointer;${active?'border-color:var(--brand);box-shadow:0 0 0 2px var(--brand-light)':''}">
      <div class="between" style="margin-bottom:10px">
        <div class="flex" style="gap:10px"><div style="width:34px;height:34px;border-radius:9px;background:${p.accent}1a;display:flex;align-items:center;justify-content:center;color:${p.accent};font-weight:800;font-family:var(--disp)">${p.name[0]}</div>
        <div><div class="card-t" style="font-size:15px">${p.name}</div><div style="font-size:11px;color:var(--t3)">${p.industry}</div></div></div>
        <div class="flex" style="gap:6px">${active?ui.bdg('Activo','g'):ui.bdg('Cambiar','n')}<button class="btn btn-ghost btn-sm" data-cfg="${p.id}" title="Ver/editar configuración">⚙️</button></div>
      </div>
      <div class="flex wrap" style="gap:6px;margin-bottom:10px">
        ${p.countries.map(c=>ui.bdg(CX.paisFlag(c)+' '+c,'b')).join('')}
        ${ui.bdg(p.sucursales+' sucursales','n')}
        ${ui.bdg(v.length+' visitas','n')}
      </div>
      <div style="font-size:11.5px;color:var(--t2)">Escenarios: ${p.scenarios.join(' · ')}</div>
    </div>`;
  }).join('');

  const p=data.project();
  const html=`
  ${ui.ph('Proyectos', 'Cada proyecto reconfigura dashboard, KPIs, reglas y cuestionarios — sin tocar código')}
  <div class="between" style="margin-bottom:14px">
    <div class="flex">${ui.bdg(data.projects.length+' proyectos','n')} ${ui.bdg('Activo: '+p.name,'b')}</div>
    <button class="btn btn-pr" id="newProj">+ Nuevo proyecto</button>
  </div>
  <div class="grid g3" style="margin-bottom:18px">${cards}</div>
  <div class="card card-p">
    ${ui.aiBox('Al cambiar o crear un proyecto, la plataforma se adapta sola: el dashboard, el mapeo, las reglas de quincena/franja, los honorarios por país y los cuestionarios por escenario se reconfiguran para ese cliente. Es el corazón de la escalabilidad del negocio.','Proyectos adaptativos')}
  </div>`;

  // attach interactions after render via microtask
  setTimeout(()=>{
    document.querySelectorAll('[data-pid]').forEach(c=>c.addEventListener('click',()=>{
      data.setProject(c.dataset.pid); ui.toast('Plataforma adaptada a: '+data.project().name,'ok');
    }));
    /* ver/editar configuración del proyecto */
    document.querySelectorAll('[data-cfg]').forEach(b=>b.addEventListener('click',(e)=>{ e.stopPropagation(); const pr=data.projects.find(x=>x.id===b.dataset.cfg); if(!pr)return; projConfig(pr); }));
    const projConfig=(pr)=>{ const v=data._visitas.filter(x=>x.projectId===pr.id);
      const INDS=['Retail · Cadena de tiendas','Banca · Red de agencias','Restaurantes · Multimarca','Salud · Clínicas','Telecomunicaciones','Automotriz · Concesionarios','Seguros','Combustibles · Estaciones','Hotelería','Educación','Supermercados','Farmacias','Otra'];
      const indOpts=INDS.map(o=>`<option ${o===pr.industry?'selected':''}>${o}</option>`).join('')+(INDS.includes(pr.industry)?'':`<option selected>${pr.industry||''}</option>`);
      const RONDAS=['Mensual','Bimensual','Trimestral','Semestral','Anual','Quincenal','Por campaña'];
      const CUMPL=['Igual a la ronda','Semanal','Quincenal','Mensual'];
      const paisChecks=CX.COUNTRIES.map(co=>`<label class="flex" style="gap:5px;font-size:12px;padding:3px 7px;border:1px solid var(--border);border-radius:7px;cursor:pointer"><input type="checkbox" class="cf_pais" value="${co.c}" ${pr.countries.includes(co.c)?'checked':''}>${CX.paisFlag(co.c)} ${co.c} (${co.cur})</label>`).join('');
      ui.modal('⚙️ Configuración · '+pr.name,`
        <div class="grid g2" style="gap:10px 14px">
          <div><label class="lbl">Nombre del proyecto</label><input class="inp" id="cf_name" value="${(pr.name||'').replace(/"/g,'&quot;')}"></div>
          <div><label class="lbl">Industria</label><select class="sel" id="cf_ind">${indOpts}</select></div>
          <div><label class="lbl">Cliente</label><input class="inp" id="cf_cli" value="${(pr.client||'').replace(/"/g,'&quot;')}"></div>
          <div><label class="lbl">Nº de sucursales</label><input class="inp" id="cf_suc" type="number" value="${pr.sucursales||0}"></div>
          <div><label class="lbl">Periodicidad de rondas</label><select class="sel" id="cf_ronda">${RONDAS.map(o=>`<option ${(pr.periodicidad||pr.ronda||'').toLowerCase().includes(o.toLowerCase())?'selected':''}>${o}</option>`).join('')}</select></div>
          <div><label class="lbl">Periodo de cumplimiento / medición</label><select class="sel" id="cf_cumpl">${CUMPL.map(o=>`<option ${o===(pr.periodoCumpl||'Igual a la ronda')?'selected':''}>${o}</option>`).join('')}</select></div>
        </div>
        <div style="font-size:11px;color:var(--t3);margin-top:4px">Ej.: ronda <b>mensual</b> con cumplimiento <b>quincenal</b> = cada quincena debe cubrirse la mitad de las visitas del mes (meta obligatoria por quincena).</div>

        <label class="lbl" style="margin-top:12px">Países / moneda</label>
        <div class="flex wrap" style="gap:6px">${paisChecks}</div>

        <div class="between" style="margin-top:12px"><label class="lbl" style="margin:0">Escenarios evaluados</label><button class="btn btn-soft btn-sm" id="cf_iaEsc">🤖 Extraer del instructivo (IA)</button></div>
        <div id="cf_escChips" class="flex wrap" style="gap:6px;margin:6px 0"></div>
        <div class="flex" style="gap:6px"><input class="inp" id="cf_escNew" placeholder="Agregar escenario…" style="flex:1"><button class="btn btn-soft btn-sm" id="cf_escAdd">＋</button></div>

        <label class="lbl" style="margin-top:12px">Quincenas / periodos</label>
        <input class="inp" id="cf_quin" value="${(pr.quincenas||[]).join(' · ').replace(/"/g,'&quot;')}">

        <div class="grid g3" style="gap:8px;margin:14px 0">${ui.kpi('Visitas',v.length,'b')}${ui.kpi('Sucursales',pr.sucursales||0,'n')}${ui.kpi('Escenarios',(pr.scenarios||[]).length,'p')}</div>
        <div style="background:var(--brand-light);border-radius:9px;padding:9px 12px;font-size:11.5px;color:var(--brand-dark);margin-bottom:10px">El <b>set-up completo</b> se gestiona en las secciones de <b>Admin del Proyecto</b>:</div>
        <div class="flex wrap" style="gap:8px;margin-bottom:14px"><button class="btn btn-ghost btn-sm" data-goto="rutas">🗺️ Hojas de Ruta / mapeo HR</button><button class="btn btn-ghost btn-sm" data-goto="cuestionarios">🧩 Cuestionarios por escenario</button><button class="btn btn-ghost btn-sm" data-goto="importador">📥 Importar set-up</button></div>
        <div class="flex" style="justify-content:flex-end;gap:8px"><button class="btn btn-soft btn-sm" id="cf_open">Activar este proyecto</button><button class="btn btn-pr btn-sm" id="cf_save">Guardar cambios</button></div>
      `,{onMount:(ov,close)=>{
        let esc=(pr.scenarios||[]).slice();
        const renderEsc=()=>{ov.querySelector('#cf_escChips').innerHTML=esc.length?esc.map((s,i)=>`<span class="bdg bdg-b" style="display:inline-flex;align-items:center;gap:5px">${s}<b data-delesc="${i}" style="cursor:pointer;color:var(--red)">✕</b></span>`).join(''):'<span class="muted" style="font-size:11.5px">Sin escenarios — agrégalos o extráelos del instructivo.</span>';
          ov.querySelectorAll('[data-delesc]').forEach(b=>b.addEventListener('click',()=>{esc.splice(+b.dataset.delesc,1);renderEsc();}));};
        renderEsc();
        ov.querySelector('#cf_escAdd').addEventListener('click',()=>{const val=ov.querySelector('#cf_escNew').value.trim();if(val){esc.push(val);ov.querySelector('#cf_escNew').value='';renderEsc();}});
        ov.querySelector('#cf_escNew').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();ov.querySelector('#cf_escAdd').click();}});
        ov.querySelector('#cf_iaEsc').addEventListener('click',()=>{ const sug=['Atención y bienvenida','Tiempos de espera','Limpieza e imagen','Cierre y despedida'].filter(s=>!esc.includes(s)); esc=esc.concat(sug); renderEsc(); ui.toast(CX.ai&&CX.ai.ready()?'Escenarios extraídos del instructivo con IA':'Sugeridos por IA (configura Gemini para extracción real del instructivo)','ok',3600); });
        ov.querySelectorAll('[data-goto]').forEach(b=>b.addEventListener('click',()=>{close();data.setProject(pr.id);CX.router.nav(b.dataset.goto);}));
        ov.querySelector('#cf_open').addEventListener('click',()=>{close();data.setProject(pr.id);ui.toast('Proyecto activo: '+pr.name,'ok');});
        ov.querySelector('#cf_save').addEventListener('click',()=>{ pr.name=ov.querySelector('#cf_name').value.trim()||pr.name; pr.industry=ov.querySelector('#cf_ind').value; pr.client=ov.querySelector('#cf_cli').value.trim(); pr.sucursales=+ov.querySelector('#cf_suc').value||pr.sucursales; pr.periodicidad=ov.querySelector('#cf_ronda').value; pr.ronda=ov.querySelector('#cf_ronda').value+' '+(pr.ronda||'').replace(/^[A-Za-zÁ-úñ]+\s?/,''); pr.periodoCumpl=ov.querySelector('#cf_cumpl').value; const ps=[...ov.querySelectorAll('.cf_pais:checked')].map(c=>c.value); if(ps.length){pr.countries=ps; pr.currency=pr.currency||{}; ps.forEach(c=>{if(!pr.currency[c])pr.currency[c]=(CX.COUNTRIES.find(x=>x.c===c)||{}).cur||'$';});} pr.scenarios=esc; pr.quincenas=ov.querySelector('#cf_quin').value.split('·').map(s=>s.trim()).filter(Boolean);
        /* #157 — vincular el proyecto con la Cuenta/Cliente del CRM (trazabilidad bidireccional) */
        try{ if(pr.client && CX.crmStore){ const cuentas=CX.crmStore.cuentas(); let cu=cuentas.find(x=>(x.nombre||'').toLowerCase()===pr.client.toLowerCase());
          if(cu){ cu.proyectos=cu.proyectos||[]; if(!cu.proyectos.includes(pr.id))cu.proyectos.push(pr.id); CX.crmStore.saveCuentas(); } } }catch(e){}
        CX.bus&&CX.bus.emit('visit-flow'); close(); CX.router.nav('proyectos'); ui.toast('Configuración de '+pr.name+' actualizada','ok'); });
      }});
    };
    const nb=document.getElementById('newProj');
    if(nb)nb.addEventListener('click',()=>CX.projectWizard(data,ui));
  },0);
  return html;
});
