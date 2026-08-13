# Corte formal — 68 referencias históricas y 2 cuentas G&T nuevas

Fecha: 2026-07-21  
Incidente: `insurer-directory-protected-reference-regression-v20260721`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Estado vinculante

```txt
STOP_THE_LINE_DATA_CONTRACT_CORRECTION_REQUIRED
```

No se autoriza otro dry-run, escritura, recuperación, eliminación de filas, reimportación, navegador, gate final o deploy hasta corregir de forma coordinada el contrato 68+2.

## Evidencia confirmada

### Checkpoint sano

```txt
Run: 29797444980
HEAD: 02a5436bc804b3a861f82375b124d05015389b4b
Clientes: 414
Aseguradoras: 26
Asesores: 7
Referencias bancarias válidas: 91
Registros bancarios confirmados en bóveda: 91
Valores completos en store: 0
```

### Estado posterior regresado

```txt
Referencias válidas actuales: 23
Filas backend_required: 70
Referencias históricas ausentes del documento: 68
Registros bancarios conservados en bóveda: 91
Valores completos en store: 0
Colombia: intacta
```

### Evidencia específica de G&T

El inventario sanitizado del diagnóstico read-only confirma:

```txt
Documento G&T: 11 filas bancarias
Referencias válidas actuales: 2
Filas backend_required: 9
Registros G&T en bóveda: 9
Referencias G&T ausentes del documento: 7
Filas actuales sin correspondencia histórica en bóveda: 2
```

Las siete referencias históricas faltantes se emparejan exactamente con `account_gtseguros_03` a `account_gtseguros_09`.

Las filas:

```txt
account_gtseguros_01
account_gtseguros_02
```

no coinciden por huella con las dos cuentas antiguas que ya conservan referencias válidas. El último dry-run read-only cerró con:

```txt
DUPLICATE_FINGERPRINT_MISMATCH
```

sobre `account_gtseguros_01`. Esto confirma que no puede eliminarse como duplicado.

## Corrección de la interpretación anterior

La clasificación anterior:

```txt
68 restauraciones + 2 eliminaciones de duplicados
```

queda refutada.

La clasificación correcta es:

```txt
68 restauraciones históricas exactas
+ 2 cuentas G&T nuevas respecto del checkpoint
+ 0 eliminaciones
```

No se invalida el mapa de las 68 referencias. Se invalida únicamente el tratamiento de las dos filas G&T como duplicados.

## Clasificación de causa raíz

```txt
DATA_CONTRACT_FAILURE
```

La regla `70 pendientes = 68 referencias faltantes + 2 duplicados` se adoptó antes de demostrar que las dos filas restantes fueran equivalentes a cuentas ya existentes. El conteo explicaba la diferencia, pero no demostraba identidad.

La evidencia posterior demostró lo contrario:

- las dos filas son distintas por huella;
- no tienen referencia histórica en la bóveda;
- no corresponden a las siete referencias G&T faltantes;
- existen adicionalmente a las dos cuentas antiguas que conservaron referencias válidas.

También se registraron fallos secundarios ya contenidos:

```txt
PIPELINE_MECHANISM_FAILURE
VALIDATOR_STALE
```

Ninguno produjo escritura de datos.

## Runs del corte

```txt
29860654183 · RECOVERY_TRACE_MISMATCH · 0 escrituras
29861579095 · VALIDATOR_STALE antes de runtime · 0 escrituras
29861813399 · RECOVERY_TRACE_MISMATCH · 0 escrituras
29862880891 · VALIDATOR_STALE antes de runtime · 0 escrituras
29863179008 · DUPLICATE_FINGERPRINT_MISMATCH · 0 escrituras
```

Artefacto final preservado:

```txt
Artifact: 8508127929
Digest: sha256:2d90f74c85e139acddb34fc5d1433d313b8b98fbc425e825bfdd57157866ee10
```

## Estado de seguridad

En todos los intentos:

```txt
writesExecuted:false
deployExecuted:false
migrationExecuted:false
containsPII:false
containsSecrets:false
```

No se modificaron Firestore, Secret Manager, Colombia, contactos, portales, teléfonos, credenciales o links.

## Contrato correcto para la siguiente etapa

La futura simulación deberá proponer exclusivamente:

```txt
68 cambios de accountRef
0 creaciones
0 eliminaciones
0 reordenamientos
0 cambios de trazabilidad
0 cambios de campos no relacionados
0 cambios Colombia
```

Resultado proyectado inmediato de la recuperación histórica:

```txt
91 referencias válidas
2 cuentas nuevas pendientes de conexión segura
0 duplicados demostrados
93 filas bancarias totales
```

Las dos cuentas G&T nuevas deben permanecer intactas como `backend_required`. Su conexión segura será un paso separado, con fuente original válida, proveedor protegido, diff, confirmación, lectura posterior y rollback. No deben resolverse mediante reimportación completa del directorio.

## Próxima acción permitida

Solo se permite una corrección coordinada y estática del contrato:

1. mapa: `68 restores + 2 newPendingRows + 0 removals`;
2. dry-run: preservar las dos filas nuevas y verificar que son distintas;
3. workflow: esperar 68 restauraciones, 2 nuevas pendientes y 0 eliminaciones;
4. validador estático y overlay: mismo contrato;
5. freeze, documentación, ledger y Academia: misma semántica;
6. preflight central sin secrets ni runtime.

Después de un preflight estático `GO_GATE_CONTRACT`, cualquier nuevo runtime requerirá una autorización separada. No existe autorización vigente para otro dry-run.
