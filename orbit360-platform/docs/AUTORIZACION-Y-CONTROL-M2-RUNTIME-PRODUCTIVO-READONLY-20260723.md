# M2 — Autorización y control del runtime productivo read-only

Fecha: 2026-07-23  
Gate: `block2-product-readonly-runtime-v20260723`  
Contrato: `2.1.0`  
Estado inicial: `AUTHORIZED_ONCE`

## Autorización recibida

Paula autorizó continuar con la siguiente acción exacta de M2 exclusivamente para:

1. identificar el proyecto productivo correcto mediante referencias de entorno;
2. configurar Auth productivo;
3. crear una membership inicial auditada e idempotente;
4. aplicar Firestore Rules read-only;
5. aplicar Storage Rules read-only;
6. ejecutar el bootstrap canónico y el smoke productivo read-only;
7. conservar únicamente evidencia sanitizada.

No se autorizaron Hosting, Functions, importaciones, Pólizas, M3, escrituras operativas, merge ni `main`.

## Clasificación de causa raíz

`PIPELINE_MECHANISM_FAILURE`

La implementación estática estaba validada, pero no existía un workflow runtime registrado que pudiera ejecutar el alcance autorizado después del preflight. No se modificaron módulos funcionales ni datos para resolverlo.

## Control plane añadido

- registro y overlay del gate runtime;
- lifecycle con capacidades exactas;
- preflight canónico antes de secretos;
- workflow de una sola ejecución ligado a solicitud inmutable;
- Firestore y Storage Rules separadas de LAB;
- bootstrap Auth/membership auditado;
- smoke real del owner `backend-product-readonly-bootstrap-p0` y de `Orbit.store`;
- cross-tenant y credentialRefs denegados;
- rollback de configuración;
- fail-closed de Rules a deny-all ante fallo posterior;
- evidencia sanitizada y commit status observable.

## Referencias de entorno requeridas

Los valores no se documentan ni se imprimen. El workflow espera referencias seguras para proyecto, service account, API key web, UID y correo del usuario inicial.

Si falta alguna referencia, el resultado obligatorio es `ENVIRONMENT_FAILURE`; no se toca producto, datos ni otro módulo.

## Criterio de cierre

Solo se acepta `ok:true` con:

- Auth productivo PASS;
- membership PASS;
- tenant isolation PASS;
- rol activo y scopes PASS;
- store productivo read-only PASS;
- cross-tenant DENEGADO;
- fallback IMPOSIBLE;
- escrituras operativas BLOQUEADAS.

## Impacto Claude / Academia

- `REPLICABLE_CLAUDE_ACUMULADO`: estados fail-closed, membership-first y roles/scopes visibles.
- Backend protegido, Firebase, Rules, referencias de entorno y membresías reales no se comparten con Claude.
- Academia 1.235 explica autorización vs ejecución y defecto funcional vs fallo de entorno/pipeline.
