# Registro de fuentes Recibos/Cartera + ingesta directa reusable — 2026-07-30

Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Estado: análisis/read-only; sin escrituras de Recibos/Cartera/Cobros.

## 1. Objetivo del bloque

Consolidar recibos por póliza y forma/frecuencia de pago, separar cartera pendiente de evidencia de pagos y preparar la conciliación posterior sin mezclar fuentes. La unidad canónica de Pólizas/Vehículos ya está escrita; este bloque no reimporta clientes, aseguradoras, pólizas ni vehículos.

## 2. Regla de autoridad vigente

- El estado contractual de la póliza lo manda la vigencia canónica de `polizas`, no el texto de cobro/estatus de la fuente SIGA.
- Un valor fuente como `Vencida` puede describir condición de pago y se conserva como provenance.
- `recibosEsperados` representa el calendario/cuotas de la póliza según frecuencia y vigencia.
- `carteraPrimas` representa saldo pendiente operativo; no es histórico financiero.
- Una fecha de pago en SIGA o un reporte de aseguradora es evidencia de cobro, pero no crea por sí sola un `cobro` conciliado.
- Estados bancarios solo participan en conciliación.
- Producción/comisiones se calculan posteriormente sobre prima neta recaudada conciliada.

## 3. Fuentes recibidas — deduplicación lógica

### Fuente SIGA — calendario completo de recibos

- `Todos los recibos a partir de 2025.xlsx`: 2,098 filas de recibos; fechas de recibo 2024-08-03 a 2027-07-15; fechas límite 2024-08-03 a 2027-07-21.
- `Reporte-2026-07-30-183043.xlsx`: mismo contenido lógico anterior con 9 filas de branding/encabezado. No se contabiliza dos veces.

### Fuente SIGA — estado por fecha límite

- `Recibos por fecha límite.xlsx`: 1,698 filas.
- `CobranzaCendoso (23).xlsx`: mismo contenido lógico con branding. No se contabiliza dos veces.

Clasificación raw del archivo canónico:

```text
Pendiente: 937
  - vencimiento <= 2026-07-30: 323
  - vencimiento > 2026-07-30: 614
Con fecha real de pago: 424
Cancelado: 337
Total: 1698
```

Frecuencias raw:

```text
Mensual: 1557
Pago Único: 127
Semestral: 7
Quincenal: 3
Sin frecuencia: 4
```

Estos conteos todavía deben cruzarse con la póliza canónica antes de materializar cartera; no se usa `Estatus póliza` fuente como autoridad contractual.

### Fuente SIGA — cobranza efectuada

- `Cobranza Efectuada desde 2024.xlsx`: 2,157 filas con fecha real de pago.
- `CobranzaCendoso (22).xlsx`: mismo contenido lógico con branding. No se contabiliza dos veces.

Ventana de migración vigente para `cobros_realizados`: 2026-05-01 a 2026-07-30. En esa ventana SIGA contiene 213 filas con fecha real de pago: 204 GTQ y 9 COP. Se conserva como evidencia para conciliación; no se escribe todavía `cobros` sin cruce de aseguradora/banco.

### Fuente SIGA — vencidos

- `Cobranza vencida.xlsx`: 325 filas raw, todas con `Fecha Real Pagado = Pendiente`.
- 323 tienen fecha límite <= 2026-07-30; 2 vencen el 2026-07-31 y quedan fuera del corte.
- Moneda raw de las 323 al corte: 300 GTQ, 14 COP y 9 sin moneda; las 9 sin moneda deben resolverse contra la póliza canónica, nunca por default.

## 4. Fuentes de aseguradoras recibidas

Se usan como evidencia externa y control de cartera; no sustituyen la póliza/recibo canónico ni se suman entre sí sin reconciliar período, moneda, ramo y alcance del reporte.

- La Ceiba: pendientes por póliza de automóviles, reporte 31/07/2026. Snapshot posterior un día al corte; se conserva como evidencia y se debe ajustar/validar contra 30/07.
- Universales: antigüedad de saldos con detalle de recibos al 27/07/2026. Total reporte Q32,927.01.
- Aseguradora Guatemalteca / AseGuate: primas por cobrar al 28/07/2026. Total reporte Q32,098.45.
- G&T: `Estado de Cartera GyT.xlsx`, dos registros visibles en la fuente recibida; saldo Q6,587.28 + Q577.91. El alcance del extracto se valida antes de considerarlo cartera total.
- Aseguradora General: cuotas pendientes al 20/07/2026; cobros realizados 01/07/2026–27/07/2026.
- Mapfre: proyectado de primas por cobrar al 31/07/2026; total Q7,024.36. Reporte de prima pagada 01/07/2026–26/07/2026; total Q3,217.41.
- El Roble: balance de cartera por póliza/recibo y buckets de antigüedad; se preserva como fuente de conciliación.

