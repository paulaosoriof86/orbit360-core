# ADDENDUM MAESTRO — CIERRE FORENSE, SINCRONIZACIÓN Y PLAN CONGELADO

Fecha: 2026-08-18
Proyecto: Orbit 360 / A&S
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`
PR rector: #5 draft/open
Estado: VIGENTE, VINCULANTE Y DE LECTURA OBLIGATORIA

## 1. Propósito

Este addendum congela la corrección metodológica surgida de la auditoría forense del 18 de agosto de 2026 y complementa, sin sustituir, las reglas maestras y addenda vigentes. Su objetivo es impedir que una conversación nueva, un corte de sesión, un workflow posterior o una evidencia nueva vuelvan a reabrir diagnósticos cerrados, usen documentación histórica como estado actual o conviertan Orbit 360 en una sucesión de fixes/parches.

Este documento gobierna desde este punto:

- continuidad entre conversaciones;
- sincronización documental;
- causa raíz y STOP_RETRY;
- cierre del go-live inicial A&S;
- estabilización productiva;
- actualización incremental de datos;
- evolución no-code/control plane;
- releases postproducción;
- reutilización SaaS para siguientes tenants;
- reporte de avance por fase y porcentaje.

## 2. Hallazgo forense que origina este addendum

El `orbit360-live-state-v1.json` del 17 de agosto declaraba Gate 3 y cierre técnico de go-live como completos, pero evidencia posterior del 18 de agosto registró:

- Auth firmado correctamente;
- `emailVerified=true`;
- membership disponible y activa;
- tenant correcto;
- identidad target correcta;
- cero Firestore/Auth/operational writes;
- `runtimeStarted=false`;
- `routerStarted=false`;
- `tenantContextReady=false`;
- `storeReady=false`;
- `failedCheck=R4_RUNTIME_ACTIVATION_TRIGGER_FAILED`;
- clasificación `FUNCTIONAL_DEFECT`;
- lifecycle `SEALED_STOP_RETRY`.

El HEAD `6d68495ec92f103c805503a42b46bd5a755c3ef9` añadió observabilidad source-only para capturar el resultado sanitizado de una única activación/bootstrap sin introducir un segundo intento.

Conclusión: la auditoría forense anterior detectó causas reales, pero el mecanismo de cierre no mantuvo sincronizadas todas las superficies rectoras. El defecto metodológico vigente es `PIPELINE_MECHANISM_FAILURE / DOCUMENTATION_STATE_DRIFT`, coexistiendo con el bloqueo técnico `FUNCTIONAL_DEFECT / R4_RUNTIME_ACTIVATION_TRIGGER_FAILED`.

## 3. Regla de autoridad documental

A partir de este addendum, ningún documento fechado, cierre de gate, README histórico, changelog, bitácora o conversación puede declarar el estado actual por sí solo.

Orden obligatorio de lectura y autoridad:

1. reglas maestras/addenda vigentes de arquitectura, seguridad, datos y gates;
2. `orbit360-platform/docs/ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json`;
3. `orbit360-platform/docs/orbit360-live-state-v1.json`;
4. HEAD real de `ays/backend-tenant-lab-v99-20260703`;
5. PR #5 actual;
6. evidencia exacta nombrada por `lastEvidence` / `lastRuntimeEvidence` del live-state;
7. este addendum;
8. checkpoints, changelogs y documentos históricos solo como evidencia cronológica no contradicha por 1–7.

### Regla de cuarentena histórica

Todo documento de cierre, diagnóstico o “siguiente acción” anterior a la evidencia nombrada por el live-state se considera `HISTORICAL_NOT_CURRENT_STATE` salvo que el índice canónico lo marque explícitamente como vinculante.

No se borran documentos históricos útiles. Se conserva la trazabilidad, pero pierden autoridad operativa.

## 4. Transacción documental obligatoria

Una iteración que cambie cualquiera de estos elementos no se considera cerrada hasta sincronizar:

- clasificación;
- blocker;
- causa raíz;
- gate;
- último run/evidencia;
- product source;
- autorización;
- deploy/rollback;
- siguiente acción;
- porcentaje/fase.

Superficies mínimas:

1. `orbit360-live-state-v1.json`;
2. `ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json` cuando cambie la jerarquía documental;
3. PR #5;
4. README como puntero de reanudación;
5. checkpoint narrativo de la iteración;
6. CHANGELOG/bitácora solo cuando exista cambio de producto, pipeline, contrato o datos.

No iniciar otra frontera larga mientras esta transacción esté incompleta.

## 5. Protocolo obligatorio al iniciar o reanudar una conversación

Antes de diagnosticar o ejecutar:

1. leer el índice canónico;
2. leer live-state;
3. confirmar PR #5 y HEAD real;
4. leer la última evidencia nombrada por live-state;
5. comprobar que `nextActionExact` sigue siendo válido;
6. si existe drift, clasificarlo una sola vez y sincronizar antes de seguir;
7. ejecutar únicamente la siguiente acción exacta.

Queda prohibido reiniciar el diagnóstico desde memoria, una conversación anterior o un cierre histórico.

## 6. STOP_RETRY reforzado

Si la misma etapa/familia falla dos veces:

- congelar producto;
- no crear otra candidata;
- no crear otro request equivalente;
- no repetir deploy/browser/runtime;
- no cambiar contraseña/usuario/datos por descarte;
- diagnosticar owner real fuera de producción cuando sea posible;
- actualizar documentación antes de cualquier nueva ejecución.

No existe tercer intento de la misma familia sin evidencia nueva que demuestre causa distinta.

## 7. Estado técnico congelado al 18 de agosto de 2026

### Conservado

- paquete público R4S9C permanece publicado e inmutable;
- URL pública: `https://app.aysseguros.com`;
- Auth real no está demostrado como blocker;
- contraseña de Paula no está demostrada como blocker;
- membership/tenant del target pasan la frontera más reciente;
- HostDime no está demostrado como blocker;
- cero escrituras en la ejecución fallida más reciente;
- no se autoriza otro deploy ni rebuild para diagnosticar.

