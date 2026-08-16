# Orbit 360 · Plataforma

Sistema 360 para intermediarios de seguros, comercializable, white-label y multi-tenant. A&S es el primer tenant y se configura mediante `Orbit.tenant`; no existe un fork de código para Alianzas.

> Nota de marca vigente: existe una decisión estratégica provisional para cambiar la marca visible futura a **GRAVICENTRA**, pero es NO bloqueante. Hasta el bloque formal de rebranding se conserva `Orbit 360` como nombre técnico/operativo y no se cambian backend, contratos, colecciones, tenant IDs, Firebase, rutas, repositorio ni identificadores técnicos.

## Corte go-live vigente · 2026-08-15

```txt
Repositorio: paulaosoriof86/orbit360-core
Rama obligatoria: ays/backend-tenant-lab-v99-20260703
PR: #5 draft/open
main / merge: NO autorizados
Reimportación / cambios Auth / cambios de datos: NO autorizados
```

### Producción actual · R4S1 PUBLICADO Y VERIFICADO

Paquete vivo:

- `orbit360-fase-a-product-r4s1-df4c217c3472.zip`
- SHA256 `49f5a5eee451665fcc420fc9acee88347b95aa832a8f6f524053cc4ccaa0d60d`
- fileCount `194`
- R3→R4S1: `193` archivos byte-idénticos + `1` único delta `core/access-scope.js`
- SHA256 `core/access-scope.js`: `8976ab8032f210a0f93d79f4ace037ec3b3e8fe8c1ac9e1f5a0eadd8d134fb3f`.

Verificación pública estática:

- run `31916602904` · SUCCESS
- artifact `9255064967`
- `index.html`, manifest, `core/access-scope.js` y `core/auth-product-runtime-p0.js` coinciden exactamente con R4S1 certificado.

HostDime y la identidad del paquete **no son blockers vigentes**.

### Auth/runtime/datos productivos · PASS

La única frontera R4S1 volvió a certificar antes del bloqueo de rendimiento:

- login HTTP 200;
- signedIn + emailVerified;
- membership available/active;
- tenant correcto;
- 5 roles y roles requeridos;
- runtime/router/tenant-context activos;
- store `ready-read-only`, write disabled;
- required missing/failed `0`;
- legal observado sin persistir aceptación;
- **430 clientes**;
- **30 aseguradoras**;
- Dirección `inicio` PASS;
- page/console/HTTP/write errors `0`;
- Firestore/Auth/operational writes `0`.

No reabrir contraseñas, Auth, membership, tenant, datos o HostDime.

### Única matriz final R4S1 · CONSUMIDA / REFROZEN

- source-only previo: run `31916736116` · SUCCESS
- única frontera browser: run `31916778155`, job `95089796794`
- artifact `9255149181`
- digest `sha256:3011cd5ba7b90d38c962de00d63ec90cb84ed69688b0c667e4816095b500e6b7`
- runtime classification: `FUNCTIONAL_DEFECT / R4_ROLE_ROUTE_STAGE_TIMEOUT`
- refreeze commit `6e41dca4973e8c47c7592ef914badebdff870c36`
- refreeze control run `31916926740` · SUCCESS.

La autorización de una sola matriz quedó consumida. Browser permanece congelado.

### Causa raíz vigente A · Cliente 360

`modules/cliente360.js` espera opcionalmente `q.clientesResumenIndex()`, pero el owner real no implementa ese índice. El fallback construye resúmenes por cliente y termina haciendo `store.get('clientes', id)` repetidamente; el store productivo resuelve `get()` mediante `all()`, y `all()` clona toda la colección.

Regresión source-only run `31917185515`, artifact `9255246859`:

- baseline: clientGetCalls `430`, clientCloneRows `185330`, fallbackSummaryCalls `470`;
- candidato: clientGetCalls `0`, clientCloneRows `860`, summaryIndexCalls `1`, fallback `0`;
- reducción `215.5×`;
- semanticEqual `true`;
- writes `0`.

Clasificación:

`FUNCTIONAL_DEFECT / R4S1_CLIENTE360_MISSING_SUMMARY_INDEX_NX_CLONE`

### VALIDATOR_STALE histórico

La evidencia v19 del 7 de agosto afirmaba `summaryIndexCalls:1` y `fallbackSummaryCalls:0`, pero el source actual tiene `0` definiciones reales de `q.clientesResumenIndex`.

Clasificación:

`VALIDATOR_STALE / V19_CLIENTE360_SUMMARY_INDEX_ASSUMED_NOT_IMPLEMENTED`

No reutilizar aquella fixture como prueba de rendimiento real.

### Causa raíz vigente B · Inicio

Las queries globales de Inicio hacen lookup de cliente dentro de filtros por cobro/póliza y `leaderboard()` repite esos recorridos por asesor. Al cambiar rol y reconstruirse Inicio, ese patrón vuelve a multiplicar `store.get()`/clonados.

Regresión source-only run `31917288758`, artifact `9255279034`:

- baseline: clientGetCalls `3304`, clientCloneRows `1420720`, policy all `8`, commission all `7`;
- candidato: clientGetCalls `0`, clientCloneRows `1290`, policy all `2`, commission all `1`;
- reducción `1101.33×`;
- semanticEqual `true`;
- writes `0`.

Clasificación:

