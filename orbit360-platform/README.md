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
M5 5.0.4: Hosting LAB de RC d90ec601 entregado y verificado 24/24
M5 5.0.5: runtime smoke ejecutado una vez; stop-line cerrado, cero escrituras
M5 5.0.6: remediación estática cerrada; nueva RC b25bf275 requiere Hosting LAB
```

### Runtime smoke 5.0.5

La única ejecución autorizada llegó a navegador y fue detenida correctamente por la guarda de cero escritura.

```txt
Run: 30413481948
Job: 90454714725
Artifact: 8709301142
Digest: sha256:082be4c8ac6e2e12d12534598736e27cc8083d1d206eb35c5ca2e37180d8e503
Preflight: 17/17
Contrato: 29/29
Snapshots antes/después: 11/11 y 11/11
Conteos y digests: estables
Firestore writes: 0
Operational writes: 0
```

Causas raíces:

- `FUNCTIONAL_DEFECT` + `DATA_CONTRACT_FAILURE`: addenda estática de Academia intentaba usar escrituras durables durante el bootstrap LAB.
- `VALIDATOR_STALE` + `PIPELINE_MECHANISM_FAILURE`: la revisión visual `20260723-10` se estaba usando como runtime backend, cuyo owner canónico es `20260717-2`.

La autorización runtime quedó consumida; no se repitió el navegador.

### Remediación estática 5.0.6

Se incorporó la política LAB `core/academia-static-content-write-policy-v20260729.js`, versión `20260729.2`:

- contenido seed y addenda versionada de Academia se monta de forma transitoria en la sesión;
- no genera escrituras Firestore de bootstrap;
- preserva progreso y certificaciones;
- progreso, cursos creados y mutaciones operativas explícitas continúan siendo durables;
- el loader y el store LAB protegidos permanecen intactos.

Evidencia:

```txt
Package run: 30415573496
Package artifact: 8710028296
Package digest: sha256:3ae2d78a5239ed5be90ebb7ef87ec4148ce0baa84b59ff8de28faf2cf44e4495
Request run: 30415732795
Request job: 90461724776
Request artifact: 8710079365
Request digest: sha256:7d28bc0a43e30353a93c4aae975a87636e01f02e0f32cacfa5c4ef905a90cf1c
Preflight: 24/24
Contrato estático: 26/26
Fixtures Academia: 18/18
Secrets/Firestore/runtime/browser/deploy: no/no/no/no/no
```

Nueva candidata:

```txt
RC: b25bf2750548651a719526bc4dadf7662def2255876c4c2e5e32bdf90f93a091
Activos críticos: 42/42
Activos públicos LAB: 22/25
Mismatches: 3
Estado: M5_RC_READY_LAB_DELIVERY_REQUIRED
```

Diferencias LAB:

1. `ays-lab-preview.html` conserva el hash anterior.
2. `data/academia-v1230-operational-directory-v20260722.js` conserva el hash anterior.
3. `core/academia-static-content-write-policy-v20260729.js` aún no está publicado.

### Cierre M4 preservado

```txt
source: 414 clientes / 26 aseguradoras
canonical target: 1 configuración / 1 membership / 414 clientes / 26 aseguradoras
61 correcciones GT/GTQ preservadas
moneda faltante restante: 0
target-only: 0/0
asesores: 7
```

No se tocaron Pólizas ni otras fuentes reales.

## Siguiente acción operativa

```txt
Solicitar autorización explícita para una sola entrega Hosting LAB
sobre la RC b25bf275…, sin Firestore, datos, Functions, Rules,
producción, main, merge, runtime ni navegador.
Después exigir paridad pública 25/25.
```

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
