# Cierre M5 5.0.32 — Hosting LAB 26/26

Fecha: 2026-07-29  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate: `block5-release-candidate-visualization-v20260728`

## Estado

**M5 5.0.32 Hosting LAB: CERRADO / PASS.**

La candidata vigente es:

`4bf3c8025654f43f6e4af20e5d16115bdc0851352ccddc6f099649405883cf3b`

Contrato de candidata:

- 43 assets críticos;
- 26 assets públicos verificados;
- paridad previa: 24/26;
- paridad posterior: 26/26;
- mismatch posterior: 0;
- Hosting deploy ejecutado exactamente una vez.

## Fuente / baseline

Fuente autoritativa previa:

- `tools/orbit360-m5-release-candidate-control-overlay-531-v20260729.json`;
- `tools/orbit360-m5-hosting-package-input-531-v20260729.json`;
- `tools/orbit360-m5-hosting-evidence-ledger-531-v20260729.json`;
- `tools/orbit360-m5-release-candidate-descriptor-530-v20260729.json`.

Baseline preservado:

- clientes: 414;
- aseguradoras: 26;
- asesores: 7;
- GT/CO: 398/16;
- Persona/Empresa: 391/23;
- missing currency: 0;
- target-only clientes/aseguradoras: 0/0.

No se reimportaron clientes ni aseguradoras y no se modificaron datos del tenant para esta entrega.

## Necesidad

Después de la remediación funcional 5.0.29, `sw.js` y `core/session-multirol-visibility-v20260716.js` no estaban todavía en paridad con Hosting LAB. El control plane 5.0.30 se detuvo después de dos fallos de pipeline antes de deploy. 5.0.31 corrigió estructuralmente la causa raíz separando package input inmutable de evidence ledger append-only.

5.0.32 debía entregar exclusivamente la candidata ya auditada a Hosting LAB y demostrar paridad pública completa sin abrir runtime, Firestore, producción, Functions o Rules.

## Clasificación de causa raíz heredada

`PIPELINE_MECHANISM_FAILURE` en 5.0.30.

Causa: el mismo freeze se utilizaba como precondición inmutable y como evidencia mutable; el primer package enriquecía el freeze y el segundo package rechazaba ese enriquecimiento válido.

Corrección estructural ya cerrada en 5.0.31:

- package input inmutable separado;
- ledger append-only separado;
- contrato puro independiente del ledger;
- fixture `package → evidence enrichment → package` estable.

No se corrigió un síntoma con un tercer package 5.0.30.

## Implementación 5.0.32

### Package estático

Autorización nueva e independiente:

`tools/orbit360-m5-hosting-authorization-532-v20260729.json`

Package:

- commit: `f77e3451fc69c9a9be2136f8803bec46a8868523`;
- run: `30492607881`;
- job: `90713882472`;
- artifact: `8740294701`;
- digest: `sha256:64088d0fd5e6f00dba393194329e16a3120f52d9664176811032ca63eeb310c0`;
- resultado: PASS;
- secretos: no leídos;
- deploy: no ejecutado;
- paridad previa confirmada: 24/26;
- mismatches exactos: `sw.js` y `core/session-multirol-visibility-v20260716.js`.

El workflow de package quedó congelado después del PASS.

### Request inmutable

Request:

`tools/orbit360-m5-hosting-request-532-v20260729.json`

Binding:

- authorized base commit: `6179fc28cafb560fff8827aa27ab5242322d2af8`;
- request commit: `8b4962c7a5fb2be93e64b27eec49791435edecdb`;
- candidata exacta: `4bf3c8025654f43f6e4af20e5d16115bdc0851352ccddc6f099649405883cf3b`;
- allowed executions: 1;
- target exclusivo: proyecto `ays-orbit-360-lab`, channel `orbit360-ays-lab`.

### Entrega Hosting LAB

Evidencia:

- run: `30492948609`;
- job: `90715009262`;
- artifact: `8740453250`;
- digest: `sha256:1cfdad19adb237d3377c99aa5ba69be52c58acea43c2e94566b49a45d2124447`;
- status: `M5_HOSTING_532_DELIVERED_AND_26_OF_26_VERIFIED`;
- preflight canónico: PASS antes de leer identidad o desplegar;
- paridad antes: 24/26;
- paridad después: 26/26;
- mismatch después: 0;
- Hosting deploy executions: 1;
- Firestore read: false;
- Firestore writes: 0;
- operational writes: 0;
- runtime: false;
- browser: false;
- Functions deploy: false;
- Rules deploy: false;
- producción: false;
- main/merge: no tocados.

El workflow de entrega quedó congelado inmediatamente después del PASS.

### Verificación de cierre

Gate canónico retornado a perfil cero capacidades.

