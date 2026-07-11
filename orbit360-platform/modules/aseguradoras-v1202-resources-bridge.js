/* ============================================================
   Orbit 360 · Aseguradoras v1.202 — recursos y calidad
   Completa la ficha para directorios importados:
   - hints sanitizados de usuarios;
   - cuentas por accountRef con revelado/copia temporal;
   - origen, calidad y relación con Cotizador.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
(function () {
  const mod = Orbit.modules.aseguradoras;
  const R = Orbit.secureResources;
  const U = Orbit.ui;
  const S = () => Orbit.store;
  if (!mod || !R || !mod.__v1197Bridge || mod.__resourcesV1202) return;

  function esc(v) { return U && U.esc ? U.esc(String(v == null ? '' : v)) : String(v || ''); }
  function toast(v) { try { U.toast(v); } catch (e) {} }
  function query() { const h = String(location.hash || ''); return new URLSearchParams(h.includes('?') ? h.slice(h.indexOf('?') + 1) : ''); }
  function insurer() { const id = query().get('ficha'); return id ? S().get('aseguradoras', id) : null; }
  function canSensitive() { return !!(mod.__v1197Bridge.canSensitive && mod.__v1197Bridge.canSensitive()); }
  function state() { return mod.__v1197Bridge.state || {}; }
  function statusBadge(status) {
    const s = status || {};
    const tone = s.status === 'disponible' ? 'ok' : s.status === 'no_disponible' ? 'danger' : 'warn';
    const text = s.status === 'disponible' ? 'Disponible' : (s.message || (s.status === 'sin_referencia' ? 'Sin referencia' : 'Pendiente de conexión segura'));
    return `<span class="badge ${tone}">${esc(text)}</span>`;
  }
  function qualityBanner(a) {
    const src = a.fuenteDirectorio || {};
    const alerts = [].concat(a.validacionAlertas || []);
    const sensitive = a.sensitiveImportStatus || {};
    const readiness = (a.ramos || []).some(r => a.ramosHabilitados && a.ramosHabilitados[r] && a.ramosHabilitados[r].cotizador === true);
    const status = a.requiereValidacion || alerts.length ? 'Requiere validación' : (a.ultimaRevision ? 'Revisada' : 'Pendiente de revisión');
    return `<section class="card pad" data-dir-quality style="margin-bottom:12px;border-left:3px solid ${a.requiereValidacion ? 'var(--danger)' : 'var(--warn)'}"><div class="asg197-section-head"><div><small>Calidad y origen del directorio</small><h3>${esc(status)}</h3></div><span class="badge ${a.requiereValidacion ? 'danger' : 'warn'}">${alerts.length} alerta(s)</span></div><div class="asg197-info-grid"><div><small>Fuente</small><b>${esc(src.archivo || a.fuente || 'Carga manual')}</b></div><div><small>Hoja</small><b>${esc(src.hoja || '—')}</b></div><div><small>País / moneda</small><b>${esc(a.pais || '—')} · ${esc(a.monedaBase || (a.pais === 'CO' ? 'COP' : 'GTQ'))}</b></div><div><small>Contactos</small><b>${(a.contactos || []).length}</b></div><div><small>Plataformas</small><b>${(a.portales || []).length}</b></div><div><small>Bancos/pagos</small><b>${(a.cuentas || []).length}</b></div><div><small>Recursos sensibles</small><b>${(+sensitive.credentialsDetected || 0) + (+sensitive.accountsDetected || 0)} · ${esc(sensitive.status || 'sin_sensibles')}</b></div><div><small>Cotizador</small><b>${readiness ? 'Algún producto habilitado' : 'No habilitada por directorio'}</b></div></div>${alerts.length ? `<div class="cfg-note" style="margin-top:10px">Pendientes: ${alerts.map(esc).join(' · ')}</div>` : ''}<p class="muted" style="font-size:12px;margin:10px 0 0">Importar contactos o accesos no habilita tarifas. Cotizador y Comparativo continúan en default-deny hasta validar producto, país, moneda, plan y fuente.</p></section>`;
  }
  function accountHtml(a) {
    const authorized = canSensitive();
    const rows = (a.cuentas || []).map((c, index) => {
      const context = { module: 'aseguradoras', insurerId: a.id, accountIndex: index, fieldType: 'bank_account', country: a.pais, currency: c.moneda };
      if (c.accountRef) {
        const status = R.fieldStatus ? R.fieldStatus(c.accountRef, context) : { status: 'pendiente_conexion', message: 'Pendiente de conexión segura' };
        return `<div class="card pad asg197-bank" data-sec-account="${index}"><div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap"><span><b>${esc(c.banco || 'Banco / medio de pago')}</b><small style="display:block">${esc(c.tipo || '')} · ${esc(c.moneda || '')} · ${esc(c.uso || '')}</small></span>${authorized ? statusBadge(status) : '<span class="badge neutral">Acceso restringido</span>'}</div><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px"><span class="mono" data-field-value>${esc(c.numeroHint || '••••')}</span>${authorized ? `<button class="btn ghost sm" data-field-view="${index}" ${status.status === 'disponible' ? '' : 'disabled'}>Ver temporalmente</button><button class="btn ghost sm" data-field-copy="${index}" ${status.status === 'disponible' ? '' : 'disabled'}>Copiar cuenta</button>` : ''}${c.url ? `<button class="btn ghost sm" data-open-payment="${esc(c.url)}">Abrir pago</button>` : ''}</div></div>`;
      }
      const field = Orbit.vault ? Orbit.vault.field(c.numero || '', { authorized, mask: 'right4' }) : esc(c.numeroHint || c.numero || '—');
      return `<div class="card pad asg197-bank"><div><b>${esc(c.banco || 'Banco / medio de pago')}</b><small style="display:block">${esc(c.tipo || '')} · ${esc(c.moneda || '')} · ${esc(c.uso || '')}</small></div><div style="margin-top:8px">${field}</div></div>`;
    }).join('');
    return rows || '<div class="empty">Sin cuentas o medios de pago registrados.</div>';
  }
  function wireAccounts(host, a) {
    host.querySelectorAll('[data-field-view]').forEach(button => button.onclick = async () => {
      const index = +button.dataset.fieldView, c = (a.cuentas || [])[index]; if (!c || !c.accountRef) return;
      const context = { module: 'aseguradoras', insurerId: a.id, accountIndex: index, fieldType: 'bank_account', country: a.pais, currency: c.moneda };
      button.disabled = true;
      const out = await R.revealField(c.accountRef, context);
      const wrap = button.closest('[data-sec-account]'), value = wrap && wrap.querySelector('[data-field-value]');
      if (out && out.ok && out.value && value) {
        value.textContent = out.value;
        const ttl = Math.min(Math.max(+out.expiresInMs || 6000, 1000), 15000);
        setTimeout(() => { value.textContent = c.numeroHint || '••••'; button.disabled = false; }, ttl);
      } else { toast((out && out.message) || 'Acceso no disponible'); button.disabled = false; }
    });
    host.querySelectorAll('[data-field-copy]').forEach(button => button.onclick = async () => {
      const index = +button.dataset.fieldCopy, c = (a.cuentas || [])[index]; if (!c || !c.accountRef) return;
      const context = { module: 'aseguradoras', insurerId: a.id, accountIndex: index, fieldType: 'bank_account', country: a.pais, currency: c.moneda };
      button.disabled = true;
      const out = await R.copyField(c.accountRef, context);
      toast(out && out.ok ? 'Cuenta copiada de forma segura' : ((out && out.message) || 'Acceso no disponible'));
      setTimeout(() => { button.disabled = false; }, 800);
    });
    host.querySelectorAll('[data-open-payment]').forEach(button => button.onclick = () => {
      const url = Orbit.documentViewer && Orbit.documentViewer.safeUrl ? Orbit.documentViewer.safeUrl(button.dataset.openPayment) : '';
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    });
  }
  function enhancePlatforms(host, a) {
    const cards = host.querySelectorAll('.asg197-platform');
    (a.portales || []).forEach((p, index) => {
      const card = cards[index]; if (!card || card.querySelector('[data-user-hint]') || !p.usuarioHint) return;
      const hint = document.createElement('div'); hint.dataset.userHint = '1'; hint.className = 'muted'; hint.style.cssText = 'font-size:11.5px;margin-top:6px';
      hint.textContent = 'Usuario registrado: ' + p.usuarioHint + ' · valor completo disponible solo mediante conexión segura autorizada.';
      card.appendChild(hint);
    });
  }
  function enhance(host) {
    const a = insurer(); if (!a || !host) return;
    const body = host.querySelector('.asg197-tab-body'); if (!body) return;
    if (!host.querySelector('[data-dir-quality]')) {
      const wrap = document.createElement('div'); wrap.innerHTML = qualityBanner(a);
      const section = wrap.firstElementChild;
      const tabs = host.querySelector('.asg197-tabs');
      if (tabs && tabs.parentNode) tabs.parentNode.insertBefore(section, tabs.nextSibling);
    }
    if (state().tab === 'bancos') {
      body.innerHTML = accountHtml(a);
      wireAccounts(body, a);
      if (Orbit.vault) Orbit.vault.wire(body);
    } else if (state().tab === 'plataformas') enhancePlatforms(body, a);
  }

  const originalRender = mod.render.bind(mod);
  mod.render = function (host) {
    const out = originalRender(host);
    setTimeout(() => enhance(host), 10);
    return out;
  };
  mod.__resourcesV1202 = { originalRender };
})();
