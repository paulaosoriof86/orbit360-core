# PLAN MAESTRO DEFINITIVO — PRODUCCIÓN Y POSTPRODUCCIÓN ANTI-LOOP — ORBIT 360 / GRAVICENTRA A&S

**Fecha:** 2026-08-26 (America/Guatemala)  
**Estado:** `VIGENTE_CONGELADO / AUTORIDAD_OPERATIVA_DE_RUTA / NO_RECONSTRUIR`  
**Repositorio:** `paulaosoriof86/orbit360-core`  
**Rama obligatoria:** `ays/backend-tenant-lab-v99-20260703`  
**PR rector:** #5 draft/open  
**branchHead verificado antes de congelar este documento:** `7567a22987a8ab4a6dc32740af3a6f32fdaeefb5`  
**Estado mutable único:** `orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json`  
**Candidata productiva preservada:** artifact `9504702901` / source `8c9668d6d423e82826b0295431ec699390d79b4b` / 194 archivos  
**F2 terminal consumido:** run `32920087220` / terminal artifact `9589635019`  
**Producción/main/merge/deploy:** no autorizados al congelar este plan.  

---

## 0. CARÁCTER, PRECEDENCIA Y PROPÓSITO

Este documento congela la ruta operativa definitiva desde el estado vivo del 2026-08-26 hasta producción y su continuidad postproductiva. No crea otra arquitectura ni otro control-plane. Integra y depura lo todavía vigente de:

- `PLAN-MAESTRO-EJECUCION-PRODUCTIVA-ANTI-DESVIACION-SINCRONIZACION-CLAUDE-ORBIT360-AYS-20260716.md`;
- `PLAN-MAESTRO-CONGELADO-DEFINITIVO-RUTA-PRODUCCION-ORBIT360-AYS-20260821.md`;
- `PLAN-MAESTRO-CONGELADO-SALIDA-PRODUCCION-SIN-BUCLES-ORBIT360-AYS-20260824.md`;
- `AUDITORIA-FORENSE-CONTROL-PLANE-ORBIT360-AYS-20260824.md`;
- `ADDENDUM-MECANISMO-ESTADO-UNICO-CONTROL-PLANE-20260826.md`;
- `ADDENDUM-MAESTRO-ACELERACION-PRODUCTIVA-REUSO-TRANSVERSAL-Y-CONTROL-AUTORIZACIONES-20260730.md`;
- auditoría crítica causal del mecanismo realizada sobre el estado vivo del 2026-08-26.

Las reglas maestras/addenda permanentes conservan precedencia. Este documento **supercede operacionalmente los planes de ruta a producción anteriores**, que quedan como historia/evidencia y no pueden reabrir bloques ya consumidos.

### Regla central

No volver a demostrar lo ya demostrado.

La ruta más rápida compatible con seguridad es:

`F2_TERMINAL_PASS_CONSUMIDO → SINGLE_STATE_ROOTFIX_PASS → RELEASE_HANDLER_READY → ONE_FINAL_SOURCE_ONLY_HANDSHAKE + CONTROL_PLANE_BASELINE_SEALED → GO_LIVE_AUTHORIZADO → EXACT_DEPLOY → PRODUCTION_SMOKE_PASS`.

No existe una macro adicional entre esos estados.

---

# 1. ESTADO REAL AL CONGELAR

## 1.1 Hechos verificados

- PR #5: draft/open, no merge.
- ledger: revisión `87` al iniciar este freeze.
- fase viva: `F2_TERMINAL_PASS_AWAITING_AUTHORIZED_GO_LIVE`.
- estado vivo: `F2_TERMINAL_PASS`.
- avance real de la ruta a producción: **85%**.
- candidata preservada: artifact `9504702901`, source `8c9668d6d423e82826b0295431ec699390d79b4b`, 194 archivos.
- F2 terminal válido: run `32920087220`, artifact terminal `9589635019`.
- F2 demostró browser/matriz funcional, integridad before/after, cross-tenant denegado, cero writes inesperados y misma candidata.
- F2 no hizo deploy ni producción.
- F2 está consumido: `NO_REPLAY`.
- autorización/request/runtime F2 ya no están activos.
- el registry actual declara `GO_LIVE_RELEASE_WINDOW`, pero al freeze su `handler` es `null` y `handlerReady:false`.
- el mecanismo single-state v7 mantiene `singleStateMechanismSelftestValidated:false` y la misma familia/etapa de selftest ya falló dos veces; corresponde `STOP_RETRY`, no otro run equivalente.

## 1.2 Interpretación operativa

