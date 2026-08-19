# CHECKPOINT — F2 RULES01 DEPLOY PASS · PROBE ROOTFIX PASS

Fecha: 2026-08-18
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open
Artifact F2 bloqueado: `9345207863`

## RULES01 — consumido

RULES01 commit `8d68f36182453ac70f2e68823e194db5a83c71f4`, run `32211779285`, attempt 1, artifact `9351002966`. El deploy exclusivo de `firestore.rules` al proyecto LAB terminó PASS con blob `35fba451bbbeb97dbae3f08303b786ddbcbdd29f`. No hubo writes de documentos Firestore/Auth/membership/datos, Hosting/Functions deploy, rebuild, publicación ni producción. Integridad before/after: counts y digests idénticos. RULES01 está consumido y no se repite.

## Probe histórico — VALIDATOR_STALE

El probe de RULES01 recibió `400 INVALID_ARGUMENT` porque utilizó el ID reservado `__orbit360_f2_cross_tenant_probe__`. Ese response no produjo un veredicto de autorización válido. Causa canónica: `VALIDATOR_STALE / F2_CROSS_TENANT_PROBE_USED_RESERVED_FIRESTORE_ID`. No es un defecto de producto ni de las reglas desplegadas. No corresponde redeploy.

## Rootfix

Contrato `F2_CROSS_TENANT_PROBE_VALID_PATH_V2`: ruta válida `tenants/orbit360-f2-cross-tenant-probe/system/config`; 403/PERMISSION_DENIED=PASS; 400/INVALID_ARGUMENT=VALIDATOR_STALE; 404/200=SECURITY_FAILURE. Rootfix source-only V2 run `32212655647`: PASS, sin secretos/Firestore/browser/runtime/deploy.

El primer intento de persistencia source-only, run `32212371446`, tuvo `PIPELINE_MECHANISM_FAILURE / ROOTFIX_EVIDENCE_PERSIST_REBASE_BLOCKED_BY_UNSTAGED_CANONICAL_PREFLIGHT`; contenido y self-test habían pasado. V2 corrigió el mecanismo restaurando la evidencia efímera antes del rebase.

## Estado

F2 sigue abierto. Ruta inmediata: 50%. Programa integral: 25%. Carril A congelado; Carril B pendiente únicamente del probe postdeploy read-only corregido; Carril C sin cambios. Request06 no existe.

## Siguiente frontera exacta

`F2_RULES01_POSTDEPLOY_CROSS_TENANT_PROBE_READONLY_V1` — autorización fresca requerida. El workflow ya está preparado y **no contiene deploy de reglas**. Debe ejecutar un único probe server-forced con integridad before/after y cero writes. Solo PASS si Firestore devuelve 403/PERMISSION_DENIED. Si devuelve 404/200, clasificar SECURITY_FAILURE y detener.

Después de ese PASS, y solo entonces, se habilita la frontera de Request06.

## Reuso / Academia

`BACKEND_PROTEGIDO_NO_CLAUDE`: reglas Firestore, credenciales y enforcement real.  
`REPLICABLE_CLAUDE_ACUMULADO`: patrón de paridad source→policy desplegada y probe negativo con IDs válidos del proveedor.  
`ACADEMIA_ACTUALIZAR`: un gate de seguridad debe distinguir errores de construcción del probe de un permiso realmente concedido; un 400 de recurso inválido no demuestra autorización ni denegación.
