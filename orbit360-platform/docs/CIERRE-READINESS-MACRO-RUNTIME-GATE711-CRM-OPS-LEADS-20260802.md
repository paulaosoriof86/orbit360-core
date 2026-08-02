# CIERRE READINESS — MACRO RUNTIME GATE 7.11 / CRM + OPS + LEADS

Fecha: 2026-08-02  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate único: `block7-canonical-runtime-cumulative-visual-lab-v20260801`  
Producto congelado: `997fca628f95dd397dba347700a6bc644fe840f0`

## 1. Decisión rectora

La salida crítica conserva una sola candidata acumulativa. No se crea shell reducido, candidata paralela, aprobación fragmentada ni gate de cierre adicional.

La ruta crítica vigente es:

```text
shell + router + auth + legal + multirol + scopes + Orbit.store
→ Cliente 360 + Aseguradoras
→ Pólizas + Vehículos
→ Recibos esperados + Cartera + Cobros
→ Ops + Leads
→ una sola revisión visual humana acumulativa
```

Academia permanece incluida en la candidata y conserva integridad estática obligatoria. Su contenido pedagógico completo y su focused runtime dejan de ser prerrequisito para esta salida, salvo que el módulo rompa un owner compartido del producto.

## 2. Paquete runtime preparado

El macro inerte quedó compuesto por:

- `tools/orbit360-validar-gate711-release-critical-runtime-v20260802.mjs`;
- `.github/workflows/orbit360-gate711-release-critical-runtime-v20260802.yml`;
- `.github/orbit360-templates/gate711-release-critical-runtime-request-template-v20260802.json`;
- `tools/orbit360-gate711-release-critical-runtime-lifecycle-template-v20260802.json`;
- `tools/orbit360-validar-gate711-runtime-package-readiness-v20260802.mjs`.

El paquete no contiene autorización activa. El workflow solo se activa con un request nuevo, inmutable y autorizado explícitamente.

## 3. Secuencia única prevista

```text
preflight contractual obligatorio antes de credenciales
→ identidad LAB existente read-only
→ snapshot canónico inicial
→ checkout exacto servido localmente, sin deploy
→ una sola sesión de navegador
→ legal una sola vez
→ CRM + Ops + Leads por rol y viewport
→ snapshot canónico final
→ comparación exacta antes/después
→ evidencia y capturas sanitizadas
```

No contiene focused runtime de Academia, segundo navegador, segunda aceptación legal, reimportación, escritura, deploy, preview ni producción.

## 4. Cobertura acumulativa

### Dirección / desktop

- Cliente 360;
- Aseguradoras;
- Pólizas;
- Ops;
- Leads.

### Operativo / tablet

- Cliente 360;
- Pólizas;
- Ops;
- Leads.

### Asesor / móvil

- Cliente 360;
- Pólizas;
- Leads;
- restricción honesta de Ops.

Cobertura visual prevista: 14 capturas sanitizadas dentro de la misma sesión y la misma candidata.

## 5. Contrato de datos y store

El runtime exigirá:

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

También debe comprobar:

- único read owner: `Orbit.store`;
- API preservada: `all/get/where/insert/update/remove/_emit`;
- write guard sin llamadas;
- cero errores de página;
- cero copy técnico visible;
- responsive sin desbordamiento horizontal;
- snapshots fuente y destino idénticos antes y después.

## 6. Primer readiness y causa raíz

Ejecución:

```text
run: 30772197420
job: 91561171817
artifact: 8840873512
digest: sha256:92cabe9c606b1c5639708b83ed940702e36dbf8e406cb082cd4c962dbaf1b8f4
checks: 37/38
failedCheck: RUNTIME_SINGLE_SESSION
```

Clasificación definitiva: `VALIDATOR_STALE`.

El validador contó dos apariciones de `settleLegal(page)` porque sumó la definición de la función y su única invocación. El macro real sí contenía:

- un solo `chromium.launch`;
- un solo `browser.newContext`;
- una sola definición de `settleLegal`;
- una sola llamada `await settleLegal(page)`.

No existió defecto del producto ni del macro. No se usaron credenciales, Firestore, navegador o runtime. La ejecución quedó consumida y no fue repetida.

## 7. Corrección del validador

La aserción ahora distingue semánticamente:

```text
una definición de settleLegal
+
una invocación de settleLegal
```

No se modificó ningún archivo de producto, dato, módulo, store, auth, backend protegido, estilo o `index.html`.

## 8. Readiness final cerrado

Ejecución final:

```text
run: 30772261072
job: 91561337917
artifact: 8840893567
digest: sha256:279ca4a885e9c35c7e263f958da7d43cfed8ef590ff40a8630fc280a8cc1cbab
requestCommit: ce109e0b1d2bebf618da9bfc8470dbfc7249621c
status: GATE711_RUNTIME_PACKAGE_READINESS_PASS
classification: GO_STATIC_RUNTIME_PACKAGE_CRM_OPS_LEADS
checks: 38/38
```

Capacidades utilizadas en este cierre:

```text
autorización runtime activa: no
credenciales/secrets: no
Firestore reads/writes: 0/0
runtime/browser: no/no
Cloud/Claude enviado: no
deploy/Hosting: no/no
producción/main/merge: no/no/no
```

## 9. Cloud / Claude / Academia

El ledger vigente es `SINCRONIZACION-CLOUD-CLAUDE-ACUMULADA-20260802.md`.

Estado honesto al cierre:

```text
Hosting posterior al root fix: NO EJECUTADO
paquete reutilizable Cloud/Claude: NO ENVIADO
datos reales: NO ENVIADOS
secretos o credenciales: NO ENVIADOS
```

El paquete futuro debe incluir patrones reutilizables, arquitectura, UX, copy y actualizaciones de Academia; debe excluir datos reales, secretos, writers, backend protegido, lifecycles consumidos y workflows de deploy.

## 10. Estado y siguiente acción exacta

```text
release-critical static: PASS 38/38
runtime package readiness: PASS 38/38
producto: congelado
Academia focused runtime: retirado del camino crítico
Cloud package: documentado, no enviado
runtime real: pendiente
visualización acumulativa: pendiente
producción: no ejecutada
```

No corresponde otra auditoría, readiness, validador paralelo ni retorno a Academia.

La única frontera siguiente es materializar, con una autorización explícita, un request y lifecycle nuevos a partir de los templates ya auditados y ejecutar una sola vez el macro runtime read-only acumulativo de CRM/Ops/Leads. Si obtiene PASS, corresponde inmediatamente la revisión visual humana acumulativa. El deploy productivo sigue siendo un macro separado y requiere autorización explícita de producción.
