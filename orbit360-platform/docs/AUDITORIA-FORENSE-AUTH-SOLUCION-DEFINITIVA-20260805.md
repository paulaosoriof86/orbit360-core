# AUDITORÍA FORENSE AUTH — CAUSA SISTÉMICA Y SOLUCIÓN DEFINITIVA

Fecha local: 2026-08-05 11:51 GT  
RC: `RC-AYS-LAB-CANONICA-01`  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Estado del runtime v7: **SUSPENDIDO / NO EJECUTADO / REQUEST AUSENTE**

## 1. Decisión ejecutiva

No se ejecutará `block-auth-access-recovery-lab-v7-20260805` en su diseño anterior.

La secuencia v1–v6 estaba tratando de recuperar el primer administrador real mediante el flujo normal de onboarding. Ese flujo exige que ya exista una identidad autenticada con membership administrativa activa. Como las identidades reales todavía no están provisionadas y la identidad demo no es una base operativa recuperable, el diseño produce un bloqueo circular.

```text
Para crear el primer administrador por la callable
→ se exige un administrador autenticado y con membership
→ ese administrador real todavía no existe
→ la callable no puede ser la herramienta de bootstrap inicial
```

La solución definitiva no es otra variación del mismo recovery. Es separar formalmente:

```text
BOOTSTRAP INICIAL ADMIN SDK
→ crea/vincula primera identidad real y memberships
→ verifica acceso real

ONBOARDING NORMAL AUTOGESTIONABLE
→ opera después desde Equipo
→ usa la callable con una administración ya autenticada
```

## 2. Clasificación de causa raíz

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

El frontend carga el cliente y bridge de onboarding, pero la candidata operativa anterior publicó una allowlist de Functions que no incluía `orbit360ProvisionTeamAccess`. La interfaz podía ofrecer una capacidad que el canal LAB no garantizaba.

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

## 3. Evidencia técnica

### 3.1 Equipo crea configuración, no identidad

El módulo base de Equipo:

- inserta el registro en `asesores`;
- establece `accessProvisioned=false`;
- establece `invitacionEstado=pendiente_habilitacion`;
- informa que el acceso queda pendiente.

Por tanto, “usuario visible en Equipo” no significa “usuario autenticable”.

### 3.2 El bridge es posterior y fail-soft

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

### 3.3 La callable normal requiere un administrador previo

`functions/user-onboarding.js::authorize` exige:

- `request.auth` presente;
- membership del actor en el tenant;
- tenant coincidente;
- membership activa;
- rol activo incluido en los roles asignados;
- `SuperAdmin`/`AdminTenant` o permiso explícito de gestión.

Es el contrato correcto para administración normal, pero no para crear el primer administrador real.

### 3.4 El login está correctamente fail-closed

`core/auth.js` y la proyección de membership aceptan únicamente:

```text
Firebase Auth válida
+ membership activa del tenant
+ roles válidos
+ activeRole asignado
```

Crear solamente una cuenta en Firebase no basta.

### 3.5 Ya existe un patrón correcto de bootstrap

El repositorio ya contiene un patrón Admin SDK aprobado para roster sellado:

- resuelve exactamente los perfiles Dirección, Operativo y Asesor;
- crea únicamente identidades faltantes;
- crea memberships atómicamente;
- verifica tres identidades distintas;
- conserva rollback de usuarios y memberships;
- no depende de una sesión de navegador ni de una membership previa.

Ese patrón debe reutilizarse y modernizarse; no debe crearse otro recovery basado en la callable.

## 4. Respuesta sobre crear usuarios manualmente en Firebase

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

La vía más rápida y definitiva es un único bootstrap Admin SDK controlado, utilizando el roster y configuración ya aprobados.

## 5. Solución definitiva — un solo macrobloque

### Fase A — Bootstrap inicial directo

