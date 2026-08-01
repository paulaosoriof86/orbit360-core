# Academia — escritura atómica de comisiones y barrera visual

Fecha: 2026-08-01

## Lección operativa

Una autorización de escritura de datos no equivale a aprobación visual de los módulos que consumen esos datos.

En este cierre se escribieron cinco comisiones A&S en tres destinos canónicos mediante una sola transacción:

```text
planillasComisiones
comisionesDevengadas
conciliacionesComisiones
```

El gate verificó antes de escribir:

- conjunto exacto de cinco relaciones;
- digests del candidato y snapshot;
- colecciones destino vacías;
- baseline de pólizas, recibos, cobros y finmovs;
- ausencia de autorización para facturas, CxC, CxP y liquidaciones;
- barrera de aprobación visual del CRM.

## Resultado didáctico

```text
15 documentos creados
15 documentos verificados
0 cambios en pólizas
0 cambios en recibos
0 cambios en cobros
0 finmovs
3 liquidaciones de vendedor en HOLD
```

## Diferencia crítica

- **Dato escrito correctamente:** la comisión quedó registrada de forma trazable e idempotente.
- **Módulo visual aprobado:** requiere que una persona revise la experiencia, contenido, relaciones y comportamiento del módulo.

Por tanto, el PASS del writer no permite marcar como aprobados Pólizas, Vehículos, Recibos, Cartera ni el resto del CRM.

## Regla reusable

Todo gate de escritura que alimente módulos pendientes de revisión debe incluir un objeto explícito de aprobación visual. Ningún estado `WRITE_PASS` puede modificarlo o inferir aprobación.
