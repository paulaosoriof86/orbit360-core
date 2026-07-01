/* CXOrbia · Shoppers (admin) — base, alta manual, perfil editable, histórico */
CX.module('shoppers', ({data,ui})=>{

  /* ---------- helpers de presentación ---------- */
  const initials=(n)=>(n||'?').split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase();
  const av=(n,sz)=>`<div class="rail-av" style="width:${sz}px;height:${sz}px;font-size:${sz*0.38}px;background:linear-gradient(135deg,var(--brand),var(--brand-dark))">${initials(n)}</div>`;
  const viaBadge=(v)=>({registro:ui.bdg('Auto-registro','b'),manual:ui.bdg('Alta manual','t'),asignacion:ui.bdg('Creado en asignación','t')})[v]||'';

  const row=(s)=>`<tr data-sid="${s.id}" style="cursor:pointer">
    <td><div class="flex">${av(s.nombre,30)}
      <div><b>${s.nombre}</b><div style="font-size:11px;color:var(--t3)">${s.ciudad?s.ciudad+', ':''}${CX.paisName(s.pais)||s.pais||'—'}</div></div></div></td>
    <td><span style="font-size:12px;font-weight:800;color:var(--amber)">${s.rating?('★ '+s.rating):'<span style="color:var(--t3)">—</span>'}</span></td>
    <td style="font-size:12px">${s.visitas||0}</td>
    <td>${s.perfilCompleto?ui.bdg('Completo','g'):ui.bdg('Incompleto','a')}</td>
    <td>${s.estado==='Pendiente'?ui.bdg('Pendiente','a'):s.estado==='Certificado'?ui.bdg('Certificado','g'):ui.bdg('Activo','b')}</td>
    <td>${s.honorarioPref==='Preferente'?ui.bdg('Preferente','p'):ui.bdg('Estándar','n')}</td>
  </tr>`;

  const list=()=>data.shoppersFor();

  /* ---------- HTML del módulo ---------- */
  const render=()=>{
    const L=list();
    return `
    ${ui.ph('Shoppers / Auditores', data.project().name+' · red de evaluadores y calificación')}
    <div class="grid g4" style="margin-bottom:16px" id="shTopKpis">
      <div data-tk="all" style="cursor:pointer">${ui.kpi('En este proyecto',L.length,'b')}</div>
      <div data-tk="act" style="cursor:pointer">${ui.kpi('Activos',L.filter(s=>s.estado!=='Pendiente').length,'g')}</div>
      <div data-tk="incom" style="cursor:pointer">${ui.kpi('Perfiles incompletos',L.filter(s=>!s.perfilCompleto).length,'a')}</div>
      <div data-tk="pref" style="cursor:pointer">${ui.kpi('Preferentes',L.filter(s=>s.honorarioPref==='Preferente').length,'p')}</div>
    </div>
    <div class="card card-p">
      <div class="card-h">
        <div class="card-t">Base de shoppers</div>
        <div class="flex" style="gap:8px">
          <input class="inp" id="shSearch" placeholder="Buscar nombre, ciudad, código…" style="width:230px">
          <button class="btn btn-pr btn-sm" id="shNew">+ Alta manual</button>
        </div>
      </div>
      <table class="tbl"><thead><tr><th>Shopper</th><th>Rating</th><th>Visitas</th><th>Perfil</th><th>Estado</th><th>Honorario</th></tr></thead>
      <tbody id="shBody">${L.map(row).join('')}</tbody></table>
      <div id="shEmpty" style="display:none;padding:12px">${ui.empty('🔍','Sin resultados para tu búsqueda.')}</div>
      <div style="margin-top:14px">${ui.aiBox('El alta manual pide solo lo esencial (nombre, apellido y WhatsApp); el shopper completa el resto al ingresar. La calificación combina cumplimiento, tiempos, alertas y certificaciones.','Alta y calificación inteligente')}</div>
    </div>`;
  };

  /* ---------- drill: histórico de visitas ---------- */
  const drillVisits=(s, fn, title)=>{
    const vs=data.visitsForShopper(s.id).filter(fn||(()=>true));
    const body = vs.length ? `<table class="tbl"><thead><tr><th>Sucursal</th><th>Proyecto</th><th>Escenario</th><th>Estado</th><th>Fecha</th></tr></thead><tbody>
      ${vs.map(v=>`<tr><td><b>${v.sucursal}</b><div style="font-size:11px;color:var(--t3)">${CX.paisFlag(v.pais)} ${v.ciudad}</div></td>
        <td style="font-size:12px">${(data.projects.find(p=>p.id===v.projectId)||{}).name||v.projectId}</td>
        <td style="font-size:12px">${v.escenario}</td>
        <td>${ui.estadoBadge(v.estado)}</td>
        <td style="font-size:12px">${v.realizada||v.agendada||v.disponibleDesde||'—'}</td></tr>`).join('')}
      </tbody></table>`
      : ui.empty('🗒️','Sin visitas en esta categoría todavía.');
    ui.modal(title+' · '+s.nombre, body);
  };

  /* ---------- formulario editable (perfil) ---------- */
  const editFields=(s)=>{
    const ids={pais:'ed_pais',depto:'ed_depto',ciudad:'ed_ciudad'};
    return `
    <div class="grid g2" style="gap:12px 14px">
      <div><label class="lbl">Primer nombre</label><input class="inp" id="ed_first" value="${s.firstName||''}"></div>
      <div><label class="lbl">Primer apellido</label><input class="inp" id="ed_last" value="${s.lastName||''}"></div>
      ${CX.geo.fieldsHTML(ids,{pais:s.pais,depto:s.depto,ciudad:s.ciudad})}
      <div><label class="lbl">WhatsApp</label><input class="inp" id="ed_wa" value="${s.whatsapp||''}"></div>
      <div><label class="lbl">Correo</label><input class="inp" id="ed_mail" value="${s.email||''}"></div>
      <div><label class="lbl">Edad</label><input class="inp" id="ed_edad" type="number" min="16" max="99" value="${s.edad||''}"></div>
      <div><label class="lbl">Sexo</label><select class="sel" id="ed_sexo">${['','Femenino','Masculino','Otro','Prefiero no decir'].map(o=>`<option ${o===(s.sexo||'')?'selected':''}>${o||'Selecciona…'}</option>`).join('')}</select></div>
      <div><label class="lbl">Documento (DPI / ID)</label><input class="inp" id="ed_dpi" value="${s.dpi||''}"></div>
      <div><label class="lbl">Banco</label><input class="inp" id="ed_banco" value="${(s.banco||'').replace(/"/g,'&quot;')}" placeholder="Nombre del banco"></div>
      <div><label class="lbl">Tipo de cuenta</label><select class="sel" id="ed_ctaTipo">${['','Monetaria/Corriente','Ahorro','Otra'].map(o=>`<option ${o===(s.ctaTipo||'')?'selected':''}>${o||'Selecciona…'}</option>`).join('')}</select></div>
      <div><label class="lbl">Número de cuenta</label><input class="inp" id="ed_ctaNum" value="${(s.ctaNum||'').replace(/"/g,'&quot;')}" placeholder="Número / IBAN / CLABE"></div>
      <div><label class="lbl">Titular</label><input class="inp" id="ed_ctaTit" value="${(s.ctaTitular||'').replace(/"/g,'&quot;')}"></div>
      <div><label class="lbl">Moneda</label><input class="inp" id="ed_ctaMon" value="${(s.ctaMoneda||'').replace(/"/g,'&quot;')}" placeholder="Q / L / USD…"></div>
      <div><label class="lbl">Estado</label><select class="sel" id="ed_estado">${['Pendiente','Activo','Certificado'].map(o=>`<option ${o===s.estado?'selected':''}>${o}</option>`).join('')}</select></div>
      <div><label class="lbl">Honorario</label><select class="sel" id="ed_hon">${['Estándar','Preferente'].map(o=>`<option ${o===s.honorarioPref?'selected':''}>${o}</option>`).join('')}</select></div>
    </div>
    <div class="flex" style="justify-content:flex-end;gap:8px;margin-top:16px">
      <button class="btn btn-ghost btn-sm" data-cancel>Cancelar</button>
      <button class="btn btn-green btn-sm" id="ed_save">Guardar cambios</button>
    </div>`;
  };

  /* ---------- modal de perfil completo ---------- */
  const profileModal=(s)=>{
    const st=data.shopperStats(s.id);
    const body=`
      <div class="between" style="margin-bottom:14px">
        <div class="flex">${av(s.nombre,46)}
          <div><div class="card-t" style="font-size:16px">${s.nombre}</div>
          <div style="font-size:12px;color:var(--t3)">${s.code} · ${s.ciudad?s.ciudad+', ':''}${CX.paisName(s.pais)||'—'}</div>
          <div class="flex" style="gap:6px;margin-top:6px">${s.perfilCompleto?ui.bdg('Perfil completo','g'):ui.bdg('Perfil incompleto','a')} ${viaBadge(s.createdVia)}</div></div></div>
        <span style="font-size:18px;font-weight:800;color:var(--amber)">${s.rating?('★ '+s.rating):''}</span>
      </div>
      <div style="background:var(--brand-light);border-radius:10px;padding:9px 13px;font-size:12px;color:var(--brand-dark);margin-bottom:14px" class="between">
        <span>Usuario: <b style="font-family:var(--disp)">${s.user||'—'}</b></span>
        <span>Contraseña: <b style="font-family:var(--disp)">${s.pass||'—'}</b></span>
      </div>
      <div class="grid g4" style="margin-bottom:8px" id="shKpis">
        <div data-k="all" style="cursor:pointer">${ui.kpi('Visitas',st.total,'b')}</div>
        <div data-k="done" style="cursor:pointer">${ui.kpi('Realizadas',st.realizadas,'g')}</div>
        <div data-k="liq" style="cursor:pointer">${ui.kpi('Liquidadas',st.liquidadas,'p')}</div>
        <div data-k="curso" style="cursor:pointer">${ui.kpi('En curso',st.enCurso,'a')}</div>
      </div>
      <div style="font-size:11px;color:var(--t3);text-align:right;margin-bottom:14px">↑ toca un indicador para ver el detalle</div>
      <div class="card-h" style="margin-bottom:10px"><div class="card-t">Datos del shopper</div><button class="btn btn-soft btn-sm" id="shEdit">✎ Editar perfil</button></div>
      <div id="shFormHost"></div>
    `;
    ui.modal(s.nombre, body, {onMount:(ov,close)=>{
      // KPIs clickeables
      const drills={all:[null,'Todas las visitas'],done:[v=>['realizada','cuestionario','liquidada'].includes(v.estado),'Visitas realizadas'],
        liq:[v=>v.estado==='liquidada','Visitas liquidadas'],curso:[v=>['asignada','agendada','postulada'].includes(v.estado),'Visitas en curso']};
      ov.querySelectorAll('#shKpis [data-k]').forEach(el=>el.addEventListener('click',()=>{const d=drills[el.dataset.k];drillVisits(s,d[0],d[1]);}));
      // ver datos en modo lectura
      const host=ov.querySelector('#shFormHost');
      const readView=()=>{
        const r=(l,v)=>`<div style="padding:7px 0;border-bottom:1px solid var(--border)" class="between"><span style="font-size:11px;font-weight:700;color:var(--t2);text-transform:uppercase;letter-spacing:.5px">${l}</span><b style="font-size:13px;color:var(--t1);text-align:right">${v||'<span style=\"color:var(--t3)\">— sin dato</span>'}</b></div>`;
        host.innerHTML=`<div>${r('WhatsApp',s.whatsapp)}${r('Correo',s.email)}${r(CX.geo.deptLabel(s.pais),s.depto)}${r('Edad',s.edad)}${r('Sexo',s.sexo)}${r('Documento',s.dpi)}${r('Banco',s.banco)}${r('Tipo de cuenta',s.ctaTipo)}${r('Número de cuenta',s.ctaNum)}${r('Titular',s.ctaTitular)}${r('Moneda',s.ctaMoneda)}</div>`;
      };
      readView();
      ov.querySelector('#shEdit').addEventListener('click',()=>{
        host.innerHTML=editFields(s);
        const ids={pais:'ed_pais',depto:'ed_depto',ciudad:'ed_ciudad'};
        CX.geo.wire(host,ids,{pais:s.pais,depto:s.depto,ciudad:s.ciudad});
        host.querySelector('[data-cancel]').addEventListener('click',readView);
        host.querySelector('#ed_save').addEventListener('click',()=>{
          const geo=CX.geo.read(host,ids);
          const patch={
            firstName:(host.querySelector('#ed_first').value||'').trim(),
            lastName:(host.querySelector('#ed_last').value||'').trim(),
            pais:geo.pais, depto:geo.depto, ciudad:geo.ciudad,
            whatsapp:(host.querySelector('#ed_wa').value||'').trim(),
            email:(host.querySelector('#ed_mail').value||'').trim(),
            edad:(host.querySelector('#ed_edad').value||'').trim(),
            sexo:host.querySelector('#ed_sexo').value||'',
            dpi:(host.querySelector('#ed_dpi').value||'').trim(),
            banco:(host.querySelector('#ed_banco').value||'').trim(),
            ctaTipo:host.querySelector('#ed_ctaTipo').value||'',
            ctaNum:(host.querySelector('#ed_ctaNum').value||'').trim(),
            ctaTitular:(host.querySelector('#ed_ctaTit').value||'').trim(),
            ctaMoneda:(host.querySelector('#ed_ctaMon').value||'').trim(),
            estado:host.querySelector('#ed_estado').value,
            honorarioPref:host.querySelector('#ed_hon').value,
          };
          patch.cuentaPago=[patch.banco,patch.ctaNum,patch.ctaTitular].filter(Boolean).join(' · ');
          patch.perfilCompleto=data.shopperProfileComplete(Object.assign({},s,patch));
          data.updateShopper(s.id,patch);
          CX.ui.toast('Perfil actualizado','ok');
          close(); CX.router.nav('shoppers');
        });
      });
    }});
  };

  /* ---------- alta manual ---------- */
  const altaModal=()=>{
    const ids={pais:'al_pais',depto:'al_depto',ciudad:'al_ciudad'};
    ui.modal('Alta manual de shopper', `
      <p style="font-size:13px;color:var(--t2);margin-bottom:14px">Solo necesitas lo esencial. El shopper completará su perfil (ciudad, documento, cuenta de pago, etc.) al ingresar con sus credenciales.</p>
      <div class="grid g2" style="gap:12px 14px">
        <div><label class="lbl">Primer nombre <b style="color:var(--accent)">*</b></label><input class="inp" id="al_first" placeholder="Ej. Carlos"></div>
        <div><label class="lbl">Primer apellido <b style="color:var(--accent)">*</b></label><input class="inp" id="al_last" placeholder="Ej. Martínez"></div>
        <div style="grid-column:1/3"><label class="lbl">WhatsApp <b style="color:var(--accent)">*</b></label><input class="inp" id="al_wa" placeholder="+502 5555 5555"></div>
      </div>
      <details style="margin:14px 0"><summary style="cursor:pointer;font-size:12.5px;font-weight:700;color:var(--brand)">+ Agregar más datos ahora (opcional)</summary>
        <div class="grid g2" style="gap:12px 14px;margin-top:12px">
          ${CX.geo.fieldsHTML(ids)}
          <div><label class="lbl">Correo</label><input class="inp" id="al_mail" placeholder="correo@ejemplo.com"></div>
          <div><label class="lbl">Edad</label><input class="inp" id="al_edad" type="number" min="16" max="99"></div>
          <div><label class="lbl">Sexo</label><select class="sel" id="al_sexo"><option value="">Selecciona…</option><option>Femenino</option><option>Masculino</option><option>Otro</option><option>Prefiero no decir</option></select></div>
        </div>
      </details>
      <div id="al_creds" style="background:var(--brand-light);border-radius:10px;padding:10px 13px;font-size:12px;color:var(--brand-dark);margin:6px 0 14px">Credenciales automáticas según el patrón: <b>${CX.CREDS.userExample()}</b> · <b>${CX.CREDS.passExample()}</b></div>
      <div style="text-align:right"><button class="btn btn-green" id="al_save">Crear shopper</button></div>
    `, {onMount:(ov,close)=>{
      CX.geo.wire(ov, ids);
      const upd=()=>{const f=ov.querySelector('#al_first').value,l=ov.querySelector('#al_last').value;
        if(f&&l)ov.querySelector('#al_creds').innerHTML=`Credenciales: usuario <b>${CX.CREDS.user(f,l)}</b> · contraseña <b>${CX.CREDS.pass(f,l)}</b>`;};
      ov.querySelector('#al_first').addEventListener('input',upd);
      ov.querySelector('#al_last').addEventListener('input',upd);
      ov.querySelector('#al_save').addEventListener('click',()=>{
        const first=(ov.querySelector('#al_first').value||'').trim();
        const last=(ov.querySelector('#al_last').value||'').trim();
        const wa=(ov.querySelector('#al_wa').value||'').trim();
        if(!first||!last||!wa){CX.ui.toast('Nombre, apellido y WhatsApp son obligatorios','err');return;}
        const geo=CX.geo.read(ov, ids);
        data.addShopper({via:'manual', estado:'Pendiente', firstName:first, lastName:last, whatsapp:wa,
          pais:geo.pais, depto:geo.depto, ciudad:geo.ciudad,
          email:(ov.querySelector('#al_mail').value||'').trim(),
          edad:(ov.querySelector('#al_edad').value||'').trim(),
          sexo:ov.querySelector('#al_sexo').value||''});
        close(); CX.ui.toast('Shopper creado · el resto del perfil lo completa al ingresar','ok',3600);
        CX.router.nav('shoppers');
      });
    }});
  };

  /* ---------- montaje de eventos ---------- */
  setTimeout(()=>{
    document.getElementById('shNew')?.addEventListener('click',altaModal);
    const bindRows=()=>document.querySelectorAll('#shBody [data-sid]').forEach(tr=>tr.addEventListener('click',()=>{
      const s=data.getShopper(tr.dataset.sid); if(s)profileModal(s);
    }));
    bindRows();
    // KPIs superiores clickeables → lista filtrada de shoppers
    const tkMap={all:['Shoppers del proyecto',()=>true],act:['Shoppers activos',s=>s.estado!=='Pendiente'],incom:['Perfiles incompletos',s=>!s.perfilCompleto],pref:['Honorario preferente',s=>s.honorarioPref==='Preferente']};
    document.querySelectorAll('#shTopKpis [data-tk]').forEach(el=>el.addEventListener('click',()=>{const d=tkMap[el.dataset.tk];const arr=L.filter(d[1]);
      ui.modal(d[0]+' ('+arr.length+')',arr.length?`<table class="tbl"><thead><tr><th>Shopper</th><th>Ciudad</th><th>Rating</th><th>Estado</th></tr></thead><tbody>${arr.map(s=>`<tr class="hov" data-pk="${s.id}" style="cursor:pointer"><td><b>${s.nombre}</b><div style="font-size:10px;color:var(--t3)">${s.code}</div></td><td style="font-size:12px">${s.ciudad||CX.paisName(s.pais)}</td><td style="font-weight:700;color:var(--amber)">★ ${s.rating||'—'}</td><td>${ui.bdg(s.estado||'—',s.estado==='Pendiente'?'a':'g')}</td></tr>`).join('')}</tbody></table>`:ui.empty('👥','Sin shoppers en esta categoría.'),{onMount:(ov,close)=>ov.querySelectorAll('[data-pk]').forEach(tr=>tr.addEventListener('click',()=>{close();const s=data.getShopper(tr.dataset.pk);if(s)profileModal(s);}))});
    }));
    if(CX.session._focusShopper){ const fs=data.getShopper(CX.session._focusShopper); CX.session._focusShopper=null; if(fs)setTimeout(()=>profileModal(fs),120); }
    // buscador
    const search=document.getElementById('shSearch');
    if(search)search.addEventListener('input',()=>{
      const q=search.value.toLowerCase().trim();
      const filtered=list().filter(s=>!q||[s.nombre,s.ciudad,s.code,CX.paisName(s.pais)].join(' ').toLowerCase().includes(q));
      const body=document.getElementById('shBody'), empty=document.getElementById('shEmpty');
      body.innerHTML=filtered.map(row).join('');
      empty.style.display=filtered.length?'none':'block';
      bindRows();
    });
  },0);

  return render();
});
