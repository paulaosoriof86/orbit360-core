# M5 5.0.8–5.0.9 — Runtime stop-line, causa raíz y nueva RC

Fecha: 2026-07-29 UTC / 2026-07-28 Guatemala  
Gate: `block5-release-candidate-visualization-v20260728`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 `draft/open`

## Bloque

Se autorizó y ejecutó una sola vez el runtime smoke LAB de la RC:

```txt
b25bf2750548651a719526bc4dadf7662def2255876c4c2e5e32bdf90f93a091
```

La ejecución fue detenida en stop-line. Después se realizó únicamente una remediación estática sin secretos, Firestore, navegador ni deploy, que produjo una nueva RC:

```txt
f6dfa37ec1449b627c04cde2caf7d3c43acfe453fb0a7eb73924861bb4e7d324
```

## Carriles

- **A — frontend/UX/Academia:** corregido el orden de carga para que el owner de contenido estático se instale antes de la asignación del store LAB, seed y Academia.
- **B — backend/seguridad:** preservados el adaptador Firestore y el loader LAB; corregido el contrato reusable de evidencia de bootstrap.
- **C — datos reales:** sin cambios. Los snapshots antes/después conservaron conteos y digests.

## M5 5.0.8 — ejecución runtime autorizada una vez

### Package

```txt
Commit: 1d2e77b75a97cb9f4ecb2c760a30a451a405d4a4
Run: 30420595908
Job: 90476400727
Artifact: 8711751664
Digest: sha256:ee2d4ad2c333bd4805dd18bce9622bbd1bc1991e83e34e8298ecbfdab96f62b1
Status: PASS
```

### Runtime

```txt
Request commit: 7db1de42639cad5e53774e49286f2d585fc8f001
Run: 30420738744
Job: 90476816222
Artifact: 8711820943
Digest: sha256:8809e9fbd4d9e829453e111ee1fc4b5ef4890cca4cf1200dae501772327adea9
Preflight: 15/15
Contrato: 37/37
Snapshots: 11/11 antes y 11/11 después
Runtime/browser executions: 1/1
```

### Integridad de datos

```txt
source clients: 414 → 414
source insurers: 26 → 26
advisors: 7 → 7
canonical clients: 414 → 414
canonical insurers: 26 → 26
memberships: 1 → 1
config: 1 → 1
all counts stable: true
all digests stable: true
Firestore writes: 0
operational writes: 0
```

## Causas raíces

### 1. Evidencia de scripts del bootstrap

- Clasificación: `VALIDATOR_STALE` + `PIPELINE_MECHANISM_FAILURE`.
- Necesidad: reconocer `store`, `router` y `auth` desde evidencia externa del navegador.
- Esperado: aceptar filas string o `{path}`.
- Causa: el runner almacenaba rutas como strings y el helper intentaba leer únicamente `item.path`.
- Efecto: falso negativo `AUTH_UI_EXTERNAL_EVIDENCE_MISSING`, aunque los siete scripts relevantes estaban parseados y no existían errores de página.
- Fix: owner reusable `tools/orbit360-gate-bootstrap-auth-legal-normalized-v20260729.mjs`, que normaliza ambas representaciones durante toda la espera.

### 2. Bootstrap de contenido estático de Academia

- Clasificación: `FUNCTIONAL_DEFECT` + `DATA_CONTRACT_FAILURE`.
- Necesidad: contenido versionado disponible en sesión sin escritura durable automática.
- Esperado: `cursos`, `lecciones`, `evaluaciones` y `config/academia` clasificados como transitorios antes del primer `insert/update`.
- Causa: el owner se cargaba tarde, después de la asignación del store Firestore y de parte del bootstrap Academia.
- Evidencia: intentos de tres inserts de `lecciones`, un insert de `evaluaciones` y un update de `config`; Firestore Rules los rechazó.
- Daño durable: ninguno; snapshots y digests permanecieron idénticos.
- Fix: `index.html` carga el owner después del store base, pero antes de `store-firestore-lab.local.js`, `seed.js` y los scripts Academia. El setter del owner intercepta sincrónicamente `Orbit.store = api`.

### 3. Gate estático anterior incompleto

- Clasificación: `VALIDATOR_STALE` + `PIPELINE_MECHANISM_FAILURE`.
- Causa: 5.0.6 comprobaba presencia textual del owner dentro del addendum, no el orden real del runtime en `index.html`.
- Fix: fixture de asignación real del store y contrato explícito owner → store Firestore → seed → Academia.

## M5 5.0.9 — remediación estática

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
```

### Qué prueban las fixtures

- El owner observa la asignación posterior de `Orbit.store`.
- `lecciones`, `evaluaciones` y `config/academia` no llaman las funciones durables.
- Las tres colecciones quedan disponibles en el cache de sesión.
- El progreso del usuario sigue siendo durable.
- Las mutaciones operativas de Clientes siguen siendo durables.
- Las entradas string y objeto de evidencia conservan sus rutas y son reconocidas por el helper.
- `data/store-firestore-lab.local.js` y `core/backend-lab-loader.js` permanecen sin cambios respecto al baseline protegido.

## Nueva release candidate

```txt
RC anterior: b25bf2750548651a719526bc4dadf7662def2255876c4c2e5e32bdf90f93a091
RC nueva: f6dfa37ec1449b627c04cde2caf7d3c43acfe453fb0a7eb73924861bb4e7d324
Activos críticos: 42/42
LAB actual: 24/25
Mismatches: 1
Única diferencia: index.html
Estado: M5_RC_READY_LAB_DELIVERY_REQUIRED
```

## Alcance final

```txt
Runtime executions: 1
Browser executions: 1
Hosting deploy: 0
Firestore read: sí, únicamente snapshots autorizados
Firestore writes: 0
Operational writes: 0
Functions/Rules: no/no
Production/main/merge: no/no/no
Visual review: no
Pólizas: no
```

## Estado

- 5.0.8: stop-line cerrado; autorización runtime consumida.
- 5.0.9: remediación estática cerrada; ejecución consumida.
- Nueva RC: lista para solicitar entrega Hosting LAB.
- Runtime y revisión visual: bloqueados.

## Acumulado Claude

- Orden owner → adaptador → seed/addenda: `REPLICABLE_CLAUDE_ACUMULADO`.
- Normalización de evidencia string/objeto: `REPLICABLE_CLAUDE_ACUMULADO`.
- Gates, Firebase, snapshots, workflows y artifacts: `BACKEND_PROTEGIDO_NO_CLAUDE`.
- Datos reales, credenciales e identificadores internos: no se comparten.

## Impacto Academia

La siguiente revisión acumulada debe enseñar:

1. contenido estático y estado del usuario tienen persistencias distintas;
2. una política correcta cargada tarde sigue permitiendo intentos indebidos;
3. los gates deben validar orden runtime, no solo presencia de archivos;
4. evidencia externa debe tener un contrato de representación explícito;
5. un intento rechazado por Rules no equivale a una escritura exitosa, pero sí revela un defecto funcional que debe corregirse.

No se modifica otra vez el activo Academia después de calcular la nueva RC.

## Pendiente y siguiente acción exacta

Solicitar autorización explícita independiente para **una única entrega Hosting LAB** de la RC `f6dfa37e…`, sin Firestore, runtime, navegador, Functions, Rules, producción, `main`, merge ni Pólizas. Después exigir paridad pública 25/25. Solo entonces podrá solicitarse otro runtime smoke separado usando obligatoriamente el owner normalizado.
