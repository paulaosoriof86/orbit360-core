# Avance Marketing UI + Integraciones · Orbit 360

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Base:** Claude v1.97  
**Archivo modificado:** `modules/marketing.js`

---

## 1. Avance aplicado

Se conectaron botones del módulo Marketing al helper seguro `Orbit.integraciones.emit(...)`.

Commit:

- `d03d5e1c0550703e6038eb2475288bcb944180fe` · `feat(marketing): emitir eventos de integracion seguros`

---

## 2. Eventos conectados

### Importar calendario

Al abrir el importador de calendario, registra evento:

- `marketing_sync_sheets`

Uso actual: trazabilidad segura. No importa desde Google Sheets real todavía.

### Crear pieza Canva

El botón `Crear pieza (Canva)` ahora registra:

- `marketing_generar_pieza`

Si Canva/Make no está configurado, queda como `pendiente_configuracion` en `eventosIntegracion` y muestra mensaje de configuración pendiente.

### Programar Metricool

El botón `Programar (Metricool)` ahora registra:

- `marketing_programar_publicacion`

Marca estado visual como `Programado`, pero no publica realmente. El evento queda trazado para Make/Metricool cuando la integración esté activa.

### Guardar contenido nuevo

Al crear un contenido nuevo, registra:

- `marketing_contenido_creado`

---

## 3. Seguridad

- No hay llamados reales a APIs externas.
- No hay webhooks reales.
- No hay secretos.
- No se toca producción.
- No se escribe Firestore real salvo que LAB esté activo y autorizado por la capa backend.
- Se usa `Orbit.store` y `Orbit.integraciones`.
- No se usa `localStorage` desde el módulo.

---

## 4. Pendiente para Claude

Claude debe incorporar esta lógica en la próxima versión del prototipo para no perder el avance:

1. Mantener botones conectados a `Orbit.integraciones.emit(...)`.
2. Agregar UI visible de estado de integración por contenido:
   - pendiente configuración,
   - pendiente envío,
   - confirmado,
   - error.
3. Mostrar historial de eventos por contenido.
4. Incluir enlaces de Canva/Drive/Metricool cuando existan.
5. No volver a dejar botones únicamente como `toast` sin trazabilidad.

---

## 5. Estado

**RESUELTO EN BACKEND BRANCH / PENDIENTE CLAUDE PARA UX COMPLETA.**

El módulo ya emite eventos seguros. Falta que Claude mejore la experiencia visual alrededor de esos eventos y que backend active Make/Metricool/Canva con configuración segura por tenant.
