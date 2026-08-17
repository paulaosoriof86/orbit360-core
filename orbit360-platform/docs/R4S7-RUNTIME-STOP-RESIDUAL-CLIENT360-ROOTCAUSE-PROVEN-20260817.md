# R4S7 runtime STOP — causa residual Cliente 360 probada

Fecha 2026-08-17 · rama `ays/backend-tenant-lab-v99-20260703` · PR #5 draft/open.

## Runtime único consumido
R4S7 exacta: source `ce9792e3e4e37b298d2eda6f65983c683d66a3a3`, artifact `9287314053`, ZIP SHA256 `4c249faa4ccf05d0bb0bc8fa4b8bb5dca07de17838cd9fb4816c5eb15b66944a`.

Run `32050405588`, job `95448164241`, evidence `9294517000`, digest `f2748f61d93a04e8ac927171a223bfda0b617b42ad49b09a6829102a1acd6d5b`: `STOP_RETRY / FUNCTIONAL_DEFECT` en `role-Dirección-route-cliente360`; no segundo intento.

PASS previo: manifest R4S7, Auth/membership/tenant, runtime/router/store `ready-read-only`, 430 clientes, 30 aseguradoras, Dirección all 430/430, Inicio, cero page/console/HTTP/write/technical-copy errors y escrituras `0/0/0`.

Tiempos: Dirección activation ~23.034 s PASS; Inicio ~0.361 s PASS; Cliente360 ~25.254 s FAIL por timeout de 25 s.

Refreeze: commit `680e1aab694bc73eb09a42640f2ec18e5ffee42f`; run `32050632911`, job `95448883412` SUCCESS; evidence `9294552226`, digest `b6d6ab9585102ba33ba1c483c49c46924863be4a26558bc8360507c835cc4b33`. Browser/secretos/identidad/runtime quedaron skipped.

## Causa residual
R4S7 sí cerró la proyección repetida de clientes. La capa faltante ocurre después del batch:
- Cliente360 ya pagina 40 filas y usa `withReadBatch(['clientes','polizas','cobros','comisiones'])`.
- El enhancer visual recorre cada fila visible y hace `Orbit.store.where('polizas', ...)` una vez por fila.
- Para pólizas, el wrapper conserva `nativeWhere`.
- El store productivo implementa `where()` desde `all()`, y `all()` deep-clona cada fila con JSON serialize/parse.
- Resultado: hasta 40 clonaciones completas de la colección de pólizas por enhance.
- Existen dos caminos source-bound de enhance en navegación: hashchange/RAF y MutationObserver directo al aparecer la estructura Cliente360.

Clasificación cerrada:
`FUNCTIONAL_DEFECT / CLIENT360_VISUAL_ENHANCER_N_BY_PAGE_POLICY_WHERE_FULL_DEEP_CLONE_WITH_DUPLICATE_ROUTE_ENHANCE_PATHS`

Owner: `orbit360-platform/core/client-insurer-visual-contract-v20260720.js`. El store protegido no es el defecto y no debe tocarse. `modules/cliente360.js` ya contiene el batch necesario.

## Gate source-only
Run `32051672373`, job `95452260461` SUCCESS; artifact `9294910801`, digest `e11222065f1b5b6f5399b123771b761ab71311700fddabc01a1eafbd7ace81fd`.

Con la cardinalidad representativa de 1.375 pólizas del fixture pesado existente —no dato vivo—: 40 where/enhance = 55.000 filas-equivalentes clonadas; dos caminos = 110.000; una snapshot por enhance = 2.750; reducción estructural esperada 97,5%.

## Siguiente acción
Rootfix source-only fresco, inicialmente solo en el owner visual: reemplazar el `where('polizas')` por fila por una snapshot/index de pólizas reutilizable, preferiblemente desde el contexto/batch existente. Antes de aceptar: igualdad DOM/semántica, 40 filas, dos caminos de enhance, métricas de where/all/filas/bytes/invocaciones e invalidación por `polizas/clientes/*/ruta`. No browser/runtime hasta PASS.
