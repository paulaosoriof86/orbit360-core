# Cierre de causa raíz — Importadores E2E y gate legal

Fecha: 2026-07-20  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Producción: no autorizada

## Estado

`FREEZE_IMPORTERS_E2E_CONFIRMATION_STAGE`

No se permiten más cargas reales ni nuevas ejecuciones del gate hasta reconciliar el ciclo de vida completo de la sesión sintética.

## Evidencia acumulada

### Ejecución 29770504103

- Preflight: aprobado.
- Autenticación: aprobada.
- Rol activo: resuelto.
- Fuente sintética: leída.
- Operaciones: 1.
- Referencias detectadas: 1.
- Target interno: resuelto.
- Etapa final: `dry_run_produced`.
- Proveedor invocado: no.
- Rollback: completo.
- Conteos restaurados: 414 clientes, 26 aseguradoras y 7 asesores.

### Ejecución 29771152601

- Preflight: 227/227 aprobado.
- Autenticación: aprobada.
- Rol activo: resuelto.
- Fuente sintética: leída.
- Operaciones: 1.
- Referencias detectadas: 1.
- Target interno: resuelto.
- Etapa final: `dry_run_produced`.
- Proveedor invocado: no.
- Rollback de fixture: completo.
- Rollback de bóveda: completo.
- Otros registros preservados: sí.
- Conteos restaurados: 414 clientes, 26 aseguradoras y 7 asesores.

## Clasificación

- Categoría: `PIPELINE_MECHANISM_FAILURE`.
- Etapa repetida: `dry_run_produced → primer clic operativo`.
- Causa raíz: `SYNTHETIC_BROWSER_LEGAL_GATE_NOT_SATISFIED`.

## Diagnóstico

La autenticación muestra la aplicación y, después, activa el gate legal para el usuario. Una sesión persistente puede tener la aceptación registrada, pero el navegador sintético empieza vacío.

El gate legal:

- consulta la aceptación por usuario y versión;
- crea un overlay `drawer-back open` cuando falta;
- exige marcar la casilla;
- exige pulsar “Aceptar y continuar”;
- registra la aceptación una sola vez.

El ejecutor E2E no modelaba esta condición. Pudo leer el archivo y construir el dry-run mediante operaciones programáticas, pero el primer clic real quedó cubierto por el overlay legal. Por eso no apareció la primera confirmación del importador y el proveedor nunca fue invocado.

No es un defecto del Excel, del parser, del target, de IAM ni del backend seguro. Es una omisión del contrato de ciclo de vida del navegador de prueba.

## Cambios aplicados

- Workflow E2E congelado y sin disparo automático.
- Contrato canónico actualizado a `20260720.2`.
- Nuevo predicado obligatorio: `legalGateSatisfied`.
- Nuevo código de etapa: `LEGAL_GATE_PENDING`.
- Prohibición de clic operativo antes de resolver identidad, rol, tenant y gate legal.
- Bootstrap actualizado para exigir contrato `20260720.2`.
- Academia actualizada a `1.226` con sesión legal y diferencia entre defecto funcional y fallo del gate.

## Regla de desbloqueo

Una futura revisión solo puede reactivar el gate cuando exista un contrato de sesión que demuestre, antes del primer clic:

```txt
browserAuthReady:true
activeRoleResolved:true
legalGateSatisfied:true
tenantResolved:true
```

La aceptación debe completarse mediante la UI legal real o mediante un fixture de estado equivalente validado por el owner legal. No puede ocultarse, eliminarse ni saltarse.

Después deberá ejecutarse una sola vez una nueva revisión registrada del gate. No se reutilizan los runs anteriores.

## Restricciones

- No repetir las cargas reales de Guatemala y Colombia.
- No ejecutar otro gate con la revisión actual.
- No modificar el importador para adaptarlo al test.
- No desactivar ni evitar el acuerdo legal.
- No reimportar las 26 aseguradoras.
- No avanzar a Pólizas o Cobros para evadir el bloqueo.
- No merge, `main`, producción, DNS ni deploy productivo.

## Carriles

- A · Frontend/Academia: contrato y enseñanza de sesión legal completados.
- B · Backend/seguridad: proveedor, IAM y rollback permanecen preservados; no fueron la causa.
- C · Datos reales: sin nuevas escrituras; conteos restaurados y fuentes reales congeladas.

## Claude y Academia

- `REPLICABLE_CLAUDE_ACUMULADO`: ciclo de vida de sesión, gate legal previo y estados honestos.
- `ACADEMIA_ACTUALIZAR`: una sesión autenticada no está lista hasta resolver el gate legal.
- `BACKEND_PROTEGIDO_NO_CLAUDE`: autenticación, Functions, bóveda y auditoría.
- `SECRETO_DATO_REAL`: valores de acceso.
