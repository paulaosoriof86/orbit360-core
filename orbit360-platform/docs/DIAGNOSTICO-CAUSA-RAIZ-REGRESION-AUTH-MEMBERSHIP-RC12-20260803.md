# Diagnóstico de causa raíz — regresión de autenticación por identidad técnica

Fecha operativa: 2026-08-03  
Producto: Gravicentra Insurance / Orbit 360  
Tenant prioritario: `alianzas-soluciones`  
Candidata correctiva: `release/gravicentra-insurance-rc1-2-membership-auth-20260803`

## 1. Resumen ejecutivo

La plataforma publicada en RC1.1 logró activar Firestore y mostrar información real, pero el acceso normal de los usuarios continuó bloqueado. El defecto no estaba en las contraseñas ni en las cuentas de Paula, Carlos, Samuel o Fernando. El runtime activo todavía conservaba dos validaciones históricas que aceptaban exclusivamente una identidad técnica de laboratorio.

El problema ya había sido resuelto conceptualmente un mes antes mediante la proyección de membresías en:

```text
tenants/{tenantId}/members/{uid}
```

Sin embargo, la candidata acumulativa se reconstruyó seleccionando una versión posterior del loader y del modelo de membresías, pero conservó versiones antiguas de `core/auth.js`, `data/store-firestore-lab.local.js` y `core/backend-lab-auth-guard.js`. El cierre anterior no tenía un gate negativo que impidiera esa combinación incoherente.

## 2. Clasificación

```text
FUNCTIONAL_DEFECT
SECURITY_FAILURE
PIPELINE_MECHANISM_FAILURE
VALIDATOR_STALE
```

No corresponde a:

```text
DATA_CONTRACT_FAILURE
ENVIRONMENT_FAILURE
credencial incorrecta del usuario
pérdida de datos
necesidad de reimportación
```

## 3. Cadena exacta del defecto

```text
modelo de membresías vigente
+
Auth/Store/Guard históricos con usuario técnico
→ Firebase acepta el correo normal
→ guard compara contra correo/UID fijo
→ sesión normal es cerrada
→ store rechaza snapshots para el UID real
→ usuario no puede ingresar con su acceso habitual
```

## 4. Por qué reapareció un problema cerrado

La causa metodológica fue la ausencia de una regla de composición negativa en la candidata acumulativa. Los gates anteriores verificaron por separado:

- que Firebase Auth funcionara;
- que los datos reales existieran;
- que el store pudiera hidratar 430 clientes;
- que la membresía multirol existiera;
- que el frontend mostrara los módulos.

Pero no verificaron simultáneamente que **los tres owners activos de autenticación** estuvieran alineados con la membresía multiusuario. El smoke RC1.1 utilizó la misma identidad técnica que el código esperaba, por lo que produjo un falso PASS para el acceso normal.

## 5. Owners exactos

### Owner de autenticación

```text
orbit360-platform/core/auth.js
```

Antes:

- prellenaba la cuenta técnica;
- mapeaba cualquier sesión LAB como Dirección;
- mostraba la aplicación después de Firebase Auth sin esperar membership.

RC1.2:

- solicita el correo real asignado;
- espera la membresía activa del tenant;
- obtiene rol, roles, advisorId, países y scopes desde membership;
- no muestra la aplicación hasta completar la proyección autorizada.

### Owner de datos

```text
orbit360-platform/data/store-firestore-lab.local.js
```

Antes:

- `canonicalAuthUser()` comparaba correo y UID contra constantes técnicas;
- solo esa identidad podía conectar snapshots.

RC1.2:

- valida Firebase Auth + `Orbit.auth.productUser`;
- exige UID, tenant, estado activo y roles válidos;
- preserva la API pública de `Orbit.store`;
- conserva rutas canónicas y rutas legacy por colección;
- excluye seeds de las lecturas canónicas.

### Guard de sesión

```text
orbit360-platform/core/backend-lab-auth-guard.js
```

Antes:

- rechazaba cualquier usuario distinto del técnico;
- forzaba Dirección y `ase-paula-osorio`.

RC1.2:

- acepta cualquier identidad con membership activa;
- no fuerza rol ni asesor;
- rearma snapshots después de la proyección autorizada.

### Owner de membresía preservado

```text
orbit360-platform/core/access-role-session-owner-v20260728.js
```

Este archivo ya contenía el modelo correcto y no fue reemplazado. Continúa resolviendo:

```text
tenant
uid
roles
defaultRole
activeRole
advisorId
teamId
countries
dataScopes
modulesExtra
modulesRestricted
status
```

## 6. Correctivo estructural aplicado

```text
Auth v1.80 membership owner
Store v1.80 membership owner
Guard Firestore membership
```

Commits source-only:

```text
auth:  7ba78de857f7075a56ffbdd70dc71185306d6483
store: 3f59da1e182b68220e375543cd7c25bfafb4b01e
gate:  7648c6b5b8f9953a229a99ce7f0ee8c2cdf49852
```

No se modificaron:

```text
usuarios Firebase
contraseñas
memberships Firestore
Rules
Functions
datos operativos
main
PR mediante merge
producción
```

## 7. Gate permanente antirregresión

Se agregó:

```text
tools/orbit360-validar-auth-membership-antiregression-v20260803.mjs
```

El gate debe bloquear cualquier release si detecta:

- correo técnico en Auth, Store o Guard activos;
- UID técnico fijo;
- rol Dirección forzado para todos;
- asesor Paula forzado;
- ausencia de validación por membership;
- pérdida de la API pública de `Orbit.store`;
- loader activo sin guard por membresía;
- fallback seed en lecturas canónicas.

Este gate es `releaseBlocking:true` y debe ejecutarse antes de secretos, navegador, Firebase o deploy.

## 8. Evidencia source-only

```text
orbit360-platform/runtime-gate-crm-v20260716/
rc12-auth-membership-source-review.json
```

Estado:

```text
SOURCE_PASS
runtimeStatus: NOT_EXECUTED
deployAuthorized: false
productionTouched: false
```

## 9. Estado honesto

```text
RC1.1 en producción: datos reales, acceso normal defectuoso
RC1.2 source-only: implementada
RC1.2 desplegada: no
Firestore leído durante el fix: no
Firestore escrito: no
Auth escrito: no
```

## 10. Siguiente cierre permitido

Una única ejecución debe:

1. ejecutar el gate antirregresión antes de credenciales;
2. verificar que la membership de la identidad de prueba existe y está activa;
3. desplegar exclusivamente Hosting desde RC1.2;
4. abrir la URL canónica sin parámetros manuales;
5. iniciar sesión con una identidad normal, no técnica;
6. verificar roles/scopes/advisor desde membership;
7. comprobar store Firestore y los 430 clientes;
8. comprobar ausencia de identidad técnica y datos demo;
9. confirmar snapshots y digests before/after idénticos;
10. ejecutar rollback si falla cualquier criterio.

No corresponde repetir Gate 7.11, predeploy general ni reimportar datos.
