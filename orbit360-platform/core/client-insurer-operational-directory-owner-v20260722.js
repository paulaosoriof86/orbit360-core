/* Orbit 360 · Owner canónico del directorio operativo de Aseguradoras · 2026-07-22
   Usuario visible. Contraseña con revelado temporal. Cuenta visible y copia directa. */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  var Orbit = window.Orbit;
  var VERSION = '20260723.2';
  if (Orbit.clientInsurerOperationalDirectoryOwnerV20260722 && Orbit.clientInsurerOperationalDirectoryOwnerV20260722.version === VERSION) return;

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function esc(value) {
    if (Orbit.ui && Orbit.ui.esc) return Orbit.ui.esc(clean(value));
    return clean(value).replace(/[&<>"']/g, function (c) { return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]; });
  }
  function safeUrl(value) {
    var raw = clean(value);
    if (!raw) return '';
    return /^https?:\/\//i.test(raw) ? raw : 'https://' + raw;
  }
  function currentInsurer() {
    try {
      var id = Orbit.route && Orbit.route.params && Orbit.route.params.ficha;
      return id && Orbit.store && Orbit.store.get ? Orbit.store.get('aseguradoras', id) : null;
    } catch (error) { return null; }
  }
  function portalUser(portal) {
    return clean(portal && (portal.usuario || portal.user || portal.login || portal.emailUsuario || portal.correoUsuario));
  }
  function bankNumber(account) {
    return clean(account && (account.numero || account.numeroCuenta || account.accountNumber));
  }
  function holder(account, insurer) {
    return clean(account && account.titular) || clean(insurer && insurer.nombre) || 'Sin registrar';
  }
  function providerStatus(ref) {
    try {
      return Orbit.secureResources && Orbit.secureResources.credentialStatus
        ? Orbit.secureResources.credentialStatus(ref, { module: 'aseguradoras' })
        : { available: false };
    } catch (error) { return { available: false }; }
  }
  async function copyText(value) {
    try {
      if (Orbit.vault && Orbit.vault.copyText) return await Orbit.vault.copyText(value);
      if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(value); return true; }
    } catch (error) {}
    return false;
  }
  function toast(value) {
    try { if (Orbit.ui && Orbit.ui.toast) Orbit.ui.toast(value); } catch (error) {}
  }
  function fingerprint(value) {
    try { return JSON.stringify(value); } catch (error) { return String(Date.now()); }
  }
  function renderPortalRow(row, insurer, index) {
    var portal = insurer && insurer.portales && insurer.portales[index] || {};
    var user = portalUser(portal);
    var ref = clean(portal.credentialRef);
    var state = providerStatus(ref);
    var fp = fingerprint([portal.nombre, portal.tipo, portal.url, portal.urlHint, portal.pais, portal.estadoAcceso, portal.responsable, portal.ultimaVerificacion, user, ref, state.available, state.revealAvailable, state.copyAvailable]);
    if (row.dataset.odOwnerVersion === VERSION && row.dataset.odFingerprint === fp) return;
    var name = clean(portal.nombre) || 'Plataforma sin nombre';
    var type = clean(portal.tipo);
    var country = clean(portal.pais || insurer.pais);
    var url = clean(portal.url || portal.urlHint);
    var status = clean(portal.estadoAcceso) || 'Sin verificar';
    var owner = clean(portal.responsable) || 'Por confirmar';
    var verified = clean(portal.ultimaVerificacion) || 'Sin verificar';
    var canReveal = !!(ref && (state.revealAvailable || state.available));
    var canCopy = !!(ref && (state.copyAvailable || state.available));
    row.dataset.m1PortalCard = '1';
    row.dataset.odOwnerVersion = VERSION;
    row.dataset.odFingerprint = fp;
    row.className = 'm1-portal-card od-operational-portal-card';
    row.innerHTML = '<div class="m1-portal-head"><div><strong>' + esc(name) + '</strong><span>' + esc([type,country].filter(Boolean).join(' · ') || 'Clasificación pendiente') + '</span></div><span class="badge ' + (/disponible/i.test(status) ? 'ok' : /actualiz/i.test(status) ? 'danger' : 'warn') + '">' + esc(status) + '</span></div>' +
      '<div class="m1-portal-url"><span>URL</span>' + (url ? '<a class="m1-action-link" href="' + esc(safeUrl(url)) + '" target="_blank" rel="noopener">' + esc(url) + '</a>' : '<span class="m1-empty">Sin registrar</span>') + '</div>' +
      '<div class="m1-portal-meta"><div><span>Responsable</span><b>' + esc(owner) + '</b></div><div><span>Última verificación</span><b>' + esc(verified) + '</b></div></div>' +
      '<div class="m1-credential-box od-credential-box"><div class="m1-credential-row"><span class="m1-read-label">Usuario</span><div class="m1-credential-value m1-credential-user" data-od-credential-user>' + esc(user || 'Sin usuario registrado') + '</div></div>' +
      '<div class="m1-credential-row"><span class="m1-read-label">Contraseña</span><div class="m1-credential-value m1-credential-secret" data-od-credential-secret aria-live="polite">Oculta</div></div>' +
      '<div class="m1-contact-actions">' +
        (canReveal ? '<button class="btn ghost sm" type="button" data-od-credential-reveal="' + index + '">Ver temporalmente</button>' : '<button class="btn ghost sm" type="button" disabled>Contraseña no disponible</button>') +
        (canCopy ? '<button class="btn ghost sm" type="button" data-od-credential-copy="' + index + '">Copiar acceso seguro</button>' : '') +
      '</div></div>' +
      (url ? '<div class="m1-contact-actions"><a class="btn primary sm" href="' + esc(safeUrl(url)) + '" target="_blank" rel="noopener">Abrir plataforma</a></div>' : '');
  }
  function renderBankRow(row, insurer, index) {
    var account = insurer && insurer.cuentas && insurer.cuentas[index] || {};
    var number = bankNumber(account);
    var fp = fingerprint([account.banco, account.tipo, number, account.moneda, account.titular, insurer && insurer.nombre]);
    if (row.dataset.odOwnerVersion === VERSION && row.dataset.odFingerprint === fp) return;
    row.dataset.m1BankCard = '1';
    row.dataset.odOwnerVersion = VERSION;
    row.dataset.odFingerprint = fp;
    row.className = 'asg-row m1-bank-card od-operational-bank-card';
    row.innerHTML = '<div class="m1-bank-labels">' +
      '<span>Banco</span><b>' + esc(clean(account.banco) || 'Sin registrar') + '</b>' +
      '<span>Tipo</span><b>' + esc(clean(account.tipo) || 'Sin registrar') + '</b>' +
      '<span>Cuenta</span><div class="m1-bank-number-line"><b data-od-bank-number>' + esc(number || 'Pendiente de registrar') + '</b></div>' +
      '<span>Moneda</span><b>' + esc(clean(account.moneda) || 'Sin registrar') + '</b>' +
      '<span>Titular</span><b>' + esc(holder(account, insurer)) + '</b>' +
      '<span>Acciones</span><div><button class="btn ghost sm" type="button" data-od-bank-copy-all="' + index + '"' + (number ? '' : ' disabled') + '>Copiar datos completos</button></div>' +
      '</div>';
  }
  function render() {
    var root = document.getElementById('asg-ficha');
    var insurer = currentInsurer();
    if (!root || !insurer) return false;
    if (root.querySelector('#af-guardar') || root.classList.contains('od-edit-mode-ready')) return true;
    root.querySelectorAll('#af-portales .asg-row[data-portal]').forEach(function (row) { renderPortalRow(row, insurer, Number(row.dataset.portal)); });
    root.querySelectorAll('#af-cuentas .asg-row[data-cta]').forEach(function (row) { renderBankRow(row, insurer, Number(row.dataset.cta)); });
    var portalsNote = root.querySelector('#af-portales') && root.querySelector('#af-portales').parentElement.querySelector('.cfg-note');
    if (portalsNote) portalsNote.innerHTML = '<b>Directorio operativo:</b> el usuario permanece visible. La contraseña se revela temporalmente según rol y vuelve a Oculta.';
    var accountsSection = root.querySelector('#af-cuentas') && root.querySelector('#af-cuentas').parentElement;
    var accountsNote = accountsSection && accountsSection.querySelector('.cfg-note');
    if (accountsNote) accountsNote.innerHTML = '<b>Directorio operativo:</b> el número de cuenta permanece visible y se copia directamente con banco, tipo, moneda y titular.';
    return true;
  }
  async function onClick(event) {
    var reveal = event.target.closest('[data-od-credential-reveal]');
    var credentialCopy = event.target.closest('[data-od-credential-copy]');
    if (reveal || credentialCopy) {
      event.preventDefault(); event.stopPropagation();
      var insurer = currentInsurer();
      var index = Number((reveal || credentialCopy).dataset[reveal ? 'odCredentialReveal' : 'odCredentialCopy']);
      var portal = insurer && insurer.portales && insurer.portales[index];
      var ref = clean(portal && portal.credentialRef);
      var user = portalUser(portal);
      if (!ref || !Orbit.secureResources) { toast('Contraseña no disponible.'); return; }
      var out = reveal
        ? await Orbit.secureResources.revealCredential(ref, { module:'aseguradoras', insurerId:insurer.id, portalIndex:index })
        : await Orbit.secureResources.revealCredential(ref, { module:'aseguradoras', insurerId:insurer.id, portalIndex:index });
      if (!out || out.ok === false || !clean(out.value)) { toast(out && out.message || 'Contraseña no disponible.'); return; }
      if (reveal) {
        var secret = reveal.closest('.od-credential-box') && reveal.closest('.od-credential-box').querySelector('[data-od-credential-secret]');
        if (secret) {
          secret.textContent = out.value;
          setTimeout(function () { secret.textContent = 'Oculta'; }, out.expiresInMs || 6000);
        }
        toast('Contraseña visible temporalmente');
      } else {
        var copied = await copyText(['Usuario: ' + (user || '—'), 'Contraseña: ' + out.value].join('\n'));
        toast(copied ? 'Acceso copiado de forma segura' : 'No fue posible copiar el acceso');
      }
      return;
    }
    var bank = event.target.closest('[data-od-bank-copy-all]');
    if (bank) {
      event.preventDefault(); event.stopPropagation();
      var current = currentInsurer();
      var account = current && current.cuentas && current.cuentas[Number(bank.dataset.odBankCopyAll)];
      var number = bankNumber(account);
      if (!current || !account || !number) { toast('Número de cuenta pendiente de registrar'); return; }
      var text = ['Banco: ' + (clean(account.banco) || '—'), 'Tipo: ' + (clean(account.tipo) || '—'), 'Cuenta: ' + number, 'Moneda: ' + (clean(account.moneda) || '—'), 'Titular: ' + holder(account, current)].join('\n');
      var ok = await copyText(text);
      toast(ok ? 'Datos bancarios completos copiados' : 'No fue posible copiar');
    }
  }

  var scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () { scheduled = false; render(); });
  }
  document.addEventListener('click', onClick, true);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('orbit:store:emit', schedule);
  window.addEventListener('orbit:operational-directory-fields-updated', schedule);
  document.addEventListener('orbit:session', schedule);
  if (window.MutationObserver) {
    var host = document.getElementById('host');
    if (host) new MutationObserver(schedule).observe(host, { childList:true, subtree:true });
  }
  Orbit.clientInsurerOperationalDirectoryOwnerV20260722 = {
    version: VERSION,
    ownerId: 'clientInsurerOperationalDirectoryOwner',
    supersedesBankAndPortalSectionsOf: 'client-insurer-visual-contract-v20260720',
    usernameOperationalVisible: true,
    passwordProtectedTemporaryReveal: true,
    bankNumberOperationalVisible: true,
    bankRevealDependency: false,
    bankCopyDirect: true,
    bankCopyFields: ['banco','tipo','numero','moneda','titular'],
    bankCopyExcludesUse: true,
    bankHolderFallbackInsurer: true,
    skipsEditMode: true,
    writesStore: false,
    reimportsData: false,
    render: render
  };
  schedule();
})();
