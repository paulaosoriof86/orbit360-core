# MATRIZ CANÓNICA DE REGRESIÓN POST-GO-LIVE CONTRA ÚLTIMO PASS

Fecha de corte: 2026-08-26/27 GT  
Proyecto: Orbit 360 / A&S  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
HEAD observado antes de este documento: `e3504dcc35a6b48bdf2ea2baaa08dc516d69aa6b`  
Artefacto productivo certificado/desplegado: `8c9668d6d423e82826b0295431ec699390d79b4b`

## 1. Propósito

Congelar la frontera exacta entre:

1. procesos, módulos y datos ya investigados/construidos/validados;
2. defectos funcionales históricos ya corregidos;
3. anomalías post-go-live realmente observadas;
4. hipótesis antiguas que ya no son válidas frente al artefacto desplegado;
5. única comprobación diferencial todavía permitida.

Regla permanente para esta fase:

> **PASS histórico vigente + mismo artefacto productivo = NO REPROCESAR.**

Un dominio cerrado solo se reabre si existe evidencia de: PASS histórico inválido, artefacto distinto, regresión reproducible posterior o cambio de contrato funcional.

No se usa una anomalía visual como autorización para reimportar, reconstruir, rediseñar ni volver a investigar el proceso completo.

## 2. Autoridad y estado vivo

La autoridad mutable sigue siendo `orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json`.

Corte observado antes de este documento:

- `activeState.phase = PRODUCTION_SMOKE_PASS`;
- `activeState.status = PRODUCTION_GO_LIVE_PASS`;
- candidata certificada `artifactId=9504702901`;
- `sourceHead=8c9668d6d423e82826b0295431ec699390d79b4b`;
- evidencia F2 terminal: run `32920087220`, `F2_PRODUCTIVE_ACCEPTANCE_PASS`;
- go-live terminal: run `33029077881`, PASS;
- `firestoreWrites=0`, `authWrites=0`, `operationalWrites=0` en los cierres registrados;
- primera frontera incompleta: `HUMAN-LOGIN-VERIFICATION`;
- siguiente acción canónica: `VERIFY_HUMAN_EMAIL_PASSWORD_LOGIN_AND_START_POST_GO_LIVE_FUNCTIONAL_VALIDATION`;
- alcance post-go-live preservado: Inicio, Cliente 360, Aseguradoras, Pólizas, Vehículos, Recibos/cartera, Cobros, Ops, Leads, roles/scopes y sincronizaciones.

La validación post-go-live es diferencial. No equivale a reabrir la migración ni la investigación funcional.

## 3. Evidencia histórica que NO se reprocesa

### 3.1 Clientes / Cliente 360

Preservar:

- importación y normalización de clientes ya trabajada;
- fuente separada `clientes`;
- multirol/scopes;
- datos reales cargados y evidencia read-only;
- visualización Cliente 360 por roles en evidencia previa;
- ficha/lista/calidad y relaciones como funcionalidades ya construidas;
- reglas de no reimportación para problemas de visualización/acceso/cache/proyección.

La auditoría acumulativa RC1.2 del 4 de agosto clasificó Cliente 360 como módulo trabajado con datos reales read-only y conservó paridad de hashes de módulos entre baseline sellada y rama viva del corte.

### 3.2 Pólizas

Preservar:

- fuentes y normalización ya investigadas;
- póliza con estados fuente/operativo separados;
- llave compuesta y reglas de vigencia;
- prima neta/gastos/IVA/total separadas;
- solo `Vigente`/`Por renovar` alimenta calendario operativo/cartera;
- histórico no genera cartera;
- evidencia runtime/read-only previa por roles;
- corrección histórica de `undefined/NaN` en celda de cliente realizada en `core/crmkit.js` y posteriormente certificada.

El artefacto desplegado `modules/polizas.js` no contiene una segunda llamada a `getRoutePermission()` ni un segundo owner Auth de autorización. El acceso de ruta pertenece al owner Router/Access.

### 3.3 Recibos / cartera

Preservar el corte reconciliado existente. Evidencia conocida del dry-run 2026-07-30:

- 224 pólizas vigentes;
- 223 con calendario seguro;
- 1,261 recibos en calendario operativo;
- 641 pendientes de cartera;
- 99 exigibles/vencidos;
- 542 futuros;
- 365 pagos reportados no conciliados;
- 211 sin saldo pendiente según aseguradora;
- 44 en HOLD;
- cero escrituras.

Reglas congeladas:

