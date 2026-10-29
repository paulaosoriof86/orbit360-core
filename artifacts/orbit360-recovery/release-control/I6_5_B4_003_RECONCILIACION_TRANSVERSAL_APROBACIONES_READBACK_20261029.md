# GRAVICENTRA INSURANCE — reconciliación transversal sin pérdida de aprobaciones

**Corte:** 29 de octubre de 2026. **Gate vigente:** I6.5/B4-003. **Modalidad:** SOURCE-ONLY, READ-ONLY hacia servicios; correcciones locales y QA sintética, sin publicación.

## 1. Autoridad y criterio de reconciliación

- Repositorio `paulaosoriof86/orbit360-core`, rama única `recovery/fase-a-clean-20260831`, fuente recuperada exactamente en `3a9e673e60656d9def9cfa9333257e467977cbaf`.
- **Quedan preservadas** las 15 capacidades de `CAPABILITY_LINEAGE_LOCK.json` (PASS congelado, 04-09-2026), las 31 rutas visibles de `core/config.js`, el inventario mayor de 44 áreas del plan de choque y las aprobaciones históricas de módulos. Una prueba actual fallida **no revoca** una aprobación previa ni autoriza volver a diseñar el módulo.
- Las 86 tareas C01–C14 y los 295 IDs del ledger permanecen en sus expedientes rectores. No hay cierre de tarea ni variación del avance formal I6: 50 % (5 de 10 mini-gates). Los seis P0 y las prioridades congeladas continúan vigentes.
- **Prioridad del usuario, sin desplazamiento:** Renovaciones y Upsells/Leads/Ops bloqueantes; Aseguradoras/Conocimiento y Calidad en trabajo paralelo no bloqueante; certificar el mismo artefacto antes de LIVE. Cronograma es un caso de regresión, **no el único frente**.
- `I6.5/B4-003` sigue abierto. La aceptación temporal del riesgo Firestore por Paula el 28-10 consta y **no es** certificación de Rules ni autorización de salto de los gates funcionales restantes. B4-004 a B4-007 mantienen su orden.

## 2. Hallazgo causal: guardado confirmado y lectura omitida

El backend de escritura `functions/product-operational-domain.js` y la función Preview actual reconocen `tareas` bajo `ops`. El lector protegido, su allowlist y el router también conocen `tareas`; sin embargo, la configuración pública de hidratación del frontend **no incluía `tareas`**. `_ensureCollections` acepta solamente nombres en ese universo y, por tanto, podía omitir silenciosamente la recuperación del dato tras una recarga. Además, la política de consultas cliente no tenía entrada para `tareas`, con rechazo `politica_no_autoriza_consulta`. Esto explica una vía concreta compatible con el POST 200 de Cronograma seguido de ausencia tras reload. No prueba todavía la persistencia del registro concreto bajo UID/Country efectivos.

La reconciliación **también encontró** una deriva independiente en **Conciliaciones**: el router solicita `finmovs`, pero faltaba en el universo de hidratación; su policy cliente lo asociaba a `finanzas`, mientras el lector/escritor backend ya lo asocian a `conciliaciones`.

Se prepararon las correcciones locales mínimas:

1. `orbit360-platform/product-runtime-config.js`: agregar `tareas` y `finmovs` a `optionalCollections`; **no** agregarlas al startup obligatorio ni moverlas a otra colección.
2. `orbit360-platform/core/tenant-access-policy-contract-p0.js`: política `tareas` de lectura bajo `ops` con `advisorWrite:false`; alinear `finmovs` a `conciliaciones`, conservando `finance:true` y `controlledWriteOnly:true`.
3. `orbit360-platform/modules/renovaciones.js`: evitar saludo `Hola ,` y excepción por cliente sin nombre, sin cambiar el flujo de renovaciones ni la composición comercial aprobada.
4. `orbit360-platform/core/queries.js` y `orbit360-platform/modules/cobros.js`: en la vista **Todos**, excluir de la suma de pagos confirmados verificados los registros con país de póliza/cliente no acreditado, y mantenerlos **visibles como excepción de conciliación**, con número e importe separado por moneda. No se borran registros ni se convierten monedas. La inconsistencia se reproduce en fixture sintético; no se adjudica automáticamente a ninguno de los cinco pagos observados en UAT sin inspección de sus vínculos efectivos.
5. Tres nuevas suites de regresión en `tools/gravicentra-b4-003-cross-module-readback-contract.test.cjs`, `tools/gravicentra-b4-003-renovaciones-whatsapp-name.test.cjs` y `tools/gravicentra-b4-003-cobros-unassigned-country.test.cjs`. No hay modificaciones de Auth, IAM, Rules, LIVE, datos, Control Plane ni ledger.

El generador aislado `tools/gravicentra-i6-1-preview-package.mjs` **sí consume** las listas canónicas de `product-runtime-config.js` y reproduce las colecciones opcionales salvo las dos exclusiones explícitas de Academia. El nuevo test comprueba que `tareas` y `finmovs` no entren en esa exclusión. En otras palabras, la candidata futura debe conservar el contrato corregido **también en los bytes servidos**, no únicamente en el archivo local.

