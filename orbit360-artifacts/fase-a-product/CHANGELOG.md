# Changelog · Orbit 360 Plataforma

Formato basado en *Keep a Changelog*. Construcción greenfield; el estado operativo vigente se mantiene en la rama obligatoria y PR #5 draft/open, sin merge ni producción salvo autorización explícita.

## [M5-5.0.12] — 2026-07-29 UTC · Access/membership projection + RC ae6bb2a3
### Fixed
- `core/access-role-session-owner-v20260728.js` v`20260729.3` proyecta membership LAB desde `tenants/{tenantId}/members/{authenticatedUid}` usando tenant del runtime y UID Firebase autenticado.
- La proyección se instala únicamente en `Orbit.auth.productUser`; no sobrescribe `Orbit.auth.user()`.
- Missing/invalid membership permanece fail-closed; no se restauró el fallback legado de rol/asesor hardcodeados.
- Sin tenant, UID, asesor, correo ni rol fallback hardcodeados.
### Verified
- Verificación final run `30460202680`, job `90603978220`, artifact `8727238222`, digest `sha256:51e1e36221fecf121bc2c121b445abf5d78f6fb2de8c0cff8376a86c56f74378`.
- Workflow safety 13/13; preflight 36/36; fixture membership 23/23.
- Fixture válida, inexistente e inválida; cero escrituras Firestore y operativas.
- Archivos protegidos `store`, Auth, loader/init/guard LAB, importador y Rules permanecen sin cambios.
- Nueva RC `ae6bb2a35ce4f03c0353d670218c841e51b57a2461a3ba9e741d8bd7a973fd61`, 42/42 activos críticos.
- LAB 24/25; única diferencia `core/access-role-session-owner-v20260728.js`.
### Pipeline
- Se cerraron incidentes `VALIDATOR_STALE` / `PIPELINE_MECHANISM_FAILURE` de fixture, self-scan autorreferencial y checkout superficial.
- Tras repetición de la misma etapa se congelaron cambios funcionales y se diagnosticó el mecanismo antes de verificar de nuevo.
- La seguridad del workflow quedó en owner externo y la comparación histórica usa checkout completo.
### State
- `M5_MEMBERSHIP_PROJECTION_512_STATIC_CLOSED_NEW_RC_READY_FOR_HOSTING`.
- Hosting, runtime y revisión visual requieren autorizaciones independientes.

## [M5-5.0.11] — 2026-07-29 UTC · Runtime smoke stop-line sobre RC f6dfa37e
### Verified
- Package run `30457621192`, job `90595169193`, artifact `8726195633`, digest `sha256:ed9f732c813b3feac10f2bdae1434661ed84cac3d00663d5ee739a4ed23c0a4e`.
- Runtime ejecutado exactamente una vez: run `30457847993`, job `90595950599`, artifact `8726316517`, digest `sha256:61740f99806fc8353d0f2cbddf5a48b8432c27ced33dbb2e5808a94372f4135e`.
- Preflight 17/17; contrato 42/42; snapshots 11/11 antes y 11/11 después.
- Siete conteos y siete digests idénticos; Firestore writes 0; operational writes 0; network write candidates 0.
- Bootstrap normalizado, autenticación y legal alcanzados.
### Root cause
- Primer fallo funcional: `MEMBERSHIP_BOUNDARY_NOT_ACTIVE` antes de vistas por rol.
- Clasificación `FUNCTIONAL_DEFECT` + `DATA_CONTRACT_FAILURE`: identidad Firebase LAB no se proyectaba al contrato membership multirol requerido por Access.
### State
- `M5_RUNTIME_SMOKE_511_FAILED_STOP_LINE_MEMBERSHIP_PROJECTION_MISSING` cerrado.
- Autorización runtime consumida; no hubo segundo navegador.

