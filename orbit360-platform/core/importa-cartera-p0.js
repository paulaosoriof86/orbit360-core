/* ============================================================
   Orbit 360 · P0 reglas recibos/cartera/conciliacion de primas
   Fecha: 2026-07-31

   Separa recibo esperado, evidencia CRM, estado de aseguradora,
   cartera y conciliacion. Un match exacto entre dos fuentes
   autoritativas puede materializar conciliacion; una sola fuente no.
   ============================================================ */
(function () {
  window.Orbit = window.Orbit || {};
  const VERSION = '20260731.2';

  function text(v){return String(v==null?'':v).trim();}
  function norm(value) {
    return text(value).toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }
  function parseNum(value) {
    if (value == null || value === '') return 0;
    let s = String(value).replace(/[^0-9,.\-]/g, '');
    s = s.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  }
  function parseNumNullable(value){
    if(value==null||value==='')return null;
    let s=String(value).replace(/[^0-9,.\-]/g,'').replace(/\.(?=\d{3}(\D|$))/g,'').replace(',','.');
    const n=parseFloat(s);return Number.isFinite(n)?n:null;
  }
  function todayYMD() { return (Orbit.ui && Orbit.ui.today) ? Orbit.ui.today() : new Date().toISOString().slice(0, 10); }
  function dateYMD(value) {
    if (!value) return '';
    const raw = String(value).trim();
    let m = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
    m = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (m) return `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
    return raw.slice(0, 10);
  }
  function agingBucket(dueDate, asOf) {
    const due = dateYMD(dueDate);
    if (!due) return 'sin_fecha';
    const a = new Date(asOf || todayYMD()), d = new Date(due);
    const days = Math.floor((a - d) / 86400000);
    if (days <= 0) return 'al_dia';
    if (days <= 30) return '1_30';
    if (days <= 45) return '31_45';
    if (days <= 60) return '46_60';
    if (days <= 90) return '61_90';
    return 'mas_90';
  }
  function sourceKey(input) {
    return [
      norm(input.aseguradoraId || input.aseguradoraNombre || input.aseguradora || ''),
      norm(input.polizaId || input.polizaNumero || input.numeroPoliza || input.poliza || ''),
      norm(input.reciboNumero || input.numeroRecibo || input.requerimiento || input.factura || ''),
      dateYMD(input.vence || input.fechaVencimiento || input.vigenciaFin || ''),
      String(parseNum(input.monto || input.total || input.saldo || input.prima || 0))
    ].join('|');
  }
  function isInsurerStatement(input) {
    const p = input && input.conciliacionPropuesta;
    return !!(input && (input.estadoCuentaPago || input.reporteAseguradora || input.aging || input.bucketAging ||
      input.sourceType === 'estado_cuenta_aseguradora' || input.origen === 'estado_cuenta_aseguradora' ||
      (p && p.tipo === 'referencia_estado_cuenta')));
  }
  function isCrmAuthoritative(input) {
    const s=norm(input && (input.sourceType||input.origen||input.fuente||''));
    return !!(input && (input.crmAuthoritative===true || input.confirmadoCRM===true ||
      s==='cobros realizados'||s==='cobros_realizados'||s.includes('crm')||s.includes('siga')));
  }
  function isInsurerAuthoritative(input) {
    const s=norm(input && (input.sourceType||input.origen||input.fuente||''));
    return !!(input && (input.insurerAuthoritative===true || input.confirmadoAseguradora===true ||
      s==='estado cuenta aseguradora'||s==='estado_cuenta_aseguradora'||s.includes('aseguradora')));
  }
  function sameText(a,b){const x=norm(a),y=norm(b);return !x||!y?null:x===y;}
  function sameAmount(a,b,tolerance){
    const x=parseNumNullable(a),y=parseNumNullable(b);
    return x==null||y==null?null:Math.abs(x-y)<=Number(tolerance==null?0.01:tolerance);
  }
  function ref(rec,keys){for(const k of keys){if(rec&&text(rec[k]))return rec[k];}return'';}
  function reconciliationDecision(crm, insurer, expected, ctx) {
    crm=crm||{};insurer=insurer||{};expected=expected||{};
    const tolerance=ctx&&ctx.amountTolerance!=null?ctx.amountTolerance:0.01;
    const checks={
      insurer:sameText(ref(crm,['aseguradoraId','aseguradoraNombre','aseguradora']),ref(insurer,['aseguradoraId','aseguradoraNombre','aseguradora'])),
      policy:sameText(ref(crm,['polizaId','polizaNumero','numeroPoliza','poliza']),ref(insurer,['polizaId','polizaNumero','numeroPoliza','poliza'])),
      currency:sameText(ref(crm,['moneda','currency']),ref(insurer,['moneda','currency'])),
      amount:sameAmount(ref(crm,['monto','total','valor']),ref(insurer,['monto','total','saldo','valor']),tolerance),
      receipt:sameText(ref(crm,['reciboNumero','numeroRecibo','requerimiento']),ref(insurer,['reciboNumero','numeroRecibo','requerimiento'])),
      client:sameText(ref(crm,['clienteId','clienteDocumento','clienteNombre']),ref(insurer,['clienteId','clienteDocumento','clienteNombre'])),
      dueDate:(()=>{const a=dateYMD(ref(crm,['vence','fechaVencimiento','fechaLimite'])),b=dateYMD(ref(insurer,['vence','fechaVencimiento','fechaLimite']));return !a||!b?null:a===b;})()
    };
    const conflicts=Object.keys(checks).filter(k=>checks[k]===false);
    const dualAuthority=isCrmAuthoritative(crm)&&isInsurerAuthoritative(insurer);
    const coreExact=checks.insurer===true&&checks.policy===true&&checks.currency===true&&checks.amount===true;
    const receiptExact=checks.receipt===true;
    const fallbackExact=checks.receipt==null&&checks.client===true&&checks.dueDate===true;
    const expectedMatches=expected&&Object.keys(expected).length?(
      sameText(ref(expected,['polizaId','polizaNumero','numeroPoliza','poliza']),ref(insurer,['polizaId','polizaNumero','numeroPoliza','poliza']))!==false &&
      sameAmount(ref(expected,['monto','total']),ref(insurer,['monto','total','saldo']),tolerance)!==false
    ):true;

    if(conflicts.length)return{status:'requiere_validacion',conciliado:false,autoApply:false,reason:'conflicto_fuentes',conflicts,checks,dualAuthority};
    if(dualAuthority&&coreExact&&(receiptExact||fallbackExact)&&expectedMatches){
      return{status:'conciliado',conciliado:true,autoApply:true,reason:'match_exacto_doble_fuente_autoritativa',conflicts:[],checks,dualAuthority};
    }
    return{status:'pendiente_conciliacion',conciliado:false,autoApply:false,reason:dualAuthority?'match_incompleto':'fuentes_no_suficientes',conflicts:[],checks,dualAuthority};
  }

  function normalizeInsurerReceipt(input, ctx) {
    const fechaCorte = dateYMD(input.fechaCorte || (ctx && ctx.fechaCorte) || todayYMD());
    const monto = parseNumNullable(input.monto || input.total || input.saldo || input.prima || input.primaTotal);
    const vence = dateYMD(input.vence || input.fechaVencimiento || input.vencimiento || input.fechaLimite || '');
    const moneda = input.moneda || input.currency || '', pais = input.pais || input.country || '';
    const aseguradoraId = input.aseguradoraId || '', aseguradoraNombre = input.aseguradoraNombre || input.aseguradora || '';
    const polizaId = input.polizaId || '', polizaNumero = input.polizaNumero || input.numeroPoliza || input.poliza || '';
    const reciboNumero = input.reciboNumero || input.numeroRecibo || input.requerimiento || input.factura || '';
    const bucket = input.bucketAging || input.aging || agingBucket(vence, fechaCorte);
    const missing = [];
    if (!aseguradoraId && !aseguradoraNombre) missing.push('aseguradora');
    if (!polizaId && !polizaNumero) missing.push('poliza');
    if (!moneda) missing.push('moneda');
    if (monto==null) missing.push('monto');

    return {
      _sourceKey: sourceKey(input), tenantId: input.tenantId || (Orbit.tenant && Orbit.tenant.get ? Orbit.tenant.get().id : ''),
      pais, moneda, aseguradoraId, aseguradoraNombre, polizaId, polizaNumero, reciboNumero,
      clienteId: input.clienteId || '', asesorId: input.asesorId || '', fechaCorte, vence, monto,
      bucketAging: bucket, estado: 'pendiente_aseguradora', estadoCartera: 'pendiente_aseguradora',
      estadoConciliacion: missing.length ? 'requiere_validacion' : 'pendiente', confirmadoPago: false,
      carteraOperativa: true, conciliado: false, requiereValidacion: missing.length > 0,
      motivosValidacion: missing, origen: 'estado_cuenta_aseguradora', sourceType:'estado_cuenta_aseguradora',
      archivoFuente: input.archivoFuente || input._archivoFuente || '', hojaFuente: input._origenHoja || input.hojaFuente || '',
      bloqueFuente: input._bloqueOrigen || input.bloqueFuente || '', filaFuente: input._numeroFila || input.filaFuente || '',
      importado: true, reconciliationContractVersion:VERSION
    };
  }
  function estadoCuentaSeed(receipt) {
    return {
      id: 'eca_' + (receipt._sourceKey || Date.now()), tenantId: receipt.tenantId, pais: receipt.pais,
      moneda: receipt.moneda, aseguradoraId: receipt.aseguradoraId, aseguradoraNombre: receipt.aseguradoraNombre,
      fechaCorte: receipt.fechaCorte, archivoFuente: receipt.archivoFuente, hojaFuente: receipt.hojaFuente,
      bloqueFuente: receipt.bloqueFuente, estado: 'importado_pendiente_conciliacion',
      origen: 'estado_cuenta_aseguradora', sourceType:'estado_cuenta_aseguradora', importado: true
    };
  }
  function carteraSeed(receipt) {
    return Object.assign({}, receipt, {
      id: 'car_pri_' + (receipt._sourceKey || Date.now()),
      reciboAseguradoraId: 'rec_asg_' + (receipt._sourceKey || Date.now()),
      estado: 'pendiente_real_reportado_aseguradora', estadoCartera: 'cartera_primas',
      origen: 'estado_cuenta_aseguradora', tipo: 'prima_pendiente', esCxCFinanciera: false
    });
  }
  function conciliacionSeed(receipt, decision) {
    const d=decision||{status:receipt.requiereValidacion?'requiere_validacion':'pendiente',conciliado:false,autoApply:false,reason:'fuente_unica'};
    return {
      id: 'con_pri_' + (receipt._sourceKey || Date.now()), tipo: 'prima', estado: d.status,
      polizaId: receipt.polizaId, polizaNumero: receipt.polizaNumero, reciboNumero: receipt.reciboNumero,
      reciboAseguradoraKey: receipt._sourceKey, monto: receipt.monto, moneda: receipt.moneda,
      fuente: d.conciliado?'crm+estado_cuenta_aseguradora':'estado_cuenta_aseguradora',
      accionPropuesta: d.conciliado?'materializar_cobro_conciliado':'comparar_con_crm_recibo_esperado_y_soporte',
      requiereValidacion: d.status==='requiere_validacion'||receipt.requiereValidacion,
      motivosValidacion: receipt.motivosValidacion || [], conciliado:d.conciliado===true,
      autoApply:d.autoApply===true, reconciliationReason:d.reason||'', reconciliationContractVersion:VERSION,
      creado: todayYMD(), importado: true
    };
  }

  window.Orbit.importaCarteraP0 = {
    VERSION,norm,parseNum,parseNumNullable,dateYMD,agingBucket,sourceKey,isInsurerStatement,
    isCrmAuthoritative,isInsurerAuthoritative,reconciliationDecision,normalizeInsurerReceipt,
    estadoCuentaSeed,carteraSeed,conciliacionSeed
  };
})();
