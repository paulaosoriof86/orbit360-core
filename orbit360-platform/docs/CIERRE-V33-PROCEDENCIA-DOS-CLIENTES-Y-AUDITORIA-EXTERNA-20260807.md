# V33 · procedencia de dos clientes pendientes y frontera de auditoría externa

Fecha: 2026-08-07
Gate: `block1-client360-insurers-lab-v20260717`
Owner: `DATA_MIGRATION_TRACEABILITY_CLIENT_CREATION_PROVENANCE`
Base: `84d6daf66c99bba8fe6b4df5c9e327c05ec469dc`

## Clasificación
`DATA_CONTRACT_FAILURE`.

## Evidencia acumulada que no debe repetirse
- v28: los 16 documentos non-baseline fueron creados/actualizados después del cierre y carecen de batch/source/audit actor/reason.
- v29: 0/16 match contra baseline 414 y seed ficticio actual.
- v32: 14/16 ligados objetivamente al conjunto original de 26 `REQUIERE_VALIDACION`; quedan 2 fingerprints sin match.
- Los 14 ligados a retained26 permanecen no efectivos; los probables no se convierten automáticamente en duplicados.

## Revisión histórica de repo/PR/Actions
La carga inicial documentada el 14-jul tenía flujo controlado de escritura vía `Orbit.store` y contrato 414 clientes + 26 retenidos. El incidente del 15-jul afectó únicamente configuración de asesores y declaró explícitamente que no modificaba clientes/aseguradoras. Los cierres/gates posteriores preservan 414/26 y registran ausencia de reimportación o writes deliberados de clientes/aseguradoras.

No se encontró en la evidencia versionada de repo/PR/Actions un run o mecanismo post-cierre que atribuya autoritativamente los 2 fingerprints pendientes a una operación concreta. No se infiere que sean CRUD de prueba, altas legítimas, residuales ni administrativas.

## Causa raíz refinada
`TWO_POST_CLOSURE_CLIENTS_HAVE_NO_VERSIONED_OR_DOCUMENT_LEVEL_CREATION_TRACE_AND_REQUIRE_AUTHORITATIVE_EXTERNAL_AUDIT_OR_CONTROLLED_HUMAN_ADJUDICATION`.

El defecto ya no es de visualización, importador o validador: el sistema histórico permitió documentos de cliente sin trazabilidad durable suficiente para reconstruir su actor/mecanismo de origen desde el propio dato o el ledger versionado.

## Frontera material nueva
Se prepara v33 source-only para consultar exclusivamente Google Cloud Audit Logs/Logging API de Firestore para los 2 documentos, con IDs resueltos solo en memoria y ventana 2026-07-24..2026-08-08. Máximo: 1 lectura locator Firestore + 2 consultas Logging. Salida permitida: fingerprint, existencia de evento de escritura, categoría de actor, categoría de mecanismo y timestamps; prohibido persistir document ID, resourceName, principalEmail, IP o log crudo.

`AUDIT_NO_MATCHING_WRITE_ENTRY` no equivale a demostrar que no hubo escritura. Si Logging Data Access no está disponible, está deshabilitado o el service account carece de permiso, cerrar como pérdida estructural de trazabilidad y pasar a decisión humana controlada; no crear otra auditoría general.

## Estado
- Source probe preparado; no ejecutado contra LAB/Logging.
- Sin secrets, Firestore runtime, Logging runtime, writes, reimportación, Hosting, browser, producción, main o merge.
- Universe 414/26/7 sigue bloqueado hasta adjudicar los 2.
- Visual sigue no elegible.