Los distintos reportes tienen cortes y alcances diferentes; por eso no se declara un total consolidado hasta terminar la reconciliación por recibo.

## 5. Pipeline del bloque Recibos/Cartera

1. Deduplicar exportaciones equivalentes por fuente lógica.
2. Normalizar calendario de recibos SIGA.
3. Vincular cada fila a `polizaId` canónico por identidad segura (número + vigencia y claves auxiliares cuando corresponda).
4. Aplicar frecuencia/serie para construir `recibosEsperados` sin duplicar cuotas.
5. Separar estados raw: pendiente, pagado reportado, cancelado, futuro.
6. Determinar cartera al corte usando estado contractual canónico y fecha límite.
7. Cruzar aseguradoras por póliza/recibo/monto/moneda/vencimiento.
8. Dejar pagos como `PAGO_REPORTADO / PENDIENTE_CONCILIACION` hasta el bloque Cobros/conciliación.
9. Ejecutar dry-run + diff + calidad + trazabilidad.
10. Solo después, prewrite read-only contra Firestore y autorización macro independiente para escritura.

## 6. Visualización — checkpoint obligatorio

La primera revisión visual consolidada debe ocurrir **inmediatamente después de `Recibos/Cartera WRITE_PASS` y antes de escribir Cobros/conciliación**. En esa revisión deben verse, al menos:

- Cliente 360 → póliza → vehículo(s) → calendario de recibos;
- forma/frecuencia de pago;
- cuota/serie y vencimiento;
- prima neta/gastos/impuestos/total por recibo cuando la fuente lo permita;
- estado visual separado: futuro, pendiente, vencido, pago reportado/en revisión;
- cartera pendiente por póliza/cliente/aseguradora/moneda;
- trazabilidad de fuente sin copy técnico en UI cliente.

Después de `Cobros/conciliación WRITE_PASS` se realiza una segunda revisión visual financiera para comprobar `pago reportado → conciliado/aplicado`, diferencias y saldo resultante.

## 7. Requisito reusable de ingesta directa — registrado, no bloqueante

Se registra como capacidad transversal posterior al cierre de la ruta crítica actual. No debe implementarse como hardcode A&S ni como flujos paralelos por módulo.

### Capacidades objetivo

- importación masiva e individual de pólizas por el mismo pipeline;
- importación de facturas/recibos/planillas/estados de cuenta para conciliación;
- importación de PDF/imagen/Excel/CSV con detección de encabezados y sinónimos;
- importación de DPI/RUT/RTU/cédula y documentos del cliente para extraer datos y proponer alta/actualización;
- si el cliente no existe, permitir crearlo con calidad pendiente y trazabilidad, sin inventar datos;
- documentos no escriben silenciosamente: propuesta + diff + confirmación antes del alta/modificación;
- póliza individual usa exactamente el mismo normalizador, deduplicador, calidad, dry-run, confirmación, auditoría y rollback que una carga masiva;
- estado de cuenta bancario nunca crea un cobro por inferencia; solo propone conciliación;
- cada importación conserva archivo/hoja/fila/bloque/país/moneda/periodo y rollback.

### UX objetivo

Un único `Centro de importación` debe permitir `Arrastrar archivo / Seleccionar archivo / Capturar documento`, detectar el tipo de fuente, mostrar mapeo corregible, dry-run crear/actualizar/omitir/requiere validación y confirmar una sola vez. La UI no muestra Firebase, backend, LAB, mocks, secretos ni términos técnicos internos.

## 8. Clasificación para réplica

- Pipeline genérico de ingesta, mapeo, dry-run, diff, confirmación y UX: `REPLICABLE_CLAUDE_ACUMULADO`.
- Academia de importación individual/masiva, calidad, documentos y conciliación: `ACADEMIA_ACTUALIZAR`.
- Mapeos, aliases y reglas de fuentes A&S/aseguradoras concretas: `TENANT_AYS_ONLY`.
- Writer durable, Auth, Secrets, Firestore/Storage, conciliación sensible y rollback: `BACKEND_PROTEGIDO_NO_CLAUDE`.
- Datos reales, documentos personales y archivos de clientes: `SECRETO_DATO_REAL`.

## 9. No desviación

Este registro no abre un frente nuevo antes de tiempo. La ruta crítica sigue:

`Recibos/Cartera → revisión visual 1 → Cobros/conciliación → revisión visual 2 → Comisiones/planillas → financiero histórico → Siniestros/Documentos`.

La capacidad de ingesta directa se diseña reutilizable desde este bloque, pero su UX/operación completa se activa en el punto seguro sin retrasar la migración vigente.
