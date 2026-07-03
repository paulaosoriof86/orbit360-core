# Pendiente Claude · Configuración de Integraciones UI

**Fecha:** 2026-07-03  
**Base:** Claude v1.97

---

## Objetivo

La configuración de integraciones debe aplicar a todo el tenant/equipo, no solo al navegador local.

---

## Contrato a conservar

El frontend debe usar:

```js
Orbit.integraciones.configurar(...)
```

Este contrato ya existe en `core/integraciones.js`.

---

## UI requerida

Claude debe ajustar Configuración para mostrar estados claros:

- pendiente de configuración;
- pendiente backend;
- conectado;
- error;
- desactivado.

---

## Reglas

- No presentar LAB como conexión real.
- No dejar botones solo con toast.
- No guardar configuración tenant-wide como preferencia local.
- Mantener todo por tenant.

---

## Estado

**ABIERTO PARA CLAUDE.**