1. Gate canónico antes de secretos.
2. Censo read-only de Auth, memberships y registros de Equipo.
3. Resolver los tres perfiles desde roster/configuración sellados.
4. Crear únicamente identidades Auth faltantes mediante Admin SDK, sin contraseña temporal conocida ni expuesta.
5. Vincular identidades existentes por correo/digest cuando corresponda.
6. Crear o reconciliar memberships en una transacción `READ_ALL → VALIDATE_ALL → WRITE_ALL`.
7. Actualizar los registros de Equipo únicamente con `authUid`, estado de acceso e invitación, sin tocar CRM.
8. Enviar establecimiento/recuperación de contraseña por Firebase Auth.
9. Verificar Paula, Carlos y Samuel individualmente: identidad, membership, roles, defaultRole, activeRole, países, scopes y advisorId.
10. Verificar acceso real a LAB con las tres identidades.
11. Verificar snapshots CRM antes/después.
12. Rollback exacto de los objetos creados por el bloque ante cualquier fallo.

### Fase B — Cierre del onboarding normal

13. Publicar exclusivamente `orbit360ProvisionTeamAccess` si continúa ausente.
14. Añadir readiness verificable en frontend: no ofrecer “Crear acceso” si la Function no está publicada.
15. Cambiar el flujo de Equipo para que el estado visible sea una máquina de estados durable:

```text
configurado
→ provisionando
→ invitación_pendiente
→ activo
→ error_reintetable / bloqueado
```

16. No mostrar “Habilitado” hasta verificar Auth + membership.
17. Persistir `accessErrorCode`, `accessLastAttemptAt` y owner de corrección cuando el onboarding falle.
18. Verificar desde la identidad real de Dirección que un usuario futuro puede crearse, sincronizarse, bloquearse y reactivarse sin código ni Firebase Console.

### Fase C — Recuperación de contraseña

19. Añadir “Olvidé mi contraseña” al login.
20. Enviar reset únicamente al correo ingresado, con mensajes no enumerativos.
21. Mantener “Limpiar sesión” como acción separada.

### Fase D — Seguridad preproducción

22. Eliminar UID/correo demo hardcodeados de Rules.
23. Reemplazar permisos amplios por membresía activa + rol/scope.
24. Retirar o deshabilitar la identidad demo después de comprobar las identidades reales.
25. Resolver tenant desde membership en producción, no confiar solo en query string.

## 6. Criterio de cierre único

Auth se considerará cerrado solo con una evidencia acumulativa:

```text
3/3 identidades reales
3/3 memberships activas
3/3 correos de establecimiento/recuperación enviados
3/3 login real PASS
roles/países/scopes PASS
Equipo ↔ Auth ↔ membership vinculados
recuperación de contraseña visible PASS
onboarding normal autoadministrable PASS
Rules sin demo hardcodeado antes de producción
CRM VERIFIED_UNCHANGED
```

No se abrirán gates separados para cada persona ni nuevas cadenas v8/v9/v10. El siguiente runtime, si se autoriza, será un único cierre de Fundación Auth y deberá usar bootstrap Admin SDK, no la callable como actor inicial.

## 7. Estado del plan principal

El carril Auth se corrige sin sustituir el Plan Único ni reabrir auditorías cerradas.

Bloque 4 permanece:

```text
PASS_COBROS_FULL_REPLAY
ACTIVE_READ_ONLY_MONTHLY_INTAKE_PARALLEL
```

Continúan en paralelo la clasificación de pagos, recepción mensual de fuentes, importador inteligente y contrato financiero de planillas de comisiones.

## 8. Próxima acción exacta

Preparar source-only el **macrobloque único Fundación Auth** reutilizando:

- roster sellado;
- bootstrap Admin SDK existente;
- root fix transaccional v3;
- paridad/error/evidencia v6;
- login y bridge actuales;
- rollback de identidades/memberships;
- snapshots CRM.

No crear request runtime ni abrir secretos hasta que el paquete completo —bootstrap, onboarding normal, recuperación de contraseña, readiness y seguridad LAB— pase una sola suite estática/sintética acumulativa.
