# Manifiesto de entrega — Orbit 360 v1.258.0

Fecha: 2026-07-17
Base: v1.257 (candidata `Prototype Development Request - 2026-07-17T013205.678.zip`, SHA-256 `8a9c7f7f7111bc0e1a0d2f41a49e4bd7d869fedf774fc0117707990ed786d1ea`).
Tipo: **corrección semántica incremental** de P0-S1/P0-S2/P0-S3. No reconstrucción, no cambio de base, no auditoría general nueva.

## Archivos modificados
- `core/access-scope.js` — **reescrito**: contrato conductual completo (Auth+asesor, tenant/país/moneda, scopes modernos+legacy, permisos extra/restricciones/matriz, asesor derivado por cliente/póliza, 5 estados, alta manual con trazabilidad/calidad, `audit`/`correction`/`scopedStore`/`withScope` reales).
- `core/client-projection.js` — nuevo `get(id)` (lee del store y proyecta; nunca escribe).
- `modules/polizas.js` — helper `PC(id)` en búsquedas/detalles/lotes/mensajes/automatizaciones (11 puntos de lectura).
- `modules/cobros.js` — helper `PC(id)` idem (11 puntos de lectura).
- `modules/aseguradoras.js` — `habComp` ya no se infiere de `Habilitado para Cotizador` (gate separado).
- `index.html` — cache-bust `?v2120`/`?v2121` de los anteriores.
- `README.md`, `CHANGELOG.md`, `docs/MANIFIESTO-ENTREGA-v1258.md` — versión v1.258.
- `tools/orbit360-p0-tests.html` — **reemplazado** por batería conductual (53 aserciones, limpia registros temporales y restaura sesión/tenant).

## Byte-idénticos (no tocados)
`data/store.js`, `core/auth.js`, `core/importa.js`. Sin backend, reglas, secretos, datos A&S ni loaders LAB.

## Checklist de cierre
- [x] Base v1.257 conservada; solo archivos necesarios modificados.
- [x] P0-S1: `actorUser` combina Auth+asesor; tenant/país/moneda; scopes modernos+legacy; permisos extra/restricciones/matriz (restricción gana); asesor derivado por cliente/póliza; estados `activo_en_mora` y `reactivable`; alta manual con trazabilidad+calidad; `audit`/`correction`/`scopedStore`/`withScope` con conducta real (withScope restaura tras error).
- [x] P0-S2: proyección en búsquedas, detalles, lotes, mensajes y automatizaciones de Pólizas y Cobros (no solo `clienteCell`); store no mutado; sin relaciones inventadas.
- [x] P0-S3: Cotizador no habilita Comparativo y viceversa; cada consumidor requiere habilitación explícita.
- [x] Pruebas superficiales sustituidas por conductuales: **53/53 verde**.
- [x] Router/Legal/PWA/Academia/copy honesto/credenciales/permisos/documentación conservados.
- [x] `store.js`/`auth.js`/`importa.js` byte-idénticos.
- [x] 56/56 JS compilan sin error de sintaxis; 0 referencias faltantes.
- [x] README/CHANGELOG/manifiesto en v1.258 coherentes.
- [x] ZIP completo entregado.

## Evidencia (honesta)
- Batería conductual `tools/orbit360-p0-tests.html` sobre la app real: **RESULTADO GLOBAL ✅ TODAS LAS PRUEBAS CONDUCTUALES PASAN · 53 aserciones.** El iframe carga la última versión con cache-bust; los registros de prueba se insertan en memoria y se eliminan en `finally`, y se restauran sesión y tenant.
- `node --check` equivalente: 56/56 JS sin error de sintaxis, 0 referencias faltantes de `index.html`.
- Limitación declarada (no simular): evidencia visual responsive Operativo-tableta / Asesor-móvil en 15 viewports exactos requiere DevTools del usuario — CL-015 sigue abierto.
