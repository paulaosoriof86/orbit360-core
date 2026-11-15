/* ============================================================
   Orbit 360 · Cobros/Conciliación · owner canónico
   Fecha: 2026-08-01

   La bandeja canónica lee propuestas generales y proyecta
   conciliaciones de primas sin duplicar escrituras. Durante esta
   La aplicación delega exclusivamente al command autenticado: el
   servidor recupera la evidencia y verifica el recibo antes de escribir.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  Orbit.modules = Orbit.modules || {};

  const VERSION = '20261115-i66-proposal-server-application';
  // The staging projection and FIFO simulator still never write. Only the
  // authenticated domain owns the separately audited application capability.
  const PHASE = 'READ_ONLY_PROPOSALS_WITH_OPERATIONAL_PAYMENT_OWNER';
  const APPLICATION_PHASE = 'SERVER_VERIFIED_PROPOSAL_APPLICATION';
  const CANONICAL_COLLECTION = 'conciliaciones';
  const DOMAIN_COLLECTION = 'conciliacionesPrimas';
  let filterState = '';

  const S = () => Orbit.store;
  const U = () => Orbit.ui || {};
  const K = () => Orbit.kit || {};
  const text = value => String(value == null ? '' : value).trim();
  const norm = value => text(value).toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  const esc = value => U().esc ? U().esc(text(value)) : text(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const money = (value, currency) => U().money ? U().money(Number(value || 0), currency || '') : `${currency || ''} ${Number(value || 0).toFixed(2)}`.trim();
  const safeAll = collection => { try { return S() && S().all ? (S().all(collection) || []) : []; } catch (error) { return []; } };
  const safeGet = (collection,id) => { try { return S() && S().get && id ? S().get(collection,id) : null; } catch (_) { return null; } };
  const parseAmount = value => {
    if (value == null || value === '') return 0;
    const cleaned = String(value).replace(/[^0-9,.-]/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.');
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? Math.round((parsed + Number.EPSILON) * 100) / 100 : 0;
  };
  const ymd = value => {
    const raw = text(value); if (!raw) return '';
    let match = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (match) return `${match[1]}-${String(match[2]).padStart(2,'0')}-${String(match[3]).padStart(2,'0')}`;
    match = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (match) return `${match[3]}-${String(match[2]).padStart(2,'0')}-${String(match[1]).padStart(2,'0')}`;
    return raw.slice(0, 10);
  };
  const first = (row, keys) => { for (const key of keys) if (row && text(row[key])) return row[key]; return ''; };
  const isTechnicalId = value => /^(?:cli_|client_|pol_|rec_|cob_|proposal_|prima:|[0-9a-f]{12,}$)/i.test(text(value));
  function clientDisplayName(row) {
    const id = text(first(row,['clienteId','cliente_id']));
    const fromServer = text(first(row,['clienteNombre','nombreCliente','razonSocialCliente']));
    if (fromServer && !isTechnicalId(fromServer)) return fromServer;
    const client = safeGet('clientes',id);
    const fromClient = client && text(client.nombre || client.razonSocial || client.nombreCompleto ||
      [client.nombres,client.apellidos].filter(Boolean).join(' '));
    if (fromClient && !isTechnicalId(fromClient)) return fromClient;
    const legacy = text(first(row,['cliente']));
    return legacy && !isTechnicalId(legacy) ? legacy : 'Cliente por identificar';
  }
  function policyDisplayNumber(row) {
    const direct = text(first(row,['polizaNumero','numeroPoliza']));
    if (direct) return direct;
    const id = text(first(row,['polizaId','poliza_id']));
    const policy = safeGet('polizas',id);
    const fromPolicy = policy && text(policy.numero);
    if (fromPolicy) return fromPolicy;
    const legacy = text(first(row,['poliza']));
    return legacy && !isTechnicalId(legacy) ? legacy : '';
  }
  const stateLabel = state => ({
    PROPUESTA:'Pendiente de revisión',EN_REVISION:'En revisión',REQUIERE_VALIDACION:'Validación necesaria',
    VALIDADA:'Validada',APLICADA:'Aplicada',RECHAZADA:'Rechazada',BLOQUEADA:'Bloqueada'
  }[state] || 'Por revisar');
  const scoreLabel = score => ({
    MATCH_PROBABLE:'Coincidencia probable',MATCH_EXACTO:'Coincidencia exacta',
    REQUIERE_VALIDACION:'Requiere validación',BLOQUEADO:'No conciliable'
  }[score] || 'Por comprobar');
  const sourceDocumentLabel = value => text(value) === 'Libro activo' ? 'Libro de cobros' : text(value);
  const sourceSheetLabel = value => text(value) === 'Propuestas' ? 'Propuestas de conciliación' : text(value);
  function sourceTraceLabel(row) {
    const parts = [sourceDocumentLabel(row.archivo),sourceSheetLabel(row.hoja)];
    if (/^\d+$/.test(text(row.fila))) parts.push(`Fila ${row.fila}`);
    if (row.periodo) parts.push(row.periodo);
    return parts.filter(Boolean).join(' · ') || 'Documento de origen';
  }
  function countryCurrencyLabel(row) {
    const country = ({GT:'Guatemala',CO:'Colombia'})[row.pais] || row.pais;
    const currency = ({GTQ:'Quetzales',COP:'Pesos colombianos',USD:'Dólares'})[row.moneda] || row.moneda;
    return [country,currency].filter(Boolean).join(' / ') || '—';
  }
  const sourceRef = row => {
    const ref = row && (row.source_ref || row.sourceRef) || {};
    return {
      file: text(ref.file || row.archivo || row.file),
      sheet: text(ref.sheet || row.hoja || row.sheet),
      row: text(ref.row || ref.row_ref || row.fila || row.row),
      block: text(ref.block || row.bloque || row.block),
      period: text(ref.period || row.periodo || row.period)
    };
  };
  const proposalIdentity = row => text(row && (row.proposalIdentity || row._sourceKey || row.sourceKey || (row.source_ref && row.source_ref.row_hash) || (row.sourceRef && row.sourceRef.rowHash))) || [
    norm(first(row,['tipo','source_type','fuente'])),
    norm(first(row,['polizaId','poliza_id','polizaNumero','poliza'])),
    norm(first(row,['reciboId','recibo_id','reciboNumero','requerimiento'])),
    norm(first(row,['moneda','currency'])),
    String(parseAmount(first(row,['monto','total','saldo'])))
  ].join('|');

  function stateFor(row) {
    const raw = norm(first(row,['queue_state','estado_bandeja','estado','status','review_state','estado_revision']));
    if (raw==='aplicada' || raw==='applied') return 'APLICADA';
    if (raw.includes('bloque')) return 'BLOQUEADA';
    if (raw.includes('rechaz')) return 'RECHAZADA';
    if (raw.includes('validada')) return 'VALIDADA';
    if (raw.includes('requiere validacion')) return 'REQUIERE_VALIDACION';
    if (raw.includes('revision')) return 'EN_REVISION';
    return 'PROPUESTA';
  }
  function scoreFor(row) {
    const raw = norm(first(row,['score_decision','decision_score','score','decision','status','estado']));
    if (raw.includes('bloque')) return 'BLOQUEADO';
    if (raw.includes('requiere validacion')) return 'REQUIERE_VALIDACION';
    if (raw.includes('conciliado') || raw.includes('exacto')) return 'MATCH_EXACTO';
    return 'MATCH_PROBABLE';
  }
  function baseProjection(row, sourceCollection) {
    const ref = sourceRef(row || {});
    return {
      id: proposalIdentity(row), sourceCollection, sourceEntityId: text(row && row.id),
      estado: stateFor(row), score: scoreFor(row),
      fuente: text(first(row,['fuente','source_type','sourceType','origen'])) || 'Fuente de conciliación',
      pais: text(first(row,['pais','country'])), moneda: text(first(row,['moneda','currency'])),
      monto: parseAmount(first(row,['monto','total','saldo','primaTotal'])),
      cliente: clientDisplayName(row),
      poliza: policyDisplayNumber(row),
      recibo: text(first(row,['reciboNumero','requerimiento'])),
      archivo: ref.file, hoja: ref.sheet, fila: ref.row, bloque: ref.block, periodo: ref.period,
      motivo: text(first(row,['reason','motivo','estado_revision','review_state'])),
      sourceDifferences: Array.isArray(row && row.sourceDifferences) ? row.sourceDifferences.slice() : [],
      original: row, readOnly: true
    };
  }
  const projectCanonical = row => baseProjection(row, CANONICAL_COLLECTION);
  const projectPremium = row => {
    const projected = baseProjection(row, DOMAIN_COLLECTION);
    projected.id = `prima:${proposalIdentity(row)}`;
    if (!projected.fuente || projected.fuente === 'Fuente de conciliación') projected.fuente = 'Conciliación de prima';
    return projected;
  };
  function proposalRows() {
    const rows = new Map();
    safeAll(DOMAIN_COLLECTION).forEach(row => rows.set(proposalIdentity(row), projectPremium(row)));
    safeAll(CANONICAL_COLLECTION).forEach(row => rows.set(proposalIdentity(row), projectCanonical(row)));
    return Array.from(rows.values()).filter(row => !filterState || row.estado === filterState);
  }

  // A protected collection that has never returned a server snapshot is not
  // an empty ledger. Likewise, a role/country denial is not a zero balance.
  // Never leak raw callable errors or source identifiers into this UI.
  function proposalReadiness() {
    let status = null;
    try { status = S() && typeof S()._productStatus === 'function' ? S()._productStatus() : null; }
    catch (_) { return 'unavailable'; }
    if (!status || !Array.isArray(status.serverConfirmedCollections)) return 'legacy';
    const sources = [CANONICAL_COLLECTION, DOMAIN_COLLECTION];
    if (sources.some(name => (status.deniedCollections || []).includes(name))) return 'denied';
    if (sources.some(name => !!(status.snapshotErrors || {})[name])) return 'unavailable';
    return sources.every(name => status.serverConfirmedCollections.includes(name)) ? 'ready' : 'pending';
  }

  function isHistoricalExigible(row) {
    return !!(row && (row.historicalExigible === true || row.exigible === true ||
      text(row.carteraTipo) === 'cartera_historica_exigible' || text(row.exigibilidad) === 'historica_exigible'));
  }
  function outstanding(row) {
    const direct = first(row,['saldoPendiente','saldo','pendiente','montoPendiente','primaPendiente']);
    if (direct !== '') return Math.max(0, parseAmount(direct));
    const total = parseAmount(first(row,['monto','total','primaTotal']));
    const applied = parseAmount(first(row,['montoAplicado','pagado','totalPagado']));
    return Math.max(0, Math.round((total - applied + Number.EPSILON) * 100) / 100);
  }
  function simulateFifo(payment, obligations, options) {
    const opts = options || {};
    const amount = parseAmount(first(payment || {},['total_recaudado','monto','total','valor']));
    const currency = text(first(payment || {},['moneda','currency']));
    const clientId = text(first(payment || {},['clienteId','cliente_id']));
    const insurerId = text(first(payment || {},['aseguradoraId','aseguradora_id']));
    const policyScope = text(opts.scopePolicyId || '');
    const paymentDate = ymd(first(payment || {},['fecha_recaudo','fechaPago','fecha','date'])) || ymd(new Date().toISOString());
    const seen = new Set();
    const eligible = (Array.isArray(obligations) ? obligations : []).filter(row => {
      const id = text(first(row,['id','reciboId','recibo_id','_sourceKey']));
      if (!id || seen.has(id)) return false;
      seen.add(id);
      const state = norm(first(row,['estado','estadoOperativo','estadoCartera']));
      if (state.includes('pagado') || state.includes('anulado') || row.conciliadoPago === true) return false;
      if (currency && text(first(row,['moneda','currency'])) !== currency) return false;
      if (clientId && text(first(row,['clienteId','cliente_id'])) !== clientId) return false;
      if (insurerId && text(first(row,['aseguradoraId','aseguradora_id'])) !== insurerId) return false;
      if (policyScope && text(first(row,['polizaId','poliza_id'])) !== policyScope) return false;
      if (outstanding(row) <= 0) return false;
      const due = ymd(first(row,['vence','fechaVencimiento','fechaLimite','dueDate']));
      return (due && due <= paymentDate) || isHistoricalExigible(row) || opts.includeFuture === true;
    }).sort((a,b) => {
      const ad = ymd(first(a,['vence','fechaVencimiento','fechaLimite','dueDate'])) || '9999-12-31';
      const bd = ymd(first(b,['vence','fechaVencimiento','fechaLimite','dueDate'])) || '9999-12-31';
      return ad.localeCompare(bd) || text(first(a,['id','reciboId','recibo_id'])).localeCompare(text(first(b,['id','reciboId','recibo_id'])));
    });
    let remaining = Math.max(0, amount);
    const allocations = [];
    for (const row of eligible) {
      if (remaining <= 0) break;
      const balance = outstanding(row);
      const applied = Math.min(balance, remaining);
      remaining = Math.round((remaining - applied + Number.EPSILON) * 100) / 100;
      allocations.push({
        obligationId: text(first(row,['id','reciboId','recibo_id','_sourceKey'])),
        policyId: text(first(row,['polizaId','poliza_id'])),
        dueDate: ymd(first(row,['vence','fechaVencimiento','fechaLimite','dueDate'])),
        historicalExigible: isHistoricalExigible(row), openingBalance: balance, appliedAmount: applied,
        closingBalance: Math.round((balance - applied + Number.EPSILON) * 100) / 100
      });
    }
    const appliedAmount = Math.round((amount - remaining + Number.EPSILON) * 100) / 100;
    return Object.freeze({
      version: VERSION, phase: PHASE, currency, paymentAmount: amount, appliedAmount,
      remainingPayment: remaining, allocations, partial: allocations.some(item => item.closingBalance > 0),
      excess: remaining > 0, reactivatesPolicy: false, writes: 0, operationalWrites: 0
    });
  }

  function blocked() {
    if (U().toast) U().toast('Esta acción estará disponible después de validar la conciliación y autorizar la aplicación.');
    return false;
  }
  function applicationRole() {
    try{return ['direccion','admin','admintenant','superadmin','operativo','finanzas'].includes(norm(Orbit.session&&Orbit.session.rol&&Orbit.session.rol()).replace(/ /g,'_'));}
    catch(_){return false;}
  }
  function renderResolution(row,back,assessment) {
    const panel=back.querySelector('[data-conc-application-targets]');
    const status=back.querySelector('[data-conc-application-status]');
    const domain=Orbit.reconciliationDomain;
    const options=assessment&&assessment.resolutionOptions;
    if(!panel||!status||!Array.isArray(options)||!options.length||
        !domain||typeof domain.resolveProposalApplication!=='function')return;
    const source=assessment.source||{};
    const kinds=[['','Selecciona el documento revisado'],['BANK_STATEMENT_MATCH','Pago bancario confirmado'],
      ['INVOICE_INSTALLMENT_N','Factura de aplicación de la aseguradora'],
      ['COMMISSION_STATEMENT_INSTALLMENT_N','Planilla de comisiones'],
      ['INSURER_STATEMENT_PENDING_FROM_N','Estado de cuenta: pendientes desde esta cuota']];
    panel.innerHTML='<section class="card pad" data-conc-resolution><h3>Vincular el recibo exacto</h3>'+
      '<p>Esta decisión se conserva separada del documento original. Guardar la vinculación no aplica pagos.</p>'+
      '<p class="muted">Fuente: '+esc(source.policyNumber||row.poliza)+' · '+esc(money(source.amount,source.currency))+
      ' · Corte '+esc(source.reportedDate||'por confirmar')+'</p>'+
      '<label>Recibo y vigencia<select class="input" data-conc-resolution-receipt><option value="">Selecciona el recibo</option>'+
      options.map((o,i)=>'<option value="'+i+'"'+(o.alreadyPaid?' disabled':'')+'>'+esc([
        o.policyTerm,o.installment?'Cuota '+o.installment:'',o.receiptNumber?'Recibo '+o.receiptNumber:'',
        o.dueDate?'Vence '+o.dueDate:'',money(o.amount,o.currency),o.alreadyPaid?'Ya pagado':''].filter(Boolean).join(' · '))+'</option>').join('')+
      '</select></label><label>Tipo de fuente<select class="input" data-conc-resolution-type>'+kinds.map(([value,label])=>
        '<option value="'+value+'"'+(source.evidenceType===value?' selected':'')+'>'+label+'</option>').join('')+
      '</select></label><label>Fecha de corte del documento<input class="input" type="date" data-conc-resolution-date value="'+esc(ymd(source.reportedDate))+'"></label>'+
      '<label>Fecha real de pago (obligatoria para soporte bancario)<input class="input" type="date" data-conc-resolution-paid value="'+esc(ymd(source.paidDate))+'"></label>'+
      '<label style="display:flex;gap:8px;margin:12px 0"><input type="checkbox" data-conc-resolution-attested>Confirmo que revisé la fuente y que su tipo, fechas y recibo son los indicados.</label>'+
      '<label>Nota de la decisión<input class="input" data-conc-resolution-reason placeholder="Referencia revisada o aclaración"></label>'+
      (assessment.resolutionOptionsTruncated?'<p role="alert">La lista supera el límite seguro. Se muestran las primeras 100 opciones; no elijas una aproximada.</p>':'')+
      '<button class="btn primary" data-conc-resolve>Guardar vinculación</button></section>';
    const save=back.querySelector('[data-conc-resolve]');
    if(!save)return;
    let saving=false;
    save.onclick=async()=>{
      if(saving)return;
      const field=key=>back.querySelector('[data-conc-resolution-'+key+']');
      const index=field('receipt')&&field('receipt').value;
      const chosen=index!==''&&index!=null&&options[Number(index)];
      if(!chosen||chosen.alreadyPaid||!field('attested')||field('attested').checked!==true){
        status.textContent='Selecciona el recibo exacto y confirma que revisaste la fuente. No se ha cambiado ningún pago.';return;
      }
      const binding={policyId:chosen.policyId,receiptId:chosen.receiptId,
        evidenceType:text(field('type')&&field('type').value),evidenceAsOfDate:text(field('date')&&field('date').value),
        paidDate:text(field('paid')&&field('paid').value),sourceAttestation:true,
        reason:text(field('reason')&&field('reason').value)||'Fuente revisada y recibo exacto confirmado en Conciliaciones'};
      if(!binding.evidenceType||!binding.evidenceAsOfDate||binding.evidenceType==='BANK_STATEMENT_MATCH'&&!binding.paidDate){
        status.textContent='Completa el tipo, el corte de la fuente y, si es bancario, la fecha real del pago.';return;
      }
      saving=true;save.disabled=true;save.textContent='Guardando…';
      try{
        const result=await domain.resolveProposalApplication(row.sourceEntityId,row.original.sourceRunId,binding);
        if(result&&result.status==='REVIEW_REQUIRED'){status.textContent=result.question||result.reason;return;}
        if(!result||result.readbackConfirmed!==true||!result.resolutionId)throw new Error('PROPOSAL_RESOLUTION_NOT_CONFIRMED');
        panel.innerHTML='';
        status.textContent='Vinculación guardada y auditada, sin aplicar pagos. Verificando la aplicación…';
        await verificarAplicacion(row,back);
      }catch(error){status.textContent='No se confirmó la vinculación. Actualiza antes de reintentar; no se aplicó ningún pago desde esta acción.';}
      finally{saving=false;save.disabled=false;save.textContent='Guardar vinculación';}
    };
  }
  async function verificarAplicacion(row,back) {
    const status=back.querySelector('[data-conc-application-status]');
    const targets=back.querySelector('[data-conc-application-targets]');
    const apply=back.querySelector('[data-conc-apply]');
    if(!status||!targets||!apply)return;
    apply.hidden=true;apply.disabled=true;
    if(!applicationRole()){status.textContent='El rol activo puede consultar, pero no aprobar ni aplicar conciliaciones.';return;}
    const domain=Orbit.reconciliationDomain,original=row.original||{};
    if(!original.origenLibroActivo||!original.sourceRunId||!row.sourceEntityId){
      status.textContent='Falta una referencia acreditada al libro de origen. La propuesta no se convertirá en pago.';return;
    }
    if(!domain||typeof domain.previewProposalApplication!=='function'||typeof domain.applyProposalApplication!=='function'){
      status.textContent='El servicio de aplicación de propuestas no está disponible en esta versión.';return;
    }
    status.textContent='Verificando la evidencia, la edición de la póliza y el recibo en el servidor…';
    try{
      const assessment=await domain.previewProposalApplication(row.sourceEntityId,original.sourceRunId);
      if(assessment&&assessment.readbackConfirmed===true&&assessment.applicationId){
        status.textContent='Aplicada y comprobada en el servidor. No se generará otro cobro.';return;
      }
      if(!assessment||assessment.eligible!==true||!assessment.planDigest||!Array.isArray(assessment.targets)||!assessment.targets.length){
        status.textContent=assessment&&(assessment.question||assessment.reason)||'No se confirmó una aplicación elegible. No se han cambiado pagos.';
        renderResolution(row,back,assessment);return;
      }
      targets.innerHTML='<table class="tbl"><thead><tr><th>Cuota</th><th>Tipo</th><th class="num">Importe a aplicar</th></tr></thead><tbody>'+assessment.targets.map(t=>
        '<tr><td>'+esc(t.installment)+'</td><td>'+esc(t.mode==='INFERRED'?'Inferida por evidencia':'Evidencia directa')+'</td><td class="num">'+esc(money(t.amount,assessment.currency))+'</td></tr>').join('')+'</tbody></table>';
      status.textContent='Coincidencia verificada en el servidor. Esta aprobación aplica únicamente las cuotas detalladas; no vuelve a liquidar pagos existentes.';
      apply.hidden=false;apply.disabled=false;
      let inFlight=false;
      apply.onclick=async()=>{
        if(inFlight)return;inFlight=true;apply.disabled=true;apply.textContent='Aplicando…';
        status.textContent='Aplicando y comprobando la persistencia. No cierres esta ficha.';
        try{
          const result=await domain.applyProposalApplication(row.sourceEntityId,original.sourceRunId,assessment.planDigest);
          if(result&&result.status==='REVIEW_REQUIRED'){
            status.textContent=result.question||result.reason;apply.hidden=true;return;
          }
          if(!result||result.ok!==true||result.readbackConfirmed!==true||!result.applicationId)
            throw new Error('PROPOSAL_RESULT_NOT_CONFIRMED');
          status.textContent='Aplicación confirmada y auditada. Actualizando saldos y estado…';
          apply.textContent='Aplicada';
          // Canonical store owns hydration. Reload prevents stale protected
          // page caches from showing the now-applied proposal as pending.
          if(window.location&&typeof window.location.reload==='function')window.location.reload();
        }catch(error){
          const code=text(error&&(error.code||error.message)).replace(/[^a-zA-Z0-9_/-]/g,'').slice(0,80);
          status.textContent='No se confirmó el resultado. Actualiza la ficha antes de reintentar; el servidor impide duplicar la misma aplicación. '+code;
          apply.hidden=true;
        }
      };
    }catch(error){
      const code=text(error&&(error.code||error.message)).replace(/[^a-zA-Z0-9_/-]/g,'').slice(0,80);
      status.textContent='No fue posible verificar la propuesta. No se aplicaron pagos desde esta ficha. '+code;
    }
  }
  function disableLegacyActions() {
    // R9: this module owns only the read-only proposal browser. It must never disable
    // canonical Cobros actions now served by the authenticated reconciliation domain.
    return false;
  }
  function freezeCobrosModule() {
    const module = Orbit.modules && Orbit.modules.cobros;
    if (!module || module.__cobrosConciliacionReadOnlyOwner === VERSION) return false;
    module.__cobrosConciliacionReadOnlyOwner = VERSION;
    module.__cobrosConciliacionPhase = PHASE;
    module.__cobrosCanonicalPaymentOwner = 'modules/cobros.js';
    module.__cobrosPaymentActionsPreserved = true;
    return true;
  }

  function tone(state) {
    return state === 'VALIDADA'||state==='APLICADA' ? 'ok' : state === 'BLOQUEADA' || state === 'RECHAZADA' ? 'danger' : state === 'REQUIERE_VALIDACION' ? 'warn' : 'info';
  }
  function render(host) {
    freezeCobrosModule();
    const readiness = proposalReadiness();
    const rows = readiness === 'ready' || readiness === 'legacy' ? proposalRows() : [];
    const counts = rows.reduce((acc,row) => { acc[row.estado] = (acc[row.estado] || 0) + 1; return acc; },{});
    const filters = ['', 'PROPUESTA','EN_REVISION','REQUIERE_VALIDACION','VALIDADA','APLICADA','RECHAZADA','BLOQUEADA'];
    const banner = K().banner ? K().banner({icon:'🔗',title:'Bandeja de conciliaciones',sub:'Revisión de coincidencias. Ninguna propuesta aplica pagos por sí sola.',features:[]}) : '<div class="card pad"><b>Bandeja de conciliaciones</b><div class="muted">Revisión de coincidencias. Ninguna propuesta aplica pagos por sí sola.</div></div>';
    const noRows = readiness === 'pending'
      ? 'Cargando propuestas autorizadas…'
      : readiness === 'denied'
        ? 'La consulta de propuestas no está autorizada para el rol o país activo.'
        : readiness === 'unavailable'
          ? 'No fue posible verificar las propuestas en el servidor. No se mostrará un saldo cero.'
          : filterState ? 'No hay propuestas para este filtro.'
          : 'No hay propuestas formales confirmadas para esta vista. Los cobros se consultan en Cobros y cartera.';
    const notice = readiness === 'denied' || readiness === 'unavailable'
      ? `<div class="cfg-note" role="alert" data-conc-read-state="${readiness}">${esc(noRows)}</div>`
      : readiness === 'pending'
        ? `<div class="cfg-note" role="status" data-conc-read-state="pending">${esc(noRows)}</div>` : '';
    host.innerHTML = `<div class="page">${banner}
      <div class="cfg-note" style="margin-bottom:12px">Esta bandeja registra propuestas formales, distintas de pagos ya confirmados y pendientes de conciliar. Consultar pagos SIGA y otros orígenes en Cobros y cartera.</div>
      ${notice}
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">${filters.map(state => `<button class="btn ${filterState===state?'primary':'ghost'} sm" data-conc-filter="${state}">${state?state.replaceAll('_',' '):'Todos'}${state?` · ${counts[state]||0}`:''}</button>`).join('')}</div>
      <div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Estado</th><th>Coincidencia</th><th>Fuente</th><th>País / moneda</th><th>Cliente · póliza · recibo</th><th class="num">Monto</th><th>Trazabilidad</th><th></th></tr></thead><tbody>
      ${rows.map(row => `<tr><td><span class="badge ${tone(row.estado)}">${esc(stateLabel(row.estado))}</span></td><td>${esc(scoreLabel(row.score))}</td><td>${esc(row.fuente)}</td><td>${esc(countryCurrencyLabel(row))}</td><td>${esc([row.cliente,row.poliza,row.recibo].filter(Boolean).join(' · ')||'—')}</td><td class="num">${row.moneda?money(row.monto,row.moneda):esc(row.monto||'—')}</td><td style="font-size:12px">${esc(sourceTraceLabel(row))}</td><td><button class="btn ghost sm" data-conc-id="${esc(row.id)}">Ver</button></td></tr>`).join('') || `<tr><td colspan="8" class="muted" style="text-align:center;padding:30px">${esc(noRows)}</td></tr>`}
      </tbody></table></div></div></div>`;
    host.querySelectorAll('[data-conc-filter]').forEach(button => button.addEventListener('click', () => { filterState = button.dataset.concFilter || ''; render(host); }));
    host.querySelectorAll('[data-conc-id]').forEach(button => button.addEventListener('click', () => detalle(button.dataset.concId)));
    disableLegacyActions(document);
  }
  function detalle(id) {
    const row = proposalRows().find(item => item.id === id); if (!row) return;
    const summary = [
      ['Estado',stateLabel(row.estado)],['Coincidencia',scoreLabel(row.score)],['Fuente',row.fuente],
      ['País / moneda',countryCurrencyLabel(row)],['Cliente',row.cliente||'—'],['Póliza',row.poliza||'—'],['Recibo',row.recibo||'—'],
      ['Monto',row.moneda?money(row.monto,row.moneda):row.monto||'—'],['Documento de origen',sourceTraceLabel(row)]
    ];
    let back = document.getElementById('conc-readonly-detail'); if (back) back.remove();
    back = document.createElement('div'); back.id='conc-readonly-detail'; back.className='drawer-back open'; back.style.cssText='display:grid;place-items:center;z-index:210';
    back.innerHTML = `<div class="card" style="width:min(620px,94vw);max-height:88vh;overflow:auto"><div style="padding:18px"><div style="display:flex;justify-content:space-between;gap:12px"><b style="font-family:var(--f-display);font-size:17px">Detalle de conciliación</b><button class="imp-x" data-close>✕</button></div><div class="cfg-note" style="margin:12px 0" role="status" aria-live="polite" data-conc-application-status>Verificando la posibilidad de aplicación…</div>${summary.map(([label,value])=>`<div class="vp-row"><span class="vp-l">${esc(label)}</span><span class="vp-v">${esc(value)}</span></div>`).join('')}<div style="overflow-x:auto;margin-top:12px" data-conc-application-targets></div></div><div style="padding:13px 18px;border-top:1px solid var(--line);display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap"><button class="btn ghost" data-close>Cerrar</button><button class="btn primary" data-conc-apply hidden disabled>Aprobar y aplicar</button></div></div>`;
    document.body.appendChild(back);
    const close=()=>back.remove(); back.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',close)); back.addEventListener('click',event=>{if(event.target===back)close();});
    verificarAplicacion(row,back);
  }

  Orbit.cobrosConciliacionReadOnly = Object.freeze({
    version: VERSION, phase: PHASE, applicationPhase: APPLICATION_PHASE, canonicalCollection: CANONICAL_COLLECTION, domainCollection: DOMAIN_COLLECTION,
    proposalRows, proposalReadiness, simulateFifo, freezeCobrosModule, operationalWrites: 0, firestoreWrites: 0, autoApply: false
  });
  Orbit.modules.conciliaciones = Object.freeze({render, detalle, verificarAplicacion,renderResolution, applicationRole, accion: blocked, filtro(value){filterState=value||'';const host=document.getElementById('host');if(host)render(host);}});
  freezeCobrosModule();
  if (document && document.addEventListener) document.addEventListener('orbit:store', freezeCobrosModule);
})();
