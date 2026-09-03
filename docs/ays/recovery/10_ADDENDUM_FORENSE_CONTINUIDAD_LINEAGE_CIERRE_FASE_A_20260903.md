# Gravicentra Insurance — Addendum Forense de Continuidad, Lineage y Cierre de Fase A

**Fecha de congelamiento:** 2026-09-03  
**Estado:** OBLIGATORIO / COMPLEMENTARIO / ANTI-DESCARRILAMIENTO  
**Plan rector que complementa:** Plan Maestro Gravicentra Insurance Recovery v1.3  
**Repositorio:** `paulaosoriof86/orbit360-core`  
**Rama de autoridad:** `recovery/fase-a-clean-20260831`  
**Origen forense:** `9c95f31461f2eabe9804625b5659bee772f5602a`

## 1. Propósito y efecto

Este addendum congela las decisiones de ejecución necesarias para terminar Gravicentra Insurance Fase A sin perder trabajo aprobado, sin reconstruir el producto desde cero y sin volver a entrar en ciclos de diagnóstico/parche/verificación tardía.

**No crea un plan nuevo, no crea iteraciones adicionales y no sustituye el Plan Maestro v1.3.** Su función es hacer explícitos los contratos forenses, de lineage, composición, evidencia, validación visual y release que deben cumplirse dentro de las iteraciones I0–I6 ya congeladas.

Ante cualquier cambio de conversación, interrupción de sesión o pérdida de contexto, este documento debe leerse junto con las autoridades rectoras antes de ejecutar cambios.

## 2. Precedencia y autoridades

La precedencia sustantiva original se conserva. El orden de lectura obligatorio es:

1. `02_ADDENDUM_PREVALENTE_FRONTERA_PROYECTO`.
2. Estado vivo de recovery y su complemento de continuidad vigente.
3. Plan Maestro Gravicentra Insurance Recovery v1.3.
4. Manifiesto de Capacidades Fase A.
5. Addendum Anti-Descarrilamiento.
6. Matriz módulo por módulo Fase A.
7. **Este Addendum Forense de Continuidad, Lineage y Cierre**, que complementa los puntos anteriores en materia de prueba, continuidad, contratos y cierre causal.
8. Histórico: únicamente contexto/evidencia; nunca autoridad automática.

Si una instrucción operativa antigua del `state` ya fue físicamente cumplida —por ejemplo crear el Proyecto ChatGPT Gravicentra Insurance—, no debe repetirse. El complemento de continuidad vigente puede declarar esos campos operativos como `SUPERSEDED_BY_EXECUTED_REALITY`, sin modificar las reglas sustantivas del Addendum Prevalente ni del Plan v1.3.

## 3. Regla central de preservación

**Toda capacidad previamente trabajada y aprobada es patrimonio funcional del producto y objetivo obligatorio de lineage hasta demostrar su última versión aprobada.**

La ausencia actual de una función en la UI, una colección no hidratada, un owner no conectado, un bridge shadowed, un asset viejo o un comportamiento degradado **no demuestra que la capacidad nunca existió** y no autoriza:

- simplificar el módulo;
- reconstruir una versión menor por lógica;
- sustituir una semántica de negocio por otra más fácil;
- descartar trabajo porque no aparezca en el HEAD actual;
- reimportar datos para ocultar un defecto de runtime;
- regresar a un baseline histórico como release final;
- declarar PASS porque una pantalla “ya abre”.

La recuperación debe localizar la **última versión aprobada de la capacidad**, no simplemente el archivo más reciente.

## 4. Estado formal y estado físico al congelamiento

**Estado formal rector:**

- I0 — Freeze/autoridad: `PASS`.
- I1 — Lineage de última versión aprobada: `IN_PROGRESS`.
- Release: `RELEASE_BLOCKED`.
- Producción: `NOT_PRODUCTION_ACCEPTED`.
- Producción tocada por este congelamiento: `NO`.
- Datos tocados por este congelamiento: `NO`.
- Corte operativo para I0–I5: `2026-07-31`.
- Refresh agosto: `HOLD` hasta `PRODUCTION_ACCEPTED`.
- Fecha objetivo histórica 2026-08-31: `MISSED`; la respuesta es `RECOVERY_EXPEDITED`, no saltarse gates.

**Snapshot físico observado al iniciar este congelamiento — debe revalidarse en cada reanudación y no asumirse eterno:**

