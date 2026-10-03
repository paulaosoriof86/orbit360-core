/* ============================================================
   Orbit 360 · Renovaciones operativas v1.200
   - elimina estimaciones presentadas como propuestas;
   - prepara campañas sin simular envíos;
   - Propuestas crea gestión en Ops; no redirige al Cotizador;
   - Renovar registra aprobación y crea gestión de renovación aceptada en Ops;
   - Cotizar directamente es una acción separada para roles operativos superiores;
   - KPI con detalle y monedas separadas.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
(function () {
  const mod = Orbit.modules.renovaciones;
  const A = Orbit.access;
  const U = Orbit.ui;
  const S = () => Orbit.store;
  if (!mod || !A || !mod.render || mod.__renewalsV1200) return;

  function esc(v) { return U && U.esc ? U.esc(String(v == null ? '' : v)) : String(v || ''); }
  function norm(v) { return A.norm ? A.norm(v) : String(v || '').toLowerCase(); }
  function today() { return U && U.today ? U.today() : new Date().toISOString().slice(0, 10); }
  function countryCode(v) { return String(v == null ? '' : v).trim().toUpperCase(); }
  function policyCountry(p) { const c=p&&p.clienteId?S().get('clientes',p.clienteId):null; return countryCode(p&&p.pais || c&&c.pais); }
  function selectedCountry(p) { const wanted=countryCode(Orbit.pais); return !wanted || wanted==='TODOS' || policyCountry(p)===wanted; }
  function renewabilityState(p) {
    if(!p || !Object.prototype.hasOwnProperty.call(p,'renovable') || p.renovable==null || String(p.renovable).trim()==='') return 'UNKNOWN';
    const v=String(p.renovable).trim().toLowerCase();
    if(p.renovable===true || ['true','si','sí','renovable'].includes(v)) return 'YES';
    if(p.renovable===false || ['false','no','no renovable'].includes(v)) return 'NO';
    return 'UNKNOWN';
  }
  function daysUntil(s) { if (!s) return null; const d=new Date(s+'T00:00:00'),n=new Date();n.setHours(0,0,0,0);return Math.ceil((d-n)/86400000); }
  function active(p) { return p && renewabilityState(p)==='YES' && ['vigente','porrenovar'].includes(norm(p.estado)) && !p.renovadaPor && norm(p.renovacionEstado) !== 'renovada'; }
  function policies(limit) {
    return A.filter('polizas', S().all('polizas') || [], 'renovaciones').filter(p => {
      if (!active(p) || !selectedCountry(p)) return false;
      const d=daysUntil(p.vigenciaFin);
      return d != null && d <= (limit == null ? 90 : limit);
    }).sort((a,b)=>String(a.vigenciaFin||'').localeCompare(String(b.vigenciaFin||'')));
  }
  function moneyMap(rows) { const out={};rows.forEach(p=>{const cur=p.moneda||'SIN_MONEDA';out[cur]=(out[cur]||0)+(+((p.primaNeta!=null)?p.primaNeta:p.prima)||0);});return out; }
  function mapHtml(map) { const keys=Object.keys(map);return keys.map(k=>`<span style="display:block;font-size:${keys.length>1?'13px':'21px'}">${esc(k)} ${Number(map[k]).toLocaleString('es-GT',{maximumFractionDigits:0})}</span>`).join('')||'0'; }
  function modal(id,title,body,actions) {
    let b=document.getElementById(id);if(b)b.remove();b=document.createElement('div');b.id=id;b.className='drawer-back open';b.style.cssText='display:grid;place-items:center;z-index:230';
    b.innerHTML=`<div class="card" style="width:min(760px,96vw);max-height:92vh;display:flex;flex-direction:column;padding:0"><div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:12px"><div><small class="muted">Renovaciones</small><b style="display:block;font-family:var(--f-display);font-size:17px">${esc(title)}</b></div><button class="imp-x" data-close>✕</button></div><div style="padding:12px 18px 18px;overflow:auto;flex:1">${body}</div><div style="padding:12px 18px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end">${actions||''}<button class="btn ghost" data-close>Cerrar</button></div></div>`;
    document.body.appendChild(b);const close=()=>b.remove();b.querySelectorAll('[data-close]').forEach(x=>x.onclick=close);b.addEventListener('click',e=>{if(e.target===b){e.preventDefault();e.stopPropagation();}});return b;
  }
  function row(p,checkable) {
    const c=S().get('clientes',p.clienteId)||{},d=daysUntil(p.vigenciaFin),asg=S().get('aseguradoras',p.aseguradoraId)||{};
    return `<label class="asg197-detail-row" style="cursor:${checkable?'pointer':'default'}">${checkable?`<input type="checkbox" data-ren="${esc(p.id)}" checked>`:''}<span><b>${esc(c.nombre||'Cliente')} · ${esc(p.numero||'Póliza')}</b><small>${esc(p.ramo||'')} · ${esc(asg.nombre||'')} · ${d<0?Math.abs(d)+' días vencida':d+' días'} · ${esc(p.moneda||'')} ${Number((p.primaNeta!=null?p.primaNeta:p.prima)||0).toLocaleString('es-GT')}</small></span>${checkable?'':'<button class="btn ghost sm" data-open="'+esc(p.id)+'">Ver póliza</button>'}</label>`;
  }
  function detail(title,rows) {
    const b=modal('renewal-detail-v1200',title,rows.length?rows.map(p=>row(p,false)).join(''):'<div class="empty">No hay pólizas para este indicador.</div>');
    b.querySelectorAll('[data-open]').forEach(x=>x.onclick=()=>{b.remove();Orbit.modules.cliente360.verPoliza(x.dataset.open);});
  }
  function enhance(host) {
    if(!host)return;
    const all=policies(90),venc=all.filter(p=>daysUntil(p.vigenciaFin)<0),d15=all.filter(p=>{const d=daysUntil(p.vigenciaFin);return d>=0&&d<=15;}),d45=all.filter(p=>{const d=daysUntil(p.vigenciaFin);return d>15&&d<=45;}),premium=moneyMap(all);
    const defs=[
      ['Vencidas',String(venc.length),'Recuperar o cerrar gestión',()=>detail('Pólizas vencidas',venc)],
      ['≤15 días',String(d15.length),'Atención prioritaria',()=>detail('Renovaciones ≤15 días',d15)],
      ['16–45 días',String(d45.length),'Planificar gestión',()=>detail('Renovaciones 16–45 días',d45)],
      ['Prima neta en gestión',mapHtml(premium),'Separada por moneda; horizonte 90 días',()=>modal('renewal-money-v1200','Prima neta por moneda',Object.keys(premium).map(cur=>`<div class="asg197-detail-row"><span><b>${esc(cur)}</b><small>${all.filter(p=>p.moneda===cur).length} póliza(s)</small></span><span>${Number(premium[cur]).toLocaleString('es-GT')}</span></div>`).join(''))]
    ];
    host.querySelectorAll('.kpi-row .kpi').forEach((el,i)=>{const d=defs[i];if(!d)return;el.removeAttribute('onclick');const l=el.querySelector('.k-label'),v=el.querySelector('.k-val'),f=el.querySelector('.k-foot');if(l)l.textContent=d[0];if(v)v.innerHTML=d[1];if(f)f.textContent=d[2];el.onclick=d[3];el.classList.add('kpi-click');});
    host.querySelectorAll('.reno-wa').forEach(a=>{a.textContent='Abrir WhatsApp';a.title='Acción manual. No representa un envío automático desde Orbit.';});
    host.querySelectorAll('button[onclick*="solicitarPropuestas"]').forEach(btn=>{
      btn.textContent='📋 Propuestas';
      const m=String(btn.getAttribute('onclick')||'').match(/solicitarPropuestas\('([^']+)'\)/);if(!m)return;
      const policyId=m[1],wrap=btn.parentElement;if(!wrap||wrap.dataset.renewalActionsV2)return;wrap.dataset.renewalActionsV2='1';wrap.dataset.renewalActionsLayout='grid2';wrap.style.display='grid';wrap.style.gridTemplateColumns='repeat(2,minmax(0,1fr))';wrap.style.gap='6px';wrap.style.marginTop='8px';
      const renew=document.createElement('button');renew.className='btn primary sm';renew.style.flex='1';renew.textContent='✅ Pedir renovar';renew.onclick=e=>{e.stopPropagation();registrarAceptacion(policyId);};wrap.appendChild(renew);
      if(canDirectQuote()){
        const quote=document.createElement('button');quote.className='btn ghost sm';quote.textContent='🧮 Cotizar';quote.onclick=e=>{e.stopPropagation();cotizarDirecto(policyId);};wrap.appendChild(quote);
      }
      wrap.querySelectorAll('a,button').forEach(el=>{el.style.width='100%';el.style.minWidth='0';el.style.flex='none';el.style.paddingLeft='7px';el.style.paddingRight='7px';el.style.fontSize='11px';el.style.whiteSpace='normal';el.style.lineHeight='1.15';});
    });
    const campaign=Array.from(host.querySelectorAll('button')).find(b=>/Campaña de renovación|Preparar campaña de renovación/i.test(b.textContent||''));if(campaign){if(A.can&&A.can('renovaciones','edit'))campaign.textContent='Preparar campaña de renovación';else campaign.remove();}
  }
  function canDirectQuote() {
    try{return !!(A.can&&A.can('renovaciones','edit')&&!(A.esAsesor&&A.esAsesor()));}catch(e){return false;}
  }
  function existingManagement(policyId,workflowType) {
    return (S().all('gestiones')||[]).find(g=>g.polizaId===policyId&&(!workflowType||g.workflowType===workflowType)&&!['resuelta','completada','cerrada','cancelada','anulada'].includes(norm(g.estado)));
  }
  function renewalContext(p,g) {
    const c=S().get('clientes',p.clienteId)||{};
    return{policyId:p.id,clienteId:p.clienteId,gestionId:g&&g.id||'',pais:p.pais||c.pais,moneda:p.moneda,ramo:p.ramo,producto:p.producto||p.subramo,renuevaDe:p.id};
  }
  function previewBlocked(error) {
    const code=String(error&&(error.code||error.message)||'');
    return /PREVIEW_SYNTHETIC_ONLY|preview.*synthetic|synthetic.*only/i.test(code);
  }
  async function solicitarPropuestas(policyId) {
    const p=S().get('polizas',policyId);
    if(!p||!A.canView('polizas',p,'renovaciones'))return U.toast('Póliza fuera de tu alcance');
    if(!active(p))return U.toast('La póliza está en histórico; usa recuperación o nueva gestión.');
    const existing=existingManagement(p.id,'renewal_proposals');
    if(existing){
      window.__orbitRenewalContext=renewalContext(p,existing);
      U.toast('La gestión de propuestas ya existe en Ops.');
      location.hash='#/ops';
      window.__orbitOpenGestion=existing.id;
      return;
    }
    if(!Orbit.ciclo||typeof Orbit.ciclo.managementCreateModal!=='function')return U.toast('No está disponible el editor operativo canónico.');
    const priority=daysUntil(p.vigenciaFin)<=15?'Alta':'Media';
    return Orbit.ciclo.managementCreateModal({
      clienteId:p.clienteId,
      polizaId:p.id,
      tipo:'Solicitar propuestas de renovación',
      titulo:'Propuestas de renovación · '+p.numero,
      lista:'Renovaciones / Modif.',
      prioridad:priority,
      asesorId:p.asesorId,
      aseguradoraId:p.aseguradoraId,
      vence:p.vigenciaFin,
      proximaAccion:'Operaciones: solicitar/cargar propuestas y preparar comparativo',
      nota:'Solicitar propuestas reales de renovación. El asesor no cotiza directamente.',
      origen:'Renovaciones',
      checklist:[
        {t:'Solicitud recibida en Ops',done:true},
        {t:'Propuestas / cotizaciones reales obtenidas',done:false},
        {t:'Comparativo presentado',done:false},
        {t:'Decisión del cliente',done:false}
      ],
      extraFields:{
        sourcePolicyId:p.id,
        pais:p.pais,
        moneda:p.moneda,
        producto:p.producto||p.subramo,
        workflowType:'renewal_proposals',
        renewalAction:'request_proposals'
      },
      openAfterCreate:false,
      onCreated:g=>{
        window.__orbitRenewalContext=renewalContext(p,g);
        if(A.audit)A.audit('solicitar_propuestas_renovacion','gestiones',g.id,null,g,'Solicitud de propuestas de renovación',{policyId:p.id});
        U.toast('Gestión de propuestas creada y confirmada en Ops.');
        location.hash='#/ops';
        window.__orbitOpenGestion=g.id;
      }
    });
  }
  function cotizarDirecto(policyId) {
    const p=S().get('polizas',policyId);if(!p||!A.canView('polizas',p,'renovaciones'))return U.toast('Póliza fuera de tu alcance');
    if(!canDirectQuote())return U.toast('Tu rol activo debe solicitar propuestas mediante Ops.');
    window.__orbitRenewalContext=renewalContext(p,null);
    location.hash='#/cotizador?renueva='+encodeURIComponent(p.id);
  }
  function registrarAceptacion(policyId) {
    const p=S().get('polizas',policyId);
    if(!p||!A.canView('polizas',p,'renovaciones'))return U.toast('Póliza fuera de tu alcance');
    if(!active(p))return U.toast('La póliza está en histórico; usa recuperación o nueva gestión.');
    const existing=existingManagement(p.id,'renewal_accepted');
    if(existing){
      U.toast('La renovación aceptada ya está en Ops.');
      location.hash='#/ops';
      window.__orbitOpenGestion=existing.id;
      return;
    }
    if(!Orbit.ciclo||typeof Orbit.ciclo.managementCreateModal!=='function')return U.toast('No está disponible el editor operativo canónico.');
    return Orbit.ciclo.managementCreateModal({
      clienteId:p.clienteId,
      polizaId:p.id,
      tipo:'Renovación aceptada',
      titulo:'Renovación aceptada · '+p.numero,
      lista:'Renovaciones / Modif.',
      prioridad:'Alta',
      asesorId:p.asesorId,
      aseguradoraId:p.aseguradoraId,
      vence:p.vigenciaFin,
      proximaAccion:'Operaciones: solicitar emisión o registrar renovación en firme',
      nota:'',
      origen:'Renovaciones',
      requireConfirmationText:'Confirmo que el cliente aprobó la renovación.',
      confirmationHelp:'La aprobación debe estar respaldada por correo, WhatsApp, documento o registro de gestión.',
      checklist:[
        {t:'Aprobación del cliente registrada',done:true},
        {t:'Definir: solicitar emisión o registrar renovación en firme',done:false},
        {t:'Nueva póliza de renovación creada',done:false}
      ],
      extraFields:{
        sourcePolicyId:p.id,
        pais:p.pais,
        moneda:p.moneda,
        producto:p.producto||p.subramo,
        workflowType:'renewal_accepted',
        renewalAction:'client_approved',
        acceptedConfirmed:true
      },
      dynamicFields:ctx=>({
        clientApprovalAt:new Date().toISOString(),
        clientApprovalNote:ctx.nota||''
      }),
      openAfterCreate:false,
      onCreated:g=>{
        window.__orbitRenewalContext=renewalContext(p,g);
        if(A.audit)A.audit('renovacion_aceptada','gestiones',g.id,null,g,'Cliente confirmó renovación',{policyId:p.id});
        U.toast('Renovación aceptada creada y confirmada en Ops.');
        location.hash='#/ops';
        window.__orbitOpenGestion=g.id;
      }
    });
  }
  function campana() {
    const rows=policies(60);
    const b=modal('renewal-campaign-v1200','Preparar campaña',`<div class="cfg-note" style="margin-bottom:12px">Esta acción prepara seguimientos y los registra. No envía WhatsApp ni correo hasta que el canal esté conectado y verificado.</div>${rows.length?rows.map(p=>row(p,true)).join(''):'<div class="empty">No hay renovaciones dentro de 60 días.</div>'}`,rows.length?'<button class="btn primary" data-prepare>Preparar seguimientos</button>':'');
    const btn=b.querySelector('[data-prepare]');if(!btn)return;
    btn.onclick=async()=>{
      const ids=Array.from(b.querySelectorAll('[data-ren]:checked')).map(x=>x.dataset.ren),date=today();
      if(!ids.length)return U.toast('Selecciona al menos una póliza.');
      if(!S().batchDurable)return U.toast('Persistencia canónica no disponible.');
      const original=btn.textContent;btn.disabled=true;btn.textContent='Guardando…';
      try{
        const mutations=[];
        ids.forEach(id=>{
          const p=S().get('polizas',id),c=p&&S().get('clientes',p.clienteId);if(!p)return;
          mutations.push({action:'update',collection:'polizas',id:p.id,payload:{renovacionSeguimientoPreparado:date,renovacionCanalEstado:'pendiente_conexion'}});
          const activityId='act_ren_'+String(p.id).replace(/[^A-Za-z0-9._:-]/g,'_')+'_'+date.replace(/-/g,'');
          const activity={id:activityId,tenantId:p.tenantId,clienteId:p.clienteId,asesorId:p.asesorId,tipo:'renovacion',icon:'📤',fecha:date,titulo:'Seguimiento de renovación preparado',detalle:'Pendiente de canal conectado · '+p.numero+' · '+(c&&c.nombre||''),__syntheticQa:p.__syntheticQa===true};
          mutations.push({action:S().get('actividades',activityId)?'update':'insert',collection:'actividades',id:activityId,payload:activity});
        });
        for(let i=0;i<mutations.length;i+=80)await S().batchDurable(mutations.slice(i,i+80));
        b.remove();U.toast(ids.length+' seguimiento(s) preparados y confirmados; no enviados');const h=document.getElementById('host');if(h)mod.render(h);
      }catch(error){
        btn.disabled=false;btn.textContent=original;
        U.toast('No fue posible confirmar la preparación. No se registró un falso éxito.');
      }
    };
  }

  const originalRender=mod.render.bind(mod);
  mod.render=function(host){const out=originalRender(host);enhance(host);return out;};
  mod.campana=campana;
  mod.solicitarPropuestas=solicitarPropuestas;
  mod.cotizarDirecto=cotizarDirecto;
  mod.registrarAceptacion=registrarAceptacion;
  mod.canDirectQuote=canDirectQuote;
  mod.__renewalsV1200={originalRender,campana,solicitarPropuestas,cotizarDirecto,registrarAceptacion,canDirectQuote};
})();
