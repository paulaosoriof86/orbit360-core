# Claude acumulado — patrón reusable v25

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

## Patrón reusable

Cuando un universo observado difiere del contrato:

- no ajustar datos para hacer coincidir el conteo;
- resolver pertenencia al baseline mediante un identificador de batch/manifest estable;
- producir solo el conjunto diferencial;
- separar `baselineMember`, `postBaseline`, `excluded`, `requiresValidation`;
- exigir procedencia objetiva antes de declarar `VALIDATOR_STALE`;
- conservar `REQUIERE_VALIDACION` si la evidencia es insuficiente;
- no incluir PII en artifacts de diagnóstico;
- una autorización diagnóstica one-shot se consume aunque no haya writes.

## No transferir a Claude

- nombres, correos, documentos o IDs reales;
- projectId/tenant secrets/credenciales;
- payloads A&S;
- implementación Firebase/backend protegido;
- fingerprints reales obtenidos en LAB.

El patrón es reusable; los resultados concretos del tenant son `TENANT_AYS_ONLY`.
