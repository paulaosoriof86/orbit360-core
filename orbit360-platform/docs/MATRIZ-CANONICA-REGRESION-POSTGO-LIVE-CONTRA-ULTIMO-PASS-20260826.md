# MATRIZ CANÓNICA DE REGRESIÓN POST-GO-LIVE CONTRA ÚLTIMO PASS

Fecha de corte: 2026-08-26/27 GT  
Proyecto: Orbit 360 / A&S  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
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

Corte observado para esta matriz:

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

### 3.2 Aseguradoras

**Estado protegido: `PASS_PRESERVED_SOURCE`. No es un módulo pendiente de construir ni de reimportar.**

Preservar:

- 26 aseguradoras como universo canónico del corte validado;
- directorio, ficha, conocimiento y responsive ya trabajados;
- visibilidad por Dirección, Operativo y Asesor conforme roles/scopes;
- importador con contratos de no falso éxito y no reimportación para resolver UI/access;
- separación entre dato operativo y secreto;
- owner único y bootstrap del Router;
- solución final consolidada en el commit histórico `6145e3b0a4173c582617bfc26dbfdc0c55b88b86` y presente en el artefacto certificado/desplegado `8c9668d6...`.

#### Historia causal preservada

Aseguradoras sí tuvo defectos reales antes del cierre final:

1. acceso/visibilidad incompletos por rol;
2. semántica incorrecta de usuario/cuentas como si fueran secretos;
3. permisos bancarios/plataformas mezclados;
4. ownership/wiring competido;
5. validadores que llegaron a aceptar semántica anterior.

La clasificación histórica final fue:

`DATA_CONTRACT_FAILURE + FUNCTIONAL_DEFECT + VALIDATOR_STALE`.

La reparación fue selectiva. No exigió reimportar las 26 aseguradoras.

#### Contrato final que prevalece

Owner canónico:

`orbit360-platform/core/client-insurer-operational-directory-owner-v20260722.js`

Versión final:

`20260723.2`

Semántica obligatoria:

- usuario de portal = dato operativo visible/copiable según permisos;
- contraseña = secreto, no plaintext en store, revelado temporal mediante proveedor seguro y retorno a `Oculta`;
- número de cuenta bancaria = dato operativo visible directamente;
- copia bancaria directa = banco, tipo, número, moneda y titular;
- `accountRef`/reveal no es requisito para visualizar/copiar banco;
- owner no escribe store ni reimporta datos.

`modules/aseguradoras-v1202-resources-bridge.js` puede seguir existiendo como consumidor legacy, pero **no es autoridad final**. El bootstrap `core/router-tenant-config-bootstrap.js` solicita/carga el owner `20260723.2`, y el owner declara supersesión de las secciones bancarias/plataformas legacy.

#### Brecha de mecanismo encontrada el 27 de agosto

El validador histórico `orbit360-platform/tools/orbit360-aseguradoras-owner-contract-v20260717.js` es anterior al owner final. No comprueba `20260723.2`, `bankCopyDirect` ni la carga final del owner por el bootstrap.

La matriz nativa posterior también comprobaba principalmente presencia del directorio/ficha/conocimiento/responsive, pero no todas las invariantes finales de usuario/contraseña/cuenta/copia/owner.

Por ello:

- **producto canónico:** `PASS_PRESERVED_SOURCE`;
- **mecanismo antiguo de preservación:** `VALIDATOR_STALE`;
- **acción correcta:** endurecer el guard source-only, no tocar Aseguradoras ni reimportar datos.

Autoridad nueva de preservación:

- registro: `orbit360-platform/docs/orbit360-aseguradoras-preservation-registry-v20260827.json`;
- validador: `tools/orbit360-aseguradoras-operational-owner-preservation-v20260827.mjs`;
- Academia: `orbit360-platform/docs/ACADEMIA-PRESERVACION-ASEGURADORAS-POSTGO-LIVE-20260827.md`.

### 3.3 Pólizas

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

### 3.4 Recibos / cartera

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

### 3.5 Cobros

Preservar:

- investigación de fuentes de cobranza ya realizada;
- separación cobros/recaudos vs `finmovs`;
- banco como fuente de conciliación, no creador directo de cobros;
- estados distintos: reportado, validado/aplicado, pagado por conciliar, conciliado;
- writes controlados e idempotencia ya trabajados;
- evidencia acumulativa fuerte de backend/gates del dominio.

El módulo desplegado mantiene explícitamente la diferencia entre `reportado por cliente`, `validado`, `pagado` y `conciliado`. No rediseñar la semántica de cobros sin una regresión concreta.

### 3.6 Ops / OX

Preservar:

- Ops no contiene prospectos; es operación;
- kanban configurable;
- gestiones operativas, inspección, emisión, modificación, servicio post-emisión y cierre;
- vínculo con Cliente 360/Portal;
- motor compartido `Orbit.ciclo`;
- evidencia runtime previa en tres roles, incluido Ops restringido para asesor cuando corresponde.

No reconstruir Ops por falta de aceptación visual postproducción.

