# TABLERO DE CIERRE P0 — IMPORTADORES Y CONCILIACION

Fecha: 2026-07-09
Carriles: A/B/C
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open
Estado general: P0 implementado como capas aditivas; validacion CI/smoke pendiente de resultado visible.

---

## 1. Objetivo P0

Cerrar la base minima segura para operar importadores y conciliaciones sin mezclar fuentes ni entidades:

- clientes;
- polizas;
- recibos esperados;
- recibos fuente externa;
- estados de cuenta de aseguradora;
- cartera de primas;
- planillas de comisiones;
- facturas de comision;
- CxC de comisiones;
- CxP de asesores;
- estados bancarios;
- conciliaciones.

P0 no significa produccion final. Significa que las capas criticas ya tienen separacion tecnica inicial, trazabilidad conceptual y gates de validacion.

---

## 2. Resumen ejecutivo

| Bloque | Estado | Resultado |
|---|---|---|
| Matriz P0 importadores/conciliacion | Cerrado | Contrato operativo documentado. |
| Plan de implementacion P0 | Cerrado | Orden por archivo/capa documentado. |
| Limpieza visible fuente externa | Cerrado | UI/Academia sin nombre visible de fuente legacy reportado por Paula. |
| Polizas P0 | Implementado | Motor y wire aditivo. |
| Recibos/cartera P0 | Implementado | Motor y wire aditivo. |
| Comisiones/facturas P0 | Implementado | Motor y wire aditivo. |
| Banco/comisiones P0 | Implementado | Motor y wire aditivo. |
| Smokes P0 | Preparado | Archivos de smoke y workflow agregados. |
| CI/smoke | Pendiente resultado | No sustituye aun validacion empresarial. |
| Produccion/deploy | No realizado | Bloqueado hasta validacion. |
| Merge a main | No realizado | Bloqueado hasta validacion. |

---

## 3. Archivos P0 agregados

### 3.1 Polizas

```txt
orbit360-platform/core/importa-polizas-p0.js
orbit360-platform/core/importa-polizas-p0-wire.js
tools/orbit360-test-importa-polizas-p0.mjs
tools/orbit360-test-importa-polizas-p0-wire.mjs
orbit360-platform/docs/REGISTRO-P0-MOTOR-POLIZAS-IMPORTADOR-20260709.md
orbit360-platform/docs/REGISTRO-P0-WIRE-POLIZAS-IMPORTADOR-20260709.md
```

### 3.2 Recibos / cartera / conciliacion de primas

```txt
orbit360-platform/core/importa-cartera-p0.js
orbit360-platform/core/importa-cartera-p0-wire.js
tools/orbit360-test-importa-cartera-p0.mjs
orbit360-platform/docs/REGISTRO-P0-RECIBOS-CARTERA-CONCILIACION-20260709.md
```

### 3.3 Comisiones / facturas / CxC / CxP

```txt
orbit360-platform/core/importa-comisiones-p0.js
orbit360-platform/core/importa-comisiones-p0-wire.js
tools/orbit360-test-importa-comisiones-p0.mjs
orbit360-platform/docs/REGISTRO-P0-COMISIONES-FACTURAS-CXC-CXP-20260709.md
```

### 3.4 Banco / conciliacion de comisiones

```txt
orbit360-platform/core/importa-banco-comisiones-p0.js
orbit360-platform/core/importa-banco-comisiones-p0-wire.js
tools/orbit360-test-importa-banco-comisiones-p0.mjs
orbit360-platform/docs/REGISTRO-P0-BANCO-COMISIONES-CXC-CXP-20260709.md
```

### 3.5 Workflow

```txt
.github/workflows/orbit360-p0-smoke.yml
```

### 3.6 Hub de carga

```txt
orbit360-platform/modules/importar.js
```

---

## 4. Capa por capa

### 4.1 Polizas

Estado: implementado como motor + wire runtime.

Cubre:

- llave compuesta;
- estado fuente original;
- estado operativo Orbit;
- renovada vigente;
- vigente operativa;
- vencida historica;
- cancelada terminal;
- forma de pago requerida;
- recibos esperados separados de cobros confirmados.

Pendiente:

- validacion smoke/CI;
- validacion visual del importador;
- consolidar integracion directa si se decide reemplazar wire por importador nativo.

### 4.2 Recibos / cartera de primas

Estado: implementado como motor + wire runtime.

Cubre:

- estados de cuenta de aseguradora no quedan como `cobros`;
- crean `estadosCuentaAseguradora`;
- crean `recibosAseguradora`;
- crean `carteraPrimas`;
- crean `conciliacionesPrimas`;
- prima pendiente no es CxC financiera;
- estado de cuenta no marca pago confirmado;
- estado de cuenta no crea finmov.

Pendiente:

- vistas operativas de cartera por aseguradora/pais/moneda/aging;
- conciliacion completa contra cobros fuente externa y recibos esperados;
- validacion con archivos reales sanitizados.

### 4.3 Comisiones / facturas / CxC / CxP

Estado: implementado como motor + wire runtime.

Cubre:

- planilla de comision no crea prima pendiente;
- planilla crea `planillasComisiones`;
- planilla crea `comisionesDevengadas`;
- planilla crea `conciliacionesComisiones`;
- factura de comision crea `facturasComisiones`;
- factura de comision crea `cxcComisiones`;
- factura de prima/no comision no crea CxC de comision;
- CxC financiera separada de cartera de primas;
- pago asesor no se marca automaticamente.

