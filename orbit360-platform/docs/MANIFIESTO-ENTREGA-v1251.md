# Manifiesto de entrega · v1.251

Candidata base: v1.250. Corrige los 8 P0 de `01_AUDITORIA-DELTA-V1250.md` (paquete crítico post-v1.250).

## Archivos modificados
- `core/access-scope.js` — fail-closed real (rolActivo/puedeVerModulo/dataScope), gate central `canAccessRecord()`, `puedeAccederRegistro()` como wrapper.
- `core/config.js` — `rolesAsignados()` sentinel `null` en bootstrap; `session.rol()` fail-closed cuando el store ya resolvió identidad inválida.
- `core/ciclo.js` — claves canónicas `ops`/`leads` en vez de `negocios`; gate en `crearGestion`/`solicitarGestion`/`nuevoNegocio`/`nuevaGestion`; sin default `ase001`.
- `modules/cobros.js` — `conciliarFactura`/`lote` filtran por alcance real.
- `modules/siniestros.js` — `nuevo()` restringe el selector de cliente al alcance.
- `modules/aseguradoras.js` — bancos completos (no enmascarados), usuario de plataforma vía vault.
- `data/seed.js` — números de cuenta ficticios completos.
- `core/credential-vault.js` — fixtures `ficticio-*` ya no devuelven el propio `credentialRef`.
- `modules/equipo.js` — motivo exacto + diff íntegro en la auditoría de ampliación de permisos.
- `index.html` — cache-busts.

## No tocado (protegidos)
`data/store.js`, `core/auth.js`, `core/importa.js` — byte-idénticos.

## Verificado en vivo
- App carga sin errores de consola tras cada tanda.
- `Orbit.accessScope.dataScope()`/`countries[]` probado en vivo en rondas previas (v1.249–v1.250); esta ronda reutiliza esos mismos hooks con el gate endurecido.

## Pendiente honesto
- `canAccessRecord` no se propagó a todas las mutaciones legacy de Finanzas/Comisiones.
- Override de plantilla del Comparativo por aseguradora individual.
- Evidencia de 15 escenarios responsive en viewports exactos (limitación del entorno).
