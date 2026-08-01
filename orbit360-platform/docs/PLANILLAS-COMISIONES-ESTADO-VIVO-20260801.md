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

## Resultado read-only consolidado

```text
póliza identificada: 49
póliza en HOLD: 16
póliza y recibo identificados: 5
recibo en HOLD: 44
cobros actuales relacionados: 0
comisiones escritas: 0
finmovs: 0
```

## Ledger de HOLD

```text
renovación sin recibo que distinga vigencia: 9
conflicto de asegurado: 2
número de póliza no mapeado: 2
número canónico de póliza por corregir: 1
detalle agrupado insuficiente: 2
cuota repetida por igual importe: 30
sin recibo compatible en calendario vivo: 14
```

## Evidencia

```text
policy identity static: run 30719074310 · 19/19
policy identity live: run 30719208561 · 49 resueltas / 16 HOLD
receipt resolver static: run 30719316572 · 14/14
receipt link live: run 30719464732 · 5 resueltas / 44 HOLD
```

## Estado contractual

```text
PLANILLAS_POLICY_IDENTITY_RECEIPT_LINK_READONLY_CLOSED
```

No existe autorización de escritura. El siguiente bloque permitido es un contrato de dry-run de comisión limitado a las cinco relaciones inequívocas, con idempotencia, asesor, destino, snapshot, diff y rollback. Los otros 60 registros permanecen excluidos.
