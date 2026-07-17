# Manifiesto de entrega — Orbit 360 v1.256.0

Fecha: 2026-07-17
Base: v1.255 (`Prototype Development Request - 2026-07-17T001643.602.zip`, SHA-256 `abb6bbe417e5d9a2172adfe1b4852045dd3579abf49a495ec4ef82ad81da34d4`)
Tipo: empalme **incremental** (no reconstrucción). Entrega = ZIP completo acumulado de `orbit360-platform/`.

## Archivos modificados en esta ronda
- `core/access-scope.js` — contrato unificado `Orbit.access` (wrapper `Orbit.accessScope` conservado sobre el mismo motor).
- `core/client-projection.js` — **nuevo**: `Orbit.clientProjection` (proyección canónica reusable de clientes).
- `core/integraciones.js` — copy del toast de prueba de conexión.
- `modules/aseguradoras.js` — estados de conocimiento canónicos + nota "Mapeado ≠ Validado ≠ Habilitado"; `Validado` habilita tarifas pero no Cotizador/Comparativo.
- `modules/cliente360.js` — `detalle()` usa `Orbit.clientProjection.project()`.
- `modules/configuracion.js` — copy honesto de Integraciones (validar parámetros no afirma conexión real).
- `data/academia-plus.js` — curso nuevo "Acceso, multirol, alcance y seguridad de datos"; `CONTENT_V` 29→30.
- `index.html` — carga de `core/client-projection.js` + cache-bust `?v2100` de los archivos anteriores.
- `README.md`, `CHANGELOG.md`, `docs/MANIFIESTO-ENTREGA-v1256.md` — versión unificada v1.256.

## Byte-idénticos respecto de v1.255 (no tocados)
`data/store.js`, `core/auth.js`, `core/importa.js`. Sin Firebase/Firestore, sin Auth real, sin reglas, sin secretos, sin datos A&S, sin loaders LAB, sin importaciones reales.

## Ledger de sincronización (CL-001 … CL-020)
| ID | Patrón | Estado |
|---|---|---|
| CL-001 | Router móvil propietario | INCORPORADO_Y_VALIDADO (conservado v1.255) |
| CL-002 | Gate legal idempotente | INCORPORADO_Y_VALIDADO (conservado v1.255) |
| CL-003 | Roles asignados e identidad | INCORPORADO — `Orbit.access` unificado |
| CL-004 | Scope fail-closed por registro/país | INCORPORADO_Y_VALIDADO (conservado + expuesto en `Orbit.access`) |
| CL-005 | Cliente 360 y mutaciones | INCORPORADO — proyección canónica añadida |
| CL-006 | Aseguradoras operativas | INCORPORADO — estados/UX reusable |
| CL-007 | `credentialRef` y revelación temporal | INCORPORADO_Y_VALIDADO |
| CL-008 | Plantilla Comparativo tenant/aseguradora | INCORPORADO_Y_VALIDADO |
| CL-009 | Scope en Comisiones | INCORPORADO_Y_VALIDADO |
| CL-010 | Equipo/permisos modernos | INCORPORADO — conectado al contrato `Orbit.access` |
| CL-011 | Copy "sin hardcode" | INCORPORADO_Y_VALIDADO |
| CL-012 | "Pendiente de backend" | INCORPORADO — comentario visible retirado; label honesto |
| CL-013 | "simulación LAB" | INCORPORADO — toast reemplazado |
| CL-014 | README v1.251 vs v1.255 | INCORPORADO — unificado a v1.256 |
| CL-015 | Evidencia 3 viewports/roles | DOCUMENTADO con limitación real (abajo) |
| CL-016 | Proyección canónica cliente | INCORPORADO — `core/client-projection.js` |
| CL-017 | Estados conocimiento aseguradora | INCORPORADO — canónicos + no equivalentes |
| CL-018 | PWA sin lógica operativa | CONSERVADO — no se reintrodujo lógica |
| CL-019 | Importador por tenant/dry-run | CONSERVADO — sin backend |
| CL-020 | Academia profunda alineada | INCORPORADO — curso nuevo + quiz |

## Evidencia (honesta)
Verificación en el entorno de construcción (viewport de escritorio):
- **Carga limpia**: `index.html` monta el shell, sidebar dinámico y router sin errores de consola con los scripts `?v2100`.
- **Dirección — escritorio**: navegación entre módulos, Cliente 360 (proyección aplicada), Aseguradoras (pestaña Tarifas muestra la nueva nota de estados), Academia (curso nuevo visible).
- **Contrato de acceso**: `Orbit.access.activeRole()`, `Orbit.access.can()` y `Orbit.access.canView()` resuelven sobre el mismo motor que `Orbit.accessScope`.

Limitación real declarada (no simular como ejecutado):
- Los escenarios **Operativo — tableta** y **Asesor — móvil** en 15 viewports exactos requieren DevTools/dispositivos del lado del usuario; no se capturaron pixel-perfect en este entorno. La lógica de rol/alcance es la misma en todos los viewports (mismo motor), pero la evidencia visual responsive queda pendiente del usuario.
