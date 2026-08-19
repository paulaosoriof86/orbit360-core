# CHECKPOINT — F2 RUNTIME05 · CROSS-TENANT SECURITY FAILURE

Fecha: 2026-08-18
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open
Gate: `f2-productive-acceptance-exact-successor-v20260818`
Artifact bloqueado: `9345207863`

## Runtime05 — único intento consumido

Request05 commit `dea238868ac2319f8f70b9e8596264234ca73a1a`, run `32210391764`, attempt 1, artifact terminal `9350568542`. Request05 está consumido, allowedExecutions 0, authorizationFrozen true y replay false.

Runtime05 pasó gate canónico, artifact exacto, provider, identidad read-only, integridad before, legal readiness y contrato de vistas de rol. Llegó por primera vez al control cross-tenant y falló con `SECURITY_FAILURE:F2_CROSS_TENANT_READ_NOT_DENIED`. La matriz completa y service-worker/cache no se ejecutaron después de ese STOP.

## Causa raíz canónica

`SECURITY_FAILURE / FIRESTORE_RUNTIME_RULES_OUT_OF_PARITY_WITH_SOURCE_CROSS_TENANT_DENY`. El cliente autenticado logró resolver la lectura del tenant de prueba prohibido. El `firestore.rules` del source del artifact y del HEAD actual tiene el mismo blob `35fba451bbbeb97dbae3f08303b786ddbcbdd29f`, limita tenant a `alianzas-soluciones` y termina en deny-all; por tanto ese source no requiere corrección.

La evidencia histórica de Actions muestra que el run `29387539446` falló antes de desplegar reglas; el run `29388318001` obtuvo `IAM grant result: permission_denied` y fue cancelado antes de `Deploy Firestore rules`; el run `29388492688` también fue cancelado antes del despliegue. No existe evidencia recuperada de `RULES_OK` en esos intentos.

## Integridad

Before/after: countsIdentical=true, digestsIdentical=true. Firestore/Auth/operational writes: 0. Rebuild/deploy/publicación/producción durante Runtime05: 0/no.

## Control source-only

Run `32211048260`: `F2_RUNTIME05_SECURITY_ROOTCAUSE_SOURCE_ONLY_PASS`. Confirmó Request05 congelado, source rules restrictivo e invariantes F2. No usó secretos, Firestore, navegador ni deploy y no creó Request06.

## Estado

F2 continúa abierto. Ruta inmediata a producción: 50%. Programa integral: 25%. Carril A congelado; Carril B bloqueado por reparación de seguridad/paridad de reglas; Carril C sin cambios.

## Siguiente frontera exacta

`F2_FIRESTORE_RULES_PARITY_REPAIR_AUTHORIZATION_BOUNDARY`. Antes de Request06 debe desplegarse exclusivamente el `firestore.rules` versionado al proyecto LAB autorizado y luego probarse el deny cross-tenant con lectura forzada a servidor e integridad before/after. Ese deploy requiere autorización explícita nueva; no está autorizado por Request05.

Siguen prohibidos writes de documentos Firestore, Auth/membership/data writes, password reset, Hosting/Functions deploy, rebuild, publicación, producción, main y merge.

## Reuso / Academia

`BACKEND_PROTEGIDO_NO_CLAUDE`: reglas Firestore y su gate de paridad. `REPLICABLE_CLAUDE_ACUMULADO`: patrón genérico de source-to-deployed policy parity y negative authorization probe. `ACADEMIA_ACTUALIZAR`: una regla correcta en repositorio no garantiza seguridad runtime si no existe evidencia de despliegue/paridad; un gate debe verificar política desplegada y no solo source.