- calendario operativo = recibos conocidos de pólizas Vigente/Por renovar;
- cartera = obligaciones pendientes, separando exigible/vencido de futuro;
- canceladas/históricas/ya renovadas/futuras no alimentan el calendario operativo actual;
- pago reportado no se convierte automáticamente en cobro conciliado.

No regenerar ni reimportar recibos/cartera por una diferencia visual.

### 3.4 Cobros

Preservar:

- investigación de fuentes de cobranza ya realizada;
- separación cobros/recaudos vs `finmovs`;
- banco como fuente de conciliación, no creador directo de cobros;
- estados distintos: reportado, validado/aplicado, pagado por conciliar, conciliado;
- writes controlados e idempotencia ya trabajados;
- evidencia acumulativa fuerte de backend/gates del dominio.

El módulo desplegado mantiene explícitamente la diferencia entre `reportado por cliente`, `validado`, `pagado` y `conciliado`. No rediseñar la semántica de cobros sin una regresión concreta.

### 3.5 Ops / OX

Preservar:

- Ops no contiene prospectos; es operación;
- kanban configurable;
- gestiones operativas, inspección, emisión, modificación, servicio post-emisión y cierre;
- vínculo con Cliente 360/Portal;
- motor compartido `Orbit.ciclo`;
- evidencia runtime previa en tres roles, incluido Ops restringido para asesor cuando corresponde.

No reconstruir Ops por falta de aceptación visual postproducción.

### 3.6 Leads

Preservar:

- Leads = pipeline comercial;
- vínculo con Cotizador/Comparativo;
- transición a Ops cuando se requiere actividad operativa;
- continuidad de trazabilidad del negocio;
- motor compartido `Orbit.ciclo` y eventos/store;
- evidencia runtime previa por roles.

No reconstruir Leads ni su investigación previa sin una regresión reproducible.

## 4. Hallazgos post-go-live que SÍ están abiertos

| Área | Evidencia/observación actual | Clasificación actual | Qué está permitido | Qué está prohibido |
|---|---|---|---|---|
| Acceso humano | Ledger mantiene `HUMAN-LOGIN-VERIFICATION` como primera frontera incompleta | `ENVIRONMENT_FAILURE` hasta cierre de la ruta humana | Verificar/corregir únicamente entorno/proveedor/ruta de autenticación y luego validar login humano | Tocar Cliente 360/Pólizas/datos para resolver login |
| Cliente 360 | Se observó divergencia visual lista `0 de 0` vs KPI con datos | `FUNCTIONAL_DEFECT` o `DATA_CONTRACT_FAILURE` todavía por aislar en borde común Access/store/readiness; causa final NO probada | Reproducir una vez y comparar lecturas contractualmente equivalentes | Reimportar clientes, rehacer Cliente 360, cambiar scopes sin evidencia |
| Pólizas | Históricamente hubo `undefined/NaN` y luego un timeout recuperado; ambos entraron al hardening transversal y F2 terminal posterior PASS | Cerrado respecto de esos defectos históricos; solo regresión nueva si se reproduce | Smoke diferencial después de acceso humano estable | Volver a usar “doble owner Router/Auth” como causa vigente |
| Recibos/cartera | Censo/dry-run reconciliado existe; sin anomalía post-go-live reproducida todavía | Cerrado hasta evidencia contraria | Verificación diferencial de presencia, relaciones, totales y estado | Regenerar/reimportar calendario/cartera |
| Cobros | Defecto visible `undefined/NaN` histórico fue corregido antes de F2 terminal PASS | Cerrado respecto de ese defecto; nueva regresión requiere reproducción | Verificación diferencial de estados, moneda, relación póliza/recibo y conciliación | Rehacer modelo o importar banco como cobro |
| Ops | Evidencia runtime histórica y lógica desplegada | Cerrado hasta evidencia contraria | Smoke diferencial del flujo esperado y visibilidad por rol | Rediseñar kanban/ciclo |
| Leads | Evidencia runtime histórica y lógica desplegada | Cerrado hasta evidencia contraria | Smoke diferencial y transición compartida con Ops | Reconstruir pipeline |

## 5. Correcciones de diagnóstico — hipótesis retiradas

### RETIRADA 1 — “Cliente 360 falla porque clientProjection está vacío/desactualizado”

No se acepta como causa vigente.

Hechos del artefacto desplegado:

- `cliente360.js` intenta `Orbit.clientProjection.withReadBatch` solo si existe;
- si no existe, cae a `Orbit.store.all()`;
- el `index.html` del artefacto `8c9668d6...` no carga `core/client-canonical-view-projection-v20260716.js`.

Por tanto, no existe evidencia para atribuir la divergencia actual a `clientProjection`.

