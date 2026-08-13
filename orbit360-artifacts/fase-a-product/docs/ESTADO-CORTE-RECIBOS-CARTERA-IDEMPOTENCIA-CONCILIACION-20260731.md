# ESTADO DE CORTE — RECIBOS / CARTERA / IDEMPOTENCIA / CONCILIACIÓN

Fecha: 2026-07-31

## Bloque

Recibos/Cartera reabierto por revisión humana. Cobros sigue como siguiente bloque operativo y no ha sido escrito.

## Carril A — frontend / UX / Academia

- Pólizas global indexado y paginado.
- Póliza/Vehículo/Recibo con detalles full-page.
- vacíos monetarios no se convierten en cero.
- prima total no se infiere desde prima neta.
- frecuencia, forma de pago y conducto de pago quedan separados.
- Recibos muestra estado y columna de conciliación.
- `Cartera conciliada con aseguradora` se diferencia de `Cobro conciliado`.
- Academia y Claude documentados para replicación reusable.

## Carril B — backend / contrato / gates

- nuevo owner transversal de identidad/upsert para captura directa e importadores;
- exact identity → update;
- probable identity → HOLD/no insert;
- blank incoming no borra dato existente;
- dry-run y writer comparten resolver;
- matcher one-to-one dual-source para conciliación;
- diferencias de fuente se preservan;
- una fuente sola no auto-concilia;
- saldo conciliado no crea pago;
- gate único 9.1.0 ampliado y verde.

Evidencia estática vigente del producto:

- run `30669391345`;
- artifact `8808188706`;
- digest `sha256:7eac3a5e2ddfcd9fa47673b475811033eaf05ba83f27f72e61ed6474b11dda3d`;
- Firestore writes: 0;
- operational writes: 0;
- browser: 0;
- Hosting: 0;
- producción: false.

Incidentes metodológicos del cierre:

1. lifecycle literal modificado accidentalmente → `VALIDATOR_STALE / PIPELINE_MECHANISM_FAILURE`; producto congelado; se corrigió solo literal; mismo gate volvió a PASS.
2. contrato humano aún exigía semántica previa de “ningún recibo puede ser cobro conciliado” → `VALIDATOR_STALE`; producto congelado; se actualizó únicamente el validador para distinguir fuente única vs doble fuente conciliada; mismo gate volvió a PASS.

## Carril C — datos A&S

Baseline preservado:

```text
clientes: 430
aseguradoras: 30
asesores: 7
polizas: 1373
vehiculos: 1032
recibosEsperados: 1293
carteraPrimas: 673
cobros: 0
finmovs: 0
```

Fuentes canónicas read-only confirmaron:

- 1,261 recibos activos;
- todos con prima total;
- 1,250 con frecuencia;
- 1,251 con forma de pago;
- 1,249 con conducto;
- 955 con componentes completos de prima;
- 867 cuadran exactamente;
- 88 conservan diferencia de fuente;
- no se corrige ninguna diferencia por inferencia.

Dry-run de dos reportes de pagos/cobros de aseguradora ya auditados:

- 9 filas revisadas;
- 5 candidatas one-to-one a conciliación;
- 4 sin match suficiente;
- 0 escrituras.

El par probable duplicado existente permanece `NO_AUTO_MERGE`. El nuevo guard evita que futuras cargas creen probables duplicados automáticamente.

## Hosting LAB

El workflow único existente fue regenerado contra el contrato actual.

- no se creó un workflow paralelo;
- paridad futura ampliada a 12 activos críticos, incluidos owners transversales de importación;
- checks estáticos ya no dependen de conteos literales de tests antiguos;
- runtime futuro exige mostrar una cartera real conciliada con aseguradora sin confundirla con pago;
- request de autorización: **ausente**;
- deploy ejecutado: **0**.

## Claude / prototipo reusable

Documentos:

- `CONTRATO-TRANSVERSAL-IDEMPOTENCIA-CONCILIACION-PAGOS-20260731.md`;
- `CLAUDE-ACUMULADO-IDEMPOTENCIA-CONCILIACION-IMPORTADOR-20260731.md`;
- `ACADEMIA-IMPACT-IDEMPOTENCIA-CONCILIACION-IMPORTADOR-20260731.md`.

Claude debe reproducir la UX reusable/autoadministrable, nunca datos reales ni backend protegido.

## Siguiente acción exacta

Conservar el paquete congelado y solicitar/consumir únicamente una autorización macro para **1 Hosting LAB + browser read-only**, sin Rules, Functions, Storage, datos, Cobros, producción, main ni merge.

Si el runtime integral queda PASS:

1. revisión visual humana focal única;
2. cierre Recibos/Cartera;
3. entrada inmediata a Cobros/Conciliación reutilizando el matcher, upsert, scopes, integridad y rollback ya construidos.
