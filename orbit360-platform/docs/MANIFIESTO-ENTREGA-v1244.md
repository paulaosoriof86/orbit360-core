# Manifiesto de entrega — Orbit 360 v1.244

Fecha: 2026-07-13 · Base: v1.243 (auditada) → v1.244 (esta entrega).

## Conservado sin tocar
`data/store.js`, `core/auth.js`, `core/importa.js` — byte-idénticos. Todos los cierres v1.224–v1.243 (access-scope, ficha-página Cliente360/Póliza, vault 15s, scope Ops/Leads, Comparativo con línea de tiempo/plantilla/ponderación, Academia con deltas).

## Nuevo en v1.244
- `core/config.js`: `rolesAsignados()` fail-closed real (registro sin roles/rol → `[]`, deniega); `dataScope()` lee modelo moderno `dataScopes.modules/default` con alias own/team/all/none.
- `core/access-scope.js`: `filtrarPorAsesor()` ya no incluye registros sin asesor asignado en scope propia/equipo; `puedeVerModulo()` nuevo (base rol + modulesExtra − modulesRestricted).
- `core/router.js`: sidebar y guard de ruta usan `puedeVerModulo()`.
- `modules/aseguradoras.js`: Finanzas removido de credenciales de plataformas; bancos sin restricción por usuario (regla de negocio: operativos, no secretos).
- `modules/equipo.js`: checkbox de restricción bancaria retirado.
- `core/credential-vault.js`: proveedor por defecto ya no revela el `credentialRef` como secreto — devuelve `null` salvo fixture explícita `ficticio-*`.
- `data/academia-plus.js` (`CONTENT_V`→29): lección de solo-lectura ya no enumera nombres técnicos literales.

## Pendiente honesto (no alcanzado por límite de sesión)
- Gates de scope en acciones/mutaciones directas (fichas por ID, validar/aplicar cobro, endosos, `openNegocio`/`setEtapa` de Ops-Leads) — el scope protege listas/KPIs/detalle de Cliente360, no toda acción directa todavía.
- Confirmación reforzada ampliada a más casos de ampliación de acceso (rol privilegiado, país, retirar restricción, reactivar membresía).
- Comparativo: criterios configurables por tenant (hoy solo ponderación), orden de secciones, override por aseguradora, persistencia inmediata de replanteos.
- Evidencia responsive reproducible en 15 escenarios de Aseguradoras (1366/768/390).
- Auditoría de vault: falta tipo de dato, resultado del proveedor, distinción intento/denegación/revelación/copia.

Ver `CHANGELOG.md` para el detalle línea por línea de cada versión v1.224–v1.244, con pruebas en vivo documentadas.
