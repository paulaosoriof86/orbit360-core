# DRY-RUN READ-ONLY — RESTITUCIÓN DEL DIRECTORIO OPERATIVO

**Fecha:** 2026-07-22  
**Gate:** `block1-client360-insurers-lab-v20260717`  
**Contrato:** 1.0.38  
**Fase:** `LAB_DATA_CONTRACT_REPAIR_DRYRUN`

## Baseline estático cerrado

```text
Run: 29973107802
Preflight: GO_GATE_CONTRACT · 183/183
Directorio operativo: PASS · 30/30
Visual-responsive: PASS · 1.0.38
Arquitectura: GO_STATIC_ARCHITECTURE · 35/35
Datos, secretos, escrituras, runtime, navegador y deploy: 0
```

## Propósito

Leer los 26 documentos actuales de Aseguradoras y la bóveda existente para calcular, sin escribir, la restitución selectiva de:

- `cuentas[].numero` y sus estados operativos;
- `portales[].usuario` y sus estados de acceso.

La contraseña continúa exclusivamente en el proveedor seguro.

## Capacidades autorizadas

```text
Firestore read = true
Vault read = true
Secret access = true, solo para matching sanitizado
Writes = false
Runtime = false
Browser = false
Deploy = false
Functions = false
Rules = false
Production = false
Reimport = false
```

El preflight se ejecuta antes de resolver la identidad LAB.

## Alcance permitido del diff

Solo pueden proponerse:

```text
cuentas.numero
cuentas.estado
cuentas.clasificacionDato
cuentas.visibilidad
portales.usuario
portales.clasificacionUsuario
portales.estadoCredencial
portales.estadoAcceso
```

Deben permanecer idénticos:

- IDs de aseguradora, cuenta y portal;
- número y orden de filas;
- contactos, enlaces, teléfonos y titulares;
- países, monedas y trazabilidad;
- referencias `accountRef` y `credentialRef`;
- toda colección distinta de Aseguradoras.

## Predicado de aceptación

```text
414 clientes
26 aseguradoras
7 asesores
91 registros bancarios en bóveda
91 accountRef actuales y únicos
91 accountRef emparejados
2 cuentas pendientes honestas
0 referencias bancarias sin match
credentialMatchedToVault = credentialReferenceRows
credentialPasswordsAvailable = credentialReferenceRows
0 referencias de credencial sin match
0 contraseñas en directorio operativo
accountRowsProposed > 0
usernameRowsProposed > 0
rowCountChanges = 0
rowOrderChanges = 0
nonTargetFieldChanges = 0
onlyTargetFieldsChanged = true
accountIdMismatchExplainsRevealFailure = true
writesExecuted = false
transactionCommitted = false
```

La evidencia no incluye nombres, usuarios, contraseñas ni números completos; solo conteos, hashes y estados.

## Resultado permitido

- `DRY_RUN_READY`: permite preparar una autorización separada para una sola transacción atómica.
- cualquier otro resultado: `STOP_THE_LINE`; no se escribe, no se despliega y no se crea otra solicitud sin diagnóstico.
