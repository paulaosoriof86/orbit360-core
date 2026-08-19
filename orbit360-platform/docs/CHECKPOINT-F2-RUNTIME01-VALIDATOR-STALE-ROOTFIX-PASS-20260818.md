# CHECKPOINT — F2 RUNTIME01 STOP VALIDATOR_STALE · ROOTFIX SOURCE-ONLY PASS

Fecha: 2026-08-18
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open
Gate: `f2-productive-acceptance-exact-successor-v20260818`
Artifact bloqueado: `9345207863`

## Runtime01 autorizado y consumido

La autorización explícita `F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1` produjo un único request y un único run: request commit `0fba51716d741750b617bf95fc6342444c9f720c`, run `32205144735`, attempt 1. El run se detuvo en el gate canónico **antes** de artifact/provider/secretos/Firebase/browser.

El error observable fue `DATA_CONTRACT_FAILURE:F2_LIVE_STATE_NOT_AT_F2_BOUNDARY`, pero la causa raíz real es `VALIDATOR_STALE / F2_LIVE_STATE_BOUNDARY_VALIDATOR_STALE`: el engine esperaba todavía la frontera previa F1→F2 y no reconocía el estado vigente `F2_SOURCE_ONLY_PASS_RUNTIME_AUTHORIZATION_PENDING`. No se demostró defecto funcional del producto.

## Invariantes Runtime01

- artifact descargado: no;
- secretos: no;
- Firestore read: no;
- identidad/custom token: no;
- browser/runtime: no;
- Firestore/Auth/membership/data/operational writes: 0;
- rebuild/deploy/publicación/producción: 0/no.

El request01 quedó `CONSUMED_STOP_RETRY`, allowedExecutions 0 y replay false. No rerun.

## Rootfix source-only

Run `32205903393`: `F2_VALIDATOR_STALE_ROOTFIX_SOURCE_ONLY_PASS`. El router canónico quedó en `v10.4-f2-current-boundary-rootfix`, reconoce la frontera F2 actual y permite un request consumido únicamente como histórico congelado. El preflight source-only confirmó liveBoundaryCurrent=true, indexBoundaryCurrent=true, candidato exacto 9345207863, cero autorización runtime, cero secretos/datos/browser/writes.

También quedó corregida la interpretación previa de observabilidad: el pulse Actions run `32205491951` demostró que los push del conector sí disparan Actions. El problema era el método de observación de runs push, no ausencia de dispatch.

## Estado y siguiente frontera

F2 sigue abierto; no se suma porcentaje de cierre. Ruta inmediata a producción: 50%. Programa integral: 25%. Carril A congelado, Carril B rootfix source-only PASS, Carril C sin cambios.

La siguiente ejecución requiere **nueva autorización explícita** para un request02 independiente, nuevamente sobre artifact 9345207863 y con exactamente los mismos límites read-only. La autorización anterior fue consumida y no puede reutilizarse.
