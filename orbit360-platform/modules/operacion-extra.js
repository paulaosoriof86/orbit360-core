/* CXOrbia · Mi Perfil (shopper) — editable + completar perfil + histórico/KPIs */
CX.module('miperfil', ({data,ui})=>{
  const sid=(CX.session.user&&CX.session.user.shopperId)||'sh1';
  const s=data.getShopper(sid)||data.shoppers[0];
  const st=data.shopperStats(s.id);
  const incompleto=!s.perfilCompleto;
  const initials=(s.nombre||'?').split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase();
  const ids={pais:'mp_pais',depto:'mp_depto',ciudad:'mp_ciudad'};

  const drillVisits=(fn,title)=>{
    const vs=data.visitsForShopper(s.id).filter(fn||(()=>true));
    const body=vs.length?`<table class="tbl"><thead><tr><th>Sucursal</th><th>Escenario</th><th>Estado</th><th>Fecha</th></tr></thead><tbody>
      ${vs.map(v=>`<tr><td><b>${v.sucursal}</b><div style="font-size:11px;color:var(--t3)">${CX.paisFlag(v.pais)} ${v.ciudad}</div></td>
        <td style="font-size:12px">${v.escenario}</td><td>${ui.estadoBadge(v.estado)}</td>
        <td style="font-size:12px">${v.realizada||v.agendada||v.disponibleDesde||'—'}</td></tr>`).join('')}</tbody></table>`
      :ui.empty('🗒️','Aún no tienes visitas en esta categoría. Postúlate desde Visitas Disponibles.');
    ui.modal(title, body);
  };

  const editModal=()=>{
    ui.modal('Editar mi perfil', `
      <div class="grid g2" style="gap:12px 14px">
        <div><label class="lbl">Primer nombre</label><input class="inp" id="mp_first" value="${s.firstName||''}"></div>
        <div><label class="lbl">Primer apellido</label><input class="inp" id="mp_last" value="${s.lastName||''}"></div>
        ${CX.geo.fieldsHTML(ids,{pais:s.pais,depto:s.depto,ciudad:s.ciudad})}
        <div><label class="lbl">WhatsApp</label><input class="inp" id="mp_wa" value="${s.whatsapp||''}"></div>
        <div><label class="lbl">Correo</label><input class="inp" id="mp_mail" value="${s.email||''}"></div>
        <div><label class="lbl">Edad</label><input class="inp" id="mp_edad" type="number" min="16" max="99" value="${s.edad||''}"></div>
        <div><label class="lbl">Sexo</label><select class="sel" id="mp_sexo">${['','Femenino','Masculino','Otro','Prefiero no decir'].map(o=>`<option ${o===(s.sexo||'')?'selected':''}>${o||'Selecciona…'}</option>`).join('')}</select></div>
        <div><label class="lbl">Documento (DPI / ID)</label><input class="inp" id="mp_dpi" value="${s.dpi||''}"></div>
      </div>
      <div class="card-t" style="font-size:13px;margin:16px 0 8px">🏦 Datos bancarios para pagos</div>
      <div class="grid g2" style="gap:12px 14px">
        <div><label class="lbl">Banco</label><input class="inp" id="mp_banco" value="${(s.banco||'').replace(/"/g,'&quot;')}" placeholder="Nombre del banco"></div>
        <div><label class="lbl">Tipo de cuenta</label><select class="sel" id="mp_ctaTipo">${['','Monetaria/Corriente','Ahorro','Otra'].map(o=>`<option ${o===(s.ctaTipo||'')?'selected':''}>${o||'Selecciona…'}</option>`).join('')}</select></div>
        <div><label class="lbl">Número de cuenta</label><input class="inp" id="mp_ctaNum" value="${(s.ctaNum||'').replace(/"/g,'&quot;')}" placeholder="Número / IBAN / CLABE"></div>
        <div><label class="lbl">Titular</label><input class="inp" id="mp_ctaTit" value="${(s.ctaTitular||'').replace(/"/g,'&quot;')}" placeholder="Nombre del titular"></div>
        <div><label class="lbl">Moneda</label><input class="inp" id="mp_ctaMon" value="${(s.ctaMoneda||'').replace(/"/g,'&quot;')}" placeholder="Q / L / USD…"></div>
      </div>
      <div style="text-align:right;margin-top:16px"><button class="btn btn-green" id="mp_save">Guardar</button></div>
    `, {onMount:(ov,close)=>{
      CX.geo.wire(ov,ids,{pais:s.pais,depto:s.depto,ciudad:s.ciudad});
      ov.querySelector('#mp_save').addEventListener('click',()=>{
        const geo=CX.geo.read(ov,ids);
        const patch={
          firstName:(ov.querySelector('#mp_first').value||'').trim(),
          lastName:(ov.querySelector('#mp_last').value||'').trim(),
          pais:geo.pais, depto:geo.depto, ciudad:geo.ciudad,
          whatsapp:(ov.querySelector('#mp_wa').value||'').trim(),
          email:(ov.querySelector('#mp_mail').value||'').trim(),
          edad:(ov.querySelector('#mp_edad').value||'').trim(),
          sexo:ov.querySelector('#mp_sexo').value||'',
          dpi:(ov.querySelector('#mp_dpi').value||'').trim(),
          banco:(ov.querySelector('#mp_banco').value||'').trim(),
          ctaTipo:ov.querySelector('#mp_ctaTipo').value||'',
          ctaNum:(ov.querySelector('#mp_ctaNum').value||'').trim(),
          ctaTitular:(ov.querySelector('#mp_ctaTit').value||'').trim(),
          ctaMoneda:(ov.querySelector('#mp_ctaMon').value||'').trim(),
        };
        patch.cuentaPago=[patch.banco,patch.ctaNum,patch.ctaTitular].filter(Boolean).join(' · ');
        patch.perfilCompleto=data.shopperProfileComplete(Object.assign({},s,patch));
        data.updateShopper(s.id,patch);
        // refrescar el nombre mostrado en sesión
        const ns=data.getShopper(s.id); if(ns){CX.session.user.name=ns.nombre;CX.session.save();}
        close(); CX.ui.toast(patch.perfilCompleto?'¡Perfil completo! Ya puedes postularte sin restricciones':'Perfil actualizado','ok',3200);
        CX.router.nav('miperfil');
      });
    }});
  };

  const banner = incompleto ? `
    <div class="card card-p" style="border-left:4px solid var(--amber);background:#fff8ec;margin-bottom:16px">
      <div class="between" style="gap:12px;flex-wrap:wrap">
        <div><div class="card-t" style="font-size:14px">Completa tu perfil</div>
        <div style="font-size:12.5px;color:var(--t2);margin-top:3px">Faltan datos para habilitarte todas las visitas (ciudad, edad, sexo, cuenta de pago).</div></div>
        <button class="btn btn-pr btn-sm" id="mpComplete">Completar ahora →</button>
      </div>
    </div>` : '';

  const dato=(l,v)=>`<div style="padding:8px 0;border-bottom:1px solid var(--border)" class="between"><span style="font-size:11px;font-weight:700;color:var(--t2);text-transform:uppercase;letter-spacing:.5px">${l}</span><b style="font-size:13px;color:var(--t1);text-align:right">${v||'<span style=\"color:var(--t3)\">— sin dato</span>'}</b></div>`;

  setTimeout(()=>{
    document.getElementById('mpComplete')?.addEventListener('click',editModal);
    document.getElementById('mpEdit')?.addEventListener('click',editModal);
    const drills={all:[null,'Todas mis visitas'],done:[v=>['realizada','cuestionario','liquidada'].includes(v.estado),'Mis visitas realizadas'],
      liq:[v=>v.estado==='liquidada','Mis visitas liquidadas'],curso:[v=>['asignada','agendada','postulada'].includes(v.estado),'Mis visitas en curso']};
    document.querySelectorAll('#mpKpis [data-k]').forEach(el=>el.addEventListener('click',()=>{const d=drills[el.dataset.k];drillVisits(d[0],d[1]);}));
    const okrDrills={efect:[null,'Efectividad · todas tus visitas asignadas'],cuest:[v=>['cuestionario','liquidada'].includes(v.estado),'Cuestionarios completados'],atiempo:[v=>['realizada','cuestionario','liquidada'].includes(v.estado),'Visitas enviadas a tiempo'],rating:[v=>['realizada','cuestionario','liquidada'].includes(v.estado),'Visitas que cuentan para tu calificación']};
    document.querySelectorAll('#okrKpis [data-ok]').forEach(el=>el.addEventListener('click',()=>{const d=okrDrills[el.dataset.ok];drillVisits(d[0],d[1]);}));
  },0);

  return `
    ${ui.ph('Mi Perfil', 'Tu información, desempeño y certificaciones')}
    ${banner}
    <div class="card card-p" style="margin-bottom:16px">
      <div class="flex" style="gap:14px">
        <div class="rail-av" style="width:54px;height:54px;font-size:20px;background:linear-gradient(135deg,var(--brand),var(--brand-dark))">${initials}</div>
        <div style="flex:1"><div class="card-t" style="font-size:18px">${s.nombre}</div>
          <div style="font-size:12px;color:var(--t3)">${s.ciudad?s.ciudad+', ':''}${CX.paisName(s.pais)||'—'} · ${s.code} · ${s.estado}</div>
          <div class="flex" style="gap:6px;margin-top:6px">${s.perfilCompleto?ui.bdg('Perfil completo','g'):ui.bdg('Perfil incompleto','a')}</div></div>
        <div style="text-align:right"><div style="font-size:22px;font-weight:800;color:var(--amber);font-family:var(--disp)">${s.rating?('★ '+s.rating):'—'}</div><div style="font-size:10.5px;color:var(--t3)">tu calificación</div></div>
      </div>
    </div>
    <div class="grid g4" style="margin-bottom:6px" id="mpKpis">
      <div data-k="all" style="cursor:pointer">${ui.kpi('Visitas',st.total,'b')}</div>
      <div data-k="done" style="cursor:pointer">${ui.kpi('Realizadas',st.realizadas,'g')}</div>
      <div data-k="liq" style="cursor:pointer">${ui.kpi('Liquidadas',st.liquidadas,'p')}</div>
      <div data-k="curso" style="cursor:pointer">${ui.kpi('En curso',st.enCurso,'a')}</div>
    </div>
    <div style="font-size:11px;color:var(--t3);text-align:right;margin-bottom:16px">↑ toca un indicador para ver el detalle</div>
    ${(()=>{const hist=data.visitsForShopper(s.id);
      const asign=hist.filter(v=>v.shopperId===s.id||['asignada','agendada','realizada','cuestionario','liquidada'].includes(v.estado));
      const realiz=hist.filter(v=>['realizada','cuestionario','liquidada'].includes(v.estado));
      const efect=asign.length?Math.round(realiz.length/asign.length*100):0;
      const aTiempo=realiz.length?Math.round(realiz.filter(v=>v.submit!==false).length/realiz.length*100):0;
      const cuestOk=realiz.length?Math.round(realiz.filter(v=>['cuestionario','liquidada'].includes(v.estado)).length/realiz.length*100):0;
      const reprog=asign.length?Math.round(asign.filter(v=>v.reprog).length/asign.length*100):0;
      const okr=(lbl,val,meta,tone,suf)=>{const pct=Math.min(100,Math.round(val/meta*100));return `<div style="margin-bottom:12px">
        <div class="between" style="margin-bottom:4px"><span style="font-size:12.5px;font-weight:600;color:var(--t1)">${lbl}</span><span style="font-size:12px;font-weight:700;color:var(--${val>=meta?'green':tone})">${val}${suf} <span class="muted" style="font-weight:500">/ meta ${meta}${suf}</span></span></div>
        <div class="bar" style="height:7px"><i style="width:${pct}%;background:var(--${val>=meta?'green':tone})"></i></div></div>`;};
      return `<div class="card card-p" style="margin-bottom:16px">
        <div class="card-h"><div class="card-t">🎯 Mi desempeño y metas (OKRs)</div><span class="muted" style="font-size:11px">para mejorar y acceder a más visitas</span></div>
        <div class="grid g4" style="margin-bottom:14px" id="okrKpis">
          <div data-ok="efect" style="cursor:pointer">${ui.kpi('Efectividad',efect+'%',efect>=85?'g':'a','realizadas/asignadas')}</div>
          <div data-ok="cuest" style="cursor:pointer">${ui.kpi('Cuest. completos',cuestOk+'%',cuestOk>=90?'g':'a')}</div>
          <div data-ok="atiempo" style="cursor:pointer">${ui.kpi('Envíos a tiempo',aTiempo+'%',aTiempo>=90?'g':'a')}</div>
          <div data-ok="rating" style="cursor:pointer">${ui.kpi('Calificación',s.rating?('★ '+s.rating):'—','p')}</div>
        </div>
        ${okr('Efectividad de visitas',efect,90,'amber','%')}
        ${okr('Cuestionarios completados',cuestOk,95,'amber','%')}
        ${okr('Envíos a tiempo',aTiempo,90,'amber','%')}
        ${okr('Baja reprogramación (menos es mejor)',Math.max(0,100-reprog),90,'amber','%')}
        <div style="margin-top:6px">${ui.aiBox('Tus metas (OKRs): efectividad, cuestionarios completos y envíos a tiempo. Cumplirlas sube tu calificación, te habilita honorarios preferentes y prioridad en nuevas visitas.','Cómo crecer como evaluador')}</div>
      </div>`;})()}
    <div class="card card-p" style="margin-bottom:16px">
      <div class="card-h"><div class="card-t">Mis datos</div><button class="btn btn-soft btn-sm" id="mpEdit">✎ Editar</button></div>
      ${dato('WhatsApp',s.whatsapp)}${dato('Correo',s.email)}${dato(CX.geo.deptLabel(s.pais),s.depto)}${dato('Edad',s.edad)}${dato('Sexo',s.sexo)}${dato('Documento',s.dpi)}
      <div class="card-t" style="font-size:12px;margin:12px 0 4px;color:var(--t2)">🏦 Datos bancarios</div>
      ${dato('Banco',s.banco)}${dato('Tipo de cuenta',s.ctaTipo)}${dato('Número de cuenta',s.ctaNum)}${dato('Titular',s.ctaTitular)}${dato('Moneda',s.ctaMoneda)}
    </div>
    <div class="card card-p">${ui.aiBox('Tu calificación se calcula por cumplimiento + tiempos + alertas + certificaciones. Mantén tu perfil completo para acceder a más visitas y honorarios preferentes.','Cómo subir tu rating')}</div>`;
});

