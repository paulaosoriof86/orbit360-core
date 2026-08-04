/* Orbit 360 · Centro de verificación operativa
   Ejecuta escenarios sintéticos dentro de la plataforma y muestra
   actividad, PASS/FAIL, etapa, diagnóstico y rollback. Solo se activa
   mediante ?orbitVerify=1|auto y nunca contiene datos reales. */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  const VERSION = 'orbit360-runtime-verification-center-v1';
  const params = new URLSearchParams(location.search || '');
  const mode = params.get('orbitVerify') || '';
  if (!/^(1|auto)$/i.test(mode)) return;

  const state = { running: false, results: [], startedAt: '', finishedAt: '', context: null };
  const text = value => String(value == null ? '' : value);
  const cleanError = error => text(error && (error.message || error)).replace(/[\w.+-]+@[\w.-]+/g, '[email]').replace(/[A-Za-z0-9_-]{30,}/g, '[id]').slice(0, 300);
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  function fnNames() {
    const names = window.OrbitBackend && OrbitBackend.functionNames || {};
    return {
      workflow: names.opsLeads || 'orbit360OpsLeadsCommandLabV20260804',
      inbox: names.advisorInbox || 'orbit360GetAdvisorOpsInboxLabV20260804',
      reconciliation: names.reconciliation || 'orbit360CobrosReconciliationCommandLabV20260804',
      recurring: names.recurringImport || 'orbit360RecurringInsuranceImportLabV20260804'
    };
  }
  function callable(name) {
    const region = window.OrbitBackend && OrbitBackend.functionsRegion || 'us-central1';
    if (!window.firebase || typeof firebase.functions !== 'function') throw new Error('Servicio operativo no disponible');
    return firebase.app().functions(region).httpsCallable(name);
  }
  async function call(name, payload) {
    const response = await callable(name)(payload);
    return response && response.data ? response.data : response;
  }
  async function signIn(token) {
    if (!token) throw new Error('Identidad sintética no disponible');
    await firebase.auth().signOut().catch(() => {});
    await firebase.auth().signInWithCustomToken(token);
    await sleep(150);
  }
  function classify(error) {
    const value = cleanError(error).toLowerCase();
    if (/permission|unauth|membership|membres/.test(value)) return 'SECURITY_FAILURE';
    if (/timeout|network|fetch|unavailable/.test(value)) return 'ENVIRONMENT_FAILURE';
    if (/transition|stage|contract|config/.test(value)) return 'DATA_CONTRACT_FAILURE';
    return 'FUNCTIONAL_DEFECT';
  }
  function emit(code, label, status, detail, classification) {
    const item = { code, label, status, detail: text(detail).slice(0, 500), classification: classification || '', at: new Date().toISOString() };
    state.results.push(item);
    paint();
    document.dispatchEvent(new CustomEvent('orbit:verification-step', { detail: item }));
    return item;
  }
  async function step(code, label, action, verify) {
    emit(code, label, 'RUNNING', 'Ejecutando escenario');
    try {
      const value = await action();
      if (verify && verify(value) !== true) throw new Error('Resultado operativo no cumple la condición esperada');
      state.results = state.results.filter(item => !(item.code === code && item.status === 'RUNNING'));
      emit(code, label, 'PASS', 'Flujo confirmado dentro de la plataforma');
      return value;
    } catch (error) {
      state.results = state.results.filter(item => !(item.code === code && item.status === 'RUNNING'));
      emit(code, label, 'FAIL', cleanError(error), classify(error));
      throw error;
    }
  }
  function ensurePanel() {
    let panel = document.getElementById('orbit-verification-center');
    if (panel) return panel;
    panel = document.createElement('aside');
    panel.id = 'orbit-verification-center';
    panel.setAttribute('aria-label', 'Centro de verificación operativa');
    panel.style.cssText = 'position:fixed;right:14px;bottom:14px;width:min(520px,calc(100vw - 28px));max-height:78vh;overflow:auto;z-index:99999;background:#fff;color:#1E2227;border:1px solid #d9d9d9;border-radius:16px;box-shadow:0 20px 70px rgba(0,0,0,.24);font:14px/1.4 Source Sans 3,Arial,sans-serif';
    document.body.appendChild(panel);
    paint();
    return panel;
  }
  function paint() {
    const panel = ensurePanel();
    const passed = state.results.filter(item => item.status === 'PASS').length;
    const failed = state.results.filter(item => item.status === 'FAIL').length;
    const running = state.results.some(item => item.status === 'RUNNING');
    panel.innerHTML = `<div style="padding:16px 18px;border-bottom:1px solid #eee;position:sticky;top:0;background:#fff;z-index:2">
      <div style="display:flex;gap:12px;align-items:flex-start"><div style="flex:1"><div style="font:800 16px Manrope,Arial">Centro de verificación operativa</div><div style="color:#697078;font-size:12px;margin-top:3px">Escenarios reales con datos sintéticos y rollback exacto</div></div><button id="ov-close" class="btn ghost sm" aria-label="Cerrar">×</button></div>
      <div style="display:flex;gap:8px;align-items:center;margin-top:12px"><button id="ov-run" class="btn primary sm" ${state.running ? 'disabled' : ''}>${state.running ? 'Ejecutando…' : 'Ejecutar verificación'}</button><span style="font:600 12px JetBrains Mono,monospace">PASS ${passed} · FAIL ${failed}</span></div>
    </div>
    <div style="padding:12px 18px">${state.results.length ? state.results.map(item => `<div style="display:grid;grid-template-columns:72px 1fr auto;gap:8px;padding:9px 0;border-bottom:1px solid #f0f0f0"><code>${item.code}</code><div><b>${item.label}</b><div style="font-size:12px;color:#697078">${item.detail}</div>${item.classification ? `<div style="font-size:11px;color:#a1152a">${item.classification}</div>` : ''}</div><span style="font-weight:800;color:${item.status === 'PASS' ? '#18794e' : item.status === 'FAIL' ? '#b42318' : '#8a5d00'}">${item.status}</span></div>`).join('') : '<div style="padding:18px 0;color:#697078">La verificación todavía no ha iniciado.</div>'}
      ${!running && state.finishedAt ? `<div style="margin-top:12px;padding:10px;border-radius:10px;background:${failed ? '#fff0f0' : '#edf9f2'}"><b>VEREDICTO: ${failed ? 'FAIL' : 'PASS'}</b><br><span style="font-size:12px">${failed ? 'Se detuvo en la primera causa comprobada.' : 'Todos los escenarios terminaron correctamente.'}</span></div>` : ''}
    </div>`;
    panel.querySelector('#ov-close').onclick = () => panel.remove();
    panel.querySelector('#ov-run').onclick = () => {
      if (state.context) run(state.context).catch(() => {});
      else document.dispatchEvent(new CustomEvent('orbit:verification-request-context'));
    };
  }

  async function run(context) {
    if (state.running) return state;
    state.running = true; state.results = []; state.startedAt = new Date().toISOString(); state.finishedAt = ''; state.context = context;
    const names = fnNames();
    const tenantId = context.tenantId;
    const ids = context.ids;
    const req = (operation, entityId, payload, requestId, reason) => ({ tenantId, operation, entityId, payload, requestId, reason: reason || 'Verificación operativa sintética' });
    try {
      await step('SYS-001', 'Servicios y compuertas activos', async () => {
        const flags = OrbitBackend.featureFlags || {};
        if (!flags.opsLeadsDomainBackendActive || !flags.cobrosReconciliationDomainActive || !flags.recurringInsuranceImportActive) throw new Error('Compuertas operativas inactivas');
        return true;
      }, value => value === true);

      await signIn(context.tokens.direction);
      const business = await step('OP-001', 'Crear oportunidad y verificar idempotencia', async () => {
        const payload = { id: ids.business, nombre: 'Operación sintética', clienteId: ids.client, asesorId: ids.advisorA, pais: 'GT', moneda: 'GTQ', etapa: 'nuevo' };
        const first = await call(names.workflow, req('create_business', ids.business, payload, ids.requests.createBusiness));
        const second = await call(names.workflow, req('create_business', ids.business, payload, ids.requests.createBusiness));
        return { first, second };
      }, value => value.first && value.first.ok === true && value.second && value.second.reused === true);

      let stage = 'nuevo';
      for (const next of ['cotizando', 'propuesta', 'inspeccion', 'emision']) {
        const code = next === 'cotizando' ? 'OP-002' : next === 'propuesta' ? 'OP-003' : next === 'inspeccion' ? 'OP-004' : 'OP-005';
        const expectedOps = ['cotizando', 'inspeccion', 'emision'].includes(next);
        const from = stage;
        const result = await step(code, `Transición ${from} → ${next}`, () => call(names.workflow, req('transition_business', ids.business, { to: next }, ids.requests['transition_' + next])), value => value.ok === true && value.projection && value.projection.leadsVisible === true && value.projection.opsVisible === expectedOps);
        stage = next;
      }

      await step('OP-006', 'Crear gestiones propias y ajenas', async () => {
        const own = await call(names.workflow, req('create_management', ids.managementOwn, { id: ids.managementOwn, titulo: 'Aplicación de pago', clienteId: ids.client, polizaId: ids.policy, asesorId: ids.advisorA, lista: 'Pagos', estado: 'Pendiente' }, ids.requests.managementOwn));
        const other = await call(names.workflow, req('create_management', ids.managementOther, { id: ids.managementOther, titulo: 'Sustitución', clienteId: ids.clientOther, polizaId: ids.policyOther, asesorId: ids.advisorB, lista: 'Endosos', estado: 'Pendiente' }, ids.requests.managementOther));
        return { own, other };
      }, value => value.own.ok === true && value.other.ok === true);

      await step('OP-007', 'Resolver gestión con anotación', () => call(names.workflow, req('resolve_management', ids.managementOwn, { resultado: 'Pago aplicado y confirmado', notificationMessage: 'La gestión fue resuelta.' }, ids.requests.resolveOwn, 'Resolución sintética con anotación')), value => value.ok === true);

      await signIn(context.tokens.advisorA);
      await step('SEC-001', 'Asesor ve únicamente su alcance en Ops', async () => {
        const inbox = await call(names.inbox, { tenantId, limit: 100 });
        return inbox;
      }, value => value.ok === true && value.managements.some(row => row.id === ids.managementOwn) && !value.managements.some(row => row.id === ids.managementOther) && value.businesses.some(row => row.id === ids.business));
      await step('NTF-001', 'Aviso inmediato por gestión resuelta', async () => call(names.inbox, { tenantId, limit: 100 }), value => value.notices.some(row => row.entityId === ids.managementOwn && row.operation === 'resolve_management'));

      await signIn(context.tokens.direction);
      await step('IMP-001', 'Crear lote mensual idempotente', async () => {
        const payload = { batchId: ids.batch, sourceType: 'commission_statement', sourceFileHash: context.sourceHash, sourceFileName: 'fuente-sintetica.xlsx', country: 'GT', currency: 'GTQ', period: '2026-08', mapping: { Poliza: 'policyId', Pais: 'country', Moneda: 'currency', Periodo: 'period', Cuota: 'installment', Comision: 'commission', Estado: 'status' } };
        const first = await call(names.recurring, { tenantId, operation: 'create_batch', payload, reason: 'Crear lote sintético', requestId: ids.requests.createBatch });
        const second = await call(names.recurring, { tenantId, operation: 'create_batch', payload, reason: 'Repetir lote sintético', requestId: ids.requests.createBatch });
        return { first, second };
      }, value => value.first.ok === true && value.second.reused === true);
      await step('IMP-002', 'Mapear, normalizar y ejecutar dry-run', async () => {
        await call(names.recurring, { tenantId, operation: 'stage_rows', payload: { batchId: ids.batch, rows: [{ Poliza: ids.policy, Pais: 'GT', Moneda: 'GTQ', Periodo: '2026-08', Cuota: 3, Comision: 25, Estado: 'Pagado' }] }, reason: 'Preparar fila sintética', requestId: ids.requests.stageBatch });
        return call(names.recurring, { tenantId, operation: 'preview_batch', payload: { batchId: ids.batch }, reason: 'Vista previa', requestId: ids.requests.previewBatch });
      }, value => value.ok === true && value.preview && value.preview.counts && value.preview.counts.ready === 1);
      await step('IMP-003', 'Confirmar evidencia y revertir lote', async () => {
        const confirmed = await call(names.recurring, { tenantId, operation: 'confirm_batch', payload: { batchId: ids.batch }, reason: 'Confirmar evidencia sintética', requestId: ids.requests.confirmBatch });
        const rolled = await call(names.recurring, { tenantId, operation: 'rollback_batch', payload: { batchId: ids.batch }, reason: 'Rollback exacto sintético', requestId: ids.requests.rollbackBatch });
        return { confirmed, rolled };
      }, value => value.confirmed.status === 'CONFIRMED' && value.rolled.status === 'ROLLED_BACK' && value.rolled.deletedEvidence === 1);

      await step('PAY-001', 'Registrar evidencia directa, planilla y cartera', async () => {
        const base = { tenantId, operation: 'register_evidence', reason: 'Evidencia sintética de conciliación' };
        const direct = await call(names.reconciliation, Object.assign({}, base, { payload: { id: ids.evidenceDirect, polizaId: ids.policy, reciboId: ids.receipt4, tipoFuente: 'insurer_payment_report', moneda: 'GTQ', monto: 100, cuota: 4, periodo: '2026-08' }, requestId: ids.requests.evidenceDirect }));
        const commission = await call(names.reconciliation, Object.assign({}, base, { payload: { id: ids.evidenceCommission, polizaId: ids.policy, reciboId: ids.receipt3, tipoFuente: 'commission_statement', moneda: 'GTQ', monto: 100, cuota: 3, comisionAS: 25, periodo: '2026-08' }, requestId: ids.requests.evidenceCommission }));
        const portfolio = await call(names.reconciliation, Object.assign({}, base, { payload: { id: ids.evidencePortfolio, polizaId: ids.policy, reciboId: ids.receipt4, tipoFuente: 'portfolio_statement', moneda: 'GTQ', monto: 100, cuota: 4, completitud: 'completo', periodo: '2026-08' }, requestId: ids.requests.evidencePortfolio }));
        return { direct, commission, portfolio };
      }, value => value.direct.ok && value.commission.ok && value.portfolio.ok);
      await step('PAY-002', 'Conciliación directa e inferencial', () => call(names.reconciliation, { tenantId, operation: 'preview_policy', payload: { polizaId: ids.policy }, reason: 'Vista previa inferencial', requestId: ids.requests.previewPolicy }), value => value.ok === true && value.counts.CONCILIADO_DIRECTO_ASEGURADORA === 1 && value.counts.CONCILIADO_RECONOCIMIENTO_ASEGURADORA === 1 && value.counts.CONCILIADO_SECUENCIA_PLANILLA >= 2);
      await step('PAY-003', 'Aplicar propuesta confirmada al recibo', () => call(names.reconciliation, { tenantId, operation: 'confirm_application', payload: { proposalId: ids.proposal, cobroId: ids.cobro, fechaPago: '2026-08-04', montoAplicado: 100 }, reason: 'Aplicación sintética confirmada', requestId: ids.requests.confirmProposal }), value => value.ok === true && value.cobroId === ids.cobro && value.applied === 100);

      state.finishedAt = new Date().toISOString();
      emit('SYS-999', 'Escenarios operativos completos', 'PASS', 'La plataforma ejecutó los flujos y dejó evidencia para el rollback final');
      return Object.assign({}, state, { ok: true, verdict: 'PASS', business });
    } catch (error) {
      state.finishedAt = new Date().toISOString();
      return Object.assign({}, state, { ok: false, verdict: 'FAIL', error: cleanError(error), classification: classify(error) });
    } finally {
      state.running = false;
      paint();
      document.dispatchEvent(new CustomEvent('orbit:verification-complete', { detail: { ok: !state.results.some(item => item.status === 'FAIL'), results: state.results, startedAt: state.startedAt, finishedAt: state.finishedAt } }));
    }
  }

  ensurePanel();
  Orbit.runtimeVerification = Object.freeze({ VERSION, run, state: () => JSON.parse(JSON.stringify(state)) });
  window.addEventListener('orbit:verification-context', event => { state.context = event.detail; if (mode === 'auto') run(event.detail).catch(() => {}); });
  document.dispatchEvent(new CustomEvent('orbit:verification-ready', { detail: { version: VERSION, auto: mode === 'auto' } }));
})();
