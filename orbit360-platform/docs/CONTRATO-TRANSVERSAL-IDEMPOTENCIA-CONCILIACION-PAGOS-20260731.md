# CONTRATO TRANSVERSAL — IDENTIDAD, UPSERT, RECIBOS, CARTERA Y CONCILIACIÓN

Fecha: 2026-07-31  
Proyecto: Orbit 360 / A&S  
Clasificación: arquitectura reusable + tenant data protected  
Gate asociado: `block9-receipts-portfolio-static-v20260730` · contrato `9.1.0`

## 1. Propósito

Evitar que Clientes, Aseguradoras, Pólizas, Vehículos, Recibos y Cartera vuelvan a requerir acondicionamientos independientes para resolver duplicados, actualizaciones parciales, semántica de prima o conciliación.

Este contrato es transversal y debe aplicarse tanto a:

- alta directa desde la plataforma;
- edición de un registro existente;
- importación documental;
- importación Excel/CSV/PDF/imagen;
- cargas de actualización posteriores;
- migraciones iniciales de nuevos tenants.

No autoriza escrituras productivas por sí mismo.

## 2. Identidad y upsert

Owner reusable:

`core/importa-identity-upsert-v20260731.js`

Reglas:

1. Identidad exacta → actualizar el mismo registro.
2. Campo entrante vacío → no borra un dato existente no vacío.
3. Identidad probable → `HOLD`; no crear segundo registro.
4. Identidad nueva suficientemente fuerte → crear.
5. El dry-run y el writer usan el mismo resolver.
6. Una actualización no puede convertirse en un insert silencioso por diferencia de implementación.
7. Un probable duplicado existente nunca se auto-fusiona.
8. La misma protección aplica al ingreso manual desde la plataforma.

Entidades cubiertas inicialmente:

- clientes;
- aseguradoras;
- pólizas;
- vehículos / bienes asegurados;
- recibos esperados / externos / aseguradora;
- estados de cuenta de aseguradora;
- cartera de primas.

## 3. Pólizas: prima y pago

Contrato permanente:

- prima neta, gastos, expedición, financiamiento, ajuste fuente, IVA/impuestos y prima total son conceptos separados;
- prima total nunca se infiere desde prima neta;
- prima neta nunca se infiere desde total;
- el total de la fuente se preserva;
- la suma de componentes sirve para validar, no para sobrescribir la fuente;
- cualquier diferencia de fuente permanece visible y trazable;
- valores ausentes permanecen ausentes, no se convierten en cero.

Dimensiones de pago separadas:

- `frecuencia`: mensual, trimestral, contado/pago único, etc.;
- `formaPago`: transferencia, tarjeta, débito, efectivo u otro método real;
- `conductoPago`: directo, domiciliado, intermediario u otro conducto configurado.

Ninguna dimensión faltante se inventa. El legacy `Contado` sin procedencia se retira y el registro queda en validación.

## 4. Recibo, cartera y cobro son entidades distintas

- `reciboEsperado`: obligación/calendario derivado de una póliza válida.
- `carteraPrimas`: saldo pendiente confirmado o pendiente de confirmación.
- `pago_reportado`: evidencia de pago; todavía no es cobro conciliado.
- `cobro_conciliado`: pago confirmado contra fuentes autoritativas según contrato.
- `finmov`: registro financiero; no se crea por inferencia desde cartera o banco.

## 5. Cartera conciliada con aseguradora

Cuando una obligación de cartera tiene:

- fuente de autoridad de aseguradora;
- identidad/match trazable;
- `sourceRef`;
- calidad de match;
- ausencia de HOLD;

la vista puede mostrar **Cartera conciliada con aseguradora**.

Esto significa: el saldo pendiente fue contrastado/confirmado con la fuente de la aseguradora.

No significa: el cliente pagó.

## 6. Cobro conciliado

Una sola fuente nunca crea automáticamente un cobro conciliado.

Puede conciliarse un pago cuando existe match one-to-one entre dos fuentes autoritativas, por ejemplo:

- cobro/recaudo del CRM;
- reporte de cobros/pagos de aseguradora.

El matcher requiere coincidencia de núcleo:

- aseguradora;
- póliza;
- moneda;
- monto dentro de tolerancia contractual.

Luego desambigua one-to-one utilizando, cuando existen:

- identificador canónico de recibo;
- número de recibo/requerimiento;
- cuota/serie;
- fecha límite;
- fecha de pago;
- cliente.

Un pago CRM no puede utilizarse para conciliar dos filas de aseguradora.

Empates, conflictos o identidad insuficiente → `REQUIERE_VALIDACION`.

## 7. Diferencias entre fuentes

Una diferencia de fuente no se oculta ni se usa automáticamente para sustituir un valor.

Se preservan separadamente:

- monto CRM;
- monto aseguradora;
- delta;
- fecha CRM;
- fecha aseguradora;
- diferencia de días;
- referencia de origen.

Una diferencia menor puede coexistir con la identidad del mismo pago si el contrato de matching lo soporta; la discrepancia sigue visible para auditoría.

## 8. FIFO

La regla FIFO para aplicación de cobros se conserva para el bloque Cobros/Conciliación:

- al aplicar un pago, se atiende primero la obligación exigible aplicable más antigua;
- recibos vencidos de vigencias recientes vencidas pueden permanecer exigibles cuando corresponda;
- una vigencia vencida no se reactiva por esta regla;
- cartera histórica exigible y renovación activa siguen siendo conceptos distintos.

## 9. No regresión

El gate 9.1.0 debe proteger como mínimo:

- exact identity → update;
- probable identity → HOLD;
- blank incoming no borra dato existente;
- dry-run predice la escritura;
- prima total no se infiere;
- frecuencia/forma/conducto separados;
- matcher one-to-one;
- diferencias de fuente preservadas;
- saldo conciliado ≠ pago conciliado;
- una fuente sola no auto-concilia;
- cero escrituras en validaciones estáticas.

## 10. Datos A&S

Los datos reales, PII, nombres, números de póliza, montos privados y decisiones sobre duplicados existentes son `TENANT_AYS_ONLY` / `SECRETO_DATO_REAL` y no forman parte de este contrato reusable.
