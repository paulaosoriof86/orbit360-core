/* ============================================================
   Orbit 360 · Tablero P0 importadores/conciliacion
   Fecha: 2026-07-09

   Vista operativa minima para monitorear capas P0 sin escribir datos.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.importarP0Dashboard = (function () {
  const LAYERS = [
    { id: 'polizas', title: 'Polizas importadas', coll: 'polizas', warn: r => r.requiereValidacion || /validacion/i.test(String(r.estadoOperativoOrbit || r.estado || '')) },
    { id: 'recibosEsperados', title: 'Recibos esperados', coll: 'recibosEsperados', warn: r => r.requiereValidacion || r.estadoConciliacion === 'requiere_validacion' },
    { id: 'recibosAseguradora', title: 'Recibos aseguradora', coll: 'recibosAseguradora', warn: r => r.requiereValidacion || r.estadoConciliacion === 'requiere_validacion' },
    { id: 'carteraPrimas', title: 'Cartera primas', coll: 'carteraPrimas', warn: r => r.requiereValidacion || r.estadoConciliacion === 'requiere_validacion' },
    { id: 'conciliacionesPrimas', title: 'Conciliaciones primas', coll: 'conciliacionesPrimas', warn: r => r.requiereValidacion || r.estado === 'requiere_validacion' },
    { id: 'comisionesDevengadas', title: 'Comisiones devengadas', coll: 'comisionesDevengadas', warn: r => r.requiereValidacion || r.estadoComision === 'requiere_validacion' },
    { id: 'facturasComisiones', title: 'Facturas comision', coll: 'facturasComisiones', warn: r => r.requiereValidacion || r.estadoFactura === 'requiere_validacion' },
    { id: 'cxcComisiones', title: 'CxC comisiones', coll: 'cxcComisiones', warn: r => r.requiereValidacion || /validacion/i.test(String(r.estado || '')) },
    { id: 'movimientosBanco', title: 'Movimientos banco', coll: 'movimientosBanco', warn: r => r.requiereValidacion || r.estado === 'requiere_validacion' },
    { id: 'conciliacionBancaria', title: 'Conciliacion bancaria', coll: 'conciliacionBancaria', warn: r => r.requiereValidacion || r.estado === 'requiere_validacion' },
    { id: 'cxpAsesores', title: 'CxP asesores', coll: 'cxpAsesores', warn: r => r.requiereValidacion || /validacion/i.test(String(r.estado || '')) }
  ];

  function esc(s) {
    if (Orbit.ui && Orbit.ui.esc) return Orbit.ui.esc(s);
    return String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  const observedHosts=new WeakSet();
  function sourceReadiness(layer) {
    const store=Orbit.store;
    if(!store||store.__productReadOnlyP0!==true||typeof store._productStatus!=='function')return 'ready';
    const ps=store._productStatus()||{};
    const supported=[].concat(ps.requiredCollections||[],ps.optionalCollections||[]);
    if(supported.length&&!supported.includes(layer.coll))return 'unavailable';
    if([].concat(ps.deniedCollections||[]).includes(layer.coll)||(ps.snapshotErrors||{})[layer.coll])return 'unavailable';
    return [].concat(ps.serverConfirmedCollections||[]).includes(layer.coll)?'ready':'pending';
  }
  function rows(coll) {
    try { return Orbit.store && Orbit.store.all ? Orbit.store.all(coll) || [] : []; }
    catch (e) { return []; }
  }

  function money(n, cur) {
    if (Orbit.ui && Orbit.ui.money) return Orbit.ui.money(Number(n || 0), cur || '');
    return (cur ? cur + ' ' : '') + Number(n || 0).toLocaleString('es-GT', { maximumFractionDigits: 2 });
  }

  function amountOf(r) {
    return Number(r.monto || r.montoTotal || r.montoComision || r.montoAsesor || r.primaTotal || r.primaNeta || 0) || 0;
  }

  function layerStats(layer) {
    const readiness=sourceReadiness(layer);
    if(readiness!=='ready')return {readiness,totalRows:null,warn:null,pending:null,amount:null,currency:'',byCurrency:{}};
    const rs=rows(layer.coll);
    const warn=rs.filter(layer.warn || (()=>false)).length;
    const pending=rs.filter(r=>/pendiente|probable|esperado|validacion/i.test(String(r.estado||r.estadoCartera||r.estadoConciliacion||r.estadoFactura||r.estadoComision||''))).length;
    const byCurrency={};rs.forEach(r=>{const cur=String(r.moneda||'SIN_MONEDA').toUpperCase();byCurrency[cur]=(byCurrency[cur]||0)+amountOf(r);});
    const cur=Object.keys(byCurrency).length===1?Object.keys(byCurrency)[0]:'';
    return {readiness,totalRows:rs.length,warn,pending,amount:cur?byCurrency[cur]:null,currency:cur,byCurrency};
  }

  function card(layer) {
    const s = layerStats(layer);
    const tone=s.readiness!=='ready'?'info':s.warn?'warn':s.totalRows?'ok':'info';
    const moneyLabel=Object.entries(s.byCurrency||{}).map(([cur,n])=>money(n,cur)).join(' · ')||'—';
    return `<button class="p0d-card" data-layer="${esc(layer.id)}" data-import-source-state="${s.readiness}">
      <span class="p0d-title">${esc(layer.title)}</span>
      <b>${s.readiness==='ready'?s.totalRows:(s.readiness==='pending'?'Por confirmar':'No disponible')}</b>
      <small>${s.readiness==='ready'?(s.warn?s.warn+' requiere validación':s.pending?s.pending+' pendiente':'Sin alertas'):'Sin lectura canónica confirmada'}</small>
      <em class="badge ${tone}">${s.readiness==='ready'?esc(moneyLabel):'—'}</em>
    </button>`;
  }

  function table(layer) {
    const readiness=sourceReadiness(layer);
    if(readiness!=='ready')return '<div class="cfg-note" data-import-unconfirmed="'+readiness+'">'+(readiness==='unavailable'?'Fuente no disponible para este acceso.':'Esperando la confirmación del servidor.')+' No se asume que la fuente esté vacía ni se inicia una nueva importación.</div>';
    const rs = rows(layer.coll).slice(0, 80);
    if (!rs.length) return `<div class="cfg-note">Sin registros en <b>${esc(layer.title)}</b>. Se llenara al importar/dry-run fuentes reales validadas.</div>`;
    return `<div style="overflow:auto;max-height:360px"><table class="tbl" style="min-width:920px"><thead><tr>
      <th>Estado</th><th>Fuente</th><th>Poliza/Factura</th><th>Cliente/Asesor</th><th>Moneda</th><th class="num">Monto</th><th>Validacion</th>
    </tr></thead><tbody>${rs.map(r => `<tr>
      <td><span class="badge ${layer.warn && layer.warn(r) ? 'warn' : 'info'}">${esc(r.estado || r.estadoCartera || r.estadoConciliacion || r.estadoFactura || r.estadoComision || 'pendiente')}</span></td>
      <td>${esc(r.origen || r.fuente || r.archivoFuente || '—')}</td>
      <td class="mono" style="font-size:11.5px">${esc(r.numero || r.numeroFactura || r.polizaNumero || r.reciboNumero || r.id || '—')}</td>
      <td>${esc(r.clienteNombre || r.asesorNombre || r.clienteId || r.asesorId || '—')}</td>
      <td>${esc(r.moneda || '—')}</td>
      <td class="num">${money(amountOf(r), r.moneda || '')}</td>
      <td>${r.requiereValidacion || (layer.warn && layer.warn(r)) ? esc((r.motivosValidacion || r._motivoValidacion || 'Revisar').toString()) : 'OK / pendiente de flujo'}</td>
    </tr>`).join('')}</tbody></table></div>`;
  }

  function render(host) {
    const activeId = host.dataset.p0Layer || LAYERS[0].id;
    const active = LAYERS.find(x => x.id === activeId) || LAYERS[0];
    try{if(Orbit.store&&typeof Orbit.store._ensureCollections==='function')Orbit.store._ensureCollections([active.coll]);}catch(_){}
    const totals=LAYERS.map(layerStats).reduce((acc,s)=>{
      if(s.readiness!=='ready'){acc.unconfirmed++;return acc;}
      acc.rows+=s.totalRows;acc.warn+=s.warn;acc.pending+=s.pending;return acc;
    },{rows:0,warn:0,pending:0,unconfirmed:0});

    host.innerHTML = `<div class="card pad" style="margin-top:22px;border:1px solid var(--line)">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap">
        <div>
          <div class="page-sub" style="margin:0 0 4px">P0 · Importadores y conciliacion</div>
          <h3 style="margin:0;font-family:var(--f-display)">Tablero operativo minimo</h3>
          <p class="muted" style="margin:6px 0 0;max-width:780px;font-size:13px;line-height:1.5">Controla las capas creadas por importadores antes de operar con datos reales. Nada en este tablero confirma pagos, crea finmovs definitivos ni reemplaza validacion humana.</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <span class="badge info">${totals.rows} registros confirmados${totals.unconfirmed?' · '+totals.unconfirmed+' fuentes sin confirmar':''}</span>
          <span class="badge warn">${totals.warn} alertas</span>
          <span class="badge info">${totals.pending} pendientes</span>
        </div>
      </div>
      <div class="p0d-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-top:14px">${LAYERS.map(card).join('')}</div>
      <div class="card" style="overflow:hidden;margin-top:14px;border:1px solid var(--line)">
        <div style="padding:10px 13px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:10px;align-items:center">
          <b style="font-family:var(--f-display)">${esc(active.title)}</b>
          <span class="muted" style="font-size:12px">vista de control · max 80 filas</span>
        </div>
        ${table(active)}
      </div>
      <div class="imp-note" style="margin-top:12px">Cierre P0: antes de escritura real se requiere dry-run por fuente separada, validacion de pais/moneda/forma de pago/llave y aprobacion humana.</div>
    </div>`;

    host.querySelectorAll('.p0d-card').forEach(btn => btn.addEventListener('click', () => {
      host.dataset.p0Layer = btn.dataset.layer;
      render(host);
    }));
  }

  function mount(host) {
    if(!host)return;
    if(!observedHosts.has(host)){
      observedHosts.add(host);
      const store=Orbit.store;
      if(store&&typeof store.on==='function'){
        let off=null;
        off=store.on('*',collection=>{
          if(!host.isConnected){if(off)off();off=null;return;}
          const layer=LAYERS.find(x=>x.id===(host.dataset.p0Layer||LAYERS[0].id))||LAYERS[0];
          if(collection==='*'||collection===layer.coll)render(host);
        });
      }
    }
    render(host);
  }
  return { mount, render, LAYERS, layerStats };
})();