### RETIRADA 2 — “Pólizas tiene doble autorización Router + Auth dentro de polizas.js”

No se acepta como causa vigente.

Hechos:

- el `modules/polizas.js` desplegado no llama `getRoutePermission()`;
- el control de acceso vigente está centralizado en Router/`Orbit.access`.

Si Pólizas vuelve a fallar, debe diagnosticarse desde el comportamiento contemporáneo, no reutilizando esta hipótesis.

## 6. Cliente 360 — frontera causal actual más estrecha

El artefacto productivo ejecuta el render de Cliente 360 dentro de `Orbit.access.withScope('cliente360', ...)` mediante `crm-v1198-operational-bridge.js`.

`withScope()` sustituye temporalmente `Orbit.store` por una fachada cuyo `all(collection)` ejecuta `Orbit.access.filter(...)` para colecciones operativas.

Después del render, `enhanceClientList()` vuelve a leer `baseStore().all('clientes')` y vuelve a ejecutar `A.filter(..., 'cliente360')` para recalcular KPI.

Contractualmente ambos caminos deberían producir el mismo universo de clientes para el mismo rol/scope/país. Si la lista base ve 0 y el enhancer ve cientos, el comportamiento no es una diferencia funcional legítima: existe una divergencia de estado/orden/readiness o de ejecución en el borde común Access/store.

Esto NO autoriza todavía a modificar Access/store. La siguiente prueba debe medir simultáneamente, en una misma reproducción y sin writes:

1. `Orbit.auth.user()` / rol activo / asesorId;
2. `Orbit.access.dataScope('cliente360')`;
3. países permitidos y país activo;
4. conteo raw de `baseStore().all('clientes')`;
5. conteo `Orbit.access.filter('clientes', raw, 'cliente360')`;
6. conteo devuelto por `scopedStore.all('clientes')` dentro de `withScope`;
7. readiness/store mode en esos dos instantes;
8. diagnóstico `OrbitRuntimeDiagnostics.cliente360.list`.

La primera divergencia observable entre esos ocho puntos define la capa responsable. No se cambia producto antes de esa prueba.

## 7. Orden canónico de aceptación post-go-live

Después de cerrar login humano:

1. Cliente 360 — solo reproducir y aislar la divergencia Access/store si persiste.
2. Pólizas — smoke diferencial, no rediseño.
3. Vehículos — dependencia de póliza, smoke diferencial.
4. Recibos/cartera — comparar contra censo/corte canónico, no regenerar.
5. Cobros — estados/relaciones/moneda/conciliación; no reimportar banco.
6. Ops — flujo y visibilidad por rol.
7. Leads — flujo comercial y sincronización con Ops.
8. Roles/scopes.
9. Sincronizaciones y efectos entre módulos.

Cada módulo se declara `PASS_PRESERVED` si no contradice su evidencia histórica. Solo una regresión reproducible abre corrección.

## 8. Regla anti-bucle para conversaciones futuras

Antes de proponer una corrección:

1. leer ledger vivo;
2. confirmar SHA productivo;
3. buscar PASS histórico del dominio;
4. comparar source desplegado, no HEAD incremental si este difiere del artefacto productivo;
5. retirar hipótesis incompatibles con el source actual;
6. ejecutar una sola prueba diferencial mínima;
7. clasificar la primera divergencia;
8. corregir una sola capa;
9. no reimportar ni reconstruir si la causa no es datos/proceso.

Dos fallos iguales de etapa/código activan `STOP_RETRY`.

## 9. Estado de carriles tras esta matriz

- Carril A — frontend/UX/Academia: aceptación visual post-go-live pendiente; sin rediseño general.
- Carril B — backend/seguridad: go-live técnico PASS; login humano es la primera frontera; Cliente 360 requiere diagnóstico diferencial Access/store solo si persiste tras acceso estable.
- Carril C — datos reales: preservado/frozen; no reimportar; refresh 2026-08-01→fecha actual solo después de go-live estable y con dry-run/autorización correspondiente.

## 10. Siguiente acción exacta

`CERRAR HUMAN-LOGIN-VERIFICATION → REPRODUCIR UNA VEZ CLIENTE360 CON TELEMETRÍA COMPARATIVA WITHSCOPE VS A.FILTER → CLASIFICAR PRIMERA DIVERGENCIA → CORREGIR SOLO ESA CAPA SI EXISTE → CONTINUAR SMOKES DIFERENCIALES SIN REPROCESAR DOMINIOS CERRADOS.`

No se autoriza por este documento ningún deploy, escritura, reimportación, main ni merge.