- HEAD: `9b5d16f236afe95261b54fd7e4fe0e797b30a64d`.
- Tree: `b4938e26459e8c9861be79d9596320cbdb81a100`.
- Commit: `test(recovery): prove cartera read-model field shape`.
- El branch contiene trabajo posterior al origen forense que debe preservarse y reconciliarse, no borrarse ni acreditarse automáticamente como PASS.

## 5. Regla de reconciliación del trabajo ya realizado

Los commits posteriores al origen forense deben clasificarse, conservando su trazabilidad, como una de estas categorías:

- `CREDITABLE_EVIDENCE` — evidencia que puede reutilizarse sin repetir trabajo si continúa siendo válida para el HEAD/artifact que se está certificando.
- `VALID_SOURCE_CHANGE` — cambio de source que pertenece al clean tree y requiere la prueba correspondiente del gate activo.
- `DIAGNOSTIC_ONLY` — instrumentación o diagnóstico que no constituye cierre funcional.
- `SUPERSEDED_OR_REQUIRES_RETEST` — evidencia o cambio que perdió validez por source/artifact posterior o por contradicción con la última capacidad aprobada.

No se pierde trabajo por no poder acreditarlo como PASS; se preserva como evidencia y se determina exactamente qué parte sigue siendo reutilizable.

Cuando el volumen lo justifique, Codex puede utilizarse **solo** para la parte mecánica de esta reconciliación masiva, dependency graph, owners/bridges duplicados o shadowed y consolidación del clean tree. Las decisiones funcionales y de aceptación no se delegan a Codex.

## 6. Capability Contract obligatorio — 15/15 capacidades

Antes de cerrar I1, cada capacidad del manifiesto debe tener un contrato único y positivo con, como mínimo:

1. Nombre de capability.
2. Última aceptación localizada y evidencia de aceptación.
3. Source SHA/blob SHA exacto de la versión aprobada.
4. Owner funcional y owner efectivo de runtime.
5. Bridges, projectors, facades y dependencias que intervienen.
6. Colecciones canónicas de lectura.
7. Colecciones canónicas de escritura.
8. Identificadores canónicos y joins entre entidades.
9. Aliases permitidos y normalizadores autorizados.
10. Semántica funcional read/write.
11. Roles y scopes.
12. UI/flujo aprobado.
13. Acción o acciones principales aprobadas.
14. Persistencia y comportamiento después de reload.
15. Relaciones con otras capacidades.
16. Transformaciones autorizadas de dinero, porcentajes, unidades, fechas y estados.
17. Owner de escritura y frontera de seguridad.
18. Ruta de carga y asset(s) ejecutados.
19. `sourceCommit`, `tree`, `buildId`, asset SHA y artifact digest de la candidata que se pruebe.
20. Golden records/invariantes que demostrarán que la semántica no se degradó.

**I1 no puede cerrarse por mera localización de archivos.** Debe quedar demostrado qué versión es la última aprobada y cómo llega efectivamente al runtime.

## 7. Contrato especial: Recibos Esperados, Cartera de Primas y Cobros

Estos conceptos **no pueden fusionarse ni simplificarse por conveniencia técnica**. El runtime actual o una colección existente no define por sí sola la semántica aprobada.

El lineage debe demostrar por separado:

- qué representa `recibosEsperados`;
- qué representa `carteraPrimas`;
- qué representa `cobros`;
- qué owner crea/actualiza cada uno;
- cómo se relacionan con Pólizas, Cliente, Aseguradora y pagos/comisiones;
- qué estado de recibo se considera pendiente, pagado, recaudado, conciliado, inferido u otro estado aprobado;
- cuáles son los identificadores/joins reales;
- cuál fue la última UI/flujo aprobado para Recibos/Cartera/Cobros;
- qué conciliaciones alimentaban o validaban esos estados.

### 7.1 Lineage histórico obligatorio a localizar

El siguiente trabajo fue reportado por la propietaria del producto como trabajo previamente realizado y aprobado. **Se congela como `HISTORICAL_ACCEPTANCE_CLAIM_PENDING_SOURCE_PROOF`: obliga a localizarlo y demostrarlo; no se convierte en verdad técnica por memoria solamente.**

Debe buscarse evidencia de:

