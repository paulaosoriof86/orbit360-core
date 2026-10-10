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
  const rosterRequested = new Set(), rosterFailures = new Set();
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
    if((api.dashboardStatus?.().entries||[]).some(x=>x.key===cacheKey&&x.at))return{status:'ready',rows:api.dashboardPeek(country,month)};
    if(rosterFailures.has(key))return{status:'unavailable',rows:[]};
    if(!Orbit.auth?.productUser?.uid)return{status:'pending',rows:[]};
    if(!rosterRequested.has(key)){rosterRequested.add(key);api.dashboardList(country,month).then(()=>{rosterRequested.delete(key);if(host?.isConnected&&Orbit.route?.key==='inicio'&&rosterKey(country)+'|'+month===key)render(host);}).catch(()=>{rosterRequested.delete(key);rosterFailures.add(key);if(host?.isConnected&&Orbit.route?.key==='inicio'&&rosterKey(country)+'|'+month===key)render(host);});}
    return{status:'pending',rows:[]};
  }
  function retryAdvisorRoster(){
    const country=String(Orbit.pais||'TODOS').toUpperCase(),key=rosterKey(country)+'|'+(q.currentMonthKey?q.currentMonthKey():U.monthKey());
    rosterFailures.delete(key);rosterRequested.delete(key);
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
    if(names.some(name=>denied.includes(name))) return 'unavailable';
    if(names.every(name=>confirmed.includes(name))) return 'ready';
    if(options.optionalTerminal===true && ps.ready===true) {
      const unresolved=names.filter(name=>!confirmed.includes(name));
      if(unresolved.length && unresolved.every(name=>optional.includes(name)||failed.includes(name))) return 'unavailable';
    }
    return 'pending';
  }
  function pendingDial(label, readiness) {
    const txt=readiness==='unavailable'?'No disponible':'Actualizando datos';
    return `<div data-inicio-dial="${label}" data-readiness="${readiness}" style="width:118px;min-height:118px;display:grid;place-items:center;text-align:center;border:1px solid var(--line);border-radius:50%;color:var(--ink-3);font-size:12px;font-weight:600">${txt}</div>`;
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
    try { if (Orbit.store && typeof Orbit.store._ensureCollections === 'function') Orbit.store._ensureCollections(['clientes','polizas','cobros','recibosEsperados','carteraPrimas']); } catch (_) {}
    const activeCountry=String(Orbit.pais||'TODOS').toUpperCase();
    const secureRoster=rosterReadiness(host,activeCountry);
    const clientReadiness=dataReadiness(['clientes']), policyReadiness=dataReadiness(['clientes','polizas']), productionReadiness=dataReadiness(['clientes','polizas']), advisorReadiness=secureRoster.status, metaReadiness=secureRoster.status, paymentReadiness=dataReadiness(['clientes','polizas','cobros','recibosEsperados','carteraPrimas']), portfolioReadiness=dataReadiness(['clientes','polizas','carteraPrimas']);
    const mesKey=q.currentMonthKey?q.currentMonthKey():U.monthKey();
    const production=productionReadiness==='ready'&&q.produccionMesPorMoneda?q.produccionMesPorMoneda(mesKey):{};
    const recaudoMes=paymentReadiness==='ready'&&q.recaudoMesPorMoneda?q.recaudoMesPorMoneda(mesKey):{};
    const cart=paymentReadiness==='ready'&&q.carteraGlobalPorMoneda?q.carteraGlobalPorMoneda():{byCurrency:{},currencies:[]};
    const renov=policyReadiness==='ready'?renewalRows45():[], venc=portfolioReadiness==='ready'&&q.carteraVencidaRows?q.carteraVencidaRows():[];
    const board=productionReadiness==='ready'&&advisorReadiness==='ready'
      ?(secureRoster.rows.flatMap(a=>{const totals=q.produccionMesPorMoneda?q.produccionMesPorMoneda(mesKey,a.id):{};return a.paises.map(c=>{const currency=c==='GT'?'GTQ':'COP',g=a.metas?.[c],goal=g?.explicit===true?(U.finiteNumber(g.produccion)>0?g.produccion:null):(a.paises.length===1&&U.finiteNumber(a.metaPrima)>0?a.metaPrima:null),actual=U.finiteNumber(totals[currency]);return{asesor:{...a,nombre:a.nombre+(a.paises.length>1?' · '+c:'')},byCurrency:{[currency]:totals[currency]||0},pct:goal==null?null:Math.max(0,Math.min(140,Math.round((actual==null?0:actual)/goal*100))),metaDisponible:goal!=null,pais:c};});}) ):[];
    const clientes=q.clientesScoped?q.clientesScoped():Orbit.store.all('clientes'), polizas=q.polizasScoped?q.polizasScoped():Orbit.store.all('polizas');
    const metasMes=[]; // Inicio metas originate only from the authorized server projection.
    const advisors=secureRoster.rows;
    const mapKeys=map=>Object.keys(map||{}).filter(cur=>Math.abs(Number(map[cur])||0)>0), singleCurrency=map=>{const k=mapKeys(map);return k.length===1?k[0]:'';};
    const activeCurrency=activeCountry==='CO'?'COP':activeCountry==='GT'?'GTQ':(singleCurrency(production)||singleCurrency(recaudoMes));
    const escAttr=value=>U.esc(encodeURIComponent(JSON.stringify(value||{})));
    const moneyMap=map=>{const keys=Object.keys(map||{}).sort((a,b)=>(a==='GTQ'?0:a==='COP'?1:2)-(b==='GTQ'?0:b==='COP'?1:2)||a.localeCompare(b));if(!keys.length)return'Sin movimientos';return keys.map(cur=>'<span style="display:block;white-space:nowrap">'+U.esc(U.moneyShort(map[cur]||0,cur))+' '+U.esc(cur)+'</span>').join('');};
    const financialMoneyMap=map=>{const keys=Object.keys(map||{}).sort((a,b)=>(a==='GTQ'?0:a==='COP'?1:2)-(b==='GTQ'?0:b==='COP'?1:2)||a.localeCompare(b));if(!keys.length)return'Sin movimientos';return keys.map(cur=>{const n=Number(map[cur]||0),shown=Math.abs(n)<100000?U.money(n,cur):U.moneyShort(n,cur);return '<span style="display:block;white-space:nowrap">'+U.esc(shown)+' '+U.esc(cur)+'</span>';}).join('');};
    const metricMap=field=>{const out={};Object.keys(cart.byCurrency||{}).forEach(cur=>{out[cur]=Number(cart.byCurrency[cur]&&cart.byCurrency[cur][field]||0);});return out;};
    const configuredMeta=tipo=>{
      if(metaReadiness!=='ready'||!activeCurrency||activeCountry==='TODOS')return null;
      const c=activeCurrency==='GTQ'?'GT':activeCurrency==='COP'?'CO':'';
      const values=secureRoster.rows.filter(a=>a.paises.includes(c)).map(a=>{
        const t=a.metas?.[c];
        if(tipo==='recaudo')return t?.explicit===true?U.finiteNumber(t.recaudo):null;
        return t?.explicit===true?(t.produccion>0?t.produccion:null):(a.paises.length===1?U.finiteNumber(a.metaPrima):null);
      });
      return values.length&&values.every(v=>v!=null&&v>0)?values.reduce((sum,v)=>sum+v,0):null;
    };
    const metaPrima=configuredMeta('prima'),metaRec=configuredMeta('recaudo'),prodValue=activeCurrency?Number(production[activeCurrency]||0):null,recValue=activeCurrency?Number(recaudoMes[activeCurrency]||0):null;
    const pctPrima=metaPrima&&prodValue!=null?Math.max(0,Math.min(140,Math.round(prodValue/metaPrima*100))):null,pctRec=metaRec&&recValue!=null?Math.max(0,Math.min(140,Math.round(recValue/metaRec*100))):null;
    const targetDial=(kind,label,map,pct,meta)=>{const state=!activeCurrency?'currency-required':metaReadiness==='unavailable'?'unavailable':metaReadiness!=='ready'?'loading':meta?'configured':'missing',pctText=pct==null?'—':pct+'%',deg=pct==null?0:Math.max(0,Math.min(100,pct))*3.6,note=state==='currency-required'?'Selecciona un país para comparar con meta':state==='unavailable'?'Meta no disponible para este alcance':state==='loading'?'Actualizando meta':state==='missing'?'Meta no configurada':'Meta '+U.moneyShort(meta,activeCurrency);return '<div data-inicio-monthly="'+kind+'" data-values="'+escAttr(map)+'" data-meta-state="'+state+'" data-meta-value="'+(meta==null?'':meta)+'" data-pct="'+(pct==null?'':pct)+'" style="display:flex;flex-direction:column;align-items:center;gap:8px"><div style="width:118px;height:118px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(var(--red) '+deg+'deg,var(--line) '+deg+'deg)"><div style="width:90px;height:90px;border-radius:50%;background:var(--card);display:grid;place-items:center;text-align:center;box-shadow:inset 0 0 0 1px var(--line)"><div><div style="font-family:var(--f-display);font-weight:800;font-size:24px;color:var(--ink)">'+pctText+'</div><div style="font-size:10px;color:var(--ink-3);font-family:var(--f-mono)">'+moneyMap(map)+'</div></div></div></div><div style="font-size:12px;color:var(--ink-2);font-weight:600">'+label+'</div><div class="muted" style="font-size:10.5px;text-align:center;max-width:150px">'+note+'</div></div>';};
    const confirmedMap=metricMap('alDia'),pendingMap=metricMap('pend'),overdueMap=metricMap('venc');
    const confirmedRows=paymentReadiness==='ready'&&q.cobrosConfirmadosRows?q.cobrosConfirmadosRows():[],pendingRows=portfolioReadiness==='ready'&&q.carteraPendienteRows?q.carteraPendienteRows():[],overdueRows=portfolioReadiness==='ready'&&q.carteraVencidaRows?q.carteraVencidaRows():[];
    const valuedCount=rows=>rows.filter(r=>U.finiteNumber(r&&r.monto)!=null||U.finiteNumber(r&&r.saldo)!=null).length;
    const diasMes=new Date(U.now().getFullYear(),U.now().getMonth()+1,0).getDate()-U.now().getDate();
    const readinessCount=(state,readyText,loadingText)=>state==='ready'?readyText:state==='unavailable'?'No disponible':loadingText;
    const advisorBoardHtml=productionReadiness==='unavailable'||advisorReadiness==='unavailable'
      ? '<div class="cfg-note" data-inicio-advisor-readiness="unavailable"><b>Avance por asesor no disponible.</b><div class="muted" style="margin-top:4px">No fue posible confirmar el listado autorizado o la producción. No se inventan asesores ni metas.</div><button class="btn ghost sm" type="button" onclick="Orbit.modules.inicio.retryAdvisorRoster()">Reintentar consulta</button></div>'
      : productionReadiness!=='ready'||advisorReadiness!=='ready'
        ? '<div class="muted" data-inicio-advisor-readiness="pending" style="padding:14px 0">Consultando asesores autorizados y producción…</div>'
        : (board.length?board.map(b=>{const pct=metaReadiness==='ready'&&b.pct!=null?b.pct:null,metaState=metaReadiness!=='ready'?'unavailable':b.metaDisponible?'configured':'missing',amountHtml=moneyMap(b.byCurrency||{});return `<div class="clickable" data-inicio-advisor-id="${U.esc(b.asesor.id||'')}" data-values="${escAttr(b.byCurrency||{})}" data-meta-state="${metaState}" data-pct="${pct==null?'':pct}" onclick="location.hash='#/insights'" style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid var(--line-2);cursor:pointer">${U.avatar(b.asesor.nombre,b.asesor.color,'md')}<div style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between;font-size:13.5px;gap:8px"><b>${U.esc(b.asesor.nombre)}</b><span class="mono" style="text-align:right">${amountHtml}</span></div><div class="bar" style="margin-top:6px"><i style="width:${pct==null?0:Math.min(100,pct)}%"></i></div>${pct==null?'<div class="muted" style="font-size:10.5px;margin-top:3px">'+(metaReadiness==='ready'?'Meta no configurada':'Meta sin acceso de lectura')+'</div>':''}</div><span class="badge ${pct==null?'neutral':pct>=100?'ok':pct>=70?'warn':'neutral'}" style="min-width:46px;justify-content:center">${pct==null?'—':pct+'%'}</span></div>`;}).join(''):'<div class="cfg-note" data-inicio-advisor-readiness="ready-empty">No hay asesores autorizados confirmados para el alcance seleccionado.</div>');

    host.innerHTML=`<div class="page" data-inicio-reality-ready="1">
      ${Orbit.kit.banner({icon:'🌅',title:'Buen día',sub:'esto es lo importante hoy',features:['Metas del mes','Prioridades','Avance por asesor'],actions:`<button class="btn primary" onclick="location.hash='#/cliente360'">Abrir Cliente 360 →</button>`})}
      <div class="card" style="margin-top:18px;padding:22px 24px;display:flex;gap:30px;align-items:center;flex-wrap:wrap;border-top:3px solid var(--red)">
        <div style="flex:1;min-width:200px"><div style="font-family:var(--f-mono);font-size:11px;letter-spacing:.18em;color:var(--ink-3);text-transform:uppercase">Metas del mes · ${U.monthLabel()}</div><div style="font-family:var(--f-display);font-weight:800;font-size:22px;margin-top:6px;color:var(--ink)">Avance real del mes</div><div style="color:var(--ink-2);font-size:13.5px;margin-top:6px;line-height:1.5">Quedan <b style="color:var(--ink)">${diasMes} días</b> para cerrar el mes. La producción usa la prima neta de pólizas con inicio de vigencia en el mes y el recaudo usa pagos confirmados con fecha efectiva del mes. Si no existe meta configurada, no se inventa un porcentaje.</div><div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap"><span class="badge neutral" data-inicio-count="clientes" data-readiness="${clientReadiness}">${readinessCount(clientReadiness,clientes.length+' clientes','Actualizando clientes')}</span><span class="badge neutral" data-inicio-count="polizas" data-readiness="${policyReadiness}">${readinessCount(policyReadiness,polizas.length+' pólizas','Actualizando pólizas')}</span><span class="badge ${portfolioReadiness==='ready'?'danger':'neutral'}" data-inicio-count="cartera-vencida" data-readiness="${portfolioReadiness}">${readinessCount(portfolioReadiness,venc.length+' registros vencidos en cartera','Actualizando cartera')}</span></div></div>
        ${productionReadiness==='ready'?targetDial('production','Producción neta del mes',production,pctPrima,metaPrima):pendingDial('Producción neta del mes',productionReadiness)}
        ${paymentReadiness==='ready'?targetDial('recaudo','Recaudo confirmado del mes',recaudoMes,pctRec,metaRec):pendingDial('Recaudo confirmado del mes',paymentReadiness)}
      </div>
      <div class="kpi-row" style="margin-top:18px">
        <button class="kpi kpi-click" data-inicio-metric="cobros-confirmados" data-readiness="${paymentReadiness}" data-values="${escAttr(confirmedMap)}" onclick="Orbit.modules.inicio.openFinancialKpi('confirmed')" title="Ver cobros confirmados"><div class="k-accent" style="background:${paymentReadiness==='ready'?'var(--red)':'var(--line)'}"></div><div class="k-label">Cobros confirmados</div><div class="k-val">${paymentReadiness==='ready'?financialMoneyMap(confirmedMap):(paymentReadiness==='unavailable'?'No disponible':'Actualizando datos')}</div><div class="k-foot ${paymentReadiness==='ready'?'up':'muted'}">${paymentReadiness==='ready'?confirmedRows.length+' pagos confirmados ›':'Esperando confirmación del servidor'}</div></button>
        <button class="kpi kpi-click" data-inicio-metric="cartera-pendiente" data-readiness="${portfolioReadiness}" data-values="${escAttr(pendingMap)}" onclick="Orbit.modules.inicio.openFinancialKpi('pending')" title="Ver pendiente de cobro"><div class="k-accent" style="background:${portfolioReadiness==='ready'?'var(--warn)':'var(--line)'}"></div><div class="k-label">Pendiente de cobro</div><div class="k-val">${portfolioReadiness==='ready'?financialMoneyMap(pendingMap):(portfolioReadiness==='unavailable'?'No disponible':'Actualizando datos')}</div><div class="k-foot muted">${portfolioReadiness==='ready'?pendingRows.length+' obligaciones · '+valuedCount(pendingRows)+' con monto ›':'Esperando confirmación del servidor'}</div></button>
        <button class="kpi kpi-click" data-inicio-metric="cartera-vencida" data-readiness="${portfolioReadiness}" data-values="${escAttr(overdueMap)}" onclick="Orbit.modules.inicio.openFinancialKpi('overdue')" title="Ver cartera vencida"><div class="k-accent" style="background:${portfolioReadiness==='ready'?'var(--danger)':'var(--line)'}"></div><div class="k-label">Cartera vencida</div><div class="k-val">${portfolioReadiness==='ready'?financialMoneyMap(overdueMap):(portfolioReadiness==='unavailable'?'No disponible':'Actualizando datos')}</div><div class="k-foot ${portfolioReadiness==='ready'?'down':'muted'}">${portfolioReadiness==='ready'?overdueRows.length+' obligaciones · '+valuedCount(overdueRows)+' con monto ›':'Esperando confirmación del servidor'}</div></button>
        <button class="kpi kpi-click" data-inicio-renew45="${renov.length}" data-renewal-owner="polizas.policyMetrics.isRenewalWithin45Days" onclick="Orbit.modules.inicio.openRenewalsKpi()" title="Ver pólizas con vencimiento en 0–45 días"><div class="k-accent" style="background:var(--info)"></div><div class="k-label">Vencen ≤45 d</div><div class="k-val">${renov.length}</div><div class="k-foot muted">mismo universo de Pólizas ›</div></button>
      </div>
      <div class="inicio-main-grid" style="display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:18px;margin-top:18px">
        <div class="card pad"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px"><b style="font-family:var(--f-display);font-size:16px">Avance por asesor</b><span class="muted" style="font-size:12px">producción neta del mes vs meta configurada</span></div>
          ${advisorBoardHtml}
        </div>
        <div class="card pad"><b style="font-family:var(--f-display);font-size:16px">Prioridades</b><div style="margin-top:12px;display:grid;gap:9px">${renov.slice(0,4).map(p=>{const cli=Orbit.store.get('clientes',p.clienteId),d=U.daysFromNow(p.vigenciaFin);return `<div class="clickable" onclick="location.hash='#/cliente360?c=${p.clienteId}'" style="display:flex;align-items:center;gap:10px;padding:9px 11px;background:var(--warn-soft);border-radius:var(--r-sm);cursor:pointer"><span style="font-size:16px">🔄</span><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600">${U.esc(cli?cli.nombre:'—')}</div><div class="muted" style="font-size:11.5px">${U.esc(p.ramo)} · renueva en ${d} d</div></div></div>`;}).join('')}${venc.slice(0,3).map(c=>{const cli=Orbit.store.get('clientes',c.clienteId);return `<div class="clickable" onclick="location.hash='#/cliente360?c=${c.clienteId}'" style="display:flex;align-items:center;gap:10px;padding:9px 11px;background:var(--danger-soft);border-radius:var(--r-sm);cursor:pointer"><span style="font-size:16px">⚠</span><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600">${U.esc(cli?cli.nombre:'—')}</div><div class="muted" style="font-size:11.5px">cuota ${U.esc(U.text(c.cuota))} vencida · ${U.money(c.monto,c.moneda)}</div></div></div>`;}).join('')}</div></div>
      </div>
      ${seguimientosHoy()}
    </div>`;
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
