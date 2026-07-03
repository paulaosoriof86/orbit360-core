# Lógicas A&S vs Core multi-tenant — Orbit 360

**Fecha:** 2026-07-03  
**Objetivo:** separar reglas específicas de Alianzas y Soluciones de reglas core comercializables.

## 1. Reglas core multi-tenant

Estas reglas aplican a cualquier cliente/intermediario de Orbit 360:

### C1 — Personalización por tenant

- Cliente se configura por `Orbit.tenant`.
- Logo, paleta, país, moneda, glosario, aseguradoras, tarifas, roles, módulos e integraciones viven en configuración/datos.
- No se bifurca código por cliente.

### C2 — Capa única de datos

- Módulos solo usan `Orbit.store`.
- Backend reemplaza implementación de `data/store.js` manteniendo API.
- API mínima: `all`, `get`, `where`, `insert`, `update`, `remove`, `_emit`.

### C3 — Recaudo comercial separado de finanzas reales

- Pago aplicado a póliza/recibo = recaudo comercial.
- No crea `finmov` automático.
- `finmovs` = caja/banco real.

### C4 — Moneda por país

- GT usa GTQ.
- CO usa COP.
- No sumar monedas en crudo.
- Vistas globales separan por país o normalizan explícitamente.

### C5 — Producción/comisiones sobre prima neta recaudada

- Producción, metas y comisiones no se calculan sobre prima bruta emitida si no está recaudada.
- Usar base neta recaudada y reglas de liquidación.

### C6 — Importador inteligente configurable

- Debe mapear por sinónimos.
- Debe deduplicar.
- Debe permitir remapeo manual.
- Debe escribir al store/backend, no hardcodear.

## 2. Reglas específicas A&S

Estas reglas aplican al tenant Alianzas y Soluciones, pero deben implementarse por configuración/datos.

### A1 — Países y operación

- Guatemala por defecto.
- Colombia adicional.
- GT: IVA 12%.
- CO: IVA 19%.
- Mantener coherencia binacional GT/CO.

### A2 — Identidad A&S

- Marca base A&S en slot white-label.
- Paleta: rojo #C5162E, grafito #1E2227, grises/blanco.
- Registro SIB CS-254 cuando aplique en piezas GT.
- Colombia opera como A&S Consultores de Seguros.

### A3 — Reconciliación Jan-May

- Jan-May debe reconciliar comisiones desde facturas y movimientos financieros existentes.
- No duplicar ingresos ya registrados.
- Identificar factura, período de recaudo y relación con aseguradora.

### A4 — Jun-Jul en adelante

- Generar desde estados de cuenta/planillas de aseguradoras.
- Crear CxC aseguradora y CxP asesor según reglas.
- Factura de julio puede corresponder a recaudo de junio; factura de junio a recaudo de mayo.

### A5 — IVA y comisión asesor

- Factura puede incluir IVA.
- Separar subtotal/base, IVA y total.
- Comisión asesor se calcula sobre base antes de IVA.
- No pagar asesor sobre IVA salvo configuración expresa.

### A6 — USD

- Capturar moneda original.
- Tasa manual/configurable.
- Equivalente moneda local.
- Diferencia cambiaria.
- Trazabilidad por factura/planilla/liquidación.

### A7 — Importador planillas/estados

Debe pedir:

- aseguradora;
- tipo de documento;
- período documento;
- período recaudo;
- moneda;
- tasa;
- IVA;
- cliente;
- póliza;
- recibo;
- asesor;
- preview;
- aprobar fila;
- aprobar todo;
- excluir;
- remapear;
- iterar.

### A8 — Liquidación asesor

Si se cambia asesor o porcentaje, preguntar alcance:

1. solo esta liquidación;
2. actualizar póliza;
3. actualizar cliente;
4. actualizar póliza y cliente;
5. dejar pendiente de revisión.

Debe crear actividad/historial con:

- valor anterior;
- valor nuevo;
- usuario;
- fecha;
- razón;
- alcance aplicado.

### A9 — SIGA / recibos

Importación debe poder:

- identificar por póliza;
- cruzar cliente por nombre/identificación cuando falte póliza;
- crear o actualizar recibos;
- marcar cartera solo para pólizas vigentes/por renovar del año actual;
- mantener histórico para canceladas/vencidas.

### A10 — Cliente 360

Debe mostrar trazabilidad:

- cliente;
- póliza;
- recibo;
- pago/recaudo;
- estado cuenta;
- factura;
- comisión;
- liquidación;
- asesor;
- documento asociado.

## 3. Reglas de cartera

- Solo cobros pendientes de pólizas vigentes o por renovar del año actual forman cartera.
- Cancelada/vencida = histórico, analítica, campañas, segmentación; no cartera vigente.

## 4. Reglas que deben protegerse en backend

- No duplicar ingresos.
- No mezclar moneda.
- No hardcodear A&S.
- No escribir datos reales en seed/prototipo.
- Auditar cambios de asesor, póliza, liquidación y remapeos.
- Mantener trazabilidad de importación.

## 5. Estado

**Estado:** EN PROGRESO.  
**Uso:** fuente para contrato backend y paquete futuro para Claude.