El producto no vuelve a 50%, 62%, 75% ni a Macro-2. El F2 válido fija el piso real en 85%.

El cuello de botella actual es exclusivamente source-only/control-plane + preparación de release:

1. cerrar el rootfix mínimo del owner/invariant single-state;
2. conectar un único handler de release estable;
3. demostrarlo una sola vez source-only y congelar sus hashes;
4. recién entonces solicitar autorización explícita de go-live.

No se toca producto ni datos para resolver estos tres puntos salvo evidencia nueva que demuestre `PRODUCT_DEFECT` o `DATA_ENV_FAILURE`.

---

# 2. DEPURACIÓN DE LOS PLANES ANTERIORES

## 2.1 Plan 2026-07-16

### Cerrado / consumido / no repetir

- Bloque 0 baseline sano: absorbido y superado por candidata exacta + manifest/digests posteriores.
- Bloque 1 Slice LAB A&S: superado por evidencia funcional/backend posterior.
- Bloque 2 productivo read-only: superado por F2 real.
- Bloque 3 activación tenant: los prerrequisitos de Auth/membership/tenant/scopes necesarios para F2 fueron alcanzados y validados en el runtime F2.
- Bloque 4 escritor/importadores: no se reabre para este primer go-live; la continuidad durable de importadores pertenece a postproducción por fuente y autorización específica.
- Bloque 5 Release Candidate: consumido por candidata `9504702901` + F2 terminal válido.

### Persiste

- Bloque 6 Go-live: **sí persiste**, pero se ejecuta mediante el carril reducido de este plan.
- smoke, rollback, autorización, exact release y lectura productiva siguen siendo requisitos obligatorios.
- carriles A/B/C, fuentes separadas y backend protegido siguen vigentes.

## 2.2 Plan 2026-08-21

### Cerrado / superado

- Macro-1 original de reconciliación/proyecciones: superada arquitectónicamente por v7 single-state; solo queda el rootfix mínimo descrito en Bloque P1 de este plan.
- Macro-2 hardening transversal/candidata: cerrada; la candidata actual es `9504702901`.
- Macro-3 F2 one-shot: **CLOSED/CONSUMED**, run `32920087220`; jamás se reejecuta por fallos posteriores del mecanismo.

### Persiste

- Macro-4 Go-live autorizado.
- Macro-5 smoke productivo.

Ambas se consolidan en una sola ventana productiva para reducir riesgo y ciclos.

## 2.3 Plan 2026-08-24

### Estado actual

- Iteración 1 `CONTROL_PLANE_FINAL_SOURCE_ONLY`: casi absorbida por v7; queda únicamente corregir la semántica duplicate-claim/invariant y cerrar el baseline reutilizable.
- Iteración 2 `F2_FINAL_ONE_SHOT_REAL`: **CLOSED/CONSUMED**.
- Iteración 3 `AUTHORIZED_RELEASE_WINDOW`: **PENDIENTE**; se conserva, pero no puede pedir autorización hasta que `handlerReady:true`, preflight y rollback estén demostrados source-only.

## 2.4 Addendum single-state 2026-08-26

Se conserva como arquitectura transversal definitiva:

- un solo state-bearing file;
- cero proyecciones operativas mutables;
- CAS;
- rama efímera + un intent + un push;
- claim antes de riesgo;
- evidencia append-only;
- PR técnico retirado como bus de estado;
- ninguna infraestructura nueva por módulo.

No se sustituye.

## 2.5 Addendum de aceleración 2026-07-30

Se eleva a regla ejecutable de este plan:

- un fallo repetido no genera otro recovery;
- misma etapa/familia dos veces = `STOP_RETRY`;
- producción no desarrolla validators;
- autorización por bloque de riesgo, no microautorizaciones;
- reuso transversal obligatorio;
- solo lo imprescindible puede ampliar la ruta crítica.

---

# 3. MODELO DEFINITIVO DE PORCENTAJES HASTA PRODUCCIÓN

El porcentaje mide **evidencia durable consumida**, no horas, mensajes, commits, documentos ni intentos.

Un retry, una auditoría, una corrección documental o un selftest repetido **no incrementan porcentaje**.

