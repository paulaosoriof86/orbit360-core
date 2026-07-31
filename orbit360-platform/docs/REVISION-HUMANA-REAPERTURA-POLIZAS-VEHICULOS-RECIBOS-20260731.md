# Revisión humana · reapertura controlada Pólizas / Vehículos / Recibos

Fecha: 2026-07-31

## Estado

La revisión humana posterior al runtime automatizado PASS detectó defectos semánticos y de operabilidad que el gate anterior no cubría. Por tanto, **Recibos/Cartera no se considera cerrado todavía** y Cobros permanece bloqueado.

No se reimportaron Clientes, Pólizas, Vehículos, Recibos ni Cartera. No hubo escrituras Firestore, Rules, Functions, Storage, producción, main ni merge.

## Clasificación antes de corregir

### FUNCTIONAL_DEFECT

1. Campos monetarios vacíos podían convertirse visualmente en cero por coerción `Number('') === 0`.
2. La calidad de una póliza podía mostrarse como validada aunque faltaran riesgo, suma asegurada o datos críticos del vehículo.
3. El detalle de Recibo esperado no tenía owner propio; una fila de `recibosEsperados` no debe delegarse a `cobros.detalle()`.
4. Vehículo full-page existía pero su acceso desde la pestaña Cliente 360 no era determinista después del render compuesto.
5. La vista global de Pólizas hacía búsqueda de vehículo dentro del filtro de cada póliza y renderizaba la cartera completa, patrón O(P×V) + DOM masivo que puede bloquear el navegador.
6. El desglose global de Póliza trataba `cobros` como si fueran recibos generados, rompiendo la separación recibo esperado ↔ cobro aplicado.
7. El read-model podía inferir prima total desde prima neta si faltaba el total.
8. El calendario de recibos dentro de la ficha de Póliza no garantizaba orden cronológico.
9. Una acción ghost sobre encabezado oscuro podía quedar visualmente blanca/invisible.

### VALIDATOR_STALE

El gate automático anterior validaba carga, conteos, roles, owners y presencia de rutas, pero no cubría:

- vacío vs cero;
- semántica neta/total;
- centavos y diferencias póliza/calendario;
- calidad fail-closed;
- detalle de recibo esperado;
- navegación full-page de vehículo desde la pestaña;
- rendimiento de la vista global de 1,373 pólizas;
- separación de `recibosEsperados` y `cobros`.

Se amplió el mismo gate; no se creó otro gate.

### DATA_CONTRACT_FAILURE / HOLD

- Las fuentes actuales de recibos contienen componentes de prima que el contrato canónico de Póliza no persistió: expedición, financiamiento, ajuste/descuento de fuente e IVA/impuestos. El frontend puede proyectar esos componentes de forma read-only desde `recibosEsperados`, pero cualquier enriquecimiento persistente queda bloqueado hasta cerrar el manifiesto de fuentes.
- Se detectó una ambigüedad de identidad entre dos clientes probables duplicados con pólizas separadas. Se preserva `NO_AUTO_MERGE`; no se fusiona ni reasigna automáticamente. Requiere validación tenant antes de cualquier escritura.
- Cobros permanece en cero porque el bloque Cobros/conciliación aún no se ha migrado. Estados como `pago_reportado` o `sin saldo pendiente según aseguradora` son evidencia, no un cobro conciliado.

## Corrección reusable

### `modules/policy-receipts-v1199-detail-guard.js`

- `numberOrNull()` conserva vacío como desconocido;
- `moneyDetail()` conserva 2 decimales;
- prima total no se infiere desde prima neta;
- `policyCompleteness()` hace fail-closed la calidad;
- desglose usa componentes exactos disponibles en `recibosEsperados`;
- `Monto Descuento` se presenta como **Descuento / ajuste (campo fuente)** sin inferir signo;
- muestra prima total de póliza y total calendario por separado y alerta diferencias;
- recibos se ordenan cronológicamente;
- navegación full-page de Vehículo se reengancha después del render real;
- acción sobre encabezado oscuro usa fondo transparente.

### `core/backend-lab-receipts-portfolio-projection-v910.js`

- detalle read-only para `recibosEsperados`;
- cada fila tiene owner/acción de detalle;
- muestra neta, expedición, financiamiento, ajuste fuente, IVA, total, fecha, estado y trazabilidad;
- explicita que pago reportado/no pendiente según aseguradora no equivale a cobro conciliado.

### `modules/polizas.js`

- índice `vehiclesByPolicy` construido una vez por render;
- paginación `PAGE_SIZE=100`;
- desglose basado en `recibosEsperados`, no en `cobros`;
- campos faltantes no se suman como cero;
- columna visible explicita `Prima total`.

## Evidencia rojo → verde

### Rojo humano inicial

Run `30663042892` · artifact `8805878304` · digest `sha256:5e5d8c77bb2030e2b5d0a805036550db37735d5cd7c3134ea1f62ec9ed4d5e58`.

Contrato humano inicial: `0/12` PASS. El rojo se creó antes de modificar producto.

### Verde intermedio

Run `30664157660` · artifact `8806331365` · digest `sha256:ac55d789639c17d396a4e71c9d16c0a29de5e572c9800d1c5c0aaea1cf48465f`.

- gate visual previo: `39/39` PASS;
- read-model: PASS;
- contrato humano v2: `14/14` PASS.

### Endurecimiento final

Se agregaron dos contratos detectados en la misma revisión: prima total no inferida desde neta y orden cronológico de recibos. El primer run mostró un `VALIDATOR_STALE` porque el test antiguo exigía el alias previo. Producto se congeló y solo se corrigió el validador.

Run final `30664793625` · artifact `8806512775` · digest `sha256:184fd69bd6a67bd2e63536680e0c31df463302f0963b874f8f261a9e9ace0f69`.

Estado final estático: SUCCESS. Sin browser, sin deploy y sin escrituras.

## Siguiente frontera

No publicar todavía por inercia. Antes del próximo Hosting se conserva este candidato estático y se termina la auditoría read-only de fuentes necesarias para decidir qué es:

- información disponible solo para proyección visual;
- enriquecimiento persistente posterior al cierre del manifiesto;
- HOLD de identidad;
- insumo exclusivo del futuro bloque Cobros/conciliación.

Solo entonces se prepara **una única** publicación LAB integral de los fixes humanos; no se reabre Clientes ni se repiten migraciones ya cerradas.
