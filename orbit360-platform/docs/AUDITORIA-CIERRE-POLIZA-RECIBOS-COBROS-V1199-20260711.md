# AUDITORÍA Y CIERRE OPERATIVO — PÓLIZA → RECIBOS/COBROS v1.199b

Fecha: 2026-07-11  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open; sin merge, deploy ni producción.  
Carriles: A — UX/Academia; B — contratos, permisos y consistencia; C — modelo A&S sanitizado.

## 1. Objetivo

Cerrar el tramo operativo:

```txt
Cliente 360
→ alta/actualización de póliza
→ desglose de prima
→ recibos/cartera
→ pago reportado/validado/aplicado
→ propuesta de conciliación
→ estado operativo del cliente
```

Se trabajó sobre contratos y modelos ya cruzados de Clientes, Pólizas, Vehículos, Recibos, Cobros, Cartera y Comisiones. No se subió payload real A&S ni se repitieron perfiles/importaciones.

## 2. Hallazgos en la rama viva antes del cierre

### P0 — número de póliza ficticio

`modules/cliente360.js`, función `nuevaPoliza`, generaba un número aleatorio si el campo quedaba vacío.

Impacto:

- podía crear una póliza operativa con un identificador no emitido por la aseguradora;
- debilitaba deduplicación y trazabilidad;
- no era compatible con una migración real ni con futuros tenants.

Corrección: el nuevo formulario exige el número real. La importación sigue disponible como flujo separado.

### P0 — alta no idempotente y sin llave canónica

La creación insertaba directamente Póliza, Cobros, Vehículo y Actividad, sin una llave común ni un identificador de operación.

Corrección:

```txt
policyKey = tenantId | país | aseguradoraId | número normalizado
operationId = identificador común de la operación
receiptKey = tenantId | policyId | secuencia
receiptId = cob_<policyId>_<secuencia>
```

Un reintento no debe duplicar pólizas, recibos ni propuestas activas de conciliación.

### P0 — regeneración destructiva de recibos

La función legacy `regenerarRecibosPendientes` eliminaba físicamente todos los recibos no pagados antes de recrearlos.

Impacto:

- pérdida de trazabilidad;
- desaparición de soportes/reportes en revisión;
- riesgo de inconsistencias entre interfaces, auditoría y backend;
- comportamiento inseguro con Firestore optimista.

Corrección:

- los recibos pagados se preservan;
- los pendientes reutilizables se actualizan;
- los duplicados o sustituidos pasan a `Anulado`;
- se registra `anuladoMotivo` y `operationId`;
- no existe `remove('cobros', ...)` en el motor nuevo.

### P0 — cambios financieros después de pagos

El editor podía cambiar prima, moneda, forma de pago, cliente, aseguradora o cuotas aun cuando ya existían pagos.

Corrección: los campos financieros y de asignación quedan bloqueados cuando existe un recibo pagado. El sistema responde:

```txt
pagos_existentes_requieren_endoso
```

La modificación debe gestionarse como endoso/corrección controlada.

### P0 — recaudo y conciliación mezclados

El modal anterior podía marcar `conciliado=true` solo por seleccionar el nombre de una factura local. También leía el archivo como Data URL.

Corrección:

```txt
Confirmar pago
→ estado Pagado
→ actualiza cartera/recaudo
→ NO escribe finmovs
→ conciliado = false

Crear propuesta de conciliación
→ nueva fila en conciliaciones
→ estado PROPUESTA
→ documento por documentRef
→ NO modifica el pago
```

### P0 — permiso de Asesor potencialmente abierto por matriz

La matriz legacy podía conceder `editar` a roles de nivel 2. Esto entraba en conflicto con la regla de producto: el Asesor consulta su cartera y completa faltantes, pero no modifica pólizas/cobros/conciliaciones.

Corrección: `core/access-ceilings-v1199.js` aplica límites duros reutilizables por encima de la matriz configurable.

### P1 — moneda mezclada en KPI

Pólizas y Cobros normalizaban COP/GTQ para mostrar un único valor global.

Corrección: el bridge v1.199 muestra cada moneda por separado y abre el detalle que compone el KPI.

### P1 — vehículo vacío

Una suma asegurada podía considerarse suficiente para crear un registro de vehículo sin placa, marca, línea, chasis o motor.

Corrección v1.199b: solo se crea vehículo cuando existe al menos un dato de identidad vehicular.

### P1 — falso cambio crítico por normalización

Una póliza antigua sin campos normalizados podía parecer modificada aunque el usuario no hubiese cambiado el valor funcional.

Corrección v1.199b: el antes y el después se comparan normalizados; el motor recibe únicamente cambios reales.

### P1 — propuestas de conciliación duplicadas

Un reintento podía crear varias propuestas activas para el mismo recibo.

Corrección v1.199b: si ya existe `PROPUESTA`, `EN_REVISION` o `VALIDADA`, se reutiliza.

## 3. Archivos implementados