| % | Gate durable | Estado al freeze |
|---:|---|---|
| 85% | `F2_TERMINAL_PASS_REAL` misma candidata, browser/integridad/cross-tenant/zero-writes | **CLOSED/CONSUMED** |
| 88% | `SINGLE_STATE_ROOTFIX_PASS` source-only: duplicate claim → STOP_RETRY; invariant estático separado; auth reserve/consume probado | PENDIENTE |
| 91% | `GO_LIVE_RELEASE_HANDLER_READY`: handler único, exact manifest, provider/config/rollback dry-run PASS | PENDIENTE |
| 93% | `FINAL_RELEASE_HANDSHAKE_PASS`: exactamente un handshake source-only + baseline de hashes del control-plane sellado | PENDIENTE |
| 95% | `AUTHORIZED_PRIVILEGED_EDGE_ENTERED`: autorización exacta + claim CAS ganado + primera capacidad privilegiada; consumo one-shot | PENDIENTE |
| 98% | `EXACT_DEPLOY_READBACK_PASS`: deploy exacto completo y readback coincide con candidata/manifest | PENDIENTE |
| 100% | `PRODUCTION_SMOKE_PASS`: mismo release/run, multirrol/tenant/seguridad/integridad PASS + terminal artifact inmutable | PENDIENTE |

### Regla de rollback de porcentaje

El porcentaje no se utiliza para maquillar un fallo.

- Si falla antes de riesgo: permanece en el último gate durable, máximo 93%.
- Si se entra a riesgo pero se hace rollback: estado = `ROLLED_BACK_SAFE`; para planificación vuelve al último gate durable preproducción (93%), conservando evidencia histórica del intento.
- 100% solo existe con `PRODUCTION_SMOKE_PASS`; nunca por deploy sin smoke.

### Postproducción

Producción termina en 100%. Postproducción usa un tablero separado; nunca 105%, 120% ni otros porcentajes que oculten el estado real del go-live.

---

# 4. GARANTÍA DE PROCESO ANTI-LOOP

No se puede garantizar matemáticamente que un software complejo nunca tenga un defecto desconocido. Sí se congela una garantía verificable de **mecanismo** para impedir que cada módulo o conversación vuelva a reconstruir y redescubrir el control-plane.

## 4.1 Baseline inmutable del mecanismo

Al cerrar 93% se debe producir evidencia append-only `CONTROL_PLANE_FROZEN_BASELINE` con hashes/digests de, como mínimo:

- workflow/runner single-state activo;
- `tools/orbit360-single-state-ledger-owner-v20260826.mjs`;
- `tools/orbit360-single-state-invariant-v20260826.mjs`;
- registry de transiciones/handlers;
- handler `GO_LIVE_RELEASE_WINDOW`;
- contrato de autorización/claim/consumo;
- contrato de terminal evidence;
- contrato exact-candidate/manifest;
- harness transversal Auth/membership/scopes/browser/integrity/rollback.

## 4.2 Regla de gate consumido

Una vez `CONTROL_PLANE_FROZEN_BASELINE` esté PASS:

**Si los hashes del control-plane no cambian, el mecanismo no se reabre, no se rehardeniza y no se vuelve a ejecutar su selftest completo por ningún módulo posterior.**

Los módulos ejecutan únicamente:

- invariant estático barato;
- preflight común;
- pruebas específicas del dominio;
- runtime/smoke aplicable.

Solo un cambio deliberado en cualquiera de los hashes del baseline permite abrir `CONTROL_PLANE_CHANGE`; ese cambio debe tener causa, diff, prueba source-only y un nuevo baseline sellado. Nunca se abre por un fallo de negocio de un módulo.

## 4.3 Leyes anti-loop vinculantes

1. `F2 run 32920087220` es evidencia terminal consumida: `NO_REPLAY`.
2. Un gate consumido no se repite salvo evidencia directa que invalide ese mismo gate.
3. Misma etapa + misma familia de fallo dos veces = `STOP_RETRY` automático.
4. `MECHANISM_FAILURE` no permite tocar producto ni reconstruir candidata.
5. `PROVIDER_CAPACITY` no permite tocar source/producto.
6. `PRODUCT_DEFECT` no permite rediseñar control-plane.
7. `DATA_ENV_FAILURE` no permite reimportar otra fuente ni inferir datos.
8. `AUTH_POLICY_FAILURE` no permite degradar permisos ni crear bypass.
9. `SECURITY_FAILURE` falla cerrado y puede activar rollback.
10. Una autorización se consume solo al primer borde privilegiado real; un fallo pre-risk no consume.
11. Si runtime privilegiado ocurrió y existe terminal artifact verificable, cualquier falla posterior se reconcilia documentalmente **sin replay del riesgo**.
12. Terminal artifact es autoridad primaria sobre lo ocurrido en runtime; ledger registra su resultado, no lo reinventa.
13. Ningún PR técnico se usa como bus de estado.
14. Ningún validator depende de nombres visibles de steps/copy.
15. Ningún estado operativo se replica en README/CHANGELOG/PR/package/boundary.
16. No se crea otro workflow/ledger/reducer/projection para resolver un error de este mecanismo.
17. No se modifica el mecanismo entre módulos si el baseline hash no cambió.
18. Un hallazgo intermedio se clasifica y se enruta; **no reconstruye el roadmap**.
19. Dos iteraciones sin avance durable o sin nueva evidencia = parar y corregir la causa, no agregar capas.
20. Producción no se utiliza como entorno de desarrollo del validator.

