/* ============================================================
   CXOrbia · Mock data layer (multi-project, IA-adaptive)
   GENÉRICO: sin marcas, proyectos ni personas reales.
   Proyectos, sucursales y evaluadores de ejemplo, pensados para
   que el cliente vea el ALCANCE de cada funcionalidad.
   Al cambiar de proyecto, todos los getters re-derivan de él.
   ============================================================ */
window.CX = window.CX || {};

function _rng(seed){let s=seed%2147483647;if(s<=0)s+=2147483646;return()=>(s=s*16807%2147483647)/2147483647;}
function _pick(r,arr){return arr[Math.floor(r()*arr.length)];}
function _pad(n){return String(n).padStart(2,'0');}

const GT_CITIES = ['Guatemala','Villa Nueva','Mixco','Quetzaltenango','Mazatenango','Jutiapa','Escuintla','Cobán'];
const HN_CITIES = ['Tegucigalpa','San Pedro Sula','La Ceiba','Choloma','Comayagua'];

/* ---------- Proyectos genéricos (rubros distintos → la IA adapta) ---------- */
const PROJECTS = [
  {
    id:'retail', name:'Proyecto Retail', client:'Cliente Retail (demo)', industry:'Retail · Cadena de tiendas',
    countries:['GT','HN'], currency:{GT:'Q',HN:'L'}, accent:'#2196d3',
    sucursales:24, honorario:{GT:60,HN:200}, honRecibe:{GT:170,HN:520}, modelo:'directo', isr:5, regalias:10, boleto:{GT:33,HN:127}, combo:'Reembolso de compra', comboAmt:{GT:121,HN:291},
    scenarios:['Compra estándar','Fin de semana','Cliente incógnito'],
    quincenas:['Quincena 1','Quincena 2'], nVisitas:44,
    canales:['App móvil','Tienda física','Teléfono'], formato:'Compra incógnita', ronda:'JUN 26',
    restriccion:'No haber visitado esta sucursal en los últimos 2 meses.',
    cuestionario:{modo:'externa', url:'https://forms.example.com/retail', label:'Formulario web del cliente'},
    pago:{logica:'Pago 30 días después de submitir el cuestionario.', diasPago:30, moneda:'local'},
    hrMap:{fuente:'Google Sheets', cols:['Sucursal','Ciudad','País','Quincena','Escenario','Franja','Honorario']},
    geoloc:true,
    conocimiento:'Cadena de retail. Se evalúa atención, tiempos, limpieza y proceso de compra.',
  },
  {
    id:'banca', name:'Proyecto Banca', client:'Cliente Banca (demo)', industry:'Banca · Red de agencias',
    countries:['GT','HN'], currency:{GT:'Q',HN:'L'}, accent:'#0e9c6e',
    sucursales:18, honorario:{GT:90,HN:240}, honRecibe:{GT:230,HN:600}, modelo:'directo', isr:5, regalias:0, boleto:{GT:0,HN:0}, combo:null, comboAmt:{GT:0,HN:0},
    scenarios:['Apertura de cuenta','Solicitud de préstamo','Atención telefónica'],
    quincenas:['Quincena 1','Quincena 2'], nVisitas:30,
    canales:['Agencia','Teléfono','App'], formato:'Cliente incógnito', ronda:'JUN 26',
    restriccion:'No haber sido atendido por el mismo asesor en 90 días.',
    cuestionario:{modo:'interna', url:'', label:'Cuestionario dentro de la plataforma'},
    pago:{logica:'Pago al cierre de quincena validada.', diasPago:15, moneda:'local'},
    hrMap:{fuente:'Excel importado', cols:['Agencia','Ciudad','País','Asesor','Escenario']},
    geoloc:false,
    conocimiento:'Banca. Se evalúa asesoría, tiempos de espera y cumplimiento de protocolo.',
  },
  {
    id:'food', name:'Proyecto Restaurantes', client:'Cliente Restaurantes (demo)', industry:'Restaurantes · Multimarca',
    countries:['GT'], currency:{GT:'Q'}, accent:'#7c3aed',
    sucursales:30, honorario:{GT:75}, honRecibe:{GT:190}, modelo:'delegado', isr:0, regalias:0, boleto:{GT:0}, combo:'Combo + bebida', comboAmt:{GT:90},
    scenarios:['Almuerzo','Cena fin de semana','Drive-thru'],
    quincenas:['Quincena 1','Quincena 2'], nVisitas:34,
    canales:['Salón','Drive-thru','Delivery'], formato:'Experiencia de consumo', ronda:'JUN 26',
    restriccion:'Máximo 1 visita por shopper a la misma marca por quincena.',
    cuestionario:{modo:'link', url:'', label:'Link distinto por cada visita'},
    pago:{logica:'Pago semanal de lotes validados.', diasPago:7, moneda:'local'},
    hrMap:{fuente:'Hoja creada en plataforma', cols:['Sucursal','Ciudad','Marca','Escenario','Canal']},
    geoloc:true,
    conocimiento:'Restaurantes multimarca. Se evalúa servicio, sabor, tiempos y limpieza.',
  },
];

