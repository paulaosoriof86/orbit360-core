# GATE FASE 8 - Firestore LAB v1.73

Fecha: 2026-07-01 19:40 local
Estado: COMPLETADO.

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

## Resultado smoke local

Después de `git pull`, Fase 7D validó:

- `window.Orbit`: true.
- `Orbit.store`: true.
- API expandida completa: true.
- `pref/setPref` roundtrip: true.
- `backendMode`: `firestore-lab`.
- `backendTenant`: `alianzas-soluciones`.
- Sin errores JS globales.
- Resultado: `OK_CON_ADVERTENCIAS_SI_LAS_HAY`.
- Rama local limpia después del smoke.

## Observación UX para Claude

El smoke sigue mostrando mojibake visible en UI (`IngresÃ¡`, `sesiÃ³n`, `paÃ­ses`, símbolos/emoji dañados) y badges `BETA` visibles en sidebar. Esto queda fuera de backend y debe pasar al paquete Claude/prototipo visual.

## Restricciones cumplidas

- No deploy.
- No Hosting.
- No producción.
- No datos reales nuevos.
- No módulos tocados para Fase 8.
- No uso de `index-dev-firestore.html` como ruta central.

## Estado

COMPLETADO - listo para siguiente gate técnico.