---

# 5. TAXONOMÍA OBLIGATORIA DE CAUSA Y ENRUTAMIENTO

Antes de corregir cualquier fallo se clasifica:

| Clase | Qué se congela | Qué se puede cambiar | Retry |
|---|---|---|---|
| `PRODUCT_DEFECT` | release actual | solo source/producto afectado + prueba dominio | solo tras rootfix probado |
| `MECHANISM_FAILURE` | producto y datos | owner/invariant/handler/contrato mínimo | STOP si misma etapa repite |
| `PROVIDER_CAPACITY` | producto/control-plane | capacidad/provider/config sin alterar candidato | no retry hasta nueva condición observable |
| `AUTH_POLICY_FAILURE` | riesgo | policy/config/identity exacta; nunca bypass | nueva autorización solo si cambió riesgo/material |
| `DATA_ENV_FAILURE` | módulo/fuente | fuente/config/entorno específico | sin mezclar/reimportar fuentes ajenas |
| `SECURITY_FAILURE` | todo riesgo | rootfix seguridad; rollback/fail-closed | sin retry privilegiado hasta PASS source-only |
| `VALIDATOR_STALE` | producto | validator/contrato únicamente | no producto; STOP si repite |
| `EVIDENCE_CONTRACT_FAILURE` | transición terminal | builder/reducer/documental, sin replay si runtime ya ocurrió | reconciliación sin riesgo |
| `UNKNOWN` | riesgo | diagnóstico read-only hasta clasificar | NO RETRY |

No se permite que una clase se traduzca automáticamente en otra para justificar un nuevo intento.

---

# 6. PLAN DE PRODUCCIÓN — RUTA CRÍTICA MÍNIMA

## P1 — `SINGLE_STATE_ROOTFIX_PASS` — 85% → 88%

**Riesgo:** cero runtime productivo, cero secrets, cero Firestore productivo, cero deploy.

### Problema exacto

El mecanismo v7 correcto todavía falla su selftest duplicate-claim. El segundo claim debe terminar `STOP_RETRY` antes de evaluar una transición de negocio vieja. Además, el invariant estático no debe recursivamente ejecutar toda la batería comportamental que luego vuelve a ejecutar el workflow.

### Cambio mínimo

1. corregir orden de guards en owner: claim activo/completado/duplicate primero; transición `fromState` después;
2. separar invariant estático de selftest comportamental;
3. demostrar reserva vs consumo real de autorización;
4. cero nuevas capas, reducers, ledgers, workflows o projections.

### Archivos esperados

- `tools/orbit360-single-state-ledger-owner-v20260826.mjs`;
- `tools/orbit360-single-state-invariant-v20260826.mjs`;
- solo el contrato/selftest estrictamente necesario si requiere ajuste semántico.

### Pruebas obligatorias locales/source-only antes de Actions

- stale revision → FAIL;
- stale base → FAIL;
- candidate mismatch → FAIL;
- first claim → PASS;
- duplicate claim → `STOP_RETRY` sin side effects;
- terminal doble → FAIL;
- pre-risk fail → autorización no consumida;
- privileged-edge fixture → autorización consumida exactamente una vez;
- replay → FAIL.

### PASS

`SINGLE_STATE_ROOTFIX_PASS` con evidencia sanitizada `ok:true`.

### STOP

Si la misma etapa del selftest falla de nuevo, no se crea V8 ni otro workflow: se inspecciona la implementación y se corrige source-only hasta que el test local determinista explique la falla.

---

## P2 — `GO_LIVE_RELEASE_HANDLER_READY` — 88% → 91%

**Riesgo:** source-only/preflight; cero producción.

### Objetivo

Completar el delta productivo que hoy falta: `GO_LIVE_RELEASE_WINDOW.handlerReady:true` sin crear una arquitectura paralela.

### El único handler debe recibir

- candidate artifact/digest/source exactos;
- release manifest exacto;
- target tenant/environment exacto;
- alcance autorizado;
- provider/config requerido;
- rollback identity/release anterior;
- terminal evidence destination.

### Flujo interno único

