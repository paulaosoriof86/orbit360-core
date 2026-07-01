# Pendiente para Claude - limpieza de localStorage en modulos

- Fecha local: 2026-07-01 02:42:41
- Fuente: auditoria del ZIP Claude v1.55 integrado sobre Orbit 360.
- Alcance: SOLO prototipo base, UX/core funcional y limpieza de arquitectura frontend.
- NO tocar backend LAB, Firebase, Firestore, reglas, Auth real ni scripts locales *.local.js.

## Hallazgo

El prototipo actualizado v1.55 integra mejoras funcionales relevantes, pero todavia hay modulos que hacen uso directo de localStorage.

## Regla de arquitectura

Los modulos funcionales no deben depender directamente de almacenamiento del navegador. Deben usar Orbit.store, Orbit.tenant, Orbit.cat o helpers de core.

## Modulos a revisar

- modules/automatizaciones.js
- modules/configuracion.js
- modules/cotizador.js
- modules/ia.js
- modules/notificaciones.js
- modules/plantillas.js

## Pedido para proxima version Claude

1. Buscar todo uso directo de localStorage dentro de modules.
2. Mover persistencia de datos funcionales a Orbit.store.
3. Si alguna preferencia local/demo debe quedar en navegador, moverla a un helper de core y documentarla como preferencia local.
4. No romper modulos ya mejorados en v1.55.
5. No tocar index-dev-firestore.html, scripts *.local.js ni docs backend LAB.

## Criterio de exito

- modules no contiene dependencias directas a localStorage para datos funcionales.
- La demo sigue funcionando con datos ficticios.
- El backend LAB sigue preservado.
- No se introducen notas tecnicas visibles para usuario final.
