# Academia — Autorización persistida, request inmutable y control anti-deriva F2

Fecha: 2026-08-20.

## Caso

Request11 fue autorizado por la usuaria, pero la autorización quedó fuera del repositorio. Paralelamente, una sincronización documental previa validó solo algunos punteros y dejó espejos internos rezagados. El resultado fue una regresión metodológica: nuevas sesiones podían volver a pedir autorización y reprocesar la frontera.

## Clasificación correcta

`PIPELINE_MECHANISM_FAILURE / DOCUMENTATION_STATE_DRIFT / AUTHORIZATION_PERSISTENCE_GAP`.

No era defecto funcional de Pólizas, autenticación, datos ni candidata.

## Patrón reusable

- La autorización humana sensible debe persistirse en un registro canónico sin secretos ni PII.
- El registro debe ligar gate, requestVersion, ordinal, candidata, hashes, alcance y número máximo de ejecuciones.
- El request inmutable debe referenciar el path y SHA256 del registro.
- El gate debe verificar ambos antes de artefactos, secrets, Firestore o browser.
- La autorización narrativa en documentos de estado no puede ser la autoridad de ejecución.
- Un self-test que prohíba el nuevo contrato debe clasificarse `VALIDATOR_STALE` y corregirse antes de consumir el request.
- Un request de runtime se consume una vez; nunca se crea un ordinal nuevo para compensar una autorización perdida.
- La sincronización documental debe validar todas las proyecciones activas, no solo el checkpoint superior.
- Ante dos fallos del mismo mecanismo, detener reintentos y cambiar de mecanismo solo después de causa raíz.

## Evidencia de implementación Request11

- Registro persistido: `.github/orbit360-authorizations/f2-productive-acceptance-runtime-browser-readonly-request11-v20260820.json`.
- SHA256: `d7e6bf2a110b1fc83357f7b6420f9164f77048cfae25146df15dd8cad01e1698`.
- Persistencia: `e9c18005d6a3c9493249dc9db18e56b3e5cbbb0a`.
- Gate binding: `4edb1ad1cbcec744f745191de1817626ec03f46a`.
- Self-test actualizado: `9f3857d60a16a34ffd84edc6fce7038533602eda`.
- Request11 inmutable: `1809552cc6dceacae1527be34299ef17b32bff98`.
- Candidata: artifact `9387820198`, source `fc46bd85783d8b4d524cbeb0fee54ee9a2c774af`.

## Seguridad

La autorización continúa siendo read-only: cero escrituras de Firestore/Auth/membership/datos/operación; cero deploy/publicación/producción; sin main ni merge. El gate fail-closed precede a artefacto, provider, secrets, Firestore y browser.

## Estado pedagógico

La evidencia terminal de Request11 aún debe observarse antes de declarar F2 PASS o FAIL. La ausencia temporal de evidencia no autoriza un replay.
