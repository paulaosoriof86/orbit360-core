/* Orbit 360 · P0 reglas de importacion de polizas · 2026-07-31
   Contrato no-regresion:
   - prima fuente se preserva; total y neta nunca se infieren entre si;
   - frecuencia, forma/metodo y conducto de pago son dimensiones separadas;
   - vigencia forma parte de la identidad de version;
   - solo vigencia operativa validada puede materializar recibos esperados.
*/
(function(){
  window.Orbit=window.Orbit||{};
  const PAIS_MONEDA={GT:'GTQ',CO:'COP'};
  const FREQUENCY_WORDS=/^(contado|pago unico|unico|mensual|bimensual|bimestral|trimestral|cuatrimestral|semestral|anual|12 cuotas|6 cuotas|3 cuotas)$/;

  function norm(v){return String(v==null?'':v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();}
  function text(v){return String(v==null?'':v).trim();}
  function blank(v){return v==null||v===''||v==='REQUIERE_VALIDACION';}
  function first(i,keys){for(const k of keys){if(!blank(i&&i[k]))return i[k];}return'';}
  function parseNum(v){if(v==null||v==='')return 0;let s=String(v).replace(/[^0-9,.\-]/g,'').replace(/\.(?=\d{3}(\D|$))/g,'').replace(',','.');const n=parseFloat(s);return Number.isFinite(n)?n:0;}
  function parseNumNullable(v){if(blank(v))return null;let s=String(v).replace(/[^0-9,.\-]/g,'').replace(/\.(?=\d{3}(\D|$))/g,'').replace(',','.');const n=parseFloat(s);return Number.isFinite(n)?n:null;}
  function round2(v){return Math.round((Number(v)+Number.EPSILON)*100)/100;}
  function dateYMD(v){if(!v)return'';const raw=String(v).trim();let m=raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);if(m)return`${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;m=raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);return m?`${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`:raw.slice(0,10);}
  function todayYMD(){return Orbit.ui&&Orbit.ui.today?Orbit.ui.today():new Date().toISOString().slice(0,10);}
  function isActiveTerm(p,today){const now=today||todayYMD(),start=dateYMD(p.vigenciaIni||p.vigenciaInicio||p.desde),end=dateYMD(p.vigenciaFin||p.vigenciaFinal||p.hasta||p.vencimiento);if(start&&now<start)return false;if(end&&now>end)return false;return!!(start||end);}
  function resolveCountry(raw,ins){const n=norm(raw||(ins&&ins.pais)||'');if(n==='gt'||n==='gtm'||n.includes('guatemala'))return{country:'GT',source:raw?'row':'insurer',requiresValidation:false};if(n==='co'||n==='col'||n.includes('colombia'))return{country:'CO',source:raw?'row':'insurer',requiresValidation:false};return{country:'',source:'',requiresValidation:true};}
  function resolveCurrency(raw,country,ins){const n=norm(raw||(ins&&ins.moneda)||'');if(n==='gtq'||n.includes('quetzal'))return{currency:'GTQ',source:raw?'row':'insurer',requiresValidation:false};if(n==='cop'||n.includes('peso'))return{currency:'COP',source:raw?'row':'insurer',requiresValidation:false};if(n==='usd'||n.includes('dolar'))return{currency:'USD',source:raw?'row':'insurer',requiresValidation:false};if(country&&PAIS_MONEDA[country])return{currency:PAIS_MONEDA[country],source:'country',requiresValidation:false};return{currency:'',source:'',requiresValidation:true};}

  function splitPremium(i){
    const net=parseNumNullable(first(i,['primaNeta','neta','prima_base']));
    const genericExpenses=parseNumNullable(first(i,['gastos','gastosEmision','derechos']));
    const expedition=parseNumNullable(first(i,['gastosExpedicion','expedicion','gastoExpedicion']));
    const financing=parseNumNullable(first(i,['gastosFinanciamiento','gastosFinan','financiamiento','recargoFraccionamiento']));
    const adjustment=parseNumNullable(first(i,['ajusteFuente','descuentoAjusteFuente','descuento','ajuste','montoDescuento']));
    const iva=parseNumNullable(first(i,['iva','impuesto','impuestos','impuestosIVA']));
    const total=parseNumNullable(first(i,['primaTotal','total','primaBruta','prima']));
    const exp=expedition!=null?expedition:genericExpenses;
    const complete=[net,exp,financing,adjustment,iva].every(v=>v!=null);
    const calculated=complete?round2(net+exp+financing+adjustment+iva):null;
    const difference=complete&&total!=null?round2(total-calculated):null;
    return{
      primaNeta:net,
      gastos:genericExpenses,
      gastosExpedicion:expedition,
      gastosFinanciamiento:financing,
      ajusteFuente:adjustment,
      iva,
      primaTotal:total,
      componentesCompletos:complete,
      totalComponentes:calculated,
      diferenciaFuente:difference,
      cuadraFuente:difference==null?null:Math.abs(difference)<=0.01,
      ambiguous:net==null||total==null
    };
  }

  function paymentDimensions(i){
    let frecuencia=text(first(i,['frecuencia','periodicidad','forma']));
    let formaPago=text(first(i,['formaPago','medioPago','metodoPago']));
    const conductoPago=text(first(i,['conductoPago','conducto']));
    let migrated=false;
    if(!frecuencia&&formaPago&&FREQUENCY_WORDS.test(norm(formaPago))){
      frecuencia=formaPago;
      formaPago='';
      migrated=true;
    }
    return{frecuencia,formaPago,conductoPago,migratedFromFormaPago:migrated};
  }

  function operationalStatus(i,today){
    const s=norm(i.estadoFuenteOriginal||i.estadoPol||i.estado||i.status||''),active=isActiveTerm(i,today);
    if(/cancel|anulad|rescind/.test(s))return{estadoOperativoOrbit:'cancelada_terminal',estadoCartera:'no_exigible',label:'Cancelada',requiresValidation:false};
    if(/no renov/.test(s))return{estadoOperativoOrbit:'no_renovada_historica',estadoCartera:'no_exigible',label:'No renovada',requiresValidation:false};
    if(/^por renovar$/.test(s))return active?{estadoOperativoOrbit:'por_renovar_operativa',estadoCartera:'genera_recibos_esperados',label:'Por renovar',requiresValidation:false}:{estadoOperativoOrbit:'por_renovar_requiere_validacion',estadoCartera:'requiere_validacion',label:'Por renovar · requiere validación',requiresValidation:true};
    if(/renovad/.test(s))return{estadoOperativoOrbit:'historica_renovada',estadoCartera:'no_exigible',label:'Renovada',requiresValidation:false};
    if(/^vigente$|\bvigente\b/.test(s))return active?{estadoOperativoOrbit:'vigente_operativa',estadoCartera:'genera_recibos_esperados',label:'Vigente',requiresValidation:false}:{estadoOperativoOrbit:'vigente_fuera_vigencia_requiere_validacion',estadoCartera:'requiere_validacion',label:'Vigente · requiere validación',requiresValidation:true};
    if(/venc/.test(s))return active?{estadoOperativoOrbit:'vigente_operativa',estadoCartera:'genera_recibos_esperados',label:'Vigente',requiresValidation:false,sourceStatusContradiction:true}:{estadoOperativoOrbit:'historica_vencida',estadoCartera:'recibo_analitico_no_cartera_viva',label:'Histórica',requiresValidation:false};
    if(/termin|reexped/.test(s))return{estadoOperativoOrbit:'historica_estado_no_activo',estadoCartera:'no_exigible',label:'Histórica',requiresValidation:false};
    return active?{estadoOperativoOrbit:'requiere_validacion_estado',estadoCartera:'requiere_validacion',label:'Requiere validación',requiresValidation:true}:{estadoOperativoOrbit:'historica_estado_no_activo',estadoCartera:'no_exigible',label:'Histórica',requiresValidation:false};
  }
  function partyKey(i){return i.clienteId||i.aseguradoId||i.contratanteId||i.tomadorId||i.identificacion||i.documento||i.clienteNombre||i.aseguradoNombre||i.contratanteNombre||i.tomadorNombre||i.nombre||'';}
  function policyDedupKey(i,resolvedCountry){const country=resolvedCountry||i.pais||i.country||'',ins=i.aseguradoraId||i.aseguradoraNombre||i.aseguradora||'',num=i.numero||i.poliza||i.numeroPoliza||'',party=partyKey(i);return country&&ins&&num&&party?[norm(country),norm(ins),norm(num),norm(party)].join('|'):'';}
  function policySourceVersionKey(i,resolvedCountry){const k=policyDedupKey(i,resolvedCountry),start=dateYMD(i.vigenciaIni||i.vigenciaInicio||i.desde),end=dateYMD(i.vigenciaFin||i.vigenciaFinal||i.hasta||i.vencimiento);return k&&start&&end?[k,start,end].join('|'):'';}

  function normalizePolicy(input,ctx){
    const insurer=(ctx&&ctx.insurer)||input.aseguradoraObj||null;
    const c=resolveCountry(input.pais||input.country,insurer);
    const m=resolveCurrency(input.moneda||input.divisa||input.currency,c.country,insurer);
    const premium=splitPremium(input);
    const payment=paymentDimensions(input);
    const status=operationalStatus(input,ctx&&ctx.today);
    const dedup=policyDedupKey(input,c.country),version=policySourceVersionKey(input,c.country);
    const missing=Array.isArray(input.motivosValidacion)?input.motivosValidacion.slice():[];
    const need=r=>{if(r&&!missing.includes(r))missing.push(r);};
    if(!dedup)need('llave_poliza');
    if(!version)need('vigencia');
    if(!c.country)need('pais');
    if(!m.currency)need('moneda');
    if(premium.primaNeta==null)need('prima_neta');
    if(premium.primaTotal==null)need('prima_total');
    if(!payment.frecuencia)need('frecuencia_pago');
    if(!payment.formaPago)need('forma_pago');
    if(status.requiresValidation)need('estado');
    const sourceDiff=premium.diferenciaFuente;
    return Object.assign({},input,{
      _dedupKey:dedup,_sourceVersionKey:version,
      estadoFuenteOriginal:input.estadoFuenteOriginal||input.estadoPol||input.estado||input.status||'',
      estadoFuenteContradiceVigencia:status.sourceStatusContradiction===true,
      estadoOperativoOrbit:status.estadoOperativoOrbit,estadoCartera:status.estadoCartera,
      estadoConciliacion:input.estadoConciliacion||'pendiente',estado:status.label,
      pais:c.country,moneda:m.currency,monedaFuente:m.source,
      primaNeta:premium.primaNeta,gastos:premium.gastos,iva:premium.iva,primaTotal:premium.primaTotal,
      gastosExpedicion:premium.gastosExpedicion,gastosFinanciamiento:premium.gastosFinanciamiento,
      ajusteFuente:premium.ajusteFuente,componentesPrimaCompletos:premium.componentesCompletos,
      totalComponentesFuente:premium.totalComponentes,diferenciaPrimaFuente:sourceDiff,
      primaFuenteCuadra:premium.cuadraFuente,
      frecuencia:payment.frecuencia,formaPago:payment.formaPago,conductoPago:payment.conductoPago,
      frecuenciaMigradaDesdeFormaPago:payment.migratedFromFormaPago===true,
      requiereValidacion:missing.length>0||input.requiereValidacion===true,
      motivosValidacion:missing,importadorP0:true
    });
  }

  function shouldGenerateExpectedReceipts(p){
    return !p.requiereValidacion &&
      (p.estadoOperativoOrbit==='vigente_operativa'||p.estadoOperativoOrbit==='por_renovar_operativa') &&
      p.primaTotal!=null && !!p.moneda && !!text(p.frecuencia);
  }
  function expectedReceiptSeed(p,r,index){
    const amount=r&&r.total!=null?Number(r.total):null;
    return{
      id:r&&r.id?r.id:`rec_esp_${p.id||p._dedupKey}_${index}`,polizaId:p.id||'',clienteId:p.clienteId||'',asesorId:p.asesorId||'',
      cuota:r&&r.n!=null?r.n:index+1,monto:Number.isFinite(amount)?amount:null,moneda:p.moneda,
      neta:r&&r.neta!=null?r.neta:null,gastosEmision:r&&r.gastosEmision!=null?r.gastosEmision:null,
      gastosFinan:r&&r.gastosFinan!=null?r.gastosFinan:null,otros:r&&r.otros!=null?r.otros:null,iva:r&&r.iva!=null?r.iva:null,
      vence:r&&r.vence?r.vence:'',fechaLimite:r&&r.fechaLimite?r.fechaLimite:'',fechaPago:null,
      frecuencia:p.frecuencia||'',formaPago:p.formaPago||'',conductoPago:p.conductoPago||'',
      estado:'esperado',estadoCartera:'recibo_esperado',estadoConciliacion:'pendiente',
      confirmadoPago:false,carteraOperativa:false,conciliado:false,origen:'poliza_importada',importado:true
    };
  }

  Orbit.importaPolizasP0={
    norm,text,parseNum,parseNumNullable,dateYMD,isActiveTerm,resolveCountry,resolveCurrency,
    splitPremium,paymentDimensions,operationalStatus,policyDedupKey,policySourceVersionKey,
    normalizePolicy,shouldGenerateExpectedReceipts,expectedReceiptSeed
  };
})();
