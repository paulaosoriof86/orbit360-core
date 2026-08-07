# Orbit 360 A&S — v27 rootfix Buffer/full-path — 2026-08-07

## Bloque
Block 1 Cliente 360 + Aseguradoras. Source-only. Base canónica autorizada: `7f4c76db09b164e0f05d5a53d7ba284932be8fa2`.

## Causa raíz heredada de v26
`PIPELINE_MECHANISM_FAILURE / INVALID_SPAWNSYNC_ENCODING_BUFFER` en `tools/orbit360-reconcile-client-provenance-v26-source-v20260807.mjs`.

## Implementación v27
- reutiliza el paquete v26 sin rediseñar dedupe ni producto;
- reemplaza el encoding inválido de `git cat-file --batch` por stdout Buffer real (`encoding` omitido mediante `null`);
- permite ejecutar `scanHistory()` sobre un root sintético para cobertura end-to-end;
- añade fixture que crea un repositorio Git temporal, registra un locator de cliente en un commit histórico, lo elimina del árbol actual y exige que `rev-list -> batch-check -> cat-file --batch -> Buffer parse` recupere la referencia histórica;
- el fixture completo fue ejecutado antes de abrir el gate GitHub y obtuvo `PASS_V27_FULL_HISTORY_BUFFER_PATH`.

## Carriles
A Frontend/UX: congelado.  
B Control-plane: solo rootfix de pipeline source.  
C Datos/migración: el reconciliador source-safe de los 16 se ejecutará dentro del único gate source v27; no LAB, no writes.

## Seguridad
Cero Firebase LAB, secretos, Auth, Hosting, browser, reimportación, producción, main o merge. Ningún dato real se imprime en el fixture.

## Evidencia terminal
El resultado terminal de la única ejecución source v27 se registra en la PR técnica v27 y en el estado vivo de PR #5 para no crear un segundo run solo por documentación.

## Siguiente frontera
Si el source v27 PASS resuelve la procedencia documental, reutilizar esa adjudicación. Si quedan fingerprints sin procedencia, diseñar una única frontera focal mínima; no reabrir el universo completo ni la matriz visual antes de universe PASS.
