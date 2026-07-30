# Cierre técnico — M6 recovery 6.1.14

Fecha: 2026-07-30  
Run: `30551563820`  
Artifact: `8763037814`  
Digest: `sha256:b4cb68b849d5706792265f04455c5519b4de8862fb75725fa2c2a50c953f0605`

## Resultado

`ROLLED_BACK_SAFE`.

Antes del fallo quedaron PASS: preflight, request/binding, identidad y configuración read-only, snapshot inicial, shell productivo, Firestore Rules read-only + Hosting, readiness, contrato 414 clientes / 26 aseguradoras, alias `country → pais`, snapshots completos, write guard, snapshot final e integridad.

El browser falló en `desktopDirection` antes de despachar el click de la tarjeta de Aseguradoras. Evidencia sanitizada:

- cardCount: 26
- scrolledIntoView: true
- geometryStable: true
- centerInsideViewport: true
- centerHit: false
- hitDescriptor: `div#conf-body`
- clickDispatched: false
- network write candidates: 0

Rollback automático: PASS. Producción funcional volvió a `NO LIVE`; Firestore deny-all, Hosting neutro, Storage diferido fail-closed. Conteos y digests permanecieron estables. Escrituras Firestore/operativas: 0.

## Causa raíz

Clasificación: `VALIDATOR_STALE`  
Código: `LEGAL_GATE_DEFERRED_RENDER_RACE`

`core/auth.js` programa `Orbit.legal.gate(...)` 520 ms después de mostrar la aplicación. El smoke anterior comprobaba la presencia de `[data-legal-gate]` una sola vez inmediatamente después del arranque. Si el modal aún no existía, continuaba con pruebas funcionales; posteriormente el gate legal aparecía y su `.conf-body` cubría la interacción.

No existe evidencia de defecto de datos, Aseguradoras, Auth, Rules o Hosting.

## Corrección estática 6.1.15

Se creó una primitiva reusable:

`tools/orbit360-browser-blocking-gate-readiness-v20260730.mjs`

Su contrato:

- ventana de llegada para gates diferidos;
- resolución scoped del gate legal;
- espera de detach;
- ventana de quietud antes de continuar;
- timeout acotado;
- cero `force:true`;
- resumen sanitizado.

Prueba sintética:

`tools/orbit360-browser-blocking-gate-readiness-test-v20260730.mjs`

Reproduce un gate que aparece exactamente a 520 ms y exige aceptación + desaparición. Resultado: PASS.

Run estático 6.1.15: `30552591248`  
Artifact: `8763394413`  
Digest: `sha256:8076b0cc24790caf24b72d10ee209bbdfe7d3c5ce9cb659735d25578cd2094c4`  
Recovery productivo: SKIPPED.

## Regla anti-reintento

No se prepara ni dispara otro recovery productivo como consecuencia automática de este hallazgo. M6 permanece congelado después del rollback. La corrección se considera transversal y debe ser consumida por todos los smokes futuros antes de pruebas de módulos.