`READ_ONLY_PREFLIGHT → CAS_CLAIM → PRIVILEGED_EDGE → EXACT_DEPLOY → READBACK → SMOKE → INTEGRITY → TERMINAL_PASS/FAIL → ROLLBACK_IF_REQUIRED`.

### Preflight determinista antes del riesgo

Debe comprobar, sin consumir autorización:

- branch/candidate/manifest exactos;
- backend protegido esperado;
- Auth/membership/rules/Storage/config necesarias;
- Hosting/provider/domain readiness aplicable;
- secretos requeridos: solo existencia/readiness, nunca exponerlos;
- rollback real disponible;
- release anterior identificable;
- quiescence/no ejecución concurrente incompatible;
- terminal artifact contract;
- observabilidad/readback disponible.

### PASS

- registry `handlerReady:true`;
- dry-run source-only PASS;
- rollback preflight PASS;
- cero operación privilegiada ejecutada.

### STOP

Si falta provider/capacidad/config productiva, clasificar antes de pedir autorización. No rellenar la brecha con un nuevo workflow.

---

## P3 — `FINAL_RELEASE_HANDSHAKE_PASS + CONTROL_PLANE_FROZEN_BASELINE` — 91% → 93%

**Riesgo:** cero producción, cero secretos productivos, cero deploy.

### Única ejecución final del mecanismo

1. rama efímera desde canonical HEAD;
2. exactamente un intent commit;
3. exactamente un push/evento;
4. exact base/revision/candidate;
5. preflight source-only;
6. owner/invariant/handler contract PASS;
7. cero claims privilegiados reales;
8. cero runtime productivo;
9. sellar `CONTROL_PLANE_FROZEN_BASELINE` con hashes.

### Regla definitiva

Este handshake es **consumido**. No vuelve a ejecutarse en Pólizas, Vehículos, Recibos, Cobros ni módulos posteriores mientras los hashes del mecanismo no cambien.

### PASS

`FINAL_RELEASE_HANDSHAKE_PASS` + baseline append-only verificable.

### STOP

Un fallo del mismo mecanismo no produce un segundo handshake equivalente. Se vuelve a P1/P2 únicamente sobre el archivo responsable y sin tocar producto.

---

## P4 — `AUTHORIZED_RELEASE_WINDOW` — 93% → 100%

Requiere autorización separada, fresca y explícita de Paula **solo después de P1–P3 PASS**.

No se solicita autorización antes.

### P4.1 Pre-entry readback — sigue 93%

Revalidar inmediatamente antes de riesgo:

- canonical HEAD;
- candidata/manifest/digests;
- handler/baseline hashes intactos;
- ausencia de release concurrente;
- provider/config/rollback listos.

Si cambia el mecanismo hash, no entrar a riesgo.

### P4.2 CAS claim + borde privilegiado — 95%

- ganar claim único por CAS;
- autorización ligada exactamente a candidate + manifest + target + scope;
- consumir autorización **solo cuando comience la primera capacidad privilegiada real**;
- si falla antes de ese borde, autorización permanece no consumida.

### P4.3 Exact deploy + readback — 98%

- desplegar exactamente el release autorizado;
- ninguna reconstrucción de candidate durante la ventana;
- readback del proveedor/hosting coincide con release/manifest esperado;
- registrar identidad de deploy.

### P4.4 Smoke + integrity + terminal — 100%

Automatizar inmediatamente sobre el mismo release:

- Dirección desktop;
- Operativo tablet;
- Asesor móvil;
- tenant A&S y denegación cross-tenant;
- Auth/membership/scopes;
- rutas críticas actualmente incluidas en F2/release;
- ausencia de copy técnico/undefined/NaN/Invalid Date visible;
- integridad aplicable;
- controles de seguridad;
- cero mutaciones no autorizadas;
- dominio/hosting/readback observable;
- terminal artifact inmutable.

### PASS final

`PRODUCTION_SMOKE_PASS` = **100%**.

### FAIL

- fail-closed;
- rollback exacto dentro de la misma ventana si la condición lo exige;
- readback + smoke del rollback;
- terminal `ROLLED_BACK_SAFE` o `PRODUCTION_RELEASE_FAIL` causal;
- no replay automático;
- no nuevo plan;
- clasificar causa y aplicar matriz de §5.

---

# 7. TRANSICIONES MUTABLES MÍNIMAS

Desde una candidata validada hasta producción no deben existir cadenas de reopen/harden/project/reconcile.

Durante la ventana productiva las únicas transiciones operativas que requieren mutación canónica son:

