# Cierre de causa raíz — Gate 7.11 · Legal diferido antes del write guard

Fecha: 2026-08-02  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate: `block7-canonical-runtime-cumulative-visual-lab-v20260801`  
Contrato: `7.11.0`

## Clasificación

`VALIDATOR_STALE / LEGAL_GATE_DEFERRED_RENDER_RACE`

## Evidencia del fallo

Run: `30755865296`  
Job: `91517783012`

La identidad existente, Auth, snapshot inicial, servidor local y `Orbit.store` canónico pasaron. Los conteos operativos, rutas canónicas, digest, exclusión de seeds y ausencia de escrituras se conservaron.

El validador comprobaba el modal Legal inmediatamente después de Auth. En ese instante todavía no estaba renderizado y registró falsamente `already_accepted_in_context`. Después de la hidratación del store, el propietario Legal mostró el modal `data-legal-gate`. El gate instaló el write guard y trató de abrir el primer cliente con el modal todavía visible; el clic quedó bloqueado y la aceptación tardía cruzó incorrectamente la frontera del write guard.

## Causa raíz

El producto Legal era correcto e idempotente. El validador estaba desalineado con el orden real del bootstrap:

`Auth → hidratación canónica → render Legal diferido → aceptación → navegación operativa`.

No correspondía modificar Legal, Auth, Cliente 360, `Orbit.store`, datos, reglas ni permisos.

## Corrección

1. Se eliminó la comprobación prematura `legalVisible` anterior a la hidratación.
2. Se agregó `settleLegalGateAfterHydration(page)`.
3. El gate espera evidencia del propietario Legal mediante modal visible, aceptaciones o `__gateState`.
4. Si el modal está visible, usa el helper canónico `acceptLegalOnce`.
5. Verifica que no exista modal ni scope pendiente antes de instalar el write guard.
6. Publica `checks.legalSettledBeforeWriteGuard=true`.
7. Se añadió un validador estático que comprueba el orden:

`canonical_store_hydrated → settleLegalGateAfterHydration → write guard`.

## Archivos

- `tools/orbit360-validar-canonical-runtime-cumulative-visual-lab-v20260801.mjs`
- `tools/orbit360-validar-legal-deferred-order-gate711-v20260802.mjs`
- `.github/workflows/orbit360-canonical-runtime-cumulative-visual-lab-v20260801.yml`
- `tools/orbit360-validator-lifecycle-contract-canonical-runtime-cumulative-visual-lab-v20260801.json`

## Seguridad e integridad

- Producto modificado: no.
- Datos modificados: no.
- Auth modificado: no.
- Legal modificado: no.
- Firestore writes: 0.
- Operational writes: 0.
- Reimportación: no.
- Deploy: no.
- Producción: no.
- Main/merge: no.

## Impacto Claude / prototipo reutilizable

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`.

Patrón reusable: los overlays/gates diferidos deben resolverse según el orden real de bootstrap. Un test no puede interpretar “no visible todavía” como “ya aceptado”. Los validadores deben verificar la desaparición del overlay antes de interactuar con el contenido subyacente.

No se envían a Claude secretos, identidad LAB, Firestore, tokens ni implementación protegida.

## Impacto Academia

Clasificación: `ACADEMIA_ACTUALIZAR`.

Incorporar en la ruta Dirección/Superadmin/IT:

- diferencia entre defecto funcional y `VALIDATOR_STALE`;
- overlays diferidos y orden de bootstrap;
- por qué Legal debe aceptarse antes del write guard;
- por qué un modal que bloquea un clic no se corrige modificando Cliente 360;
- obligación de detener reintentos y corregir únicamente la capa responsable.

## Siguiente acción exacta

Ejecutar una sola vez el mismo gate 7.11. El preflight debe validar primero el orden Legal diferido. Solo si pasa podrá leer secretos, abrir Firestore read-only y ejecutar navegador. Si la misma etapa o familia de fallo reaparece, activar `STOP_RETRY`.
