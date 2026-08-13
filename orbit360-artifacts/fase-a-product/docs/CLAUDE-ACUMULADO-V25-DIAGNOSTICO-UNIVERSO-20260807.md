# Claude acumulado — patrón reusable v25

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

## Patrón reusable

Cuando un universo observado difiere del contrato:

- no ajustar datos para hacer coincidir el conteo;
- resolver pertenencia al baseline mediante un identificador de batch/manifest estable;
- producir solo el conjunto diferencial;
- separar `baselineMember`, `postBaseline`, `excluded`, `requiresValidation`;
- exigir procedencia objetiva antes de declarar una alta legítima posterior;
- conservar `REQUIERE_VALIDACION` si la evidencia es insuficiente;
- no incluir PII en artifacts de diagnóstico;
- una autorización diagnóstica one-shot se consume aunque no haya writes.

## Patrón adicional demostrado por v25

Una clave importada de una fuente no debe convertirse automáticamente en clave única global. Antes de deduplicar:

1. verificar si el contrato de la fuente garantiza unicidad;
2. combinar identidad de entidad, país, tipo y procedencia cuando corresponda;
3. respetar colisiones conocidas documentadas como entidades distintas;
4. si la colisión no puede adjudicarse, marcar `REQUIERE_VALIDACION`;
5. no fusionar ni excluir para satisfacer un conteo contractual;
6. adjudicar la salida de un validator contra la fuente rectora antes de tocar datos.

El caso A&S demostró un falso positivo de deduplicación por tratar un código de fuente compartido como universalmente único. El patrón reusable es la regla de diseño, no los nombres, códigos ni fingerprints reales.

## No transferir a Claude

- nombres, correos, documentos o IDs reales;
- códigos reales de entidades;
- projectId/tenant secrets/credenciales;
- payloads A&S;
- implementación Firebase/backend protegido;
- fingerprints reales obtenidos en LAB.

Resultados concretos del tenant: `TENANT_AYS_ONLY`.  
Fix reusable de deduplicación/procedencia: `REPLICABLE_CLAUDE_ACUMULADO`.