1. **claim del release** al entrar al riesgo;
2. **terminal PASS/FAIL** después de deploy/smoke/integrity.

El preflight es evidencia read-only. La autorización es un input de seguridad ligado al scope; no necesita cinco estados documentales intermedios.

---

# 8. ROLLBACK

## 8.1 Mecanismo

P1–P3 son source-only. Cada rootfix debe ser commit acotado y reversible. Si falla su prueba, revertir únicamente archivos del control-plane involucrados. Candidata y F2 terminal no cambian.

## 8.2 Producción

Antes del borde privilegiado debe existir evidencia de:

- release productiva previa identificable;
- procedimiento/provider de restauración disponible;
- configuración/artefactos requeridos para rollback;
- readback posterior al rollback;
- smoke mínimo del estado restaurado.

Si esto no puede demostrarse, `GO_LIVE_RELEASE_WINDOW` no está ready.

---

# 9. CONTINUIDAD ENTRE CONVERSACIONES — ANTI-PÉRDIDA

Toda conversación futura de Orbit debe ejecutar este orden y **no reconstruir el roadmap**:

1. leer reglas maestras/addenda vigentes;
2. leer este plan;
3. verificar PR #5, branchHead y ledger vivo;
4. verificar candidata exacta y último terminal artifact;
5. localizar el primer gate de esta tabla que no esté consumido:
   - F2 85%;
   - P1 88%;
   - P2 91%;
   - P3 93%;
   - P4 95/98/100;
6. verificar si `CONTROL_PLANE_FROZEN_BASELINE` existe y si sus hashes cambiaron;
7. si no cambiaron, queda prohibido reabrir mecanismo;
8. continuar desde el primer gate incompleto;
9. nunca pedir a Paula que repita una autorización ya consumida ni datos ya disponibles;
10. reportar hecho verificado, inferencia, cambio y siguiente acción exacta.

### Frase de reanudación canónica

`LEER PLAN-MAESTRO-DEFINITIVO-PRODUCCION-POSTPRODUCCION-ANTI-LOOP-ORBIT360-AYS-20260826; verificar HEAD + ledger; respetar gates consumidos; continuar el primer gate incompleto; no reabrir control-plane si CONTROL_PLANE_FROZEN_BASELINE no cambió.`

---

# 10. POSTPRODUCCIÓN — PRINCIPIO GENERAL

El go-live inicial no significa que toda la plataforma esté terminada. Significa que existe una baseline productiva estable, verificable y recuperable sobre la cual continuar.

Postproducción no puede reconstruir infraestructura transversal.

Cada módulo usa:

`DOMAIN_SOURCE_ACCEPTANCE → EXACT_DELTA/MANIFEST → COMMON_PREFLIGHT → AUTH_IF_PRIVILEGED → SAME_STABLE_DISPATCHER → DOMAIN_RUNTIME/SMOKE → IMMUTABLE_TERMINAL`.

El control-plane completo se considera consumido mientras sus hashes no cambien.

---

# 11. POSTPRODUCCIÓN — FASE PP0: ESTABILIZACIÓN INMEDIATA

**Inicio:** inmediatamente después de `PRODUCTION_SMOKE_PASS`.

No requiere un periodo arbitrario de espera para poder continuar desarrollo. La estabilización es por evidencia.

## PP0.1 Baseline productiva

Sellar/confirmar:

- release/manifest exactos desplegados;
- terminal production artifact;
- rollback identity;
- domain/hosting readback;
- Auth/tenant/scopes;
- observabilidad mínima;
- última evidencia de integridad/smoke.

## PP0.2 Operación y monitoreo

Usar read-only probes/telemetría disponible para detectar:

- errores de carga/runtime;
- fallas Auth/membership/tenant routing;
- fallas de dominio/hosting/assets;
- denegaciones o permisos inesperados;
- fallas de integración/provider;
- regresiones multirol/móvil/tablet/desktop.

## PP0.3 Incidentes

Todo incidente se clasifica con §5. No se reabre el mecanismo por defecto.

---

# 12. POSTPRODUCCIÓN — FASE PP1: CONTINUIDAD FUNCIONAL POR MÓDULOS/FUENTES

Orden obligatorio salvo nueva evidencia material o decisión explícita:

1. **Pólizas**;
2. **Vehículos**;
3. **Recibos / cartera**;
4. **Cobros / conciliación**;
5. **Comisiones / planillas**;
6. **financiero histórico**;
7. **Siniestros / documentos soporte**, respetando orden y readiness de fuentes;
8. **Cotizador + Comparativo v110**;
9. **Ops + Leads**;
10. **Marketing**;
11. **Portal**;
12. **resto de Academia / capacidades complementarias**.

