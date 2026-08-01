# CLAUDE ACUMULADO — PLANILLAS Y COMISIONES — FUENTES VARIABLES

**Fecha:** 2026-08-01  
**Clasificación:** `REPLICABLE_CLAUDE_ACUMULADO`  
**Backend y datos reales:** `BACKEND_PROTEGIDO_NO_CLAUDE` / `TENANT_AYS_ONLY`

## Patrón reusable

Las planillas de comisiones varían por aseguradora, periodo y formato. El frontend debe representar un flujo reusable de importación y validación, no una plantilla rígida por tenant.

## Estados visibles

```text
Fuente no recibida
Fuente detectada
Mapeo propuesto
Requiere validar periodo
Dry-run listo
Comisión pendiente de confirmar
Comisión confirmada
Fila omitida
```

## Campos conceptuales

El flujo debe poder mapear aliases hacia:

- aseguradora;
- país;
- moneda;
- periodo;
- póliza;
- recibo o requerimiento;
- fecha de pago;
- factura y serie;
- prima neta;
- valor total;
- tasa o importe de comisión A&S;
- comisión de vendedor;
- asesor;
- referencia adicional;
- archivo, hoja y fila.

## Reglas UX

- mostrar el periodo detectado antes de confirmar;
- alertar cuando una fila coincide con póliza e importe, pero pertenece a otro mes;
- separar prima neta, impuestos, gastos y total;
- separar comisión A&S y comisión del vendedor;
- no mostrar una estimación como comisión confirmada;
- permitir corregir el mapeo sin alterar el archivo original;
- presentar dry-run con crear, actualizar, omitir y requiere validación;
- excluir cobros no conciliados o en HOLD;
- mantener historial de fuente y decisión.

## Estados vacíos honestos

Cuando falta la fuente exacta:

```text
Planilla pendiente
Aún no hay comisión confirmada para este cobro
```

No mostrar cero como si fuera una comisión calculada ni reutilizar una fila del periodo anterior.

## Academia impactada

Incluir:

- cobro conciliado vs comisión liquidada;
- periodo exacto;
- prima neta recaudada;
- fuentes separadas;
- `SOURCE_MISSING`;
- diferencia entre estructura reusable y fila elegible.

## Qué no compartir con Claude

- datos reales de planillas;
- pólizas, clientes, facturas o importes;
- hashes e IDs privados;
- adaptadores protegidos;
- workflows y secrets;
- reglas específicas de acceso a Firestore.

## Instrucción acumulada para futura candidata

```text
En Planillas y Comisiones, diseñar un importador reusable para formatos variables por aseguradora. Detectar aliases, país, moneda y periodo; proponer mapeo corregible; separar prima neta, total, comisión A&S y comisión de vendedor; mostrar dry-run y estados honestos. Una fila de otro periodo nunca debe tratarse como coincidencia elegible aunque coincidan póliza e importe. Los cobros HOLD quedan excluidos y toda operación usa Orbit.store.
```
