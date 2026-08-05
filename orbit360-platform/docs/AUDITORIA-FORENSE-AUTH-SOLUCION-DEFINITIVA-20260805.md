# AUDITORÍA FORENSE AUTH — CAUSA SISTÉMICA Y SOLUCIÓN DEFINITIVA

Fecha local: 2026-08-05 12:24 GT  
RC: `RC-AYS-LAB-CANONICA-01`  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Estado del runtime v7 anterior: **SUSPENDIDO / NO EJECUTADO / REQUEST AUSENTE**

## 1. Decisión ejecutiva

No se ejecutará `block-auth-access-recovery-lab-v7-20260805` en su diseño anterior.

La secuencia v1–v6 estaba tratando de recuperar el primer administrador real mediante el flujo normal de onboarding. Ese flujo exige que ya exista una identidad autenticada con membership administrativa activa. Como las identidades reales todavía no están provisionadas y la identidad demo no es una base operativa recuperable, el diseño produce un bloqueo circular.

```text
Para crear el primer administrador por la callable
→ se exige un administrador autenticado y con membership
→ ese administrador real todavía no existe
→ la callable no puede ser la herramienta de bootstrap inicial
```

La solución definitiva separa formalmente:

```text
BOOTSTRAP INICIAL ADMIN SDK
→ crea o vincula la primera administración real
→ reconcilia todos los usuarios actuales
→ verifica acceso real

ONBOARDING NORMAL AUTOGESTIONABLE
→ opera después desde Equipo
→ usa la callable con una administración ya autenticada
```

## 2. Corrección de alcance

Los tres perfiles Dirección, Operativo y Asesor son cobertura funcional de permisos. No representan todo el universo de usuarios.

El cierre vinculante es:

```text
usuarios actuales del tenant: 7/7
perfiles funcionales: 3/3
usuarios futuros: onboarding genérico desde Equipo
```

El gate source-only `block-auth-foundation-all-team-source-only-v20260805` cerró 29/29 PASS y demostró que el owner genérico procesa siete registros activos, no hardcodea personas y soporta el flujo futuro.

## 3. Clasificación de causa raíz

### Causa sistémica primaria

```text
FUNCTIONAL_DEFECT
AUTH_BOOTSTRAP_CIRCULAR_DEPENDENCY_AND_SPLIT_BRAIN_USER_STATE
```

Owner transversal:

- `orbit360-platform/modules/equipo.js`
- `orbit360-platform/modules/equipo-onboarding-v20260804-bridge.js`
- `orbit360-platform/core/user-onboarding.js`
- `functions/user-onboarding.js`
- workflows/allowlists de Functions

### Contribuyente 1

```text
PIPELINE_MECHANISM_FAILURE
TEAM_RECORD_SAVED_BEFORE_AUTH_MEMBERSHIP_WITH_FAIL_SOFT_ASYNC_BRIDGE
```

Equipo guarda primero el registro operativo del usuario. El puente intenta crear el acceso después y de forma asíncrona. Si el backend no está disponible o la callable rechaza la solicitud, el registro de Equipo puede permanecer creado aunque Auth y membership no existan.

### Contribuyente 2

```text
PIPELINE_MECHANISM_FAILURE
FRONTEND_CAPABILITY_ADVERTISED_WITHOUT_DEPLOYMENT_READINESS_PARITY
```

El frontend carga el cliente y bridge de onboarding, pero la candidata operativa anterior no garantizaba que `orbit360ProvisionTeamAccess` estuviera publicada en el canal LAB.

### Contribuyente 3

```text
FUNCTIONAL_DEFECT
PASSWORD_RECOVERY_NOT_EXPOSED_IN_LOGIN
```

El login solo ofrece limpiar la sesión. No existe una acción visible y operativa de “Olvidé mi contraseña”, aunque el producto depende de Firebase Auth.

### Contribuyente 4

```text
SECURITY_FAILURE
LEGACY_DEMO_IDENTITY_HARDCODED_IN_RULES_AND_OVERBROAD_MEMBER_ACCESS
```

Las Rules vigentes todavía contienen UID/correo demo y conceden lectura/escritura amplia a miembros del tenant. Esto no fue la causa directa del fallo de la callable —Admin SDK omite Rules—, pero demuestra que la transición de demo a acceso real no quedó cerrada y debe resolverse antes de producción.

## 4. Evidencia técnica

### 4.1 Equipo crea configuración, no identidad

El módulo base de Equipo:

- inserta el registro en `asesores`;
- establece `accessProvisioned=false`;
- establece `invitacionEstado=pendiente_habilitacion`;
- informa que el acceso queda pendiente.

Por tanto, “usuario visible en Equipo” no significa “usuario autenticable”.

### 4.2 El bridge es posterior y fail-soft

El bridge de onboarding:

- intercepta el guardado después de cerrar el formulario;
- llama a la Function solo si `Orbit.userOnboarding.available()` es verdadero;
- si no está disponible, retorna sin provisionar;
- si falla, muestra un toast, pero no garantiza un estado durable de error en el registro.

Esto permite una divergencia durable entre:

```text
Registro de Equipo: existe
Firebase Auth: no existe
Membership: no existe
```