### Bloqueo actual único

`FUNCTIONAL_DEFECT / R4_RUNTIME_ACTIVATION_TRIGGER_FAILED`

La primera frontera a aislar es:

`productAppP0.activate() -> backendProductReadOnlyBootstrapP0.start() -> tenant context -> store -> router`

El observer agregado en `6d68495e...` debe capturar una sola ejecución del bootstrap y devolver únicamente evidencia sanitizada de fase/errores/conteos/ready/writeAuthorized.

## 8. Plan integrado congelado

Este plan no se reemplaza en futuras conversaciones. Solo puede cambiar mediante un nuevo addendum explícito que declare qué fase, peso y criterio se modifica.

### F0 — Reconciliación forense y documentación

Objetivo: una sola verdad operativa y protección antibucle.

Entregables:

- addendum vigente;
- índice documental canónico;
- live-state reconciliado;
- README reducido a puntero actual;
- PR #5 sincronizado;
- checkpoint F0.

No toca producto, browser, secretos, datos, deploy ni producción.

### F1 — Causa raíz runtime/bootstrap

Objetivo: cerrar `R4_RUNTIME_ACTIVATION_TRIGGER_FAILED` sin parches sintomáticos.

Secuencia:

1. validar source-only el observer;
2. observar una sola ejecución cuando exista autorización runtime válida;
3. identificar owner exacto;
4. clasificar una sola vez;
5. rootfix únicamente en el owner demostrado;
6. source/static/synthetic PASS;
7. si misma familia falla de nuevo: STOP_RETRY.

### F2 — Gate de aceptación productiva real

Objetivo: demostrar el recorrido real completo, no solo un green parcial.

Matriz mínima:

- Dirección desktop;
- Operativo tablet;
- Asesor móvil;
- login/membership/tenant/rol/scope;
- runtime/store/router;
- Inicio;
- Cliente 360;
- Aseguradoras;
- Ops;
- Leads;
- Pólizas;
- Vehículos;
- Recibos;
- Cobros/cartera;
- relaciones críticas;
- legal idempotente;
- service worker/cache;
- cero copy técnico;
- cero cross-tenant;
- cero writes inesperadas;
- integridad before/after.

### F3 — Go-live operativo A&S

Objetivo: declarar producción operativa, no solo publicada.

Criterios:

- candidata única/inmutable si el rootfix cambia producto;
- manifest/hashes;
- backup/rollback;
- un único transporte/deploy autorizado;
- E2E post-deploy PASS;
- live-state/PR/README sincronizados a `PRODUCTION_ACTIVE`;
- habilitación operativa del equipo.

### F4 — Actualización incremental de información

Objetivo: poner información a fecha sin full reload ni destrucción de actividad nacida en producción.

Fuentes separadas:

- clientes;
- aseguradoras;
- pólizas;
- vehículos;
- cobros realizados;
- planillas aseguradora;
- planillas comisiones;
- estado cuenta bancario;
- financiero histórico;
- siniestros;
- documentos soporte;
- configuración catálogo.

Contrato: source -> normalize -> dry-run -> diff -> quality -> confirmation -> write -> audit -> rollback.

### F5 — Control Plane no-code / administrabilidad

Objetivo: que A&S sea configuración del primer tenant, no fork ni hardcode.

Debe poder administrar con permisos y auditoría:

- tenant, branding, países, monedas e impuestos;
- usuarios, multirol, default/active role, scopes, equipos;
- aseguradoras/contactos/catálogos/tarifas;
- ramos/subramos/glosario;
- planes/módulos;
- integraciones por `credentialRef/backend_required`;
- plantillas/canales/endpoints por país;
- automatizaciones/cadencias;
- mappings de importación;
- Academia/rutas/permisos;
- parámetros propios del tenant.

