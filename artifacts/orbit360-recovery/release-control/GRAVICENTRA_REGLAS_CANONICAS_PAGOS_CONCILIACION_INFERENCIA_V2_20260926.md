# GRAVICENTRA INSURANCE
## ADDENDUM PREVALENTE V2 — PAGOS, COBROS, CONCILIACIÓN, FECHAS E INFERENCIA
**Fecha:** 26 de septiembre de 2026  
**Estado:** PREVALENTE / FROZEN / USER-APPROVED BUSINESS RULE

### 1. Prevalencia
Este addendum complementa y, únicamente donde exista contradicción, prevalece sobre `GRAVICENTRA_REGLAS_CANONICAS_PAGOS_CONCILIACION_INFERENCIA_20260919.md`, en especial sobre su sección 6 relativa a fechas de pagos inferidos.

No modifica las reglas que prohíben crear cobros por la sola existencia de un recibo, duplicar cobros, ignorar evidencia contradictoria o saltarse trazabilidad.

### 2. Estado conceptual canónico
A. **Recibo esperado:** obligación contractual.  
B. **Pago reportado pendiente de validación:** soporte o reporte todavía no confirmado por una autoridad válida.  
C. **Cobro confirmado no conciliado:** pago que un usuario autorizado aplicó/confirmó en Gravicentra o que una fuente autoritativa confirma como pagado.  
D. **Cobro conciliado:** cobro confirmado además validado/aplicado contra evidencia de aseguradora, banco, comisión, factura u otra fuente aprobada.

Un pago aplicado/confirmado en Gravicentra es un **cobro confirmado aunque aún no esté conciliado**.

### 3. Fechas de pago directo
Para pago directo:
- `fechaPago` = fecha real de pago demostrada por evidencia/base;
- `fechaConciliacion` = fecha en que se concilia;
- `fechaAplicacionAseguradora` = fecha en que la aseguradora lo aplica;
- `facturaFecha` = fecha propia de la factura cuando exista.

Estas fechas son independientes y no se igualan por defecto.

### 4. Fechas de pago inferido
Para pago inferido:
- `inferredPaid=true`;
- la `fechaPago` efectiva/mostrada debe pertenecer al requerimiento o período contractual en que debió haberse pagado, no al mes en que la inferencia fue descubierta o conciliada;
- la UI debe indicar expresamente que la fecha es **inferida** cuando no exista evidencia directa de la fecha histórica;
- se conservan además `evidenceAsOf`, `fechaConciliacion`, `fechaAplicacionAseguradora`, `cuotaAncla`, `inferenceRule`, `evidenceRef`, `confidence` y `actor`.

La fecha inferida es una fecha efectiva de negocio anclada al período contractual; no debe presentarse como si fuera una fecha histórica directamente probada.

### 5. Evidencia posterior
Si luego aparece evidencia directa:
- se enriquece la procedencia del mismo cobro;
- se sustituye o precisa la fecha inferida por la fecha real cuando la evidencia lo demuestre;
- no se crea un segundo cobro;
- no se duplica saldo, comisión ni movimiento.

### 6. Separación de eventos
Cada cobro confirmado debe poder distinguir como mínimo:
`receiptId`, `policyId`, `clientId`, importe, moneda, `fechaPago`, método, estado de confirmación, conciliado, `fechaConciliacion`, `fechaAplicacionAseguradora`, `facturaNumero`, `facturaFecha`, referencia documental, tipo/referencia de evidencia, directo/inferido, `inferredPaid`, cuota ancla, regla de inferencia, confianza, actor e historial.

### 7. Prohibiciones
Queda prohibido:
- tratar todo pago no conciliado como “no cobro”;
- ocultar en Cobros un pago ya aplicado/confirmado;
- crear cobros por la sola existencia de recibos;
- inflar el mes de conciliación con pagos inferidos de períodos anteriores;
- asumir que fecha de factura, fecha de pago y fecha de aplicación por aseguradora coinciden;
- duplicar cobros cuando nueva evidencia enriquece un pago ya existente.

### 8. Implementación
B3 debe consumir un solo motor canónico compartido por Cliente 360, Cobros/cartera, conciliación, importadores y superficies posteriores. Este addendum queda congelado antes de abrir B3 y no autoriza por sí solo escrituras de datos, promoción LIVE ni reimportación.
