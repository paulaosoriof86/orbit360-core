# Paquete Claude actualizado post auditoría — Orbit 360 A&S

**Fecha:** 2026-07-04  
**Candidata auditada:** `Prototype Development Request - 2026-07-04T152321.882.zip`  
**Rama backend activa:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge, sin deploy  
**Uso:** paquete de continuidad para Claude antes de pedir nuevo candidato.

---

## 1. Fuente base

Claude debe continuar sobre la candidata activa auditada, no sobre una versión anterior.

Documentos que debe leer:

- `DOCUMENTO-MAESTRO-CONSOLIDADO-ORBIT360-AYS-20260704.md`.
- `ADENDUM-ACADEMIA-PROFUNDA-INTERACTIVA-ORBIT360-AYS-20260704.md`.
- `orbit360-platform/docs/AUDITORIA-FORENSE-CANDIDATO-ACTIVO-CLAUDE-20260704-152321.md`.
- `orbit360-platform/docs/CONTRATO-POLIZAS-RECIBOS-CARTERA-CONCILIACION-AYS-20260704.md`.
- `orbit360-platform/docs/NOTA-PARA-CLAUDE-AVANCES-BACKEND-MIENTRAS-CORRIGE-CANDIDATO-20260704.md`.

---

## 2. Avances del candidato activo que se deben conservar

### Importador

- Fuentes separadas.
- País/moneda sin default operativo peligroso.
- Trazabilidad por hoja, fila, bloque, periodo, país y moneda.
- Exclusión de hojas soporte.
- Estado bancario hacia `conciliacionBanco`.
- Documentos hacia `parchesPendientes`.
- `financiero-historico` separado de cobros/cartera.
- `planillas-comision` como fuente real con esperada vs pagada.
- Alcance por fuente (`SCOPE`).
- Dry-run y reporte.

### Integraciones/Marketing

- `core/integraciones.js`.
- `core/integraciones-panel.js`.
- `core/integraciones-lab-mock.js` solo como prueba interna.
- `modules/marketing.js` con eventos trazables.
- `tools/orbit360-validate-marketing-integraciones.mjs`.

### Academia

- `data/academia-plus.js`.
- Avances v1.118-v1.123.
- Rutas por rol y cursos profundos.
- Mejoras de legibilidad.

---

## 3. Pendientes P0 para el próximo candidato

### P0-01 — Versionado/documentación

Unificar nomenclatura:

- auditoría post-fix menciona v1.114;
- smoke menciona v1.117;
- bitácora llega a v1.123;
- pendientes todavía menciona v1.114.

Recomendado:

```txt
Candidata activa: 2026-07-04T152321.882
Base frontend congelada: v1.117
Avances Academia acumulados: v1.118-v1.123
```

### P0-02 — Moneda fija en vistas agregadas

Corregir `GTQ` fijo en KPIs/totales de:

- Pólizas;
- Cobros;
- Comisiones;
- Finanzas;
- Cliente360;
- Inicio;
- Insights;
- Reportes;
- Equipo;
- Cancelaciones.

Regla: usar moneda del país activo o separar tarjetas por país.

### P0-03 — Pólizas con desglose visible

Pólizas debe mostrar:

- prima neta;
- gastos;
- IVA/impuestos;
- prima total;
- frecuencia;
- forma de pago;
- recibos generados;
- fuente de importación;
- estado de validación.

### P0-04 — Estados históricos completos

Incluir en filtros/vistas:

```txt
Vigente
Por renovar
Cancelada
Vencida
Anulada
Rechazada
```

Solo `Vigente` y `Por renovar` generan cartera.

### P0-05 — Portal/Cliente360/Cobros con validación clara

Estados visibles esperados:

```txt
Pendiente
Vencido
Reportado por cliente
En revisión
Pagado
Conciliado
Anulado
Requiere validación
Bloqueado
```

El cliente reporta pago; el equipo valida. Portal no debe indicar pago aplicado si solo fue reportado.

### P0-06 — Conciliación como propuesta validable

Conciliación debe mostrar coincidencia por:

```txt
póliza + recibo/cuota + cliente + aseguradora + país + moneda + periodo + monto
```

Estados mínimos:

```txt
encontrado exacto
probable
requiere validación
recibo faltante
pago confirmado no aplicado
diferencia de monto
país/moneda inconsistente
bloqueado
```

### P0-07 — Planillas de comisiones

Debe distinguir:

- comisión esperada;
- comisión pagada;
- diferencia;
- retención;
- ajuste;
- periodo;
- aseguradora;
- asesor;
- póliza/recibo asociado.

Junio y julio 2026 deben tratarse como caso de migración, no como lógica productiva fija.

### P0-08 — Textos técnicos por rol

Revisar que los textos internos solo estén en roles Dirección/Admin/IT:

- capacitación técnica interna;
- panel de prueba de integraciones;
- configuración de conexiones;
- automatizaciones técnicas.

Cliente final y roles comerciales no deben ver notas internas.

---

## 4. Pendientes P1

1. Vista de conciliación por aseguradora y periodo.
2. Reportes exportables de cartera, recibos, conciliación y comisiones por país/moneda.
3. Portal Cliente con soportes y facturas visibles.
4. Cliente360 con trazabilidad completa de importación.
5. Academia con evaluación aplicada sobre pólizas, cobros, planillas, soportes y Portal.
6. Finanzas con separación clara entre caja real, cartera, recaudos, comisiones por cobrar y comisiones por liquidar.
7. Estado honesto de integraciones hasta conexión real.
8. Smoke visual por lotes y revisión de textos visibles por rol.

---

## 5. Archivos a revisar por Claude

```txt
core/importa.js
core/primas.js
core/queries.js
core/comisiones-eng.js
core/integraciones.js
core/notify.js
modules/importar.js
modules/polizas.js
modules/cobros.js
modules/cliente360.js
modules/portal.js
modules/comisiones.js
modules/finanzas.js
modules/notificaciones.js
modules/academia.js
modules/reportes.js
modules/insights.js
data/academia-plus.js
data/seed.js
README.md
CHANGELOG.md
docs/BITACORA-CAMBIOS.md
docs/PENDIENTES-Y-MEJORAS.md
docs/REPORTE-SMOKE.md
```

---

## 6. Criterio de entrega del próximo candidato

Claude debe entregar:

- ZIP completo de `orbit360-platform/`.
- Inventario de archivos modificados.
- Resumen de mejoras cerradas.
- Pendientes abiertos actualizados.
- Bitácora y changelog alineados.
- Smoke visual por rutas críticas.
- Confirmación de que no incluyó datos reales.
- Confirmación de que respeta fuentes separadas.
- Confirmación de que país/moneda no se asumen en escrituras.

---

## 7. Regla para ChatGPT/Codex al recibir el siguiente candidato

- No aceptar resumen sin auditar archivos reales.
- Extraer inventario.
- Comparar contra esta candidata activa.
- Revisar `index.html`, `core/`, `modules/`, `data/seed.js`, `docs/`.
- Validar sintaxis JS.
- Buscar textos técnicos visibles.
- Revisar importador, país/moneda, pólizas, cobros, Cliente360, Portal, comisiones, finanzas, notificaciones y Academia.
- Actualizar pendientes Claude/backend.
- Empalmar solo con pipeline seguro y sin pisar backend protegido.
