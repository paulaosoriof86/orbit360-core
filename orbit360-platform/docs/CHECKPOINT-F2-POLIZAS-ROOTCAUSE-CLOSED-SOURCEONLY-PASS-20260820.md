# CHECKPOINT F2 — Pólizas causa raíz cerrada · rootfix source-only PASS

**StateVersion:** `F2-R12-CONSUMED-ROOTFIX-SOURCEONLY-PASS-20260820-02`  
Fecha canónica: 2026-08-20 UTC  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR #5: draft/open

## Cierre causal

La repetición Request10/Request12 no se cierra como un simple timeout obsoleto. La causa raíz quedó demostrada en el adaptador productivo read-only:

`FUNCTIONAL_DEFECT:F2_PRODUCT_READONLY_GET_FULL_COLLECTION_CLONE_AMPLIFICATION`

Cadena causal comprobada:

1. Pólizas renderiza hasta 100 filas visibles.
2. Cada fila resuelve cliente, aseguradora y asesor.
3. Esos helpers terminan en `Orbit.store.get(...)`.
4. El adaptador productivo implementaba `get()` como `all(collection).find(...)`.
5. `all()` clona toda la colección con serialización JSON antes de encontrar una sola fila.
6. Para las tres columnas de 100 filas, con los volúmenes observados de Request12, se producen 46,300 clonaciones de filas para 300 lookups: amplificación `154.33x`.
7. El runtime Request12 había mostrado timeout nominal de 20 s pero elapsed de 64,680 ms; la captura final solo respondió cuando el hilo volvió a estar disponible. Esto es coherente con saturación síncrona y no con un simple waiter que perdió un estado ya disponible.

Evidencia causal: `orbit360-platform/runtime-gate-crm-v20260716/f2-polizas-read-amplification-proof-v20260820.json` — `ok:true`, `F2_POLIZAS_READ_AMPLIFICATION_SOURCE_PROOF_PASS`.

## Rootfix

Owner protegido modificado de forma mínima:

`orbit360-platform/data/store-firestore-product-readonly-p0.js`

Cambio:

- antes: `get -> all(collection) -> clone toda colección -> find`;
- después: `get -> find sobre cache -> clone únicamente fila encontrada`.

Commit source rootfix: `23412e7f6c58cdd5193d8ef9d09dfabd449d12f6`.

No se modificó Pólizas, router, scopes, query planner, Firestore, tenant, API pública ni write guards.

## Verificación post-fix

Evidencia: `orbit360-platform/runtime-gate-crm-v20260716/f2-product-readonly-get-rootfix-sourceonly-v20260820.json`.

Resultado: `ok:true / F2_PRODUCT_READONLY_GET_ROOTFIX_SOURCEONLY_PASS`.

Verificado:

- `get()` no llama `all()`;
- acceso directo a cache + clon de una sola fila;
- aislamiento de retorno preservado;
- mutar el resultado de `get`, `all` o `where` no muta cache;
- `get` missing → `null`;
- `all`, `where`, `find`, `_emit` y API pública preservados;
- `insert`, `update`, `remove`, `setPref`, `reseed` siguen bloqueados;
- modo productivo sigue read-only;
- sin hardcode de A&S;
- browser/secrets/Firestore/writes = 0 durante la prueba.

## Candidata anterior

Artifact `9387820198` queda preservado como evidencia histórica exacta de Request12, pero **no puede reutilizarse para el siguiente runtime** porque fue construido antes del rootfix.

Estado: `SUPERSEDED_FOR_NEXT_RUNTIME_BY_SOURCE_ROOTFIX`.

Cualquier próximo runtime deberá usar una candidata nueva que incluya el commit source rootfix y pase contratos/source-only antes de ser autorizada. Esto no autoriza package rebuild, Request13, deploy ni producción por sí solo.

## Continuidad y anti-bucle

- Request11: consumido/no replay.
- Request12: consumido/no replay.
- Request13: no autorizado.
- Causa raíz funcional: `CLOSED_SOURCEONLY_VERIFIED`.
- Documentación debe sincronizarse transaccionalmente al nuevo StateVersion.
- El invariant canónico debe volver a cerrar PASS después de la sincronización.
- Si diverge cualquier owner, `PIPELINE_MECHANISM_FAILURE:DOCUMENTATION_STATE_DRIFT` y se detiene avance.

## Carriles

- A — frontend/UX/Academia: producto visible sin mutación adicional; Academia actualizada al rootfix.
- B — backend/security/store/gates: rootfix source-only PASS; continuidad pendiente de re-audit.
- C — datos reales A&S: sin cambios.

## Siguiente acción después del continuity PASS

Preparar una **nueva candidata F2 source-only** que incorpore el rootfix, validarla contra contratos y hashes, sin deploy ni producción. Solo después se evalúa una autorización runtime sucesora.

Ruta inmediata a producción: permanece 50%. Programa integral: permanece 25% hasta F2 terminal PASS.
