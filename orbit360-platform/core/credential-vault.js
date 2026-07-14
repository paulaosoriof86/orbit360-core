/* Orbit 360 · Patrón de bóveda de credenciales (UI reusable)
   Orbit NUNCA guarda secretos reales (contraseñas, API keys) — ver
   ADDENDUM de patrones. Este componente es para cualquier dato SENSIBLE
   que sí vive en el store pero no debe quedar expuesto en pantalla por
   defecto (números de cuenta, referencias de credencial, códigos internos):
   se muestra enmascarado, con "Ver" temporal (se oculta solo) y "Copiar".

   Uso:
     Orbit.vault.field(valorReal, { mask: 'right4' | 'left4' | 'all', label })
       → devuelve el HTML del control (span + botones)
   Requiere llamar Orbit.vault.wire(container) después de insertar el HTML
   para conectar los botones (usa event delegation, así que basta llamarlo
   una vez por contenedor persistente, p.ej. al montar el módulo). */
window.Orbit = window.Orbit || {};
Orbit.vault = (function () {
  let seq = 0;
  const store = {}; // id -> valor real (vive en memoria de la sesión, nunca en el DOM)
  const revealUntil = {}; // id -> timestamp ms hasta el que debe verse revelado (sobrevive a un re-render del host)
  const restrictedMap = {}; // id -> bool, capturado al render para el chequeo de copiar
  const ctxMap = {}; // id -> { aseguradoraId, key } para auditoría

  function maskValue(v, mode) {
    const s = String(v || '');
    if (!s) return '—';
    if (mode === 'all') return '•'.repeat(Math.min(s.length, 10));
    if (mode === 'left4') return s.slice(0, 4) + '•'.repeat(Math.max(s.length - 4, 3));
    // right4 (default): conserva los últimos 4, oculta el resto
    return '•'.repeat(Math.max(s.length - 4, 3)) + s.slice(-4);
  }

  function isRestricted() {
    // Asesor nunca revela/copia credenciales; Dirección/Admin/Operativo/Finanzas sí.
    try { return !!(window.Orbit && Orbit.session && Orbit.session.esAsesor && Orbit.session.esAsesor()); } catch (e) { return false; }
  }

  /* opts.key: identificador ESTABLE entre renders, p.ej. `${aseguradoraId}|${platformIndex}`.
     Si no se pasa, se usa un seq interno (menos robusto a re-render, pero nunca colisiona). */
  function auditar(accion, id, extra) {
    try {
      const rol = (window.Orbit && Orbit.session && Orbit.session.rol) ? Orbit.session.rol() : '—';
      const actor = (window.Orbit && Orbit.auth && Orbit.auth.user && Orbit.auth.user()) ? Orbit.auth.user().nombre : rol;
      const ctx = ctxMap[id] || {};
      extra = extra || {};
      if (window.Orbit && Orbit.store && Orbit.store.insert) {
        Orbit.store.insert('auditLog', { id: 'aud' + Date.now() + Math.random().toString(36).slice(2, 6), fecha: (Orbit.ui && Orbit.ui.today ? Orbit.ui.today() : new Date().toISOString().slice(0, 10)), actor, rolActivo: rol, accion, campo: id, tipoDato: ctx.tipoDato || (ctx.modulo && ctx.modulo.indexOf('banco') >= 0 ? 'cuenta_bancaria' : 'credencial_plataforma'), aseguradoraId: ctx.aseguradoraId || '', plataformaId: ctx.key || id, plataforma: ctx.plataforma || '', modulo: ctx.modulo || 'vault', resultadoProveedor: extra.resultado || '', motivo: extra.motivo || '' });
      }
    } catch (e) {}
  }
  function field(valorReal, opts) {
    opts = opts || {};
    const id = opts.key ? ('vltk_' + String(opts.key)) : ('vlt' + (++seq));
    store[id] = String(valorReal || '');
    if (opts.ctx) ctxMap[id] = Object.assign({ key: opts.key }, opts.ctx);
    const now = Date.now();
    const revelado = revealUntil[id] && revealUntil[id] > now;
    const masked = maskValue(valorReal, opts.mask || 'right4');
    const restringido = opts.restricted !== undefined ? opts.restricted : isRestricted();
    restrictedMap[id] = restringido;
    if (restringido) {
      return `<span class="vault-field" data-vlt="${id}" style="display:inline-flex;align-items:center;gap:6px;font-family:var(--f-mono,monospace);font-size:12px">
        <span data-vlt-txt>${masked}</span>
        <span class="badge neutral" style="font-size:10px" title="Requiere rol autorizado">🔒 Acceso restringido</span>
      </span>`;
    }
    return `<span class="vault-field" data-vlt="${id}" style="display:inline-flex;align-items:center;gap:6px;font-family:var(--f-mono,monospace);font-size:12px">
      <span data-vlt-txt>${revelado ? (valorReal || '—') : masked}</span>
      <button type="button" class="btn ghost sm" data-vlt-ver="${id}" ${revelado ? 'disabled' : ''} style="padding:2px 8px;font-size:10.5px">${revelado ? '⏱ 15s' : '👁 Ver 15s'}</button>
      <button type="button" class="btn ghost sm" data-vlt-cop="${id}" style="padding:2px 8px;font-size:10.5px">⧉ Copiar</button>
    </span>`;
  }

  function wire(container) {
    container = container || document;
    if (container.__vaultWired) return;
    container.__vaultWired = true;
    container.addEventListener('click', (e) => {
      const verBtn = e.target.closest('[data-vlt-ver]');
      const copBtn = e.target.closest('[data-vlt-cop]');
      if (verBtn) {
        const id = verBtn.dataset.vltVer;
        // re-localiza SIEMPRE la tarjeta viva por id (nunca por referencia cacheada): válido aunque el host se haya re-renderizado entre el click y este handler.
        const wrap = container.querySelector(`.vault-field[data-vlt="${id}"]`);
        if (!wrap) return;
        const txt = wrap.querySelector('[data-vlt-txt]');
        const credentialRef = store[id] || '';
        const ctx = ctxMap[id] || {};
        auditar('intento_ver', id);
        verBtn.textContent = '⏳ Resolviendo…';
        verBtn.disabled = true;
        /* P0-RES pendiente cerrado: la revelación pasa por el hook proveedor real
           Orbit.credentials.resolve(credentialRef, context) en vez de leer directo
           del valor ya cacheado en memoria — así un backend real puede reemplazar
           solo esta función sin tocar ningún llamador. */
        Orbit.credentials.resolve(credentialRef, ctx).then((real) => {
          // re-localizar de nuevo por si hubo re-render durante el await.
          const wrapNow = container.querySelector(`.vault-field[data-vlt="${id}"]`);
          if (!wrapNow) return;
          const txtNow = wrapNow.querySelector('[data-vlt-txt]');
          const verNow = wrapNow.querySelector('[data-vlt-ver]');
          if (real == null) {
            auditar('no_conectado', id, { resultado: 'sin_proveedor' });
            if (txtNow) txtNow.textContent = 'Pendiente de conexión segura';
            if (verNow) { verNow.textContent = '👁 Ver 15s'; verNow.disabled = false; }
            return;
          }
          if (txtNow) txtNow.textContent = real || '—';
          if (verNow) { verNow.textContent = '⏱ 15s'; verNow.disabled = true; }
          revealUntil[id] = Date.now() + 15000;
          auditar('revelado', id, { resultado: 'exito' });
          clearTimeout(wrapNow.__vltTimer);
          wrapNow.__vltTimer = setTimeout(() => {
            delete revealUntil[id];
            const wrapLater = container.querySelector(`.vault-field[data-vlt="${id}"]`);
            if (!wrapLater) return;
            const txtLater = wrapLater.querySelector('[data-vlt-txt]');
            const verLater = wrapLater.querySelector('[data-vlt-ver]');
            if (txtLater) txtLater.textContent = maskValue(real, 'right4');
            if (verLater) { verLater.textContent = '👁 Ver 15s'; verLater.disabled = false; }
          }, 15000);
        }).catch(() => { auditar('error_proveedor', id, { resultado: 'error' }); const wrapErr = container.querySelector(`.vault-field[data-vlt="${id}"]`); if (wrapErr) { const verErr = wrapErr.querySelector('[data-vlt-ver]'); if (verErr) { verErr.textContent = '👁 Ver 15s'; verErr.disabled = false; } } });
      }
      if (copBtn) {
        const id = copBtn.dataset.vltCop;
        const credentialRef = store[id] || '';
        const ctx = ctxMap[id] || {};
        if (restrictedMap[id]) { auditar('denegado_copiar', id, { resultado: 'denegado' }); if (window.Orbit && Orbit.ui) Orbit.ui.toast('Rol sin permiso para copiar credenciales'); return; }
        auditar('intento_copiar', id);
        Orbit.credentials.resolve(credentialRef, ctx).then((real) => {
          if (real == null) { auditar('no_conectado', id, { resultado: 'sin_proveedor' }); Orbit.ui.toast('Pendiente de conexión segura — nada que copiar todavía'); return; }
          if (navigator.clipboard && real) {
            navigator.clipboard.writeText(real).then(() => { auditar('copiado', id, { resultado: 'exito' }); Orbit.ui.toast('Copiado al portapapeles'); }).catch(() => { auditar('error_proveedor', id, { resultado: 'error_clipboard' }); Orbit.ui.toast('No se pudo copiar'); });
          }
        }).catch(() => auditar('error_proveedor', id, { resultado: 'error' }));
      }
    });
  }

  return { field, wire, maskValue, isRestricted };
})();

