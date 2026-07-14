/* ============================================================
   Orbit 360 · Aseguradoras OP-2 · recursos operativos v1.223
   Cuentas bancarias visibles/copiables para todo usuario con acceso al
   módulo. Usuarios y contraseñas solo Dirección/Admin/Operativo o extra.
   Los valores por referencia se resuelven desde proveedor seguro.
   v1.223: revelado resistente a re-render por auditoría y estado temporal
   aislado por aseguradora + índice de plataforma.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
(function () {
  const mod = Orbit.modules.aseguradoras;
  const P = Orbit.aseguradorasOperationalAccess;
  const R = Orbit.secureResources;
  const U = Orbit.ui || {};
  if (!mod || !P || !Orbit.store || Orbit.__aseguradorasOp2OperationalResourcesV1218) return;
  Orbit.__aseguradorasOp2OperationalResourcesV1218 = true;

  const S = () => Orbit.store;
  const transient = new Map();
  const clean = v => String(v == null ? '' : v).trim();
  const esc = v => U.esc ? U.esc(clean(v)) : clean(v);
  const toast = v => { try { U.toast(v); } catch (e) {} };
  function query() {
    const h = String(location.hash || '');
    return new URLSearchParams(h.includes('?') ? h.slice(h.indexOf('?') + 1) : '');
  }
  function insurer() {
    const id = query().get('ficha');
    return id ? S().get('aseguradoras', id) : null;
  }
  function state() {
    return mod.__v1197Bridge && mod.__v1197Bridge.state || {};
  }
  function safeUrl(value) {
    if (!value) return '';
    if (Orbit.documentViewer && Orbit.documentViewer.safeUrl) return Orbit.documentViewer.safeUrl(value);
    return /^https:\/\/[^\s]+$/i.test(clean(value)) ? clean(value) : '';
  }
  function statusTone(status) {
    if (status === 'disponible') return 'ok';
    if (status === 'no_disponible') return 'danger';
    return 'warn';
  }
  function bankContext(a, c, index) {
    return P.bankContext({ insurerId:a.id, accountIndex:index, country:a.pais, currency:c.moneda });
  }
  function credentialContext(a, p, index) {
    return P.credentialContext({ insurerId:a.id, platformIndex:index, platform:p.nombre || '', country:a.pais });
  }
  function credentialTransientKey(a, index) {
    return clean(a && a.id) + '|' + String(index);
  }
  function livePlatformRow(index, fallback) {
    const host = document.getElementById('host');
    const body = host && host.querySelector('.asg197-tab-body');
    return body && body.querySelector(`[data-op2-platform="${index}"]`) || fallback || null;
  }

  function bankHtml(a) {
    if (!P.canViewBankAccounts()) return '<div class="empty">Tu rol activo no puede consultar las cuentas de este directorio.</div>';
    const rows = (a.cuentas || []).map((c, index) => {
      const direct = clean(c.numero || c.accountNumber || '');
      const context = bankContext(a, c, index);
      const status = c.accountRef && R && R.fieldStatus ? R.fieldStatus(c.accountRef, context) : null;
      const value = direct || (c.accountRef ? 'Consultando cuenta…' : clean(c.numeroHint || 'Pendiente'));
      const canCopy = P.canCopyBankAccounts();
      const copyDisabled = !canCopy || (!direct && (!status || status.status !== 'disponible'));
      return `<article class="card pad asg218-bank" data-op2-bank="${index}">
        <div class="asg218-resource-head"><span><b>${esc(c.banco || 'Banco / medio de pago')}</b><small>${esc(c.tipo || '')} · ${esc(c.moneda || '')} · ${esc(c.titular || '')}</small></span><span class="badge ${statusTone(status && status.status)}">${esc(direct ? 'Disponible' : (status && (status.status === 'disponible' ? 'Disponible' : status.message) || c.estado || 'Pendiente'))}</span></div>
        <div class="asg218-bank-value"><small>Número de cuenta</small><strong class="mono" data-op2-account-value>${esc(value)}</strong></div>
        <div class="asg218-resource-actions">
          <button class="btn ghost sm" data-op2-copy-account="${index}" ${copyDisabled ? 'disabled' : ''}>Copiar cuenta</button>
          ${c.url && safeUrl(c.url) ? `<button class="btn ghost sm" data-op2-open-payment="${index}">Abrir pago</button>` : ''}
        </div>
        ${c.uso ? `<p class="muted">${esc(c.uso)}</p>` : ''}
      </article>`;
    }).join('');
    return `<div class="asg218-policy-note"><b>Uso operativo:</b> las cuentas bancarias están disponibles para todos los usuarios autorizados del directorio. La plataforma registra la consulta y la copia cuando el valor proviene del proveedor seguro.</div>${rows || '<div class="empty">Sin cuentas o medios de pago registrados.</div>'}`;
  }

  async function hydrateBanks(body, a) {
    const tasks = (a.cuentas || []).map(async (c, index) => {
      if (!c.accountRef || !R || !R.revealField) return;
      const row = body.querySelector(`[data-op2-bank="${index}"]`);
      const value = row && row.querySelector('[data-op2-account-value]');
      const copy = row && row.querySelector('[data-op2-copy-account]');
      if (!row || !value) return;
      const out = await R.revealField(c.accountRef, bankContext(a, c, index));
      if (out && out.ok && out.value) {
        value.textContent = out.value;
        row.dataset.op2AccountVisible = '1';
        if (copy && P.canCopyBankAccounts()) copy.disabled = false;
      } else {
        value.textContent = c.numeroHint || 'Cuenta no disponible';
        row.dataset.op2AccountVisible = '0';
        if (copy) copy.disabled = true;
      }
    });
    await Promise.allSettled(tasks);
  }

  function platformHtml(a) {
    const allowed = P.canViewCredentials();
    const rows = (a.portales || []).map((p, index) => {
      const legacyUser = clean(p.usuario || p.user || '');
      const legacyPass = clean(p.password || p.pass || p.contrasena || '');
      const active = transient.get(credentialTransientKey(a, index)) || {};
      const visibleUser = clean(active.username || legacyUser || p.usuarioHint || 'Pendiente');
      const visiblePass = active.password ? clean(active.password) : (legacyPass ? '••••••••' : 'Pendiente');
      const context = credentialContext(a, p, index);
      const status = p.credentialRef && R && R.credentialStatus ? R.credentialStatus(p.credentialRef, context) : null;
      const available = !!(legacyUser || legacyPass || (status && status.status === 'disponible'));
      const url = safeUrl(p.url || '');
      return `<article class="card pad asg218-platform" data-op2-platform="${index}">
        <div class="asg218-resource-head"><span><b>${esc(p.nombre || 'Plataforma')}</b><small>${esc(p.tipo || '')} · ${esc(p.estadoAcceso || 'Sin verificar')}</small></span><span class="badge ${statusTone(available ? 'disponible' : status && status.status)}">${esc(available ? 'Acceso disponible' : (status && status.message || 'Acceso pendiente'))}</span></div>
        ${allowed ? `<div class="asg218-credentials"><div><small>Usuario</small><strong class="mono" data-op2-username>${esc(visibleUser)}</strong></div><div><small>Contraseña</small><strong class="mono" data-op2-password>${esc(visiblePass)}</strong></div></div><div class="asg218-resource-actions"><button class="btn ghost sm" data-op2-view-credential="${index}" ${available ? '' : 'disabled'}>Ver usuario y contraseña</button><button class="btn ghost sm" data-op2-copy-user="${index}" ${active.username || legacyUser ? '' : 'disabled'}>Copiar usuario</button><button class="btn ghost sm" data-op2-copy-password="${index}" ${active.password || legacyPass || (status && status.status === 'disponible') ? '' : 'disabled'}>Copiar contraseña</button>${url ? `<button class="btn ghost sm" data-op2-open-platform="${index}">Abrir plataforma</button>` : ''}</div>` : `<div class="asg218-restricted"><span class="badge neutral">Credenciales disponibles para Dirección, Administración y Operativo</span>${url ? `<button class="btn ghost sm" data-op2-open-platform="${index}">Abrir plataforma</button>` : ''}</div>`}
      </article>`;
    }).join('');
    return `<div class="asg218-policy-note"><b>Accesos de portal:</b> usuarios y contraseñas se muestran únicamente a Dirección, Administración y Operativo, o a un permiso extra explícito.</div>${rows || '<div class="empty">Sin plataformas registradas.</div>'}`;
  }

  function credentialValues(p, out) {
    return {
      username:clean(out && (out.username || out.user || out.usuario) || p.usuario || p.user || ''),
      password:clean(out && (out.password || out.value || out.secret) || p.password || p.pass || p.contrasena || '')
    };
  }
  function paintCredential(row, values, key, index) {
    if (!row) return;
    const user = row.querySelector('[data-op2-username]');
    const pass = row.querySelector('[data-op2-password]');
    const copyUser = row.querySelector('[data-op2-copy-user]');
    const copyPass = row.querySelector('[data-op2-copy-password]');
    if (user) user.textContent = values.username || 'Pendiente';
    if (pass) pass.textContent = values.password || 'Pendiente';
    if (copyUser) copyUser.disabled = !values.username;
    if (copyPass) copyPass.disabled = !values.password;
    transient.set(key, values);
    clearTimeout(row.__op2HideCredentials);
    row.__op2HideCredentials = setTimeout(() => {
      transient.delete(key);
      const liveRow = livePlatformRow(index, row);
      const livePass = liveRow && liveRow.querySelector('[data-op2-password]');
      if (livePass) livePass.textContent = values.password ? '••••••••' : 'Pendiente';
    }, 15000);
  }

  function wire(body, a) {
    body.querySelectorAll('[data-op2-copy-account]').forEach(button => button.onclick = async () => {
      const index = +button.dataset.op2CopyAccount, c = (a.cuentas || [])[index];
      if (!c || !P.canCopyBankAccounts()) return;
      button.disabled = true;
      if (c.accountRef && R && R.copyField) {
        const out = await R.copyField(c.accountRef, bankContext(a, c, index));
        toast(out && out.ok ? 'Cuenta copiada' : ((out && out.message) || 'Cuenta no disponible'));
      } else {
        const value = clean(c.numero || c.accountNumber || '');
        const ok = value && Orbit.vault && Orbit.vault.copyText ? await Orbit.vault.copyText(value) : false;
        toast(ok ? 'Cuenta copiada' : 'Cuenta no disponible');
      }
      setTimeout(() => { button.disabled = false; }, 500);
    });
    body.querySelectorAll('[data-op2-open-payment]').forEach(button => button.onclick = () => {
      const c = (a.cuentas || [])[+button.dataset.op2OpenPayment];
      const url = c && safeUrl(c.url || '');
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    });
    body.querySelectorAll('[data-op2-open-platform]').forEach(button => button.onclick = () => {
      const p = (a.portales || [])[+button.dataset.op2OpenPlatform];
      const url = p && safeUrl(p.url || '');
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    });
    body.querySelectorAll('[data-op2-view-credential]').forEach(button => button.onclick = async () => {
      const index = +button.dataset.op2ViewCredential, p = (a.portales || [])[index];
      if (!p || !P.canViewCredentials()) return;
      const fallbackRow = button.closest('[data-op2-platform]');
      const key = credentialTransientKey(a, index);
      button.disabled = true;
      let out = null;
      if (p.credentialRef && R && R.revealCredential) out = await R.revealCredential(p.credentialRef, credentialContext(a, p, index));
      const values = credentialValues(p, out);
      if (values.username || values.password) transient.set(key, values);
      enhance(document.getElementById('host'));
      const row = livePlatformRow(index, fallbackRow);
      paintCredential(row, values, key, index);
      if (!values.username && !values.password) toast((out && out.message) || 'Acceso no disponible');
      setTimeout(() => {
        const liveRow = livePlatformRow(index, row);
        const liveButton = liveRow && liveRow.querySelector(`[data-op2-view-credential="${index}"]`);
        if (liveButton) liveButton.disabled = false;
      }, 500);
    });
    body.querySelectorAll('[data-op2-copy-user]').forEach(button => button.onclick = async () => {
      const index = +button.dataset.op2CopyUser, p = (a.portales || [])[index];
      const values = transient.get(credentialTransientKey(a, index)) || credentialValues(p || {}, null);
      const ok = values.username && Orbit.vault && Orbit.vault.copyText ? await Orbit.vault.copyText(values.username) : false;
      toast(ok ? 'Usuario copiado' : 'Primero muestra el acceso para recuperar el usuario completo');
    });
    body.querySelectorAll('[data-op2-copy-password]').forEach(button => button.onclick = async () => {
      const index = +button.dataset.op2CopyPassword, p = (a.portales || [])[index];
      if (!p || !P.canCopyCredentials()) return;
      const values = transient.get(credentialTransientKey(a, index)) || credentialValues(p, null);
      if (values.password) {
        const ok = Orbit.vault && Orbit.vault.copyText ? await Orbit.vault.copyText(values.password) : false;
        toast(ok ? 'Contraseña copiada' : 'No se pudo copiar');
      } else if (p.credentialRef && R && R.copyCredential) {
        const out = await R.copyCredential(p.credentialRef, credentialContext(a, p, index));
        toast(out && out.ok ? 'Contraseña copiada' : ((out && out.message) || 'Acceso no disponible'));
      } else toast('Contraseña no disponible');
    });
  }

  function enhance(host) {
    const a = insurer(), body = host && host.querySelector('.asg197-tab-body');
    if (!a || !body) return;
    const tab = state().tab;
    const roleKey = JSON.stringify(P.status());
    if (tab === 'bancos') {
      const key = a.id + '|' + roleKey;
      if (body.dataset.op2OperationalBanks !== key) {
        body.dataset.op2OperationalBanks = key;
        body.dataset.secureBanksV1202 = a.id;
        body.innerHTML = bankHtml(a);
        wire(body, a);
        hydrateBanks(body, a);
      }
    } else if (tab === 'plataformas') {
      const key = a.id + '|' + roleKey;
      if (body.dataset.op2OperationalPlatforms !== key) {
        body.dataset.op2OperationalPlatforms = key;
        body.innerHTML = platformHtml(a);
        wire(body, a);
      }
    }
  }
  function observe(host) {
    if (!host || host.__op2OperationalResourcesObserver || !window.MutationObserver) return;
    let queued = false;
    const observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      setTimeout(() => { queued = false; enhance(host); }, 0);
    });
    observer.observe(host, { childList:true, subtree:true });
    host.__op2OperationalResourcesObserver = observer;
  }

  const originalRender = mod.render.bind(mod);
  mod.render = function (host) {
    const out = originalRender(host);
    setTimeout(() => { enhance(host); observe(host); }, 20);
    return out;
  };
  setTimeout(() => observe(document.getElementById('host')), 0);
  mod.__op2OperationalResourcesV1218 = { originalRender, enhance, bankHtml, platformHtml };
})();