## 3. Cobertura de los módulos ya trabajados

**Leyenda:** `HIST` = aprobación/evidencia histórica preservada; `QA` = pruebas actuales sintéticas/source; `UAT` = comprobación autenticada y readback físico de la candidata corregida pendiente. Ninguna fila marcada `QA` equivale a un PASS LIVE.

| Dominio y módulos del plan integral | Evidencia que se conserva o prueba actual | Diferencia abierta sin reiniciar trabajo |
|---|---|---|
| Acceso: Login, sesión, roles/scopes, Equipo, Configuración | HIST: linaje Login/Roles; QA: auth-terminal, role-context, users, first-paint, scope, negative role/tenant | UID y membresía efectivos de Carlos, revocación y CRUD de usuarios bajo candidata exacta: UAT |
| Shell, router, PWA, startup/rendimiento e Inicio | HIST: shell/startup/Inicio congelados; QA: 31 destinos de navegación y 17 rutas reactivas, Inicio por rol/país/metas | Carga fría observada ~22 s; rendimiento físico y PWA nueva versión pendientes |
| Cliente 360 y relaciones | HIST: Cliente360 y cross-relations congelados; QA: 26 casos de moneda/vencidos, cálculos y source | Fixture no visible en sesión anterior; buscar bajo UID verificado, pago compartido y recarga |
| Pólizas, Vehículos/riesgos, Recibos/cartera | HIST: tres capacidades congeladas; QA: scope, caches, recibos, cuentas, before-image | Adjudicar vínculos huérfanos/legacy sin reimportar ni tocar datos reales |
| Cobros, cartera e inferencia | HIST: Cobros congelado; QA: Q683, aging, country parity, cache/rol, seguridad de writer; **nuevo fixture** prueba que Todos = GT + CO para pagos con origen verificable y segrega importes de vínculos sin acreditar | **Causa de software corregida localmente** para filas sin país verificado; confirmar si los 5 pagos/Q2,744 GTQ observados corresponden a esa anomalía tras readback; falta UAT financiera física |
| Aseguradoras y directorio seguro | HIST: dos capacidades congeladas; QA: directorio, protección de credenciales/readiness | Edición sintética denegada; atribuir a UID/rol/módulo efectivo antes de decidir si defecto |
| Ops, Leads, gestiones operativas/administrativas y Upsells | HIST: dos capacidades congeladas, aprobación visual Ops 12-10; QA: ownership y actor humano | Reasignación en dos identidades, recuperación, avisos, desenlaces de Upsells: UAT |
| Renovaciones | HIST: **Paula PASS visual del 16-10**, prioridad congelada; QA: filtrado, lifecycle, saludo corregido | Confirmar resultados reales por vínculo y operación/WhatsApp con datos completos en nueva Preview |
| Cancelaciones y Siniestros | HIST: Cancelaciones PASS visual acotado 12-10; QA: relación y scope de Cancelaciones | Siniestros pertenece a B4-004; `reclamos` está asociado a `cliente360` en un boundary server y `siniestros` en cliente/writer: **riesgo de autorización por adjudicar** antes de cambiar permisos |
| Cronograma | HIST: flujo previamente trabajado y aprobado por Paula; QA: `tareas` lector/escritor y nuevo contrato unificado | **Repetir exclusivamente el E2E sintético afectado** con UID acreditado y readback tras reload en nueva Preview |
| Conciliaciones y movimientos (`finmovs`) | HIST: módulo y relaciones preexistentes; QA: nuevo contraste de router, política y writer | Confirmar colecciones en Preview y lectura autorizada por rol; no afirmar saldos ni matching sin comprobación física |
| Comisiones, Finanzas corporativas y metas | HIST: capacidades existentes; QA: política financiera/rol y metas institucionales | I6.7 datos Comisiones; no conceder Operativo acceso global ni habilitar Finanzas por un test unitario |
| Historial, Calidad e Importación | HIST: trabajado; QA: Historial país/rol, protección de lectura y contraejemplos | Actor efectivo, eventos durables, calidad de importación/reconciliación fuente: UAT; `actividades` se atribuye a `historial` en reader y a `cliente360` en writer: verificar diseño/permiso sin ampliación unilateral |
| Cotizador, Comparativo, Endosos, Certificados, Anexos, Quote Authority/CotComp | HIST: capacidades y contratos conservados; QA de origen previa no reabierta | Integración contractual, primas golden cases y vínculos: B4-005; no duplicar autoridad tarifaria |
| Reportes, Insights y resultados | HIST: módulos en menú/paquete; fuente disponible | Medidas monetarias, fechas, filtros/exports y país: UAT sin sumar unidades incompatibles; `metas` figura en reader como `inicio` y en writer como `equipo`: adjudicar responsable |
| Documentos/Drive y Portal | HIST: proveedor privado y avance del portal preservados | Acceso por fileId, scope, identidad externa y evidencia documental física pendiente |
| Notificaciones, Marketing, Plantillas, Automatizaciones, Correo, IA y Academia | HIST: trabajo y configuraciones conservados; visibles en las rutas autorizadas | Diferenciar prototipo de ejecución externa; Correo personal Fase B y Academia I6.8 siguen condicionados |

