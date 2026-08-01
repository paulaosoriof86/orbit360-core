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

## Dry-run de comisión

```text
relaciones evaluadas: 5
comisiones A&S candidatas: 5
HOLD u omisiones de comisión A&S: 0
documentos propuestos: 15
planillasComisiones: 5
comisionesDevengadas: 5
conciliacionesComisiones: 5
```

Snapshot destino:

```text
planillasComisiones: 0
comisionesDevengadas: 0
conciliacionesComisiones: 0
```

Liquidación de vendedor:

```text
lista o no aplicable: 2
HOLD por alias no configurado: 3
liquidaciones autorizadas: 0
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
```

Sellos:

```text
candidateSetDigest: 04c7da071ddadfe689e0137e730448ada36abe7aff6c228cd5abb0206c26c680
targetSnapshotDigest: 12b3763f976433e1e7e809f461dc835bca3a4c39b1d6dd1655e42a202e6cbf3f
```

## Estado contractual

```text
PLANILLAS_COMMISSION_DRYRUN_CLOSED
```

No existe autorización de escritura. El siguiente bloque requiere autorización separada y debe limitarse a los cinco candidatos y 15 documentos sellados, con batch atómico, idempotencia, post-verificación y rollback exacto. La liquidación de los tres vendedores permanece bloqueada y Finanzas continúa inactiva.
