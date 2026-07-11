/* ============================================================
   Orbit 360 · Renovaciones operativas v1.200
   - elimina estimaciones presentadas como propuestas;
   - prepara campañas sin simular envíos;
   - crea/reutiliza gestión y abre Cotizador con contexto;
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
  function daysUntil(s) { if (!s) return null; const d=new Date(s+'T00:00:00'),n=new Date();n.setHours(0,0,0,0);return Math.ceil((d-n)/86400000); }
  function active(p) { return p && ['vigente','porrenovar'].includes(norm(p.estado)); }
  function policies(limit) {
    return A.filter('polizas', S().all('polizas') || [], 'renovaciones').filter(p => {
      if (!active(p)) return false;
      const d=daysUntil(p.vigenciaFin);
      return d != null && d <= (limit == null ? 90 : limit);
    }).sort((a,b)=>String(a.vigenciaFin||'').localeCompare(String(b.vigenciaFin||'')));
  }
  function moneyMap(rows) { const out={};rows.forEach(p=>{const cur=p.moneda||'SIN_MONEDA';out[cur]=(out[cur]||0)+(+((p.primaNeta!=null)?p.primaNeta:p.prima)||0);});return out; }
  function mapHtml(map) { const keys=Object.keys(map);return keys.map(k=>`<span style="display:block;font-size:${keys.length>1?'13px':'21px'}">${esc(k)} ${Number(map[k]).toLocaleString('es-GT',{maximumFractionDigits:0})}</span>`).join('')||'0'; }
  function modal(id,title,body,actions) {
    let b=document.getElementById(id);if(b)b.remove();b=document.createElement('div');b.id=id;b.className='drawer-back open';b.style.cssText='display:grid;place-items:center;z-index:230';
    b.innerHTML=`<div class="card" style="width:min(760px,96vw);max-height:92vh;display:flex;flex-direction:column;padding:0"><div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:12px"><div><small class="muted">Renovaciones</small><b style="display:block;font-family:var(--f-display);font-size:17px">${esc(title)}</b></div><button class="imp-x" data-close>✕</button></div><div style="padding:12px 18px 18px;overflow:auto;flex:1">${body}</div><div style="padding:12px 18px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end">${actions||''}<button class="btn ghost" data-close>Cerrar</button></div></div>`;
    document.body.appendChild(b);const close=()=>b.remove();b.querySelectorAll('[data-close]').forEach(x=>x.onclick=close);b.addEventListener('click',e=>{if(e.target===b)close();});return b;
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
    const campaign=Array.from(host.querySelectorAll('button')).find(b=>/Campaña de renovación/i.test(b.textContent||''));if(campaign)campaign.textContent='Preparar campaña de renovación';
  }
  function existingManagement(policyId) {
    return (S().all('gestiones')||[]).find(g=>g.polizaId===policyId&&norm(g.tipo)==='renovacion'&&!['completada','cerrada','cancelada','anulada'].includes(norm(g.estado)));
  }
  function solicitarPropuestas(policyId) {
    const p=S().get('polizas',policyId);if(!p||!A.canView('polizas',p,'renovaciones'))return U.toast('Póliza fuera de tu alcance');
    if(!active(p))return U.toast('La póliza está en histórico; usa recuperación o nueva gestión.');
    const c=S().get('clientes',p.clienteId)||{};
    let g=existingManagement(p.id);
    if(!g&&Orbit.ciclo&&Orbit.ciclo.crearGestion){
      g=Orbit.ciclo.crearGestion({lista:'Renovaciones / Modif.',tipo:'Renovación',titulo:'Renovación '+p.numero,clienteId:p.clienteId,polizaId:p.id,asesorId:p.asesorId,aseguradoraId:p.aseguradoraId,ramo:p.ramo,estado:'Pendiente',prioridad:(daysUntil(p.vigenciaFin)<=15?'Alta':'Media'),vence:p.vigenciaFin,proximaAccion:'Cotizar con fuentes vigentes',nota:'Pendiente de cotización real. No usar estimaciones ni tarifas no validadas.',origen:'Renovaciones',checklist:[{t:'Datos del riesgo actualizados',done:false},{t:'Cotizaciones reales recibidas',done:false},{t:'Comparativo presentado',done:false},{t:'Decisión del cliente',done:false},{t:'Nueva póliza emitida',done:false}]});
    }
    const context={policyId:p.id,clienteId:p.clienteId,gestionId:g&&g.id||'',pais:p.pais||c.pais,moneda:p.moneda,ramo:p.ramo,producto:p.producto||p.subramo,renuevaDe:p.id};
    window.__orbitRenewalContext=context;
    try{S().insert('actividades',{id:'act_'+Date.now().toString(36),tenantId:p.tenantId,clienteId:p.clienteId,asesorId:p.asesorId,tipo:'renovacion',icon:'🔄',fecha:today(),titulo:'Renovación enviada a cotización',detalle:'Póliza '+p.numero+' · gestión '+(g&&g.id||'existente'),gestionId:g&&g.id||'',polizaId:p.id});}catch(e){}
    if(A.audit)A.audit('iniciar_cotizacion_renovacion','polizas',p.id,p,p,'Gestión de renovación iniciada',{gestionId:g&&g.id||'',sinEstimaciones:true});
    location.hash='#/cotizador?renueva='+encodeURIComponent(p.id);
  }
  function campana() {
    const rows=policies(60);
    const b=modal('renewal-campaign-v1200','Preparar campaña',`<div class="cfg-note" style="margin-bottom:12px">Esta acción prepara seguimientos y los registra. No envía WhatsApp ni correo hasta que el canal esté conectado y verificado.</div>${rows.length?rows.map(p=>row(p,true)).join(''):'<div class="empty">No hay renovaciones dentro de 60 días.</div>'}`,rows.length?'<button class="btn primary" data-prepare>Preparar seguimientos</button>':'');
    const btn=b.querySelector('[data-prepare]');if(!btn)return;
    btn.onclick=()=>{
      const ids=Array.from(b.querySelectorAll('[data-ren]:checked')).map(x=>x.dataset.ren),date=today();
      ids.forEach(id=>{const p=S().get('polizas',id),c=p&&S().get('clientes',p.clienteId);if(!p)return;S().update('polizas',p.id,{renovacionSeguimientoPreparado:date,renovacionCanalEstado:'pendiente_conexion'});S().insert('actividades',{id:'act_'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),tenantId:p.tenantId,clienteId:p.clienteId,asesorId:p.asesorId,tipo:'renovacion',icon:'📤',fecha:date,titulo:'Seguimiento de renovación preparado',detalle:'Pendiente de canal conectado · '+p.numero+' · '+(c&&c.nombre||'')});});
      b.remove();U.toast(ids.length+' seguimiento(s) preparados; no enviados');const h=document.getElementById('host');if(h)mod.render(h);
    };
  }

  const originalRender=mod.render.bind(mod);
  mod.render=function(host){const out=originalRender(host);setTimeout(()=>enhance(host),0);return out;};
  mod.campana=campana;
  mod.solicitarPropuestas=solicitarPropuestas;
  mod.__renewalsV1200={originalRender,campana,solicitarPropuestas};
})();
