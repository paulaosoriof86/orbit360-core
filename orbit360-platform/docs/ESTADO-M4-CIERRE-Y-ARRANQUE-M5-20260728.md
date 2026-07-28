# Estado M4 reabierto → M5 congelado

Fecha: 2026-07-28

## Estado vigente

```text
M1 CERRADO
M2 CERRADO
M3 CERRADO
M4 REABIERTO — migración canónica pendiente
M5 CONGELADO — readiness previo invalidado por VALIDATOR_STALE
```

El cierre anterior de M4 fue supersedido porque verificó correctamente el saneamiento de la fuente, pero no exigió que el destino canónico productivo contuviera 414 clientes y 26 aseguradoras.

## Evidencia preservada

Las 61 correcciones GT/GTQ permanecen válidas y no se revierten.

```text
Run 30397573914
414 clientes origen
26 aseguradoras origen
61 correcciones GT/GTQ
0 moneda faltante
0 target-only
```

## Evidencia que reabrió M4

La lectura durable 4.2.10 confirmó:

```text
origen: 414 clientes / 26 aseguradoras
destino canónico: 0 clientes / 0 aseguradoras
```

## Dry-run correctivo 4.3.0

```text
Run 30401002929
Preflight 24/24
Contrato 21/21
config create 1
membership omit 1
clientes create 414
aseguradoras create 26
requires_validation 0
target-only 0
escrituras 0
```

## Paquete 4.3.1

Preparado y estáticamente validado; NO autorizado.

```text
Package check run 30401935910
Preflight 25/25
Fixtures 30/30
Activation mode package_without_request
Execution authorized false
Solicitud de escritura: inexistente
```

Presupuesto de éxito: 441 target creates + 441 snapshots + 442 auditorías + 2 escrituras batch = máximo 1,326 escrituras. Membership 0.

Rollback máximo autorizado solo junto con una futura autorización explícita: 441 deletes condicionados por hash + 442 eventos rollback + 1 batch update = 884.

## M5

Se conserva la evidencia técnica de la candidata y su paridad LAB 22/22, pero no habilita smoke ni visualización mientras M4 no cierre con destino canónico 1 config / 414 clientes / 26 aseguradoras.

## Pólizas

Pólizas sigue bloqueado. Cuando llegue su bloque se solicitará a Paula la fuente real, actual y vigente. `Listado producción 2025-2026` no es una fuente válida.

## Siguiente acción exacta

Solicitar autorización explícita nueva e independiente para una única ejecución de `block4-final-canonical-migration-write-v20260728` contrato 4.3.1. No crear el request hasta recibirla.
