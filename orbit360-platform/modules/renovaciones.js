/* ============================================================
   Orbit 360 · CRM · Renovaciones (vista global)  — NÚCLEO
   Pipeline de pólizas por vencer, agrupadas por urgencia.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.renovaciones = (function () {
  const U = Orbit.ui, q = Orbit.q, K = Orbit.kit, S = () => Orbit.store;
  const REQUIRED_DATA = ['polizas', 'clientes'];
  const OPTIONAL_ENRICHMENT_DATA = ['aseguradoras'];
  const READINESS_BUDGET_MS = 8000;
  let readinessStartedAt = 0, readinessTimer = null, activeHost = null, refreshTimer = null;
  function ensureDataCollections() {
    try { const store=S(); if(store&&typeof store._ensureCollections==='function') store._ensureCollections(REQUIRED_DATA.concat(OPTIONAL_ENRICHMENT_DATA)); } catch (_) {}
  }
  function renewalDataReadiness() {
    const store=S();
    if(!store || store.__productReadOnlyP0!==true || typeof store._productStatus!=='function') return {state:'ready',missing:[]};
    const ps=store._productStatus()||{},confirmed=[].concat(ps.serverConfirmedCollections||[]),denied=[].concat(ps.deniedCollections||[]),errors=ps.snapshotErrors||{};
    const missing=REQUIRED_DATA.filter(name=>!confirmed.includes(name));
    if(REQUIRED_DATA.some(name=>denied.includes(name)||errors[name])) return {state:'unavailable',missing,denied,errors};
    if(!missing.length)return {state:'ready',missing:[]};
    if(!readinessStartedAt)readinessStartedAt=Date.now();
    return {state:Date.now()-readinessStartedAt>=READINESS_BUDGET_MS?'timed_out':'pending',missing,elapsedMs:Date.now()-readinessStartedAt};
  }
  function clearReadinessWait(){
    readinessStartedAt=0;
    if(readinessTimer){clearTimeout(readinessTimer);readinessTimer=null;}
  }
  function scheduleReadinessRecheck(host,readiness){
    if(readinessTimer||!host||readiness.state!=='pending')return;
    const remaining=Math.max(0,READINESS_BUDGET_MS-Number(readiness.elapsedMs||0));
    readinessTimer=setTimeout(()=>{readinessTimer=null;if(host.isConnected)render(host);},remaining+20);
  }
  function humanCollection(name){return({polizas:'pólizas',clientes:'clientes',aseguradoras:'aseguradoras'})[name]||name;}
  const countryCode = v => String(v == null ? '' : v).trim().toUpperCase();
  const policyCountry = p => { const cli=p&&p.clienteId?S().get('clientes',p.clienteId):null; return countryCode(p&&p.pais || cli&&cli.pais); };
  const selectedCountry = p => { const wanted=countryCode(Orbit.pais); return !wanted || wanted==='TODOS' || policyCountry(p)===wanted; };
  const renewabilityState = p => {
    if(!p || !Object.prototype.hasOwnProperty.call(p,'renovable') || p.renovable==null || String(p.renovable).trim()==='') return 'UNKNOWN';
    const v=String(p.renovable).trim().toLowerCase();
    if(p.renovable===true || ['true','si','sí','renovable'].includes(v)) return 'YES';
    if(p.renovable===false || ['false','no','no renovable'].includes(v)) return 'NO';
    return 'UNKNOWN';
  };
  const policyState = p => String(p&&p.estado||'').trim().toLowerCase().replace(/\s+/g,'');
  const policyStateLabel = p => String(p&&p.estado||'Pendiente de confirmar').trim()||'Pendiente de confirmar';
  const renewalStateLabel = (p,d) => d<0?'Vencida · '+(-d)+' día'+((-d)===1?'':'s'):d===0?'Vence hoy':'Vence en '+d+' día'+(d===1?'':'s');
  const terminalRenewalOutcome = p => {
    if(!p) return true;
    if(p.renovadaPor) return true;
    const state=String(p.renovacionEstado||'').trim().toLowerCase().replace(/[\s_-]+/g,'');
    return ['renovada','norenovada','rechazada','cerrada','cancelada'].includes(state);
  };
  const renewalActionable = p => {
    if(!p || renewabilityState(p)!=='YES' || !selectedCountry(p) || terminalRenewalOutcome(p)) return false;
    const d=U.daysFromNow(p.vigenciaFin),state=policyState(p);
    if(d==null) return false;
    return d<0 ? !['cancelada','anulada'].includes(state) : ['vigente','porrenovar'].includes(state);
  };
  const renewalPendingValidation = p => {
    if(!p || renewabilityState(p)!=='UNKNOWN' || !selectedCountry(p) || terminalRenewalOutcome(p)) return false;
    const state=policyState(p),d=U.daysFromNow(p.vigenciaFin);
    return d!=null && d<=90 && ['vigente','porrenovar','vencida'].includes(state);
  };
  /* R20: el Kanban aprobado es la superficie primaria. Una renovabilidad
     pendiente no puede sacar la póliza del bucket de fecha; NO explícito y
     outcomes terminales sí quedan fuera. */
  const renewalPipelineCandidate = p => {
    if(!p || renewabilityState(p)==='NO' || !selectedCountry(p) || terminalRenewalOutcome(p)) return false;
    const state=policyState(p),d=U.daysFromNow(p.vigenciaFin);
    if(d==null) return false;
    return d<0 ? !['cancelada','anulada'].includes(state) : ['vigente','porrenovar'].includes(state);
  };
  const renewalDate45Universe = p => {
    if(!p || !selectedCountry(p)) return false;
    const state=policyState(p),d=U.daysFromNow(p.vigenciaFin);
    return d!=null && d>=0 && d<=45 && ['vigente','porrenovar'].includes(state);
  };
  function dispositionOf(p){
    if(terminalRenewalOutcome(p))return 'Resultado de renovación registrado';
    const r=renewabilityState(p);if(r==='NO')return 'No renovable confirmado';if(r==='UNKNOWN')return 'Pendiente de clasificar';if(renewalActionable(p))return 'En gestión';return 'Conflicto explícito';
  }
  function date45DispositionRows(){return S().where('polizas',renewalDate45Universe).map(p=>({p,disposition:dispositionOf(p),days:U.daysFromNow(p.vigenciaFin)})).sort((a,b)=>(a.days??999)-(b.days??999));}
  function date45Disposition(){
    const rows=date45DispositionRows(),out={total:rows.length,actionable:0,pending:0,nonrenewable:0,terminal:0,conflict:0};
    rows.forEach(({disposition})=>{if(disposition==='Resultado de renovación registrado'){out.terminal++;return;}if(disposition==='No renovable confirmado'){out.nonrenewable++;return;}if(disposition==='Pendiente de clasificar'){out.pending++;return;}if(disposition==='En gestión'){out.actionable++;return;}out.conflict++;});
    out.reconciled=out.total===out.actionable+out.pending+out.nonrenewable+out.terminal+out.conflict;return out;
  }

  function buckets() {
    const cols = [
      { key: 'vencidas', label: 'Vencidas renovables', tone: 'danger', test: d => d < 0 },
      { key: 'd15', label: 'Esta quincena (≤15 d)', tone: 'danger', test: d => d >= 0 && d <= 15 },
      { key: 'd45', label: 'Próximas (16–45 d)', tone: 'warn', test: d => d > 15 && d <= 45 },
      { key: 'd90', label: 'En el horizonte (46–90 d)', tone: 'info', test: d => d > 45 && d <= 90 }
    ];
    const pols = S().where('polizas', renewalPipelineCandidate);
    cols.forEach(c => c.items = []);
    pols.forEach(p => {
      const d = U.daysFromNow(p.vigenciaFin);
      if (d == null || d > 90) return;
      const col = cols.find(c => c.test(d)); if (col) col.items.push({ p, d });
    });
    cols.forEach(c => c.items.sort((a, b) => a.d - b.d));
    return cols;
  }

  function premiumValue(p){const a=Number(p&&p.primaTotal);if(Number.isFinite(a)&&a>0)return a;const b=Number(p&&p.prima);return Number.isFinite(b)&&b>0?b:null;}
  function expiredContext(){
    const rows=(S().all('polizas')||[]).filter(p=>p&&selectedCountry(p)&&U.daysFromNow(p.vigenciaFin)!=null&&U.daysFromNow(p.vigenciaFin)<0);
    const pipeline=rows.filter(renewalPipelineCandidate),nonrenewable=rows.filter(p=>renewabilityState(p)==='NO').length,terminal=rows.filter(terminalRenewalOutcome).length,other=Math.max(0,rows.length-pipeline.length-nonrenewable-terminal);
    return{historicalExpired:rows.length,pipeline:pipeline.length,nonrenewable,terminal,other};
  }

  function render(host) {
    activeHost = host;
    ensureDataCollections();
    const readiness=renewalDataReadiness();
    if(readiness.state!=='ready'){
      scheduleReadinessRecheck(host,readiness);
      const waiting=readiness.state==='pending',missing=readiness.missing.map(humanCollection).join(', ');
      host.innerHTML=`<div class="page" data-renewals-loading="${readiness.state}">${K.bannerFor('renovaciones','')}<div class="card pad" role="status" aria-live="polite"><b>${waiting?'Cargando cartera de renovaciones…':'No fue posible completar la cartera de renovaciones.'}</b><div class="muted" style="margin-top:5px">${waiting?'Estamos confirmando desde el servidor: '+U.esc(missing)+'.':'Falta confirmar desde el servidor: '+U.esc(missing||'fuentes requeridas')+'. No mostramos conteos parciales como si fueran definitivos.'}</div>${waiting?'':'<button type="button" class="btn ghost sm" data-renewals-retry style="margin-top:10px">Reintentar carga</button>'}</div></div>`;
      const retry=host.querySelector('[data-renewals-retry]');if(retry)retry.addEventListener('click',()=>{clearReadinessWait();ensureDataCollections();render(host);});
      return;
    }
    clearReadinessWait();
    const cols = buckets();
    const pendingValidation=S().where('polizas', renewalPendingValidation);
    const dispositionRows45=date45DispositionRows(),disposition45=date45Disposition();
    const totalPrima = cols.reduce((s, c) => s + c.items.reduce((ss, it) => ss + q.norm(it.p.prima, it.p.moneda), 0), 0),expired=expiredContext();
    const toneBg = { danger: 'var(--danger)', warn: 'var(--warn)', info: 'var(--info)' };

    host.innerHTML = `<div class="page">
      ${K.bannerFor('renovaciones', `<button class="btn primary" onclick="Orbit.modules.renovaciones.campana()">📤 Campaña de renovación</button>`)}
      ${K.kpis([
        { label: 'Vencidas renovables', val: cols[0].items.length, color: 'var(--danger)', foot: 'en gestión de renovación', footTone: 'down', onclick: "location.hash='#/renovaciones'" },
        { label: '≤15 días', val: cols[1].items.length, color: 'var(--danger)', foot: 'urgente', onclick: "location.hash='#/renovaciones'" },
        { label: '16–45 días', val: cols[2].items.length, color: 'var(--warn)', foot: 'planificar', onclick: "location.hash='#/renovaciones'" },
        { label: 'Prima en juego', val: U.moneyShort(totalPrima, Orbit.q.monedaPais()), color: 'var(--ok)', foot: 'a 90 días', onclick: "location.hash='#/renovaciones'" }
      ])}
      <div class="cfg-note renewal-pipeline-note" data-renewability-pending-count="${pendingValidation.length}" data-expired-pipeline-count="${expired.pipeline}" data-expired-historical-count="${expired.historicalExpired}" style="margin:0 0 14px"><b>Pipeline de renovación por fecha</b><div class="muted" style="margin-top:5px">Aquí se muestran pólizas que todavía forman parte del proceso de renovación. <b>${expired.pipeline}</b> están vencidas y renovables dentro del pipeline; existen <b>${expired.historicalExpired}</b> pólizas con vigencia pasada en el alcance histórico, de las cuales ${expired.nonrenewable} están marcadas como no renovables y ${expired.terminal} ya tienen resultado terminal. Cada póliza pendiente permanece en su columna por vigencia y se revisa desde allí, sin crear una tabla paralela.</div></div>
      <style>
        .renewal-board{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:14px;align-items:start}
        .renewal-bucket,.renewal-policy-card{min-width:0}
        .renewal-policy-name,.renewal-insurer-name{overflow-wrap:anywhere}
        .renewal-card-actions>*{flex:1 1 118px;min-width:0;white-space:normal;text-align:center}
        @media(max-width:480px){.renewal-board{grid-template-columns:minmax(0,1fr)}.renewal-card-actions>*{flex-basis:100%}.renewal-policy-card{padding:12px!important}}
      </style>
      <div class="renewal-board">
        ${cols.map(c => `<div class="card renewal-bucket" data-renewal-bucket="${c.key}" data-renewal-bucket-count="${c.items.length}" style="min-width:0;overflow:visible">
          <div style="padding:12px 14px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;border-top:3px solid ${toneBg[c.tone]}">
            <b style="font-family:var(--f-display);font-size:13px">${c.label}</b>
            <span class="badge ${c.tone === 'info' ? 'info' : c.tone}">${c.items.length}</span>
          </div>
          <div style="padding:10px;display:grid;gap:9px;max-height:560px;overflow-y:auto">
            ${c.items.map(({ p, d }) => {
              const cli = S().get('clientes', p.clienteId), asg = q.aseguradora(p.aseguradoraId);
              const wa = (cli && cli.telefono || '').replace(/[^0-9]/g, '');
              const waTxt = encodeURIComponent('Hola ' + (cli ? cli.nombre.split(' ')[0] : '') + ', tu póliza ' + p.ramo + ' (' + p.numero + ') vence el ' + U.fmtDate(p.vigenciaFin) + '. ¿Coordinamos la renovación?');
              return `<div class="renewal-policy-card" data-renewal-policy="${U.esc(p.id)}" data-renewal-country="${U.esc(policyCountry(p))}" style="border:1px solid var(--line);border-radius:var(--r-sm);padding:10px 11px;background:var(--card)">
                <div class="clickable" onclick="Orbit.modules.cliente360.verPoliza('${p.id}')" style="cursor:pointer">
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
                    <b class="renewal-policy-name" style="font-size:12.5px;min-width:0">${U.esc(cli ? cli.nombre : '—')}</b>
                    <span class="mono" style="font-size:10.5px;color:${d < 0 ? 'var(--danger)' : 'var(--ink-3)'};white-space:nowrap">${d < 0 ? (-d) + 'd vencida' : d + 'd'}</span>
                  </div>
                  <div class="mono" style="font-size:10.5px;margin-top:4px;color:var(--ink-3)">Póliza ${U.esc(p.numero||'—')}</div>
                  <div class="muted" style="font-size:11.5px;margin-top:4px">${U.esc(p.ramo||'—')} · ${U.esc(p.producto||'—')}</div>
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-top:7px;gap:8px">
                    <span style="display:flex;align-items:center;gap:5px;font-size:11px;min-width:0"><span class="dot-s" style="background:${asg ? asg.color : '#999'}"></span><span class="renewal-insurer-name" style="min-width:0">${U.esc(asg ? asg.nombre : 'Aseguradora por confirmar')}</span></span>
                    <span class="mono" style="font-size:11px;font-weight:600;white-space:nowrap">${premiumValue(p)==null?'<span class="badge warn">Prima pendiente de fuente</span>':U.moneyShort(premiumValue(p),p.moneda)}</span>
                  </div>
                  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:7px">
                    <span class="badge neutral">Póliza: ${U.esc(policyStateLabel(p))}</span>
                    <span class="badge ${d<0?'danger':'info'}">Renovación: ${U.esc(renewalStateLabel(p,d))}</span>
                    ${renewabilityState(p)==='UNKNOWN'?'<span class="badge warn">Decisión: renovabilidad pendiente</span>':'<span class="badge ok">Decisión: renovable</span>'}
                  </div>
                </div>
                <div class="renewal-card-actions" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
                  ${renewabilityState(p)==='UNKNOWN'?'<button class="btn ghost sm" data-renewability-review="'+U.esc(p.id)+'" style="flex:1" onclick="event.stopPropagation();Orbit.modules.cliente360.editarPoliza(\''+p.id+'\',\'renovabilidad\')">Revisar renovabilidad</button>':''}
                  <a href="https://wa.me/${wa}?text=${waTxt}" target="_blank" rel="noopener" class="reno-wa" style="flex:1" onclick="event.stopPropagation()">💬 WhatsApp</a>
                  <button class="btn ghost sm" style="flex:1" onclick="event.stopPropagation();Orbit.modules.renovaciones.solicitarPropuestas('${p.id}')">📋 Propuestas</button>
                </div>
              </div>`;
            }).join('') || `<div class="muted" style="text-align:center;padding:24px 8px;font-size:12.5px">Sin pólizas en este tramo.</div>`}
          </div>
        </div>`).join('')}
      </div></div>`;
  }
  /* Policies + clients determine readiness; insurer directory enriches names only.
     Never publish partial policy counts while required snapshots are missing.
     Late authoritative data refreshes the same active route without blocking on insurers. */
  window.addEventListener('orbit:store:emit', event => {
    const collection = event && event.detail && event.detail.collection || '*';
    if (collection !== '*' && !REQUIRED_DATA.includes(collection) && collection !== 'aseguradoras') return;
    if (!activeHost || !activeHost.isConnected || !String(location.hash || '').startsWith('#/renovaciones')) return;
    const busy = activeHost.querySelector('[data-renewals-loading]');
    if (!busy && collection !== 'aseguradoras') return;
    if (refreshTimer) return;
    refreshTimer = setTimeout(() => {
      refreshTimer = null;
      if (!activeHost || !activeHost.isConnected || !String(location.hash || '').startsWith('#/renovaciones')) return;
      const next = renewalDataReadiness();
      if (next.state === 'ready' || next.state === 'unavailable') render(activeHost);
    }, 45);
  });
  /* Acciones operativas: owner canónico en renewals-v1200-operational-bridge.js. */
  return { render };
})();
