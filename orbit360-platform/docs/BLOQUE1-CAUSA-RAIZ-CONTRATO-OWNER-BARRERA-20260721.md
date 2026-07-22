# Bloque 1 — Causa raíz del contrato owner frente a la barrera visual

Fecha: 2026-07-21  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate: `block1-client360-insurers-lab-v20260717`  
Contrato: `1.0.35`

## Clasificación

- `VALIDATOR_STALE`
- `PIPELINE_MECHANISM_FAILURE` como causa contribuyente de sincronización incompleta

## Evidencia previa

Run estático: `29884526054`  
Artifact: `8516035806`  
Digest: `sha256:5262e8409a099eedcd04bf2e672cc0846f77bd77b6a8639600580a9d59c942f6`

Resultados preservados:

```text
Preflight contractual: GO_GATE_CONTRACT
Controles contractuales: 1197/1197
Activos críticos locales: 9/9
Sintaxis local: ok
Cierres owner: ok
Integridad local: ok:true
Navegador: no
Deploy: no
Escrituras: no
```

La etapa estática posterior falló al ejecutar `orbit360-platform/tools/orbit360-aseguradoras-owner-contract-v20260717.js`.

## Causa raíz

La barrera visual vigente pertenece al release crítico:

```text
barrierVersion: 20260721.4
criticalRelease: block1-critical-runtime-20260721-4
registryVersion pública estable: 20260721.2
```

Sin embargo, el contrato owner todavía exigía literalmente:

```text
version: '20260721.3'
```

Ese requisito correspondía a la revisión anterior del disparador estructural del directorio. Cuando el release crítico avanzó a `20260721.4`, el producto, Router, PWA, Service Worker, manifiesto y overlay sí se actualizaron, pero el ejecutor del contrato owner conservó la versión anterior.

No existió defecto en la barrera ni en el producto. El validador estaba desfasado respecto del owner real.

## Auditoría completa de la etapa

Se revisaron los tres validadores ejecutados después del manifiesto local:

1. `orbit360-block0-architecture-gate-v20260717.js`: no contiene versiones históricas de la barrera.
2. `orbit360-aseguradoras-owner-contract-v20260717.js`: contenía la única expectativa histórica `20260721.3`.
3. `orbit360-validar-recuperacion-frontend-conocimiento-v20260716.mjs`: no contiene expectativas de versión de la barrera.

Por tanto, la corrección no se limitó a reaccionar al primer error: se auditó toda la etapa y se confirmó que no existe otro contrato histórico equivalente pendiente.

## Corrección

Commit: `a713562cbcece0a640e2c9d64674907b0814fc8d`

El contrato owner ahora exige conjuntamente:

- barrera `20260721.4`;
- release crítico `block1-critical-runtime-20260721-4`;
- versión pública estable del registro `20260721.2`;
- disparador estructural de `.asg-grid`;
- tarjetas inactivas y motivo visible `Inactiva:`;
- prueba de idempotencia 27/27;
- una mutación base, una transformación canónica y cero entregas posteriores;
- cero escrituras.

También actualiza la evidencia de salida para reportar las tres versiones por separado y evitar que una revisión interna vuelva a confundirse con el contrato público estable.

## Alcance preservado

- Archivos funcionales de producto modificados: 0.
- Barrera visual modificada: 0.
- Router modificado: 0.
- Datos modificados: 0.
- Reimportación: no.
- Secrets o bóveda: no.
- Navegador: no.
- Deploy: no.
- Producción: intacta.

## Academia

La Academia M1 `1.225` ya contiene la enseñanza sobre integridad antes del navegador y diferencia entre defecto funcional, contrato y validador obsoleto. Se revisó su cobertura y no se añade una lección duplicada. Este caso queda documentado como evidencia concreta de que la versión interna del owner, la versión pública del registro y el identificador del release deben validarse como dimensiones separadas.

## Siguiente acción exacta

Ejecutar una única validación estática del contrato `1.0.35`. Debe producir:

- `GO_GATE_CONTRACT`;
- manifiesto local `ok:true` para 9/9 activos;
- arquitectura `GO_STATIC_ARCHITECTURE`;
- owner contract `PASS` con barrera `20260721.4`;
- recuperación frontend/conocimiento `ok:true`;
- idempotencia 27/27;
- cero secrets, navegador, Firestore, bóveda, escrituras o deploy.

Solo después podrá autorizarse separadamente un único deploy Hosting LAB y gate final.