`FUNCTIONAL_DEFECT / R4S1_INICIO_GLOBAL_QUERY_NX_CLIENT_CLONE`

### Rootfixes nuevos · PROBADOS / NO APLICADOS

La autorización R4S1 ya fue consumida y solo permitía el delta `core/access-scope.js`. Por tanto, estos dos candidatos no se aplican sin nueva autorización:

1. `orbit360-platform/core/queries.js`: lookup local indexado de clientes por query global y arrays precomputados para leaderboard.
2. `orbit360-platform/modules/policy-receipts-v1199-detail-guard.js`: `clientsById` en read-model + `q.clientesResumenIndex()` real, preservando invalidación y resultados.

Aseguradoras, Ops y Leads fueron revisados para el mismo antipatrón en su render base; no se amplía el alcance.

### Siguiente acción exacta

Si se autoriza un nuevo bloque:

1. aplicar **exclusivamente** los dos rootfixes source-only ya probados;
2. gate canónico + regresión combinada source-only;
3. solo con PASS generar R4S2 mínima desde R4S1 con exactamente esos dos nuevos deltas y los otros `192` archivos byte-idénticos;
4. certificar manifest/SHA;
5. backup/rollback y publicación exclusiva R4S2;
6. verificar identidad pública;
7. ejecutar una única nueva matriz productiva read-only solo con autorización explícita;
8. cerrar únicamente con `POST_GO_LIVE_SMOKE_PASS` y cero writes.

No rollback automático de R4S1: paquete, Auth, tenant, datos y cero escrituras permanecen PASS. No avanzar a Pólizas.

Avance permanece **100% funcional / 75% técnico / 67% gates (2/3)**.

Checkpoint vigente: `docs/CIERRE-R4S1-FRONTERA-FINAL-NX-CLONE-INICIO-CLIENTE360-20260815.md`.

Estado canónico: `docs/orbit360-live-state-v1.json`.

## Fuentes rectoras

Leer antes de actuar:

1. Documento Maestro Consolidado 20260704.
2. Addendum Academia Profunda 20260704.
3. Addendum Patrones Reutilizables Claude/Backend 20260707.
4. Addendum Continuidad Clientes/Multirol/Importadores 20260709.
5. Plan Maestro de Ejecución Productiva 20260716.
6. Addendum Control de Causa Raíz, Validadores y Gates 20260717.
7. `docs/ADDENDUM-MAESTRO-ACELERACION-PRODUCTIVA-REUSO-TRANSVERSAL-Y-CONTROL-AUTORIZACIONES-20260730.md`.
8. `docs/NOTA-RECTORA-REBRANDING-GRAVICENTRA-NO-BLOQUEANTE-20260730.md`.
9. `docs/ADDENDUM-MAESTRO-CONTINUIDAD-SINCRONIZACION-ANTIBUCLE-GOLIVE-POSTPROD-20260814.md`.
10. `docs/orbit360-live-state-v1.json` + checkpoint vigente + PR #5 + HEAD vivo.

Precedencia: reglas maestras/addenda → PR/HEAD/estado vivo → Plan Maestro → evidencia modular reciente. No reabrir trabajo cerrado por documentación anterior desactualizada.

## Reglas de ejecución permanentes

- autorización por bloque macro de riesgo, no micro-pasos;
- diagnóstico, documentación y validación estática/sintética continúan sin autorización adicional;
- ejecutar primero el gate canónico antes de secretos/browser/deploy;
- repetición de etapa/familia de fallo activa `STOP_RETRY`;
- producción no se usa para desarrollar validators;
- no modificar Auth/usuarios/memberships/datos por intuición;
- 0% manual salvo imposibilidad técnica real;
- no reimportar Clientes/Aseguradoras para resolver visualización, acceso, cache, proyección o gates;
- no avanzar a otro módulo mientras el gate final de go-live siga abierto.

## Infraestructura transversal que NO se reconstruye por módulo

Se reutiliza en módulos posteriores:

- Auth/membership/scopes;
- multirol y rol activo;
- `Orbit.store` + write guard;
- manifiesto canónico de colecciones;
- aliases lógico → físico;
- readiness de colecciones activas;
- smoke multirol/multivista;
- diagnóstico sanitizado;
- integridad before/after + digests;
- cero escrituras en bloques read-only;
- rollback fail-closed;
- causa raíz + `STOP_RETRY`;
- request inmutable y gate único.

## Reglas de negocio permanentes

- GT → GTQ; CO → COP.
- Falta país/moneda confiable → `REQUIERE_VALIDACION`.
- Solo `Vigente` / `Por renovar` genera recibos/cartera.
- Cancelada/Vencida/Anulada/Rechazada permanece histórico.
- Prima = neta + gastos + IVA/impuestos + total.
- Producción, metas y comisiones sobre prima neta recaudada.
- Cobros/recaudos no son `finmovs`.
- Estados bancarios solo concilian; no crean cobros por inferencia.
- Documentos soporte proponen con diff/confirmación; no escriben silenciosamente.

## Arquitectura

```txt
orbit360-platform/
├── index.html
├── styles/
├── data/
├── core/
├── modules/
├── docs/
└── tools/
```

Los módulos consumen `Orbit.store`; el backend se adapta al store y no al revés. A&S continúa configurado como tenant, sin fork ni hardcode de datos/credenciales en módulos genéricos.