Toda configuración sensible exige schema versionado, validación, before/after, motivo, permisos y rollback.

### F6 — Postproducción funcional acumulativa

Objetivo: terminar módulos pendientes como releases incrementales sobre la infraestructura transversal existente.

Prioridad acumulativa:

- Cotizador + Comparativo v110;
- Renovaciones;
- profundización Ops/Leads cuando aplique;
- Marketing;
- Portal;
- financiero histórico;
- documentos;
- Academia;
- módulos restantes.

Cada release: source gate -> dominio -> regresión transversal -> E2E -> integridad -> rollback -> evidencia -> documentación -> Academia -> clasificación Claude.

### F7 — SaaS reusable / siguiente tenant

Objetivo: demostrar que Orbit 360 es comercializable sin fork A&S.

Requisitos:

- cero hardcode A&S en módulos genéricos;
- tenant por configuración/membership;
- bootstrap reproducible;
- catálogos aislados;
- importadores multi-tenant;
- credenciales backend-only;
- pruebas cross-tenant fail-closed;
- onboarding documentado y reproducible.

## 9. Porcentajes congelados

Para evitar porcentajes engañosos se reportan DOS pistas.

### 9.1 Ruta inmediata a producción — 100%

- F0 Reconciliación/documentación: 20%
- F1 Causa raíz runtime/bootstrap: 30%
- F2 Aceptación productiva E2E real: 30%
- F3 Go-live operativo: 20%

No se suma una fase hasta cumplir su Definition of Done. Puede reportarse progreso interno de la fase, pero no se convierte automáticamente en porcentaje global cerrado.

### 9.2 Programa integral producción + postproducción — 100%

- F0: 10%
- F1: 15%
- F2: 15%
- F3: 10%
- F4: 15%
- F5: 15%
- F6: 15%
- F7: 5%

El porcentaje integral mide cierre de fases del plan, no cantidad de líneas de código ni número de módulos visibles.

## 10. Reporte obligatorio en cada iteración

Toda respuesta de cierre debe incluir, como mínimo:

- fase actual;
- avance visible logrado;
- porcentaje interno de la fase;
- porcentaje ruta a producción;
- porcentaje programa integral;
- fuente/base/HEAD;
- clasificación;
- implementación realizada;
- pruebas/evidencia;
- estado de escrituras/deploy;
- documentación sincronizada sí/no;
- impacto reusable/Claude;
- impacto Academia;
- pendiente;
- siguiente acción exacta.

Si no hubo avance visible, debe decirse expresamente y explicar por qué. Dos iteraciones sin avance visible obligan a STOP metodológico y revisión de causa raíz.

## 11. Política no-code y anti-parches

Un fix no se considera solución durable si queda únicamente en wrapper/harness cuando el defecto pertenece al producto.

El harness puede observar, aislar y validar. El rootfix definitivo debe vivir en el owner real del comportamiento.

Todo comportamiento reusable debe volver al core/configuración SaaS. Todo comportamiento A&S-only debe quedar en tenant config/datos, nunca hardcodeado en módulos genéricos.

## 12. Protección de producción

Hasta cerrar F1/F2:

- no reset de contraseña;
- no creación de nuevo Admin/usuario por descarte;
- no reimportación para corregir runtime/UI;
- no nuevo ZIP/candidata para diagnosticar;
- no HostDime como hipótesis sin evidencia;
- no escrituras productivas;
- no main/merge;
- no reabrir módulos cerrados sin regresión demostrada.

## 13. Academia y Claude

Clasificación acumulativa de este addendum:

- `REPLICABLE_CLAUDE_ACUMULADO`: estados/checkpoints, lifecycle de releases, separación observer/rootfix, control plane no-code, anti-parches;
- `BACKEND_PROTEGIDO_NO_CLAUDE`: live-state, gates, Auth, membership, secrets, store, runner, rollback;
- `ACADEMIA_ACTUALIZAR`: continuidad entre conversaciones, documentación canónica, STOP_RETRY, causa raíz vs validator, no-code tenant control plane;
- `TENANT_AYS_ONLY`: datos, branding, parámetros y escenarios propios de A&S.

## 14. Regla final de congelamiento

Antes de reanudar: índice -> live-state -> HEAD/PR -> última evidencia.
Antes de corregir: clasificar owner.
Antes de runtime/deploy: gate + autorización + checkpoint durable.
Después de runtime/deploy: detener, leer, clasificar y sincronizar.
Antes de otra candidata: demostrar que la anterior no puede cerrarse por owner/rootfix.
Antes de declarar producción: E2E real e integridad.
Antes de segundo tenant: demostrar configuración reusable y cero fork/hardcode.

Este plan permanece congelado hasta que un addendum posterior, explícitamente autorizado y trazable, lo modifique.