- commit de verificación: `d1e96d7d2647c7233ea640a99586548482ee4182`;
- run: `30493362312`;
- job: `90716375234`;
- artifact: `8740605103`;
- digest: `sha256:e3f7245114d79ee6eb9c5aa63dc59fe71def5dfb745b5b991a9efc2a598c1c91`;
- resultado: PASS;
- executionAuthorized: false;
- allowedExecutions: 0;
- Hosting authorization consumed: true;
- runtime authorization: false/0;
- visual review authorization: false;
- production authorization: false.

El verificador de cierre también quedó congelado.

## Estado autoritativo nuevo

- `tools/orbit360-m5-release-candidate-control-overlay-532-v20260729.json`;
- `tools/orbit360-m5-hosting-delivery-532-freeze-v20260729.json`;
- `tools/orbit360-m5-hosting-evidence-ledger-531-v20260729.json`;
- `tools/orbit360-validator-lifecycle-contract-m5-hosting-532-closed-v20260729.json`;
- `tools/orbit360-validar-gate-contracts-engine-m5-hosting-532-closed-v20260729.mjs`.

Estado:

`M5_HOSTING_532_CLOSED_26_OF_26_READY_TO_REQUEST_RUNTIME_AUTHORIZATION`

## Carriles

### A — Frontend / UX / Academia

Avance visible: la candidata funcional post-5.0.29 ya está entregada públicamente en LAB con paridad 26/26. No se realizó todavía la revisión visual porque el runtime sanitizado posterior sigue pendiente.

### B — Backend / seguridad / Orbit.store

No hubo modificación de store, Auth productivo, Firestore Rules, Functions, datos ni contratos backend protegidos. La identidad de Hosting se resolvió únicamente después del preflight y se eliminó al cerrar el job.

### C — Datos reales / migración A&S

Sin cambios. Baseline 414/26/7 preservado. No se abrió Pólizas ni se reimportaron Clientes/Aseguradoras.

## Claude

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`.

Patrones reutilizables:

1. package input inmutable y evidence ledger append-only deben ser objetos distintos;
2. autorización, package, request y ejecución son estados separados;
3. un request one-shot se liga al parent commit exacto y a la candidata exacta;
4. después de consumir una autorización, el workflow operativo se congela y el router vuelve a cero capacidades;
5. una candidata no puede declararse entregada si un asset funcional cambiado queda fuera del descriptor/paridad pública;
6. verificación previa y posterior debe medir la misma lista canónica de assets.

No enviar secretos, datos reales ni backend protegido a Claude.

## Academia

`ACADEMIA_ACTUALIZAR`:

- diferencia entre `PIPELINE_MECHANISM_FAILURE`, `VALIDATOR_STALE` y `FUNCTIONAL_DEFECT`;
- autorización recibida vs package PASS vs request creado vs autorización consumida;
- package input inmutable vs ledger append-only;
- por qué una paridad 25/25 puede ser falsa si el descriptor omite un asset funcional cambiado;
- gates fail-closed y retorno a cero capacidades después de una ejecución one-shot;
- Hosting no equivale a runtime ni a aprobación visual.

## Pendiente

M5 sigue abierto.

No están autorizados ni ejecutados:

- nuevo runtime LAB;
- revisión visual;
- producción;
- Functions;
- Rules;
- main/merge;
- Pólizas.

## Siguiente acción exacta

Solicitar una **nueva autorización explícita e independiente para exactamente un runtime LAB** sobre la candidata `4bf3c8025654f43f6e4af20e5d16115bdc0851352ccddc6f099649405883cf3b`, ahora con Hosting 26/26.

Ese runtime deberá:

1. ejecutar primero el preflight canónico;
2. usar la candidata exacta 43/26 ya entregada;
3. tomar snapshots read-only before/after de Firestore;
4. mantener write guard y cero writes;
5. validar Dirección desktop, Operativo tablet y Asesor móvil;
6. validar legal una vez, multirol/scopes, Cliente 360, Aseguradoras y copy técnico;
7. aceptar exclusivamente evidencia sanitizada `ok:true`.

Solo después de `ok:true` podrá habilitarse la revisión visual única de M5.

## Tablero resumido

| Bloque | Estado |
|---|---|
| M1–M4 | CERRADOS |
| M5 5.0.29 | PASS funcional |
| M5 5.0.30 | STOP correcto |
| M5 5.0.31 | PASS control plane |
| M5 5.0.32 package | PASS |
| M5 5.0.32 Hosting | PASS 26/26 |
| M5 cierre Hosting | PASS / cero capacidades |
| Runtime nuevo | PENDIENTE AUTORIZACIÓN |
| Revisión visual | BLOQUEADA hasta runtime `ok:true` |
| Producción | BLOQUEADA |
| Pólizas | BLOQUEADO |
