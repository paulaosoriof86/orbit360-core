# Orbit 360 A&S — cierre M5 5.0.20 runtime y 5.0.21 remediación VALIDATOR_STALE

Fecha: 2026-07-29

## Bloque

M5 — Release candidate y visualización.

PR #5 permanece draft/open sobre `ays/backend-tenant-lab-v99-20260703`. No hubo main, merge, producción, Functions, Rules ni avance a Pólizas.

## Fuente/base

RC preservada:

`ae6bb2a35ce4f03c0353d670218c841e51b57a2461a3ba9e741d8bd7a973fd61`

Baseline preservado: 414 clientes, 26 aseguradoras, 7 asesores; GT/CO 398/16; Persona/Empresa 391/23; moneda faltante 0; paridad LAB 25/25.

## M5 5.0.20 — runtime autorizado una sola vez

Package previo:

- commit `7523f906fa4029820be684973a0d4e4e0ce46c48`
- run `30472800569`
- job `90646967182`
- artifact `8732358957`
- digest `sha256:f13d8198854729ed2ffbe016c77667ef496080e4e060293d42c582b8a6f2139e`
- resultado: PASS, sin secretos, Firestore ni navegador.

Request inmutable:

- parent autorizado `c170e2e9154fcfcd51d66b2c0021768e62363759`
- request commit `60562d429f2aff5583c47eeb5bf4d88c08deb184`

Runtime:

- run `30473040571`
- job `90647758920`
- artifact `8732476317`
- digest `sha256:b42d4718d7237b58d9d73f342dbc978ac0b279ec38806a4a3c917df1cf6ed88b`

El runtime superó policy owner, bootstrap, autenticación, aceptación legal, access boundary y baseline real. Se detuvo en Dirección desktop / Cliente 360 con:

`TECHNICAL_COPY_VISIBLE:desktopDirectionClient360`

Seguridad preservada:

- snapshots 11/11 antes y 11/11 después;
- conteos estables: true;
- digests estables: true;
- Firestore writes: 0;
- operational writes: 0;
- network write candidates: 0.

La autorización one-shot quedó consumida y no hubo rerun.

## Causa raíz

Clasificación: `VALIDATOR_STALE`.

El validador histórico usaba:

`/Firebase|Firestore|localStorage|mock|smoke|dry-run|backend|LAB/i`

El layout visible contiene `White-label`. La alternativa `LAB` sin límites de palabra coincide con `lab` dentro de `label`, por lo que el gate marcaba copy técnico aun cuando el término técnico `LAB` no estaba visible como palabra independiente.

No se corrigió producto para satisfacer el gate.

## M5 5.0.21 — remediación estática

Se creó el predicado reusable:

- `tools/orbit360-visible-technical-copy-predicate-v20260729.mjs`
- versión `20260729.1`
- patrón semántico con límites de palabra.

Se preparó nueva candidata runtime, sin modificar 5.0.18 histórico:

- `tools/orbit360-m5-runtime-smoke-522-browser-v20260729.mjs`
- `tools/orbit360-m5-runtime-smoke-522-close-v20260729.mjs`
- contrato runtime futuro: `5.0.22`

### Intento estático 1

- run `30474020102`
- job `90651066102`
- 39/40
- fallo: `CLIENT360_NO_TECHNICAL_TERMS`

Causa: ese check escaneaba el archivo fuente completo como proxy de `document.body.innerText`, mezclando comentarios/código no visible con UI visible. Clasificación: `VALIDATOR_STALE`.

Se corrigió solo el validador. No se tocó producto.

### Intento estático 2 — final

- commit `565784a0f49a8f74d5d02ef8a110095533257926`
- run `30474317745`
- job `90652075752`
- artifact `8732952852`
- digest `sha256:d5e4b7b75009b5cfb4f2ffbc971d37775934e867a4acb6b21c291430e23fed24`
- resultado: 41/41, 0 fallos.

Quedó probado que:

- `White-label` no se considera copy técnico;
- `label`, `laboratorio` y `collaboration` no disparan `LAB`;
- `LAB` aislado sí se bloquea;
- Firebase, Firestore, localStorage, backend, dry-run, smoke y mock siguen bloqueados como términos técnicos;
- 5.0.18 histórico permanece intacto;
- los archivos de producto protegidos permanecen intactos;
- candidata 5.0.22 no se ejecutó;
- runtime/browser/Firestore/secrets/deploy fueron cero en 5.0.21.

El workflow 5.0.21 quedó congelado en `workflow_dispatch` después del PASS.

## Carriles

### A — frontend/prototipo/UX/Academia

No se modificó producto ni UI. La corrección fue exclusivamente del validador que interpreta copy visible.

### B — backend/seguridad/Auth/Orbit.store

Sin cambios de backend, Auth, Orbit.store, Firebase, Rules, Functions ni datos. El runtime 5.0.20 confirmó cero escrituras y estabilidad antes/después.

### C — datos reales/migración A&S

Sin reimportación ni mutación. Baseline canónico preservado. Pólizas continúa bloqueado.

## Claude

`REPLICABLE_CLAUDE_ACUMULADO`:

- usar límites semánticos en validadores de copy, no substrings ambiguos;
- validar la misma superficie que afirma el contrato: DOM visible vs archivo fuente;
- incluir fixtures positivos y negativos de palabras/substrings;
- no modificar producto para satisfacer `VALIDATOR_STALE`;
- consumir autorización one-shot aunque el fallo sea del validador;
- preservar snapshots/digests para probar cero mutación.

Backend, Firebase, rutas Firestore, artifacts, secretos y datos reales permanecen `BACKEND_PROTEGIDO_NO_CLAUDE` / `SECRETO_DATO_REAL` según corresponda.

## Academia

`ACADEMIA_ACTUALIZAR`:

- diferencia entre `FUNCTIONAL_DEFECT` y `VALIDATOR_STALE`;
- por qué un regex por substring puede generar falsos positivos;
- diferencia entre inspeccionar DOM visible y escanear fuente completa;
- fixtures de regresión para validadores;
- autorización one-shot, stop-line, snapshots y cero escrituras.

## Estado

- M5 5.0.20: cerrado en stop-line, autorización consumida, cero escrituras.
- M5 5.0.21: cerrado PASS 41/41.
- RC: preservada.
- candidata runtime 5.0.22: preparada, no ejecutada.
- visual review: no autorizada todavía.
- producción: no autorizada.
- Pólizas: bloqueado.

## Siguiente acción exacta

Solicitar nueva autorización explícita para una única ejecución runtime LAB de la candidata 5.0.22 sobre la misma RC. Debe conservar owner normalizado, snapshots read-only antes/después, cero escrituras y prohibiciones de Hosting adicional, Functions, Rules, producción, main, merge, políticas y Pólizas.

Solo con evidencia sanitizada `ok:true` se habilita la revisión visual única antes de cerrar M5.
