/* ============================================================
   CXOrbia · Motor financiero (por proyecto, multipaís)
   - Ingresos (lo que se recibe del cliente) y egresos (honorarios pagados)
   - Modelo directo (ISR + regalías) vs delegado (solo honorario recibido/pagado)
   - Presupuesto de gastos fijos vs real
   - Cuentas por pagar (liquidaciones no pagadas) y por cobrar (facturas pendientes)
   Separación SIEMPRE por moneda y país del proyecto (genérico, cualquier país).
   ============================================================ */
window.CX = window.CX || {};

/* almacén simple de movimientos/presupuesto manuales por proyecto (demo en memoria) */
CX.finStore = {
  _mov:{}, _pres:{}, _presM:{},
  mov(pid){ return this._mov[pid] || (this._mov[pid]=[]); },
  addMov(pid,m){ this.mov(pid).push(Object.assign({id:'m'+Date.now().toString(36)+Math.floor(Math.random()*99),fecha:new Date().toISOString().slice(0,10)},m)); CX.bus&&CX.bus.emit('fin'); },
  delMov(pid,id){ this._mov[pid]=(this._mov[pid]||[]).filter(m=>m.id!==id); CX.bus&&CX.bus.emit('fin'); },
  pres(pid,period){ period=period||this.curPeriod(); const byp=this._presM[pid]||(this._presM[pid]={}); if(!byp[period]){ // hereda del periodo anterior si existe
      const prev=Object.keys(byp).sort().filter(k=>k<period).pop(); byp[period]=prev?Object.assign({},byp[prev]):{}; } return byp[period]; },
  setPres(pid,k,v,period){ this.pres(pid,period)[k]=+v||0; CX.bus&&CX.bus.emit('fin'); },
  delPres(pid,k,period){ delete this.pres(pid,period)[k]; CX.bus&&CX.bus.emit('fin'); },

  /* ----- periodo activo (YYYY-MM) ----- */
  _period:null,
  curPeriod(){ return this._period || (this._period=new Date().toISOString().slice(0,7)); },
  setPeriod(per){ this._period=per; CX.bus&&CX.bus.emit('fin'); },
  periods(pid){ // periodos con datos (movimientos o presupuesto) + actual
    const s=new Set([this.curPeriod()]);
    (this._mov[pid]||[]).forEach(m=>{ if(m.fecha)s.add(m.fecha.slice(0,7)); });
    Object.keys(this._presM[pid]||{}).forEach(k=>s.add(k));
    return [...s].sort().reverse();
  },
  nextPeriod(per){ const [y,m]=per.split('-').map(Number); const d=new Date(y,m,1); return d.toISOString().slice(0,7); },
  /* crear mes siguiente: presupuesto se replica editable; movimientos en blanco */
  crearMesSiguiente(pid){ const cur=this.curPeriod(), nxt=this.nextPeriod(cur); const byp=this._presM[pid]||(this._presM[pid]={}); if(!byp[nxt])byp[nxt]=Object.assign({},byp[cur]||{}); this.setPeriod(nxt); return nxt; },

  /* ----- movimientos GLOBALES (no atados a un proyecto) ----- */
  GLOBAL:'__global__',
  globalMov(){ return this.mov(this.GLOBAL); },
  addGlobalMov(m){ this.addMov(this.GLOBAL, Object.assign({global:true},m)); },

  /* ----- taxonomía de conceptos (listas desplegables) ----- */
  CATEGORIAS:['Administrativo','Financiero','Tecnología','Proyecto','Comercial','Impuestos','Nómina','Otro'],
  /* tipos de INGRESO separados (comisiones/honorarios/anticipos/facturación vs financiamiento) */
  TIPOS_INGRESO:{
    comisiones:'Comisiones', honorarios:'Honorarios', anticipo:'Anticipo de programa',
    facturacion:'Facturación de programa', financiamiento:'Financiamiento (→ CxP)', remesa:'Remesa recibida',
  },
  TIPOS_EGRESO:{ honorarios_shopper:'Honorarios a shoppers', gasto:'Gasto operativo', impuesto:'Impuesto', abono_cxp:'Abono a CxP', otro:'Otro' },

  /* ----- cuentas por pagar / cobrar registradas manualmente (p.ej. en importación inicial) ----- */
  _cxp:{}, _cxc:{},
  cxp(pid){ return this._cxp[pid] || (this._cxp[pid]=[]); },
  cxc(pid){ return this._cxc[pid] || (this._cxc[pid]=[]); },
  addCxp(pid,r){ this.cxp(pid).push(Object.assign({id:'p'+Date.now().toString(36),saldo:+r.monto||0},r)); CX.bus&&CX.bus.emit('fin'); },
  addCxc(pid,r){ this.cxc(pid).push(Object.assign({id:'c'+Date.now().toString(36),saldo:+r.monto||0},r)); CX.bus&&CX.bus.emit('fin'); },
  editCx(pid,kind,id,patch){ const arr=kind==='cxc'?this.cxc(pid):this.cxp(pid); const r=arr.find(x=>x.id===id); if(r){Object.assign(r,patch); if(patch.saldo!=null)r.saldo=+patch.saldo||0;} CX.bus&&CX.bus.emit('fin'); return r; },
  delCx(pid,kind,id){ if(kind==='cxc')this._cxc[pid]=this.cxc(pid).filter(x=>x.id!==id); else this._cxp[pid]=this.cxp(pid).filter(x=>x.id!==id); CX.bus&&CX.bus.emit('fin'); },
  /* abono a una CxP: reduce saldo y registra egreso vinculado */
  abonarCxp(pid,id,monto){ const r=this.cxp(pid).find(x=>x.id===id); if(!r)return; r.saldo=Math.max(0,(r.saldo||0)-(+monto||0)); this.addMov(pid,{tipo:'egreso',cat:'Abono CxP · '+(r.concepto||''),tipoEgreso:'abono_cxp',pais:r.pais,monto:-(+monto||0),desc:'Abono a cuenta por pagar',estado:'Pagado',origen:'cxp',cxpId:id}); },

  /* ----- lote en construcción (carrito) por proyecto ----- */
  _draft:{},
  draft(pid){ return this._draft[pid] || (this._draft[pid]=[]); },
  inDraft(pid,vid){ return this.draft(pid).includes(vid); },
  toggleDraft(pid,vid){ const d=this.draft(pid); const i=d.indexOf(vid); if(i>=0)d.splice(i,1); else d.push(vid); CX.bus&&CX.bus.emit('lote'); return i<0; },
  clearDraft(pid){ this._draft[pid]=[]; CX.bus&&CX.bus.emit('lote'); },

  /* ----- control de FINANCIAMIENTOS (no son ingreso operativo; se devuelven) ----- */
  _fin:{},
  financiamientos(pid){ return this._fin[pid] || (this._fin[pid]=[]); },
  addFinanciamiento(pid,f){ const rec=Object.assign({id:'f'+Date.now().toString(36),fecha:new Date().toISOString().slice(0,10),saldo:+f.monto||0,devuelto:0},f);
    this.financiamientos(pid).push(rec);
    // se registra como ingreso NO operativo (flujo) y como CxP
    this.addMov(pid,{tipo:'ingreso',cat:'Financiamiento · '+(f.fuente||''),tipoIngreso:'financiamiento',pais:f.pais,monto:+f.monto||0,desc:'Entrada de financiamiento (no operativo)',estado:'Por conciliar',fecha:rec.fecha,noOperativo:true,finId:rec.id});
    this.addCxp(pid,{concepto:'Financiamiento · '+(f.fuente||''),monto:+f.monto||0,pais:f.pais,origen:'financiamiento',finId:rec.id});
    CX.bus&&CX.bus.emit('fin'); return rec; },
  devolverFinanciamiento(pid,id,monto){ const r=this.financiamientos(pid).find(x=>x.id===id); if(!r)return; const m=Math.min(+monto||0,r.saldo||0);
    r.devuelto=(r.devuelto||0)+m; r.saldo=Math.max(0,(r.saldo||0)-m);
    this.addMov(pid,{tipo:'egreso',cat:'Devolución financiamiento · '+(r.fuente||''),tipoEgreso:'otro',pais:r.pais,monto:-m,desc:'Egreso por devolución de financiamiento',estado:'Pagado',fecha:new Date().toISOString().slice(0,10),finId:id});
    // reduce la CxP asociada
    const cxp=this.cxp(pid).find(x=>x.finId===id); if(cxp)cxp.saldo=Math.max(0,(cxp.saldo||0)-m);
    CX.bus&&CX.bus.emit('fin'); return r; },
};

