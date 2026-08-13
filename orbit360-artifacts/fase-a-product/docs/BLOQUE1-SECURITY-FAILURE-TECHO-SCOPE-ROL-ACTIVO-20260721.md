# Bloque 1 — Security failure: techo de scope del rol activo

Fecha: 2026-07-21  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate: `block1-client360-insurers-lab-v20260717`

## Clasificación

- `SECURITY_FAILURE`
- Código: `ACTIVE_ROLE_SCOPE_CEILING_NOT_ENFORCED`
- Clasificación Claude: `REPLICABLE_CLAUDE_INMEDIATO`
- Tenant-only: no
- Secretos o datos reales incluidos: no

## Necesidad

Orbit 360 permite que una misma persona tenga varios roles y cambie el rol activo. El alcance de datos debe corresponder al rol que está usando en ese momento, no al permiso más amplio que tenga en otra función.

Regla canónica:

```text
scope efectivo = configuración explícita más restrictiva ∩ techo del rol activo
```

Techos base:

```text
Dirección / Admin: all
Operativo / Finanzas / Marketing: team
Asesor / Comercial / Asistente: own
Rol desconocido: none
```

Una restricción más estrecha siempre prevalece. Por ejemplo, `none` nunca puede ampliarse por el rol.

## Evidencia runtime

Gate dirigido:

```text
Run: 29887445294
Artifact: 8517027180
Digest: sha256:2be51db2fdd721137a5cb9ac2b43be7f080d395e6845273a89e258268d55be0e
HEAD: 3947863597724873e97ba4f11c9b86c6f4ff2079
```

Avance confirmado antes del fallo:

```text
Dirección escritorio: PASS completo
Operativo tableta: PASS completo
Importador Operativo restringido: no modal y cero escritura
Menú Asesor móvil: PASS
Integridad remota: 9/9 activos exactos
```

Hallazgo en Asesor móvil:

```text
rol activo: Asesor
scope resuelto: all
actorAdvisorId: presente
clientes visibles: 414
```

El gate intentó posteriormente abrir Calidad porque el scope observado era `all`. El error visible de navegación era consecuencia del scope incorrecto, no la causa raíz. Saltar Calidad habría ocultado una fuga de acceso.

## Causa raíz

Archivo:

```text
orbit360-platform/core/access-scope.js
```

La función `dataScope(moduleKey)` resolvía primero `explicitScope(moduleKey)` desde el registro del asesor. Si encontraba `all`, lo devolvía directamente y no aplicaba el límite del rol activo.

En una cuenta multirol, el mismo registro puede contener un scope amplio válido para Dirección. Al cambiar el rol activo a Asesor, ese valor seguía prevaleciendo.

Secuencia defectuosa:

```text
scope explícito all
→ retorno inmediato
→ rol activo Asesor no consultado
→ 414 clientes visibles
```

## Corrección

Archivo funcional:

```text
orbit360-platform/core/access-scope.js
```

Contrato nuevo:

```text
active-role-scope-ceiling-v1
```

Funciones añadidas al owner existente:

- `scopeLevel(scope)`
- `roleScopeCeiling(moduleKey)`
- `applyRoleScopeCeiling(requestedScope, moduleKey)`

La función `dataScope` ahora:

1. valida rol asignado y estado activo;
2. obtiene el scope explícito del usuario;
3. obtiene el techo del rol activo o el scope más restrictivo declarado para ese módulo;
4. devuelve siempre el scope de menor amplitud;
5. cierra en `none` para roles desconocidos.

No se creó otro owner, bridge ni matriz paralela. Se conserva la API existente de `Orbit.access` y `Orbit.accessScope`.

## Contrato estático

Archivo:

```text
orbit360-platform/tools/orbit360-access-active-role-scope-contract-v20260721.js
```

Escenarios obligatorios:

```text
Dirección + explícito all → all
Operativo + explícito all → team
Asesor + explícito all → own
Asesor + explícito team → own
Dirección + explícito own → own
Cualquier rol + explícito none → none
Scope por módulo más restrictivo → prevalece
Rol desconocido → none
```

También verifica que Asesor vea únicamente su cliente propio y que la prueba no ejecute escrituras.

La prueba está integrada en:

```text
orbit360-platform/tools/orbit360-block0-architecture-gate-v20260717.js
```

Por tanto, el preflight de arquitectura no puede aprobar si el techo del rol activo vuelve a desaparecer.

## Impacto en Academia

Academia M1 se actualiza a contenido `1.226` con la regla:

> En una cuenta multirol, cambiar a Asesor también cambia el alcance efectivo. Un scope amplio de Dirección nunca se hereda al activar Asesor.

Incluye evaluación sobre:

- Dirección `all`;
- Operativo `team`;
- Asesor `own`;
- restricciones `none` que siempre prevalecen.

## Alcance preservado

```text
Datos de usuarios modificados: 0
Matriz tenant modificada: 0
Clientes reasignados: 0
Reimportaciones: 0
Escrituras operativas: 0
Functions/Rules: no
Producción: intacta
```

Inventario preservado:

```text
Clientes: 414
Aseguradoras: 26
Asesores: 7
Referencias históricas: 91
Credenciales: 26
Colombia: intacta
```

## Estado

```text
Fix funcional: implementado
Prueba contractual: creada e integrada
Academia: actualizada
Preflight estático: pendiente
Gate runtime: bloqueado
Visualización: aún no autorizada
```

## Siguiente acción exacta

Actualizar el registro contractual del gate a `1.0.36`, ejecutar un único preflight estático y aceptar solo:

- `GO_GATE_CONTRACT`;
- arquitectura `GO_STATIC_ARCHITECTURE`;
- prueba de scope activo `PASS`;
- Asesor `own`;
- Operativo `team`;
- `none` prevalece;
- cero escrituras, secrets, navegador, Firestore, bóveda o deploy.

Solo evidencia estática `ok:true` podrá autorizar un único gate dirigido posterior.
