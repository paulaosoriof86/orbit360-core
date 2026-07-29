# Orbit 360 · Plataforma

Sistema 360 para intermediarios de seguros, comercializable, white-label y multi-tenant. A&S es el primer tenant y se configura mediante `Orbit.tenant`; no existe un fork de código para Alianzas.

## Estado vivo — 2026-07-29

```txt
Repositorio: paulaosoriof86/orbit360-core
Rama activa: ays/backend-tenant-lab-v99-20260703
PR: #5 draft/open
Merge/main/producción: no autorizados
M1–M4: cerrados
M5 5.0.1–5.0.10: cerrados
M5 5.0.11: runtime ejecutado una vez; stop-line cerrado; cero escrituras
M5 5.0.12: causa raíz Access/membership remediada estáticamente; nueva RC ae6bb2a3
Siguiente gate: una única entrega Hosting LAB de la nueva RC requiere autorización separada
Runtime/navegador: bloqueados
Revisión visual: bloqueada
Pólizas: bloqueado / fuente real no solicitada todavía
```

## Baseline canónico preservado

```txt
source: 414 clientes / 26 aseguradoras
canonical target: 1 configuración / 1 membership / 414 clientes / 26 aseguradoras
asesores: 7
GT/CO: 398/16
Persona/Empresa: 391/23
moneda faltante: 0
target-only: 0/0
```

No se tocaron Pólizas ni otras fuentes reales.

## M5 5.0.10 — Hosting LAB previo

RC `f6dfa37ec1449b627c04cde2caf7d3c43acfe453fb0a7eb73924861bb4e7d324` quedó publicada con paridad 25/25.

```txt
Package run: 30455383510
Delivery run: 30455636671
Preflight: 24/24
Contrato: 22/22
Hosting deploy executions: 1
Redeploy: 0
Firestore writes: 0
Operational writes: 0
Runtime/browser: false/false
```

## M5 5.0.11 — runtime smoke stop-line

La autorización runtime se consumió exactamente una vez sobre RC `f6dfa37e…`.

```txt
Package run: 30457621192
Package job: 90595169193
Package artifact: 8726195633
Runtime request: 136cca57600c0aef146ad5b121aeb746a7d0dd4c
Runtime run: 30457847993
Runtime job: 90595950599
Runtime artifact: 8726316517
Runtime digest: sha256:61740f99806fc8353d0f2cbddf5a48b8432c27ced33dbb2e5808a94372f4135e
Preflight: 17/17
Contrato: 42/42
Snapshots: 11/11 antes + 11/11 después
Counts/digests: estables
Firestore writes: 0
Operational writes: 0
```

### Causa raíz

El bootstrap normalizado, autenticación y legal funcionaron. El primer fallo funcional fue `MEMBERSHIP_BOUNDARY_NOT_ACTIVE`.

Clasificación: `FUNCTIONAL_DEFECT` + `DATA_CONTRACT_FAILURE`.

El owner fail-closed de Access exige una proyección de membership autenticada en `Orbit.auth.productUser`. El flujo LAB aportaba identidad Firebase, pero no proyectaba roles/scopes/advisor desde la membership. El fallback legado con rol/asesor hardcodeados es incompatible con el contrato multirol actual y no fue restaurado.

## M5 5.0.12 — remediación Access/membership cerrada

### Implementación

`core/access-role-session-owner-v20260728.js` v`20260729.3` ahora:

- deriva tenant del runtime;
- deriva UID exclusivamente del usuario Firebase autenticado;
- consulta read-only `tenants/{tenantId}/members/{authenticatedUid}`;
- valida tenant, UID, estado, roles, rol default/activo y advisor;
- proyecta únicamente `Orbit.auth.productUser` con `productReadOnly:true`;
- no sobrescribe `Orbit.auth.user()`;
- permanece fail-closed si la membership falta o es inválida;
- no contiene tenant, UID, asesor, correo ni rol fallback hardcodeados;
- conserva `writeAuthorized:false` y `membershipWrites:false`.

No fueron modificados `data/store.js`, `data/store-firestore-lab.local.js`, `core/auth.js`, `core/backend-lab-init.js`, `core/backend-lab-loader.js`, `core/backend-lab-auth-guard.js`, `core/importa.js` ni `firestore.rules`.

