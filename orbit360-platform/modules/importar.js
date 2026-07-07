/* ============================================================
   Orbit 360 · Importación inteligente (hub)  — BETA scaffold
   Punto único para todas las secciones de importación. Cada
   tarjeta abre el drawer inteligente (core/importa.js) que
   acepta cualquier formato y mapea a la entidad destino.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.importar = (function () {
  const U = Orbit.ui;

  const GROUPS = [
    {
      title: 'Arranque', sub: 'Carga inicial para poner a operar la plataforma',
      items: ['base-inicial', 'clientes', 'polizas', 'vehiculos']
    },
    {
      title: 'Conciliación con aseguradoras', sub: 'Habilita la doble conciliación pago ↔ póliza',
      items: ['estados-cuenta', 'planillas-comision', 'directorio-aseguradoras']
    },
    {
      title: 'Finanzas y Marketing', sub: 'Histórico y operación continua',
      items: ['financiero-historico', 'movimientos-finanzas', 'estados-banco', 'calendario-marketing']
    }
  ];

  function card(kind) {
    const k = Orbit.importa.KINDS[kind]; if (!k) return '';
    return `<button class="imp-card" data-k="${kind}">
      <span class="ic">${k.icon}</span>
      <span class="tx"><b>${U.esc(k.title)}</b><small>${U.esc(k.desc)}</small></span>
      <span class="go">Importar →</span>
    </button>`;
  }

  function render(host) {
    host.innerHTML = `<div class="page">
      ${Orbit.kit.bannerFor('importar', '')}
      <div class="page-head" style="margin-top:-6px"><div><div class="page-sub" style="margin-top:0">Sube <b>cualquier formato</b> (PDF, Excel, CSV, imagen, planilla) y Orbit 360 reconoce y mapea los datos a la plataforma. Pensado para <b>adaptarse a la base de cada cliente</b> — sin reformatear nada a mano.</div></div></div>

      <div style="display:grid;gap:18px">
        ${GROUPS.map(g => `<div>
          <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:10px">
            <b style="font-family:var(--f-display);font-size:15px">${g.title}</b>
            <span class="muted" style="font-size:12.5px">${g.sub}</span>
          </div>
          <div class="imp-cards">${g.items.map(card).join('')}</div>
        </div>`).join('')}
      </div>

      <div class="card pad" style="margin-top:22px;display:flex;gap:14px;align-items:flex-start">
        <span style="font-size:26px">🧠</span>
        <div><b style="font-family:var(--f-display);font-size:15px">Motor de extracción adaptable</b>
        <p class="muted" style="font-size:13.5px;margin:6px 0 0;line-height:1.55;max-width:760px">El cliente entrega su base como la tenga. El motor detecta estructura y formato, propone el mapeo y lo deja listo para confirmar. Toda la información importada <b>alimenta a todos los módulos</b> (CRM, Finanzas, Insights, Marketing) y mantiene la <b>sincronía</b> entre ellos.</p></div>
      </div>
    </div>`;

    host.querySelectorAll('.imp-card').forEach(el => el.addEventListener('click', () => Orbit.importa.open(el.dataset.k)));
  }
  return { render };
})();
