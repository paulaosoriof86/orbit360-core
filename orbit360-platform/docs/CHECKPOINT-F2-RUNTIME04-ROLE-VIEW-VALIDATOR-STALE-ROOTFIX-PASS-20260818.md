# CHECKPOINT — F2 RUNTIME04 · ROLE VIEW VALIDATOR_STALE ROOTFIX PASS

Fecha: 2026-08-18
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open
Gate: `f2-productive-acceptance-exact-successor-v20260818`
Artifact bloqueado: `9345207863`

## Runtime04 — único intento consumido

Request04 commit `c1b6fe68ccfeb13655f5242c1e02fcc2a496b3d5`, run `32208018808`, attempt 1, artifact terminal `9349780184`. Request04 está consumido, allowedExecutions 0 y replay false.

Runtime04 pasó el gate canónico, verificó el artifact exacto, enlazó provider, resolvió la identidad existente read-only, obtuvo snapshot de integridad before y entró al navegador. Se detuvo antes de la matriz completa con la observación `DATA_CONTRACT_FAILURE:F2_REQUIRED_ROLE_MISSING:Dirección`.

## Causa raíz

Clasificación canónica: `VALIDATOR_STALE / F2_ROLE_VIEW_VALIDATOR_REQUIRED_LITERAL_DIRECCION_INSTEAD_OF_SUPERADMIN_VISUAL_EQUIVALENT`. La identidad estaba válida y tenía 4 roles canónicos, con `SuperAdmin` activo. El owner de sesión define expresamente `SuperAdmin → Dirección` como etiqueta visual. El runner exigía erróneamente el literal `Dirección` dentro de `allowedRoles()`, que devuelve roles canónicos. No corresponde modificar membership ni datos.

## Rootfix source-only

Contrato `F2_ROLE_VIEW_CANONICAL_VISUAL_V1`: la vista Dirección acepta `Dirección` o `SuperAdmin`; Operativo y Asesor permanecen exactos; `AdminTenant` no satisface Dirección porque su vista es Administración. Self-test y rootfix run `32209972474`: PASS. No hubo navegador, secretos, Firestore ni runtime en este rootfix.

## Integridad

Before/after: counts y digests idénticos. Firestore/Auth/membership/data/operational writes: 0. Rebuild/deploy/publicación/producción: 0/no. F2 continúa abierto porque role matrix, cross-tenant y service-worker/cache no terminaron. Ruta inmediata: 50%. Programa integral: 25%.

## Reuso y Academia

`REPLICABLE_CLAUDE_ACUMULADO`: separar rol canónico de autorización de la etiqueta humana usada por una vista; usar contrato explícito de resolución. Excluir backend protegido, secretos y datos reales.

`ACADEMIA_ACTUALIZAR`: en multirol/scopes, `SuperAdmin` puede mostrarse como Dirección sin convertirse en un rol literal Dirección. Un fallo de un validador que confunde ambos contratos es `VALIDATOR_STALE`, no un defecto de datos.

## Control post-docsync

Este cierre solo es canónico si el gate source-only posterior a la modificación de live-state/índice/checkpoint pasa en este mismo run `32210132572`.

## Siguiente frontera

`F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1 / REQUEST05 / EXACT_ARTIFACT_9345207863`. Request05 no existe ni está autorizado. Requiere autorización explícita fresca; no se reutiliza Request04.
