# Auditoría delta — candidata Claude v1.244

Fecha: 2026-07-13  
Candidata: `Prototype Development Request - 2026-07-13T232122.515.zip`  
SHA-256: `0430604dd3c279cb56e2bae40db41602e8d4135749136bcb74521243fbb51b16`

## Verificaciones

- 107 archivos; 58 JavaScript.
- `node --check`: 58/58 PASS.
- Delta frente a v1.243: 1 archivo añadido, 12 modificados, 0 eliminados.
- `data/store.js`, `core/auth.js` y `core/importa.js` byte-idénticos.
- Sin cambios en reglas, store LAB o loaders backend protegidos.
- Sin secretos literales nuevos detectados en el delta.
- Evidencia visual insuficiente: solo 909×540.

## Cierres aceptados — no repetir

1. Lectura de `dataScopes.modules/default` y alias own/team/all/none.
2. Registros sin asesor excluidos de own/team.
3. Router usa `puedeVerModulo()`.
4. Finanzas retirado de credenciales de plataformas.
5. Restricción bancaria individual retirada.
6. Proveedor default ya no devuelve referencias ordinarias como secreto.
7. README y manifiesto actualizados a v1.244.
8. Cierres v1.224–v1.243 preservados.

## P0 reproducidos

### Sesión/router todavía fail-open

- Desde un usuario Dirección válido, `Orbit.session.set('Dirección','missing')` retorna `true`, cambia a una identidad inexistente y conserva Dirección.
- Sin store, `rolesAsignados()` devuelve el rol persistido.
- Sin roles válidos, `normalizarRolActivo()` no invalida la sesión.
- `accessScope.rolActivo()` cae a Dirección ante error.
- `puedeVerModulo()` retorna `true` ante excepción.
- `session.canSee()` permite si el rol no existe.

### Modelo moderno no persistido

`modulesExtra`, `modulesRestricted` y `dataScopes` solo aparecen en el lector `core/access-scope.js`. Equipo sigue guardando `modulosOverride`, `dataScope`, `permisosExtra` y `restricciones`; el esquema leído no coincide con el escrito.

### Scope incompleto

Listas y KPIs mejoraron, pero detalles y mutaciones por ID siguen sin gate central: Pólizas, Cobros, Renovaciones, Siniestros, Cliente360 y acciones `setEtapa`, `decidirCierre`, `perder`, `archivar`, `emitir`, `openNegocio`, `openGestion`.

### Confirmación de permisos incompleta

Solo cubre pasar a `todo` o agregar permiso extra. Faltan rol privilegiado, propia→equipo, módulos/países, retirar restricciones, reactivar membresía y cambios del modelo moderno; falta motivo y diff integral.

### Bancos con permiso correcto pero flujo roto

La lectura bancaria ya no se restringe por usuario, pero `ctaRow()` continúa usando `Orbit.vault.field(c.numero)` y `Orbit.credentials.resolve(numeroCuenta)`. Con el seed actual `****1234`, el proveedor retorna `null`; Ver/Copiar termina en “Pendiente de conexión segura”. Las cuentas operativas deben usar un componente separado, con números completos ficticios visibles/copiables para todo usuario de Aseguradoras, sin vault de credenciales.

### Vault/credenciales incompletos

- `vault.field(valorReal)` conserva el valor durante render.
- `p.user` sigue viajando en el registro operativo.
- Fixture `ficticio-*` devuelve la propia referencia.
- No hay manejo completo de error/denegación.
- Auditoría no cubre intento, denegación, error, tipo, plataforma estable, motivo y resultado.
- `vault.isRestricted()` usa una decisión genérica basada solo en Asesor en vez de la política central.

### Documentación/copy

- CHANGELOG sigue fuera de orden.
- v1.243 afirma “datos reales” aunque usa seed/prototipo.
- `REPORTE-SMOKE.md` sigue siendo histórico v1.163, no evidencia actual reproducible.
- PENDIENTES omite los P0 anteriores.
- Academia aún contiene lenguaje de arquitectura interna en otra lección.

## P1 abierto

- Criterios del Comparativo por tenant.
- Ponderación auditada con motivo y before/after.
- Persistencia inmediata del replanteamiento.
- Orden de secciones y override por aseguradora.
- Evidencia 15 escenarios y 1366/768/390.

## Veredicto

**Aceptar como base incremental v1.244; no empalmar todavía.** La siguiente candidata debe ser v1.245+ y atender únicamente los residuos anteriores.

Paquete residual generado fuera del repo: `PAQUETE-RESIDUAL-EXCLUSIVO-CLAUDE-ORBIT360-POST-V1244-20260713.zip`, SHA-256 `580f4757cac70d249cb7e1f8518386841db49d1d661cbdf1b92877c82cc05290`.