### 4.3 La callable normal requiere un administrador previo

`functions/user-onboarding.js::authorize` exige:

- `request.auth` presente;
- membership del actor en el tenant;
- tenant coincidente;
- membership activa;
- rol activo incluido en los roles asignados;
- `SuperAdmin`/`AdminTenant` o permiso explícito de gestión.

Es el contrato correcto para administración normal, pero no para crear el primer administrador real.

### 4.4 El login está correctamente fail-closed

`core/auth.js` y la proyección de membership aceptan únicamente:

```text
Firebase Auth válida
+ membership activa del tenant
+ roles válidos
+ activeRole asignado
```

Crear solamente una cuenta en Firebase no basta.

### 4.5 Ya existe un patrón correcto de bootstrap

El repositorio contiene un patrón Admin SDK aprobado que no depende de una sesión de navegador ni de una membership previa. El nuevo plan all-team reutiliza ese patrón para los siete registros activos del tenant, vinculando identidades existentes o creando únicamente las faltantes.

## 5. Respuesta sobre crear usuarios manualmente en Firebase

### Crear solo los usuarios en Firebase

**No resuelve el acceso.** El login los rechazará porque falta `tenants/{tenantId}/members/{uid}` con roles, rol activo, países y scopes válidos.

### Crear usuarios y memberships manualmente en Firebase

Podría desbloquear técnicamente, pero no es la solución recomendada:

- expone riesgo de UID incorrecto;
- puede dejar roles/scopes incoherentes;
- no garantiza vínculo con el registro de Equipo;
- no deja idempotencia, auditoría ni rollback;
- contradice la metodología 0% manual.

### Ruta rápida y segura

La vía más rápida y definitiva es un único bootstrap Admin SDK controlado para los siete usuarios actuales, utilizando la configuración vigente del tenant.

## 6. Solución definitiva — un solo macrobloque runtime

### Fase A — Censo y bootstrap

1. Gate canónico antes de secretos.
2. Censo read-only de Auth, memberships y registros de Equipo.
3. Exigir exactamente siete registros activos para el cierre actual.
4. Validar correo único, roles, defaultRole, activeRole, países y dataScopes.
5. Resolver una administración bootstrap desde configuración aprobada.
6. Crear únicamente identidades faltantes mediante Admin SDK, sin contraseña temporal expuesta.
7. Vincular identidades existentes por correo/UID cuando corresponda.

### Fase B — Reconciliación all-team

8. Crear o reconciliar las siete memberships mediante `READ_ALL → VALIDATE_ALL → WRITE_ALL`.
9. Vincular los siete registros de Equipo con `authUid`, estado de acceso e invitación.
10. Enviar siete correos de establecimiento o recuperación de contraseña.
11. Verificar los siete contratos Auth ↔ membership ↔ Equipo.
12. Verificar tres perfiles funcionales: Dirección, Operativo y Asesor.
13. Verificar siete sesiones autenticables por membership.
14. Verificar snapshots CRM antes/después.
15. Rollback exacto de objetos creados por el bloque ante cualquier fallo.

### Fase C — Onboarding normal futuro

16. Publicar exclusivamente `orbit360ProvisionTeamAccess` si continúa ausente.
17. Usarla únicamente después del bootstrap administrativo.
18. Mantener el flujo genérico para cualquier usuario nuevo creado desde Equipo.
19. No mostrar “Habilitado” sin readback confirmado de Auth + membership.
20. Persistir estado durable de error y siguiente acción si falla.

### Fase D — Recuperación y seguridad

21. Añadir “Olvidé mi contraseña” al login.
22. Mantener “Limpiar sesión” como acción separada.
23. Retirar el UID/correo demo de Rules antes de producción.
24. Sustituir permisos amplios por membership activa + rol + scope.
25. Deshabilitar la identidad demo después de verificar las siete identidades reales.

## 7. Criterio de cierre único

Auth se considerará cerrado solo con una evidencia acumulativa:

```text
7/7 identidades reales
7/7 memberships activas
7/7 registros Equipo vinculados
7/7 correos enviados
7/7 sesiones autenticables por membership
3/3 perfiles funcionales
recuperación de contraseña visible
onboarding normal autoadministrable
CRM VERIFIED_UNCHANGED
```

No se abrirán gates separados por persona ni nuevas cadenas v8/v9/v10.

## 8. Estado del plan principal

El carril Auth se corrige sin sustituir el Plan Único ni reabrir auditorías cerradas.

Bloque 4 permanece:

```text
PASS_COBROS_FULL_REPLAY
ACTIVE_READ_ONLY_MONTHLY_INTAKE_PARALLEL
```

Continúan en paralelo la clasificación de pagos, recepción mensual de fuentes, importador inteligente y contrato financiero de planillas de comisiones.

## 9. Próxima acción exacta

Preparar el único gate runtime Fundación Auth all-team, sin request activo todavía. Ese gate deberá utilizar el owner dinámico validado 29/29, el bootstrap Admin SDK existente, el root fix transaccional, la evidencia v6, rollback e integridad CRM. Solo después podrá solicitarse una única autorización de ejecución.