/* ---------- Evaluadores genéricos (sin nombres reales) ---------- */
const SHOPPERS = Array.from({length:16},(_,i)=>{
  const r=_rng(200+i*13);
  const pais=i%4===0?'HN':_pick(r,['GT','GT','HN']);
  const ciudad=pais==='GT'?_pick(r,GT_CITIES):_pick(r,HN_CITIES);
  return {
    id:'sh'+(i+1), code:'EVL-'+_pad(i+1), nombre:'Evaluador '+_pad(i+1),
    pais, ciudad,
    email:'evaluador'+_pad(i+1)+'@demo.cxorbia', phone:'+'+(pais==='GT'?'502':'504')+' ••• '+_pad(1000+i),
    dpi:'•••• •••• '+_pad(i*7%100),
    estado:_pick(r,['Activo','Activo','Activo','Certificado','Pendiente']),
    rating:+(3.6+r()*1.4).toFixed(1),
    visitas:Math.floor(r()*22)+2, postulaciones:Math.floor(r()*14)+1,
    promCuest:+(0.5+r()*2.2).toFixed(1), certs:Math.floor(r()*6)+1,
    honorarioPref: r()>0.8 ? 'Preferente' : 'Estándar',
  };
});

/* ---------- Sucursales genéricas por proyecto ---------- */
function sucursalName(p,r,i){
  const pais=_pick(r,p.countries);
  const ciudad=pais==='GT'?_pick(r,GT_CITIES):_pick(r,HN_CITIES);
  return { name:'Sucursal '+_pad(i)+' · '+ciudad, ciudad, pais };
}

/* ---------- Generador de visitas (por proyecto) ---------- */
const ESTADOS=['disponible','postulada','asignada','agendada','realizada','cuestionario','liquidada','fuera_rango'];
function genVisitas(p){
  const out=[]; const r=_rng(p.id.length*97+11);
  for(let i=1;i<=p.nVisitas;i++){
    const su=sucursalName(p,r,i);
    const est=_pick(r,ESTADOS);
    const shopper = est==='disponible'?null:_pick(r,SHOPPERS.filter(s=>s.pais===su.pais));
    const franja=_pick(r,['Semana','Fin de semana']);
    const canal=p.canales?_pick(r,p.canales):'—';
    out.push({
      id:p.id+'-v'+i, projectId:p.id, num:i,
      sucursal:su.name, ciudad:su.ciudad, pais:su.pais, currency:p.currency[su.pais],
      quincena:_pick(r,p.quincenas), escenario:_pick(r,p.scenarios),
      franja, franjaCode:franja==='Semana'?'WK':'WKND', canal, formato:p.formato,
      honorario:p.honorario[su.pais], boleto:(p.boleto&&p.boleto[su.pais])||0,
      combo:p.combo, comboAmt:(p.comboAmt&&p.comboAmt[su.pais])||0,
      estado:est, shopperId:shopper?shopper.id:null, shopper:shopper?shopper.nombre:null,
      shopperCode:shopper?shopper.code:null,
      rango:'12–18 jun', disponibleDesde:'2026-06-'+_pad(10+i%12),
      agendada:['agendada','realizada','cuestionario','liquidada'].includes(est)?'2026-06-'+_pad(12+i%6):null,
      realizada:['realizada','cuestionario','liquidada'].includes(est)?'2026-06-'+_pad(13+i%5):null,
      cuestFecha:['cuestionario','liquidada'].includes(est)?'2026-06-'+_pad(14+i%4):null,
      submit:['liquidada'].includes(est),
    });
  }
  return out;
}

