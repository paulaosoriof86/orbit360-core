# Academia — STOP_RETRY y rollback en Cobros

Fecha: 2026-08-01  
Bloque: Cobros/Conciliación · Gate 10.9

## Objetivo

Comprender que una autorización de escritura no obliga a completar una operación si el snapshot real contradice el contrato preparado. El resultado correcto puede ser detener, revertir y diagnosticar.

## Secuencia observada

```text
preflight PASS
→ autorización LAB
→ snapshot previo
→ dos grupos atómicos ejecutados
→ tercer snapshot no coincide
→ detención inmediata
→ rollback global
→ baseline restaurado
→ STOP_RETRY
```

## Dirección / AdminTenant

Debe distinguir:

- casos aprobados de casos efectivamente aplicados;
- escritura transitoria de escritura verificada;
- rollback restaurado de cierre exitoso;
- urgencia de producción de permiso para ignorar un contrato de datos.

Después del rollback, los cinco casos continúan sin aplicar. No debe interpretarse que los dos primeros quedaron registrados.

## Operativo

Debe verificar:

- snapshot antes de escribir;
- idempotencia por caso;
- atomicidad de cobro + recibo;
- detención ante la primera divergencia;
- rollback de todos los grupos ya completados;
- conteos finales iguales al baseline;
- diagnóstico read-only antes de cualquier reapertura.

## Asesor

No ejecuta ni reabre el gate. Puede reportar una inconsistencia mediante una gestión de corrección, pero no modifica recibos, cobros, pólizas o evidencia validada.

## Diferencia metodológica

`DATA_CONTRACT_FAILURE` no significa necesariamente que el dato real sea incorrecto. Significa que la representación esperada y el documento real no coinciden. Antes de corregir se debe identificar si la causa es:

- alias o proyección visual;
- diferencia de tipo, por ejemplo texto frente a número;
- campo canónico obsoleto;
- modificación legítima posterior al paquete;
- defecto real del documento.

## Regla de dos fallos

Después de dos fallos en la misma etapa:

- no se crea otro request;
- no se ejecuta una tercera escritura;
- no se parchea otro módulo;
- se congela el gate;
- se diagnostica la causa raíz del contrato o pipeline.

## Resultado del caso

```text
cobros finales: 0
recibos finales: 1293
pólizas finales: 1373
finmovs finales: 0
rollback restaurado: sí
producción tocada: no
```
