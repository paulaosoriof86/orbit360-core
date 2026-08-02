# Gate 7.11 — referencia vigente

Fecha: 2026-08-02  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Estado rector

```text
GATE711_RELEASE_CRITICAL_STATIC_PASS_CLOSED
CRM_OPS_LEADS_RUNTIME_READONLY_PENDING
ACADEMIA_STATIC_INTEGRITY_PRESENT
ACADEMIA_CONTENT_RUNTIME_NONBLOCKING
CLOUD_CLAUDE_PACKAGE_DOCUMENTED_NOT_SENT
HOSTING_DEPLOY_NOT_EXECUTED
PRODUCTION_NOT_EXECUTED
```

## Producto canónico acumulativo

```text
productHead: 997fca628f95dd397dba347700a6bc644fe840f0
canonicalSnapshotDigest: 19e1927d39f6b713ee12504f8762bc42ead9de6e365bb0f12162d2a0c8f8469b
cumulativeManifestDigest: 3d25a83218a4373513e1fff24ea9b12817d4c47be0fad08777e7f94867b3f676
trackedFileCount: 309
singleReadOwner: Orbit.store
```

Conteos operativos esperados:

```text
clientes: 430
aseguradoras: 30
pólizas: 1,373
vehículos: 1,032
recibos esperados: 1,294
cartera: 673
cobros: 5
asesores: 7
```

## Decisión de alcance

Se conserva una sola candidata acumulativa. No se permite shell reducido, candidata paralela ni aprobación humana fragmentada.

El bloqueo release-critical del Gate 7.11 es:

- shell, router, auth, legal, multirol, scopes y `Orbit.store`;
- Cliente 360 y Aseguradoras;
- Pólizas y Vehículos;
- Recibos esperados, Cartera y Cobros;
- Ops;
- Leads;
- responsive Dirección desktop, Operativo tablet y Asesor móvil;
- estados honestos, cero copy técnico y cero intentos de escritura.

Academia permanece dentro del producto y debe conservar integridad estática y no romper owners compartidos. Completar o regenerar todas sus lecciones no bloquea esta salida. El antiguo focused runtime de Academia fue retirado del camino crítico.

## Cierre estático release-critical

Ejecución final:

```text
run: 30771933766
job: 91560447718
artifact: 8840787308
artifactDigest: sha256:0c99399ed79fa6036128a6343a70ade6101d4a61aef7e5e6dd561ae8514a28f6
requestCommit: 61560bccdbec034c11983603f3f15b0feff58fa2
status: GATE711_RELEASE_CRITICAL_STATIC_PASS
classification: GO_STATIC_RELEASE_CRITICAL_CRM_OPS_LEADS
checks: 38/38
product freeze: PASS
```

Capacidades utilizadas:

```text
secrets: no
Firestore read/write: 0/0
runtime/browser: no/no
deploy/Hosting: no/no
production/main/merge: no/no/no
```

## Validator stale corregido

La ejecución `30771793126` obtuvo 37/38 y falló únicamente porque el validador exigía el nombre local `col.def.nombre`, mientras el owner vigente usa `c.def.nombre` dentro de `board.find(...)`.

Clasificación definitiva: `VALIDATOR_STALE`.

El producto quedó congelado. Solo se corrigió la aserción para verificar el contrato semántico `.def.nombre === 'Emisiones'`. La ejecución fallida está consumida y no fue reintentada.

## Cloud / Claude / Academia

El ledger acumulado vigente es:

`SINCRONIZACION-CLOUD-CLAUDE-ACUMULADA-20260802.md`

Estado verificable:

```text
Hosting posterior al root fix: NO EJECUTADO
paquete Claude/Cloud reutilizable: NO ENVIADO
datos reales A&S: NO ENVIADOS
secretos/credenciales: NO ENVIADOS
```

El próximo paquete externo deberá ser un delta sanitizado. Incluirá arquitectura, UX, patrones reutilizables y actualizaciones de Academia; excluirá backend protegido, writers, datos reales, credenciales, requests, lifecycles y workflows de deploy. Ese despacho no bloquea la visualización ni la aprobación acumulativa de CRM/Ops/Leads.

## Aprobación humana

```text
Clientes: aprobado previamente y conservado como baseline
Aseguradoras: baseline acumulativo
Pólizas: pendiente
Vehículos: pendiente
Recibos: pendiente
Cartera: pendiente
Cobros: pendiente
Ops: pendiente
Leads: pendiente
```

La revisión siguiente debe ser una sola visualización acumulativa sobre el mismo descendiente auditado.

## Documentación vigente

1. `CIERRE-STOP-RETRY-GATE711-ACADEMIA-OWNER-BOOTSTRAP-20260802.md`
2. `CIERRE-VALIDATOR-STALE-GATE711-OPS-BRIDGE-20260802.md`
3. `SINCRONIZACION-CLOUD-CLAUDE-ACUMULADA-20260802.md`
4. `tools/orbit360-gate711-release-critical-scope-v20260802.json`
5. `tools/orbit360-validator-lifecycle-contract-gate711-release-critical-static-v20260802.json`

## Siguiente frontera exacta

Preparar y, únicamente con autorización explícita de riesgo, ejecutar un solo macro read-only sobre el producto `997fca628f95dd397dba347700a6bc644fe840f0`:

1. preflight contractual obligatorio antes de secrets;
2. identidad existente;
3. snapshot antes;
4. checkout exacto servido localmente;
5. runtime acumulativo CRM;
6. runtime Ops/Leads por Dirección, Operativo y Asesor;
7. snapshot después idéntico;
8. evidencia y capturas sanitizadas;
9. cero escrituras, reimportación, deploy o producción.

No incluye focused runtime de Academia y no admite microautorizaciones. Después del PASS corresponde una única revisión visual humana acumulativa y, solo luego, un macro separado de go-live con autorización productiva explícita.
