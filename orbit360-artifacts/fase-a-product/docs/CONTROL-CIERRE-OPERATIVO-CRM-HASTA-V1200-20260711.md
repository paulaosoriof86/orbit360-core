# CONTROL DE CIERRE OPERATIVO CRM — HASTA v1.200

Fecha: 2026-07-11  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open.

## Baseline acumulado obligatorio

```txt
candidata Claude v1.197 empalmada
+ scope/alta Cliente360 v1.198
+ Póliza/Recibos/Recaudo v1.199b
+ Renovaciones v1.200
+ backend protegido
+ datos/modelos A&S sanitizados procesados
```

## Estado por frente

| Frente | Estado | Evidencia pendiente |
|---|---|---|
| Cliente360 scope y alta | implementado | smoke visual/dataset sanitizado |
| Póliza alta y actualización | implementado a nivel aplicación | transacción backend durable + smoke |
| Recibos/cartera | idempotente/no destructivo | constraint backend + smoke |
| Pago/recaudo | separado de finmovs | backend durable + smoke |
| Conciliación | propuesta separada | flujo de aplicación autorizado posterior |
| Renovaciones KPI/campaña/cotización | corregido | smoke visual |
| Emisión de renovación | bloqueado por decisión A/B | definición de Paula |
| Endosos | pendiente | catálogo e impacto por tipo |
| Portal cliente | preview con scope/visor | Auth cliente real |
| Academia CRM | actualizada v1.198/v1.199/v1.200 | evidencia visual/progreso |

## Decisión requerida para continuar

```txt
A. Crear la nueva póliza únicamente cuando la aseguradora entregue el número real.

B. Crear antes una entidad separada “Solicitud de emisión / Propuesta aceptada”
   y convertirla en póliza al recibir el número real.
```

Regla ya fijada: no crear Póliza con número ficticio o provisional.

## Próximo bloque después de la decisión

1. implementar renovación final;
2. implementar endosos por tipo;
3. ejecutar smoke visual CRM consolidado;
4. cerrar Aseguradoras con directorios GT/CO;
5. cerrar Cotizador/Comparativo;
6. solo entonces abrir Ops/Leads.

## Restricciones

- no merge/deploy/main;
- no payload real en código;
- no secretos;
- no reemplazar protegidos;
- no volver a estimaciones como tarifa;
- no simular envío/canal conectado;
- no repetir auditorías sin nuevo insumo.
