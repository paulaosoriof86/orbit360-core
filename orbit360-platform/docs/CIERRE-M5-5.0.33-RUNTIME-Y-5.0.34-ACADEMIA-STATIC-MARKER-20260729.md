# Cierre M5 — runtime 5.0.33 y remediación estática 5.0.34

Fecha: 2026-07-29  
Gate único: `block5-release-candidate-visualization-v20260728`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR #5: draft/open  
Producción/main/merge/Functions/Rules: no tocados

## Corte ejecutivo

- Hosting 5.0.32 había cerrado la candidata `4bf3c8025654f43f6e4af20e5d16115bdc0851352ccddc6f099649405883cf3b` en 26/26.
- La autorización runtime posterior se usó exactamente una vez en 5.0.33.
- Runtime 5.0.33 falló con cero escrituras; la autorización quedó consumida y el workflow congelado.
- Causa raíz primaria: `FUNCTIONAL_DEFECT` en el contrato de contenido estático de Academia.
- Causa secundaria: `VALIDATOR_STALE` en dos campos derivados del adaptador 5.0.33.
- 5.0.34 corrigió la causa raíz sin relajar la política de seguridad.
- Nueva candidata: `401f87b148048f85db3f4956474258c51c29e2c9e7c9a59e52f425d491ab89e7`.
- Nuevo contrato de candidata: 44 assets críticos / 27 públicos.
- Paridad LAB actual: 26/27; único pendiente `data/academia-plus.js`.
- Runtime, Hosting, visual y producción quedan sin autorización.

## Runtime 5.0.33

Request inmutable:

- authorized base commit: `f5be15dfafad6e5af68bdf2fae3869a3e7907733`;
- request commit: `0d6ef8f708f7390406c69171e4df1e5010b666bb`;
- candidata objetivo: `4bf3c8025654f43f6e4af20e5d16115bdc0851352ccddc6f099649405883cf3b`;
- allowed executions: 1.

Ejecución:

- run: `30495235821`;
- job: `90722385990`;
- artifact: `8741323467`;
- digest: `sha256:49a8fdbcb7a58093826e8f20d3896962da943f06686a8be2742664fc25ad91d1`.

Seguridad y estabilidad:

- snapshots before/after: 11/11;
- 414 clientes, 26 aseguradoras, 7 asesores preservados;
- conteos estables: true;
- digests estables: true;
- Firestore writes: 0;
- operational writes: 0;
- network write candidates: 0;
- Hosting/Functions/Rules/producción/main/merge: no tocados.

Avance funcional observado antes del stop:

- Dirección desktop completó Cliente 360 y Aseguradoras;
- Operativo tablet completó Cliente 360 y Aseguradoras;
- Asesor móvil mostró 12 módulos;
- Asesor consultó 26 aseguradoras;
- edición/guardado de Aseguradoras para Asesor: no visibles;
- multirol y menú móvil ya no reprodujeron el defecto 5.0.28.

## Causa raíz 5.0.33

### FUNCTIONAL_DEFECT

`data/academia-plus.js` declara `CONTENT_V = 8`, pero la ruta de inserción de cursos estáticos no incluía `_cv`. La política `core/academia-static-content-write-policy-v20260729.js` exige ID estático + forma de contenido + marcador de versión para clasificar un curso como `transient_static_content`.

La política actuó correctamente: el curso sin `_cv` se clasificó como `durable_operational / user_or_operational_mutation` y el write guard bloqueó `insert('cursos', ...)` antes de cualquier persistencia.

No se relajó la política. La corrección se hizo en la fuente estática:

- `Orbit.store.insert('cursos', ...)` ahora incluye `_cv: CONTENT_V`;
- la copia a `Orbit.SEED.cursos` también incluye `_cv: CONTENT_V`;
- la ruta update ya tenía `_cv` y se preservó.

### VALIDATOR_STALE secundario

El adaptador 5.0.33 no trasladaba dos readiness ya demostrados por el probe:

- `normalizedBootstrapOwner`;
- `responsiveTitleResolverReady`.

El adaptador 5.0.34 deriva esos campos de la evidencia real del probe sin modificar el probe histórico.

## Remediación 5.0.34

Archivos de producto modificados por causa raíz:

- `orbit360-platform/data/academia-plus.js`.

Archivos de control/validación relevantes:

- `tools/orbit360-m5-runtime-smoke-534-browser-adapter-v20260729.mjs`;
- `tools/orbit360-m5-academia-static-marker-fixture-534-v20260729.mjs`;
- `tools/orbit360-m5-release-candidate-descriptor-534-v20260729.json`;
- `tools/orbit360-m5-release-candidate-readiness-534-v20260729.mjs`;
- `tools/orbit360-m5-academia-remediation-534-freeze-v20260729.json`;
- `tools/orbit360-m5-release-candidate-control-overlay-534-v20260729.json`.