### 3.7 Leads

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
| Acceso humano | Ledger mantiene `HUMAN-LOGIN-VERIFICATION` como primera frontera incompleta | `ENVIRONMENT_FAILURE` hasta cierre de la ruta humana | Verificar/corregir únicamente entorno/proveedor/ruta de autenticación y luego validar login humano | Tocar Cliente 360/Aseguradoras/Pólizas/datos para resolver login |
| Aseguradoras | Solución final presente en `8c9668d6...`, pero el validador histórico no protege el owner final `20260723.2` ni todas sus invariantes | **`VALIDATOR_STALE` del mecanismo; producto `PASS_PRESERVED_SOURCE`** | Endurecer contrato source-only y luego smoke diferencial por roles | Reimportar 26 aseguradoras, rehacer directorio, volver a ocultar cuentas/usuarios como secretos |
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

### RETIRADA 3 — “El bridge legacy de Aseguradoras demuestra que la solución final se perdió”

No se acepta como causa vigente.

Hechos:

- el bridge v1202 conserva semántica anterior por compatibilidad;
- el artefacto canónico también contiene el owner final `20260723.2`;
- Router bootstrap solicita/carga ese owner;
- el owner final declara supersesión de las secciones bancarias/plataformas legacy y materializa la semántica vigente.

La existencia del archivo legacy no equivale a ser owner final. La prueba correcta es verificar wiring, versión, readiness y supersesión.

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

## 7. Aseguradoras — frontera causal y contrato de preservación

Antes de cualquier smoke post-go-live de Aseguradoras debe pasar el guard source-only final.

Ese guard debe fallar si se pierde cualquiera de estas invariantes:

1. owner final exactamente `20260723.2`;
2. `ownerId=clientInsurerOperationalDirectoryOwner`;
3. supersesión explícita de bancos/plataformas legacy;
4. usuario operativo visible;
5. contraseña protegida, temporal y oculta por defecto;
6. cuenta bancaria visible directamente;
7. cero dependencia de reveal para cuenta bancaria;
8. copia bancaria directa con banco/tipo/número/moneda/titular;
9. cero writes de store;
10. cero reimportación;
11. bootstrap solicitando/cargando la misma versión final;
12. bridge legacy sin convertirse en autoridad final.

Si este source guard falla, la clasificación inicial es `VALIDATOR_STALE`/divergencia de contrato de preservación y se congela producto. No se ejecuta browser, Firebase, deploy ni migración para “ver qué pasa”.

Después de PASS source-only, el smoke diferencial por roles debe verificar comportamiento visible real de esas mismas invariantes junto con las 26 aseguradoras, ficha, conocimiento y responsive.

## 8. Orden canónico de aceptación post-go-live

Después de cerrar login humano:

1. **Aseguradoras — source guard final ya endurecido; smoke diferencial de owner/usuario/password/bancos + directorio/ficha/conocimiento.**
2. Cliente 360 — solo reproducir y aislar la divergencia Access/store si persiste.
3. Pólizas — smoke diferencial, no rediseño.
4. Vehículos — dependencia de póliza, smoke diferencial.
5. Recibos/cartera — comparar contra censo/corte canónico, no regenerar.
6. Cobros — estados/relaciones/moneda/conciliación; no reimportar banco.
7. Ops — flujo y visibilidad por rol.
8. Leads — flujo comercial y sincronización con Ops.
9. Roles/scopes.
10. Sincronizaciones y efectos entre módulos.

Cada módulo se declara `PASS_PRESERVED` si no contradice su evidencia histórica. Solo una regresión reproducible abre corrección.

## 9. Regla anti-bucle para conversaciones futuras

Antes de proponer una corrección:

1. leer ledger vivo;
2. confirmar SHA productivo;
3. buscar PASS histórico del dominio;
4. comparar source desplegado, no HEAD incremental si este difiere del artefacto productivo;
5. confirmar owner final y cadena de carga, no solo presencia de archivos legacy;
6. retirar hipótesis incompatibles con el source actual;
7. ejecutar una sola prueba diferencial mínima;
8. clasificar la primera divergencia;
9. corregir una sola capa;
10. no reimportar ni reconstruir si la causa no es datos/proceso.

Dos fallos iguales de etapa/código activan `STOP_RETRY`.

## 10. Estado de carriles tras esta matriz

- Carril A — frontend/UX/Academia: aceptación visual post-go-live pendiente; Aseguradoras y demás dominios cerrados no se rediseñan sin regresión.
- Carril B — backend/seguridad/gates: go-live técnico PASS; login humano es la primera frontera; **Aseguradoras tenía un `VALIDATOR_STALE` de preservación y se corrige solo en el mecanismo source-only**; Cliente 360 requiere diagnóstico diferencial Access/store solo si persiste tras acceso estable.
- Carril C — datos reales: preservado/frozen; no reimportar clientes/aseguradoras; refresh 2026-08-01→fecha actual solo después de go-live estable y con dry-run/autorización correspondiente.

## 11. Siguiente acción exacta

`CERRAR HARDENING SOURCE-ONLY DE PRESERVACIÓN ASEGURADORAS → MANTENER PRODUCTO/DATOS CONGELADOS → CERRAR HUMAN-LOGIN-VERIFICATION → SMOKE DIFERENCIAL ASEGURADORAS CONTRA OWNER 20260723.2 → CLIENTE360 CON TELEMETRÍA COMPARATIVA SI PERSISTE DIVERGENCIA → CONTINUAR PÓLIZAS/VEHÍCULOS/RECIBOS/COBROS/OPS/LEADS SIN REPROCESAR DOMINIOS CERRADOS.`

No se autoriza por este documento ningún deploy, escritura, reimportación, main ni merge.
