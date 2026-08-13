# Auditoría delta — candidata Orbit 360 v1.233

Fecha: 2026-07-13  
Base comparada: candidata v1.215 auditada + paquete exclusivo post-v1.215 + avances reutilizables de rama posteriores.

## Verificaciones técnicas

- Archivos: 106.
- JavaScript: 58.
- `node --check`: 58/58 PASS.
- Archivos funcionales nuevos/cambiados frente a v1.215: 26 movimientos físicos — 10 añadidos, 8 movidos a legacy, 16 modificados.
- `data/store.js`, `core/auth.js`, `core/importa.js`: byte-idénticos a v1.215.
- No se encontraron secretos literales nuevos mediante barrido estático.

## Resultado por requisito anterior

| ID | Estado | Evidencia física | Residuo exacto |
|---|---|---|---|
| P0-CL-01 Source lock | PARCIAL | legacy v1.97 movido; CHANGELOG v1.224 | README sigue apuntando a v1.215; no existe manifiesto v1.233; CHANGELOG inicia v1.225 antes de v1.233; BITACORA/PENDIENTES siguen desactualizados. |
| P0-CL-02 Multirol/scope | PARCIAL | `core/access-scope.js`; seis módulos filtran `propia` | selector muestra todos los roles del catálogo; `Orbit.session.set()` acepta cualquiera y fija `ase001`; no hay rol default/activo por usuario; Equipo guarda `rol=roles[0]`; falta scope `ninguno`; extras/restricciones no son genéricos; no hay diff/motivo/confirmación al ampliar acceso; ruta hash directa no se bloquea. |
| P0-CL-03 CRM/Póliza/Portal | CERRADO CON DEPENDENCIA | Cliente360 y Póliza tienen ficha-página; visor documental; gestión de corrección; seis módulos scoped | No rediseñar. Solo heredar el cierre de sesión/ruta/team/none de P0-RES-02. |
| P0-CL-04 Aseguradoras OP2 | PARCIAL | ficha por pestañas; Plataformas/Bancos/Documentos/Tarifas; vault 15s con key estable | Operativo y Asesor no tienen `aseguradoras` en módulos base; el router permite entrar por hash aunque no esté en menú; `p.user` se renderiza en claro; vault recibe el valor desde store en memoria, sin proveedor temporal ni auditoría; permisos de plataforma y bancos están mezclados; Asesor no puede ejecutar los escenarios requeridos. |
| P0-CL-05 Academia | PARCIAL AVANZADO | cursos existentes; lección dataScope; lección bóveda 15s | No duplicar cursos. Agregar solo rol default/activo/extras/restricciones, acceso ampliado, permisos separados de bancos/plataformas y nuevos patrones financiero-histórico/read-only. |
| P1-CL-06 Comparativo | PARCIAL | gates validados; historial snapshot; criterios precio/cobertura/equilibrio; impresión individual | cambiar criterio solo re-renderiza: no registra evento, razón ni antes/después; historial no reúne validaciones/replanteamientos/decisión en una línea temporal; impresión individual es genérica, no plantilla configurable por tenant/aseguradora. |
| P1-CL-07 Ops/Leads | CASI CERRADO | `issuance_request`; endoso con diff; kanban/cadencias existentes | no crear otra colección. Aplicar rol activo/scope `own/team/all/none` y guard de ruta a Ops/Leads/ciclo. |
| P1-CL-08 Responsive | ABIERTO | solo existe una evidencia de Directorio, 909×540 | faltan escenarios 1366/768/390, 15/15 Aseguradoras, foco/teclado/overflow y reporte actual v1.234+. |

## Fallas P0 demostradas por código

1. `index.html` llena el selector con `Object.keys(Orbit.ROLES)` y cambia a cualquier rol.
2. `core/config.js` persiste un único `d.rol`; no valida roles asignados ni rol default.
3. `modules/equipo.js` guarda `rol: rolesFinal[0]`; no configura default/activo ni `ninguno`.
4. `core/router.js` oculta enlaces, pero `render()` no rechaza una ruta no autorizada por hash.
5. `Orbit.ROLES.Operativo` y `Orbit.ROLES.Asesor` no incluyen Aseguradoras.
6. `modules/aseguradoras.js` imprime `Usuario: ${p.user}` para cualquier rol que entre a la ficha.
7. `core/credential-vault.js` conserva el valor recibido en un objeto de memoria y no produce auditLog de ver/copy.
8. `docs/PENDIENTES-Y-MEJORAS.md` todavía afirma que solo P0-CL-01 fue resuelto.

## Veredicto

La candidata contiene avance real y debe convertirse en la nueva base incremental **v1.233**. No debe rechazarse ni rehacerse. Requiere una corrección residual focalizada antes del empalme definitivo.