### Reuso transversal obligatorio

No volver a construir por módulo:

- Auth/membership;
- tenant binding;
- multirol/scopes;
- `Orbit.store` y write guard;
- exact-candidate/manifest;
- dispatcher/provider;
- integrity before/after;
- browser harness;
- terminal evidence;
- STOP_RETRY;
- rollback;
- control-plane single-state.

Cada módulo solo agrega schema, aliases, normalización, reglas de dominio, fixtures y handler/operación de dominio genuinamente nuevos.

---

# 13. POSTPRODUCCIÓN — CONTRATO DE DATOS Y MIGRACIÓN

Las fuentes permanecen separadas:

- clientes;
- aseguradoras;
- polizas;
- vehiculos;
- cobros_realizados;
- planilla_aseguradora;
- planilla_comisiones;
- estado_cuenta_bancario;
- financiero_historico;
- siniestros;
- documentos_soporte;
- configuracion_catalogo.

Reglas permanentes:

- no inferir clientes/pólizas desde finmovs;
- no escribir cartera desde histórico financiero;
- no escribir cobros desde banco sin conciliación;
- documentos proponen diff/confirmación, no escriben por inferencia;
- trazabilidad archivo/hoja/fila/bloque/país/moneda/periodo;
- falta país/moneda = `REQUIERE_VALIDACION`;
- GT → GTQ; CO → COP;
- producción/metas/comisiones sobre prima neta recaudada;
- prima separada neta/gastos/impuestos/total;
- solo Vigente/Por renovar genera recibos/cartera; otros estados son histórico;
- cobros/recaudos no son finmovs.

Cada migración sigue:

`FUENTE → DETECCION/MAPPING → NORMALIZACION → DEDUPE → QUALITY → DRY_RUN/DIFF → AUTORIZACION SI ESCRIBE → PERSISTENCIA → READBACK → SMOKE → TERMINAL/ROLLBACK`.

---

# 14. POSTPRODUCCIÓN — PRUEBAS AUTOMATIZADAS REALES

Antes del go-live final y como control postproducción, el harness transversal debe ejecutar pruebas end-to-end reales y controladas de las superficies disponibles, incluyendo Ops, Leads, Cliente 360 y CRM conforme cada módulo se active.

Debe utilizar:

- datos de prueba controlados cuando aplique;
- before/after integrity;
- limpieza/rollback;
- roles/scopes;
- efectos entre módulos;
- sincronización;
- evidencia sanitizada.

Esto no reabre módulos cerrados ni reemplaza pruebas específicas de dominio.

---

# 15. POSTPRODUCCIÓN — CAMBIOS DE MECANISMO

Un cambio del control-plane después de producción es excepcional.

Solo se abre `CONTROL_PLANE_CHANGE` si:

1. un archivo hash del baseline cambia deliberadamente; o
2. evidencia demuestra un `MECHANISM_FAILURE` real que no puede resolverse en producto/provider/datos.

Procedimiento:

`FREEZE PRODUCT → ROOT_CAUSE → MINIMAL SOURCE-ONLY FIX → STATIC/BEHAVIORAL TEST → ONE HANDSHAKE → NEW BASELINE HASH`.

No existe patch-over-patch ni hardening por módulo.

---

# 16. CAMBIOS NO BLOQUEANTES

No amplían la ruta crítica salvo evidencia de bloqueo real:

- rebranding Gravicentra;
- mejoras cosméticas no críticas;
- documentación no necesaria para operar/reanudar;
- deuda técnica sin riesgo productivo;
- mejoras de Academia que no corresponden al cambio actual;
- experimentos o features futuras.

Se registran y se ejecutan en ventanas aisladas después del gate apropiado.

---

# 17. CLAUDE / ACADEMIA

Clasificación de este plan:

- arquitectura/UX reusable: `REPLICABLE_CLAUDE_ACUMULADO` cuando corresponda;
- reglas de aprendizaje por rol y mecanismo: `ACADEMIA_ACTUALIZAR`;
- control-plane, Auth, secrets, provider, reglas y seguridad: `BACKEND_PROTEGIDO_NO_CLAUDE`;
- configuración A&S: `TENANT_AYS_ONLY`;
- secretos/datos reales: `SECRETO_DATO_REAL`.

Academia debe enseñar especialmente:

- gate consumido;
- diferencia producto vs mecanismo/provider/auth/data/security;
- STOP_RETRY;
- exact candidate/manifest;
- autorización en borde privilegiado;
- terminal artifact;
- rollback;
- por qué un módulo no debe reconstruir infraestructura transversal.

