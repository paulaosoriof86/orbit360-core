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

  function maskValue(v, mode) {
    const s = String(v || '');
    if (!s) return '—';
    if (mode === 'all') return '•'.repeat(Math.min(s.length, 10));
    if (mode === 'left4') return s.slice(0, 4) + '•'.repeat(Math.max(s.length - 4, 3));
    // right4 (default): conserva los últimos 4, oculta el resto
    return '•'.repeat(Math.max(s.length - 4, 3)) + s.slice(-4);
  }

  function field(valorReal, opts) {
    opts = opts || {};
    const id = 'vlt' + (++seq);
    store[id] = String(valorReal || '');
    const masked = maskValue(valorReal, opts.mask || 'right4');
    return `<span class="vault-field" data-vlt="${id}" style="display:inline-flex;align-items:center;gap:6px;font-family:var(--f-mono,monospace);font-size:12px">
      <span data-vlt-txt>${masked}</span>
      <button type="button" class="btn ghost sm" data-vlt-ver="${id}" style="padding:2px 8px;font-size:10.5px">👁 Ver</button>
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
        const wrap = container.querySelector(`.vault-field[data-vlt="${id}"]`);
        if (!wrap) return;
        const txt = wrap.querySelector('[data-vlt-txt]');
        const real = store[id] || '';
        txt.textContent = real || '—';
        verBtn.textContent = '⏱ 6s';
        verBtn.disabled = true;
        clearTimeout(wrap.__vltTimer);
        wrap.__vltTimer = setTimeout(() => {
          txt.textContent = maskValue(real, 'right4');
          verBtn.textContent = '👁 Ver';
          verBtn.disabled = false;
        }, 6000);
      }
      if (copBtn) {
        const id = copBtn.dataset.vltCop;
        const real = store[id] || '';
        if (navigator.clipboard && real) {
          navigator.clipboard.writeText(real).then(() => Orbit.ui.toast('Copiado al portapapeles')).catch(() => Orbit.ui.toast('No se pudo copiar'));
        }
      }
    });
  }

  return { field, wire, maskValue };
})();
