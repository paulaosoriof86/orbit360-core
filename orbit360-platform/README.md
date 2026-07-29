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
M4: cerrado / destino canónico verificado
M5 5.0.1–5.0.7: cerrados
M5 5.0.8: runtime ejecutado una vez; stop-line cerrado, cero escrituras
M5 5.0.9: remediación estática cerrada; nueva RC f6dfa37e
Bloque activo siguiente: autorización separada para Hosting LAB de la nueva RC
```

## M5 5.0.8 — runtime smoke stop-line

RC evaluada:

```txt
b25bf2750548651a719526bc4dadf7662def2255876c4c2e5e32bdf90f93a091
```

```txt
Package run: 30420595908
Package artifact: 8711751664
Runtime run: 30420738744
Runtime job: 90476816222
Runtime artifact: 8711820943
Runtime digest: sha256:8809e9fbd4d9e829453e111ee1fc4b5ef4890cca4cf1200dae501772327adea9
Preflight: 15/15
Contrato: 37/37
Snapshots: 11/11 antes y 11/11 después
Counts/digests: estables
Firestore writes: 0
Operational writes: 0
Runtime/browser executions: 1/1
```

### Causas raíces

1. `VALIDATOR_STALE` + `PIPELINE_MECHANISM_FAILURE`: el runner entregaba rutas parseadas como strings y el helper esperaba objetos `{path}`.
2. `FUNCTIONAL_DEFECT` + `DATA_CONTRACT_FAILURE`: el owner de contenido estático se cargaba tarde; durante bootstrap se intentaron operaciones en `lecciones`, `evaluaciones` y `config`.
3. `VALIDATOR_STALE` + `PIPELINE_MECHANISM_FAILURE`: el gate 5.0.6 validaba presencia textual, no orden real de carga.

Firestore Rules rechazó los intentos y los snapshots demostraron cero cambios durables. La autorización runtime quedó consumida; no se repitió el navegador.

## M5 5.0.9 — remediación estática cerrada

### Corrección funcional

`index.html` carga ahora:

```txt
data/store.js
→ core/academia-static-content-write-policy-v20260729.js
→ data/store-firestore-lab.local.js
→ data/seed.js
→ scripts Academia
```

El owner intercepta sincrónicamente `Orbit.store = api` y clasifica como transitorios los contenidos versionados antes de cualquier llamada durable. El adaptador Firestore y el loader LAB protegidos no fueron modificados.

### Corrección de evidencia

`tools/orbit360-gate-bootstrap-auth-legal-normalized-v20260729.mjs` normaliza filas string u objeto durante toda la espera del bootstrap. El próximo runtime deberá consumir este owner.

### Evidencia

```txt
Commit: c48ed4542faca902f296bf0adf6936e2ba23077b
Run: 30421741635
Job: 90479808034
Artifact: 8712155374
Digest: sha256:3c2d18d0bc64a4c7792b95cd96383a7dbb3c0f76f4abb813e5a84f11c538e328
Preflight: 15/15
Contrato: 40/40
Fixture orden/store: 19/19
Fixture normalizador: 7/7
Secrets/Firestore/runtime/browser/deploy: no/no/no/no/no
```

## Nueva release candidate

```txt
RC anterior: b25bf2750548651a719526bc4dadf7662def2255876c4dadf7662def2255876c4c2e5e32bdf90f93a091
RC nueva: f6dfa37ec1449b627c04cde2caf7d3c43acfe453fb0a7eb73924861bb4e7d324
Activos críticos: 42/42
Activos públicos LAB: 24/25
Mismatches: 1
Única diferencia: index.html
Estado: M5_RC_READY_LAB_DELIVERY_REQUIRED
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
Solicitar autorización explícita para una única entrega Hosting LAB
sobre la RC f6dfa37e…, sin Firestore, runtime, navegador,
Functions, Rules, producción, main, merge ni Pólizas.
Después exigir paridad pública 25/25.
```

Solo después podrá solicitarse otro runtime smoke independiente. Ese gate deberá usar el owner normalizado de evidencia y mantener cero escrituras.

No se inicia Pólizas dentro de M5. Cuando el Plan Maestro llegue al bloque Pólizas se debe solicitar a Paula la fuente actual, vigente y específica; `Listado producción 2025-2026` no es una fuente válida de Pólizas.

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