function genPosts(visitas){
  const r=_rng(7321); const out=[];
  visitas.filter(v=>['postulada','asignada','agendada'].includes(v.estado)).forEach((v,i)=>{
    const sh=v.shopperId?SHOPPERS.find(s=>s.id===v.shopperId):_pick(r,SHOPPERS.filter(s=>s.pais===v.pais));
    out.push({
      id:'p'+i, visitaId:v.id, projectId:v.projectId,
      shopperId:sh.id, shopper:sh.nombre, shopperCode:sh.code, phone:sh.phone,
      sucursal:v.sucursal, ciudad:v.ciudad, pais:v.pais, quincena:v.quincena, franjaCode:v.franjaCode,
      honorario:v.honorario, boleto:v.boleto, comboAmt:v.comboAmt, currency:v.currency,
      fechaProp:v.agendada||v.disponibleDesde, disponibleDesde:v.disponibleDesde,
      estado: v.estado==='postulada'?'pendiente':(r()>.88?'standby':'aprobada'),
      aprobadaPor: v.estado!=='postulada'?(r()>.5?'Auto-HR':'Coordinación'):null,
      reprog: r()>0.9,
    });
  });
  return out;
}

const _visitasAll = PROJECTS.flatMap(genVisitas);
const _postsAll   = genPosts(_visitasAll);

