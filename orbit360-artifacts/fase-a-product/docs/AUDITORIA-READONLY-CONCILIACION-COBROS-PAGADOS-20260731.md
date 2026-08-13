# AUDITORÍA READ-ONLY — CONCILIACIÓN DE COBROS PAGADOS

Fecha: 2026-07-31  
Proyecto: Orbit 360 / A&S  
Carril: C — datos reales/migración  
Clasificación de datos: `TENANT_AYS_ONLY` / evidencia sanitizada  
Escrituras realizadas: **0**

## Objetivo

Validar el contrato one-to-one de conciliación contra reportes de pagos/cobros de aseguradoras ya auditados, sin materializar todavía `cobros` ni modificar cartera.

## Fuentes auditadas en este corte

Se utilizaron únicamente reportes de pagos/cobros de aseguradora ya disponibles y la fuente canónica de pagos reportados del CRM.

No se usaron estados de cartera pendientes como prueba de pago.

## Resultado agregado

Reportes de aseguradora revisados en este corte: **2**.  
Filas de pagos/cobros de aseguradora revisadas: **9**.

Resultado del cruce one-to-one:

- **5** filas con contraparte CRM inequívoca bajo identidad one-to-one → candidatas a conciliación;
- **4** filas sin match suficiente → no se concilian automáticamente;
- escrituras: **0**;
- cobros materializados: **0**;
- finmovs: **0**.

Este resultado corresponde solo a las fuentes pagadas auditadas en este corte; no debe extrapolarse a todas las aseguradoras.

## Reglas aplicadas

Núcleo requerido:

- aseguradora;
- póliza;
- moneda;
- monto dentro de tolerancia contractual.

Desambiguadores, cuando existen:

- recibo canónico;
- número de recibo/requerimiento;
- cuota/serie;
- fecha límite;
- fecha de pago;
- cliente.

Regla one-to-one:

- un mismo pago CRM no puede utilizarse para conciliar dos filas de aseguradora;
- empate o identidad insuficiente → HOLD / requiere validación.

## Diferencias entre fuentes

En candidatos que representan el mismo pago pueden existir diferencias menores de fuente, por ejemplo:

- fecha CRM vs fecha aseguradora;
- centavos de monto.

Estas diferencias:

- no se ocultan;
- no se sobrescriben;
- no cambian silenciosamente el dato original;
- se conservan en `sourceDifferences` para auditoría y revisión.

## Cartera pendiente

La fuente canónica de cartera se mantiene separada de pagos.

**Cartera conciliada con aseguradora** = saldo pendiente contrastado/confirmado contra una fuente de autoridad de aseguradora.

No equivale a cobro ni crea un pago.

## Próximo paso de datos

Cuando se abra el bloque macro Cobros/Conciliación:

1. ampliar el dry-run a todas las fuentes de cobro/recaudo aplicables;
2. resolver HOLD/no-match sin adivinar;
3. aplicar FIFO sobre obligaciones elegibles, incluyendo histórico reciente exigible cuando corresponda;
4. materializar únicamente pagos conciliados autorizados;
5. volver a validar cartera, recibos y cobros sin alterar pólizas ni clientes;
6. mantener rollback y auditoría before/after.

## Estado

`READ_ONLY_RECONCILIATION_CANDIDATES_IDENTIFIED`

No autoriza escritura ni Hosting.
