# Academia Orbit 360 — Bootstrap inicial vs onboarding normal

Fecha: 2026-08-05

## Concepto central

Crear un registro en Equipo no equivale a crear una identidad autenticable.

El acceso real requiere:

```text
registro de Equipo
+ Firebase Auth
+ membership activa del tenant
+ roles/defaultRole/activeRole
+ países y scopes
```

## Bootstrap inicial

El bootstrap se usa cuando todavía no existe una administración real capaz de operar la plataforma.

Debe ejecutarse por un owner protegido de backend, mediante Admin SDK, roster aprobado, auditoría, idempotencia y rollback. No depende de una sesión iniciada dentro de Orbit.

## Onboarding normal

Después del bootstrap, Dirección/Admin puede crear, sincronizar, bloquear o reactivar usuarios desde Equipo mediante `orbit360ProvisionTeamAccess`.

La callable normal exige:

- identidad autenticada;
- membership activa;
- rol activo asignado;
- rol privilegiado o permiso explícito.

Ese requisito es correcto para operación cotidiana, pero no puede utilizarse para crear la primera administración real.

## Estado honesto del usuario

La interfaz debe diferenciar:

```text
configurado
provisionando
invitación pendiente
activo
error reintetable
bloqueado
```

Nunca debe mostrar “Habilitado” si no se verificaron Auth y membership.

## Recuperación de contraseña

“Limpiar sesión” y “Olvidé mi contraseña” son acciones distintas. La recuperación debe estar disponible en el login sin revelar si un correo existe o no.

## Diferencia de fallos

- `FUNCTIONAL_DEFECT`: el flujo depende circularmente de un administrador que todavía no existe.
- `PIPELINE_MECHANISM_FAILURE`: el bridge guarda un estado parcial o el deploy no incluye la Function anunciada.
- `SECURITY_FAILURE`: Rules o configuraciones conservan identidades demo hardcodeadas.
- `DATA_CONTRACT_FAILURE`: membership sin roles, países, scopes o advisorId válidos.

## Regla operativa

Bootstrap inicial una vez. Onboarding normal para todo usuario posterior. No reconstruir Auth ni abrir gates separados por persona.
