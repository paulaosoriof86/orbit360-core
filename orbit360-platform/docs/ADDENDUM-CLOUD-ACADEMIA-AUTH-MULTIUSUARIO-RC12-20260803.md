# Addendum Cloud / Claude / Academia — autenticación multiusuario RC1.2

Fecha: 2026-08-03  
Estado: documentado en core; pendiente de envío externo y pendiente de deploy.

## 1. Objetivo reusable

Convertir la autenticación de una validación técnica monousuario a un patrón comercializable multi-tenant:

```text
Firebase Auth
→ tenantId
→ membership por UID
→ roles asignados
→ rol activo/default
→ advisorId / teamId
→ países y scopes
→ módulos base + extras - restringidos
→ Orbit.store
```

El patrón no depende de A&S, de un correo específico ni de un asesor específico. A&S continúa siendo el primer tenant y su información se resuelve únicamente mediante configuración y datos de backend.

## 2. Clasificación para Cloud / Claude

### CL-121 — REPLICABLE_CLAUDE_INMEDIATO

**Login multiusuario sin identidad técnica visible**

- campo de correo vacío o con placeholder corporativo;
- no prellenar usuarios demo en un host productivo;
- estados: preparando sesión, validando credenciales, validando membresía, acceso autorizado y acceso bloqueado;
- copy cliente-facing, sin mencionar LAB, Firebase, backend o UID.

### CL-122 — REPLICABLE_CLAUDE_INMEDIATO

**Identidad y rol derivados de membership**

- nombre/avatar del usuario autenticado;
- rol activo real;
- selector únicamente con roles asignados;
- advisorId no editable desde UI;
- menú derivado de permisos.

### CL-123 — REPLICABLE_CLAUDE_ACUMULADO

**Shell fail-closed por tenant y membership**

- no mostrar módulos ni datos antes de membership válida;
- no usar datos seed como fallback;
- relación vacía debe mostrarse como estado honesto, no como datos ficticios;
- cierre de sesión inmediato si la membership está inactiva o pertenece a otro tenant.

### CL-124 — BACKEND_PROTEGIDO_NO_CLAUDE

**Resolución canónica de acceso**

```text
tenants/{tenantId}/members/{uid}
```

Claude no debe recibir:

- credenciales;
- UID reales;
- reglas de Firestore;
- rutas de secretos;
- scripts de deploy;
- datos reales de memberships;
- lógica de snapshots protegida.

Sí puede recibir el contrato conceptual de roles, scopes y estados.

### CL-125 — ACADEMIA_ACTUALIZAR

**Diferencia entre autenticar e autorizar**

La Academia debe enseñar que:

- Firebase Auth confirma quién es el usuario;
- la membership confirma a qué tenant pertenece;
- roles/scopes determinan qué puede ver y hacer;
- autenticación exitosa sin membership válida no concede acceso;
- un usuario técnico de pruebas no representa un flujo productivo.

### CL-126 — ACADEMIA_ACTUALIZAR

**Prevención de regresiones por composición de candidata**

- una mejora puede existir en un owner y perderse al mezclar versiones antiguas de otros owners;
- la candidata debe validarse como conjunto;
- un smoke debe usar al menos una identidad normal y no únicamente la identidad técnica;
- los gates negativos son tan importantes como los positivos.

### CL-127 — REPLICABLE_CLAUDE_ACUMULADO

**Estados UI recomendados**

```text
login-ready
signing-in
validating-membership
inside
blocked-membership
session-expired
```

Nunca mostrar mensajes como:

```text
usuario LAB
UID esperado
snapshot owner
Firestore mode
seed fallback
```

## 3. Impacto en el prototipo comercializable

El prototipo debe conservar dos carriles separados:

### Prototipo local

- puede utilizar datos ficticios;
- debe estar claramente separado del host productivo;
- no comparte sesión, preferencias ni identidad con tenants reales.

### Runtime de tenant

- exige Auth + membership;
- no puede caer al seed;
- resuelve branding, roles, países, módulos y scopes desde configuración;
- permite incorporar nuevos tenants sin fork ni hardcode.

## 4. Impacto en Academia por rol

### Dirección

- entiende diferencia entre usuario, membership, rol activo y alcance de datos;
- aprende a revisar cambios que abren scope `todos`;
- valida que los usuarios técnicos no sustituyan pruebas reales.

### Operativo

- conoce los módulos que dependen de su membership;
- reporta ausencia o asignación incorrecta mediante gestión de corrección;
- no intenta resolver acceso creando cuentas paralelas.

### Asesor

- accede únicamente a clientes y relaciones autorizadas;
- advisorId proviene del backend;
- no puede reasignarse ni ampliar su scope desde la interfaz.

### Equipo técnico / implementación

- ejecuta el gate antirregresión antes de secretos;
- diferencia `FUNCTIONAL_DEFECT`, `SECURITY_FAILURE`, `VALIDATOR_STALE` y `PIPELINE_MECHANISM_FAILURE`;
- no declara PASS usando exclusivamente una identidad técnica.

## 5. Contrato de gate reusable

Antes de cualquier release:

```text
1. no correo técnico en owners activos
2. no UID fijo
3. no rol o asesor forzado
4. Auth espera membership
5. Store espera membership
6. Guard espera membership
7. API Orbit.store preservada
8. host productivo sin seed
9. identidad normal entra con sus roles/scopes
10. identidad sin membership queda bloqueada
```

## 6. Estado de sincronización

```text
core RC1.2 actualizado: sí
documentación profunda: sí
gate antirregresión: sí
Academia documentada: sí
Cloud/Claude clasificado: sí
enviado externamente: no
incorporado en prototipo Cloud: no
desplegado en producción: no
```

## 7. Regla de continuidad

Cualquier mejora futura de Auth, Store, roles o membresías debe actualizar conjuntamente:

```text
owner funcional
contrato de membership
guard de sesión
store
gate antirregresión
workflow de release
documentación Cloud/Claude
Academia
```

No se permite cerrar uno de estos componentes dejando los demás en una versión histórica.