- conciliaciones contra planillas de aseguradoras;
- conciliaciones contra estados de cuenta de aseguradoras;
- determinación de todos los recibos asociados a cada póliza;
- determinación de recibos pendientes/no pendientes usando evidencia explícita;
- inferencias de recaudación basadas en pagos de comisión cuando esa lógica haya sido efectivamente implementada/aprobada, incluyendo el tratamiento de recibos anteriores al pago que gatilla la inferencia;
- relaciones entre cartera, recibos, cobros, pólizas, clientes, aseguradoras y comisión.

No debe sustituirse esta recuperación con un listado de siete documentos de `cobros` ni con la creación automática de cuotas nuevas si la versión aprobada era más rica.

### 7.2 Evidencia física ya discriminante

La evidencia forense previa ha mostrado datos operativos separados en `recibosEsperados`, `carteraPrimas` y `cobros`, mientras partes del runtime actual materializan cartera/recibos desde `cobros`. Esto se mantiene como defecto transversal a resolver por lineage/owner/read-model; no autoriza reimportación ni migración de backend.

## 8. Contrato especial: Pólizas y cálculo financiero

Pólizas debe recuperar y demostrar la última semántica financiera aprobada. No basta con mostrar un campo `primaTotal`.

Se congela como `HISTORICAL_ACCEPTANCE_CLAIM_PENDING_SOURCE_PROOF` la obligación de localizar, cuando corresponda a la última versión aprobada:

- prima neta;
- asistencias;
- gastos de emisión y su base/cálculo;
- impuestos/IVA y su base imponible;
- prima total;
- forma de pago;
- periodicidad/fraccionamiento;
- recargo de fraccionamiento por aseguradora y forma de pago;
- excepciones específicas por aseguradora, incluida la afirmación histórica de Colmena respecto de gastos de emisión, **solo si GitHub/evidencia aprobada la confirma**.

No se introducirán porcentajes ni excepciones desde memoria sin localizar su implementación/evidencia aprobada.

### 8.1 Golden record financiero ya disponible

`AUTO39012` debe permanecer como invariante de regresión mientras siga siendo un registro válido del corte autorizado:

- `primaNeta = Q 1,800`.
- `primaTotal = Q 2,678.53`.
- debe conservar relaciones correctas con Cliente/Aseguradora y sus recibos/cartera donde aplique;
- ningún módulo puede materializar una cifra de miles de millones a partir de ese valor;
- el valor debe mantenerse después de reload;
- debe ser consistente entre módulos que funcionalmente deban presentar la misma magnitud.

La discrepancia gigante observada anteriormente se considera defecto de runtime/artifact/composición hasta demostrar el asset exacto responsable. Los datos no deben reimportarse para corregirla.

## 9. Contrato especial: Vehículos

La ausencia actual del detalle de Vehículos no autoriza una UI reducida. Debe localizarse la última versión aprobada que mostraba el nivel de detalle vehicular y recuperar exactamente sus campos, relaciones, roles, acciones y persistencia.

La verificación debe cubrir también la relación Cliente ↔ Póliza ↔ Vehículo y cualquier navegación cruzada aprobada.

## 10. Contrato especial: CRM, Ops, Leads y Aseguradoras

CRM/Cliente 360, Ops, Leads y Aseguradoras fueron objeto de desarrollo funcional amplio. Deben tratarse como capacidades maduras a recuperar por lineage, no como módulos a rediseñar desde cero.

Para Aseguradoras sigue vigente el contrato rector:

- Operativo, Admin/AdminTenant, SuperAdmin y Dirección: directorio operativo completo según última versión aprobada;
- usuario, contraseña/revelado y cuentas: deben funcionar según la aceptación aprobada;
- ocultar controles en UI no sustituye seguridad;
- Asesor no obtiene visibilidad completa salvo aprobación posterior demostrada.

**Estado visual congelado al 2026-09-03:** `FAIL/PARTIAL`. La última revisión de la usuaria comprobó que el revelado de contraseña todavía no funciona. Además, el acceso a la candidata debe ser repetible para que pueda volver a visualizarla; una candidata que no se puede volver a abrir/revisar no queda cerrada.

## 11. Validación visual incremental obligatoria con la usuaria

No se volverá a esperar hasta el final para que la propietaria revise todo el producto.

Dentro de I4A, sin crear un gate nuevo, cada capability seguirá esta secuencia de evidencia:

