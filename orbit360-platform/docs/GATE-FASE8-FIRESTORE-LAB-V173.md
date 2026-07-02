# GATE FASE 8 - Firestore LAB v1.73

Fecha: 2026-07-01 19:36 local
Estado: PREPARADO EN GITHUB / pendiente smoke local corto.

## Objetivo

Preparar `data/store-firestore-lab.local.js` para Firestore LAB real por colecciones v1.73, sin tocar módulos funcionales.

## Cambio aplicado

Se reemplazó el hook LAB por una versión v1.73 con:

- API completa de `Orbit.store`: `all`, `get`, `where`, `find`, `insert`, `update`, `remove`, `on`, `_emit`, `pref`, `setPref`, `init`, `reseed`, `raw`.
- Cache sincrónico por colección para mantener compatibilidad con módulos existentes.
- `onSnapshot` por colección bajo ruta tenant-aware `tenantId/{tenant}/{collection}`.
- Preferencias por tenant en `tenantId/{tenant}/_prefs/orbit360`.
- Diagnóstico público `OrbitBackend.status()`.
- `ORBIT_LAB_COLLECTIONS` con colecciones base y extendidas v1.73.
- Sin fallback a seed/localStorage/demo como fuente de verdad cuando `orbitBackend=firestore-lab`.

## Colecciones v1.73 cubiertas

`clientes`, `polizas`, `cobros`, `comisiones`, `reclamos`, `gestiones`, `negocios`, `finmovs`, `contenidos`, `cursos`, `aseguradoras`, `asesores`, `vehiculos`, `acreedores`, `facturas`, `documentos`, `actividades`, `metas`, `presupuesto`, `plantillas`, `reportes_prog`, `notifs`, `avisos`, `correos`, `cancelaciones`, `novedades`, `tareas`.

## Criterio de cierre

Debe pasar smoke local corto después de `git pull`:

- `window.Orbit`: true.
- `Orbit.store`: true.
- API expandida completa: true.
- `pref/setPref` roundtrip: true.
- `backendMode`: `firestore-lab`.
- `backendTenant`: `alianzas-soluciones`.
- `OrbitBackend.collections.length`: 27.
- `OrbitBackend.apiVersion`: `v1.73-firestore-lab`.
- Sin errores JS globales.

## Restricciones

- No deploy.
- No Hosting.
- No producción.
- No datos reales nuevos.
- No módulos tocados.
- No uso de `index-dev-firestore.html` como ruta central.

## Pendiente local

Ejecutar `git pull` y smoke Fase 7D/Fase 8 corto para verificar runtime después del cambio directo en GitHub.

## Estado

PREPARADO - pendiente ejecución local.