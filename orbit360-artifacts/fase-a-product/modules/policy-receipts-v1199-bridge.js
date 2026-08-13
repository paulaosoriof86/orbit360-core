/* ============================================================
   Orbit 360 · Puente operativo Póliza/Recibos/Cobros v1.199
   Conecta formularios y acciones al motor idempotente sin sustituir
   módulos base ni archivos protegidos.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
(function () {
  const E = Orbit.policyReceipts;
  const A = Orbit.access;
  const U = Orbit.ui;
  const S = () => Orbit.store;
  if (!E || !A || Orbit.__policyReceiptsV1199) return;
  Orbit.__policyReceiptsV1199 = true;

  function esc(v) { return U && U.esc ? U.esc(String(v == null ? '' : v)) : String(v || ''); }
  function toast(v) { try { U.toast(v); } catch (e) {} }
  function today() { return U && U.today ? U.today() : new Date().toISOString().slice(0, 10); }
  function plusYear(date) { const d = new Date((date || today()) + 'T00:00:00'); d.setFullYear(d.getFullYear() + 1); return d.toISOString().slice(0, 10); }
  function modal(id, inner, width) {
    let b = document.getElementById(id); if (b) b.remove();
    b = document.createElement('div'); b.id = id; b.className = 'drawer-back open';
    b.style.cssText = 'display:grid;place-items:center;z-index:230';
    b.innerHTML = `<div class="card" style="width:min(${width || 780}px,96vw);max-height:94vh;overflow:auto;padding:0">${inner}</div>`;
    document.body.appendChild(b);
    const close = () => b.remove();
    b.querySelectorAll('[data-close]').forEach(x => x.addEventListener('click', close));
    b.addEventListener('click', e => { if (e.target === b) close(); });
    return b;
  }
  const ERROR_LABELS = {
    tenant_requerido: 'El tenant no está configurado.', cliente_requerido: 'Selecciona un cliente.',
    pais_requerido: 'El cliente necesita país.', moneda_requerida: 'El país necesita moneda configurada.',
    pais_no_coincide_cliente: 'El país de la póliza no coincide con el cliente.',
    moneda_no_coincide_pais: 'La moneda no coincide con la configuración del país.',
    aseguradora_requerida: 'Selecciona una aseguradora.', aseguradora_no_vinculada: 'La aseguradora no está vinculada para operación.',
    aseguradora_no_habilitada_pais: 'La aseguradora no está habilitada para el país del cliente.',
    numero_poliza_requerido: 'Ingresa el número real de póliza.', ramo_requerido: 'Selecciona el ramo.',
    producto_requerido: 'Selecciona el producto o subramo.', estado_requerido: 'Selecciona el estado.',
    vigencia_inicio_requerida: 'Ingresa el inicio de vigencia.', vigencia_fin_requerida: 'Ingresa el fin de vigencia.',
    vigencia_invalida: 'La fecha final debe ser posterior a la inicial.', prima_neta_requerida: 'La prima neta debe ser mayor que cero.',
    cuotas_requeridas: 'La cantidad de recibos no es válida.', motivo_requerido: 'Explica el motivo del cambio.',
    permiso_poliza_denegado: 'Tu rol activo no puede modificar pólizas.', permiso_cobro_denegado: 'Tu rol activo no puede aplicar cobros.',
    reporte_cliente_requiere_validacion: 'Valida primero el pago reportado por el cliente.', poliza_sin_cartera_activa: 'La póliza no tiene cartera activa.',
    pagos_existentes_requieren_endoso: 'La póliza tiene pagos aplicados. Los cambios financieros o de asignación requieren un endoso/gestión controlada.',
    operacion_incompleta: 'La operación quedó marcada para revisión; no la repitas sin verificar.'
  };
  function errorText(errors) { return (errors || []).map(x => ERROR_LABELS[String(x).split(':')[0]] || String(x).replace(/_/g, ' ')).join(' · '); }
  function requestCorrection(client, policyId, action) {
    if (!client) return toast('Cliente no disponible');
    A.correction('Gestión de póliza · ' + client.nombre, 'Solicitud desde Clientes 360: ' + action, { clienteId: client.id, polizaId: policyId || '', asesorId: client.asesorId });
    toast('Gestión creada en Ops');
  }
  function scopedClients() { return A.filter('clientes', S().all('clientes') || [], 'cliente360'); }
  function linkedInsurers(country) { return (S().all('aseguradoras') || []).filter(a => a.vinculada !== false && (a.pais === country || [].concat(a.paises || []).includes(country))); }
  function ramos(country) { try { return Orbit.cat.ramosDe(country) || []; } catch (e) { return []; } }
  function subramos(country, ramo) { try { return Orbit.cat.subramosDe(country, ramo) || []; } catch (e) { return []; } }
  function money(cur, n) { return U.money ? U.money(+n || 0, cur || '') : (cur + ' ' + (+n || 0)); }

  function openPolicyForm(opts) {
    opts = opts || {};
    const existing = opts.policyId ? S().get('polizas', opts.policyId) : null;
    const clients = scopedClients();
    const selectedClient = existing ? S().get('clientes', existing.clienteId) : S().get('clientes', opts.clientId) || clients[0];
    if (!selectedClient || !A.canView('clientes', selectedClient, 'cliente360')) return toast('Cliente fuera de tu alcance');
    if (!E.canManagePolicies()) return requestCorrection(selectedClient, existing && existing.id, existing ? 'editar póliza' : 'crear póliza');

    const start = existing && existing.vigenciaInicio || today();
    const end = existing && existing.vigenciaFin || plusYear(start);
    const country = existing && existing.pais || selectedClient.pais;
    const cur = existing && existing.moneda || A.currencyFor(country);
    const rs = ramos(country), initialRamo = existing && existing.ramo || rs[0] || '';
    const initialSubs = subramos(country, initialRamo), insurers = linkedInsurers(country);
    const frequencies = Object.keys(Orbit.primas.FRECUENCIAS || { Contado: 1 });
    const forms = Orbit.primas.FORMAS_PAGO || ['Transferencia'];
    const status = ['Vigente','Por renovar','Vencida','Cancelada','Anulada','Rechazada','Requiere validación'];
    const inner = `
      <div style="padding:17px 20px;background:linear-gradient(120deg,var(--graph),#10141a);display:flex;justify-content:space-between;align-items:center;gap:12px">
        <div><small style="color:rgba(255,255,255,.65)">Pólizas · operación controlada</small><b style="display:block;font-family:var(--f-display);font-size:18px;color:#fff">${existing ? 'Editar póliza' : 'Nueva póliza'}</b></div>
        <div style="display:flex;gap:8px"><button class="btn ghost sm" data-import style="color:#fff;border-color:rgba(255,255,255,.3)">Importar</button><button class="imp-x" data-close style="color:#fff">✕</button></div>
      </div>
      <div style="padding:18px 20px;display:grid;gap:14px">
        <div class="cfg-note">Vigente y Por renovar generan recibos. Los demás estados quedan como histórico. Los pagos existentes se preservan y ningún recibo se elimina físicamente.</div>
        <div class="cgrid">
          <label class="ce-l">Cliente *<select class="o-sel" data-client>${clients.map(c => `<option value="${esc(c.id)}" ${c.id === selectedClient.id ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('')}</select></label>
          <label class="ce-l">País / moneda<input class="o-sel" data-country value="${esc(country + ' · ' + cur)}" disabled></label>
          <label class="ce-l">Aseguradora *<select class="o-sel" data-insurer>${insurers.map(a => `<option value="${esc(a.id)}" ${existing && a.id === existing.aseguradoraId ? 'selected' : ''}>${esc(a.nombre)}</option>`).join('')}</select></label>
          <label class="ce-l">N.º real de póliza *<input class="o-sel" data-number value="${esc(existing && existing.numero || '')}" placeholder="No se genera un número ficticio"></label>
          <label class="ce-l">Estado *<select class="o-sel" data-status>${status.map(x => `<option ${existing && x === existing.estado ? 'selected' : (!existing && x === 'Vigente' ? 'selected' : '')}>${x}</option>`).join('')}</select></label>
          <label class="ce-l">Ramo *<select class="o-sel" data-ramo>${rs.map(x => `<option ${x === initialRamo ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></label>
          <label class="ce-l">Producto / subramo *<select class="o-sel" data-product>${initialSubs.map(x => `<option ${existing && (existing.producto === x || existing.subramo === x) ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></label>
          <label class="ce-l">Inicio vigencia *<input type="date" class="o-sel" data-start value="${esc(start)}"></label>
          <label class="ce-l">Fin vigencia *<input type="date" class="o-sel" data-end value="${esc(end)}"></label>
          <label class="ce-l">Frecuencia<select class="o-sel" data-frequency>${frequencies.map(x => `<option ${existing && x === existing.frecuencia ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></label>
          <label class="ce-l">Cantidad de recibos<input type="number" min="1" max="24" class="o-sel" data-installments value="${esc(existing && existing.cuotas || Orbit.primas.cuotasDe(existing && existing.frecuencia || 'Contado'))}"></label>
          <label class="ce-l">Forma de pago<select class="o-sel" data-payment-form>${forms.map(x => `<option ${existing && x === existing.formaPago ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></label>
          <label class="ce-l">Conducto<select class="o-sel" data-conduct>${(Orbit.primas.CONDUCTOS || ['Cobro directo del intermediario','Cobro de la aseguradora']).map(x => `<option ${existing && x === existing.conducto ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></label>
          <label class="ce-l">Prima neta *<input type="number" min="0" step="0.01" class="o-sel" data-net value="${esc(existing && existing.primaNeta || 0)}"></label>
          <label class="ce-l">Gastos de emisión<input type="number" min="0" step="0.01" class="o-sel" data-issue value="${esc(existing && existing.gastosEmision || 0)}"></label>
          <label class="ce-l">Otros / asistencias<input type="number" min="0" step="0.01" class="o-sel" data-other value="${esc(existing && existing.otros || 0)}"></label>
          <label class="ce-l">Recargo financiero %<input type="number" min="0" step="0.01" class="o-sel" data-surcharge value="${esc(existing && existing.recargoFinPct != null ? existing.recargoFinPct : '')}"></label>
          <label class="ce-l">Suma asegurada<input type="number" min="0" step="0.01" class="o-sel" data-sum value="${esc(existing && existing.sumaAsegurada || 0)}"></label>
        </div>
        <div class="card pad" data-preview></div>
        <div data-vehicle style="display:none"><b style="font-family:var(--f-display)">Vehículo asegurado</b><div class="cgrid" style="margin-top:8px"><label class="ce-l">Marca / línea<input class="o-sel" data-vbrand></label><label class="ce-l">Placa<input class="o-sel" data-vplate></label><label class="ce-l">Año<input type="number" class="o-sel" data-vyear></label><label class="ce-l">Uso<input class="o-sel" data-vuse value="Particular"></label></div></div>
        ${existing ? '<label class="ce-l">Motivo del cambio *<textarea class="o-sel" data-reason style="min-height:58px"></textarea></label>' : ''}
        <div class="hint error" data-error style="display:none"></div>
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end;position:sticky;bottom:0;background:var(--card)"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-save>${existing ? 'Guardar y sincronizar recibos' : 'Crear póliza y recibos'}</button></div>`;
    const b = modal('policy-v1199', inner, 800), $ = s => b.querySelector(s);
    const clientEl = $('[data-client]'), insurerEl = $('[data-insurer]'), ramoEl = $('[data-ramo]'), productEl = $('[data-product]');
    function client() { return S().get('clientes', clientEl.value) || selectedClient; }
    function refreshCountry() {
      const c = client(), country2 = c.pais || '', currency2 = A.currencyFor(country2);
      $('[data-country]').value = country2 + ' · ' + currency2;
      insurerEl.innerHTML = linkedInsurers(country2).map(a => `<option value="${esc(a.id)}">${esc(a.nombre)}</option>`).join('');
      ramoEl.innerHTML = ramos(country2).map(x => `<option>${esc(x)}</option>`).join(''); refreshProducts();
    }
    function refreshProducts() {
      productEl.innerHTML = subramos(client().pais, ramoEl.value).map(x => `<option>${esc(x)}</option>`).join('');
      $('[data-vehicle]').style.display = /auto|veh/i.test(ramoEl.value) ? '' : 'none'; preview();
    }
    function raw() {
      const c = client(), country2 = c.pais || '', currency2 = A.currencyFor(country2);
      return {
        id: existing && existing.id, tenantId: existing && existing.tenantId || A.tenantId(), clienteId: c.id, asesorId: c.asesorId,
        pais: country2, moneda: currency2, aseguradoraId: insurerEl.value, numero: $('[data-number]').value.trim(), estado: $('[data-status]').value,
        ramo: ramoEl.value, subramo: productEl.value, producto: productEl.value, vigenciaInicio: $('[data-start]').value, vigenciaFin: $('[data-end]').value,
        frecuencia: $('[data-frequency]').value, formaPago: $('[data-payment-form]').value, conducto: $('[data-conduct]').value,
        cuotas: +$('[data-installments]').value || 1, primaNeta: +$('[data-net]').value || 0, gastosEmision: +$('[data-issue]').value || 0,
        otros: +$('[data-other]').value || 0, recargoFinPct: +$('[data-surcharge]').value || 0, sumaAsegurada: +$('[data-sum]').value || 0,
        comAseguradoraPct: existing && existing.comAseguradoraPct || 0, comVendedorPct: existing && existing.comVendedorPct || 0,
        fuente: existing && existing.fuente || 'ingreso_manual_plataforma',
        vehiculo: /auto|veh/i.test(ramoEl.value) ? { marca: $('[data-vbrand]').value.trim(), placa: $('[data-vplate]').value.trim(), anio: $('[data-vyear]').value, uso: $('[data-vuse]').value.trim(), sumaAsegurada: +$('[data-sum]').value || 0 } : null
      };
    }
    function preview() {
      const prepared = E.preparePolicy(raw(), existing || null, 'preview'), recs = E.expectedReceipts(prepared), active = E.isActiveState(prepared.estado);
      $('[data-preview]').innerHTML = `<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><div><small class="muted">Resultado antes de guardar</small><b style="display:block">${active ? recs.length + ' recibo(s) en cartera' : 'Histórico · sin cartera nueva'}</b></div><b>${money(prepared.moneda, prepared.primaTotal)}</b></div><div class="asg197-info-grid" style="margin-top:10px"><div><small>Prima neta</small><b>${money(prepared.moneda, prepared.primaNeta)}</b></div><div><small>Gastos financieros</small><b>${money(prepared.moneda, prepared.gastosFinan)}</b></div><div><small>IVA</small><b>${money(prepared.moneda, prepared.ivaMonto)}</b></div><div><small>Total</small><b>${money(prepared.moneda, prepared.primaTotal)}</b></div></div>`;
    }
    clientEl.addEventListener('change', refreshCountry); ramoEl.addEventListener('change', refreshProducts);
    $('[data-start]').addEventListener('change', () => { if (!$('[data-end]').value) $('[data-end]').value = plusYear($('[data-start]').value); preview(); });
    b.querySelectorAll('input,select').forEach(el => el.addEventListener('input', preview));
    $('[data-import]').addEventListener('click', () => { b.remove(); Orbit.importa.open('polizas', { scope: { clienteId: selectedClient.id } }); });
    $('[data-save]').addEventListener('click', () => {
      const payload = raw(), reason = existing ? $('[data-reason]').value.trim() : 'Alta operativa desde plataforma';
      const result = existing ? E.updatePolicy(existing.id, payload, { motivo: reason }) : E.createPolicy(payload, { motivo: reason });
      const err = $('[data-error]');
      if (!result.ok) { err.style.display = ''; err.textContent = errorText(result.errors); return; }
      err.style.display = 'none'; b.remove(); toast(existing ? 'Póliza actualizada; recibos sincronizados' : 'Póliza creada; recibos generados');
      location.hash = '#/cliente360?c=' + encodeURIComponent(result.policy.clienteId) + '&t=polizas';
    });
    refreshProducts(); preview();
  }

  function openPayment(receiptId) {
    const c = S().get('cobros', receiptId);
    if (!c || !A.canView('cobros', c, 'cobros')) return toast('Recibo fuera de tu alcance');
    if (!E.canApplyPayments()) return toast('Tu rol activo no puede aplicar cobros');
    if (c.reportado && !c.validadoReporte) return toast('Valida primero el pago reportado por el cliente');
    const inner = `<div style="padding:17px 20px;background:linear-gradient(120deg,var(--graph),#10141a);display:flex;justify-content:space-between;align-items:center"><div><small style="color:rgba(255,255,255,.65)">Recaudo comercial</small><b style="display:block;color:#fff">Confirmar pago · ${money(c.moneda, c.monto)}</b></div><button class="imp-x" data-close style="color:#fff">✕</button></div><div style="padding:18px 20px;display:grid;gap:12px"><div class="cfg-note">Confirmar el pago actualiza cartera y producción recaudada. No crea un movimiento financiero de la empresa y queda pendiente de conciliación bancaria.</div><label class="ce-l">Fecha de pago *<input type="date" class="o-sel" data-date value="${today()}"></label><label class="ce-l">Método<select class="o-sel" data-method>${['Transferencia bancaria','Tarjeta de crédito','Tarjeta de débito','Cheque','Efectivo','Domiciliado','Otro'].map(x => `<option>${x}</option>`).join('')}</select></label><label class="ce-l">Motivo / referencia *<input class="o-sel" data-reason placeholder="Ej. Confirmado contra soporte recibido"></label><div class="hint error" data-error style="display:none"></div></div><div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-save>Confirmar pago</button></div>`;
    const b = modal('payment-v1199', inner, 500);
    b.querySelector('[data-save]').onclick = () => {
      const reason = b.querySelector('[data-reason]').value.trim();
      if (!reason) { const e=b.querySelector('[data-error]'); e.style.display=''; e.textContent='Explica la referencia o motivo de confirmación.'; return; }
      const result = E.applyPayment(receiptId, { fecha: b.querySelector('[data-date]').value, metodo: b.querySelector('[data-method]').value }, { motivo: reason });
      if (!result.ok) { const e=b.querySelector('[data-error]'); e.style.display=''; e.textContent=errorText(result.errors); return; }
      b.remove(); toast('Pago confirmado; queda pendiente de conciliación'); const h = document.getElementById('host'); if (h && Orbit.modules.cobros) Orbit.modules.cobros.render(h);
    };
  }

  function openReconciliationProposal(receiptId) {
    const c = S().get('cobros', receiptId);
    if (!c || !A.canView('cobros', c, 'cobros')) return toast('Recibo fuera de tu alcance');
    const inner = `<div style="padding:17px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between"><div><small class="muted">Conciliación</small><b style="display:block">Crear propuesta de cruce</b></div><button class="imp-x" data-close>✕</button></div><div style="padding:18px 20px;display:grid;gap:12px"><div class="cfg-note">Esta acción no concilia el recibo. Crea una propuesta para revisión contra banco, factura o planilla.</div><label class="ce-l">Fuente<select class="o-sel" data-source><option>estado_cuenta_bancario</option><option>planilla_aseguradora</option><option>soporte_pago_plataforma</option></select></label><label class="ce-l">Archivo / referencia<input class="o-sel" data-file placeholder="Nombre del soporte o archivo"></label><label class="ce-l">documentRef<input class="o-sel" data-ref placeholder="Se completa al conectar el repositorio"></label><div class="hint error" data-error style="display:none"></div></div><div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-save>Crear propuesta</button></div>`;
    const b = modal('reconcile-v1199', inner, 500);
    b.querySelector('[data-save]').onclick = () => {
      const result = E.createReconciliationProposal(receiptId, { fuente: b.querySelector('[data-source]').value, archivo: b.querySelector('[data-file]').value.trim(), documentRef: b.querySelector('[data-ref]').value.trim() });
      if (!result.ok) { const e=b.querySelector('[data-error]'); e.style.display=''; e.textContent=errorText(result.errors); return; }
      b.remove(); toast(result.proposal.bloqueos.length ? 'Propuesta creada; requiere documento de soporte' : 'Propuesta creada para revisión'); location.hash = '#/conciliaciones';
    };
  }

  function detailRows(title, rows) {
    modal('policy-kpi-v1199', `<div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between"><b>${esc(title)}</b><button class="imp-x" data-close>✕</button></div><div style="padding:12px 18px 18px">${rows.length ? rows.join('') : '<div class="empty">No hay registros para este indicador.</div>'}</div><div style="padding:12px 18px;border-top:1px solid var(--line);display:flex;justify-content:flex-end"><button class="btn ghost" data-close>Cerrar</button></div>`, 760);
  }
  function policyRow(p) { const c = S().get('clientes', p.clienteId) || {}; return `<button class="asg197-detail-row" data-open-policy="${esc(p.id)}"><span><b>${esc(p.numero)} · ${esc(c.nombre)}</b><small>${esc(p.ramo)} · ${esc(p.estado)} · ${esc(p.moneda)}</small></span><span>Ver póliza →</span></button>`; }
  function receiptRow(c) { const cli = S().get('clientes', c.clienteId) || {}, p = S().get('polizas', c.polizaId) || {}; return `<button class="asg197-detail-row" data-open-receipt="${esc(c.id)}"><span><b>${esc(cli.nombre)} · ${esc(p.numero)}</b><small>${esc(c.cuota)} · ${esc(c.estado)} · ${money(c.moneda,c.monto)}</small></span><span>Ver recibo →</span></button>`; }
  function moneyMap(rows, field) { const out={}; rows.forEach(r=>{const cur=r.moneda||'SIN_MONEDA';out[cur]=(out[cur]||0)+(+r[field]||0);});return out; }
  function mapHtml(map) { const keys=Object.keys(map); return keys.map(k=>`<span style="display:block;font-size:${keys.length>1?'13px':'21px'}">${esc(k)} ${Number(map[k]).toLocaleString('es-GT',{maximumFractionDigits:0})}</span>`).join('')||'0'; }
  function wireDetailModal() { const b=document.getElementById('policy-kpi-v1199'); if(!b)return; b.querySelectorAll('[data-open-policy]').forEach(x=>x.onclick=()=>{b.remove();Orbit.modules.cliente360.verPoliza(x.dataset.openPolicy);}); b.querySelectorAll('[data-open-receipt]').forEach(x=>x.onclick=()=>{b.remove();Orbit.modules.cobros.detalle(x.dataset.openReceipt);}); }
  function enhancePolicies(host) {
    if(!host)return; const rows=A.filter('polizas',S().all('polizas')||[],'polizas'),active=rows.filter(p=>E.isActiveState(p.estado)),renew=rows.filter(p=>A.norm(p.estado)==='porrenovar'),hist=rows.filter(p=>!E.isActiveState(p.estado));
    const premium={}; active.forEach(p=>{const cur=p.moneda||'SIN_MONEDA';premium[cur]=(premium[cur]||0)+(+((p.primaNeta!=null)?p.primaNeta:p.prima)||0);});
    const defs=[['Pólizas activas',String(active.length),'Vigente y Por renovar',()=>{detailRows('Pólizas activas',active.map(policyRow));wireDetailModal();}],['Prima neta vigente',mapHtml(premium),'Separada por moneda',()=>detailRows('Prima neta vigente',Object.keys(premium).map(cur=>`<div class="asg197-detail-row"><span><b>${esc(cur)}</b><small>${active.filter(p=>p.moneda===cur).length} póliza(s)</small></span><span>${Number(premium[cur]).toLocaleString('es-GT')}</span></div>`))],['Por renovar',String(renew.length),'Requieren gestión',()=>{detailRows('Pólizas por renovar',renew.map(policyRow));wireDetailModal();}],['Histórico / sin cartera',String(hist.length),'No genera recibos activos',()=>{detailRows('Pólizas históricas',hist.map(policyRow));wireDetailModal();}]];
    host.querySelectorAll('.kpi-row .kpi').forEach((el,i)=>{const d=defs[i];if(!d)return;el.removeAttribute('onclick');const l=el.querySelector('.k-label'),v=el.querySelector('.k-val'),f=el.querySelector('.k-foot');if(l)l.textContent=d[0];if(v)v.innerHTML=d[1];if(f)f.textContent=d[2];el.onclick=d[3];});
  }
  function enhanceCollections(host) {
    if(!host)return; const rows=A.filter('cobros',S().all('cobros')||[],'cobros').filter(c=>A.norm(c.estado)!=='anulado'),paid=rows.filter(c=>A.norm(c.estado)==='pagado'),pending=rows.filter(c=>A.norm(c.estado)==='pendiente'),overdue=rows.filter(c=>A.norm(c.estado)==='vencido'),reconcile=paid.filter(c=>!c.conciliado);
    const defs=[['Pagado',mapHtml(moneyMap(paid,'monto')),'Recaudo comercial confirmado',()=>{detailRows('Pagos confirmados',paid.map(receiptRow));wireDetailModal();}],['Pendiente',mapHtml(moneyMap(pending,'monto')),'Por vencer',()=>{detailRows('Recibos pendientes',pending.map(receiptRow));wireDetailModal();}],['Vencido',mapHtml(moneyMap(overdue,'monto')),'En gestión',()=>{detailRows('Recibos vencidos',overdue.map(receiptRow));wireDetailModal();}],['Por conciliar',String(reconcile.length),'Pagados sin cruce validado',()=>{detailRows('Pagos por conciliar',reconcile.map(receiptRow));wireDetailModal();}]];
    host.querySelectorAll('.kpi-row .kpi').forEach((el,i)=>{const d=defs[i];if(!d)return;el.removeAttribute('onclick');const l=el.querySelector('.k-label'),v=el.querySelector('.k-val'),f=el.querySelector('.k-foot');if(l)l.textContent=d[0];if(v)v.innerHTML=d[1];if(f)f.textContent=d[2];el.onclick=d[3];});
  }

  const clientMod=Orbit.modules.cliente360;
  if(clientMod){
    clientMod.__policyReceiptsV1199={nuevaPoliza:clientMod.nuevaPoliza,editarPoliza:clientMod.editarPoliza,renovar:clientMod.renovar,endoso:clientMod.endoso};
    clientMod.nuevaPoliza=function(clientId){const c=S().get('clientes',clientId)||scopedClients()[0];if(!c)return toast('No hay clientes disponibles');return openPolicyForm({clientId:c.id});};
    clientMod.editarPoliza=function(policyId){return openPolicyForm({policyId});};
    clientMod.renovar=function(policyId){const p=S().get('polizas',policyId),c=p&&S().get('clientes',p.clienteId);if(c)requestCorrection(c,policyId,'renovación; definir número y vigencia de la nueva póliza');};
    clientMod.endoso=function(policyId){const p=S().get('polizas',policyId),c=p&&S().get('clientes',p.clienteId);if(c)requestCorrection(c,policyId,'endoso; requiere tipo, fecha efectiva y documento');};
  }
  const cob=Orbit.modules.cobros;
  if(cob){
    cob.__policyReceiptsV1199={aplicarPago:cob.aplicarPago,conciliarFactura:cob.conciliarFactura,detalle:cob.detalle,render:cob.render}; cob.aplicarPago=openPayment; cob.conciliarFactura=openReconciliationProposal;
    const originalDetail=cob.detalle.bind(cob); cob.detalle=function(id){const out=originalDetail(id);setTimeout(()=>{const back=document.getElementById('cob-det');if(!back)return;const ap=back.querySelector('#cd-apply');if(ap){const n=ap.cloneNode(true);ap.replaceWith(n);n.onclick=()=>{back.remove();openPayment(id);};}const cc=back.querySelector('#cd-conc');if(cc){const n=cc.cloneNode(true);cc.replaceWith(n);n.textContent='Crear propuesta de conciliación';n.onclick=()=>{back.remove();openReconciliationProposal(id);};}},0);return out;};
    const originalRender=cob.render.bind(cob); cob.render=function(host){const out=originalRender(host);setTimeout(()=>enhanceCollections(host),0);return out;};
  }
  const pol=Orbit.modules.polizas;
  if(pol){const originalRender=pol.render.bind(pol);pol.__policyReceiptsV1199={render:originalRender};pol.render=function(host){const out=originalRender(host);setTimeout(()=>enhancePolicies(host),0);return out;};}
})();
