/* Orbit 360 · Validación de reporte de cobro por guard v1.199b. */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
(function () {
  const cob = Orbit.modules.cobros;
  if (!cob || typeof cob.detalle !== 'function' || cob.__detailGuardV1199b) return;
  const original = cob.detalle.bind(cob);
  cob.detalle = function (id) {
    const out = original(id);
    setTimeout(() => {
      const back = document.getElementById('cob-det');
      if (!back) return;
      const val = back.querySelector('#cd-val');
      if (!val) return;
      const next = val.cloneNode(true);
      val.replaceWith(next);
      next.addEventListener('click', () => {
        back.remove();
        cob.validarReporte(id);
      });
    }, 0);
    return out;
  };
  cob.__detailGuardV1199b = { original };
})();
