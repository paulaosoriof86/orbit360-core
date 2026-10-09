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
  const SEARCH_ENRICHMENT_DATA = ['aseguradoras', 'asesores', 'vehiculos'];
  let searchText = '', searchTimer = null;
  const READINESS_BUDGET_MS = 8000;
  let readinessStartedAt = 0, readinessTimer = null, activeHost = null, refreshTimer = null;
  function ensureDataCollections() {
    try { const store=S(); if(store&&typeof store._ensureCollections==='function') store._ensureCollections(REQUIRED_DATA.concat(OPTIONAL_ENRICHMENT_DATA, ['vehiculos'], searchText.trim() ? SEARCH_ENRICHMENT_DATA : [])); } catch (_) {}
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
  /* B4-003: nunca presentar como completa una búsqueda con datos sin hidratar. */
  const foldSearch=value=>String(value==null?'':value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  function searchHydration(){
    if(!searchText.trim())return {state:'ready',missing:[]};
    const store=S();if(!store||store.__productReadOnlyP0!==true||typeof store._productStatus!=='function')return {state:'ready',missing:[]};
    const status=store._productStatus()||{},confirmed=[].concat(status.serverConfirmedCollections||[]),denied=[].concat(status.deniedCollections||[]),errors=status.snapshotErrors||{};
    const advisorProjectionReady=store.__productHydrationRequiredOptionalP0?.advisorProjectionMemoized===true;
    const missing=SEARCH_ENRICHMENT_DATA.filter(n=>!confirmed.includes(n)&&(n!=='asesores'||!advisorProjectionReady));
    if(missing.some(n=>denied.includes(n)||errors[n]))return {state:'unavailable',missing};
    return {state:missing.length?'pending':'ready',missing};
  }
  function searchIndex(rows){
    const store=S(),byId=c=>new Map((store.all(c)||[]).filter(r=>r&&r.id!=null).map(r=>[String(r.id),r]));
    const clients=byId('clientes'),insurers=byId('aseguradoras'),advisors=byId('asesores'),vehiclesByPolicy=new Map();
    (store.all('vehiculos')||[]).forEach(v=>{if(!v||!v.polizaId)return;const k=String(v.polizaId),a=vehiclesByPolicy.get(k)||[];a.push(v);vehiclesByPolicy.set(k,a);});
    const index=new Map();rows.forEach(p=>{
      const c=clients.get(String(p.clienteId||''))||{},ins=insurers.get(String(p.aseguradoraId||''))||{},advisor=advisors.get(String(p.asesorId||''))||{};
      const vehicles=vehiclesByPolicy.get(String(p.id))||[],linked=p.vehiculoId?vehicles.find(v=>String(v.id)===String(p.vehiculoId)):null;
      const terms=[p.numero,c.nombre,c.identificacion,ins.nombre,ins.displayName,p.ramo,p.producto,p.subramo,advisor.nombre,p.asesorNombre,p.responsableNombre,p.placa];
      (linked?[linked]:vehicles).forEach(v=>terms.push(v.placa,v.placaNormalizada,v.placaFuente,v.identificacionRiesgo,v.marca,v.linea,v.modelo,v.anio));
      index.set(String(p.id),foldSearch(terms.filter(Boolean).join(' ')));
    });return index;
  }
  const countryCode = v => String(v == null ? '' : v).trim().toUpperCase();
  const policyCountry = p => { const own=countryCode(p&&p.pais);if(own)return own;const cli=p&&p.clienteId?S().get('clientes',p.clienteId):null;return countryCode(cli&&cli.pais); };
  const selectedCountry = p => { const wanted=countryCode(Orbit.pais); return !wanted || wanted==='TODOS' || policyCountry(p)===wanted; };
  const renewabilityState = p => {
    if(!p || !Object.prototype.hasOwnProperty.call(p,'renovable') || p.renovable==null || String(p.renovable).trim()==='') return 'UNKNOWN';
    const v=String(p.renovable).trim().toLowerCase();
    if(p.renovable===true || ['true','si','sí','renovable'].includes(v)) return 'YES';
    if(p.renovable===false || ['false','no','no renovable'].includes(v)) return 'NO';
    return 'UNKNOWN';
  };
  const policyState = p => String(p&&p.estado||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,'');
  const policyStateLabel = p => String(p&&p.estado||'Pendiente de confirmar').trim()||'Pendiente de confirmar';
  const renewalStateLabel = (p,d) => d<0?'Vencida · '+(-d)+' día'+((-d)===1?'':'s'):d===0?'Vence hoy':'Vence en '+d+' día'+(d===1?'':'s');

  /* R20: authoritative read-only lifecycle projection. Administrative state,
     effective vigencia and verified issuance are separate dimensions. */
  let activeLifecycle=null;

  /* B4-003: la vigencia y el estado fuente no acreditan por si solos
     una renovacion. La continuidad puede cambiar de numero de poliza.
     Toda proyeccion es read-only, nunca escribe renuevaDe/renovadaPor. */
  function renewalLifecycleSnapshot(){
    const store=S(),rows=(store.all('polizas')||[]).filter(p=>p&&p.id);
    const norm=v=>String(v==null?'':v).trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
    const byId=new Map(rows.map(p=>[String(p.id),p])),reverse=new Map(),byCore=new Map(),cache=new Map(),plates=new Map();
    const coreKey=p=>{
      const tenant=norm(p&&p.tenantId),pais=norm(policyCountry(p)),client=norm(p&&p.clienteId),insurer=norm(p&&p.aseguradoraId),ramo=norm(p&&p.ramo);
      return !pais||!client||!insurer||!ramo?'INCOMPLETE|'+String(p&&p.id||''):[tenant,pais,client,insurer,ramo].join('|');
    };
    function plate(p){
      const direct=norm(p&& (p.placa||p.placaNormalizada||p.placaFuente||''));
      if(direct)return direct;
      const text=String(p&&(p.bienAsegurado||p.descripcionRiesgo||p.riesgoDescripcion)||'');
      const match=text.match(/placas?\s*[:\-]?\s*([A-Za-z0-9\-–— ]{4,18})/i);
      return match?norm(match[1]):'';
    }
    for(const v of (store.all('vehiculos')||[])){
      const id=String(v&&v.polizaId||''),number=norm(v&&(v.placa||v.placaNormalizada||v.placaFuente)||'');
      if(id&&number){const values=plates.get(id)||new Set();values.add(number);plates.set(id,values);}
    }
    for(const p of rows){
      const key=coreKey(p);if(!byCore.has(key))byCore.set(key,[]);byCore.get(key).push(p);
      if(p.renuevaDe){const parent=String(p.renuevaDe);if(!reverse.has(parent))reverse.set(parent,[]);reverse.get(parent).push(p);}
    }
    const riskSet=p=>{
      const values=new Set(plates.get(String(p.id))||[]),own=plate(p);if(own)values.add(own);return values;
    };
    const riskCompatible=(p,q)=>{
      const left=riskSet(p),right=riskSet(q);
      return !left.size||!right.size||[...left].some(x=>right.has(x));
    };
    const strictSameRisk=(p,q)=>{
      const left=riskSet(p),right=riskSet(q);
      return left.size>0&&right.size>0&&[...left].some(x=>right.has(x));
    };
    const sameCore=(p,q)=>coreKey(p)===coreKey(q)&&!coreKey(p).startsWith('INCOMPLETE|')&&riskCompatible(p,q);
    const later=(p,q)=>!!(p.vigenciaInicio&&p.vigenciaFin&&q.vigenciaInicio&&q.vigenciaFin&&String(q.vigenciaInicio)>String(p.vigenciaInicio)&&String(q.vigenciaFin)>String(p.vigenciaFin));
    const sourceRenewal=q=>/RENOVAD/.test(norm(q&&(q.tipoEmision||q.tipoDeEmision||q.tipo_emision||q.emisionTipo||q.tipoEmisionPoliza||'')));
    const consecutive=(p,q)=>{
      const end=Date.parse(String(p.vigenciaFin||'')+'T00:00:00Z'),start=Date.parse(String(q.vigenciaInicio||'')+'T00:00:00Z');
      return Number.isFinite(end)&&Number.isFinite(start)&&Math.abs(start-end)<=31*86400000;
    };
    function assess(p){
      if(!p)return{bucketEligible:false,actionable:false,reviewOnly:false,terminal:true,reason:'POLIZA_AUSENTE'};
      const id=String(p.id||''),prior=cache.get(id);if(prior)return prior;
      const state=policyState(p),renewable=renewabilityState(p),d=U.daysFromNow(p.vigenciaFin),key=coreKey(p);
      const sameGroup=(p.numero?(byCore.get(key)||[]):[]).filter(q=>q.id!==p.id&&q.numero&&later(p,q)&&sameCore(p,q));
      const forward=p.renovadaPor?byId.get(String(p.renovadaPor)):null;
      const back=(reverse.get(id)||[]).filter(q=>q.id!==p.id);
      const explicit=[...(forward?[forward]:[]),...back].filter((q,i,a)=>a.findIndex(x=>x.id===q.id)===i);
      const verified=explicit.filter(q=>later(p,q)&&sameCore(p,q)&&(!q.renuevaDe||String(q.renuevaDe)===id)&&(!p.renovadaPor||String(p.renovadaPor)===String(q.id)));
      const broken=!!p.renovadaPor&&!forward||explicit.some(q=>!verified.some(v=>v.id===q.id));
      const sourceCandidates=sameGroup.filter(q=>
        strictSameRisk(p,q)&&consecutive(p,q)&&sourceRenewal(q)&&
        ['vigente','porrenovar'].includes(policyState(q)));
      const sourceBacked=sourceCandidates.length===1?sourceCandidates[0]:null;
      const possible=sameGroup.length>0;
      const renewalState=String(p.renovacionEstado||'').trim().toLowerCase().replace(/[\s_-]+/g,'');
      const cancelled=['cancelada','anulada','cancelado','anulado'].includes(state)||renewalState==='cancelada';
      const closed=['norenovada','rechazada','cerrada'].includes(renewalState)||['norenovada','rechazada','reexpedida'].includes(state);
      const historical=['renovada','historica','historico'].includes(state);
      let reason='FUERA_DE_HORIZONTE',terminal=false,actionable=false,reviewOnly=false,bucketEligible=false;
      if(cancelled){terminal=true;reason='CANCELADA';}
      else if(verified.length===1&&!broken){terminal=true;reason='RENOVACION_VINCULADA';}
      else if(verified.length>1||broken){reason='LINEAGE_CONFLICTO';reviewOnly=true;bucketEligible=d!=null&&d<0&&renewable!=='NO';}
      else if(closed){reason='NO_RENOVADA_CERRADA';terminal=true;}
      else if(sourceBacked){
        reason='SUCESORA_DE_FUENTE_PENDIENTE_ENLACE';reviewOnly=true;bucketEligible=false;
      }
      else if(renewalState==='renovada'){reason='RENOVADA_DECLARADA_SIN_SUCESORA_VERIFICADA';reviewOnly=true;bucketEligible=d!=null&&d<0&&renewable!=='NO';}
      else if(historical){reason=possible?'POSIBLE_SUCESORA_SIN_PRUEBA_SUFICIENTE':'HISTORICA_SIN_SUCESORA_ACREDITADA';reviewOnly=true;bucketEligible=d!=null&&d<0&&renewable!=='NO';}
      else if(renewable==='NO'){reason='NO_RENOVABLE';terminal=true;}
      else if(d!=null&&d<=90&&['vigente','porrenovar','vencida'].includes(state)){
        bucketEligible=d<0||['vigente','porrenovar'].includes(state);reviewOnly=renewable==='UNKNOWN';actionable=bucketEligible&&!reviewOnly;
        reason=reviewOnly?'RENOVABILIDAD_SIN_CONFIRMAR':d<0?'VENCIDA_POR_GESTIONAR':'PROXIMA_POR_GESTIONAR';
      }else reason=d==null?'VIGENCIA_NO_CONFIRMADA':'ESTADO_NO_APTO';
      const value={id,days:d,reason,terminal,actionable,reviewOnly,bucketEligible,potentialSuccessor:possible,verifiedSuccessorId:verified.length===1&&!broken?String(verified[0].id):'',sourceBackedSuccessorId:sourceBacked?String(sourceBacked.id):'',effectiveCoverage:d==null?'DESCONOCIDA':d<0?'VENCIDA':d===0?'VENCE_HOY':'NO_VENCIDA',adminState:policyStateLabel(p)};
      if(id)cache.set(id,value);return value;
    }
    return{assess,rows};
  }

  let cachedLifecycle=null,lastLifecycleSnapshotAt=0,lastLifecycleScopeKey='';
  const sharedLifecycle=()=>{
    const store=S(),user=Orbit.auth&&Orbit.auth.productUser||{};
    const role=Orbit.session&&typeof Orbit.session.rol==='function'?Orbit.session.rol():'';
    const key=[String(user.uid||''),String(role||''),String(Orbit.pais||''),String(store&&store._scopedFor||'')].join('|');
    if(!cachedLifecycle||lastLifecycleScopeKey!==key||Date.now()-lastLifecycleSnapshotAt>1000){
      cachedLifecycle=renewalLifecycleSnapshot();lastLifecycleSnapshotAt=Date.now();lastLifecycleScopeKey=key;
    }
    return cachedLifecycle;
  };
  Orbit.renewalLifecycle={snapshot:sharedLifecycle,evaluate:p=>sharedLifecycle().assess(p),invalidate:()=>{cachedLifecycle=null;lastLifecycleSnapshotAt=0;lastLifecycleScopeKey='';}};
  const lifecycleOf=p=>(activeLifecycle||renewalLifecycleSnapshot()).assess(p);
  const terminalRenewalOutcome = p => {
    if(!p) return true;
    if(p.renovadaPor) return true;
    const state=String(p.renovacionEstado||'').trim().toLowerCase().replace(/[\s_-]+/g,'');
    return ['renovada','norenovada','rechazada','cerrada','cancelada'].includes(state);
  };
  const renewalActionable = p => {
    if(!p || renewabilityState(p)!=='YES' || !selectedCountry(p)) return false;
    return lifecycleOf(p).actionable;
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
    if(!p || renewabilityState(p)==='NO' || !selectedCountry(p)) return false;
    return lifecycleOf(p).bucketEligible;
  };
  const renewalDate45Universe = p => {
    if(!p || !selectedCountry(p)) return false;
    const state=policyState(p),d=U.daysFromNow(p.vigenciaFin);
    return d!=null && d>=0 && d<=45 && ['vigente','porrenovar'].includes(state);
  };
  function dispositionOf(p){
    if(lifecycleOf(p).terminal||terminalRenewalOutcome(p))return 'Resultado de renovación registrado';
    const r=renewabilityState(p);if(r==='NO')return 'No renovable confirmado';if(r==='UNKNOWN'||lifecycleOf(p).reviewOnly)return 'Pendiente de clasificar';if(renewalActionable(p))return 'En gestión';return 'Conflicto explícito';
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
    activeLifecycle=null;
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
    activeLifecycle=Orbit.renewalLifecycle.snapshot();
    const cols = buckets();
    const searchQuery=foldSearch(searchText),searchState=searchHydration(),searchApplied=!!searchQuery&&searchState.state==='ready';
    const searchTokens=searchQuery.split(/\s+/).filter(Boolean),searchRows=cols.flatMap(c=>c.items.map(it=>it.p));
    const index=searchApplied?searchIndex(searchRows):null;
    const visibleCols=cols.map(c=>({key:c.key,label:c.label,tone:c.tone,total:c.items.length,items:searchApplied?c.items.filter(it=>searchTokens.every(token=>(index.get(String(it.p.id))||'').includes(token))):c.items}));
    const shown=visibleCols.reduce((n,c)=>n+c.items.length,0),totalResults=cols.reduce((n,c)=>n+c.items.length,0);
    const searchHint=!searchQuery?'Escribe para buscar por póliza, cliente, aseguradora, ramo, producto, asesor o placa.':searchState.state==='pending'?'Preparando datos para buscar en todos los campos. El filtro aún no se aplicó.':searchState.state==='unavailable'?'Búsqueda completa no disponible; las tarjetas originales siguen sin filtrar.':'Mostrando '+shown+' de '+totalResults+' renovaciones en el Kanban.';
    const pendingValidation=S().where('polizas', renewalPendingValidation);
    const dispositionRows45=date45DispositionRows(),disposition45=date45Disposition();
    const totalPrima = cols.reduce((s, c) => s + c.items.filter(it=>lifecycleOf(it.p).actionable).reduce((ss, it) => ss + q.norm(it.p.prima, it.p.moneda), 0), 0),expired=expiredContext();
    const reviewCount=cols.reduce((n,c)=>n+c.items.filter(it=>lifecycleOf(it.p).reviewOnly).length,0);
    const unlinkedHistorical=activeLifecycle.rows.filter(p=>selectedCountry(p)&&lifecycleOf(p).reason==='SUCESORA_DE_FUENTE_PENDIENTE_ENLACE').length;
    const unlinkedCases=activeLifecycle.rows.filter(p=>selectedCountry(p)&&lifecycleOf(p).sourceBackedSuccessorId);
    const effectiveBadge=(p,life,d)=>d<0
      ?life.reviewOnly?'Vencida · resultado por verificar':'Vencida'
      :life.reviewOnly?'Vigencia en revisión':'Vigente';
    const toneBg = { danger: 'var(--danger)', warn: 'var(--warn)', info: 'var(--info)' };

    host.innerHTML = `<div class="page">
      ${K.bannerFor('renovaciones', `<button class="btn primary" onclick="Orbit.modules.renovaciones.campana()">📤 Campaña de renovación</button>`)}
      ${K.kpis([
        { label: 'Vencidas: gestión / revisión', val: cols[0].items.length, color: 'var(--danger)', foot: 'acciones protegidas según estado', footTone: 'down', onclick: "location.hash='#/renovaciones'" },
        { label: '≤15 días', val: cols[1].items.length, color: 'var(--danger)', foot: 'urgente', onclick: "location.hash='#/renovaciones'" },
        { label: '16–45 días', val: cols[2].items.length, color: 'var(--warn)', foot: 'planificar', onclick: "location.hash='#/renovaciones'" },
        { label: 'Prima en juego', val: U.moneyShort(totalPrima, Orbit.q.monedaPais()), color: 'var(--ok)', foot: 'a 90 días', onclick: "location.hash='#/renovaciones'" }
      ])}
      <details class="renewal-pipeline-note" data-renewability-pending-count="${pendingValidation.length}" data-expired-pipeline-count="${expired.pipeline}" data-expired-historical-count="${expired.historicalExpired}" data-source-link-review-count="${unlinkedHistorical}" style="margin:0 0 12px;font-size:12px">
        <summary style="cursor:pointer;color:var(--ink-3)">${unlinkedHistorical+reviewCount} situaciones para revisar · Ver información</summary>
        <div class="cfg-note" style="margin-top:8px">
          <b>Revisión de información</b>
          <p>${reviewCount} vencidas requieren validar su estado antes de una acción automática. ${unlinkedHistorical} ediciones anteriores tienen una nueva vigencia con evidencia de origen, pero su vínculo todavía no está registrado. No se consideran renovaciones acreditadas ni se envían a campaña mientras se verifica esa relación.</p>
          ${unlinkedCases.slice(0,20).map(p=>'<button type="button" class="btn ghost sm" data-unlinked-review="'+U.esc(p.id)+'">Revisar relación: '+U.esc(p.numero||'Sin número')+'</button>').join('')}
        </div>
      </details>
      <div class="renewal-searchbar" role="search" aria-label="Buscar renovaciones">
        <label for="renewal-search" class="renewal-search-label">Buscar renovaciones</label>
        <div class="renewal-search-controls"><input type="search" id="renewal-search" data-renewal-search-input aria-label="Buscar póliza, cliente, aseguradora, ramo, producto, asesor o placa" autocomplete="off" placeholder="Póliza, cliente, aseguradora, placa…" value="${U.esc(searchText)}"><button type="button" class="btn ghost sm" data-renewal-search-clear ${!searchText?'disabled':''}>Limpiar</button></div>
        <div class="muted renewal-search-feedback" role="status" aria-live="polite" data-renewal-search-state="${!searchQuery?'idle':searchState.state}" data-renewal-search-shown="${searchApplied?shown:''}" data-renewal-search-total="${totalResults}">${U.esc(searchHint)}</div>
      </div>
      <style>
        .renewal-searchbar{display:grid;gap:7px;margin-bottom:14px;padding:15px;border:1px solid var(--line);border-radius:var(--r-sm);background:var(--card)}
        .renewal-search-label{font-weight:800;font-family:var(--f-display);font-size:13px}
        .renewal-search-controls{display:flex;gap:9px;flex-wrap:wrap;align-items:center}
        .renewal-search-controls input{flex:1 1 260px;min-width:0;max-width:100%;border:1px solid var(--line);border-radius:9px;padding:10px 12px;background:var(--surface);color:var(--ink);font:inherit}
        .renewal-search-feedback{font-size:12px;overflow-wrap:anywhere}
        @media(max-width:390px){.renewal-search-controls{align-items:stretch}.renewal-search-controls input{flex-basis:100%}.renewal-search-controls button{width:100%}}
      </style>
      <style>
        .renewal-board{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:14px;align-items:start}
        .renewal-bucket,.renewal-policy-card{min-width:0}
        .renewal-policy-name,.renewal-insurer-name{overflow-wrap:anywhere}
        .renewal-card-actions>*{flex:1 1 118px;min-width:0;white-space:normal;text-align:center}
        @media(max-width:480px){.renewal-board{grid-template-columns:minmax(0,1fr)}.renewal-card-actions>*{flex-basis:100%}.renewal-policy-card{padding:12px!important}}
      </style>
      <div class="renewal-board">
        ${visibleCols.map(c => `<div class="card renewal-bucket" data-renewal-bucket="${c.key}" data-renewal-bucket-count="${c.items.length}" data-renewal-bucket-total="${c.total}" style="min-width:0;overflow:visible">
          <div style="padding:12px 14px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;border-top:3px solid ${toneBg[c.tone]}">
            <b style="font-family:var(--f-display);font-size:13px">${c.label}</b>
            <span class="badge ${c.tone === 'info' ? 'info' : c.tone}">${c.items.length}${searchApplied?" de "+c.total:""}</span>
          </div>
          <div style="padding:10px;display:grid;gap:9px;max-height:560px;overflow-y:auto">
            ${c.items.map(({ p, d }) => {
              const cli = S().get('clientes', p.clienteId), asg = q.aseguradora(p.aseguradoraId), life=lifecycleOf(p);
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
                    <span class="badge neutral" data-renewal-effective-status="${U.esc(life.reason)}" title="Estado de origen: ${U.esc(policyStateLabel(p))}">${U.esc(effectiveBadge(p,life,d))}</span>
                    <span class="badge ${d<0?'danger':'info'}">Vigencia calculada: ${U.esc(renewalStateLabel(p,d))}</span>
                    ${life.reviewOnly?'<span class="badge warn">Revisión necesaria · renovación bloqueada</span>':renewabilityState(p)==='UNKNOWN'?'<span class="badge warn">Decisión: renovabilidad pendiente</span>':'<span class="badge ok">Decisión: renovable</span>'}
                  </div>
                </div>
                <div class="renewal-card-actions" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
                  ${renewabilityState(p)==='UNKNOWN'?'<button class="btn ghost sm" data-renewability-review="'+U.esc(p.id)+'" style="flex:1" onclick="event.stopPropagation();Orbit.modules.cliente360.editarPoliza(\''+p.id+'\',\'renovabilidad\')">Revisar renovabilidad</button>':''}
                  ${life.actionable?'<a href="https://wa.me/'+wa+'?text='+waTxt+'" target="_blank" rel="noopener" class="reno-wa" style="flex:1" onclick="event.stopPropagation()">💬 WhatsApp</a><button class="btn ghost sm" style="flex:1" onclick="event.stopPropagation();Orbit.modules.renovaciones.solicitarPropuestas(\''+U.esc(p.id)+'\')">📋 Propuestas</button>':'<button class="btn ghost sm" style="flex:1" onclick="event.stopPropagation();Orbit.modules.cliente360.verPoliza(\''+U.esc(p.id)+'\')">Revisar situación de póliza</button>'}
                </div>
              </div>`;
            }).join('') || `<div class="muted" style="text-align:center;padding:24px 8px;font-size:12.5px">Sin pólizas en este tramo.</div>`}
          </div>
        </div>`).join('')}
      </div></div>`;
    host.querySelectorAll('[data-unlinked-review]').forEach(button=>button.addEventListener('click',()=>Orbit.modules.cliente360.verPoliza(button.dataset.unlinkedReview)));
    const box=host.querySelector('[data-renewal-search-input]');
    if(box)box.addEventListener('input',event=>{
      searchText=event.target.value;clearTimeout(searchTimer);
      searchTimer=setTimeout(()=>{
        if(!activeHost||!activeHost.isConnected||!String(location.hash||'').startsWith('#/renovaciones'))return;
        const pos=box.selectionStart;render(activeHost);
        const input=activeHost.querySelector('[data-renewal-search-input]');if(input){input.focus();try{input.setSelectionRange(pos,pos);}catch(_){}}
      },180);
    });
    const clear=host.querySelector('[data-renewal-search-clear]');
    if(clear)clear.addEventListener('click',()=>{searchText='';clearTimeout(searchTimer);render(host);host.querySelector('[data-renewal-search-input]')?.focus();});
  }
  /* Policies + clients determine readiness; insurer directory enriches names only.
     Never publish partial policy counts while required snapshots are missing.
     Late authoritative data refreshes the same active route without blocking on insurers. */
  window.addEventListener('orbit:store:emit', event => {
    const collection = event && event.detail && event.detail.collection || '*';
    if(collection==='*'||collection==='polizas'||collection==='clientes')Orbit.renewalLifecycle.invalidate();
    if (collection !== '*' && !REQUIRED_DATA.includes(collection) && collection !== 'aseguradoras' && !(searchText.trim() && SEARCH_ENRICHMENT_DATA.includes(collection))) return;
    if (!activeHost || !activeHost.isConnected || !String(location.hash || '').startsWith('#/renovaciones')) return;
    const busy = activeHost.querySelector('[data-renewals-loading]');
    if (!busy && collection !== 'aseguradoras' && collection !== 'vehiculos' && !searchText.trim()) return;
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