El inventario formal de **44 áreas** y los 14 flujos/168 grupos de aceptación pertenecen a los documentos rectores: **esta tabla no los reemplaza** ni fabrica un PASS individual. Se mantiene el objetivo de conciliar cada área con su último receipt aplicable. Ninguna ruta previamente autorizada se eliminó de la navegación para lograr un test verde.

## 4. Pruebas ejecutadas en esta intervención

- **55 PASS / 0 FAIL** para la batería automatizada actual `tools/gravicentra-b4-003-*.test.cjs`, **excluyendo** `firestore-emulator.test.cjs`, que requiere `@firebase/rules-unit-testing` no disponible en el entorno de ejecución. Incluye control de acceso, país, rol, antes/después, políticas financieras, historial, Ops/Leads, renovación/WhatsApp, fuente del writer, escritor/lector de Cronograma, seguridad de transporte y carga del cliente.
- Nueva suite focal: **8/8 PASS** para las invariantes de colección, 17 rutas reactivas, 31 destinos de navegación con implementación físicamente alcanzable, 15 linajes congelados, builder de Preview, dos políticas corregidas y **censo de diferencias** de propietarios de los dominios `reclamos`, `actividades`, `metas` entre lector/escritor. El test de censo congela esas excepciones como **HOLD por adjudicar**, no como permiso otorgado.
- Nueva suite WhatsApp de Renovaciones: **2/2 PASS** para nombre presente/ausente, sin excepción ni `Hola ,`.
- Nueva suite de Cobros: **2/2 PASS** para pagos con país acreditado vs. vínculo huérfano y advertencia separada sin pérdida ni conversión del importe original.
- Se intentó la inspección de la pestaña exacta en Chrome conectado: pestaña correcta **identificada**; la extensión no permitió adjuntar inspección de DOM por un timeout del control de enfoque. **No se repite ni se transforma en PASS**. No hubo acción de formulario ni cambio de estado en el navegador.
- Las pruebas son de código y fixtures sintéticos; **no** acreditan UID real, backend exacto de nueva candidata, Firestore Emulator real, persistencia en Firebase, performance, impresión, diseño de cada módulo ni publicación.
- **Transporte prevenido:** `gravicentra-recovery-i6-postsalida.yml` tiene un disparador `push` para `orbit360-platform/core/tenant-access-policy-contract-p0.js` y contiene operaciones de promoción `hosting:clone ... :live` bajo sus propios gates. Por tanto, un `git push` directo de esta corrección activaría un circuito histórico de release, aunque sus jobs puedan hacer `noop`. **No se hizo ese push** sin acreditar primero el bloqueo de LIVE y el destino aislado. Esta coexistencia de publicadores debe reconciliarse dentro de C02, no ignorarse al acelerar.

## 5. Movimiento de release requerido, sin saltos

1. Validar que el push de un sucesor no ejecute LIVE, datos ni otra publicación por los disparadores históricos de Actions. Crear un solo sucesor sobre la rama congelada con las **cinco rutas de producto y tres suites nuevas**, más este reporte, sin cambios ajenos, tras revisar que HEAD siga siendo la misma base. **Sin bypass de Control Plane ni workflows silenciados unilateralmente.**
2. Generar un **nuevo artefacto y Preview LAB aislada** porque cambiaron los bytes del producto. Readback de `product-runtime-config.js` servido para probar `tareas`/`finmovs`; source/HTML/JS hashes exactos y backend Revision asociado.
3. Sobre UID protegido acreditado, comprobar reads y writes sintéticos **solo** donde se observaron fallos: tarea Cronograma create → respuesta → `get` autorizado → reload → lectura; movimiento financiero **solo lectura** según rol; Aseguradoras edición solo si autorizado por su rol/tenant; cliente/Historial/Cobros GT/CO y Renovaciones en las vistas vinculadas. No nuevos pagos reales ni envíos de WhatsApp.
4. Conservar PASS heredados no afectados, registrar el delta de los criterios 168/295 existentes y enviar solo bloqueantes reales a su owner. Adjudicar explícitamente las diferencias `reclamos`, `actividades` y `metas` (lector vs. escritor) sin ampliar permisos de manera presumida; `reclamos` antes de B4-004.
5. Mantener B4-003 pendiente hasta UAT física y pruebas de seguridad aplicables; avanzar por B4-004→005→006→007 y publicar LIVE **solo el mismo artefacto probado** y con rollback. La excepción temporal de Rules de Paula no convierte esta fuente local en release autorizado.

**Estado de salida de esta intervención:** `SOURCE_PATCH_PREPARED / CROSS_MODULE_QA_PASS / EXACT_PREVIEW_PENDING / LIVE_UNCHANGED`. Aprobaciones históricas y Control Plane sin alteración.
