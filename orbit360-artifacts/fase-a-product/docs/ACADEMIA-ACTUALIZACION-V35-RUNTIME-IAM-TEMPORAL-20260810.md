# ACADEMIA — V35 RUNTIME IAM TEMPORAL, GATES Y ROLLBACK

Fecha: 2026-08-10

## Aprendizaje incorporado

Un cambio IAM temporal debe modelarse como un lifecycle completo, no como un grant aislado:

`preflight → GO → capability test → baseline policy+etag → grant → readback → evidencia → revoke → readback final`.

## Reglas pedagógicas

- Preparar código source-only no equivale a autorizarlo.
- `GO_GATE_CONTRACT` debe ocurrir antes de secretos y capacidades.
- Si el principal que ejecutaría IAM no puede modificar la policy, se detiene antes de escribir; no se busca privilegio alternativo de forma automática.
- El `etag` evita sobrescribir cambios concurrentes.
- Un rollback seguro elimina solamente el binding temporal propio y preserva cambios externos.
- Un validador debe detectar semántica operativa, no palabras aisladas. La cadena `firebase-admin` en un user-agent no significa que el worker importe Firebase Admin.
- Dos fallos del mismo stage activan anti-bucle; un fallo de predecessor-contract y uno de hard-boundary son stages distintos y deben registrarse por separado.

## Caso v35

El runtime futuro queda limitado a una Log View, máximo 2 IAM writes y cero Firestore/Auth/operational writes. La preparación source terminó PASS y el runtime continúa sin autorización.

Clasificación: `ACADEMIA_ACTUALIZAR`.