## [M5-5.0.10] — 2026-07-29 UTC · Hosting LAB RC f6dfa37e + paridad 25/25
### Verified
- Package run `30455383510`, job `90587512533`, artifact `8725278032`, digest `sha256:b4547ef695c7d5973eb578ee4930b1ab5f13a52a2e97f549d08a10014d5e805f`.
- Delivery run `30455636671`, job `90588374673`, artifact `8725398148`, digest `sha256:7fd3d5f8076f77f12435673dd8105666b488984174d448696ce91bcdf26e1824`.
- Preflight 24/24; contrato 22/22; activos públicos 25/25; mismatches 0.
- Hosting deploy executions 1; redeploy 0; Firestore writes 0; runtime/browser false/false.
### State
- `M5_LAB_HOSTING_DELIVERED_AND_25_OF_25_VERIFIED`.

## [M5-5.0.9] — 2026-07-29 UTC · Remediación de causa raíz + RC f6dfa37e
### Fixed
- `index.html` carga `core/academia-static-content-write-policy-v20260729.js` después del store base y antes de la asignación del store Firestore, `seed.js` y los scripts Academia.
- El owner intercepta sincrónicamente `Orbit.store = api`; `lecciones`, `evaluaciones` y `config/academia` versionados se montan en sesión sin llamadas durables.
- Añadido `tools/orbit360-gate-bootstrap-auth-legal-normalized-v20260729.mjs` para normalizar evidencia de scripts string u objeto durante todo el bootstrap.
- El nuevo gate valida el orden runtime real y no solo presencia textual del owner dentro del addendum.
### Verified
- Run `30421741635`, job `90479808034`, artifact `8712155374`, digest `sha256:3c2d18d0bc64a4c7792b95cd96383a7dbb3c0f76f4abb813e5a84f11c538e328`.
- Preflight 15/15; contrato 40/40; fixture de orden/store 19/19; fixture normalizador 7/7.
- `data/store-firestore-lab.local.js` y `core/backend-lab-loader.js` permanecen sin cambios respecto al baseline protegido.
- Cero secrets, Firestore, runtime, navegador, deploy o escrituras operativas.
- Nueva RC `f6dfa37ec1449b627c04cde2caf7d3c43acfe453fb0a7eb73924861bb4e7d324`, activos críticos 42/42.
- LAB 24/25; única diferencia `index.html`.
### State
- `M5_RUNTIME_508_ROOT_CAUSE_REMEDIATION_STATIC_CLOSED_NEW_RC_READY_FOR_LAB_DELIVERY`.
- Static gate consumido. Hosting, runtime y revisión visual bloqueados hasta autorizaciones independientes.

## [M5-5.0.8] — 2026-07-29 UTC · Runtime smoke stop-line sobre RC b25bf275
### Verified
- Package run `30420595908`, job `90476400727`, artifact `8711751664`, digest `sha256:ee2d4ad2c333bd4805dd18bce9622bbd1bc1991e83e34e8298ecbfdab96f62b1`.
- Runtime ejecutado exactamente una vez: run `30420738744`, job `90476816222`, artifact `8711820943`, digest `sha256:8809e9fbd4d9e829453e111ee1fc4b5ef4890cca4cf1200dae501772327adea9`.
- Preflight 15/15; contrato 37/37; snapshots 11/11 antes y 11/11 después.
- Conteos y digests idénticos; Firestore writes 0; operational writes 0.
### Root cause
- `VALIDATOR_STALE` + `PIPELINE_MECHANISM_FAILURE`: rutas parseadas almacenadas como strings mientras el helper esperaba `{path}`.
- `FUNCTIONAL_DEFECT` + `DATA_CONTRACT_FAILURE`: owner Academia cargado tarde; intentos automáticos en `lecciones`, `evaluaciones` y `config` fueron rechazados por Rules.
- `VALIDATOR_STALE` + `PIPELINE_MECHANISM_FAILURE`: el gate estático 5.0.6 no validaba el orden real de `index.html`.
### State
- `M5_RUNTIME_SMOKE_LAB_FAILED_STOP_LINE` cerrado.
- Autorización runtime consumida; navegador no repetido; revisión visual no habilitada.

