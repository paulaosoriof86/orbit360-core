/* ============================================================
   Orbit 360 · Plantillas de mensajes  — BETA
   Plantillas para WhatsApp y correo: propuestas, primas
   pendientes, actualización de datos, bienvenida, renovación.
   Variables {nombre}, {poliza}, {monto}, {vence}, {pendientes}.
   Editables y enviables (demo). Alimentan automatizaciones.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.plantillas = (function () {
  const U = Orbit.ui, K = Orbit.kit;
  const KEY = 'orbit360_plantillas';

  const SEED = [
    { id: 'pl-prop', icon: '📄', nombre: 'Envío de propuesta', canal: 'Ambos', cat: 'Comercial', texto: 'Hola {nombre}, te comparto la propuesta de {ramo} que preparamos. Incluye coberturas y prima. ¿La revisamos juntos?' },
    { id: 'pl-prima', icon: '💳', nombre: 'Prima pendiente', canal: 'WhatsApp', cat: 'Cobranza', texto: 'Hola {nombre}, tu póliza {poliza} tiene una cuota pendiente de {monto} con vencimiento {vence}. ¿Coordinamos el pago?' },
    { id: 'pl-datos', icon: '🩺', nombre: 'Actualización de datos', canal: 'Ambos', cat: 'Calidad', texto: 'Hola {nombre}, para mantener tu póliza al día necesitamos actualizar: {pendientes}. ¿Nos ayudás respondiendo este mensaje?' },
    { id: 'pl-renov', icon: '🔄', nombre: 'Aviso de renovación', canal: 'WhatsApp', cat: 'Retención', texto: 'Hola {nombre}, tu póliza {poliza} vence el {vence}. Preparamos tu renovación para que no quedes sin cobertura. ¿La confirmamos?' },
    { id: 'pl-bienv', icon: '👋', nombre: 'Bienvenida', canal: 'Ambos', cat: 'Onboarding', texto: '¡Bienvenido/a {nombre}! Soy tu asesor en seguros. Cualquier duda sobre tu póliza {poliza}, estoy para ayudarte.' }
  ];

  function load() { try { const r = localStorage.getItem(KEY); if (r) return JSON.parse(r); } catch (e) {} return JSON.parse(JSON.stringify(SEED)); }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
  let data = load();

  function render(host) {
    host.innerHTML = `<div class="page">
      ${K.bannerFor('plantillas', `<button class="btn primary" onclick="Orbit.modules.plantillas.nueva()">+ Nueva plantilla</button>`)}
      <div class="cfg-note" style="margin-bottom:16px">✉ Plantillas reutilizables para WhatsApp y correo. Las variables <span class="mono">{nombre} {poliza} {monto} {vence} {pendientes}</span> se completan con los datos reales del cliente. Alimentan las <b>automatizaciones</b> por cadencia de cada módulo.</div>
      <div class="pl-grid">
        ${data.map(p => `<div class="pl-card">
          <div class="pl-h"><span class="pl-ico">${p.icon}</span><div><b>${U.esc(p.nombre)}</b><div class="pl-meta"><span class="badge ${p.canal === 'WhatsApp' ? 'ok' : p.canal === 'Correo' ? 'info' : 'neutral'}">${p.canal}</span> <span class="badge neutral">${p.cat}</span></div></div></div>
          <div class="pl-body" data-edit="${p.id}">${U.esc(p.texto)}</div>
          <div class="pl-actions">
            <button class="btn ghost sm" data-copy="${p.id}">⧉ Copiar</button>
            <button class="btn ghost sm" data-ed="${p.id}">✎ Editar</button>
            <button class="btn primary sm" data-send="${p.id}">Usar</button>
          </div>
        </div>`).join('')}
      </div>
    </div>`;
    host.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => {
      const p = data.find(x => x.id === b.dataset.copy);
      navigator.clipboard && navigator.clipboard.writeText(p.texto);
      b.textContent = '✓ Copiado'; setTimeout(() => b.textContent = '⧉ Copiar', 1200);
    }));
    host.querySelectorAll('[data-ed]').forEach(b => b.addEventListener('click', () => editar(host, b.dataset.ed)));
    host.querySelectorAll('[data-send]').forEach(b => b.addEventListener('click', () => {
      alert('Demo: elegí un cliente para enviar esta plantilla por su canal (WhatsApp o correo). Las variables se completan automáticamente.');
    }));
  }

  function editar(host, id) {
    const p = data.find(x => x.id === id); if (!p) return;
    const el = host.querySelector(`.pl-body[data-edit="${id}"]`);
    const card = el.closest('.pl-card');
    el.outerHTML = `<textarea class="o-sel pl-ta" style="width:100%;min-height:96px;resize:vertical;padding:10px 11px">${U.esc(p.texto)}</textarea>
      <div style="display:flex;gap:6px;margin-top:8px"><button class="btn primary sm" id="pl-ok">Guardar</button><button class="btn ghost sm" id="pl-cancel">Cancelar</button></div>`;
    card.querySelector('#pl-ok').addEventListener('click', () => { p.texto = card.querySelector('.pl-ta').value; save(data); render(host); });
    card.querySelector('#pl-cancel').addEventListener('click', () => render(host));
  }

  function nueva() {
    const nombre = prompt('Nombre de la plantilla:'); if (!nombre) return;
    data.push({ id: 'pl-' + Date.now(), icon: '✉', nombre, canal: 'Ambos', cat: 'General', texto: 'Hola {nombre}, …' });
    save(data);
    if (Orbit.route && Orbit.route.key === 'plantillas') Orbit.router.go('plantillas');
  }
  return { render, nueva };
})();
