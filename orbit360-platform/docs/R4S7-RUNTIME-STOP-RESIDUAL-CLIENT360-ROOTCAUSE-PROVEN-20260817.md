# R4S7 runtime STOP — causa residual Cliente 360 probada

Fecha 2026-08-17 · rama `ays/backend-tenant-lab-v99-20260703` · PR #5 draft/open.

## Runtime único consumido
R4S7 exacta: source `ce9792e3e4e37b298d2eda6f65983c683d66a3a3`, artifact `9287314053`, ZIP SHA256 `4c249faa4ccf05d0bb0bc8fa4b8bb5dca07de17838cd9fb4816c5eb15b66944a`.
Run `32050405588`, job `95448164241`, evidence `9294517000`: `STOP_RETRY / FUNCTIONAL_DEFECT` en `role-Dirección-route-cliente360`; no segundo intento. Dirección activation ~23.034 s PASS; Inicio ~0.361 s PASS; Cliente360 ~25.254 s FAIL. PASS previo: 430 clientes, 30 aseguradoras, Dirección all 430/430, Auth/membership/tenant/store read-only, cero errores y escrituras `0/0/0`.

## Refreeze
Commit `680e1aab694bc73eb09a42640f2ec18e5ffee42f`; run `32050632911`, job `95448883412` SUCCESS. Browser/secretos/identidad/runtime quedaron skipped.

## Causa residual
R4S7 sí cerró la proyección repetida de clientes. La capa faltante ocurre después del batch: Cliente360 pagina 40 filas y ya usa `withReadBatch` con pólizas, pero el enhancer visual hace `Orbit.store.where('polizas', ...)` por cada fila. Para pólizas se conserva `nativeWhere`; en el store productivo `where()` llama `all()`, y `all()` deep-clona cada fila con JSON serialize/parse. Hay hasta 40 full-policy clones por enhance y dos caminos source-bound de enhance en navegación: hashchange/RAF y MutationObserver directo.

Clasificación: `FUNCTIONAL_DEFECT / CLIENT360_VISUAL_ENHANCER_N_BY_PAGE_POLICY_WHERE_FULL_DEEP_CLONE_WITH_DUPLICATE_ROUTE_ENHANCE_PATHS`.
Owner: `orbit360-platform/core/client-insurer-visual-contract-v20260720.js`. Store protegido no es defecto. `modules/cliente360.js` ya tiene el batch necesario.

## Gate source-only
Run `32051672373`, job `95452260461` SUCCESS; artifact `9294910801`, digest `e11222065f1b5b6f5399b123771b761ab71311700fddabc01a1eafbd7ace81fd`. Con 1.375 pólizas del fixture pesado representativo —no dato vivo—: 40 where/enhance = 55.000 filas-equivalentes; dos caminos = 110.000; una snapshot por enhance = 2.750; reducción estructural esperada 97,5%. Browser/runtime/secretos/datos false, producto/store sin cambios, escrituras `0/0/0`.

## Siguiente acción
Rootfix source-only fresco, inicialmente solo en el owner visual: reemplazar el `where('polizas')` por fila por una snapshot/index reutilizable desde el contexto/batch existente. Gate antes de aceptar: `Cliente360 batch → 40 filas → dos caminos de enhance`, igualdad DOM/semántica, `policyWhereCalls`, `nativePolicyAllCalls`, filas/bytes clonados, `enhanceInvocations` e invalidación `polizas/clientes/*/ruta`. No browser/runtime hasta PASS.
