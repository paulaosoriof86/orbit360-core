# Orbit 360 · Plataforma

Sistema 360 para intermediarios de seguros, comercializable, white-label y multi-tenant. A&S es el primer tenant y se configura mediante `Orbit.tenant`; no existe un fork de código para Alianzas.

## Estado vivo — 2026-07-29 UTC / 2026-07-28 Guatemala

```txt
Repositorio: paulaosoriof86/orbit360-core
Rama activa: ays/backend-tenant-lab-v99-20260703
PR: #5 draft/open
Merge/main/producción: no autorizados
M1: cerrado
M2: cerrado
M3: cerrado
M4: cerrado / M4_CLOSED_SUCCESS_CANONICAL_TARGET_VERIFIED
M5 5.0.1: readiness canónico cerrado
M5 5.0.2: Access role/session boundary cerrado
M5 5.0.3: RC post-Access cerrada
M5 5.0.4: Hosting LAB RC d90ec601 cerrado 24/24
M5 5.0.5: runtime smoke stop-line cerrado, cero escrituras
M5 5.0.6: remediación estática Academia cerrada
M5 5.0.7: RC b25bf275 entregada a Hosting LAB y verificada 25/25
Bloque activo siguiente: autorización separada para un runtime smoke LAB
```

## M5 5.0.7 — Hosting LAB cerrado

Release candidate exacta:

```txt
b25bf2750548651a719526bc4dadf7662def2255876c4c2e5e32bdf90f93a091
```

### Package check

```txt
Commit: 4aa996d37b413a59b48135a728edffa3fd547dd6
Run: 30417610407
Job: 90467411035
Artifact: 8710708337
Digest: sha256:4c861ebebcedb84bee5a31a797845b9edb2a5df15fd935fb945f992ed09a4307
```

### Entrega única Hosting LAB

```txt
Request commit: 98c28c188f00141476044628ca9a4a1d0ef6c43a
Run: 30417743516
Job: 90467807470
Artifact: 8710762943
Digest: sha256:eca16e06d89a9accb29c98a7d36ed2719bac869fab451f87165c81e0da845669
Preflight: 24/24
Contrato: 35/35
Hosting deploy executions: 1
```

### Paridad pública final

```txt
Run: 30418258733
Job: 90469348278
Artifact: 8710924084
Digest: sha256:accbc8ea34cabe7daf657b1ae2dd7968d76b9d2805c2a03200a6ad04e45d80cf
Contrato recuperación: 20/20
Activos críticos: 42/42
Activos públicos: 25/25
Mismatches: 0
Remote parity: true
Redeploy: no
```

La entrega se ejecutó una sola vez. La primera revalidación automática posterior falló por una dependencia efímera del validador, no por Hosting ni por el producto. El mecanismo se corrigió para usar el cierre durable 5.0.6 y la paridad se recuperó sin secretos, Firebase CLI ni segundo deploy.

## Runtime smoke 5.0.5 y remediación 5.0.6

La ejecución 5.0.5 fue detenida correctamente por la guarda de cero escritura:

```txt
Run: 30413481948
Artifact: 8709301142
Preflight: 17/17
Contrato: 29/29
Snapshots antes/después: estables
Firestore writes: 0
Operational writes: 0
```

Causas raíces cerradas:

- `FUNCTIONAL_DEFECT` + `DATA_CONTRACT_FAILURE`: addenda estática de Academia intentaba escrituras durables durante bootstrap LAB.
- `VALIDATOR_STALE` + `PIPELINE_MECHANISM_FAILURE`: revisión visual `20260723-10` confundida con runtime backend `20260717-2`.

La política `core/academia-static-content-write-policy-v20260729.js` v`20260729.2` monta seed y contenido versionado de Academia de forma transitoria en LAB, conserva progreso/certificaciones y mantiene durables únicamente las mutaciones explícitas del usuario.

## Cierre M4 preservado

```txt
source: 414 clientes / 26 aseguradoras
canonical target: 1 configuración / 1 membership / 414 clientes / 26 aseguradoras
61 correcciones GT/GTQ preservadas
moneda faltante restante: 0
target-only: 0/0
asesores: 7
```

No se tocaron Pólizas ni otras fuentes reales.

## Límite de autorización actual

```txt
hostingDeployAuthorized: false
allowedHostingDeployExecutions: 0
publicParityRecoveryAuthorized: false
runtimeSmokeAuthorized: false
allowedRuntimeSmokeExecutions: 0
visualReviewAuthorized: false
productionAuthorized: false
policiesAuthorized: false
```

## Siguiente acción operativa

```txt
Solicitar autorización explícita para una sola ejecución runtime smoke LAB
sobre la RC b25bf275…, sin nuevo deploy y con cero escrituras.
```

El runtime podrá usar lectura Firestore read-only únicamente si su gate separado la requiere. Solo después de evidencia sanitizada `ok:true` podrá habilitarse la revisión visual única.

No se inicia Pólizas dentro de M5. Cuando el Plan Maestro llegue al bloque Pólizas se debe solicitar a Paula el listado/base actual y vigente específico; `Listado producción 2025-2026` no es una fuente válida de Pólizas. La misma regla aplica a Vehículos, Recibos/cartera, Cobros, planillas, financiero, siniestros y documentos: cada fuente real se solicita cuando su bloque la necesite.

## Metodología vigente

Antes de modificar: verificar PR, rama, HEAD, freeze, registro contractual y evidencia más reciente. Antes de secrets, Firebase, sincronización, deploy LAB o navegador: ejecutar el preflight canónico del gate. Si la misma etapa o código falla dos veces, detener reintentos y diagnosticar causa raíz. No corregir producto si el fallo es `VALIDATOR_STALE`, `ENVIRONMENT_FAILURE` o `PIPELINE_MECHANISM_FAILURE`.

Un status rojo no prueba por sí mismo un defecto funcional. Debe identificarse la etapa exacta y comprobarse si el resultado operativo ocurrió antes del fallo del mecanismo de cierre.

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

Los módulos usan exclusivamente `Orbit.store`. El backend adapta el store sin romper su API pública ni introducir persistencia operativa directa en módulos.

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
