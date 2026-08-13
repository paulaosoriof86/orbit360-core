# Avance Integraciones Core · Orbit 360

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Base:** Claude v1.97

---

## 1. Avance aplicado

Se agregó el helper global:

- `core/integraciones.js`

Commit:

- `def19ea93d3ee63f45465b7aed2334c0db8af6a2` · `feat(integraciones): agregar helper seguro de eventos`

El helper expone:

- `Orbit.integraciones.emit(evento, payload, opts)`
- `Orbit.integraciones.status()`
- `Orbit.integraciones.mark(idEvento, patch)`

---

## 2. Carga en shell

Se actualizó `index.html` para cargar el helper antes de los módulos:

- `core/integraciones.js?v1295`

Commit:

- `6d3ea48d856977c961b616424d635fc7cad0c45b` · `feat(integraciones): cargar helper en shell`

También se actualizó el cache-bust de `core/auth.js` para evitar que navegador use una versión anterior.

---

## 3. Seguridad

El helper:

- no llama APIs externas,
- no envía webhooks reales,
- no guarda secretos,
- redacta campos sensibles,
- registra trazabilidad en `eventosIntegracion`,
- usa `Orbit.store`, no `localStorage`,
- funciona en demo/LAB como log seguro.

---

## 4. Uso previsto desde módulos

Marketing y otros módulos deben emitir eventos, no llamar proveedores directamente.

Eventos esperados para Marketing:

- `marketing_generar_pieza`
- `marketing_programar_publicacion`
- `marketing_sync_sheets`
- `marketing_campana_email`
- `marketing_whatsapp_broadcast`
- `marketing_metricas_actualizadas`

El backend/Make resolverá luego si se envía a Metricool, Canva, Google Sheets, Mailchimp, Outlook/Gmail o WhatsApp/Green API.

---

## 5. Pendiente para Claude

Claude debe actualizar botones de Marketing para usar este helper cuando exista:

- `Crear pieza (Canva)` debe emitir `marketing_generar_pieza`.
- `Programar (Metricool)` debe emitir `marketing_programar_publicacion`.
- `Importar/sincronizar Sheets` debe emitir `marketing_sync_sheets`.

Con fallback demo visible si el helper no existe.

Este cambio ya está registrado en:

- `docs/MEJORAS-CHATGPT-PARA-CLAUDE-POST-V197-20260703.md`

---

## 6. Estado

**RESUELTO EN BACKEND BRANCH / PENDIENTE CLAUDE PARA UI.**

El helper está disponible para que los módulos de la próxima iteración lo usen sin acoplarse a proveedores externos.
