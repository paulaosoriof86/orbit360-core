# Avance Panel Diagnóstico de Integraciones · Orbit 360

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Base:** Claude v1.97

---

## 1. Objetivo

Agregar una forma visual y segura de revisar eventos de integración registrados por Marketing/Make/Metricool/Canva/Sheets, sin activar APIs reales ni webhooks.

---

## 2. Decisión de seguridad

No se modificó todavía `modules/automatizaciones.js` porque el archivo presenta señales de codificación dañada/mojibake en textos visibles. Reemplazarlo completo ahora aumenta riesgo de regresión visual.

Primero se creó un panel reutilizable desde `core`, para que Claude lo incorpore después en la pantalla final de Automatizaciones/Configuración.

---

## 3. Archivos y commits

### Panel reutilizable

Archivo nuevo:

- `core/integraciones-panel.js`

Commit:

- `b964e498d7e8b4dd7054ae6d29bdaa813f8ef97d` · `feat(integraciones): agregar panel diagnostico reutilizable`

### Carga bajo demanda desde helper existente

Archivo actualizado:

- `core/integraciones.js`

Commit:

- `795776c7766a355c60b9400ed48d756d0296cf26` · `feat(integraciones): cargar panel diagnostico bajo demanda`

---

## 4. API disponible

El panel se puede abrir con:

- `Orbit.integraciones.openPanel()`
- `Orbit.integraciones.openPanel({ modulo: 'marketing' })`
- `Orbit.integraciones.openPanel({ proveedor: 'metricool' })`
- `Orbit.integraciones.openPanel({ estado: 'pendiente_configuracion' })`

El helper carga `core/integraciones-panel.js` bajo demanda. No requiere modificar `index.html`.

---

## 5. Qué muestra el panel

- KPIs de eventos totales.
- Pendientes.
- Errores.
- Pendientes de configuración.
- Filtros por módulo, proveedor, estado y evento.
- Tabla de últimos eventos.
- Entidad relacionada.
- Error/resumen cuando la integración no está configurada.

---

## 6. Seguridad

- No llama APIs externas.
- No envía webhooks.
- No usa secretos.
- No toca producción.
- Lee eventos desde `Orbit.integraciones.diagnostico()`.
- Mantiene `Orbit.store` como capa única.

---

## 7. Pendiente para Claude

Claude debe incorporar el panel visual dentro de Automatizaciones/Integraciones:

1. Agregar botón “Ver eventos de integración”.
2. Al hacer clic, llamar `Orbit.integraciones.openPanel()`.
3. Desde Marketing, permitir abrir historial del contenido con `Orbit.integraciones.openPanel({ modulo: 'marketing', entidad: 'contenidos', entidadId: contenido.id })`.
4. Corregir textos mojibake del módulo Automatizaciones.
5. Mantener el panel como diagnóstico seguro hasta que backend/Make estén configurados por tenant.

---

## 8. Nota técnica de proceso

Se intentó cargar el panel directamente desde `index.html`, pero la herramienta bloqueó el reemplazo completo del archivo. Se cambió a una ruta más segura: carga bajo demanda desde `core/integraciones.js`, que ya está cargado por el shell.

---

## 9. Estado

**RESUELTO EN CORE / PENDIENTE INTEGRACIÓN UX CLAUDE.**

El panel ya existe y puede abrirse desde el helper. Falta exponerlo con botón en Automatizaciones y Marketing cuando Claude actualice la UI.