Pendiente:

- liquidaciones asesor con reglas por asesor/rol/pais/moneda;
- CxP asesor final con aprobacion;
- cruce factura-planilla-banco con UI operativa.

### 4.4 Banco / comisiones

Estado: implementado como motor + wire runtime.

Cubre:

- estado bancario no crea `finmov` definitivo;
- banco crea `movimientosBanco` pendiente;
- banco crea `conciliacionBancaria` pendiente;
- abono propone match contra `cxcComisiones`;
- cargo propone match contra `cxpAsesores`;
- CxC comision queda como recaudo probable pendiente de confirmacion;
- CxP asesor queda como pago probable pendiente de confirmacion;
- confirmacion humana obligatoria.

Pendiente:

- confirmar conversion de propuesta a finmov definitivo;
- gate de aprobacion para pago asesor;
- auditoria de cambio antes/despues;
- bloqueo de pagos automaticos sin confirmacion.

---

## 5. Estado por carril

| Carril | Estado | Avance | Pendiente |
|---|---|---|---|
| A — Prototipo/UX/Claude | Parcial | Importar queda cargando motores P0. | UX de bandejas, tablero, Academia profunda, guias por rol. |
| B — Backend protegido | En resguardo | No se modificaron `store.js`, adapter LAB ni reglas. | Validacion CI/smoke y decision de integrar nativo vs mantener wires. |
| C — Datos reales/migracion | En preparacion | Reglas de fuentes separadas codificadas para P0. | Dry-run con polizas, cartera, comisiones y banco sanitizados antes de escritura real. |

---

## 6. Riesgos abiertos

| Riesgo | Nivel | Mitigacion |
|---|---|---|
| Workflow sin resultado visible aun | Medio | Revisar Actions antes de merge/deploy. |
| Wire runtime puede depender del orden de carga | Medio | Smoke y validacion visual del hub Importar. |
| Colecciones nuevas sin vista UI completa | Medio | Crear bandejas/tableros P1/Claude. |
| Datos reales aun no escritos | Bajo | Correcto por seguridad; requiere dry-run y confirmacion. |
| `core/importa.js` mantiene logica legacy interna | Medio | Wires redirigen; futuro refactor controlado si smokes pasan. |

---

## 7. Criterios de cierre P0 antes de implementacion empresarial

P0 solo puede considerarse listo para uso controlado cuando:

1. Smokes P0 pasan.
2. No hay errores de sintaxis JS.
3. No se tocaron archivos protegidos.
4. No se mezclan primas pendientes con CxC financiera.
5. No se crean finmovs desde banco sin confirmacion.
6. No se marcan cobros/pagos sin conciliacion.
7. Importador muestra dry-run antes de escritura.
8. Escritura real queda condicionada a confirmacion humana.
9. Datos reales se cargan por fuente separada.
10. UI cliente no muestra terminos tecnicos internos ni fuente legacy por nombre.

---

## 8. Siguiente plan inmediato

### P0.1 — Validacion

- Revisar status de GitHub Actions.
- Corregir smokes si fallan.
- Validar orden de carga de `modules/importar.js`.

### P0.2 — Tablero operativo minimo

Crear/ajustar vista para ver:

- polizas importadas con validacion;
- recibos esperados;
- cartera primas;
- conciliaciones primas;
- comisiones devengadas;
- facturas comision;
- CxC comisiones;
- conciliacion bancaria;
- CxP asesores.

### P0.3 — Dry-run real sanitizado

Fuentes sugeridas:

- `Polizas (11).xlsx`;
- estados de cuenta aseguradoras;
- planillas y facturas de comision;
- estados bancarios.

No escribir datos reales hasta confirmar dry-run.

---

## 9. Pendientes P1 / Claude

### Claude / UX / Academia

- Bandejas visuales para validacion de importadores.
- Tablero ejecutivo de cartera por pais/moneda/aseguradora/aging.
- Tablero de comisiones y facturas.
- Flujo de aprobacion de pago asesor.
- Academia profunda por rol:
  - importadores;
  - calidad de datos;
  - cartera de primas vs CxC;
  - conciliacion bancaria;
  - liquidacion de asesores;
  - seguridad y confirmaciones.

### Backend / Codex

- Integrar motores P0 de forma nativa si el wire pasa smoke.
- Agregar validadores de colecciones nuevas.
- Agregar reglas de auditoria antes/despues.
- Agregar gates de permisos por rol/scope.
- Preparar escritura controlada por `Orbit.store`.

### Datos reales / migracion

- Ejecutar dry-run por fuente separada.
- Registrar trazabilidad archivo/hoja/fila/bloque/pais/moneda/periodo.
- Bloquear escritura cuando falte pais/moneda/forma pago/llave.
- Confirmar excepciones de formas de pago por aseguradora.

---

## 10. Accion manual

No requerida en este momento.

Accion manual sera indispensable solo para:

- smoke local visual si GitHub Actions no da resultado suficiente;
- validacion de UI en navegador;
- carga de fuentes reales desde equipo de Paula;
- autorizacion explicita de escritura real, merge o deploy.