/* ---------- Exposición ---------- */
CX.data = {
  projects:PROJECTS, shoppers:SHOPPERS, _visitas:_visitasAll, _posts:_postsAll,
  currentProjectId:PROJECTS[0].id,

  project(){return this.projects.find(p=>p.id===this.currentProjectId);},
  setProject(id){this.currentProjectId=id;CX.bus&&CX.bus.emit('project');},

  /* alta de proyecto nuevo (persistente, aislado: id propio, sin tocar los demás) */
  addProject(cfg){
    const id = cfg.id || ('proj-'+Date.now().toString(36));
    const proj = Object.assign({
      id, accent:'#2196d3', quincenas:['Quincena 1','Quincena 2'], nVisitas:0,
    }, cfg, {id});
    this.projects.push(proj);
    this.currentProjectId = id;
    CX.bus && CX.bus.emit('project');
    return proj;
  },

  /* proyectos visibles por rol: el shopper solo ve los de su país */
  projectsFor(role){
    if(role!=='shopper') return this.projects;
    const u=CX.session&&CX.session.user; const sh=u&&this.shoppers.find(s=>s.id===u.shopperId);
    const pais=sh?sh.pais:null;
    return pais ? this.projects.filter(p=>p.countries.includes(pais)) : this.projects;
  },

  visitas(){return this._visitas.filter(v=>v.projectId===this.currentProjectId);},
  posts(){return this._posts.filter(p=>p.projectId===this.currentProjectId);},
  shoppersFor(){const cs=this.project().countries;return this.shoppers.filter(s=>cs.includes(s.pais));},

  /* cambio de estado de una visita (flujo del shopper) + sincronía */
  setVisitState(id, estado, dateField, dateVal){
    const v=this._visitas.find(x=>x.id===id); if(!v) return null;
    v.estado=estado;
    if(dateField && dateVal) v[dateField]=dateVal;
    if(CX.hr) CX.hr.writeBack(this.project(), v);
    CX.bus && CX.bus.emit('visit-flow');
    return v;
  },

  /* asignación manual de una visita a un shopper (existente o recién creado) */
  assignVisit(visitId, shopperId){
    const v=this._visitas.find(x=>x.id===visitId);
    const s=this.getShopper?this.getShopper(shopperId):this.shoppers.find(x=>x.id===shopperId);
    if(!v||!s) return null;
    v.shopperId=s.id; v.shopper=s.nombre; v.shopperCode=s.code;
    if(v.estado==='disponible') v.estado='asignada';
    if(CX.hr) CX.hr.writeBack(this.project(), v);
    CX.bus && CX.bus.emit('visit-flow');
    return v;
  },

  /* pago de un lote: marca visitas como liquidadas con fecha de pago real Y
     genera el/los egreso(s) financiero(s) agrupados por país.
     Cierra la cadena visita → liquidación → beneficios → finanzas (CxP + Movimientos). */
  payVisits(ids, fechaPago){
    const f=fechaPago||new Date().toISOString().slice(0,10);
    const porPais={}; let n=0; const detalle=[];
    (ids||[]).forEach(id=>{ const v=this._visitas.find(x=>x.id===id); if(v){
      v.estado='liquidada'; v.fechaPago=f; v.realizada=v.realizada||f;
      const tot=(v.honorario||0)+(v.boleto||0)+(v.comboAmt||0);
      porPais[v.pais]=porPais[v.pais]||{monto:0,n:0,cur:v.currency}; porPais[v.pais].monto+=tot; porPais[v.pais].n++;
      detalle.push({shopper:v.shopper||'Evaluador',sucursal:v.sucursal||'',pais:v.pais,monto:tot,cur:v.currency,visitaId:v.id});
      n++;
    }});
    // un movimiento de egreso POR SHOPPER (detalle real, no consolidado) — #168
    if(n && CX.finStore){
      const lote='L-'+Date.now().toString(36).slice(-4).toUpperCase();
      detalle.forEach(d=>{
        CX.finStore.addMov(this.currentProjectId,{tipo:'egreso',cat:'Honorario · '+d.shopper,pais:d.pais,monto:-d.monto,desc:d.sucursal+' · lote '+lote,estado:'Pagado',origen:'lote',lote,shopper:d.shopper,visitaId:d.visitaId,fecha:f});
      });
    }
    if(n) CX.bus && CX.bus.emit('visit-flow');
    (ids||[]).forEach(id=>{ const v=this._visitas.find(x=>x.id===id); if(v&&CX.automations) CX.automations.fire('pago',{shopper:v.shopper||'',sucursal:v.sucursal}); });
    return {pagadas:n, fechaPago:f, porPais, detalle};
  },

  /* conteo por fase con desglose por país */
  _phaseCount(v,fn){const cs=this.project().countries;const o={t:v.filter(fn).length};cs.forEach(c=>o[c]=v.filter(x=>x.pais===c&&fn(x)).length);return o;},
  kpis(){
    const v=this.visitas();
    const P=(fn)=>this._phaseCount(v,fn);
    return {
      total:P(()=>true),
      asignadas:P(x=>x.shopperId),
      sinAsignar:P(x=>!x.shopperId&&x.estado!=='fuera_rango'),
      sinAgendar:P(x=>x.estado==='asignada'),
      agendadas:P(x=>['agendada','realizada','cuestionario','liquidada'].includes(x.estado)),
      realizadas:P(x=>['realizada','cuestionario','liquidada'].includes(x.estado)),
      pendRealizar:P(x=>['asignada','agendada'].includes(x.estado)),
      cuestPend:P(x=>x.estado==='realizada'),
      sinSubmitir:P(x=>x.estado==='cuestionario'),
      liquidadas:P(x=>x.estado==='liquidada'),
      fueraRango:P(x=>x.estado==='fuera_rango'),
      postPend:this.posts().filter(p=>p.estado==='pendiente').length,
    };
  },
  /* flujo por fases para un país */
  phaseFlow(c){
    const v=this.visitas().filter(x=>x.pais===c); const t=v.length||1;
    const n=(fn)=>v.filter(fn).length; const pc=(x)=>Math.round(x/t*100);
    const real=n(x=>['realizada','cuestionario','liquidada'].includes(x.estado));
    const agen=n(x=>['agendada','realizada','cuestionario','liquidada'].includes(x.estado));
    return {
      total:v.length,
      asign:[n(x=>x.shopperId),pc(n(x=>x.shopperId))],
      agend:[agen,pc(agen)],
      sinAgend:[n(x=>x.estado==='asignada'),pc(n(x=>x.estado==='asignada'))],
      sinAsign:[n(x=>!x.shopperId&&x.estado!=='fuera_rango'),pc(n(x=>!x.shopperId&&x.estado!=='fuera_rango'))],
      real:[real,pc(real)],
      cuest:[n(x=>['cuestionario','liquidada'].includes(x.estado)),pc(n(x=>['cuestionario','liquidada'].includes(x.estado)))],
      submit:[n(x=>x.estado==='liquidada'),pc(n(x=>x.estado==='liquidada'))],
      liq:[n(x=>x.estado==='liquidada'),pc(n(x=>x.estado==='liquidada'))],
    };
  },
};
