# CORTE FORENSE ANTIBUCLE — GO-LIVE FASE A — 2026-08-14

Fecha: 2026-08-14  
Proyecto: Orbit 360 / A&S  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Source HEAD auditado antes de este checkpoint: `4ede3e785cb2cc889a7c11c2d9e2030c7af20b64`

## 1. Propósito

Este archivo es el puntero de reanudación obligatorio para el bloqueo de go-live Fase A. Evita que una nueva conversación vuelva a diagnosticar HostDime, base de datos, Block 1, Finance o el paquete desde cero.

Precedencia: reglas maestras/addenda -> estado vivo PR/HEAD -> este checkpoint para el incidente de go-live -> evidencia del último workflow.

## 2. Decisiones congeladas

- HostDime NO es gate del paquete ni del cierre técnico actual.
- `app.aysseguros.com` y la carga manual al hosting se atienden después de materializar y certificar el paquete.
- Finance y datos financieros posteriores al corte definido no bloquean este primer go-live.
- No reimportar Clientes/Aseguradoras para resolver visualización, bootstrap, login, routing, cache o gate.
- No `main`, no merge.
- No producción/deploy nuevo hasta cerrar fuera de producción la causa actual.
- No crear otro plan general ni reabrir diagnósticos cerrados.

## 3. Estado real verificado

### Rama / documentación

- La rama siguió avanzando durante agosto, mientras README/CHANGELOG/PENDIENTES conservan cortes anteriores.
- El estado operativo no puede reconstruirse desde esos resúmenes viejos sin consultar HEAD + Actions.

### Artefacto

Existen dos estados distintos que no deben volver a llamarse indistintamente "paquete productivo":

1. `orbit360-artifacts/fase-a-product/` versionado en Git: conserva un entrypoint fail-closed histórico y NO es el paquete manual final.
2. Artefacto ensamblado por `tools/orbit360-fase-a-build-product-artifact-v20260813.mjs`: se materializa durante el workflow desde el `orbit360-platform/index.html` canónico, sustituye store/auth/bootstrap por la ruta productiva read-only y elimina LAB/seed/fallback. Este artefacto es efímero hasta que se publique como ZIP/artefacto durable.

Decisión: no buscar otro paquete. El paquete manual definitivo se construirá una sola vez desde el source HEAD certificado y se publicará con hashes/manifiesto después de PASS local sintético.

## 4. Última ejecución vigente

Workflow: `Orbit360 Fase A Product Local Synthetic 20260814`  
Run: `31773511066`  
Source HEAD: `4ede3e785cb2cc889a7c11c2d9e2030c7af20b64`  
Resultado: FAIL seguro, fuera de producción.

PASS antes del fallo:

- gate canónico source;
- ensamblaje de artefacto;
- entrypoint funcional y login DOM presentes;
- runtime productivo enlazado;
- pre-auth store fail-closed;
- config pública materializada;
- identidad smoke existente resuelta;
- cero escrituras;
- cero deploy;
- producción intacta.

Primer síntoma real:

`PRODUCT_APP_NOT_STARTED:PRODUCT_READONLY_BOOTSTRAP_NOT_READY`

Estado observado:

- etapa: `login`;
- pre-auth store: `waiting-auth`;
- app: initialized=true, started=false, routerStarted=false;
- user/product projection: null;
- clientes visibles: 0;
- aseguradoras visibles: 0;
- loginError=true;
- Firestore writes=0;
- Auth writes=0;
- operational writes=0;
- deployExecuted=false;
- productionTouched=false.

## 5. Causa raíz que YA puede clasificarse

Existe un `PIPELINE_MECHANISM_FAILURE` de observabilidad en el smoke actual:

- `backend-product-readonly-bootstrap-p0.js` conserva fase y `status.errors` sanitizados cuando bloquea;
- `product-app-p0.js` reduce cualquier respuesta `ok:false/ready:false` a `PRODUCT_READONLY_BOOTSTRAP_NOT_READY`;
- el synthetic smoke captura el error genérico de Product App, pero no conserva el último evento sanitizado `orbit:product-readonly-bootstrap` ni la fase/error interno del bootstrap;
- por tanto todavía NO es válido declarar el fallo subyacente como FUNCTIONAL_DEFECT, DATA_CONTRACT_FAILURE o ENVIRONMENT_FAILURE.

No se corrige producto a ciegas.

## 6. Siguiente acción exacta — única

Modificar únicamente el harness `tools/orbit360-fase-a-product-local-synthetic-smoke-v20260814.mjs` para:

1. escuchar y conservar el último evento sanitizado `orbit:product-readonly-bootstrap`;
2. guardar `phase`, `ready` y `errors` sanitizados;
3. capturar URL/ruta de cualquier 404 o request fallido sin secretos;
4. NO modificar producto, datos, Auth, store, membership, Rules, HostDime ni producción.

Después ejecutar UNA sola vez el mismo workflow local sintético.

Resultado esperado de ese único run:

- si PASS: materializar inmediatamente ZIP productivo durable + manifest/hashes;
- si FAIL: clasificar el primer error interno real y corregir solo esa capa; no crear otro workflow/plan/request.

Si reaparece la misma etapa/familia después de corregir la capa demostrada: `STOP_RETRY` inmediato.

## 7. Ruta cerrada hasta materialización

`instrumentar harness -> mismo synthetic local una vez -> corregir una sola capa si aplica -> mismo synthetic PASS -> ZIP durable + hashes -> carga manual HostDime -> E2E sobre dominio final`

HostDime entra solo en el penúltimo tramo. No puede volver a abrirse antes como diagnóstico o blocker.

## 8. Regla de continuidad de conversación

Ante corte de sesión, la conversación siguiente NO hace recap general. Debe leer en este orden:

1. este checkpoint;
2. HEAD actual de la rama;
3. último run de `Orbit360 Fase A Product Local Synthetic 20260814`;
4. ejecutar `Siguiente acción exacta` si sigue vigente.

No usar README, CHANGELOG, PENDIENTES o PR body como puntero de reanudación si contradicen evidencia posterior.

## 9. Estado final de este corte

- producto: congelado;
- datos: intactos;
- HostDime: diferido/no bloqueante;
- paquete manual definitivo: pendiente de materialización, no pendiente de búsqueda;
- blocker actual: bootstrap productivo read-only posterior al login, con detalle interno todavía oculto por el harness;
- clasificación inmediata: `PIPELINE_MECHANISM_FAILURE / OBSERVABILITY_GAP`;
- próxima acción: una sola modificación del harness + un solo synthetic local;
- producción: no tocar hasta PASS fuera de producción.
