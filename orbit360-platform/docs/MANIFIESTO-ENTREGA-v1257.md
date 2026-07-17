# Manifiesto de entrega — Orbit 360 v1.257.0

Fecha: 2026-07-17
Base: v1.256 (candidata `Prototype Development Request - 2026-07-17T010337.170.zip`, SHA-256 `c5b0291d63cfd228fa26448dd1f012c1e6b8d1a8e24137b77033c34e4e285d2c`).
Tipo: **corrección puntual incremental** de P0-01/P0-02/P0-03. No reconstrucción, no cambio de base, no auditoría general nueva.

## Archivos modificados
- `core/access-scope.js` — **reescrito**: motor único; `Orbit.access` contrato canónico completo (incluye deriveClientState, duplicateCandidates, prepareManual, audit, correction, scopedStore, withScope); `Orbit.accessScope` = alias sobre los mismos refs.
- `core/crmkit.js` — `clienteCell()` proyecta el cliente (cubre Pólizas/Cobros/celdas de cliente).
- `modules/cliente360.js` — `lista()` proyecta la colección antes de filtros/búsqueda/render.
- `modules/calidad.js` — `render()` y `campana()` proyectan cada cliente.
- `modules/aseguradoras.js` — `evaluarFuente()`/`resumenGrupos()`: gate default-deny real (solo habilitación explícita consume).
- `index.html` — cache-bust `?v2110` de los anteriores.
- `README.md`, `CHANGELOG.md`, `docs/MANIFIESTO-ENTREGA-v1257.md` — versión v1.257.
- `tools/orbit360-p0-tests.html` — **nuevo**: batería de pruebas P0 + matriz de estados + caso cliente-alias.

## Byte-idénticos (no tocados)
`data/store.js`, `core/auth.js`, `core/importa.js`. Sin backend, reglas, secretos, datos A&S ni loaders LAB.

## Checklist de cierre
- [x] Base v1.256 conservada; solo archivos necesarios modificados.
- [x] `Orbit.access` conserva TODAS las funciones obligatorias (22/22 verificadas).
- [x] `Orbit.accessScope` no es un segundo motor (delega a los mismos refs).
- [x] Módulos existentes sin pérdida de compatibilidad (misma superficie `accessScope.*`).
- [x] Proyección en lista/búsqueda/Calidad/Pólizas/Cobros.
- [x] Cliente alias de prueba pasa sin mutación.
- [x] Validado no habilita tarifas/reglas operativas.
- [x] Mapeado/Persistido no habilitan reglas.
- [x] Matriz de estados pasa (solo Habilitado para Cotizador/Comparativo consume).
- [x] Academia v1.256 y copy honesto conservados.
- [x] Router/Legal/PWA conservados.
- [x] `store.js`/`auth.js`/`importa.js` byte-idénticos.
- [x] 56/56 JS compilan sin error de sintaxis; 0 referencias faltantes de `index.html`.
- [x] README/CHANGELOG/manifiesto en v1.257 coherente.
- [x] ZIP completo entregado.

## Matriz de estados de conocimiento (Aseguradoras · default-deny)
| Estado | tarifas | reglas | presentación | cotizador | comparativo | grupoHabilitado |
|---|---|---|---|---|---|---|
| Documento recibido | no | no | no | no | no | no |
| Mapeado | no | no | no | no | no | no |
| Persistido | no | no | no | no | no | no |
| Requiere validación | no | no | no | no | no | no |
| Validado | no | no | no | no | no | no |
| Habilitado para Cotizador | sí | sí | no | sí | sí | sí |
| Habilitado para Comparativo | sí | sí | no | no | sí | sí |

(Verificado en vivo con `tools/orbit360-p0-tests.html` sobre la app real; presentación es auxiliar y nunca habilita el grupo.)

## Evidencia (honesta)
- Pruebas P0 automatizadas: **RESULTADO GLOBAL ✅ TODAS LAS PRUEBAS P0 PASAN** (superficie, CRM, proyección alias, matriz).
- `node --check` equivalente: 56/56 JS sin error de sintaxis, 0 referencias faltantes.
- Limitación declarada (no simular): evidencia visual responsive Operativo-tableta / Asesor-móvil en 15 viewports exactos requiere DevTools del usuario — CL-015 sigue abierto.
