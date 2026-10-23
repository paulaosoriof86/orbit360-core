/* ============================================================
   Orbit 360 · Módulo Orbit Inicio (Mi Día)
   Dashboard ligero sobre los datos del CRM: metas del mes,
   KPIs, avance por asesor, alertas y accesos rápidos.
   (Núcleo de demostración; se ampliará en su paso del build.)
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.inicio = (function () {
  const U = Orbit.ui, q = Orbit.q;
  const rosterRequested = new Set(), rosterFailures = new Set(), rosterAttempts=new Map(), rosterRetryAt=new Map();
  let motivationIndex=0, motivationTimer=null,financeStageTimer=null;
  function stageMonthlyFinancialRead(){
    // A user's first paint and role switch must not wait for portfolio scans.
    if(financeStageTimer)return;
    financeStageTimer=setTimeout(()=>{
      financeStageTimer=null;
      if(Orbit.route&&Orbit.route.key!=='inicio')return;
      const store=Orbit.store;
      if(store&&typeof store._ensureCollections==='function')
        store._ensureCollections(['cobros','recibosEsperados','carteraPrimas']);
    },250);
  }
  const leadershipMessages=[
    'Cada póliza representa una promesa de protección. Liderar es convertirla en confianza.',
    'La prevención abre oportunidades; el seguimiento oportuno protege las relaciones.',
    'Los mejores resultados nacen de decisiones informadas y compromisos cumplidos.',
    'Renovar la confianza de un cliente es tan importante como renovar su cobertura.',
    'Un equipo que comparte prioridades transforma los datos en protección real.',
    'Medir con rigor, actuar con criterio y acompañar con cercanía: así crecemos.'
  ];
  function secureDashboardRosterRole() {
    try {
      const role=String(Orbit.session&&Orbit.session.rol?Orbit.session.rol():'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_');
      return ['operativo','direccion','superadmin','super_admin','superadministrador','admintenant','admin_tenant','admin','asesor','comercial'].includes(role);
    } catch (_) { return false; }
  }
  function rosterKey(country) {
    const id=Orbit.auth&&Orbit.auth.productUser&&Orbit.auth.productUser.uid||'';
    return String(id)+'|'+String(Orbit.session?.rol?.()||'')+'|'+String(country||'TODOS').toUpperCase();
  }
  function rosterReadiness(host,country) {
    if(!secureDashboardRosterRole())return{status:'unavailable',rows:[]};
    const month=q.currentMonthKey?q.currentMonthKey():U.monthKey(),api=Orbit.assignableAdvisorRoster,key=rosterKey(country)+'|'+month;
    if(!api||typeof api.dashboardList!=='function'||typeof api.dashboardPeek!=='function')return{status:'unavailable',rows:[]};
    const cacheKey=String(Orbit.auth?.productUser?.uid||'')+'|'+String(Orbit.session?.rol?.()||'').toLowerCase()+'|'+country+'|'+month;
    if((api.dashboardStatus?.().entries||[]).some(x=>x.key===cacheKey&&x.at))return{status:'ready',rows:api.dashboardPeek(country,month),globalMetas:api.dashboardGlobalMetas?.(country,month)||{},ownAdvisorId:api.dashboardSelfAdvisorId?.(country,month)||'',primaryCountry:api.dashboardPrimaryCountry?.(country,month)||''};
    if(rosterFailures.has(key)){
      if(Date.now()<(rosterRetryAt.get(key)||0))return{status:'unavailable',rows:[]};
      if((rosterAttempts.get(key)||0)>2)return{status:'unavailable',rows:[]};
      rosterFailures.delete(key);
    }
    if(!Orbit.auth?.productUser?.uid)return{status:'pending',rows:[]};
    if(!rosterRequested.has(key)){
      rosterRequested.add(key);
      api.dashboardList(country,month).then(()=>{
        rosterRequested.delete(key);rosterFailures.delete(key);rosterRetryAt.delete(key);rosterAttempts.delete(key);
        if(host?.isConnected&&Orbit.route?.key==='inicio'&&rosterKey(country)+'|'+month===key)render(host);
      }).catch(()=>{
        rosterRequested.delete(key);rosterFailures.add(key);
        const attempts=(rosterAttempts.get(key)||0)+1,delay=attempts===1?1200:attempts===2?3000:0;
        rosterAttempts.set(key,attempts);rosterRetryAt.set(key,Date.now()+delay);
        if(attempts<=2) setTimeout(()=>{
          if(rosterKey(country)+'|'+month===key){rosterFailures.delete(key);
            if(host?.isConnected&&Orbit.route?.key==='inicio')render(host);}
        },delay);
        else if(host?.isConnected&&Orbit.route?.key==='inicio')render(host);
      });
    }
    return{status:'pending',rows:[]};
  }
  function retryAdvisorRoster(){
    const country=String(Orbit.pais||'TODOS').toUpperCase(),key=rosterKey(country)+'|'+(q.currentMonthKey?q.currentMonthKey():U.monthKey());
    rosterFailures.delete(key);rosterRequested.delete(key);rosterRetryAt.delete(key);rosterAttempts.delete(key);
    const host=document.getElementById('host');
    if(host&&Orbit.route?.key==='inicio')render(host);
  }

  function dial(pct, label, val) {
    const rawPct = U.finiteNumber(pct);
    const p = rawPct == null ? 0 : Math.max(0, Math.min(100, rawPct));
    pct = p;
    const deg = p * 3.6;
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:8px">
      <div style="width:118px;height:118px;border-radius:50%;display:grid;place-items:center;
        background:conic-gradient(var(--red) ${deg}deg, var(--line) ${deg}deg)">
        <div style="width:90px;height:90px;border-radius:50%;background:var(--card);display:grid;place-items:center;text-align:center;box-shadow:inset 0 0 0 1px var(--line)">
          <div><div style="font-family:var(--f-display);font-weight:800;font-size:24px;color:var(--ink)">${pct}%</div>
          <div style="font-size:10px;color:var(--ink-3);font-family:var(--f-mono)">${val}</div></div>
        </div></div>
      <div style="font-size:12px;color:var(--ink-2);font-weight:600">${label}</div>
    </div>`;
  }

  function dataReadiness(names, options) {
    options = options || {};
    const store=Orbit.store;
    if(!store || store.__productReadOnlyP0 !== true || typeof store._productStatus !== 'function') return 'ready';
    const ps=store._productStatus()||{}, confirmed=[].concat(ps.serverConfirmedCollections||[]), denied=[].concat(ps.deniedCollections||[]), optional=[].concat(ps.optionalCollections||[]), failed=Object.keys(ps.snapshotErrors||{});
    if(names.some(name=>denied.includes(name)||failed.includes(name))) return 'unavailable';
    if(names.every(name=>confirmed.includes(name))) return 'ready';
    if(options.optionalTerminal===true && ps.ready===true) {
      const unresolved=names.filter(name=>!confirmed.includes(name));
      if(unresolved.length && unresolved.every(name=>optional.includes(name)||failed.includes(name))) return 'unavailable';
    }
    return 'pending';
  }
  function pendingDial(label, readiness) {
    const txt=readiness==='unavailable'?'Este indicador no está disponible para tu acceso':'Preparando información del mes…';
    return `<div data-inicio-dial="${label}" data-readiness="${readiness}" style="min-width:0;min-height:170px;display:grid;place-items:center;text-align:center;padding:18px;border:1px solid var(--line);border-radius:16px;background:var(--card);color:var(--ink-3)"><div><b style="display:block;font-size:13px;color:var(--ink);margin-bottom:8px">${U.esc(label)}</b><span style="font-size:12px">${txt}</span></div></div>`;
  }
  function receiptIndex() {
    const byId=new Map(), byPolicySeq=new Map();
    (Orbit.store.all('recibosEsperados')||[]).forEach(r=>{
      if(!r)return;
      if(r.id!=null)byId.set(String(r.id),r);
      const pid=String(r.polizaId||''),seq=String(r.secuencia||r.cuota||'');
      if(pid)byPolicySeq.set(pid+'|'+seq,r);
    });
    return {byId,byPolicySeq};
  }
  function openFinancialKpi(kind) {
    const isConfirmed=kind==='confirmed';
    const state=dataReadiness(isConfirmed?['clientes','polizas','cobros','recibosEsperados']:['clientes','polizas','carteraPrimas','recibosEsperados']);
    const rows=state==='ready'?(isConfirmed?(q.cobrosConfirmadosRows?q.cobrosConfirmadosRows():[]):(kind==='pending'?q.carteraPendienteRows():q.carteraVencidaRows())):[];
    const title=kind==='pending'?'Pendiente de cobro':kind==='overdue'?'Cartera vencida':'Cobros confirmados';
    let back=document.getElementById('inicio-financial-kpi'); if(back)back.remove();
    back=document.createElement('div');back.id='inicio-financial-kpi';back.className='drawer-back open';
    back.setAttribute('data-inicio-financial-kpi',kind);back.setAttribute('data-readiness',state);back.setAttribute('data-row-count',String(rows.length));
    back.style.cssText='display:grid;place-items:center;z-index:96';
    const rx=receiptIndex();
    const resolveReceipt=row=>{
      const rid=String(row&&((row.reciboId||row.receiptId))||'');
      if(rid&&rx.byId.has(rid))return rx.byId.get(rid);
      const pid=String(row&&row.polizaId||''),seq=String(row&&(row.secuencia||row.cuota)||'');
      return rx.byPolicySeq.get(pid+'|'+seq)||null;
    };
    const rowHtml=rows.map((row,i)=>{
      const rec=resolveReceipt(row);
      const cid=row.clienteId||(rec&&rec.clienteId)||(q.policyLinkedClientId?q.policyLinkedClientId(row):'');
      const cli=cid?Orbit.store.get('clientes',cid):null;
      const due=isConfirmed?(row.fechaPago||row.paidDate||row.inferredEffectiveDate||row.vence||''):(row.vence||row.fechaVencimiento||row.fechaLimite||(rec&&(rec.fechaLimite||rec.vence))||'');
      const rawValue=row.monto!=null?row.monto:row.saldo!=null?row.saldo:(rec&&(rec.primaTotal!=null?rec.primaTotal:rec.montoTotal!=null?rec.montoTotal:rec.monto));
      const cur=row.moneda||(rec&&rec.moneda)||'';
      const cuota=row.cuota||row.secuencia||(rec&&(rec.cuota||rec.secuencia))||'—';
      const label=isConfirmed?'Pagado':kind==='overdue'?'Vencido':'Pendiente';
      const amountText=U.finiteNumber(rawValue)==null?'Sin monto fuente':U.money(rawValue,cur);
      return `<tr class="clickable" data-r="${i}" data-client="${U.esc(cid||'')}"><td>${U.esc(cli?cli.nombre:'—')}</td><td>${U.esc(cuota)}</td><td>${U.esc(amountText)}</td><td>${U.fmtDate(due)}</td><td><span class="badge ${label==='Vencido'?'danger':label==='Pendiente'?'warn':'ok'}">${label}</span></td></tr>`;
    }).join('');
    back.innerHTML=state!=='ready'
      ? `<div class="card" style="width:min(560px,96vw);padding:0"><div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between"><b>${title}</b><button class="imp-x" data-close>✕</button></div><div class="muted" data-kpi-pending="1" style="padding:26px;text-align:center">${state==='unavailable'?'Información no disponible para este acceso.':'Actualizando datos… Estamos esperando confirmación del servidor.'}</div></div>`
      : `<div class="card" style="width:min(820px,96vw);max-height:88vh;overflow:auto;padding:0"><div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between"><b>${title} · ${rows.length}</b><button class="imp-x" data-close>✕</button></div><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Cliente</th><th>Cuota</th><th>Monto</th><th>${isConfirmed?'Fecha efectiva':'Vence'}</th><th>Estado</th></tr></thead><tbody>${rowHtml||'<tr><td colspan="5" class="muted" style="text-align:center;padding:24px">Sin registros.</td></tr>'}</tbody></table></div></div>`;
    document.body.appendChild(back);
    const close=()=>back.remove();
    back.querySelectorAll('[data-close]').forEach(x=>x.onclick=close);
    back.onclick=e=>{if(e.target===back)close();};
    back.querySelectorAll('[data-client]').forEach(tr=>tr.onclick=()=>{const cid=tr.getAttribute('data-client');close();if(cid)location.hash='#/cliente360?c='+encodeURIComponent(cid)+'&t=recibos';});
  }
  function renewalRows45() {
    const metric=Orbit.modules&&Orbit.modules.polizas&&Orbit.modules.polizas.policyMetrics&&Orbit.modules.polizas.policyMetrics.isRenewalWithin45Days;
    const scoped=q.polizasScoped?q.polizasScoped():(Orbit.store.all('polizas')||[]);
    return typeof metric==='function'
      ? scoped.filter(metric).sort((a,b)=>String(a.vigenciaFin||'').localeCompare(String(b.vigenciaFin||'')))
      : (q.renovacionesProximas?q.renovacionesProximas(45):[]);
  }
  function openRenewalsKpi() {
    const rows=renewalRows45();
    let back=document.getElementById('inicio-renewals-kpi');if(back)back.remove();
    back=document.createElement('div');back.id='inicio-renewals-kpi';back.className='drawer-back open';back.style.cssText='display:grid;place-items:center;z-index:96';back.setAttribute('data-row-count',String(rows.length));
    const body=rows.map(p=>{const cli=Orbit.store.get('clientes',p.clienteId)||{};const d=U.daysFromNow(p.vigenciaFin);const cur=p.moneda||cli.moneda||'';const net=U.finiteNumber(p.primaNeta!=null?p.primaNeta:p.prima);return `<tr class="clickable" data-client="${U.esc(p.clienteId||'')}"><td>${U.esc(cli.nombre||'—')}</td><td>${U.esc(p.numero||'—')}</td><td>${U.esc(p.ramo||p.producto||'—')}</td><td>${net==null?'Sin monto fuente':U.money(net,cur)}</td><td>${U.fmtDate(p.vigenciaFin)}</td><td>${d==null?'—':d+' d'}</td></tr>`;}).join('');
    back.innerHTML=`<div class="card" style="width:min(860px,96vw);max-height:88vh;overflow:auto;padding:0"><div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between"><b>Renovaciones ≤45 d · ${rows.length}</b><button class="imp-x" data-close>✕</button></div><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Cliente</th><th>Póliza</th><th>Ramo</th><th>Prima neta</th><th>Vence</th><th>Faltan</th></tr></thead><tbody>${body||'<tr><td colspan="6" class="muted" style="text-align:center;padding:24px">Sin renovaciones próximas.</td></tr>'}</tbody></table></div></div>`;
    document.body.appendChild(back);const close=()=>back.remove();back.querySelector('[data-close]').onclick=close;back.onclick=e=>{if(e.target===back)close();};back.querySelectorAll('[data-client]').forEach(tr=>tr.onclick=()=>{const cid=tr.getAttribute('data-client');close();if(cid)location.hash='#/cliente360?c='+encodeURIComponent(cid);});
  }

  function render(host) {
    try { if (Orbit.store && typeof Orbit.store._ensureCollections === 'function') Orbit.store._ensureCollections(['clientes','polizas']); } catch (_) {}
    const activeCountry=String(Orbit.pais||'TODOS').toUpperCase();
    const secureRoster=rosterReadiness(host,activeCountry);
    const clientReadiness=dataReadiness(['clientes']), policyReadiness=dataReadiness(['clientes','polizas']), productionReadiness=dataReadiness(['clientes','polizas']), advisorReadiness=secureRoster.status, metaReadiness=secureRoster.status, paymentReadiness=dataReadiness(['clientes','polizas','cobros','recibosEsperados','carteraPrimas']), portfolioReadiness=dataReadiness(['clientes','polizas','carteraPrimas']);
    const mesKey=q.currentMonthKey?q.currentMonthKey():U.monthKey();
    const production=productionReadiness==='ready'&&q.produccionMesPorMoneda?q.produccionMesPorMoneda(mesKey):{};
    const recaudoMes=paymentReadiness==='ready'&&q.recaudoMesPorMoneda?q.recaudoMesPorMoneda(mesKey):{};
    const cart=paymentReadiness==='ready'&&q.carteraGlobalPorMoneda?q.carteraGlobalPorMoneda():{byCurrency:{},currencies:[]};
    const renov=policyReadiness==='ready'?renewalRows45():[], venc=portfolioReadiness==='ready'&&q.carteraVencidaRows?q.carteraVencidaRows():[];
    const board=productionReadiness==='ready'&&advisorReadiness==='ready'
      ?(secureRoster.rows.flatMap(a=>{const totals=q.produccionMesPorMoneda?q.produccionMesPorMoneda(mesKey,a.id):{};return a.paises.filter(c=>c===a.primaryCountry&&(activeCountry==='TODOS'||activeCountry===c)).map(c=>{const currency=c==='GT'?'GTQ':'COP',g=a.metas?.[c],goal=g?.explicit===true?(U.finiteNumber(g.produccion)>0?g.produccion:null):(a.paises.length===1&&U.finiteNumber(a.metaPrima)>0?a.metaPrima:null),actual=U.finiteNumber(totals[currency]);return{asesor:{...a,nombre:a.nombre+(a.paises.length>1?' · '+c:'')},byCurrency:{[currency]:totals[currency]||0},pct:goal==null?null:Math.max(0,Math.min(140,Math.round((actual==null?0:actual)/goal*100))),metaDisponible:goal!=null,pais:c};});}) ):[];
    const clientes=q.clientesScoped?q.clientesScoped():Orbit.store.all('clientes'), polizas=q.polizasScoped?q.polizasScoped():Orbit.store.all('polizas');
    const metasMes=[]; // Inicio metas originate only from the authorized server projection.
    const advisors=secureRoster.rows;
    const mapKeys=map=>Object.keys(map||{}).filter(cur=>Math.abs(Number(map[cur])||0)>0), singleCurrency=map=>{const k=mapKeys(map);return k.length===1?k[0]:'';};
    const activeCurrency=activeCountry==='CO'?'COP':activeCountry==='GT'?'GTQ':''; // TOD0 does not imply one currency.
    const escAttr=value=>U.esc(encodeURIComponent(JSON.stringify(value||{})));
    const moneyMap=map=>{const keys=Object.keys(map||{}).sort((a,b)=>(a==='GTQ'?0:a==='COP'?1:2)-(b==='GTQ'?0:b==='COP'?1:2)||a.localeCompare(b));if(!keys.length)return'Sin movimientos';return keys.map(cur=>'<span style="display:block;white-space:nowrap">'+U.esc(U.moneyShort(map[cur]||0,cur))+' '+U.esc(cur)+'</span>').join('');};
    const financialMoneyMap=map=>{const keys=Object.keys(map||{}).sort((a,b)=>(a==='GTQ'?0:a==='COP'?1:2)-(b==='GTQ'?0:b==='COP'?1:2)||a.localeCompare(b));if(!keys.length)return'Sin movimientos';return keys.map(cur=>{const n=Number(map[cur]||0),shown=Math.abs(n)<100000?U.money(n,cur):U.moneyShort(n,cur);return '<span style="display:block;white-space:nowrap">'+U.esc(shown)+' '+U.esc(cur)+'</span>';}).join('');};
    const metricMap=field=>{const out={};Object.keys(cart.byCurrency||{}).forEach(cur=>{out[cur]=Number(cart.byCurrency[cur]&&cart.byCurrency[cur][field]||0);});return out;};
    const configuredMeta=(tipo,requestedCountry=activeCountry)=>{
 if(metaReadiness!=='ready'||!['GT','CO'].includes(requestedCountry))return null;
 const c=requestedCountry,global=secureRoster.globalMetas?.[c];
 if(global&&((tipo==='prima'&&global.explicitPrima===true)||(tipo==='recaudo'&&global.explicitRecaudo===true))){
  const n=U.finiteNumber(global[tipo]);if(n!=null&&n>0)return n;
 }
 // A partial advisor/team roster cannot establish a tenant-wide goal.
 // Only a server-authorized explicit institutional target has that meaning.
 return null;
 };
 const metaPrima=configuredMeta('prima'),metaRec=configuredMeta('recaudo'),prodValue=activeCurrency?Number(production[activeCurrency]||0):null,recValue=activeCurrency?Number(recaudoMes[activeCurrency]||0):null;
    const pctPrima=metaPrima&&prodValue!=null?Math.max(0,Math.min(140,Math.round(prodValue/metaPrima*100))):null,pctRec=metaRec&&recValue!=null?Math.max(0,Math.min(140,Math.round(recValue/metaRec*100))):null;
    const targetDial=(kind,label,map,pct,meta)=>{const state=activeCountry==='TODOS'?'country-required':!activeCurrency?'currency-required':metaReadiness==='unavailable'?'unavailable':metaReadiness!=='ready'?'loading':meta?'configured':'missing',pctText=pct==null?'—':pct+'%',deg=pct==null?0:Math.max(0,Math.min(100,pct))*3.6,note=(state==='country-required'||state==='currency-required')?'Selecciona GT o CO para comparar con meta':state==='unavailable'?'Meta no disponible para este alcance':state==='loading'?'Actualizando meta':state==='missing'?'Meta no configurada':'Meta '+U.moneyShort(meta,activeCurrency);return '<div data-inicio-monthly="'+kind+'" data-values="'+escAttr(map)+'" data-meta-state="'+state+'" data-meta-value="'+(meta==null?'':meta)+'" data-pct="'+(pct==null?'':pct)+'" style="display:flex;flex-direction:column;align-items:center;gap:8px"><div style="width:118px;height:118px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(var(--red) '+deg+'deg,var(--line) '+deg+'deg)"><div style="width:90px;height:90px;border-radius:50%;background:var(--card);display:grid;place-items:center;text-align:center;box-shadow:inset 0 0 0 1px var(--line)"><div><div style="font-family:var(--f-display);font-weight:800;font-size:24px;color:var(--ink)">'+pctText+'</div><div style="font-size:10px;color:var(--ink-3);font-family:var(--f-mono)">'+moneyMap(map)+'</div></div></div></div><div style="font-size:12px;color:var(--ink-2);font-weight:600">'+label+'</div><div class="muted" style="font-size:10.5px;text-align:center;max-width:150px">'+note+'</div></div>';};
    const splitCountrySummary=(kind,label,map)=>{
      const principal=String(secureRoster.primaryCountry||'').toUpperCase();
      const countries=['GT','CO'].includes(principal)&&(activeCountry==='TODOS'||activeCountry===principal)?[principal]:[];
      if(!countries.length)return '<div data-inicio-primary-country-unresolved="1" style="align-self:center;padding:18px;text-align:center;color:var(--ink-2)">Meta del país principal pendiente de confirmar en Equipo y permisos. No se calcula con otro país.</div>';
      const self=secureRoster.rows.find(r=>r.id&&r.id===secureRoster.ownAdvisorId);
      const cards=countries.map(country=>{
        const cur=country==='GT'?'GTQ':'COP',total=Number(map[cur]||0),global=configuredMeta(kind==='production'?'prima':'recaudo',country),hasGlobal=global!=null&&global>0;
        const a=self&&self.paises.includes(country)?self:null,m=a?.metas?.[country];
        const mine=kind==='production'?(m?.explicit===true?U.finiteNumber(m.produccion):(a?.paises.length===1?U.finiteNumber(a.metaPrima):null)):(m?.explicit===true?U.finiteNumber(m.recaudo):null);
        const hasOwnIdentity=!!a,hasMine=hasOwnIdentity&&mine!=null&&mine>0;
        // Own amounts stay visible even when the individual goal is not configured.
        // Global and personal totals remain two independent read models.
        const personal=!hasGlobal&&hasOwnIdentity;
        const ownTotals=hasOwnIdentity?(kind==='production'?(q.produccionMesPorMoneda?q.produccionMesPorMoneda(mesKey,a.id):{}):(q.recaudoMesPorMoneda?q.recaudoMesPorMoneda(mesKey,a.id):{})):{};
        const ownAmount=Number(ownTotals[cur]||0);
        const val=personal?ownAmount:total,goal=hasGlobal?global:hasMine?mine:null;
        const pct=goal>0?Math.round(val/goal*100):null,deg=pct==null?0:Math.max(0,Math.min(100,pct))*2.7;
        const source=hasGlobal?'global':personal?'personal':metaReadiness==='ready'?'team-pending':'loading';
        const desc=hasGlobal?'Meta institucional: '+U.moneyShort(global,cur):personal?(hasMine?'Mi meta: '+U.moneyShort(mine,cur):'Meta individual sin configurar'):'Meta institucional por confirmar';
        const personalPct=hasMine?Math.round(ownAmount/mine*100):null;
        const ownSummary=hasOwnIdentity
          ?'<div data-inicio-own-contribution="'+kind+'" data-inicio-own-country="'+country+'" data-inicio-own-amount="'+ownAmount+'" data-inicio-own-goal="'+(hasMine?mine:'')+'" data-inicio-own-pct="'+(personalPct==null?'':personalPct)+'" style="width:100%;border-top:1px solid var(--line);padding-top:9px;display:grid;gap:3px;text-align:center">'
            +'<b style="font-size:11px;color:var(--ink)">Mi '+(kind==='production'?'producción':'recaudo confirmado')+': '+U.esc(U.moneyShort(ownAmount,cur))+'</b>'
            +'<small style="font-size:10px;color:var(--ink-2)">'+(hasMine?'Meta individual: '+U.esc(U.moneyShort(mine,cur))+' · '+personalPct+'%':'Meta individual por configurar')+'</small></div>'
          :'';
        const extra=!hasGlobal&&!hasOwnIdentity?'Meta institucional pendiente de configuración':'';
        return '<div data-inicio-country="'+country+'" data-goal-source="'+source+'" style="min-width:145px;flex:1 1 145px;max-width:205px;border:1px solid var(--line);border-top:4px solid var(--red);border-radius:16px;background:var(--card);padding:14px 10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;text-align:center;box-shadow:0 6px 16px rgba(15,23,42,.07)">'
          +'<b style="color:var(--ink);font-size:12px">'+country+' · '+cur+'</b>'
          +'<div style="width:116px;height:116px;padding:12px;box-sizing:border-box;border-radius:50%;--gi-inicio-sweep:'+deg+'deg;background:conic-gradient(from 225deg,var(--red) 0deg,var(--red) '+deg+'deg,#dfe2e7 '+deg+'deg,#dfe2e7 270deg,transparent 270deg 360deg)">'
          +'<div style="height:100%;width:100%;border-radius:50%;background:var(--card);display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--ink)"><strong style="font-size:26px">'+(pct==null?'—':pct+'%')+'</strong><small style="font-size:9px;color:var(--ink-3)">'+(personal?'MI AVANCE':'AVANCE')+'</small></div></div>'
          +'<strong style="font-size:18px;color:var(--ink)">'+U.esc(U.moneyShort(val,cur))+'</strong>'
          +'<small style="min-height:28px;font-size:10.5px;line-height:1.4;color:var(--ink-2)">'+U.esc(desc)+'</small>'
          +(extra?'<small style="font-size:10px;color:var(--ink-3)">'+U.esc(extra)+'</small>':'')+ownSummary+'</div>';
      }).join('');
      return '<div data-inicio-monthly="'+kind+'" data-meta-state="'+(activeCountry==='TODOS'?'country-split':'country-one')+'" style="flex:1 1 350px;min-width:290px;display:flex;flex-direction:column;align-items:center;gap:11px"><b style="font-size:12px;text-align:center;color:var(--ink)">'+U.esc(label)+'</b><div style="display:flex;flex-wrap:wrap;justify-content:center;align-items:stretch;gap:12px;width:100%">'+cards+'</div></div>';
    };
    const confirmedMap=metricMap('alDia'),pendingMap=metricMap('pend'),overdueMap=metricMap('venc');
    const confirmedRows=paymentReadiness==='ready'&&q.cobrosConfirmadosRows?q.cobrosConfirmadosRows():[],pendingRows=portfolioReadiness==='ready'&&q.carteraPendienteRows?q.carteraPendienteRows():[],overdueRows=portfolioReadiness==='ready'&&q.carteraVencidaRows?q.carteraVencidaRows():[];
    // The totals also include strictly proven receipt-backed amounts. The
    // "con monto" count must use exactly that canonical proof, otherwise the
    // dashboard can show COP 8.2M while falsely saying "0 con monto".
    const portfolioCountContext=portfolioReadiness==='ready'?q.portfolioAmountContext():null;
    const valuedCount=rows=>q.portfolioValuedRowsCount(rows,portfolioCountContext);
    const diasMes=new Date(U.now().getFullYear(),U.now().getMonth()+1,0).getDate()-U.now().getDate();
    const readinessCount=(state,readyText,loadingText)=>state==='ready'?readyText:state==='unavailable'?'No disponible':loadingText;
    const advisorBoardHtml=productionReadiness==='unavailable'||advisorReadiness==='unavailable'
      ? '<div class="cfg-note" data-inicio-advisor-readiness="unavailable"><b>Avance por asesor no disponible.</b><div class="muted" style="margin-top:4px">No fue posible confirmar el listado autorizado o la producción. No se inventan asesores ni metas.</div><button class="btn ghost sm" type="button" onclick="Orbit.modules.inicio.retryAdvisorRoster()">Reintentar consulta</button></div>'
      : productionReadiness!=='ready'||advisorReadiness!=='ready'
        ? '<div class="muted" data-inicio-advisor-readiness="pending" style="padding:14px 0">Consultando asesores autorizados y producción…</div>'
        : (board.length?board.map(b=>{const pct=metaReadiness==='ready'&&b.pct!=null?b.pct:null,metaState=metaReadiness!=='ready'?'unavailable':b.metaDisponible?'configured':'missing',amountHtml=moneyMap(b.byCurrency||{});return `<div class="clickable" data-inicio-advisor-id="${U.esc(b.asesor.id||'')}" data-values="${escAttr(b.byCurrency||{})}" data-meta-state="${metaState}" data-pct="${pct==null?'':pct}" onclick="location.hash='#/insights'" style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid var(--line-2);cursor:pointer">${U.avatar(b.asesor.nombre,b.asesor.color,'md')}<div style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between;font-size:13.5px;gap:8px"><b>${U.esc(b.asesor.nombre)}</b><span class="mono" style="text-align:right">${amountHtml}</span></div><div class="bar" style="margin-top:6px"><i style="width:${pct==null?0:Math.min(100,pct)}%"></i></div>${pct==null?'<div class="muted" style="font-size:10.5px;margin-top:3px">'+(metaReadiness==='ready'?'Meta no configurada':'Meta sin acceso de lectura')+'</div>':''}</div><span class="badge ${pct==null?'neutral':pct>=100?'ok':pct>=70?'warn':'neutral'}" style="min-width:46px;justify-content:center">${pct==null?'—':pct+'%'}</span></div>`;}).join(''):'<div class="cfg-note" data-inicio-advisor-readiness="ready-empty">No hay asesores autorizados confirmados para el alcance seleccionado.</div>');

    const currentRole=Orbit.session&&typeof Orbit.session.rol==='function'?String(Orbit.session.rol()||''):'';
    const advisorView=/asesor|comercial/i.test(currentRole);
    const validCountry=activeCountry==='GT'?'Guatemala':activeCountry==='CO'?'Colombia':'Guatemala y Colombia';
    const boardReadiness=advisorReadiness==='ready'?'Datos de metas confirmados por servidor':advisorReadiness==='unavailable'?'Metas pendientes de validación':'Sincronizando metas';
    const contextMessage=leadershipMessages[motivationIndex];
    const analysisRows=[
      {id:'renovaciones',label:'Renovaciones próximas (45 días)',state:policyReadiness,count:renov.length,route:'renovaciones',tone:'renew'},
      {id:'vencido',label:'Obligaciones vencidas',state:portfolioReadiness,count:venc.length,route:'cobros',tone:'overdue'}
    ];
    const analysisMax=Math.max(1,...analysisRows.filter(row=>row.state==='ready').map(row=>row.count));
    const analysisBars=analysisRows.map(item=>{
      const reliable=item.state==='ready',width=reliable?Math.round(100*item.count/analysisMax):0;
      const countText=reliable?String(item.count):item.state==='unavailable'?'No disponible':'Por confirmar';
      return '<button type="button" class="gi-analysis-bar" data-inicio-analysis-bar="'+item.id+'" data-route="'+item.route+
        '" data-readiness="'+item.state+'"><span class="gi-analysis-bar-label">'+U.esc(item.label)+
        '</span><span class="gi-analysis-bar-track" aria-hidden="true"><i class="gi-analysis-bar-fill gi-tone-'+item.tone+
        '" style="width:'+width+'%"></i></span><strong class="gi-analysis-bar-value">'+U.esc(countText)+'</strong></button>';
    }).join('');
    const criticalInsights=[];
    criticalInsights.push(policyReadiness==='ready'
      ?(renov.length?'Hay '+renov.length+' pólizas que vencen dentro de 45 días y requieren priorización.':
        'No se detectaron vencimientos en el universo de pólizas confirmado.')
      :'El universo de vencimientos aún no está confirmado por el servidor.');
    criticalInsights.push(portfolioReadiness==='ready'
      ?(venc.length?'Hay '+venc.length+' obligaciones vencidas visibles; revisa su gestión y aplicación.':
        'No se registran obligaciones vencidas en el alcance visible confirmado.')
      :'La cartera aún no tiene una lectura completa y no se calcula un saldo provisional.');
    const verifiedAdvisorGoals=board.filter(item=>item.metaDisponible).length;
    criticalInsights.push(advisorReadiness==='ready'&&productionReadiness==='ready'&&board.length
      ? verifiedAdvisorGoals+' de '+board.length+' perfiles del alcance tienen meta individual verificable.'
      :'No se certifica el cumplimiento de asesores sin metas y producción confirmadas.');
    const evidenceCount=[clientReadiness,policyReadiness,portfolioReadiness,paymentReadiness,advisorReadiness].filter(v=>v==='ready').length;
    host.innerHTML=`<div class="page" data-inicio-reality-ready="1">
      ${Orbit.kit.banner({icon:'🌅',title:'Inicio',sub:'Visión general y prioridades',features:['Metas verificadas','Cartera y cobros','Seguimientos'],actions:`<button class="btn primary" onclick="location.hash='#/cliente360'">Abrir Cliente 360 →</button>`})}
      <div class="card gi-executive-board" data-inicio-premium="20261011" data-gi-dashboard="insurance-live-v1" style="margin-top:18px;padding:18px 20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:12px;align-items:start;border-top:3px solid var(--red)">
        <section class="gi-leadership-card" aria-label="Liderazgo y protección">
          <div class="gi-month-eyebrow">Metas del mes · ${U.monthLabel()}</div>
          <div class="gi-month-emblem" aria-hidden="true" style="margin:5px auto 8px;width:46px;height:46px;display:grid;place-items:center;border-radius:17px;font-size:28px;background:linear-gradient(145deg,#fff,#cbd2dc);box-shadow:4px 6px 0 rgba(0,0,0,.18),inset 2px 2px 5px rgba(255,255,255,.85);transform:rotate(-6deg);filter:drop-shadow(0 4px 5px rgba(0,0,0,.18))">🛡️</div>
          <h2 class="gi-month-title">Avance real del mes</h2>
          <p class="gi-month-countdown" data-inicio-days-left="${diasMes}">${diasMes===0?'Hoy termina el mes':'Faltan '+diasMes+' días para cerrar el mes'}</p>
          <div class="gi-leadership-body">
            <p data-inicio-context-message="1" role="button" tabindex="0" aria-label="Mostrar otra reflexión sobre liderazgo y seguros" class="gi-motivation-quote">${U.esc(contextMessage)}</p>
            <button class="gi-motivation-next" type="button" data-inicio-next-quote aria-label="Otra reflexión">↻</button>
          </div>
          <div class="gi-dashboard-source"><span class="gi-source-dot"></span>${U.esc(boardReadiness)}</div>
          <div class="gi-month-chips">
            <span class="badge neutral" data-inicio-count="clientes" data-readiness="${clientReadiness}">${readinessCount(clientReadiness,clientes.length+' clientes','Confirmando clientes')}</span>
            <span class="badge neutral" data-inicio-count="polizas" data-readiness="${policyReadiness}">${readinessCount(policyReadiness,polizas.length+' pólizas','Confirmando pólizas')}</span>
            <span class="badge ${portfolioReadiness==='ready'?'danger':'neutral'}" data-inicio-count="cartera-vencida" data-readiness="${portfolioReadiness}">${readinessCount(portfolioReadiness,venc.length+' vencidos','Validando cartera')}</span>
          </div>
        </section>
        ${productionReadiness==='ready'?splitCountrySummary('production','Producción neta del mes',production):pendingDial('Producción neta del mes',productionReadiness)}
        ${paymentReadiness==='ready'?splitCountrySummary('recaudo','Recaudo confirmado del mes',recaudoMes):pendingDial('Recaudo confirmado del mes',paymentReadiness)}
      </div>
      <div class="kpi-row" style="margin-top:18px">
        <button class="kpi kpi-click" data-inicio-metric="cobros-confirmados" data-readiness="${paymentReadiness}" data-values="${escAttr(confirmedMap)}" onclick="Orbit.modules.inicio.openFinancialKpi('confirmed')" title="Ver cobros confirmados"><div class="k-accent" style="background:${paymentReadiness==='ready'?'var(--red)':'var(--line)'}"></div><div class="k-label">Cobros confirmados</div><div class="k-val">${paymentReadiness==='ready'?financialMoneyMap(confirmedMap):(paymentReadiness==='unavailable'?'No disponible':'Actualizando datos')}</div><div class="k-foot ${paymentReadiness==='ready'?'up':'muted'}">${paymentReadiness==='ready'?confirmedRows.length+' pagos confirmados ›':'Esperando confirmación del servidor'}</div></button>
        <button class="kpi kpi-click" data-inicio-metric="cartera-pendiente" data-readiness="${portfolioReadiness}" data-values="${escAttr(pendingMap)}" onclick="Orbit.modules.inicio.openFinancialKpi('pending')" title="Ver pendiente de cobro"><div class="k-accent" style="background:${portfolioReadiness==='ready'?'var(--warn)':'var(--line)'}"></div><div class="k-label">Pendiente de cobro</div><div class="k-val">${portfolioReadiness==='ready'?financialMoneyMap(pendingMap):(portfolioReadiness==='unavailable'?'No disponible':'Actualizando datos')}</div><div class="k-foot muted">${portfolioReadiness==='ready'?pendingRows.length+' obligaciones · '+valuedCount(pendingRows)+' con monto ›':'Esperando confirmación del servidor'}</div></button>
        <button class="kpi kpi-click" data-inicio-metric="cartera-vencida" data-readiness="${portfolioReadiness}" data-values="${escAttr(overdueMap)}" onclick="Orbit.modules.inicio.openFinancialKpi('overdue')" title="Ver cartera vencida"><div class="k-accent" style="background:${portfolioReadiness==='ready'?'var(--danger)':'var(--line)'}"></div><div class="k-label">Cartera vencida</div><div class="k-val">${portfolioReadiness==='ready'?financialMoneyMap(overdueMap):(portfolioReadiness==='unavailable'?'No disponible':'Actualizando datos')}</div><div class="k-foot ${portfolioReadiness==='ready'?'down':'muted'}">${portfolioReadiness==='ready'?overdueRows.length+' obligaciones · '+valuedCount(overdueRows)+' con monto ›':'Esperando confirmación del servidor'}</div></button>
        <button class="kpi kpi-click" data-inicio-renew45="${policyReadiness==='ready'?renov.length:''}" data-renewal-owner="polizas.policyMetrics.isRenewalWithin45Days" onclick="Orbit.modules.inicio.openRenewalsKpi()" title="Ver pólizas con vencimiento en 0–45 días"><div class="k-accent" style="background:var(--info)"></div><div class="k-label">Vencen ≤45 d</div><div class="k-val">${policyReadiness==='ready'?renov.length:policyReadiness==='unavailable'?'No disponible':'Por confirmar'}</div><div class="k-foot muted">${policyReadiness==='ready'?'mismo universo de Pólizas ›':'Esperando confirmación del servidor'}</div></button>
      </div>
      <section class="gi-insurance-analysis" data-inicio-critical-analysis="1" aria-label="Indicadores de análisis operativo">
        <div class="gi-analysis-surface">
          <header><span class="gi-analysis-symbol">▤</span><div><b>Panorama de prioridades</b><small>Volumen de casos · cifras de lectura autorizada</small></div></header>
          <div class="gi-analysis-bars">${analysisBars}</div>
          <div class="gi-analysis-hint">Cada barra abre los registros de su módulo.</div>
        </div>
        <div class="gi-analysis-surface">
          <header><span class="gi-analysis-symbol">◉</span><div><b>Lectura crítica del mes</b><small>Interpretación sin proyecciones ni datos inventados</small></div></header>
          <ul class="gi-analysis-insights">${criticalInsights.map(item=>'<li>'+U.esc(item)+'</li>').join('')}</ul>
          <p class="gi-analysis-proof" data-inicio-evidence-confirmed="${evidenceCount}" data-inicio-evidence-total="5">${evidenceCount} de 5 fuentes confirmadas · ${activeCountry==='TODOS'?'GTQ y COP sin conversión':'País '+U.esc(activeCountry)}</p>
        </div>
      </section>
      <div class="inicio-main-grid" style="display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:18px;margin-top:18px">
        <div class="card pad"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px"><b style="font-family:var(--f-display);font-size:16px">Avance por asesor</b><span class="muted" style="font-size:12px">producción neta del mes vs meta configurada</span></div>
          ${advisorBoardHtml}
        </div>
        <div class="card pad"><b style="font-family:var(--f-display);font-size:16px">Prioridades</b><div style="margin-top:12px;display:grid;gap:9px">${renov.slice(0,4).map(p=>{const cli=Orbit.store.get('clientes',p.clienteId),d=U.daysFromNow(p.vigenciaFin);return `<div class="clickable" onclick="location.hash='#/cliente360?c=${p.clienteId}'" style="display:flex;align-items:center;gap:10px;padding:9px 11px;background:var(--warn-soft);border-radius:var(--r-sm);cursor:pointer"><span style="font-size:16px">🔄</span><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600">${U.esc(cli?cli.nombre:'—')}</div><div class="muted" style="font-size:11.5px">${U.esc(p.ramo)} · renueva en ${d} d</div></div></div>`;}).join('')}${venc.slice(0,3).map(c=>{const cli=Orbit.store.get('clientes',c.clienteId);return `<div class="clickable" onclick="location.hash='#/cliente360?c=${c.clienteId}'" style="display:flex;align-items:center;gap:10px;padding:9px 11px;background:var(--danger-soft);border-radius:var(--r-sm);cursor:pointer"><span style="font-size:16px">⚠</span><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600">${U.esc(cli?cli.nombre:'—')}</div><div class="muted" style="font-size:11.5px">cuota ${U.esc(U.text(c.cuota))} vencida · ${U.money(c.monto,c.moneda)}</div></div></div>`;}).join('')}</div></div>
      </div>
      ${seguimientosHoy()}
    </div>`;
    stageMonthlyFinancialRead();
    if(typeof host.querySelectorAll==='function')host.querySelectorAll('[data-inicio-analysis-bar]').forEach(button=>button.addEventListener('click',()=>{const route=button.getAttribute('data-route');if(route==='renovaciones'||route==='cobros')location.hash='#/'+route;}));
    if(motivationTimer!==null){clearInterval(motivationTimer);motivationTimer=null;}
    const message=typeof host.querySelector==='function'?host.querySelector('[data-inicio-context-message]'):null;
    const quoteButton=typeof host.querySelector==='function'?host.querySelector('[data-inicio-next-quote]'):null;
    if(message){
      const advance=()=>{if(!host.isConnected)return;motivationIndex=(motivationIndex+1)%leadershipMessages.length;message.textContent=leadershipMessages[motivationIndex];};
      message.addEventListener('click',advance);
      message.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();advance();}});
      if(quoteButton)quoteButton.addEventListener('click',advance);
      if(typeof window!=='undefined'&&typeof window.setInterval==='function'&&
        !(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches))
        motivationTimer=window.setInterval(()=>{if(!host.isConnected||Orbit.route?.key!=='inicio'){clearInterval(motivationTimer);motivationTimer=null;return;}if(!document.hidden)advance();},12000);
    }
  }

  /* Seguimientos pendientes (sin automatizar) → gestionar por WhatsApp Web / correo */
  function seguimientosHoy() {
    if (!Orbit.ciclo) return '';
    const negs = Orbit.ciclo.negocios({ ignoreRol: true })
      .filter(n => ['nuevo', 'contactado', 'cotizando', 'propuesta', 'negociacion'].includes(n.etapa) && !n.cadenciaActiva && U.daysFromNow(n.proximoToque) <= 1)
      .sort((a, b) => (a.proximoToque || '').localeCompare(b.proximoToque || '')).slice(0, 6);
    if (!negs.length) return '';
    return `<div class="card pad" style="margin-top:18px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <b style="font-family:var(--f-display);font-size:16px">Seguimientos de hoy</b>
        <span class="muted" style="font-size:12px">sin cadencia automática · gestiona por WhatsApp</span>
      </div>
      <div style="margin-top:12px;display:grid;gap:9px">
        ${negs.map(n => {
          const ase = q.asesor(n.asesorId);
          const wa = (n.telefono || '').replace(/[^0-9]/g, '');
          const msg = encodeURIComponent('Hola ' + (n.nombre || '').split(' ')[0] + ', te damos seguimiento a tu ' + n.producto + '.');
          const d = U.daysFromNow(n.proximoToque);
          return `<div style="display:flex;align-items:center;gap:11px;padding:10px 12px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-sm)">
            <span style="font-size:16px">${Orbit.ciclo.etapaInfo(n.etapa).emoji}</span>
            <div style="flex:1;min-width:0" class="clickable" onclick="Orbit.ciclo.openNegocio('${n.id}')">
              <div style="font-size:13.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${U.esc(n.nombre)} <span class="muted" style="font-weight:400">· ${U.esc(n.producto)}</span></div>
              <div class="muted" style="font-size:11.5px">${ase ? U.esc(ase.nombre) : ''} · ${d < 0 ? 'vencido' : d === 0 ? 'hoy' : 'mañana'} · ${Orbit.ciclo.etapaInfo(n.etapa).label}</div>
            </div>
            ${wa ? `<a class="btn ghost sm" style="color:#1f8a4c" href="${'https://wa.' + 'me/'}${wa}?text=${msg}" target="_blank" rel="noopener">💬 WhatsApp</a>` : (n.email ? `<a class="btn ghost sm" style="cursor:pointer" onclick="Orbit.correoCompose({para:'${n.email}'})">✉ Correo</a>` : '')}
          </div>`;
        }).join('')}
      </div>
      <div class="muted" style="font-size:11.5px;margin-top:10px">Al activar la cadencia automática (al enviar propuesta) los toques se programan solos; aquí solo aparecen los que requieren tu gestión manual.</div>
    </div>`;
  }

  return { render, openFinancialKpi, openRenewalsKpi, retryAdvisorRoster };
})();
