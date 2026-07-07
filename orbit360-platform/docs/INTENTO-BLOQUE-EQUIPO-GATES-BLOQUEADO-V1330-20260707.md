# Intento bloque Equipo gates — bloqueado por conector v1330

Fecha: 2026-07-07
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open

## Objetivo

Cerrar funcionalmente gates mínimos en `modules/equipo.js` para:

- crear/editar usuario con confirmación cuando hay cambio sensible;
- pedir motivo en cambios de roles, módulos visibles o inactivación;
- impedir dejar el tenant sin Dirección/Admin activo;
- pedir confirmación para cambios de permisos;
- pedir motivo para permisos sensibles;
- registrar actividad administrativa;
- mantener copy honesto: usuario creado en equipo no equivale a invitación/Auth real enviada.

## Estado real

Se preparó archivo temporal completo de `equipo.js` con gates mínimos y se validó localmente:

- `node --check equipo_hotfix.js`: OK.

Sin embargo, al intentar reemplazar `orbit360-platform/modules/equipo.js` desde el conector GitHub, la llamada fue bloqueada por seguridad del conector.

Por lo tanto:

- no se aplicó cambio funcional en `modules/equipo.js`;
- no debe marcarse el bloque Equipo como cerrado;
- el patch queda preparado conceptualmente, pero pendiente de aplicación por entorno seguro.

## Estado pendiente

`modules/equipo.js` sigue pendiente funcional para:

- gates de usuarios;
- gates de roles;
- gates de permisos;
- bloqueo de último admin activo;
- reset de permisos con motivo;
- actividad/auditoría administrativa.

## Decisión metodológica

No se fuerza el cambio con otro método inseguro.
No se usa PowerShell largo pegado en consola.
No se marca como implementado sin evidencia remota.

## Recomendación de cierre

Aplicar este bloque cuando exista una de estas opciones:

1. Codex disponible.
2. Entorno local controlado con archivo `.ps1` o script validado, no bloque largo pegado.
3. Conector GitHub permita patch parcial o update completo sin bloqueo.

## Impacto Claude/prototipo

Claude debe conservar cuando entre:

- usuario creado no significa invitación enviada;
- cambio de rol o permisos requiere confirmación visible;
- no dejar tenant sin administrador;
- permisos sensibles requieren motivo;
- la matriz de permisos no es una preferencia simple.

## Impacto Academia

Academia debe incluir ruta Admin sobre:

- creación de usuarios;
- Auth pendiente;
- asignación de roles;
- permisos sensibles;
- riesgo de dejar tenant sin admin;
- registro de motivo de cambios administrativos.

## Estado

Documento de intento creado.
No se tocó código funcional de Equipo.
No se tocó backend protegido.
No se tocó `index.html`.
No merge.
No deploy.
No datos reales.
No secretos.
