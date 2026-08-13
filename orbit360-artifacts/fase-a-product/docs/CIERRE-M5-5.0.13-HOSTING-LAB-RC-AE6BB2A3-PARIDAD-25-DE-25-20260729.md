# CIERRE M5 5.0.13 — Hosting LAB RC ae6bb2a3 — paridad 25/25

Fecha: 2026-07-29
Repositorio: `paulaosoriof86/orbit360-core`
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open
Gate: `block5-release-candidate-visualization-v20260728`
Contrato: `5.0.13`

## Estado

`M5_LAB_HOSTING_DELIVERED_AND_25_OF_25_VERIFIED`

La autorización explícita para una única entrega Hosting LAB fue consumida. No existe autorización activa para redeploy, runtime, navegador, revisión visual, Firestore, Functions, Rules, producción, main, merge ni Pólizas.

## Release candidate

RC: `ae6bb2a35ce4f03c0353d670218c841e51b57a2461a3ba9e741d8bd7a973fd61`

- activos críticos locales: 42/42;
- activos públicos esperados: 25;
- paridad previa: 24/25;
- mismatch previo único: `core/access-role-session-owner-v20260728.js`;
- paridad posterior: 25/25;
- mismatches posteriores: 0;
- remote parity: true.

## Package previo sin secretos/deploy

- commit: `d437951b0a52766c55df2384163354e4345813cb`
- run: `30461749662`
- job: `90609304405`
- artifact: `8727869333`
- digest: `sha256:e7930733a252aedd2a4df367fadf90b25fbf451b59f2aa21dc4a371f18e00537`
- conclusión: SUCCESS
- secreto: no
- deploy: no
- Firestore: no
- runtime/browser: no/no

## Solicitud inmutable y entrega única

- authorized base: `6706a46c3b40ea3fec43c9512400e099f37eb076`
- request commit: `ff7b03524e91aa160d5ba5f5782f7b729364e497`
- run: `30461951452`
- job: `90610001393`
- artifact: `8727975511`
- digest: `sha256:8c67073aa4ff569d3109d06f37b5a6ee737272db299f01ad447069c19607f633`

Evidencia funcional del run:
- request inmutable: PASS;
- preflight canónico antes de secretos/deploy: PASS;
- contrato: 22/22;
- identidad exclusiva de Hosting LAB: PASS;
- Hosting deploy: ejecutado exactamente 1 vez;
- revalidación pública: PASS;
- activos comprobados: 25/25;
- mismatches: 0;
- Firestore read: false;
- Firestore writes: 0;
- operational writes: 0;
- runtime/browser: false/false;
- Functions/Rules: false/false;
- producción/main/merge: false/false/false;
- Pólizas: false.

## Validador final obsoleto

El job de Actions terminó con conclusión `failure` únicamente después de haber completado correctamente deploy, revalidación y creación del resumen `ok:true`.

Clasificación: `VALIDATOR_STALE`.

Causa exacta: el predicado final de `jq` usó `.pólizas` como identificador; `jq` requiere acceso entre corchetes/comillas para una propiedad Unicode. El resumen previo ya había confirmado:
- `ok:true`;
- `status:M5_LAB_HOSTING_DELIVERED_AND_25_OF_25_VERIFIED`;
- `remoteAssetsMatched:25`;
- `mismatchCount:0`;
- `remoteParity:true`;
- `hostingDeployExecutions:1`;
- `firestoreWrites:0`;
- `operationalWrites:0`.

No se hizo rerun ni segundo deploy. La autorización se consumió antes de corregir el validador. El workflow quedó congelado en `workflow_dispatch` y el predicado fue corregido a `.["pólizas"]` para evitar recurrencia.

## Carriles

### A — frontend / UX / Academia
La RC corregida ya está públicamente entregada en LAB. La revisión visual continúa bloqueada hasta runtime `ok:true`.

### B — backend / seguridad / Orbit.store
Hosting quedó entregado sin tocar Firestore, Rules, Functions ni producción. La membership projection v20260729.3 está ya en paridad pública.

### C — datos A&S
Sin lecturas/escrituras en este bloque. Se preserva baseline: 414 clientes, 26 aseguradoras, 7 asesores, GT/CO 398/16, Persona/Empresa 391/23, moneda faltante 0.

## Claude / Academia

`REPLICABLE_CLAUDE_ACUMULADO`: mantener multirol/scopes derivados de membership/configuración y fail-closed; no hardcodes para satisfacer gates.

`ACADEMIA_ACTUALIZAR`: distinguir entrega funcional exitosa de un `VALIDATOR_STALE` posterior; una validación obsoleta no debe disparar un redeploy ni repetir una operación irreversible.

Backend, secretos, workflows, Firebase y artifacts: `BACKEND_PROTEGIDO_NO_CLAUDE`.

## Siguiente acción exacta

Solicitar autorización explícita independiente para **un único runtime smoke LAB** sobre la misma RC `ae6bb2a35ce4f03c0353d670218c841e51b57a2461a3ba9e741d8bd7a973fd61`, con owner normalizado, snapshots antes/después y cero escrituras.

Solo con evidencia sanitizada `ok:true` se habilita la revisión visual única con Paula antes de cerrar M5.
