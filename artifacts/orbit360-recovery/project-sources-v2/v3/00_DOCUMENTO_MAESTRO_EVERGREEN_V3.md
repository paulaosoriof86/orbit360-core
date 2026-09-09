# Gravicentra Insurance — Documento Maestro Evergreen V3

**Estado:** PREVALENTE / EVERGREEN / FASE A  
**Producto visible:** Gravicentra Insurance  
**Repositorio:** `paulaosoriof86/orbit360-core`  
**Rama de autoridad:** `recovery/fase-a-clean-20260831`  
**Origen forense:** `9c95f31461f2eabe9804625b5659bee772f5602a`

## 1. Propósito y naturaleza

Este documento consolida los criterios permanentes de recuperación, QA, release, seguridad, datos y continuidad de Gravicentra Insurance Fase A. Deliberadamente **no contiene** gate actual, HEAD actual, run actual, buildId actual, Preview URL actual, porcentaje actual ni estados PASS/PENDING mutables.

Los datos operativos vivos se consultan exclusivamente en GitHub. Una fuente cargada al Proyecto ChatGPT no se usa nunca como reloj operativo.

## 2. Frontera del Proyecto ChatGPT

- El Proyecto ChatGPT se llama exactamente **Gravicentra Insurance**.
- Debe usar **Memoria solo del proyecto**.
- El Proyecto histórico Orbit 360 queda como archivo de contexto; no ejecuta el recovery.
- No se mueven chats históricos ni conversaciones de decisión al Proyecto de recovery.
- Chats, PR bodies, capturas, archivos históricos y conversaciones son evidencia/contexto, no autoridad operativa.
- La marca visible es **Gravicentra Insurance**. Identificadores técnicos `Orbit 360` / `orbit360-*` pueden mantenerse por compatibilidad y no representan un segundo producto.

## 3. Autoridades y precedencia

La verdad se separa por tipo:

1. **Normativa evergreen:** este paquete V3 y las reglas prevalentes que consolida.
2. **Estado operativo vivo:** `artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json`.
3. **Lineage aprobado:** `artifacts/orbit360-recovery/release-control/CAPABILITY_LINEAGE_LOCK.json`.
4. **Estado operativo por capability:** `artifacts/orbit360-recovery/release-control/CAPABILITY_STATUS_LEDGER.json`, como proyección derivada y validada contra Control Plane; no puede gobernar gate ni release identity.
5. **Plan de ejecución congelado:** `PLAN_TRABAJO_CONGELADO_V2.md` + su addendum evergreen vigente.
6. **Evidencias físicas:** artifacts, manifests, readbacks, runs y registros por gate/capability.
7. Histórico: evidencia únicamente.

`RECOVERY_STATE.json` y `ACTIVE_RELEASE_LOCK.json` son tombstones deprecados y no gobiernan workflows.

Si una fuente estática contradice un dato mutable de `CONTROL_PLANE.json`, prevalece `CONTROL_PLANE.json`. Si una conversación contradice evidencia física de GitHub, prevalece GitHub.

## 4. Objetivo rector

Terminar Gravicentra Insurance Fase A preservando la última versión aprobada de cada capacidad. **No se reconstruye el producto desde cero.** El recovery resuelve lineage, composición, runtime, seguridad, QA y release sin perder trabajo aprobado.

Está prohibido:

- baseline histórico + overlays como release final;
- asumir que el archivo más reciente es la última versión aprobada;
- reabrir lineage por un fallo runtime ordinario;
- simplificar capacidades porque no aparezcan hoy en el runtime;
- reimportar datos para arreglar UI, cache, routing, composición, permisos o validators;
- cambiar de Firebase o repositorio para esta salida;
- parchar un artifact certificado;
- saltar gates;
- declarar PASS sin evidencia física;
- pedir trabajo local/manual a Paula salvo imposibilidad técnica real.

## 5. Alcance Fase A — 15 capabilities congeladas