/* Hook proveedor reutilizable (sin backend): Orbit.credentials.resolve(credentialRef, context)
   devuelve una promesa con un valor FICTICIO/efimero para pruebas, o null si no hay proveedor
   configurado (estado honesto "Pendiente de conexión segura"). Un backend real reemplaza esta
   función sin tocar los llamadores. */
/* Hook proveedor reutilizable (sin backend): Orbit.credentials.resolve(credentialRef, context)
   devuelve una promesa con un valor FICTICIO/efímero para pruebas, o null si no hay proveedor
   configurado (estado honesto "Pendiente de conexión segura"). Un backend real reemplaza esta
   función sin tocar los llamadores. La referencia (credentialRef) NUNCA se revela como si fuera
   el secreto — incluso en fixtures de prueba, se resuelve a un valor ficticio SEPARADO. */
Orbit.credentials = Orbit.credentials || {
  _fixtures: {}, // credentialRef -> valor ficticio de demostración (nunca el propio ref)
  resolve: async function (credentialRef, context) {
    if (!credentialRef || credentialRef === 'pendiente_conexion_segura' || credentialRef === 'backend_required') return null;
    if (String(credentialRef).indexOf('ficticio-') === 0) {
      if (!Orbit.credentials._fixtures[credentialRef]) Orbit.credentials._fixtures[credentialRef] = 'demo-' + Math.random().toString(36).slice(2, 10);
      return Orbit.credentials._fixtures[credentialRef];
    }
    return null;
  }
};