La política estricta permanece con Git blob SHA:

`fa4c29d30a82673a7bf2d3d55efce52eaf4cccf3`.

El fixture demuestra simultáneamente:

- curso estático marcado con `_cv` → `transient_static_content`;
- curso con forma estática pero sin versión → sigue `durable_operational`;
- por tanto no se abrió una vía para tratar cursos creados por usuario como seed efímero.

## Intentos estáticos 5.0.34

Intento 1:

- run `30496671709`;
- job `90727017070`;
- artifact `8741847833`;
- digest `sha256:c1a56a5075a74914b444dd6141c6306d5f887c84f37e20e3f679599b493a1856`;
- clasificación `VALIDATOR_STALE / PIPELINE_MECHANISM_FAILURE`;
- causa: se comparó SHA-256 del contenido con Git blob SHA de la política;
- producto/política no se modificaron.

Se corrigió únicamente la semántica del hash del validador a `git hash-object`.

Intento 2/final — PASS:

- commit `797b253a027d9f9ab4960f7c80291678784f083d`;
- run `30496858743`;
- job `90727608725`;
- artifact `8741923846`;
- digest `sha256:bb66972cb3ad22b8fce1b889eb76cf45ae23189a752b386e1111ee1a08050a41`;
- preflight 11/11 PASS;
- fixture 11/11 PASS;
- cero capacidades operativas.

Verificación de cierre:

- run `30497151050`;
- job `90728506104`;
- artifact `8742034612`;
- digest `sha256:9d6d52f8ca5e155c6e53e5f0512faa15d542d973a9718a6d0708f05b988e8146`;
- resultado PASS;
- gate canónico en cero capacidades.

## Nueva candidata

La corrección funcional obliga a superar la RC anterior.

Nueva RC:

`401f87b148048f85db3f4956474258c51c29e2c9e7c9a59e52f425d491ab89e7`

Contrato:

- critical assets: 44;
- remote assets: 27;
- LAB matched: 26;
- mismatch: 1;
- único mismatch: `data/academia-plus.js`.

`data/academia-plus.js` se añadió expresamente al descriptor para impedir que futuras candidatas declaren paridad sin incluir el asset que originó el defecto.

## Carriles

### A — frontend / UX / Academia

Avance visible:

- Asesor móvil ya ve Aseguradoras read-only correctamente;
- remediación Academia corrige la carga de contenido estático sin introducir copy técnico ni cambios visuales.

### B — backend / seguridad / Orbit.store

- política de write guard preservada;
- política Academia estricta preservada;
- cero escrituras reales durante 5.0.33;
- no se modificaron store, Firestore Rules, Auth productivo ni backend protegido.

### C — datos reales / migración

- baseline 414/26/7 preservado;
- no hubo reimportación;
- no se tocaron Pólizas ni otras fuentes de migración.

## Claude

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`.

Patrones reutilizables:

- el contenido estático que usa API de store debe portar un marcador explícito de versión;
- la política fail-closed no debe relajarse para acomodar una fuente mal formada;
- un asset funcional modificado debe entrar al descriptor de candidata y a la paridad pública;
- distinguir Git blob SHA de SHA-256 del contenido en validadores;
- un adaptador debe derivar readiness desde evidencia semántica, no exigir campos que el probe no publica literalmente.

## Academia — actualización requerida

Enseñar por rol y por pipeline:

- diferencia entre `FUNCTIONAL_DEFECT` y `VALIDATOR_STALE`;
- por qué un write guard puede bloquear una operación sin que exista una escritura real;
- seed/contenido estático versionado vs escritura operativa del usuario;
- política estricta: corregir la fuente, no aflojar el control;
- candidata funcional vs paridad pública;
- autorización runtime consumida aunque el runtime termine FAIL;
- después de un cambio funcional se requiere nueva entrega Hosting antes de otro runtime.

## Estado y siguiente acción exacta

Estado autoritativo:

`M5_ACADEMIA_REMEDIATION_534_STATIC_PASS_NEW_RC_READY_TO_REQUEST_HOSTING_AUTHORIZATION`.

Actualmente:

- Hosting authorization: false / 0;
- runtime authorization: false / 0;
- runtime 5.0.33: consumido y sin rerun;
- visual review: false;
- producción: false;
- Pólizas: bloqueado.

Siguiente acción exacta: solicitar una **nueva autorización explícita one-shot de Hosting LAB** para la RC `401f87b148048f85db3f4956474258c51c29e2c9e7c9a59e52f425d491ab89e7`. La entrega debe verificar 27/27 antes de que pueda solicitarse una nueva autorización runtime.
