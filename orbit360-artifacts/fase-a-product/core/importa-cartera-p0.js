/* ============================================================
   Orbit 360 · P0 reglas recibos/cartera/conciliacion de primas
   Fecha: 2026-07-31

   Separa recibo esperado, evidencia CRM, estado de aseguradora,
   cartera y conciliacion. Una sola fuente nunca crea cobro.
   El matcher one-to-one permite conciliar dos fuentes autoritativas
   sin ocultar diferencias de fecha/monto entre las fuentes.
   ============================================================ */
(function () {
  window.Orbit = window.Orbit || {};
  const VERSION = '20260731.3';

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
  function round2(v){return Math.round((Number(v)+Number.EPSILON)*100)/100;}
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
  function dateDistanceDays(a,b){
    const x=dateYMD(a),y=dateYMD(b);if(!x||!y)return null;
    const xa=Date.parse(x+'T00:00:00Z'),yb=Date.parse(y+'T00:00:00Z');
    return Number.isFinite(xa)&&Number.isFinite(yb)?Math.abs(Math.round((xa-yb)/86400000)):null;
  }
  function normalizeInstallment(value){
    const s=text(value).toLowerCase();if(!s)return'';
    let m=s.match(/(\d+)\s*(?:de|of|\/)\s*(\d+)/i);
    if(m)return `${Number(m[1])}/${Number(m[2])}`;
    return /^\d+$/.test(s)?String(Number(s)):norm(s);
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
      s==='estado cuenta aseguradora'||s==='estado_cuenta_aseguradora'||s==='reporte cobros aseguradora'||
      s==='reporte_cobros_aseguradora'||s.includes('aseguradora')));
  }
  function sameText(a,b){const x=norm(a),y=norm(b);return !x||!y?null:x===y;}
  function sameAmount(a,b,tolerance){
    const x=parseNumNullable(a),y=parseNumNullable(b);
    return x==null||y==null?null:Math.abs(x-y)<=Number(tolerance==null?0.01:tolerance)+1e-9;
  }
  function ref(rec,keys){for(const k of keys){if(rec&&text(rec[k]))return rec[k];}return'';}
  function canonicalReceiptRef(rec){return ref(rec,['canonicalReceiptId','reciboEsperadoId','dryReceiptIdCandidato','reciboId']);}
  function installmentRef(rec){return normalizeInstallment(ref(rec,['cuota','numeroCuota','serieCuota','pago','serie']));}
  function paymentDateRef(rec){return ref(rec,['fechaPago','fechaPagoReportada','fechaCobro','cobranza']);}
  function dueDateRef(rec){return ref(rec,['vence','fechaVencimiento','fechaLimite']);}

  function pairEvidence(crm, insurer, ctx) {
    crm=crm||{};insurer=insurer||{};ctx=ctx||{};
    const tolerance=ctx.amountTolerance!=null?ctx.amountTolerance:0.01;
    const receiptCanonical=sameText(canonicalReceiptRef(crm),canonicalReceiptRef(insurer));
    const receiptNumber=sameText(ref(crm,['reciboNumero','numeroRecibo','requerimiento','factura']),ref(insurer,['reciboNumero','numeroRecibo','requerimiento','factura']));
    const installment=sameText(installmentRef(crm),installmentRef(insurer));
    const client=sameText(ref(crm,['clienteId','clienteDocumento','clienteNombre']),ref(insurer,['clienteId','clienteDocumento','clienteNombre']));
    const dueDays=dateDistanceDays(dueDateRef(crm),dueDateRef(insurer));
    const payDays=dateDistanceDays(paymentDateRef(crm),paymentDateRef(insurer));
    const amountA=parseNumNullable(ref(crm,['monto','total','primaTotal','valor']));
    const amountB=parseNumNullable(ref(insurer,['monto','total','saldo','primaTotal','valor']));
    const amountOk=amountA!=null&&amountB!=null&&Math.abs(amountA-amountB)<=tolerance+1e-9;
    const core={
      insurer:sameText(ref(crm,['aseguradoraId','aseguradoraNombre','aseguradora']),ref(insurer,['aseguradoraId','aseguradoraNombre','aseguradora'])),
      policy:sameText(ref(crm,['polizaId','polizaNumero','numeroPoliza','poliza']),ref(insurer,['polizaId','polizaNumero','numeroPoliza','poliza'])),
      currency:sameText(ref(crm,['moneda','currency']),ref(insurer,['moneda','currency'])),
      amount:amountOk
    };
    let score=0;const reasons=[],differences=[];
    if(receiptCanonical===true){score+=100;reasons.push('canonical_receipt');}
    if(receiptNumber===true){score+=90;reasons.push('receipt_number');}
    if(installment===true){score+=60;reasons.push('installment');}
    if(dueDays!=null&&dueDays<=Number(ctx.dueDateToleranceDays==null?1:ctx.dueDateToleranceDays)){score+=30;reasons.push('due_date');}
    if(payDays!=null&&payDays<=Number(ctx.paymentDateToleranceDays==null?1:ctx.paymentDateToleranceDays)){score+=30;reasons.push('payment_date');}
    if(client===true){score+=20;reasons.push('client');}
    if(amountA!=null&&amountB!=null&&Math.abs(amountA-amountB)>0){differences.push({field:'monto',crm:amountA,insurer:amountB,delta:round2(amountB-amountA)});}
    if(dueDays!=null&&dueDays>0)differences.push({field:'fechaLimite',crm:dateYMD(dueDateRef(crm)),insurer:dateYMD(dueDateRef(insurer)),days:dueDays});
    if(payDays!=null&&payDays>0)differences.push({field:'fechaPago',crm:dateYMD(paymentDateRef(crm)),insurer:dateYMD(paymentDateRef(insurer)),days:payDays});
    return{core,score,reasons,differences,receiptCanonical,receiptNumber,installment,client,dueDays,payDays,amountA,amountB};
  }

  function reconciliationDecision(crm, insurer, expected, ctx) {
    crm=crm||{};insurer=insurer||{};expected=expected||{};ctx=ctx||{};
    const ev=pairEvidence(crm,insurer,ctx);
    const conflicts=Object.keys(ev.core).filter(k=>ev.core[k]===false);
    const dualAuthority=isCrmAuthoritative(crm)&&isInsurerAuthoritative(insurer);
    const coreExact=ev.core.insurer===true&&ev.core.policy===true&&ev.core.currency===true&&ev.core.amount===true;
    const strongIdentity=ev.receiptCanonical===true||ev.receiptNumber===true||
      (ev.installment===true&&ev.dueDays!=null&&ev.dueDays<=Number(ctx.dueDateToleranceDays==null?1:ctx.dueDateToleranceDays))||
      (ev.client===true&&ev.dueDays===0);
    const expectedMatches=expected&&Object.keys(expected).length?(
      sameText(ref(expected,['polizaId','polizaNumero','numeroPoliza','poliza']),ref(insurer,['polizaId','polizaNumero','numeroPoliza','poliza']))!==false &&
      sameAmount(ref(expected,['monto','total','primaTotal']),ref(insurer,['monto','total','saldo','primaTotal']),ctx.amountTolerance==null?0.01:ctx.amountTolerance)!==false
    ):true;
    if(conflicts.length)return{status:'requiere_validacion',conciliado:false,autoApply:false,reason:'conflicto_fuentes',conflicts,checks:ev.core,dualAuthority,evidence:ev};
    if(dualAuthority&&coreExact&&(strongIdentity||ctx.uniqueCoreMatch===true)&&expectedMatches){
      return{status:'conciliado',conciliado:true,autoApply:true,reason:'match_one_to_one_doble_fuente_autoritativa',conflicts:[],checks:ev.core,dualAuthority,evidence:ev,sourceDifferences:ev.differences};
    }
    return{status:'pendiente_conciliacion',conciliado:false,autoApply:false,reason:dualAuthority?'match_incompleto':'fuentes_no_suficientes',conflicts:[],checks:ev.core,dualAuthority,evidence:ev};
  }

  function reconcileCollections(crmRows, insurerRows, ctx) {
    ctx=ctx||{};const used=new Set(),results=[];
    const crm=(Array.isArray(crmRows)?crmRows:[]).filter(isCrmAuthoritative);
    const insurer=(Array.isArray(insurerRows)?insurerRows:[]).filter(isInsurerAuthoritative);
    insurer.forEach(function(ins,index){
      const eligible=[];
      crm.forEach(function(row){
        const id=text(row.id||row.reciboId||row._sourceKey||'');if(id&&used.has(id))return;
        const ev=pairEvidence(row,ins,ctx);
        if(ev.core.insurer===true&&ev.core.policy===true&&ev.core.currency===true&&ev.core.amount===true){
          eligible.push({row,id,evidence:ev});
        }
      });
      if(!eligible.length){results.push({index,status:'no_match',conciliado:false,autoApply:false,reason:'sin_contraparte_crm'});return;}
      eligible.sort(function(a,b){return b.evidence.score-a.evidence.score;});
      const top=eligible[0],tie=eligible.length>1&&eligible[1].evidence.score===top.evidence.score;
      const uniqueCore=eligible.length===1;
      const strong=top.evidence.score>=60;
      if(!tie&&(uniqueCore||strong)){
        if(top.id)used.add(top.id);
        results.push({
          index,status:ctx.kind==='balance'?'cartera_conciliada':'conciliado',conciliado:true,
          saldoConciliado:ctx.kind==='balance',autoApply:ctx.kind!=='balance',reason:'match_one_to_one_doble_fuente_autoritativa',
          crmId:top.id||'',score:top.evidence.score,evidenceReasons:top.evidence.reasons,sourceDifferences:top.evidence.differences
        });
      }else{
        results.push({index,status:'requiere_validacion',conciliado:false,autoApply:false,reason:tie?'empate_candidatos':'identidad_insuficiente',candidateCount:eligible.length,topScore:top.evidence.score});
      }
    });
    const summary=results.reduce(function(a,r){
      if(r.conciliado)a.conciliados++;else if(r.status==='no_match')a.sinMatch++;else a.hold++;
      if(r.sourceDifferences&&r.sourceDifferences.length)a.conDiferenciasFuente++;
      return a;
    },{total:results.length,conciliados:0,hold:0,sinMatch:0,conDiferenciasFuente:0});
    return{version:VERSION,kind:ctx.kind||'payment',summary,results,oneToOne:true,singleSourceAutoReconciliation:false};
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
      canonicalReceiptId:input.canonicalReceiptId||input.reciboEsperadoId||input.dryReceiptIdCandidato||'',
      cuota:input.cuota||input.numeroCuota||input.pago||input.serieCuota||'',
      clienteId: input.clienteId || '', asesorId: input.asesorId || '', fechaCorte, vence, monto,
      fechaPago:dateYMD(input.fechaPago||input.fechaCobro||input.cobranza||''),
      bucketAging: bucket, estado: 'pendiente_aseguradora', estadoCartera: 'pendiente_aseguradora',
      estadoConciliacion: missing.length ? 'requiere_validacion' : 'pendiente', confirmadoPago: false,
      carteraOperativa: true, conciliado: false, requiereValidacion: missing.length > 0,
      motivosValidacion: missing, origen: input.origen||'estado_cuenta_aseguradora', sourceType:input.sourceType||'estado_cuenta_aseguradora',
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
  function carteraSeed(receipt, decision) {
    const d=decision||{};
    return Object.assign({}, receipt, {
      id: 'car_pri_' + (receipt._sourceKey || Date.now()),
      reciboAseguradoraId: 'rec_asg_' + (receipt._sourceKey || Date.now()),
      estado: d.saldoConciliado?'pendiente_conciliado_aseguradora':'pendiente_real_reportado_aseguradora',
      estadoCartera: 'cartera_primas', estadoConciliacionSaldo:d.saldoConciliado?'conciliado_con_aseguradora':'pendiente',
      saldoConciliado:d.saldoConciliado===true, conciliadoPago:false,
      origen: 'estado_cuenta_aseguradora', tipo: 'prima_pendiente', esCxCFinanciera: false
    });
  }
  function conciliacionSeed(receipt, decision) {
    const d=decision||{status:receipt.requiereValidacion?'requiere_validacion':'pendiente',conciliado:false,autoApply:false,reason:'fuente_unica'};
    return {
      id: 'con_pri_' + (receipt._sourceKey || Date.now()), tipo: 'prima', estado: d.status,
      polizaId: receipt.polizaId, polizaNumero: receipt.polizaNumero, reciboNumero: receipt.reciboNumero,
      reciboAseguradoraKey: receipt._sourceKey, monto: receipt.monto, moneda: receipt.moneda,
      fuente: d.conciliado?'crm+aseguradora':'estado_cuenta_aseguradora',
      accionPropuesta: d.conciliado?(d.saldoConciliado?'marcar_cartera_conciliada':'materializar_cobro_conciliado'):'comparar_con_crm_recibo_esperado_y_soporte',
      requiereValidacion: d.status==='requiere_validacion'||receipt.requiereValidacion,
      motivosValidacion: receipt.motivosValidacion || [], conciliado:d.conciliado===true,
      saldoConciliado:d.saldoConciliado===true,autoApply:d.autoApply===true,
      sourceDifferences:Array.isArray(d.sourceDifferences)?d.sourceDifferences:[],
      reconciliationReason:d.reason||'', reconciliationContractVersion:VERSION,
      creado: todayYMD(), importado: true
    };
  }

  window.Orbit.importaCarteraP0 = {
    VERSION,norm,parseNum,parseNumNullable,dateYMD,dateDistanceDays,normalizeInstallment,agingBucket,sourceKey,isInsurerStatement,
    isCrmAuthoritative,isInsurerAuthoritative,pairEvidence,reconciliationDecision,reconcileCollections,normalizeInsurerReceipt,
    estadoCuentaSeed,carteraSeed,conciliacionSeed
  };
})();
