# Acumulado Claude — patrón reusable Auth bootstrap + onboarding

Fecha: 2026-08-05  
Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

## Patrón

Separar siempre dos operaciones:

```text
BOOTSTRAP INICIAL PROTEGIDO
→ crea o vincula la primera administración real
→ no requiere sesión previa del producto

ONBOARDING NORMAL AUTOGESTIONABLE
→ requiere administración autenticada
→ opera desde Equipo para usuarios posteriores
```

## Antipatrón prohibido

```text
Crear primer administrador mediante una callable
que exige que ya exista un administrador autenticado
```

Esto produce dependencia circular.

## Estado durable de acceso

La UI reusable debe usar una máquina de estados:

- `configured`
- `provisioning`
- `invitation_pending`
- `active`
- `retryable_error`
- `blocked`

No inferir acceso desde la mera existencia del registro operativo.

## Contrato mínimo

```text
operationalUserRecord
+ authIdentity
+ tenantMembership
+ assignedRoles/defaultRole/activeRole
+ countries/dataScopes
```

## UX reusable

- separar “Guardar configuración” de “Crear/vincular acceso”;
- no presentar éxito antes del readback;
- mostrar error durable y siguiente acción;
- incluir “Olvidé mi contraseña”;
- ocultar capacidades backend no publicadas mediante readiness.

## Exclusiones

No contiene personas, correos, tenant, secretos, credenciales ni datos reales. El bootstrap/Admin SDK y Rules permanecen `BACKEND_PROTEGIDO_NO_CLAUDE`.