/* CXOrbia · Hojas de Ruta (admin) — interna / importada / ONLINE con sync sin duplicar */
CX.module('rutas', ({data,ui})=>{
  const p=data.project();
  const online=CX.hr.esOnline(p);
  const rows=CX.hr.external(p);
  const d=CX.hr.diff(p);
  const fuentes=['Hoja creada en plataforma','Google Sheets (online)','Excel Online','Excel importado'];
  const flag=(r)=>{ if(!r.visitId) return ui.bdg('Nuevo en HR','a'); const u=d.updates.find(x=>x.row.extId===r.extId); return u?ui.bdg('Cambió','b'):ui.bdg('Sincronizado','g'); };
  const row=(r)=>`<tr>
    <td style="font-size:11px;color:var(--t3)">${r.extId}</td>
    <td><b style="font-size:12.5px">${r.sucursal}</b><div style="font-size:10px;color:var(--t3)">${CX.paisFlag(r.pais)} ${r.ciudad} · ${r.quincena} · ${r.escenario}</div></td>
    <td><input class="inp hrF" data-id="${r.extId}" type="date" value="${(r.fecha||'').slice(0,10)}" style="padding:5px 7px;width:140px"></td>
    <td><input class="inp hrR" data-id="${r.extId}" type="number" value="${r.reembolso||0}" style="padding:5px 7px;width:84px"></td>
    <td style="font-size:12px">${r.shopper||'<span class="muted">—</span>'}</td>
    <td>${r.origen==='hr'?ui.bdg('Alta en HR','t'):ui.bdg('Plataforma','n')}</td>
    <td>${flag(r)}</td>
  </tr>`;

  const syncBar = online ? `
    <div class="card card-p" style="margin-bottom:14px;background:var(--brand-light);border-color:#cfe6f7">
      <div class="between" style="flex-wrap:wrap;gap:10px">
        <div style="font-size:12.5px;color:var(--brand-dark)">Lectura en vivo de la HR externa. Detecté
          <b>${d.nuevos.length}</b> alta(s) hecha(s) directamente en la hoja y <b>${d.updates.length}</b> cambio(s) de fecha/reembolso.
          Se sincronizan a la plataforma <b>sin duplicar</b>.</div>
        <div class="flex" style="gap:8px"><button class="btn btn-ghost btn-sm" id="hrRead">🔄 Leer en vivo</button>
          <button class="btn btn-green btn-sm" id="hrSync">⇄ Sincronizar (${d.nuevos.length+d.updates.length})</button></div>
      </div>
    </div>` : '';

  const host=ui.el('div');
  host.innerHTML=`
    ${ui.ph('Hojas de Ruta', p.name+' · las Visitas Disponibles se derivan de la HR activa')}
    <div class="card card-p" style="margin-bottom:14px">
      <div class="between" style="flex-wrap:wrap;gap:12px;align-items:flex-end">
        <div><label class="lbl">Origen de la HR</label><select class="sel" id="hrSrc" style="width:auto;min-width:230px">${fuentes.map(f=>`<option ${f===CX.hr.fuente(p)?'selected':''}>${f}</option>`).join('')}</select></div>
        <div class="flex" style="gap:8px">
          <button class="btn btn-soft btn-sm" id="hrImport">📥 Importar archivo</button>
          <button class="btn btn-ghost btn-sm" id="hrNew">＋ Parada</button>
        </div>
      </div>
      <div style="font-size:11.5px;color:var(--t3);margin-top:10px">${online?'🟢 HR externa conectada: el equipo puede asignar/editar en Sheets/Excel y la plataforma se alimenta de ahí.':'🗂️ HR interna: se trabaja dentro de la plataforma.'}</div>
    </div>
    ${syncBar}
    <div class="card card-p">
      <div class="card-h"><div class="card-t">Filas de la hoja de ruta</div><span class="bdg bdg-b">${rows.length} paradas</span></div>
      <table class="tbl"><thead><tr><th>ID</th><th>Sucursal</th><th>Fecha</th><th>Reembolso</th><th>Shopper</th><th>Origen</th><th>Estado sync</th></tr></thead>
      <tbody>${rows.map(row).join('')}</tbody></table>
      <div style="margin-top:14px">${ui.aiBox('Una sola fuente de verdad: edita fechas y reembolsos aquí o en la hoja externa; la plataforma se mantiene sincronizada y no duplica visitas (match por ID de fila).','HR viva, sin Excel paralelo')}</div>
    </div>`;

  setTimeout(()=>{
    host.querySelector('#hrSrc').addEventListener('change',e=>{ CX.hr.setFuente(p,e.target.value); CX.hr.invalidate(p); CX.ui.toast('Origen de HR: '+e.target.value,'ok'); CX.router.nav('rutas'); });
    host.querySelectorAll('.hrF').forEach(i=>i.addEventListener('change',()=>CX.hr.editRow(p,i.dataset.id,{fecha:i.value})));
    host.querySelectorAll('.hrR').forEach(i=>i.addEventListener('change',()=>CX.hr.editRow(p,i.dataset.id,{reembolso:+i.value||0})));
    const rd=host.querySelector('#hrRead'); if(rd)rd.addEventListener('click',()=>{ const dd=CX.hr.diff(p); CX.ui.toast('Leída en vivo · '+dd.total+' filas ('+dd.nuevos.length+' nuevas, '+dd.updates.length+' cambios)','ok',3200); CX.router.nav('rutas'); });
    const sy=host.querySelector('#hrSync'); if(sy)sy.addEventListener('click',()=>{ const res=CX.hr.sync(p); CX.ui.toast('Sincronizado · '+res.creadas+' visita(s) creada(s), '+res.actualizadas+' actualizada(s)','ok',3600); CX.router.nav('rutas'); });
    host.querySelector('#hrImport').addEventListener('click',()=>ui.modal('Importar Hoja de Ruta', `
      <p style="font-size:12.5px;color:var(--t2);margin-bottom:10px">Sube tu HR (Excel/CSV). El sistema detecta columnas y las <b>mapea</b> a los campos de visita (sucursal, ciudad, fecha, escenario, honorario, reembolso). Anti-duplicado por sucursal+quincena.</p>
      <input type="file" accept=".csv,.xlsx,.xls" class="inp" style="padding:7px;margin-bottom:12px">
      <div style="background:var(--panel-2);border:1px solid var(--border);border-radius:9px;padding:10px;font-size:11.5px;color:var(--t3)">Vista previa de mapeo: Columna A→Sucursal · B→Ciudad · C→Fecha · D→Escenario · E→Honorario (editable en demo).</div>
      <div style="text-align:right;margin-top:14px"><button class="btn btn-green btn-sm" onclick="CX.ui.toast('HR importada y mapeada (demo)','ok');this.closest('.cx-ov').remove()">Importar y mapear</button></div>`));
    host.querySelector('#hrNew').addEventListener('click',()=>CX.ui.toast('Agrega paradas internas o impórtalas; en HR online se crean en la hoja','ok',3200));
  },0);
  return host;
});

