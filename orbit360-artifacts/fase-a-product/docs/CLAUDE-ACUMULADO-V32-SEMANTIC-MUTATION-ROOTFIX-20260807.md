# Claude acumulado — v32

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`.

Reusable: validación semántica source-only de mutaciones según procedencia Firestore, con fixtures positivos/negativos; envelope encryption efímero para reconciliación privacy-preserving; field mask mínimo y evidencia sanitizada.

No enviar: PII real de las 26 filas retenidas, identidades de los 16 objetivos, clave privada, secretos LAB, backend protegido, Auth, Rules o datos tenant A&S.

Regla: no usar regex genéricas por nombre `set/update/delete/create` para probar ausencia de writes; distinguir DocumentReference/WriteBatch/Transaction/BulkWriter de APIs homónimas no operacionales.
