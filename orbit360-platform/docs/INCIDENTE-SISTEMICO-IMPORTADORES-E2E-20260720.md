# Incidente sistémico de importadores E2E — 2026-07-20

Repositorio: `paulaosoriof86/orbit360-core`
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open
Bloque activo: M1 Cliente 360 + Aseguradoras
Producción: no autorizada

## Estado

**FREEZE_IMPORTERS_UNTIL_E2E_GATE**

Se suspenden nuevos reintentos manuales y nuevos parches aislados sobre importadores hasta que exista un gate integral obligatorio y sanitizado.

## Evidencia del incidente

- El archivo de Guatemala fue leído y clasificó 14 operaciones, 13 actualizaciones, 13 referencias de conexión y 70 cuentas.
- El archivo de Colombia fue leído y clasificó 16 operaciones, 15 actualizaciones y 26 referencias de conexión.
- Los intentos terminaron con `confirmacion_remota_incompleta`.
- Verificación read-only posterior:
  - clientes: 414;
  - aseguradoras: 26;
  - portales: 77;
  - eventos remotos de importación: 0;
  - ítems remotos: 0;
  - referencias opacas: 0;
  - campos sensibles en Firestore: 0.
- Run diagnóstico: `29766805572`.

## Clasificación

- Falla inmediata: `DATA_CONTRACT_FAILURE`.
- Causa raíz inmediata: `FRONTEND_TARGET_CONTRACT_NOT_E2E_VALIDATED`.
- Hallazgo sistémico: `NO_MANDATORY_BROWSER_TO_BACKEND_TO_STORE_ACCEPTANCE_GATE`.

## Causa raíz

Los importadores habían sido validados principalmente en estas capas:

1. lectura del archivo;
2. detección de hojas y encabezados;
3. normalización;
4. construcción de operaciones;
5. dry-run y bloqueos;
6. confirmación visual.

No existía un cierre obligatorio que demostrara, en la misma evidencia:

1. sesión real restaurada en navegador;
2. rol activo canónico;
3. operación y target interno resueltos;
4. llamada al proveedor/backend;
5. respuesta remota positiva;
6. escritura efectiva o referencia opaca;
7. ausencia de secretos en el store operativo;
8. auditoría de éxito y de rechazo;
9. relectura posterior desde Firestore;
10. rollback del fixture sintético.

Por eso una capa podía aprobar mientras la siguiente nunca era invocada. Los validadores estructurales y los smokes puros no eran suficientes para declarar funcional el importador completo.

## Defectos de contrato identificados

- El dry-run y el payload protegido no comparten un target canónico obligatorio.
- La resolución aseguradora–portal se duplicó en varias capas y podía divergir.
- La UI resumía errores diferentes bajo `confirmacion_remota_incompleta`.
- La auditoría remota registraba éxito, pero no todos los rechazos previos.
- El estado visual podía demostrar lectura del archivo sin demostrar aplicación real.
- La publicación del frontend no implicaba automáticamente aceptación E2E.

## Regla nueva obligatoria

Ningún importador puede marcarse como funcional, cerrado o listo para producción únicamente con parser, dry-run, smoke puro o UI.

Debe aprobar un gate E2E con fixture sintético y rollback:

`archivo/fixture → parser → mapeo → dry-run → confirmación → Auth/rol → backend → store → relectura → auditoría → rollback`

El gate debe producir evidencia sanitizada `ok:true`, sin PII ni secretos.

## Gate propietario propuesto

`importers-e2e-acceptance-lab-v20260720`

Predicados mínimos:

- `preflightOk:true`;
- `browserAuthReady:true`;
- `activeRoleResolved:true`;
- `sourceParsed:true`;
- `dryRunProduced:true`;
- `targetIdsResolved:true`;
- `providerInvoked:true`;
- `remoteConfirmation:true`;
- `storeWriteObserved:true` o `opaqueReferenceObserved:true`;
- `readAfterWriteOk:true`;
- `auditSuccessObserved:true`;
- `auditFailureObserved:true`;
- `plaintextSecretsInOperationalStore:false`;
- `rollbackOk:true`;
- `ok:true`.

## Orden de corrección

1. Definir contrato canónico de ejecución de importadores.
2. Unificar identidad, rol activo, tenant y target en una sola fuente.
3. Añadir códigos de error sanitizados por etapa.
4. Construir gate E2E sintético con rollback.
5. Reparar primero `directorio_aseguradoras` contra ese gate.
6. Ejecutar el gate una sola vez.
7. Solo después repetir una vez la carga real GT/CO.
8. Extender el mismo gate a clientes, pólizas, vehículos, cobros, planillas, bancos, histórico, documentos y configuración.

## Restricciones

- No pedir nuevas cargas manuales mientras el gate E2E no apruebe.
- No reimportar las 26 aseguradoras.
- No avanzar a Pólizas ni Cobros para evadir el bloqueo.
- No crear otro importador paralelo.
- No guardar valores sensibles en GitHub, logs, artefactos o Firestore operativo.
- No merge, `main`, producción, DNS ni deploy productivo.

## Clasificación para Claude y Academia

- `REPLICABLE_CLAUDE_ACUMULADO`: contrato canónico, estados honestos, errores por etapa y gate E2E reusable.
- `ACADEMIA_ACTUALIZAR`: diferencia entre archivo leído, dry-run aprobado e importación realmente aplicada.
- `BACKEND_PROTEGIDO_NO_CLAUDE`: Auth, proveedor seguro, Functions, Secret Manager, auditoría y rollback.
- `SECRETO_DATO_REAL`: usuarios, contraseñas y números completos.
