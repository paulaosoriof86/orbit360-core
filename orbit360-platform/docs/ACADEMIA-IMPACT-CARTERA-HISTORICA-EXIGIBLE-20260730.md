# ACADEMIA — CARTERA HISTÓRICA EXIGIBLE Y AUTORIDAD DE FUENTE

Fecha: 2026-07-30

## Patrón reusable

Orbit 360 debe enseñar y operar con dos dimensiones separadas:

1. **vigencia contractual de la póliza**: determina si se puede generar calendario operativo nuevo;
2. **exigibilidad financiera del recibo/saldo**: determina si una obligación ya emitida continúa pendiente.

Una póliza vencida no se reactiva para conservar una deuda. Si una fuente vigente confirma el saldo, la deuda se conserva como `cartera_historica_exigible` sin regenerar cuotas.

## Jerarquía de fuente

- Un balance vigente de aseguradora tiene prioridad para saldo, fecha y monto de sus recibos.
- SIGA conserva autoridad cuando no existe una fuente superior aplicable al caso.
- Dos fuentes del mismo recibo no se suman; se concilian y queda una sola obligación canónica.
- Si una fuente superior ya no confirma el saldo histórico, Orbit no lo arrastra por inercia.
- Una cuota puede vencer después del fin de cobertura; esa cronología no elimina automáticamente la deuda si la fuente vigente la confirma.

## Por rol

**Dirección / Operativo** debe distinguir:

- cartera activa generada;
- cartera histórica exigible;
- recibos futuros;
- pagos reportados todavía no conciliados;
- HOLD por conflicto de fuente.

**Asesor** puede consultar las obligaciones de sus clientes dentro de su scope, pero no debe aplicar cobros ni alterar una obligación validada fuera de permisos.

## Importador

El mismo pipeline individual/masivo debe:

1. detectar la fuente y su autoridad;
2. relacionar cliente, póliza, término y recibo;
3. evitar duplicar SIGA + aseguradora;
4. separar calendario generado de recibo fuente-respaldado;
5. dry-run con crear/actualizar/omitir/requiere validación;
6. conservar archivo/hoja/fila o identificador de documento como provenance;
7. no crear `cobros` desde un estado `pago_reportado` ni desde banco sin conciliación.

## Cobros y FIFO

La regla `oldest outstanding first` pertenece al bloque posterior de Cobros/conciliación. Si hay varios requerimientos compatibles, se propone el más antiguo, pero nunca se cruza cliente, aseguradora, moneda o una referencia explícita incompatible. El conflicto pasa a validación.

## Diferencia metodológica

El hallazgo que congeló el prewrite 9.0.0 fue `DATA_CONTRACT_FAILURE`, no una falla del writer ni del store: el contrato excluía toda vigencia histórica y por eso no podía representar saldos que una fuente vigente todavía consideraba pendientes. La corrección adecuada fue actualizar contrato + fuente + validador + evidencia, no reintentar la misma escritura.

## Clasificación Claude

- Arquitectura/UX reusable: `REPLICABLE_CLAUDE_INMEDIATO`.
- Academia: `ACADEMIA_ACTUALIZAR`.
- Writer, gate, hashes, fuentes privadas y datos reales: `BACKEND_PROTEGIDO_NO_CLAUDE` / `SECRETO_DATO_REAL` según corresponda.
