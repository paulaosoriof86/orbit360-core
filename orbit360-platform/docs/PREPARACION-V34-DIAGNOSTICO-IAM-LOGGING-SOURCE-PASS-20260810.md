# PREPARACIÓN V34 — DIAGNÓSTICO IAM LOGGING SOURCE PASS

Fecha: 2026-08-10  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate rector: `block1-client360-insurers-lab-v20260717` / `1.0.41`

## Resultado

`PASS_V34_LOGGING_IAM_SOURCE`

Run: `31424257131`  
HEAD source: `50df1c28d4cbdcd5169190971c8b778a1d5ca23f`

## Objetivo

Preparar una prueba mínima para distinguir si el `ENVIRONMENT_FAILURE / AUDIT_UNAVAILABLE_OR_FORBIDDEN` de v33 proviene de una brecha efectiva de permisos de Logging, sin volver a consultar los 2 clientes y sin modificar IAM.

## Permisos a diagnosticar

```text
logging.logEntries.list
logging.privateLogEntries.list
```

El probe preparado utiliza `cloudresourcemanager.projects.testIamPermissions` sobre `ays-orbit-360-lab` y solo debe persistir dos booleanos de capacidad y una clasificación sanitizada.

## Alcance source

```text
secrets: 0
Firestore reads: 0
Logging reads: 0
IAM policy binding reads: 0
IAM writes: 0
operational writes: 0
client data reads: 0
browser: 0
deploy: 0
production: 0
```

No existe request runtime v34 y no existe autorización para modificar IAM.

## Interpretación futura

- ambos permisos presentes → no conceder roles; diagnosticar disponibilidad/retención/API de Data Access Logs antes de cualquier nueva consulta focal;
- falta uno o ambos permisos → `ENVIRONMENT_FAILURE / REQUIRED_LOGGING_PERMISSION_NOT_EFFECTIVE`; no conceder rol automáticamente;
- error del propio `testIamPermissions` → `ENVIRONMENT_FAILURE` y STOP_RETRY sin escalar privilegios.

## Siguiente acción exacta

Crear un request nuevo, exclusivo e inmutable únicamente para ejecutar una vez `projects.testIamPermissions` con la cuenta LAB, después del gate y sin leer Audit Logs, Firestore, Auth ni datos de clientes. El request v33 permanece consumido y no puede reutilizarse.

Cualquier concesión IAM posterior sería una operación diferente y requeriría otra autorización explícita basada en el resultado objetivo de esta prueba.
