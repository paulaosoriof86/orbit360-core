# Changelog · Orbit 360 Plataforma

Formato basado en *Keep a Changelog*. Construcción greenfield; el estado operativo vigente se mantiene en la rama obligatoria y PR #5 draft/open, sin merge ni producción salvo autorización explícita.

## [M5-5.0.7] — 2026-07-29 UTC · Hosting LAB RC b25bf275 + paridad 25/25
### Changed
- Entregada exactamente una vez al canal Hosting LAB la RC `b25bf2750548651a719526bc4dadf7662def2255876c4c2e5e32bdf90f93a091`.
- Publicados el preview con runtime canónico, el addendum operativo de Academia y el owner de contenido estático LAB junto con la candidata completa.
- El validador de readiness ahora usa el cierre durable 5.0.6 y trata el fixture efímero de Academia como evidencia opcional.
### Verified
- Package run `30417610407`, job `90467411035`, artifact `8710708337`, digest `sha256:4c861ebebcedb84bee5a31a797845b9edb2a5df15fd935fb945f992ed09a4307`.
- Delivery run `30417743516`, job `90467807470`, artifact `8710762943`, digest `sha256:eca16e06d89a9accb29c98a7d36ed2719bac869fab451f87165c81e0da845669`.
- Preflight 24/24; contrato Hosting 35/35; deploy executions 1.
- Parity recovery run `30418258733`, job `90469348278`, artifact `8710924084`, digest `sha256:accbc8ea34cabe7daf657b1ae2dd7968d76b9d2805c2a03200a6ad04e45d80cf`.
- Contrato de recuperación 20/20; activos críticos 42/42; activos públicos 25/25; mismatches 0; remote parity true.
- Cero Firestore reads/writes, cero escrituras operativas, cero runtime/browser, cero Functions/Rules/producción/main/merge/Pólizas.
### Fixed
- `PIPELINE_MECHANISM_FAILURE`: el primer package se ejecutó antes de activar el router 5.0.7; no accedió a secretos ni desplegó.
- `PIPELINE_MECHANISM_FAILURE`: la revalidación posterior al deploy exigía un fixture efímero ausente; el deploy ya había pasado y no se repitió.
- `PIPELINE_MECHANISM_FAILURE`: el contrato inicial de recuperación confundía un campo sanitizado con una referencia a Secrets; falló antes de consultar LAB y fue corregido de forma focal.
### State
- `M5_LAB_HOSTING_DELIVERED_AND_25_OF_25_VERIFIED`.
- Autorización Hosting y recuperación de paridad consumidas; redeploy no ejecutado.
- Runtime smoke y revisión visual continúan bloqueados hasta autorizaciones independientes.

## [M5-5.0.6] — 2026-07-29 UTC · Remediación estática Academia + nueva RC
### Fixed
- Separado el contenido estático versionado de Academia de las mutaciones durables en LAB mediante `core/academia-static-content-write-policy-v20260729.js` v`20260729.2`.
- Cursos, lecciones, evaluaciones, seed y marcadores de contenido se montan transitoriamente en sesión; progreso, certificaciones, cursos creados y acciones operativas explícitas permanecen durables.
- `ays-lab-preview.html` separa la revisión visual/PWA `20260723-10` del runtime backend canónico `20260717-2`.
- `core/backend-lab-loader.js` fue restaurado exactamente a su baseline; `data/store-firestore-lab.local.js` no cambió.
### Verified
- Package run `30415573496`, job `90461241309`, artifact `8710028296`, digest `sha256:3ae2d78a5239ed5be90ebb7ef87ec4148ce0baa84b59ff8de28faf2cf44e4495`.
- Request run `30415732795`, job `90461724776`, artifact `8710079365`, digest `sha256:7d28bc0a43e30353a93c4aae975a87636e01f02e0f32cacfa5c4ef905a90cf1c`.
- Preflight 24/24; contrato estático 26/26; fixtures Academia 18/18.
- Cero secrets, Firestore, runtime, navegador, deploy o escrituras operativas.
- Nueva RC `b25bf2750548651a719526bc4dadf7662def2255876c4c2e5e32bdf90f93a091`, activos críticos 42/42.
- LAB 22/25: preview y addendum Academia con hash anterior; nuevo owner Academia aún no publicado.
### State
- `M5_RUNTIME_SMOKE_REMEDIATION_STATIC_CLOSED_NEW_RC_READY_FOR_LAB_DELIVERY`.
- Gate estático consumido.

