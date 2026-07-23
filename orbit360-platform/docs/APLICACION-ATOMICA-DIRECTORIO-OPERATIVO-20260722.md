# APLICACIÓN ATÓMICA — DIRECTORIO OPERATIVO

**Fecha:** 2026-07-22  
**Gate:** `block1-client360-insurers-lab-v20260717`  
**Contrato:** 1.0.38  
**Fase:** `LAB_DATA_CONTRACT_REPAIR_APPLY`

## Evidencia que autoriza

```text
Dry-run: 29973981164 · DRY_RUN_READY
Clientes: 414
Aseguradoras: 26
Asesores: 7
Números bancarios propuestos: 91
Usuarios propuestos: 26
Documentos afectados: 14
Cuentas pendientes: 2
Contraseñas protegidas disponibles: 26/26
Incompatibilidades históricas accountId: 68
Filas creadas/eliminadas/reordenadas: 0
Cambios no objetivo: 0
Escrituras: 0
```

**Artefacto:** `8550735007`  
**Digest:** `sha256:b5fe862604565ef1353fe822d8ce3a4357dd6e61e9c3d81ee338b940f2dc777a`

## Transacción autorizada

Una sola transacción sobre 14 documentos ya existentes de `tenantId/alianzas-soluciones/aseguradoras`.

Campos permitidos:

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

No se autoriza:

- crear o eliminar documentos, cuentas o portales;
- cambiar IDs o reordenar filas;
- modificar contactos, URLs, teléfonos, países, monedas, titulares o trazabilidad;
- escribir contraseñas;
- escribir la bóveda;
- reimportar;
- tocar Clientes, Pólizas, Cobros, Finanzas u otros módulos;
- ejecutar runtime, navegador, Hosting, Functions, Rules o producción.

## Protección transaccional

Antes de escribir, el script reconstruye el plan desde Firestore y bóveda y exige que coincida con el dry-run.

Dentro de la transacción:

1. lee los 14 documentos;
2. compara hashes de `cuentas` y `portales` con el baseline;
3. aborta si algún documento cambió;
4. actualiza exclusivamente ambos arrays conservando IDs y orden.

Después de escribir:

- vuelve a leer los 26 documentos;
- verifica hashes finales;
- exige 91 números, 26 usuarios y dos cuentas pendientes;
- exige cero contraseñas operativas;
- exige cero propuestas pendientes;
- exige idempotencia y cero cambios no objetivo.

Si cualquier predicado falla, ejecuta rollback atómico y verifica que todos los hashes regresen al baseline.

## Predicado de cierre

```text
APPLIED_AND_VERIFIED
transactionCommitted = true
rollbackExecuted = false
bankOperationalNumbers = 91
usernamesOperational >= 26
bankPendingRows = 2
credentialPasswordsAvailable = 26
passwordsInOperationalDirectory = 0
accountRowsStillProposed = 0
usernameRowsStillProposed = 0
credentialStatusRowsStillProposed = 0
rowCountChanges = 0
rowOrderChanges = 0
nonTargetFieldChanges = 0
Functions/Rules/production/reimport = false
```

Solo este resultado permite preparar una publicación Hosting LAB separada y una nueva revisión visual humana.