## [M5-5.0.7] — 2026-07-29 UTC · Hosting LAB RC b25bf275 + paridad 25/25
### Changed
- Entregada exactamente una vez al canal Hosting LAB la RC `b25bf2750548651a719526bc4dadf7662def2255876c4c2e5e32bdf90f93a091`.
- Publicados el preview con runtime canónico, el addendum operativo de Academia y el owner de contenido estático LAB junto con la candidata completa.
- El validador de readiness usa el cierre durable 5.0.6 y trata el fixture efímero de Academia como evidencia opcional.
### Verified
- Package run `30417610407`, job `90467411035`, artifact `8710708337`, digest `sha256:4c861ebebcedb84bee5a31a797845b9edb2a5df15fd935fb945f992ed09a4307`.
- Delivery run `30417743516`, job `90467807470`, artifact `8710762943`, digest `sha256:eca16e06d89a9accb29c98a7d36ed2719bac869fab451f87165c81e0da845669`.
- Preflight 24/24; contrato Hosting 35/35; deploy executions 1.
- Parity recovery run `30418258733`, job `90469348278`, artifact `8710924084`, digest `sha256:accbc8ea34cabe7daf657b1ae2dd7968d76b9d2805c2a03200a6ad04e45d80cf`.
- Activos críticos 42/42; activos públicos 25/25; mismatches 0; remote parity true.
### Fixed
- Tres `PIPELINE_MECHANISM_FAILURE` de ensamblaje/cierre fueron corregidos sin segundo deploy.
### State
- `M5_LAB_HOSTING_DELIVERED_AND_25_OF_25_VERIFIED`.

## [M5-5.0.6] — 2026-07-29 UTC · Remediación estática Academia + RC b25bf275
### Fixed
- Separado el contenido estático versionado de Academia de las mutaciones durables mediante `core/academia-static-content-write-policy-v20260729.js` v`20260729.2`.
- `ays-lab-preview.html` separa revisión visual/PWA `20260723-10` de runtime backend `20260717-2`.
- Loader y store LAB protegidos permanecen intactos.
### Verified
- Package run `30415573496`; request run `30415732795`; artifact final `8710079365`.
- Preflight 24/24; contrato estático 26/26; fixtures Academia 18/18.
- Nueva RC `b25bf275…`, activos críticos 42/42.

## [M5-5.0.5] — 2026-07-29 UTC · Primer runtime stop-line
### Verified
- Runtime ejecutado exactamente una vez: run `30413481948`, job `90454714725`, artifact `8709301142`.
- Preflight 17/17, contrato 29/29, snapshots antes/después 11/11.
- Firestore writes 0; operational writes 0; network write candidates 0.
### State
- Autorización consumida; navegador no repetido.

## [M5-5.0.4] — 2026-07-29 UTC · Entrega Hosting LAB RC post-Access
### Changed
- Entregada una sola vez la RC `d90ec601d17c8e750cbba6f19197d3f906b29a1377817f53fb73f0779e843045`.
### Verified
- Run `30411375732`; job `90447991314`; artifact `8708510538`.
- Preflight 16/16; contrato 31/31; paridad 24/24.
- Cero Firestore, navegador, Functions, Rules, producción, `main`, merge o Pólizas.

## [M4-4.2.11] — 2026-07-28 · Corrección durable 61 clientes GT/GTQ + cierre M4
### Changed
- Aplicadas exactamente 61 correcciones autorizadas: `pais=GT`, `moneda=GTQ`.
- Los otros 353 clientes conservaron digest idéntico antes/después.
### Verified
- Preflight 27/27; contrato 43/43; run `30397573914` SUCCESS.
- Conteos preservados: 414 clientes / 26 aseguradoras; moneda faltante 0; target-only 0/0.
- Sin escrituras de Aseguradoras, configuración, memberships, Rules, Hosting, Functions, producción, `main` o merge.
### State
- M4: `M4_CLOSED_SUCCESS`.
- Pólizas permanece bloqueado y requiere fuente real vigente específica.

## [1.93.0] — 2026-07-03 · Consolidado v1.56–v1.93