---

# 18. REPORTE OBLIGATORIO DE CADA ITERACIÓN

Cada iteración reporta como máximo este tablero operativo, sin reconstruir la historia completa:

| Campo | Obligatorio |
|---|---|
| branchHead / PR | sí |
| ledger revision/status | sí |
| gate actual y porcentaje | sí |
| gate consumido preservado | sí |
| clasificación causal si hubo fallo | sí |
| cambio mínimo realizado | sí |
| archivos afectados | sí |
| pruebas/evidencia | sí |
| control-plane hash cambió | sí/no |
| autorización consumida | sí/no |
| runtime/deploy/producción ejecutados | sí/no |
| rollback/data integrity | sí/no/n.a. |
| impacto Claude/Academia | cuando aplique |
| siguiente acción exacta | sí |

No se vuelve a listar auditorías cerradas salvo nueva evidencia contradictoria.

---

# 19. CRITERIOS DE DESVIACIÓN Y AUTO-CORRECCIÓN

Se considera desviación si ocurre cualquiera:

- se propone volver a F2 sin invalidez directa de su terminal artifact;
- se crea un plan paralelo;
- se crea un workflow nuevo para el mismo release lane;
- se pide autorización antes de `handlerReady:true` + rollback/preflight PASS;
- se ejecuta el mismo selftest fallido una tercera vez sin rootfix source-only;
- se cambia producto por `MECHANISM_FAILURE`;
- se cambia mecanismo por `PRODUCT_DEFECT`;
- se reimportan fuentes para corregir UI/gates;
- se vuelve a usar PR técnico como bus;
- se duplica estado operativo en documentos;
- se reabre mecanismo sin cambio de hash del baseline;
- dos iteraciones no aumentan evidencia durable.

**Acción automática:** detener el carril equivocado, volver al último gate durable y ejecutar únicamente el rootfix de la clase causal correspondiente. No crear otra macro.

---

# 20. TABLERO CONGELADO AL 2026-08-26

| Bloque | % | Estado | Siguiente cierre |
|---|---:|---|---|
| F2 real | 85% | `CLOSED_CONSUMED_NO_REPLAY` | preservar |
| P1 Single-state rootfix | 88% | `ACTIVE / STOP_RETRY_ON_EQUIVALENT_RUN` | corregir owner/invariant source-only |
| P2 Release handler | 91% | `PENDING` | `handlerReady:true` + dry-run/rollback |
| P3 Final handshake/baseline | 93% | `PENDING` | un solo handshake source-only + hashes |
| P4 Privileged edge | 95% | `BLOCKED_UNTIL_AUTH` | autorización explícita posterior |
| P4 Exact deploy/readback | 98% | `PENDING` | misma candidata/manifest |
| Production smoke | 100% | `PENDING` | terminal `PRODUCTION_SMOKE_PASS` |
| PP0 | postprod | `PENDING` | baseline/observabilidad/incidentes |
| PP1+ | postprod | `PENDING` | módulos en orden por fuentes |

---

# 21. SIGUIENTE ACCIÓN EXACTA

`P1_FIX_SINGLE_STATE_DUPLICATE_CLAIM_AND_SEPARATE_STATIC_INVARIANT_FROM_BEHAVIORAL_SELFTEST_SOURCE_ONLY`

Restricciones de esta acción:

- no F2;
- no nueva autorización;
- no browser productivo;
- no secrets;
- no Firestore productivo;
- no datos;
- no deploy;
- no producción;
- no main;
- no merge;
- no nuevo workflow;
- no nueva arquitectura.

Después de P1 PASS se continúa directamente P2. No se abre otra auditoría general.

---

# 22. REGLA FINAL DE CONGELAMIENTO

Este plan no se reemplaza por otro plan por fallos intermedios.

Solo puede versionarse si aparece uno de estos insumos materiales:

- contradicción directa de evidencia terminal;
- cambio explícito de alcance/producto por decisión de Paula;
- nueva obligación regulatoria/seguridad que altere el riesgo;
- cambio arquitectónico autorizado del control-plane;
- evidencia de que un supuesto fundamental de este plan es falso.

En cualquier otro caso, el fallo se clasifica con §5 y se continúa dentro del mismo bloque hasta su criterio de salida.

**Objetivo operativo definitivo:** llegar a `PRODUCTION_SMOKE_PASS` con el menor número de transiciones razonable, sin reducir controles de tenant/Auth/scopes/integridad/rollback y sin volver a convertir el mecanismo en el principal generador de trabajo.