# PLANILLAS Y COMISIONES — ESTADO VIVO

**Fecha:** 2026-08-01  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft/open

## Corte de fuente

```text
periodo: 2026-06
archivos: 19
filas observadas: 67
candidatas CRM: 65
omitidas: 2
```

## Identidad y relación

```text
póliza identificada: 49
póliza en HOLD: 16
póliza y recibo identificados: 5
recibo en HOLD: 44
cobros actuales relacionados: 0
```

## Escritura controlada de comisión

```text
relaciones evaluadas: 5
comisiones A&S escritas: 5
documentos creados: 15
documentos verificados: 15
transacción atómica: sí
rollback ejecutado: no
```

Destino:

```text
planillasComisiones: 0 → 5
comisionesDevengadas: 0 → 5
conciliacionesComisiones: 0 → 5
```

Baseline preservado:

```text
polizas: 1373 → 1373
recibosEsperados: 1294 → 1294
cobros: 5 → 5
finmovs: 0 → 0
```

Liquidación de vendedor:

```text
lista o no aplicable: 2
HOLD por alias no configurado: 3
liquidaciones creadas: 0
porcentaje por defecto aplicado: no
```

## Ledger de HOLD fuera de escritura

```text
renovación sin recibo que distinga vigencia: 9
conflicto de asegurado: 2
número de póliza no mapeado: 2
número canónico de póliza por corregir: 1
detalle agrupado insuficiente: 2
cuota repetida por igual importe: 30
sin recibo compatible en calendario vivo: 14
vendedor con alias no configurado: 3
```

## Evidencia

```text
policy identity static: run 30719074310 · 19/19
policy identity live: run 30719208561 · 49 resueltas / 16 HOLD
receipt resolver static: run 30719316572 · 14/14
receipt link live: run 30719464732 · 5 resueltas / 44 HOLD
commission planner static: run 30719949803 · 32/32
commission dry-run live: run 30720089823 · 5 candidatas / 15 documentos
commission controlled write: run 30722653179 · WRITE_PASS · 15/15
```

Sellos verificados:

```text
candidateSetDigest: 04c7da071ddadfe689e0137e730448ada36abe7aff6c228cd5abb0206c26c680
targetSnapshotDigest: 12b3763f976433e1e7e809f461dc835bca3a4c39b1d6dd1655e42a202e6cbf3f
```

## Barrera visual CRM

```text
Clientes: aprobado previamente
Pólizas: pendiente de visualización y aprobación
Vehículos: pendiente
Recibos: pendiente
Cartera: pendiente
Resto CRM: pendiente
```

El `WRITE_PASS` de comisiones no modifica ni sustituye esa revisión humana.

## Estado contractual

```text
PLANILLAS_COMMISSION_CONTROLLED_WRITE_CLOSED
```

La autorización quedó consumida y el gate volvió a cero escrituras autorizadas. Facturas, CxC, CxP, liquidaciones y Finanzas siguen inactivas. Cualquier escritura adicional requiere una autorización nueva; no hay avance automático al siguiente módulo CRM.