1. `LOGIN_PRIMARY_RUNTIME`
2. `ROLE_SCOPE_RUNTIME`
3. `SINGLE_ENTRYPOINT_SHELL_ROUTER`
4. `STARTUP_PWA_PERFORMANCE`
5. `INICIO_PRIMARY_RUNTIME`
6. `CLIENTE360_PRIMARY_RUNTIME`
7. `VEHICULOS_PRIMARY_RUNTIME`
8. `CROSS_MODULE_RELATIONSHIPS`
9. `ASEGURADORAS_PRIMARY_RUNTIME`
10. `ASEGURADORAS_OPERATIONAL_DIRECTORY`
11. `OPS_PRIMARY_RUNTIME`
12. `LEADS_PRIMARY_RUNTIME`
13. `POLIZAS_PRIMARY_RUNTIME`
14. `RECIBOS_CARTERA_PRIMARY_RUNTIME`
15. `COBROS_PRIMARY_RUNTIME`

CRUD, hidratación, shell/router/navegación, relaciones y sincronizaciones aprobadas quedan incluidas dentro de esos contratos.

## 6. Lineage congelado

I1 fija la última versión aprobada de las 15 capabilities. Una vez `CAPABILITY_LINEAGE_LOCK.json` está `FROZEN`:

- I2–I5 consumen el lock; no redescubren versiones aprobadas;
- un fallo runtime no reabre lineage por defecto;
- solo una `LINEAGE_EXCEPTION` físicamente probada puede modificarlo;
- la excepción debe indicar capabilities afectadas, causa, evidencia before/after y motivo;
- las capabilities no afectadas conservan su binding y evidencia.

La ausencia actual de una función, colección, owner, bridge o UI no demuestra que nunca existió.

## 7. Cadena de release congelada

`I0 Freeze/autoridad → I1 lineage → I2 clean source/composición/startup/write contracts → I3 build inmutable + Preview + readback → I4A QA individual Preview → I4B E2E transversal → I5 mismo artifact a producción + QA LIVE → I6 refresh agosto/postproducción`

Los bugs no crean iteraciones nuevas. Se resuelven dentro del gate activo.

Si cambia **product source** después de I3:

1. se clasifica el defecto y el impacto causal;
2. `CONTROL_PLANE` abre nueva candidata exacta en I2;
3. I2 prueba esa candidata;
4. I3 construye artifact/digest nuevo;
5. se invalidan solo evidencias causalmente afectadas;
6. jamás se parchea el artifact anterior.

Cambios solo de gobierno/QA no cambian product source si la evidencia física demuestra que no lo tocaron.

## 8. Artifact, frontend y backend

- Existe un solo `index.html` productivo canónico.
- LAB, seeds y auth-LAB quedan fuera del entrypoint/artifact productivo.
- Build una vez; Preview y producción usan los mismos bytes frontend certificados.
- El backend source package se liga por digest a la misma candidata de I3.
- El backend canónico de producción se despliega únicamente dentro de I5.
- Infraestructura Preview necesaria en I4A debe estar aislada por nombre/región/routing, no ser alcanzable por producción y respetar el alcance causal autorizado.
- Si cambia source después del build, nace digest nuevo.
- Readback exacto y asset identity son obligatorios.
- No se acepta un source corregido si el navegador ejecuta otros bytes.

## 9. Datos y backend

- Firestore sigue como fuente operativa.
- Drive sigue como repositorio documental.
- Durante I0–I5 el corte rector es **2026-07-31**.
- Agosto queda HOLD hasta `PRODUCTION_ACCEPTED=true`.
- I6 procesa **2026-08-01 a 2026-08-31** por fuente, con dry-run, diff, deduplicación, autorización, auditoría y rollback.
- No se migra backend sin autorización.
- No se reimportan datos para corregir defectos de runtime/UI/composición.
- Las escrituras se ejecutan solo cuando el gate las autoriza y deben registrar before/after e integridad.

## 10. Aseguradoras y seguridad

Operativo, Admin/AdminTenant, SuperAdmin y Dirección deben ver y operar el directorio completo conforme a la última versión aprobada, incluidos:

- usuario;
- contraseña mediante revelado/copia segura;
- portales;
- cuentas operativas aprobadas.

Asesor no obtiene visibilidad completa salvo aprobación posterior demostrada.

Reglas:

- ocultar controles en UI no constituye seguridad;
- la autorización debe estar en backend;
- no se persisten secretos en browser, artifacts, logs, capturas o evidencias;
- reveal/copy y reautenticación deben probarse con el provider/callable aprobado;
- una función legacy incompatible no sustituye el contrato certificado.

## 11. Performance y startup

