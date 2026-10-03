/* Orbit 360 · Renovaciones v1.201 · vínculo emitido sin segundo render */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
(function () {
  const mod = Orbit.modules.renovaciones;
  const client = Orbit.modules.cliente360;
  const U = Orbit.ui;
  const S = () => Orbit.store;
  if (!mod || mod.__issuedFilterV1201) return;
  if (client && typeof client.renovar === 'function' && !client.__issuedRenewalGuardV1201) {
    const originalRenew = client.renovar.bind(client);
    client.renovar = function (policyId) {
      const p = S().get('polizas', policyId);
      if (p && p.renovadaPor) {
        const next = S().get('polizas', p.renovadaPor);
        if (next) { U.toast('Esta póliza ya fue renovada. Abriendo la nueva póliza.'); return client.verPoliza(next.id); }
        return U.toast('Esta póliza ya tiene una renovación vinculada.');
      }
      return originalRenew(policyId);
    };
    client.__issuedRenewalGuardV1201 = { originalRenew };
  }
  mod.__issuedFilterV1201 = { renderOwner: false, issuedLinkGuard: true };
})();