`LINEAGE_LOCATED → SOURCE_RECONCILED → PREVIEW_CANDIDATE → USER_VISUAL_CONFIRMED → TECHNICAL_PREVIEW_PASS → LATEST_APPROVED_VERSION_PREVIEW_PASS`

Reglas:

- La usuaria debe poder abrir, recorrer y volver a abrir la misma candidata Preview.
- Se debe entregar una ruta/URL reproducible para la revisión cuando corresponda.
- La confirmación visual de la usuaria es evidencia funcional obligatoria, pero **no sustituye** roles, persistencia, consola, errores, relaciones, responsive, writes ni pruebas técnicas.
- Si después de la revisión cambia el source, cambia el artifact/digest o cambia un asset servido, la revisión anterior **no certifica** la nueva candidata. Se debe volver a presentar la capability afectada.
- No se reabre un módulo ya certificado si no existe una regresión causal reproducible o un cambio que invalide su digest/evidencia.

## 12. Source → Build → Artifact → Asset ejecutado

Para evitar el patrón “se arregló el source, pero el navegador ejecutó otra cosa”, toda candidata de I3/I4/I5 debe demostrar:

- branch exacto;
- source commit SHA;
- tree SHA;
- estado clean del source usado para build;
- buildId;
- artifact digest;
- inventario de assets críticos y SHA/digest;
- Preview/channel exacto;
- readback del HTML/asset servido cuando aplique;
- ausencia de assets shadowed o duplicados que cambien el owner efectivo;
- mismo artifact/digest promovido de Preview a producción.

**Build una vez. Preview y producción usan el mismo artifact.** Si cambia source después del build, el artifact anterior queda invalidado y debe generarse un digest nuevo. Nunca se parchea un artifact certificado.

## 13. Root-Cause Closure obligatorio para cada defecto

Ningún defecto se cierra con “ya se ve bien”. Debe conservar esta cadena mínima:

1. Síntoma reproducible.
2. Invariante/semántica aprobada esperada.
3. Causa raíz causal demostrada.
4. Capa responsable: lineage / data contract / owner / bridge / projector / runtime / hydration / routing / artifact / permissions / performance / otro.
5. Corrección aplicada dentro del gate activo.
6. Prueba discriminante de que la causa desapareció.
7. Prueba de regresión de las dependencias afectadas.
8. Evidencia Preview con el artifact exacto.
9. Cuando corresponda, validación visual de la usuaria sobre ese mismo digest.

Si solo desaparece el síntoma, el defecto continúa `OPEN`.

## 14. Golden Business Invariants

Cada capability debe incorporar registros/casos de negocio que prueben semántica, no solo rendering. Deben cubrir, según aplique:

- importes conocidos;
- moneda;
- periodicidad y forma de pago;
- estados de póliza/recibo/cartera/cobro;
- aseguradora y reglas particulares;
- cliente y relaciones;
- vehículo;
- roles/scopes;
- persistencia/reload;
- acción principal/write aprobado;
- relaciones transversales.

Los mismos golden cases deben viajar por I4A Preview → I4B E2E → I5 LIVE sobre el mismo artifact, salvo que el caso implique una escritura controlada reservada para el gate correspondiente.

## 15. Iteraciones congeladas — no crear otras

El camino sigue siendo exactamente:

- **I0 — Freeze/autoridad:** PASS.
- **I1 — Lineage de última versión aprobada:** IN_PROGRESS hasta contratos 15/15.
- **I2 — Clean source + index único + performance/startup + contratos de escritura.**
- **I3 — Build inmutable + Firebase Preview + readback exacto.**
- **I4A — Prueba individual módulo por módulo en Preview, incluida validación visual incremental.**
- **I4B — Matriz E2E módulo × rol × viewport + relaciones.**
- **I5 — Promover el MISMO artifact + rehash + pruebas LIVE módulo por módulo + writes controlados + integrity + rollback. Solo entonces `PRODUCTION_ACCEPTED`.**
- **I6 — Después de `PRODUCTION_ACCEPTED`: refresh 2026-08-01 a 2026-08-31 con dry-run, diff, deduplicación, autorización, auditoría y rollback.**

Un bug no crea I1.5, I2B, I4C ni una metodología paralela. Se corrige dentro del gate activo y se retorna al plan.

## 16. Ruta acelerada sin sacrificar control

Para agilizar el recovery:

- no repetir auditorías globales ya cerradas si la evidencia sigue siendo válida;
- reutilizar evidencia acreditable y etiquetar qué requiere retest;
- investigar primero causas transversales compartidas antes de parchar módulos individuales;
- hacer lecturas GitHub y lineage de forma agrupada cuando sean independientes;
- usar Codex únicamente cuando el ahorro mecánico sea material;
- presentar a la usuaria cada Preview funcional tan pronto esté lista, en lugar de acumular revisiones hasta el final;
- ningún módulo espera la revisión de todos los demás para ser visualizado;
- no reimportar datos para defectos de presentación/composición;
- no volver a diagnosticar desde cero un defecto cuya causa ya quedó demostrada, salvo evidencia contradictoria nueva;
- al cambiar conversación, continuar desde el primer campo PENDING del gate activo, no desde una explicación general del proyecto.

**Rapidez significa eliminar reproceso; no eliminar gates.**

## 17. Protocolo obligatorio de reanudación en una conversación nueva

Antes de ejecutar:

1. Leer Addendum Prevalente.
2. Leer estado vivo + complemento de continuidad vigente.
3. Leer Plan v1.3.
4. Leer capability manifest.
5. Leer Anti-Descarrilamiento.
6. Leer matriz módulo por módulo.
7. Leer este Addendum Forense.
8. Verificar físicamente en GitHub la rama `recovery/fase-a-clean-20260831` y su HEAD actual; nunca asumir que el HEAD congelado sigue siendo el actual.
9. Identificar último gate formal PASS y primer gate incompleto.
10. Reutilizar únicamente evidencia que siga unida al source/artifact/semántica que se está certificando.
11. Ejecutar solo el primer gate incompleto.

### Reanudación congelada al momento de este addendum

- Último gate formal PASS: `I0`.
- Gate formal activo: `I1 — LINEAGE_GLOBAL / IN_PROGRESS`.
- Próxima ejecución: **cerrar I1 quirúrgicamente**, comenzando por el contrato conjunto pero semánticamente separado de `Recibos Esperados → Cartera Primas → Cobros`; luego reconciliar las restantes capacidades del manifiesto contra la evidencia ya disponible, sin repetir trabajo acreditable.
- Aseguradoras: `OPEN / FAIL-PARTIAL` en su última inspección visual; no declarar PASS hasta corregir y reprobar revelado de contraseña y acceso repetible al mismo Preview/artifact.
- Producción y datos: no tocar durante este congelamiento.

## 18. Condición de cierre del recovery

El recovery Fase A solo termina cuando las 15 capacidades aplicables hayan demostrado:

- latest approved lineage;
- source/owner/data contract correctos;
- `LATEST_APPROVED_VERSION_PREVIEW_PASS`;
- artifact exacto;
- E2E transversal;
- promoción del mismo artifact;
- `LATEST_APPROVED_VERSION_LIVE_PASS`;
- writes controlados donde aplique;
- integridad y rollback;
- `PRODUCTION_ACCEPTED = true`.

Solo después puede comenzar I6 y la carga/refresco de agosto.

## 19. Regla final de continuidad

Si una conversación futura propone reconstruir, simplificar, reimportar, saltar al último archivo, aceptar una pantalla sin lineage, cambiar de artifact entre Preview y producción, esperar al final para la revisión visual, o volver a un diagnóstico global sin nueva evidencia causal, debe detener esa acción y ejecutar `RETORNAR_A_PLAN`.

**RETORNAR_A_PLAN:** Addendum Prevalente → state/continuidad → Plan v1.3 → manifest → Anti-Descarrilamiento → matriz → este addendum → verificar HEAD → último gate PASS → primer gate incompleto → continuar exactamente desde allí.

---

**Decisión congelada:** `PLAN_V1_3_STRUCTURALLY_VALID_WITH_MANDATORY_FORENSIC_CONTINUITY_ADDENDUM`  
**Causa transversal de recovery:** `LINEAGE + CANONICAL_READ_MODEL/OWNER_COMPOSITION + SOURCE/ARTIFACT_EXECUTION_DRIFT`  
**Reconstrucción desde cero:** `FORBIDDEN`  
**Reimportación para corregir runtime/UI:** `FORBIDDEN`  
**Pérdida de trabajo histórico aprobado:** `FORBIDDEN`  
**Validación visual incremental de la usuaria:** `MANDATORY`  
**Producción antes de I5 completo:** `FORBIDDEN`