- Login y primer render no esperan service worker.
- Módulos no esenciales no bloquean primer render.
- Hidratación inicial debe ser la mínima necesaria.
- Ningún timeout de 30/120 s forma parte del flujo exitoso normal.
- Las esperas del harness de QA no redefinen el contrato de performance del producto.
- Assets críticos quedan ligados al build/digest.

## 12. Prueba obligatoria por capability

Cada capability debe demostrar, según aplique:

1. última aceptación;
2. source/blob SHA exacto;
3. owner funcional y owner efectivo;
4. bridges/projectors/facades/dependencias;
5. colecciones canónicas de lectura;
6. colecciones canónicas de escritura;
7. identificadores/joins canónicos;
8. aliases/normalizadores autorizados;
9. semántica read/write;
10. roles y scopes;
11. ruta/carga y assets ejecutados;
12. última UI/flujo aprobado;
13. acción principal;
14. persistencia y reload;
15. relaciones transversales;
16. transformaciones de dinero, porcentajes, unidades, fechas y estados;
17. frontera de seguridad;
18. buildId/artifact/digests aplicables;
19. golden records/invariantes;
20. ausencia de 404, page errors, console errors y HTTP errors relevantes;
21. responsive aplicable.

Estados finales válidos:

- Preview: `LATEST_APPROVED_VERSION_PREVIEW_PASS`.
- Producción: `LATEST_APPROVED_VERSION_LIVE_PASS`.

Una capability no se reabre por reflejo: requiere diff causal o regresión reproducible.

## 13. Validación visual incremental con Paula

Dentro de I4A:

`LINEAGE_LOCATED → SOURCE_RECONCILED → PREVIEW_CANDIDATE → USER_VISUAL_CONFIRMED → TECHNICAL_PREVIEW_PASS → LATEST_APPROVED_VERSION_PREVIEW_PASS`

- Paula debe poder abrir, recorrer y volver a abrir la misma candidata.
- La revisión visual es obligatoria cuando aplique, pero no sustituye pruebas técnicas.
- Si cambia source/artifact/asset servido después de la revisión, la evidencia visual afectada se invalida.
- No se espera al final para enseñar todo el producto.

## 14. Root-Cause Closure obligatorio

Un defecto solo se cierra con esta cadena:

1. síntoma reproducible;
2. invariante esperado;
3. causa raíz causal demostrada;
4. capa responsable;
5. corrección dentro del gate activo;
6. prueba discriminante de desaparición de la causa;
7. regresión de dependencias afectadas;
8. evidencia Preview sobre artifact exacto;
9. validación visual de Paula cuando corresponda.

Si solo desaparece el síntoma, el defecto sigue `OPEN`.

## 15. Golden Business Invariants

Los casos de negocio deben probar semántica, no solo rendering:

- importes y moneda;
- periodicidad/forma de pago;
- estados de póliza/recibo/cartera/cobro;
- aseguradora y reglas particulares;
- cliente y relaciones;
- vehículo;
- roles/scopes;
- persistencia/reload;
- writes aprobados;
- relaciones transversales.

Los mismos casos viajan I4A → I4B → I5 sobre el mismo release identity, salvo writes reservados al gate correspondiente.

## 16. Contrato financiero — Recibos Esperados, Cartera Primas y Cobros

Son conceptos distintos y no se fusionan por conveniencia técnica:

- `recibosEsperados` representa el universo aprobado de recibos esperados;
- `carteraPrimas` representa cartera de primas;
- `cobros` representa eventos/evidencia de cobro conforme al contrato aprobado.

Debe demostrarse por lineage y runtime:

- owner de cada colección/read-model;
- IDs/joins con póliza, cliente y aseguradora;
- estados pendientes, pagados, recaudados, conciliados o inferidos aprobados;
- conciliaciones contra planillas/estados de cuenta cuando formen parte de la última aceptación;
- tratamiento aprobado de evidencia de comisión;
- prohibición de crear cobros ficticios;
- prohibición de remapear colecciones para “hacer cuadrar” la UI.

## 17. Contrato Pólizas y cálculo financiero

Pólizas debe conservar la última semántica financiera aprobada, incluyendo cuando corresponda:

- prima neta;
- asistencias;
- gastos de emisión;
- impuestos/IVA y base imponible;
- prima total;
- forma de pago;
- periodicidad/fraccionamiento;
- recargo por aseguradora/forma de pago;
- excepciones específicas solo cuando GitHub/evidencia aprobada las confirme.

