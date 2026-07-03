# Plan backend real Integraciones · post-empalme

**Fecha:** 2026-07-03  
**Base:** Claude v1.97  
**Activación:** después del próximo empalme del prototipo.

---

## Objetivo

Convertir el contrato LAB de integraciones en backend real multi-tenant, sin tocar módulos funcionales.

---

## Principio técnico

Los módulos deben seguir usando:

```js
Orbit.integraciones.emit(...)
Orbit.integraciones.configurar(...)
```

El backend cambia por debajo. Marketing, Configuración y Automatizaciones no deben llamar proveedores externos directamente.

---

## Etapas

### Etapa 1 · Persistencia tenant-wide

Guardar configuración de integraciones por tenant, visible para todo el equipo autorizado.

Colección base:

- `integraciones`

Campos visibles:

- tenantId;
- proveedor;
- estado;
- eventos activos;
- módulos;
- scopes;
- última prueba;
- último error;
- referencia segura.

---

### Etapa 2 · Seguridad

Agregar control de roles:

- quién puede configurar;
- quién puede probar;
- quién puede activar/desactivar;
- quién solo puede ver estado.

Nunca exponer valores sensibles al frontend después de guardarlos.

---

### Etapa 3 · Make real

Convertir eventos `eventosIntegracion` en llamadas reales del backend hacia Make.

El frontend solo ve estado:

- pendiente;
- enviado;
- confirmado;
- error.

---

### Etapa 4 · Callbacks y auditoría

Registrar respuesta de Make/proveedor y actualizar el evento original.

Guardar historial por:

- tenant;
- proveedor;
- evento;
- entidad;
- usuario;
- fecha.

---

### Etapa 5 · UI final

Después de backend real:

- Configuración muestra conectado/desconectado;
- panel muestra eventos reales;
- Marketing muestra historial por contenido;
- Automatizaciones muestra salud de flujos.

---

## Dependencias previas

- nuevo prototipo Claude empalmado;
- Auth LAB estable;
- store estable;
- validador técnico OK;
- prueba visual local.

---

## Estado

**PLAN LISTO / EJECUCIÓN POST-EMPALME.**
