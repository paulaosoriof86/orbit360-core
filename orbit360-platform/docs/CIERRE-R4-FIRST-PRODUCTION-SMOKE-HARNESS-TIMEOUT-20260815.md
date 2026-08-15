# CIERRE R4 · PRIMER SMOKE PRODUCTIVO · TIMEOUT DEL HARNESS · 2026-08-15

Estado: **FRONTERA 1 CERRADA / NO VÁLIDA PARA CLASIFICAR PRODUCTO / RECUPERACIÓN SOURCE-ONLY ACTIVA**.

Rama: `ays/backend-tenant-lab-v99-20260703`  
PR #5: draft/open · sin merge  
R1/R2/R3: cerrados.

## Contexto

El paquete certificado R3 fue publicado manualmente en `https://app.aysseguros.com` y el login productivo es visible.

Tras un intento humano con mensaje genérico de login se ejecutó una única frontera automatizada read-only para clasificar Auth/tenant/membership y, si pasaba, continuar con Dirección/Operativo/Asesor.

## Frontera 1

- workflow: `Orbit360 R4 Production Readonly Smoke 20260815`;
- run: `31903805595`;
- job: `95058471779`;
- HEAD: `5c12be143b6241a0af335d78f227c0ad14b05008`;
- browser start: `2026-08-15T19:24:57Z`;
- cancellation: `2026-08-15T19:44:28Z`.

PASS previos:

- canonical source gate;
- Playwright/Firebase Admin install;
- protected secret binding;
- identity resolver read-only;
- `eligibleSmokeIdentityCount=1`;
- `authUserCount=9`;
- `membershipCount=8`;
- required roles present;
- resolver Firestore writes `0`;
- resolver operational writes `0`.

## Resultado browser

El step de navegador permaneció activo hasta que GitHub canceló el job por timeout.

El upload posterior encontró solo 2 archivos:

1. `preflight-sanitizado.json`;
2. `m6-product-smoke-identity-summary.json`.

No se creó `r4-production-readonly-smoke-v20260815.json`.

El log no contiene ningún marcador emitido por el script entre su arranque y la cancelación. Al limpiar procesos, GitHub terminó tanto `node` como `headless_shell`.

## Causa raíz

Clasificación:

`PIPELINE_MECHANISM_FAILURE / R4_HARNESS_UNBOUNDED_BROWSER_AWAIT_AND_FINAL_ONLY_EVIDENCE`

El harness tenía operaciones asíncronas ejecutadas dentro del navegador sin un watchdog de etapa propio y solo persistía el JSON diagnóstico al finalizar. Entre ellas existen `fetch()`/`page.evaluate(async ...)` que pueden permanecer pendientes más allá de los timeouts de navegación convencionales.

Consecuencia: el job global expiró antes de que el harness pudiera indicar si llegó a manifest, login, Auth, membership, tenant, activación o rutas.

## Lo que NO demuestra esta corrida

No demuestra:

- contraseña incorrecta de Paula;
- contraseña incorrecta del actor smoke;
- email no verificado;
- membership defectuosa;
- tenant defectuoso;
- fallo funcional de Inicio/Cliente 360/Aseguradoras/Ops/Leads;
- PASS del smoke.

Por tanto, el intento humano de Paula permanece sin clasificación automática válida.

## Anti-bucle aplicado

No se hizo rerun.

El workflow quedó refrozen en source-only con HEAD `73a9cfc6d0ae6d430919aa32fcc0be7871b94740`.

Run de control `31904861893`: **SUCCESS**.

- gate: PASS;
- install: skipped;
- secrets: skipped;
- identity: skipped;
- browser: skipped.

## Rootfix requerido

Sin tocar producto:

1. deadline global interno inferior al timeout del job;
2. wrapper `withTimeout`/`AbortController` para operaciones async browser-side;
3. checkpoints sanitizados persistidos incrementalmente;
4. marcador `currentStage` antes de cada operación crítica;
5. escribir evidencia parcial al expirar una etapa;
6. garantizar cierre del browser en `finally`;
7. assertions source-only que prueben presencia de watchdog/checkpoints y ausencia de secretos/PII en logs.

Solo después de PASS source-only y sincronización documental se evalúa una segunda frontera productiva. Misma familia dos veces implica `STOP_RETRY`.

## Avance

Permanece:

- funcional: 100%;
- técnico: 75%;
- gates: 67% (2/3).
