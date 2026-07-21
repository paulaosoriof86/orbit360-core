# Cierre — recuperación atómica de 68 referencias bancarias

Fecha: 2026-07-21  
Incidente: `insurer-directory-protected-reference-regression-v20260721`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Resultado

```txt
RECOVERY_COMPLETED_AND_READBACK_CONFIRMED
```

La recuperación se ejecutó una sola vez mediante una transacción Firestore sobre 13 documentos de aseguradoras Guatemala.

## Evidencia vinculante

```txt
Run: 29867382206
HEAD ejecutado: 59815328dd7551f6ba337ee2ebd2c319dff065f8
Artifact: 8509742588
Digest: sha256:74498434aaf2c58acbe570c716c08e5d2c76a2b6aee55ab284b13e84ae4c5c64
Recovery ID: recovery_de2a471f2b90087aad83
```

Preflight del mismo run:

```txt
GO_GATE_CONTRACT
Contrato: 1.1.3
Fallos: 0
```

Validador estático de la recuperación:

```txt
29 PASS
0 FAIL
0 runtime
0 escrituras
```

## Estado antes

```txt
Clientes: 414
Aseguradoras: 26
Asesores: 7
Recursos dentro de cuentas: 107
Filas bancarias protegidas: 93
Referencias válidas: 23
Referencias pendientes: 70
Registros en bóveda: 91
Valores completos en store: 0
```

Los 107 recursos incluyen 93 filas bancarias protegidas y 14 recursos no protegidos, como enlaces de pago. El error anterior consistió en contar todos los recursos como si fueran cuentas protegidas.

## Cambio aplicado

```txt
68 referencias históricas restauradas
2 cuentas G&T nuevas preservadas como backend_required
0 eliminaciones
0 creaciones
0 reordenamientos
13 documentos GT actualizados
0 cambios de campos no relacionados
0 cambios de trazabilidad
0 cambios Colombia
0 escrituras Secret Manager
```

La transacción modificó únicamente el arreglo `cuentas` de los 13 documentos afectados y sustituyó los placeholders de las 68 cuentas históricas por sus referencias opacas ya existentes en la bóveda.

## Lectura posterior

```txt
Recursos dentro de cuentas: 107
Filas bancarias protegidas: 93
Referencias válidas: 91
Referencias válidas únicas: 91
Referencias pendientes: 2
Valores completos en store: 0
Colombia: intacta
```

Las dos pendientes son las cuentas G&T nuevas respecto del checkpoint sano. No fueron eliminadas ni conectadas por inferencia.

## Rollback

```txt
Rollback disponible: sí
Rollback ejecutado: no
Motivo: la lectura posterior coincidió completamente
```

El script conservó los arreglos anteriores en memoria, validó hashes antes de escribir y habría restaurado los 13 documentos si la lectura posterior no coincidía.

## Causa real de la demora final

El dry-run `29865964420` había validado correctamente la propuesta, pero se marcó rojo por tres errores del evaluador:

1. contó los 107 recursos mixtos como si fueran 93 filas bancarias protegidas;
2. convirtió una huella auxiliar de metadatos en criterio obligatorio de duplicidad;
3. evaluó los valores seguros `false` —sin escritura, sin PII y sin secretos— como checks fallidos.

Clasificación correcta:

```txt
PIPELINE_MECHANISM_FAILURE
VALIDATOR_STALE
```

La evidencia preservada fue reclasificada sin repetir runtime y produjo `ok:true` con 34/34 comprobaciones.

## Estado actual

```txt
M1 funcional: preservado
Clientes: 414
Aseguradoras: 26
Asesores: 7
Credenciales de portal: 26/26 preservadas
Referencias históricas bancarias: 91/91 restauradas y únicas
Cuentas G&T nuevas: 2 pendientes de conexión segura
Colombia: intacta
Reimportación: no requerida
Segunda escritura: bloqueada
Deploy: no realizado
Producción: no tocada
```

## Siguiente acción exacta

El incidente de recuperación queda cerrado. La siguiente acción no es otra importación ni otro dry-run:

1. inventario post-recuperación read-only —puede satisfacerse con la lectura posterior vinculante de este run si el gate la consume directamente—;
2. gate final único del Bloque 1;
3. una sola revisión visual después de `ok:true`;
4. cierre de M1 y continuación del Plan Maestro.

No se autoriza repetir la recuperación, borrar las dos cuentas nuevas, reimportar directorios ni tocar Colombia.