## [M5-5.0.5] — 2026-07-29 UTC · Runtime smoke stop-line
### Verified
- Runtime smoke ejecutado exactamente una vez: run `30413481948`, job `90454714725`, artifact `8709301142`.
- Preflight 17/17, contrato 29/29, snapshots antes/después 11/11.
- Conteos y digests permanecieron idénticos; Firestore writes 0, operational writes 0, network write candidates 0.
### Fixed
- Clasificada la causa Academia como `FUNCTIONAL_DEFECT` + `DATA_CONTRACT_FAILURE`: contenido estático intentaba `Orbit.store.insert/update` durante bootstrap LAB.
- Clasificada la deriva runtime como `VALIDATOR_STALE` + `PIPELINE_MECHANISM_FAILURE`: revisión visual confundida con runtime backend.
### State
- `M5_RUNTIME_SMOKE_LAB_FAILED_STOP_LINE` cerrado.
- Autorización runtime consumida; no se repitió el navegador.

## [M5-5.0.4] — 2026-07-29 UTC · Entrega Hosting LAB RC post-Access
### Changed
- Entregada una sola vez al canal Hosting LAB la RC `d90ec601d17c8e750cbba6f19197d3f906b29a1377817f53fb73f0779e843045`.
- Publicados `index.html`, taxonomía productiva de roles y owner fail-closed de sesión/selector junto con el resto de la candidata.
- Corregido el generador de resumen del workflow: `??` ya no se mezcla con `||` sin paréntesis.
### Verified
- Run `30411375732`; job `90447991314`; artifact `8708510538`.
- Digest: `sha256:fbe4ba382fe6d51294b2a08f17e2ba48a35e8b36dd0973303943cef8c631e1ec`.
- Preflight canónico 16/16; contrato ejecutable 31/31.
- Activos críticos 41/41; paridad pública LAB 24/24; cero diferencias.
- Cero Firestore, escrituras operativas, navegador, Functions, Rules, producción, `main`, merge o Pólizas.
### Fixed
- `PIPELINE_MECHANISM_FAILURE` posterior al deploy: el status rojo fue causado exclusivamente por una expresión inválida en el resumen sanitizado; Hosting y la revalidación ya habían pasado.
- No se ejecutó un segundo deploy; la autorización quedó consumida.
### State
- M5 5.0.4: `M5_LAB_HOSTING_DELIVERED_AND_24_OF_24_VERIFIED`.

## [M4-4.2.11] — 2026-07-28 · Corrección durable 61 clientes GT/GTQ + cierre M4
### Changed
- Aplicadas exactamente 61 correcciones autorizadas de Clientes: `pais=GT`, `moneda=GTQ`.
- Escritura atómica confirmada con 61 snapshots durables, 61 eventos append-only y 61 updates de cliente.
- Los otros 353 clientes conservaron digest idéntico antes/después.
- Moneda faltante restante: 0; conteos preservados: 414 clientes / 26 aseguradoras; overlay target-only 0/0.
### Verified
- Preflight canónico: 27/27 PASS.
- Contrato ejecutado: 43/43 PASS.
- Run 30397573914: SUCCESS.
- Rollback exacto disponible desde 61 snapshots; no ejecutado porque el post-write fue íntegramente verde.
- Sin escrituras de Aseguradoras, configuración, memberships, Rules, Hosting, Functions, producción, `main` o merge.
### State
- M4: `M4_CLOSED_SUCCESS`.
- Pólizas permanecen bloqueadas y requieren fuente real actual específica cuando llegue su bloque; la hoja histórica de producción no es sustituto válido.

## [1.93.0] — 2026-07-03 · Consolidado v1.56–v1.93
> Entrada consolidada para realinear el CHANGELOG con la bitácora viva (`docs/BITACORA-CAMBIOS.md`).

### Contabilidad y Finanzas
- **Regla contable recaudo ≠ `finmov`** (v1.83): el pago de póliza del cliente es recaudo comercial, no movimiento de caja.
- **Factura a aseguradora = CxC, no caja**: el `finmov` de ingreso solo nace al cobrar.
- **Conciliación de planillas de comisión**: compara esperado vs registrado.
- **Config fiscal multi-tenant**: `tenant.paisesCfg` es fuente única de IVA/moneda/gastos por país.

### Arquitectura y saneamiento
- **Sin `localStorage` directo en módulos**: capa `pref/setPref`; logo white-label vía `Orbit.tenant`.
- **IA centralizada** en `Orbit.ia.complete`.
- **Seed 100% ficticio / identidad ficticia**.

### Módulos
- Portal, Ops, Siniestros, Renovaciones, Insights, Pólizas, Historial, Reportes, Comisiones y Academia profundizados en el prototipo comercializable.