No se introducen porcentajes o excepciones desde memoria.

Golden record congelado mientras siga válido en el corte rector:

`AUTO39012`
- `primaNeta = Q 1,800`
- `primaTotal = Q 2,678.53`

Debe conservar relaciones, magnitudes coherentes entre módulos y valor estable después de reload.

## 18. Vehículos y relaciones

Vehículos no puede reducirse porque hoy falten campos. Debe recuperarse la última versión aprobada y demostrar:

`Cliente <-> Póliza <-> Vehículo`

Las relaciones usan IDs canónicos; joins por nombre quedan prohibidos salvo un alias explícitamente aprobado y probado.

## 19. Cliente 360, Ops y Leads

Cliente 360/CRM, Ops y Leads se tratan como capacidades maduras, no como módulos para rediseñar desde cero.

- Cliente 360 debe mantener scopes, paginación/render coherente, ficha, relaciones y KPIs con semántica aprobada.
- Ops y Leads deben conservar sus ciclos, transiciones, write transport y sincronización aprobados.
- Ningún read-model scoped puede quedar desincronizado de paginación/DOM.
- Ningún write se acredita por inspección de source si el gate exige runtime/persistencia.

## 20. QA y evidencia

- El harness efectivo debe existir como bytes versionados y registrar blob SHA.
- Está prohibido autoparchear el harness dentro del runner.
- Corregir un validator no equivale a cambiar product source, salvo causalidad demostrada.
- Un run verde por sí solo no cierra un gate.
- Gate cerrado = evidencia física aplicable + identidad exacta + invariants PASS + Control Plane actualizado + guard central PASS posterior.
- No hay `PASS` por “la pantalla abre”.

## 21. Codex

Codex se usa solo cuando aporta ahorro mecánico material:

- lineage masivo;
- dependency graph;
- owners/bridges duplicados o shadowed;
- consolidación mecánica del clean tree.

No se usa para documentación, decisiones, auditorías pequeñas ni QA ordinario ejecutable con GitHub/ChatGPT.

## 22. Reanudación

Toda sesión nueva:

1. lee el paquete evergreen V3;
2. consulta físicamente `CONTROL_PLANE.json`;
3. consulta `CAPABILITY_LINEAGE_LOCK.json`;
4. consulta `CAPABILITY_STATUS_LEDGER.json`;
5. verifica HEAD y source drift con el guard;
6. ejecuta únicamente el gate autorizado;
7. conserva PASS no invalidado causalmente.

Nunca reconstruye el estado desde una conversación.

## 23. Postproducción

Después de I5 el mecanismo no se abandona. La release productiva aceptada queda fijada por release identity. Cada cambio futuro:

- declara impacto causal;
- crea candidata nueva;
- pasa Preview;
- retesta afectado + smoke transversal;
- promociona el mismo artifact;
- verifica LIVE.

La meta es impedir que HEAD, chats o snapshots vuelvan a sustituir la release productiva real.

## 24. Ciclo de vida de las fuentes del Proyecto

Este paquete es estático por diseño. **No se reemplaza por cambios normales de gate, run, HEAD, build, Preview, porcentaje o incidente operativo.**

Solo se genera una nueva versión de fuentes cuando cambia una regla normativa permanente, por ejemplo:

- autoridad/repo/rama/Firebase de recovery;
- secuencia de gates;
- lista de capabilities Fase A;
- rol/policy de seguridad;
- reglas de datos/corte;
- contrato de release;
- regla de lineage;
- arquitectura de autoridad;
- criterio obligatorio de QA;
- decisión de frontera del Proyecto ChatGPT.

Cuando ocurra uno de esos cambios:

1. se registra causa y evidencia en GitHub;
2. `CONTROL_PLANE.json` marca `projectSources.staticSourceUpdateRequired=true`;
3. se crea paquete evergreen de versión superior;
4. se valida integridad y ausencia de estado mutable;
5. se notifica a Paula con lista exacta de archivos a eliminar/reemplazar;
6. la versión anterior queda `SUPERSEDED_FOR_ACTIVE_PROJECT_SOURCES`, pero preservada en GitHub como trazabilidad.

No se edita silenciosamente una fuente ya cargada al Proyecto.