/* CXOrbia · Reportes & KPIs / Informes (admin) */
CX.module('informes', ({data,ui})=>{
  const k=data.kpis(), p=data.project();
  const vis=data.visitas();
  
  /* Ranking de sucursales por cumplimiento */
  const bySuc={}; vis.forEach(v=>{const s=bySuc[v.sucursal]=bySuc[v.sucursal]||{suc:v.sucursal,pais:v.pais,t:0,r:0};s.t++;if(['realizada','cuestionario','liquidada'].includes(v.estado))s.r++;});
  const rankSuc=Object.values(bySuc).map(s=>({...s,pct:s.t?Math.round(s.r/s.t*100):0})).sort((a,b)=>b.pct-a.pct);
  
  /* Ranking shoppers */
  const bySh={}; vis.filter(v=>v.shopperId).forEach(v=>{const s=bySh[v.shopperId]=bySh[v.shopperId]||{n:v.shopper,code:v.shopperCode,t:0,r:0};s.t++;if(['realizada','cuestionario','liquidada'].includes(v.estado))s.r++;});
  const rankSh=Object.values(bySh).map(s=>({...s,pct:s.t?Math.round(s.r/s.t*100):0})).sort((a,b)=>b.r-a.r);
  
  /* Hallazgos */
  const hallazgos=[['Tiempo de espera sobre estándar',Math.round(vis.length*0.22)],['Protocolo de bienvenida incompleto',Math.round(vis.length*0.17)],['Limpieza/orden debajo del estándar',Math.round(vis.length*0.13)],['Oferta no comunicada',Math.round(vis.length*0.09)]].filter(h=>h[1]>0);
  
  /* Store para reportes personalizados */
  const CUSTOM_KEY='cx_rpts_'+p.id;
  const customRpts=()=>{try{return JSON.parse(localStorage.getItem(CUSTOM_KEY)||'[]');}catch(e){return [];}};
  const saveCustomRpts=(arr)=>{try{localStorage.setItem(CUSTOM_KEY,JSON.stringify(arr));}catch(e){}};

  const reportes={
    cumpSuc:['📊 Cumplimiento por sucursal',()=>`<table class="tbl"><thead><tr><th>#</th><th>Sucursal</th><th>País</th><th>Realizadas/Total</th><th>Cumplimiento</th></tr></thead><tbody>${rankSuc.map((s,i)=>`<tr><td style="color:var(--t3)">${i+1}</td><td><b>${s.suc}</b></td><td>${CX.paisFlag(s.pais)}</td><td>${s.r}/${s.t}</td><td>${ui.bdg(s.pct+'%',s.pct>=80?'g':s.pct>=50?'a':'r')}</td></tr>`).join('')}</tbody></table>`],
    cobertura:['🗺️ Cobertura por país',()=>`<table class="tbl"><thead><tr><th>País</th><th>Realizadas</th><th>Total</th><th>%</th></tr></thead><tbody>${p.countries.map(c=>`<tr><td><b>${CX.paisLabel(c)}</b></td><td>${k.realizadas[c]||0}</td><td>${k.total[c]||0}</td><td>${ui.bdg(Math.round((k.realizadas[c]||0)/Math.max(k.total[c]||1,1)*100)+'%','g')}</td></tr>`).join('')}</tbody></table>`],
    rankSh:['🏆 Ranking de evaluadores',()=>`<table class="tbl"><thead><tr><th>#</th><th>Evaluador</th><th>Realizadas</th><th>Efectividad</th></tr></thead><tbody>${rankSh.slice(0,15).map((s,i)=>`<tr><td style="color:var(--t3)">${i+1}</td><td><b>${s.n}</b> <span class="muted">${s.code||''}</span></td><td>${s.r}/${s.t}</td><td>${ui.bdg(s.pct+'%',s.pct>=80?'g':'a')}</td></tr>`).join('')}</tbody></table>`],
    hallazgos:['🔎 Hallazgos frecuentes',()=>`<p style="font-size:12px;color:var(--t2);margin-bottom:10px">Hallazgos recurrentes del periodo — base para planes de capacitación.</p><table class="tbl"><thead><tr><th>Hallazgo</th><th>Visitas afectadas</th><th>%</th></tr></thead><tbody>${hallazgos.map(h=>`<tr><td>${h[0]}</td><td><b>${h[1]}</b></td><td>${Math.round(h[1]/Math.max(vis.length,1)*100)}%</td></tr>`).join('')}</tbody></table>`],
    liq:['💰 Liquidaciones del periodo',()=>`<p style="font-size:13px;color:var(--t2)">Detalle completo en Finanzas → Liquidaciones. Exporta el lote con honorarios + reembolsos por país.</p>`],
    scoreSuc:['🎯 Score por sucursal',()=>`<table class="tbl"><thead><tr><th>Sucursal</th><th>Visitas</th><th>Score prom.</th></tr></thead><tbody>${rankSuc.map(s=>`<tr><td><b>${s.suc}</b></td><td>${s.t}</td><td>${ui.bdg(s.pct+'%',s.pct>=80?'g':s.pct>=50?'a':'r')}</td></tr>`).join('')}</tbody></table>`],
  };

  const openReport=(id,rpt)=>{
    const content=typeof rpt[1]==='function'?rpt[1]():rpt[1];
    ui.modal(rpt[0], content+`
      <div class="between" style="margin-top:14px">
        <button class="btn btn-soft btn-sm" id="rptEdit">✎ Editar / añadir columna</button>
        <div class="flex" style="gap:8px"><button class="btn btn-ghost btn-sm" id="rptPdf">⤓ PDF</button><button class="btn btn-pr btn-sm" id="rptXls">⤓ Excel</button></div>
      </div>`,
    {onMount:(ov,close)=>{
      ov.querySelector('#rptEdit')?.addEventListener('click',()=>{
        ui.modal('✎ Editar reporte: '+rpt[0],`
          <p style="font-size:12.5px;color:var(--t2);margin-bottom:10px">Añade notas, una columna extra o ajusta el contenido de este reporte. El reporte original queda intacto.</p>
          <label class="lbl">Notas / encabezado</label><textarea class="inp" id="rptNote" rows="2" placeholder="Ej. Datos del periodo junio 2026"></textarea>
          <label class="lbl" style="margin-top:10px">Columna extra (opcional)</label><input class="inp" id="rptCol" placeholder="Nombre de la columna">
          <div style="text-align:right;margin-top:12px"><button class="btn btn-pr btn-sm" id="rptSave">Guardar versión personalizada</button></div>
        `,{onMount:(ov2,close2)=>{ov2.querySelector('#rptSave').addEventListener('click',()=>{const arr=customRpts();arr.push({id:'cr'+Date.now().toString(36),base:id,nota:ov2.querySelector('#rptNote').value,col:ov2.querySelector('#rptCol').value,fecha:new Date().toISOString().slice(0,10)});saveCustomRpts(arr);close2();close();ui.toast('Versión personalizada guardada','ok');});}});
      });
      ov.querySelector('#rptPdf')?.addEventListener('click',()=>{close();window.print();});
      ov.querySelector('#rptXls')?.addEventListener('click',()=>{
        /* exporta el contenido de la tabla del reporte a CSV real */
        const tmp=document.createElement('div');tmp.innerHTML=content;const tbl=tmp.querySelector('table');
        if(tbl){const rows=[...tbl.querySelectorAll('tr')].map(tr=>[...tr.querySelectorAll('th,td')].map(c=>'"'+(c.textContent||'').replace(/"/g,'""').trim()+'"').join(','));
          const csv=rows.join('\n');const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=rpt[0].replace(/[^\w]/g,'_')+'.csv';a.click();close();ui.toast('Reporte exportado a CSV','ok');}
        else{close();ui.toast('Este reporte no tiene tabla exportable','warn');}
      });
    }});
  };

  const host=ui.el('div');
  const draw=()=>{
    const custom=customRpts();
    host.innerHTML=`
      ${ui.ph('Reportes & KPIs', p.name+' · entregables para dirección y cliente')}
      <div class="grid g4" style="margin-bottom:16px" id="infKpis">
        <div data-k="cump" style="cursor:pointer">${ui.kpi('Cumplimiento',Math.round(k.realizadas.t/Math.max(k.total.t,1)*100)+'%','g')}</div>
        <div data-k="vel" style="cursor:pointer">${ui.kpi('Velocidad media','2.6d','b')}</div>
        <div data-k="cal" style="cursor:pointer">${ui.kpi('Calidad cuest.','92%','p')}</div>
        <div data-k="rent" style="cursor:pointer">${ui.kpi('Efectividad',rankSh.length?Math.round(rankSh.reduce((a,s)=>a+s.pct,0)/rankSh.length)+'%':'—','a')}</div>
      </div>
      <div class="card card-p">
        <div class="between" style="margin-bottom:14px"><div class="card-t">Reportes estándar</div><button class="btn btn-pr btn-sm" id="newCustom">＋ Nuevo reporte personalizado</button></div>
        <div class="grid g2">
          ${Object.entries(reportes).map(([id,rpt])=>`<div class="card hov card-p flex" data-rep="${id}" style="gap:12px;cursor:pointer">
            <div style="font-size:22px">${rpt[0].split(' ')[0]}</div>
            <div style="flex:1;font-size:13px;font-weight:600;color:var(--t1)">${rpt[0].slice(rpt[0].indexOf(' ')+1)}</div>
            <div class="flex" style="gap:6px"><span class="btn btn-soft btn-sm">Ver →</span><button class="btn btn-ghost btn-sm" data-dl="${id}" title="Descargar">⤓</button></div></div>`).join('')}
        </div>
        ${custom.length?`<div class="card-t" style="font-size:13px;margin:16px 0 8px">Reportes personalizados</div>
        <div class="grid g2">${custom.map(c=>`<div class="card card-p flex" style="gap:10px"><div style="flex:1"><div style="font-size:12.5px;font-weight:700">${(reportes[c.base]||['📄 Personalizado'])[0]}</div><div style="font-size:11px;color:var(--t3)">${c.nota||''} · ${c.fecha}</div></div><button class="btn btn-ghost btn-sm" data-delrpt="${c.id}" style="color:var(--red)">✕</button></div>`).join('')}</div>`:''}
        <div style="margin-top:14px">${ui.aiBox('Reportes de cumplimiento, hallazgos, rankings y liquidaciones — con opción de crear versiones personalizadas, añadir columnas y exportar a PDF/Excel. Los hallazgos alimentan los planes de capacitación del portal del cliente.','Reportería accionable')}</div>
      </div>`;
    
    host.querySelectorAll('[data-rep]').forEach(b=>b.addEventListener('click',(e)=>{if(e.target.closest('[data-dl]'))return;const rpt=reportes[b.dataset.rep];if(rpt)openReport(b.dataset.rep,rpt);}));
    host.querySelectorAll('[data-dl]').forEach(b=>b.addEventListener('click',()=>ui.toast('Descargando: '+(reportes[b.dataset.dl]||['reporte'])[0],'ok')));
    host.querySelector('#newCustom')?.addEventListener('click',()=>{
      const b=Object.entries(reportes).map(([id,r])=>'<option value="'+id+'">'+r[0]+'</option>').join('');
      ui.modal('＋ Nuevo reporte personalizado','<label class="lbl">Basado en</label><select class="sel" id="nrBase" style="margin-bottom:10px">'+b+'</select><label class="lbl">Nombre</label><input class="inp" id="nrNota" placeholder="Ej. Reporte dirección Q2" style="margin-bottom:10px"><label class="lbl">O genera con IA (describe qué reporte necesitas)</label><textarea class="inp" id="nrIA" rows="2" placeholder="Ej. compara cumplimiento por país y destaca las 3 sucursales más débiles con recomendaciones" style="margin-bottom:12px"><\/textarea><div style="text-align:right"><button class="btn btn-pr btn-sm" id="nrSave">Crear</button></div>',
        {onMount:(ov,close)=>{ov.querySelector('#nrSave').addEventListener('click',()=>{
          const instr=(ov.querySelector('#nrIA').value||'').trim();
          if(instr && CX.ai && CX.ai.ready()){
            ui.toast('Generando reporte con '+CX.ai.cfg().model+'…','',2500);
            const ctx='Datos del proyecto '+p.name+': cumplimiento '+Math.round(k.realizadas.t/Math.max(k.total.t,1)*100)+'%, '+rankSuc.length+' sucursales, ranking: '+rankSuc.slice(0,5).map(s=>s.suc+' '+s.pct+'%').join(', ')+'. Hallazgos: '+hallazgos.map(h=>h[0]).join(', ');
            CX.ai.ask('Genera un reporte ejecutivo de mystery shopping en HTML (usa <h3>, <p>, <ul>, <table class="tbl"> si aplica). '+instr+'\n\n'+ctx)
              .then(res=>{const arr=customRpts();arr.push({id:'cr'+Date.now().toString(36),base:ov.querySelector('#nrBase').value,nota:ov.querySelector('#nrNota').value||'Reporte IA',iaHtml:res,fecha:new Date().toISOString().slice(0,10)});saveCustomRpts(arr);close();draw();ui.toast('Reporte IA creado · revísalo e itera','ok',3500);})
              .catch(e=>{close();ui.toast('Error IA: '+e.message,'warn');});
          } else {
            const arr=customRpts();
            arr.push({id:'cr'+Date.now().toString(36),base:ov.querySelector('#nrBase').value,nota:ov.querySelector('#nrNota').value,fecha:new Date().toISOString().slice(0,10)});
            saveCustomRpts(arr);close();draw();ui.toast(instr?'Configura IA en Integraciones para generar · creado base':'Reporte personalizado creado','ok');
          }
        });}});
    });
    host.querySelectorAll('#infKpis [data-k]').forEach(el=>el.addEventListener('click',()=>{const d=drills[el.dataset.k];ui.modal(d[0],d[1]);}));
  };
  draw();
  return host;
});