### Evidencia

```txt
Run final: 30460202680
Job: 90603978220
Artifact: 8727238222
Digest: sha256:51e1e36221fecf121bc2c121b445abf5d78f6fb2de8c0cff8376a86c56f74378
Workflow safety: 13/13
Preflight canónico: 36/36
Fixture membership: 23/23
Protected files unchanged: true
Secrets/Firestore/runtime/browser/deploy: false/false/false/false/false
```

La fixture cubre membership válida, inexistente y con rol activo inválido. Los casos inválidos cierran acceso sin fallback y sin escrituras.

### Incidentes de pipeline

Durante la convergencia 5.0.12 aparecieron validadores/mecanismos obsoletos. Se detuvo el patrón de reintentos cuando la misma etapa falló dos veces, se congelaron los cambios funcionales y se corrigió el mecanismo:

- validadores de fixture demasiado amplios/exactos;
- self-scan autorreferencial del workflow;
- checkout superficial que no incluía el commit histórico requerido para diff;
- seguridad del workflow movida a un owner externo y checkout con historia completa.

Ninguno de esos incidentes accedió a secretos, Firestore real, navegador ni deploy.

## Release candidate vigente

```txt
RC anterior: f6dfa37ec1449b627c04cde2caf7d3c43acfe453fb0a7eb73924861bb4e7d324
RC vigente: ae6bb2a35ce4f03c0353d670218c841e51b57a2461a3ba9e741d8bd7a973fd61
Activos críticos: 42/42
Activos públicos LAB: 24/25
Mismatches: 1
Única diferencia: core/access-role-session-owner-v20260728.js
Estado: M5_RC_READY_LAB_DELIVERY_REQUIRED
```

## Límite de autorización actual

```txt
staticRemediationAuthorized: false
hostingDeployAuthorized: false
allowedHostingDeployExecutions: 0
runtimeSmokeAuthorized: false
allowedRuntimeSmokeExecutions: 0
visualReviewAuthorized: false
productionAuthorized: false
policiesAuthorized: false
```

## Siguiente acción operativa

```txt
Solicitar autorización explícita separada para una única entrega Hosting LAB
sobre la RC ae6bb2a3…, sin Firestore, runtime, navegador,
Functions, Rules, producción, main, merge ni Pólizas.
Después exigir paridad pública 25/25.
```

Solo después de 25/25 podrá solicitarse un nuevo runtime smoke independiente. No se reutiliza la autorización consumida de 5.0.11.

No se inicia Pólizas dentro de M5. Cuando el Plan Maestro llegue al bloque Pólizas se debe solicitar la fuente actual, vigente y específica; `Listado producción 2025-2026` no es una fuente válida de Pólizas.

## Metodología vigente

Antes de modificar: verificar PR, rama, HEAD, freeze, registro contractual y evidencia más reciente. Antes de secretos, Firebase, sincronización, deploy LAB o navegador: ejecutar el preflight canónico del gate. Si la misma etapa o código falla dos veces, detener reintentos y diagnosticar causa raíz.

Un status rojo no prueba por sí mismo un defecto funcional. Debe identificarse la etapa exacta, comprobar si hubo resultado operativo y comparar snapshots/digests antes de corregir o reintentar.

## Arquitectura y capa de datos

```txt
orbit360-platform/
├── index.html
├── styles/
├── data/
├── core/
├── modules/
├── docs/
└── tools/
```

Los módulos usan exclusivamente `Orbit.store`. El backend adapta el store sin romper su API pública ni introducir persistencia directa en módulos.

### Carriles permanentes

```txt
A — prototipo / UX / Academia / empalmes Claude
B — backend protegido / Auth / seguridad / Orbit.store / integraciones
C — datos reales y migración A&S por fuentes separadas
```

## Reglas de datos

- GT → GTQ; CO → COP.
- Si falta país/moneda confiable: `REQUIERE_VALIDACION`.
- Cobros/recaudos no son `finmovs`.
- Producción, metas y comisiones usan prima neta recaudada.
- Solo pólizas Vigente / Por renovar generan cartera.
- Financiero histórico no crea clientes, pólizas, cobros ni cartera.
- Estados bancarios sirven para conciliación, no para crear cobros directamente.
- Documentos solo proponen datos con diff/confirmación.