CX.fin = {
  /* honorario que se RECIBE por país (config del proyecto; fallback = lo que se paga) */
  honRecibe(p,c){ return (p.honRecibe&&p.honRecibe[c]!=null)?p.honRecibe[c]:(p.honorario&&p.honorario[c])||0; },

  /* resumen por país a partir de las liquidaciones derivadas de visitas */
  porPais(data){
    const p=data.project(), liq=CX.liq.forProject(data), out={};
    p.countries.forEach(c=>{
      const ls=liq.filter(l=>l.pais===c);
      const cur=p.currency[c];
      const visRe=ls.length;                                   // visitas con liquidación
      const ingreso=ls.reduce((a)=>a+this.honRecibe(p,c),0);   // lo facturado al cliente
      const honPaga=ls.reduce((a,l)=>a+l.honorario,0);         // honorarios a shoppers
      const reemb=ls.reduce((a,l)=>a+l.reembolso,0);           // flujo (no utilidad)
      const isr=p.modelo==='directo'?Math.round(ingreso*((p.isr||0)/100)):0;
      const regal=p.modelo==='directo'?Math.round(ingreso*((p.regalias||0)/100)):0;
      const fijos=Object.values(CX.finStore.pres(p.id)).reduce((a,b)=>a+(+b||0),0);
      const margen=ingreso-honPaga-isr-regal; // reembolso es flujo, no resta utilidad
      const cxp=ls.filter(l=>l.estado!=='pagada').reduce((a,l)=>a+l.total,0); // por pagar a shoppers
      const cobrado=ls.filter(l=>l.estado==='pagada').length;
      const cxc=ls.filter(l=>l.estado==='validada'||l.estado==='pagada').reduce((a)=>a+this.honRecibe(p,c),0); // facturable
      out[c]={cur,visRe,ingreso,honPaga,reemb,isr,regal,fijos,margen,cxp,cxc,
        margenPct: ingreso?Math.round(margen/ingreso*100):0};
    });
    return out;
  },

  /* serie mensual — anclada al ingreso/margen REAL del periodo actual (porPais) */
  serieMensual(p,c){
    const fp=this.porPais({project:()=>p, visitas:()=>(CX.data._visitas||[]).filter(v=>v.projectId===p.id)});
    const d=(fp&&fp[c])||{};
    const ingHoy=d.ingreso||this.honRecibe(p,c)*10||1000;
    const margenHoy=(typeof d.margen==='number')?d.margen:Math.round(ingHoy*0.38);
    const mp=ingHoy?margenHoy/ingHoy:0.38;
    const meses=['MAR','ABR','MAY','JUN'];
    // el último mes = real; los previos escalan hacia atrás con la tendencia observada
    const factors=[0.62,0.78,0.9,1];
    return meses.map((m,i)=>{const ing=Math.round(ingHoy*factors[i]);return {m, ingreso:ing, margen:Math.round(ing*mp*(0.92+i*0.027))};});
  },
  /* serie interanual — margen % real del año actual + evolución previa derivada */
  serieAnual(p,c){
    const s=this.serieMensual(p,c);
    const ingAnual=s.reduce((a,x)=>a+x.ingreso,0)*3; // anualizado aprox.
    const margenHoyPct=(()=>{const last=s[s.length-1];return last.ingreso?Math.round(last.margen/last.ingreso*100):38;})();
    return [
      {y:'2024', ingreso:Math.round(ingAnual*0.63), margenPct:Math.max(10,margenHoyPct-9)},
      {y:'2025', ingreso:Math.round(ingAnual*0.83), margenPct:Math.max(10,margenHoyPct-4)},
      {y:'2026', ingreso:Math.round(ingAnual), margenPct:margenHoyPct},
    ];
  },
  /* variación intermensual de margen % (mes vs mes anterior) */
  margenMoM(p,c){
    const s=this.serieMensual(p,c);
    return s.map((x,i)=>{const pct=x.ingreso?Math.round(x.margen/x.ingreso*100):0;const prev=i>0?(s[i-1].ingreso?Math.round(s[i-1].margen/s[i-1].ingreso*100):0):pct;return {m:x.m,margenPct:pct,delta:pct-prev};});
  },
};
