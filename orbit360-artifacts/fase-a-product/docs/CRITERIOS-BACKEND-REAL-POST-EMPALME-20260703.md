# Criterios para pasar a backend real · Orbit 360

**Fecha:** 2026-07-03  
**Base:** Claude v1.97  
**Estado:** pendiente para después del próximo empalme Claude.

---

## Decisión

El backend real de integraciones no se activa antes del próximo empalme del prototipo.

Primero se debe recibir, auditar y empalmar la nueva versión visual para evitar construir sobre una UI que puede cambiar.

---

## Condiciones mínimas para iniciar backend real

Antes de conectar backend real deben cumplirse estas condiciones:

1. Nuevo ZIP Claude auditado.
2. Empalme realizado sin perder archivos backend protegidos.
3. `Orbit.store` conserva su API.
4. Auth LAB funciona sin mezcla demo/LAB.
5. `Orbit.integraciones.emit(...)` existe.
6. `Orbit.integraciones.configurar(...)` existe.
7. Marketing sigue emitiendo eventos trazables.
8. Configuración no guarda integraciones como estado local por navegador.
9. Panel de eventos sigue disponible.
10. Validador técnico ejecutado sin fallas críticas.
11. Smoke visual básico completado.

---

## Alcance del backend real

Cuando se active, el backend real debe cubrir:

- persistencia tenant-wide de integraciones;
- roles y permisos para configurar conexiones;
- referencias seguras para credenciales;
- eventos reales hacia Make;
- respuesta y estado de proveedor;
- historial por tenant;
- auditoría de cambios;
- separación total demo/LAB/producción.

---

## No incluido en esta fase

No activar todavía:

- producción real;
- datos reales;
- envíos reales por WhatsApp/correo;
- conexiones a proveedores finales sin validación previa;
- cambios destructivos en Firestore.

---

## Estado

**BACKEND REAL DIFERIDO HASTA POST-EMPALME.**
