# Block 1 — v28 focal provenance + universe read-only

Fecha: 2026-08-07. Gate: `block1-client360-insurers-lab-v20260717`. Owner: `1.0.41`.

## Fuente/base
HEAD autorizado: `f453b3c89a1e697230369e9d49197b16f4973efe`. Predecesores vigentes: v25 diagnóstico diferencial y v27 rootfix/scan source-safe. Contrato preservado: 414 clientes / 26 aseguradoras / 7 asesores.

## Necesidad y causa raíz
v27 agotó la evidencia source-safe de los 16 clientes no-baseline: 0 seed actual, 0 seed histórico, 0 referencia directa y 0 patrón determinista. Los fingerprints son unidireccionales; la siguiente evidencia útil requiere resolver locators LAB de forma focal.

Además, el router canónico seguía enlazado al lifecycle v23 congelado. Se clasifica como `VALIDATOR_STALE` del control-plane y se corrige mediante un perfil v28 explícito del mismo gate/owner, sin cambiar el contrato ni el producto.

## Implementación autorizada
1. Gate-contract canónico con perfil v28 antes de secretos.
2. Pase `listDocuments()` ID/reference-only sobre `clientes`; hash de IDs en memoria y descarte inmediato de no matches.
3. Lectura proyectada exclusivamente de los 16 matches y campos técnicos de procedencia/estado, usando también `createTime/updateTime` del snapshot.
4. Clasificación sanitizada por fingerprint.
5. Solo si los 16 quedan adjudicados sin contradicción: proyección técnica de Clientes/Aseguradoras y conteo reference-only de Asesores; universe gate 414/26/7 con dedupe compuesto v27.
6. Nunca ajustar el contrato para forzar PASS.

## Límites
Máximo lógico: 5 operaciones de lectura; hasta 16 documentos focales con payload técnico. Cero writes, Auth reads/writes, reimportación, Functions, Rules, Hosting, browser, producción, main o merge. Producto, owner, matriz, observer, Auth, Orbit.store, importadores, PWA/SW, Rules y backend protegido permanecen congelados.

## Estado source
Pendiente del único source gate v28. La evidencia terminal runtime se registrará en PR #5 y en los artifacts sanitizados persistidos por la ejecución one-shot; no se abrirá otro run solo para documentación.
