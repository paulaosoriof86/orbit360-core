# Cierre M5 5.0.30 — STOP Hosting LAB por dos fallos del control plane

Fecha: 2026-07-29  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate: `block5-release-candidate-visualization-v20260728`

## Estado

M1–M4 permanecen cerrados. M5 continúa abierto.

5.0.29 cerró PASS la remediación funcional multirol/PWA. A partir de esa remediación se preparó 5.0.30 para entregar una nueva candidata a Hosting LAB. La entrega **no ocurrió**: el package/control plane falló dos veces antes de crear request y se aplicó la stop-line obligatoria.

## Candidata post-5.0.29

Se detectó antes del deploy que el mecanismo histórico 42/25 no incluía `core/session-multirol-visibility-v20260716.js`, aunque ese archivo había cambiado en 5.0.29. Para evitar una falsa paridad se creó un descriptor único schema-driven con:

- 43 assets críticos;
- 26 assets públicos verificados;
- inclusión obligatoria de `core/session-multirol-visibility-v20260716.js`;
- hash calculado desde el descriptor compartido.

Hash calculado:

`4bf3c8025654f43f6e4af20e5d16115bdc0851352ccddc6f099649405883cf3b`

Paridad pública observada en package attempt 1:

- 24/26 coinciden;
- 2 mismatches;
- `sw.js`;
- `core/session-multirol-visibility-v20260716.js`.

Esto confirma que la nueva entrega Hosting sí es necesaria, pero no autoriza saltarse el control plane.

## Package attempt 1

- commit: `38b44af1124f1b5e0f18fbbc460bc807db6a4f0f`
- run: `30490547723`
- job: `90707062721`
- artifact: `8739493844`
- digest: `sha256:ac8af7c766f7e823c582f78db9611b578a1c84a4e8794432158f1a25c0320557`
- preflight: PASS;
- contrato local: 17/17 PASS;
- readiness: PASS;
- candidata: 43 assets;
- remoto: 24/26;
- request: no creado;
- secretos: no leídos;
- deploy: no ejecutado.

Fallo posterior: `PIPELINE_MECHANISM_FAILURE` al construir el JSON de cierre por mezclar `&&` con `??` sin paréntesis.

Se corrigió únicamente el JavaScript del cierre; no se cambió producto ni candidata.

## Package attempt 2

- commit: `04e9c54959ed4f3774fa50be9fc357234750fb3d`
- run: `30490737805`
- job: `90707700424`
- artifact: `8739564753`
- digest: `sha256:1291cffe1f8353ab7d578258dc30b97af56443e7dd2973f50d33a263384c2b47`
- preflight: 24/26;
- contrato: 16/17;
- único check contractual fallido: `FREEZE`;
- request: no creado;
- secretos: no leídos;
- deploy: no ejecutado.

## Causa raíz consolidada

Clasificación: **PIPELINE_MECHANISM_FAILURE**.

El control plane 5.0.30 usó el mismo documento freeze para dos responsabilidades incompatibles:

1. precondición inmutable del package;
2. evidencia acumulada después de ejecutar el package.

El primer intento calculó correctamente el hash de la candidata y enriqueció el freeze con ese valor. El contrato del segundo package, sin embargo, seguía exigiendo que `newReleaseCandidateHash` fuera `null` mientras no existiera request. Por tanto, el segundo package rechazó como inválida la evidencia válida producida por el primero.

No es un defecto de producto, datos, Firebase, Hosting target, multirol, Service Worker ni candidata.

## Stop-line

Después del segundo fallo se detuvieron los reintentos:

- tercer package: prohibido;
- request Hosting: prohibido;
- deploy Hosting: prohibido;
- autorización Hosting: `false/0`;
- autorización recibida: no consumida por deploy, pero invalidada por stop-line;
- runtime: `false/0`;
- visual: bloqueado;
- producción: bloqueada;
- Pólizas: bloqueado.

Los workflows operativos quedaron congelados.

## Verificación STOP

Se creó una verificación independiente, cero capacidades, para probar que el gate canónico no dejó una ruta operativa abierta.

- commit: `aa338bdc5eab9c2087e84fe84c1ea785d90ba7f7`
- run: `30491183947`
- job: `90709179466`
- artifact: `8739731902`
- digest: `sha256:880459a90b2da953f4800081223ed49a9c548a9b978e82198bbb9817a0e87a68`
- resultado: PASS;
- secretos: false;
- Firestore: false;
- runtime/browser: false;
- deploy: false;
- request creation: forbidden;
- third package attempt: forbidden.

## Carriles

### A — frontend/UX/Academia

La corrección funcional 5.0.29 permanece intacta. No se modificó UI en 5.0.30. Revisión visual continúa bloqueada hasta entregar y validar la nueva candidata.

### B — backend/seguridad/store

No se modificó Auth productivo, store, Firestore rules, Functions ni datos. El trabajo fue exclusivamente control plane/CI y Hosting LAB no llegó a ejecutarse.

### C — datos reales/migración

Baseline preservado: 414 clientes, 26 aseguradoras, 7 asesores; no hubo reimportación, escrituras ni transformación de datos.

## Claude / reusable

`REPLICABLE_CLAUDE_ACUMULADO`:

- una candidata debe tener un descriptor único de assets/hash/paridad;
- un asset funcional modificado debe formar parte obligatoria de la paridad remota;
- separar input inmutable de ejecución y evidencia append-only;
- nunca usar un mismo freeze mutable como precondición y ledger de salida;
- package sin request no puede leer secretos ni desplegar;
- dos fallos de la misma etapa activan stop-line.

## Academia

`ACADEMIA_ACTUALIZAR`:

- diferencia entre defecto funcional y mecanismo de pipeline;
- autorización vs request vs consumo efectivo;
- por qué evidencia válida no debe invalidar la precondición que la produjo;
- diseño package input inmutable + evidence ledger append-only;
- paridad de assets como contrato, no como conteo histórico fijo.

## Siguiente acción exacta

Abrir un **nuevo bloque exclusivamente estático** de rediseño del control plane de Hosting:

1. package input inmutable separado;
2. evidence ledger append-only separado;
3. fixture que simule `package → evidence enrichment → segundo preflight` y garantice estabilidad;
4. descriptor 43/26 como única fuente de assets/hash;
5. cero secretos, Firebase, deploy, Firestore, browser o runtime;
6. solo después de PASS estático independiente podrá solicitarse una nueva autorización Hosting.

No repetir 5.0.30 ni crear un tercer package.