```txt
core/access-ceilings-v1199.js
core/policy-receipts-engine.js
core/policy-receipts-v1199-refinements.js
modules/policy-receipts-v1199-bridge.js
modules/policy-receipts-v1199-detail-guard.js
data/academia-v1199-policy-receipts.js
tools/orbit360-test-policy-receipts-v1199.mjs
tools/orbit360-test-policy-receipts-v1199b.mjs
tools/orbit360-validar-policy-receipts-v1199.mjs
tools/orbit360-validar-policy-receipts-v1199b.mjs
```

`index.html` carga estos contratos de forma aditiva y conserva backend LAB, `Orbit.store`, Auth, importador y hotfixes.

## 4. Contrato operativo

### Estados y cartera

```txt
Vigente / Por renovar
→ genera o sincroniza recibos activos

Vencida / Cancelada / Anulada / Rechazada / otros históricos
→ no genera cartera nueva
→ anula recibos no pagados existentes
→ preserva pagos aplicados
```

### Prima

Se mantienen separados:

```txt
primaNeta
gastosEmision
gastosFinan
otros
baseGravable
ivaPct
ivaMonto
primaTotal
```

Cada recibo conserva el mismo desglose y el total de recibos debe cuadrar con `primaTotal` dentro de tolerancia de redondeo.

### Pago

- requiere rol autorizado;
- requiere recibo Pendiente/Vencido;
- requiere póliza con cartera activa;
- un reporte de cliente debe validarse antes de aplicar;
- es idempotente si el recibo ya está pagado;
- actualiza estado del cliente;
- no crea movimientos en `finmovs`.

### Conciliación

- solo parte de un recibo Pagado;
- crea una propuesta, no aplica el cruce;
- conserva fuente, archivo/fila, país, moneda, cliente, póliza, recibo y monto;
- sin `documentRef`, queda bloqueada para validación;
- no se duplica mientras exista una propuesta activa.

## 5. Academia

Se agregaron rutas para Dirección, Operativo y Asesor con:

- llave canónica;
- prima desglosada;
- estados que generan cartera;
- preservación de pagos;
- endoso requerido;
- recaudo distinto de ingreso financiero;
- conciliación como propuesta;
- documentos por referencia;
- evaluación aplicada.

## 6. Pruebas

Ejecutado localmente:

```txt
node --check archivos nuevos/modificados: OK
node tools/orbit360-test-policy-receipts-v1199b.mjs: OK
```

Cobertura funcional:

- llave canónica y duplicado;
- 12 recibos deterministas;
- suma de recibos = prima total;
- vehículo vacío no creado;
- pago preservado;
- no escritura en `finmovs`;
- falso cambio normalizado evitado;
- cambio financiero con pago bloqueado;
- histórico anula sin borrar;
- propuesta de conciliación no aplica pago;
- reintento no duplica propuesta;
- Asesor bloqueado para modificar pólizas.

El validador estático v1.199b quedó agregado para ejecutarse en el repositorio local completo. No se afirma todavía un smoke visual/navegador.

## 7. Límite técnico honesto

El motor implementa consistencia e idempotencia a nivel de aplicación, pero `Orbit.store` no expone aún una API transaccional atómica común.

En Firestore LAB, las escrituras son optimistas y separadas. Por lo tanto, permanece pendiente en Carril B:

- transacción/batch durable Póliza + Recibos + Vehículo + Auditoría;
- rollback garantizado ante fallo parcial;
- constraint backend de `policyKey` y `receiptKey`;
- validación server-side de tenant/rol/scope;
- estado de operación `pending/synced/failed` consolidado;
- reintento backend idempotente.

No se presenta este cierre como transacción backend final.

## 8. Pendientes para cierre total del grupo CRM

1. Definir y construir el flujo canónico de Renovación.
2. Definir tipos de Endoso y campos permitidos por tipo.
3. Conectar vehículo existente al editor sin duplicarlo.
4. Aplicar motivo/antes/después a validación de reporte y estados de conciliación.
5. Corregir Renovaciones: KPI multimoneda, mensajes de envío honesto y eliminación de primas estimadas presentadas como propuesta real.
6. Portal externo con Auth cliente real.
7. Equipo multirol y scopes configurables desde UI/backend.
8. Smoke visual y funcional con dataset A&S sanitizado.

## 9. Estado

```txt
CLIENTE360_SCOPE_ALTA: CERRADO_CON_SMOKE_VISUAL_PENDIENTE
POLIZA_ALTA_RECIBOS: CERRADO_A_NIVEL_APLICACION
PAGO_RECAUDO: CERRADO_A_NIVEL_APLICACION
CONCILIACION_PROPUESTA: CERRADO_A_NIVEL_APLICACION
TRANSACCION_BACKEND_ATOMICA: PENDIENTE_CARRIL_B
RENOVACION_ENDOSO: PENDIENTE_LOGICA_OPERATIVA
DATOS_REALES_ESCRITOS: NO
DEPLOY: NO
MERGE: NO
PRODUCCION: NO
```
