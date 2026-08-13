# Avance Diagnóstico de Integraciones · Orbit 360

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Archivo modificado:** `core/integraciones.js`

---

## 1. Avance aplicado

Se agregó diagnóstico interno a `Orbit.integraciones` para consultar eventos registrados sin depender de Make real.

Commit:

- `6d7e6703735cb7c0766a595cdc35545f8a73ba32` · `feat(integraciones): agregar diagnostico de eventos`

Versión del helper:

- `v0.3-diagnostico-eventos`

---

## 2. API disponible

Además de `emit`, `status` y `mark`, ahora existen:

- `Orbit.integraciones.list(filter)`
- `Orbit.integraciones.resumen()`
- `Orbit.integraciones.diagnostico(filter)`

---

## 3. Uso esperado

### Ver estado rápido

`Orbit.integraciones.status()`

Devuelve:

- versión del helper,
- tenant,
- número de eventos,
- pendientes,
- errores.

### Ver resumen completo

`Orbit.integraciones.resumen()`

Agrupa por:

- estado,
- proveedor,
- evento,
- módulo.

### Ver eventos filtrados

`Orbit.integraciones.list({ modulo: 'marketing', limit: 25 })`

Filtros soportados:

- `modulo`
- `evento`
- `proveedor`
- `estado`
- `entidad`
- `entidadId`
- `limit`

---

## 4. Seguridad

- No llama APIs externas.
- No envía webhooks.
- No muestra secretos.
- Redacta campos sensibles.
- Solo lee/escribe vía `Orbit.store`.
- No toca producción.

---

## 5. Pendiente para Claude

Claude debe convertir este diagnóstico en UI visible dentro de Automatizaciones/Integraciones:

1. Panel “Eventos de integración”.
2. KPIs: total, pendientes, pendiente configuración, errores.
3. Tabla últimos eventos.
4. Filtros por módulo, proveedor, evento y estado.
5. Acceso desde ficha de Marketing para ver historial por contenido.
6. Estados visuales:
   - pendiente configuración,
   - pendiente,
   - confirmado,
   - error.

---

## 6. Estado

**RESUELTO EN CORE / PENDIENTE UX CLAUDE.**

La trazabilidad ya existe en la capa core. Falta representación visual en módulo de Automatizaciones/Configuración.
