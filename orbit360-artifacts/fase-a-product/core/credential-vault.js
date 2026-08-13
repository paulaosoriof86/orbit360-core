/* ============================================================
   Orbit 360 · Controles de datos sensibles y credenciales v1.197
   - Datos operativos no secretos: enmascarado, revelado temporal y copia.
   - Contraseñas/API keys: solo credentialRef + proveedor seguro de Carril B.
   Nunca persiste secretos en DOM, Orbit.store, localStorage, seed o logs.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.vault = (function () {
  let seq = 0;
  const transient = Object.create(null);

  function esc(v) {
    try { return Orbit.ui.esc(String(v == null ? '' : v)); } catch (e) {
      return String(v == null ? '' : v).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
    }
  }

  function toast(msg) {
    try { if (Orbit.ui && Orbit.ui.toast) Orbit.ui.toast(msg); } catch (e) {}
  }

  function maskValue(v, mode) {
    const s = String(v || '');
    if (!s) return '—';
    if (mode === 'all') return '•'.repeat(Math.min(Math.max(s.length, 6), 12));
    if (mode === 'left4') return s.slice(0, 4) + '•'.repeat(Math.max(s.length - 4, 3));
    return '•'.repeat(Math.max(s.length - 4, 3)) + s.slice(-4);
  }

  function field(value, opts) {
    opts = opts || {};
    const authorized = opts.authorized !== false;
    const id = 'vlt' + (++seq);
    transient[id] = authorized ? String(value || '') : '';
    const masked = authorized ? maskValue(value, opts.mask || 'right4') : 'Acceso restringido';
    return `<span class="vault-field" data-vlt="${id}" data-vlt-mode="${esc(opts.mask || 'right4')}">
      <span data-vlt-txt>${esc(masked)}</span>
      ${authorized ? `<button type="button" class="btn ghost sm" data-vlt-view="${id}">Ver</button>
      <button type="button" class="btn ghost sm" data-vlt-copy="${id}">Copiar</button>` : '<span class="badge neutral">Restringido</span>'}
    </span>`;
  }

  function credential(ref, opts) {
    opts = opts || {};
    const authorized = opts.authorized === true;
    const status = Orbit.secureResources && Orbit.secureResources.credentialStatus
      ? Orbit.secureResources.credentialStatus(ref, opts.context)
      : { status: 'pendiente_conexion' };
    if (!authorized) return '<span class="badge neutral">Acceso restringido</span>';
    if (!ref) return '<span class="badge neutral">Sin credencial registrada</span>';
    const id = 'cred' + (++seq);
    transient[id] = { ref: String(ref), context: opts.context || {}, label: opts.label || 'Credencial' };
    const label = status.status === 'disponible' ? 'Acceso disponible' : (status.message || 'Pendiente de conexión segura');
    return `<span class="vault-credential" data-cred="${id}">
      <span class="badge ${status.status === 'disponible' ? 'ok' : 'warn'}">${esc(label)}</span>
      <button type="button" class="btn ghost sm" data-cred-view="${id}" ${status.status === 'disponible' ? '' : 'disabled'}>Ver temporalmente</button>
      <button type="button" class="btn ghost sm" data-cred-copy="${id}" ${status.status === 'disponible' ? '' : 'disabled'}>Copiar contraseña</button>
      <span data-cred-value class="vault-secret" aria-live="polite"></span>
    </span>`;
  }

  async function copyText(value) {
    if (!value) return false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch (e) {}
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    ta.remove();
    return ok;
  }

  function wire(container) {
    container = container || document;
    if (container.__orbitVaultWired) return;
    container.__orbitVaultWired = true;
    container.addEventListener('click', async e => {
      const view = e.target.closest('[data-vlt-view]');
      const copy = e.target.closest('[data-vlt-copy]');
      const credView = e.target.closest('[data-cred-view]');
      const credCopy = e.target.closest('[data-cred-copy]');

      if (view) {
        const id = view.dataset.vltView;
        const wrap = container.querySelector(`.vault-field[data-vlt="${id}"]`);
        if (!wrap) return;
        const value = transient[id] || '';
        const txt = wrap.querySelector('[data-vlt-txt]');
        txt.textContent = value || '—';
        view.disabled = true;
        view.textContent = 'Visible';
        clearTimeout(wrap.__hideTimer);
        wrap.__hideTimer = setTimeout(() => {
          txt.textContent = maskValue(value, wrap.dataset.vltMode || 'right4');
          view.disabled = false;
          view.textContent = 'Ver';
        }, 6000);
      }

      if (copy) {
        const ok = await copyText(transient[copy.dataset.vltCopy] || '');
        toast(ok ? 'Copiado al portapapeles' : 'No se pudo copiar');
      }

      if (credView) {
        const item = transient[credView.dataset.credView];
        if (!item || !Orbit.secureResources) return;
        credView.disabled = true;
        const out = await Orbit.secureResources.revealCredential(item.ref, item.context);
        const wrap = container.querySelector(`.vault-credential[data-cred="${credView.dataset.credView}"]`);
        const valueEl = wrap && wrap.querySelector('[data-cred-value]');
        if (out && out.ok && out.value && valueEl) {
          valueEl.textContent = out.value;
          const ttl = Math.min(Math.max(+out.expiresInMs || 6000, 1000), 15000);
          setTimeout(() => { valueEl.textContent = ''; credView.disabled = false; }, ttl);
        } else {
          toast((out && out.message) || 'Acceso no disponible');
          credView.disabled = false;
        }
      }

      if (credCopy) {
        const item = transient[credCopy.dataset.credCopy];
        if (!item || !Orbit.secureResources) return;
        credCopy.disabled = true;
        const out = await Orbit.secureResources.copyCredential(item.ref, item.context);
        toast(out && out.ok ? 'Contraseña copiada de forma segura' : ((out && out.message) || 'Acceso no disponible'));
        setTimeout(() => { credCopy.disabled = false; }, 800);
      }
    });
  }

  function clear() {
    Object.keys(transient).forEach(k => delete transient[k]);
  }

  return { field, credential, wire, maskValue, copyText, clear };
})();
