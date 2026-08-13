# CLAUDE ACUMULADO — V36 IAM VISIBILITY FAIL-CLOSED

Fecha: 2026-08-10

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

## Patrón reusable

Cuando una identidad técnica necesita descubrir quién puede administrar un recurso IAM:

1. separar visibilidad IAM de modificación IAM;
2. ejecutar gate antes de materializar credenciales;
3. limitar el diagnóstico a lecturas explícitas y presupuestadas;
4. usar una primera lectura de jerarquía para resolver el scope aplicable;
5. usar un analizador IAM únicamente si la identidad posee la capacidad de lectura requerida;
6. no interpretar una denegación del analizador como ausencia de administradores;
7. no interpretar `candidateCount=0` como conjunto vacío si el mecanismo de enumeración no llegó a completarse;
8. ejecutar validación efectiva por candidato únicamente después de haber obtenido candidatos de forma autoritativa;
9. persistir únicamente fingerprints y estados sanitizados;
10. ante visibilidad insuficiente, detener antes de cualquier modificación y consumir el request.

## Orbit 360 v36

Resultado:

`ENVIRONMENT_FAILURE / IAM_POLICY_ANALYZER_READ_FORBIDDEN`

Observado:

- lectura de jerarquía: 1;
- scope: PROJECT;
- respuestas exitosas de Policy Analyzer: 0;
- Policy Troubleshooter: 0;
- candidatos: 0;
- IAM writes: 0;
- Firestore/Auth/Logging entries: 0.

La salida correcta no es `NO_ADMIN_EXISTS`, sino:

`CURRENT_DIAGNOSTIC_IDENTITY_HAS_INSUFFICIENT_IAM_VISIBILITY_TO_ENUMERATE_ADMIN_EXECUTORS`.

## Anti-patrones

- autoescalar la identidad objetivo para que pueda descubrir o concederse privilegios;
- asumir que un rol por nombre implica acceso efectivo;
- persistir principals reales o policies raw para depurar;
- cambiar de API y repetir automáticamente después de un STOP autorizado una sola vez;
- convertir un error 403 de una lectura administrativa en una conclusión sobre el contenido de IAM.

No compartir con Claude secrets, correos reales de principals, IDs internos, policies raw, credenciales ni datos de clientes.
