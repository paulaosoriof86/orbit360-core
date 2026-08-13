# CIERRE CAUSA RAÍZ — VALIDATOR_STALE EN AUTORIZACIÓN RECIBOS/CARTERA 9.1.0

Fecha operativa: 2026-07-30  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Incidente

El primer run del write autorizado 9.1.0 fue `30603147547` y se detuvo en el gate canónico, antes de leer secretos, descargar paquetes, acceder a Firestore o ejecutar el writer.

## Clasificación

`VALIDATOR_STALE`.

No fue defecto de datos, autorización, hashes, writer, Firestore ni permisos.

## Causa raíz

El gate 9.1.0 reutilizaba una condición válida para PREWRITE: `REQUEST_ABSENT`. Una vez creada la autorización inmutable, esa condición seguía ejecutándose sin distinguir la fase AUTHORIZED_WRITE y bloqueaba correctamente el pipeline, pero por una regla de lifecycle obsoleta.

Fallaron únicamente:

- `REQUEST_ABSENT`;
- `STATIC_TEST_EXIT`;
- `STATIC_TEST_PASS`.

Los restantes 27 checks contractuales pasaron. El run reportó `dataAccess:false`, `secretAccess:false`, `firestoreRead:false`, `operationalWrites:0` y `productionTouched:false`.

## Corrección estructural

Se conserva contrato funcional `9.1.0` y el mismo request autorizado. No se modifica ningún hash, digest, conteo o alcance.

El lifecycle queda explícito:

- `PREWRITE`: request ausente obligatorio;
- `AUTHORIZED_WRITE`: request exacto e inmutable obligatorio;
- el request autorizado se valida contra frase, ocho hashes/digests y scope 1293/673/32/0/0;
- el gate continúa ejecutándose antes de secretos y Firestore;
- el writer continúa protegido por su propia validación del request;
- no se genera segunda autorización por una falla `VALIDATOR_STALE` previa a secretos/Firestore.

Archivos coordinados:

- `tools/orbit360-validator-lifecycle-contract-receipts-portfolio-static-v910-20260730.json`;
- `tools/orbit360-validar-gate-contracts-engine-receipts-portfolio-static-v910-20260730.mjs`;
- `tools/orbit360-test-receipts-portfolio-controlled-write-static-v910-20260730.mjs`;
- `.github/workflows/orbit360-receipts-portfolio-write-once-v910-20260730.yml`;
- `orbit360-platform/docs/ACADEMIA-IMPACT-CARTERA-HISTORICA-EXIGIBLE-20260730.md`.

## Autorización preservada

Request inmutable:

`.github/orbit360-requests/receipts-portfolio-write-v910-20260730.json`

Commit de autorización: `b91435847e126676e7f070bc0671ad1aa1f96cd8`.

No se crea un segundo request ni se solicita una segunda autorización. La reanudación se hará mediante trigger técnico separado que referencia el mismo request.

## Estado

`VALIDATOR_STALE_ROOT_CAUSE_CLOSED`.

La escritura continúa congelada hasta que el gate AUTHORIZED_WRITE cierre en `GO_GATE_CONTRACT`. Si la misma etapa/código vuelve a fallar, aplica STOP_RETRY.

## Claude / Academia

El patrón PREWRITE vs AUTHORIZED_WRITE es reusable y se acumula para Claude sin secretos, hashes ni datos reales. Writer, gate, request y evidencia real permanecen `BACKEND_PROTEGIDO_NO_CLAUDE`.
