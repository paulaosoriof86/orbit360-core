# GRAVICENTRA INSURANCE — B4-003 | Plan de choque operativo congelado (2-nov-2026)

**Objeto:** ejecutar y cerrar, sin reiniciar diagnósticos ni abrir otra candidata de producto. Esta hoja es un *delta operativo* de los freezes del 29-oct y de los controles históricos; no sustituye `CONTROL_PLANE.json`, la excepción de riesgo de Rules otorgada por Paula el 28-oct, los 15 linajes preservados ni la secuencia I6.

**Única candidata de producto:** `paulaosoriof86/orbit360-core`, `recovery/fase-a-clean-20260831`; fuente operacional congelada para el lote de Preview: `9d1839da8717757baf9adbf1fdfad83cddc41791`. No se crea otra línea de producto. El transporte técnico de GitHub Actions está fijado a ese SHA, despliega `orbit360ScopedPolicyReadPreview` y un Hosting Preview efímero, nunca la función LIVE.

**Prohibiciones:** no declarar UAT real por tests sintéticos, no mezclar GTQ/COP, no ampliar privilegios por un UID observado, no reimportar, no tocar datos reales antes de backup/rollback verificables, no borrar trazas QA ni publicar identificadores personales en GitHub, no promover LIVE sin comprobación de los otros gates.

## Datos físicos reconciliados, sin ambigüedad contable

Fuente: dry-run read-only LAB del 2-nov, run `41462171976`, 443 clientes, 1.425 pólizas, 33 aseguradoras. La investigación privada en la consola autenticada de Firestore cotejó 443 fichas y 1.425 referencias por ID sin emitir PII en CI.

| Partición disjunta | Cantidad | Acción exacta |
| --- | ---: | --- |
| País ya indexado correctamente | 408 (391 GT, 17 CO) | No editar |
| País verificable pero índice físico desalineado | 32 (1 GT, 31 CO) | Copia/ensayo de restore, aplicar solo diferencias, leer después y probar GT/CO/roles |
| País ambiguo sin conjunto de pólizas que lo acredite | 3 | Dirección decide país GT/CO por cliente; no inferir ni modificar antes |
| Referencias de póliza a documento de cliente ausente | 3 distintas | Origen de QA B2 comprobado en fichas (`sourceRef` B2 QA firme y póliza B2-REN); separar el inventario sintético del comercial con trazabilidad, sin borrar ni crear clientes ficticios |

La inferencia por aseguradora es **transversal** y solo procede cuando el país explícito del cliente falta/es ambiguo y el conjunto **completo** de pólizas y aseguradoras verificadas coincide en un único GT/CO. Un domicilio válido del cliente se preserva aun si una póliza es transfronteriza. Las tres decisiones propietarias personales se preguntan en la conversación privada, **no se suben al repositorio público**.

## Ruta crítica, en este orden; nada se convierte en PASS por documentación

| Gate material | Responsable | Salida verificable para mover el estado |
| --- | --- | --- |
| **P0-1. Una fuente y transporte actual** | Asistente | Guard íntegro CI PASS de SHA fuente, `PRODUCT_SOURCE_DRIFT=false`; backend **Preview** actualizado; Hosting efímero creado; `build.json` y hashes de archivos servidos iguales; LIVE sin cambios |
| **P0-2. Control de acceso real, transversal** | Asistente con sesiones que Paula autorice | UAT en la **misma** Preview con dos UIDs independientes (Dirección/Operativo/Asesor), GT/CO/TODOS, recarga y cambio de rol. Operativo `all` lee Clientes en países permitidos, Asesor solo los suyos; negativas comprobadas por UID, tenant, país, rol y módulo. No alcanza `ver:true` solo en UI |
| **P0-3. Datos y relaciones de Clientes/Pólizas** | Asistente; Paula solo 3 decisiones | Confrontación física 443/1.425; QA B2 separado; backup+restore aislado comprobado; actualización idempotente únicamente de los 32 índices con before/after y rollback; los 3 clientes sin referencia resueltos por Paula o explícitamente pendientes sin inventar país |
| **P0-4. Recorridos mínimos del piloto de tesis** | Asistente y Paula/CT01–CT02 | Conservar evidencias históricas S5 Cobros, S6 pago sintético y S7 Renovaciones; repetir solo el delta de país/rol en nueva Preview. Cerrar Lectura de Cliente 360→Póliza→Cobros/Recibo→Renovación/Historial, E4 Reportes GT/CO y totales por moneda, E8 Calidad, y observar E5 Marketing/E6 Plantillas-Notificaciones sin publicación/alta real. Evidencia saneada antes de tesis |
| **P0-5. Persistencia segura y salida** | Asistente; aprobación final Dirección | Ciclo sintético permitido de actualización→recarga→readback→restauración en Ops/Cronograma/Aseguradora/Cobros, copia y restauración de datos ensayada, origen Preview/rollback identificados, y matriz de negativos. Dictamen B4-003 GO/NO-GO sustentado antes de B4-004 a B4-007 e I6.6–I6.9 |

## Límites y priorización para no bloquear el piloto con 44 módulos

El inventario histórico de 44 áreas/15 capacidades se **conserva íntegro**, pero el trabajo de salida se ordena por dependencias y por recorridos del piloto: identidad/país → lectura transversal Cliente/Póliza → Cobros y Renovaciones → evidencia de tesis → persistencia/restore → dictamen. Una aprobación histórica sigue válida para la versión y caso que realmente cubrió; no se le cambia la etiqueta ni se extrapola a un build nuevo. Capacidades P1 sin efecto causal sobre ese recorrido no se reabren para retrasar B4-003, y tampoco se declaran certificadas.

La excepción de riesgo de las Firestore Rules compartidas, aceptada por Paula el 28-oct para LIVE controlado, **no necesita reconfirmación** y **no es SECURITY_PASS**. Se mantienen denegación efectiva del lector, segregación por usuario y los demás controles de backup, restauración y alcance que la excepción no dispensó.

## Disciplina obligatoria para cada siguiente lote

1. Primero comprobar si el hallazgo ya tiene corrección, aceptación o recibo vinculado al SHA; no repetir diagnóstico sin reproducir una diferencia actual.
2. Una corrección por causa raíz y para todos los usuarios afectados, con prueba contrafactual multi-UID/GT/CO, no parche por nombre, UID o cliente de muestra.
3. En el mismo lote: **fuente → CI → despliegue restringido Preview → bytes servidos → UAT real → evidencia**. Un fallo en cualquier flecha deja el caso `PENDING`, no `CLOSED`.
4. Las decisiones de negocio indeterminables se elevan a Paula con nombre/referencia y dos opciones claras; no ejecutar iteraciones técnicas para inventar una respuesta que es suya.
5. Reportar solo deltas medibles: SHA, URL/build, clientes físicos corregidos de 32, excepciones humanas resueltas de 3, UIDs/roles/países probados, restauración acreditada y recorrido del piloto certificado. **I6 formal 50% y B4-003 HOLD** hasta nueva evidencia.

**Estado al congelar:** fuente y pruebas CI PASS; dry-run real PASS; tres decisiones de cliente localizadas privadamente; tres referencias QA B2 identificadas. Workflow de sincronización `41467740294` **SUCCESS**: la función Preview quedó desplegada, el Hosting efímero `https://ays-orbit-360-lab--gi-i65-b4-ca-41467740294-0m0aj1d3.web.app/` pasó byte-readback y las raíces LIVE no cambiaron. Chrome verificó el formulario de inicio de sesión, **no la sesión autenticada ni los permisos de dos usuarios**. **32 escrituras físicas = 0; UAT del runtime actualizado = pendiente; producción = NO-GO**. Actualizar estado solo con recibo de ejecución, no por expectativa.

---

## Adenda de control único y congelamiento integral — 2-nov-2026, posterior al primer corte

**Precedencia de esta adenda:** actualiza solamente hechos, pendientes y punto de reanudación posteriores al corte inicial anterior. Los 32 índices y las tres decisiones humanas **sí se aplicaron después** de aquel corte, con respaldo, simulacro aislado de restore y readback: run [41478387493](https://github.com/paulaosoriof86/orbit360-core/actions/runs/41478387493), `SUCCESS`. No convertir la frase histórica «32 escrituras = 0» en estado actual. La candidata de producto sigue siendo **la única rama** `recovery/fase-a-clean-20260831`: corrección de Pólizas `5a93a0802b6aae369482fc20f468369b4efa317c` y prueba de mínimo privilegio `ee63bd5fefe3b618a0a60fd5bb8c192b8fcf2ea6`. La última Preview **publicada antes de este nuevo cambio** es source `53c4796c45930d42283b3a751aee0f75fa71c8f6`, run [41478912436](https://github.com/paulaosoriof86/orbit360-core/actions/runs/41478912436); la corrección más reciente aún requiere Preview, autenticación y aceptación funcional. No afirmar sincronización UI hasta readback del nuevo SHA.

**Índice rector de alcance:** no se sustituyen ni se recuentan artificialmente los **295 hallazgos, 86 tareas, seis P0 de 12-oct, 44 áreas y 15 capacidades aprobadas**, conservados en `CONTROL_PLANE.json`, `I6_5_B4_003_PLAN_CHOQUE_LINEAGE_CI_UAT_FREEZE_20261029.md`, `I6_5_B4_003_CANDIDATA_UNICA_DELTA_PLAN_CHOQUE_20261029.md` y la matriz Fase A. Esta sección es un **índice de ejecución y trazabilidad** de esos registros, **no otro plan, gate o backlog**. Ningún hallazgo de P1/P2 se borra por estar fuera de la ruta crítica; ninguna aceptación histórica se reetiqueta como PASS del nuevo build.

### Estado material y divergencias que permanecen abiertas

| Ítem de control dentro de P0-1…P0-5 | Evidencia efectiva al 2-nov | Falta para certificar; sin desplazar otros ítems | Estado |
| --- | --- | --- | --- |
| **P0-1. Lineage/guard/artifact** | Rama única; source Pólizas `5a93a08`, test `ee63bd5`; Preview de source anterior `53c4796` con CI/Hosting readback `41478912436` | Rebuild único del **HEAD con corrección y este freeze**, guard íntegro, hashes de servido/función Preview y prueba de que LIVE no cambió; cerrar `LIVE_LINEAGE_UNRESOLVED` por evidencia independiente, sin bypass | **IN_PROGRESS** |
| **P0-2. Identidades y permisos de extremo a extremo** | Paula autenticada en Preview anterior: Dirección y Operativo simulado sobre **su mismo UID** mostraron Pólizas GT 1.301 / CO 124 / TODOS 1.425. Equipo mostró siete integrantes | Ingreso **independiente** de Paula, Carlos Castro (Operativo/Asesor, GT+CO) y Samuel Daza (AdminTenant/Operativo/Asesor, GT+CO), con UID/membresía/rol activo real; Carlos Operativo debe ver **todas** las pólizas autorizadas de GT y CO, sin fuga; positivas y negativas de UI, callable, Firestore SDK directo, tenant, país, asesor y recarga. No deducir ni compartir contraseñas | **HOLD_UAT_REAL** |
| **P0-2. Asesor visible en Pólizas** | Causa reproducida: al entrar directamente a Pólizas no se hidrataba `asesores`; tras visitar Equipo aparecían nombres. Backend prohíbe directorio Equipo a Operativo/Asesor (`TEAM_DIRECTORY_DENIED`). Fuente canónica corregida: roles administrativos piden `asesores`; Operativo/Asesor usan `Orbit.assignableAdvisorRoster.list` mínimo por país concedido. Test sintético + 34 regresiones de índice PASS local | CI de versión exacta, Preview, Paula/Operativo y UID real Carlos, GT/CO/TODOS, **nombres y filtro**, recarga y denegación de colección Equipo; verificar también asesor histórico no presente en roster asignable. No declarar solución visual real por test aislado | **SOURCE_QA_PASS; UAT_PENDING** |
| **P0-3. País físico de clientes** | 443 clientes cotejados; **35 actualizaciones**: 32 por aseguradora inferible y tres decisiones de Dirección (Kerlyn Vanessa GT, Aura Micaela GT, Luz Dary Rodríguez CO), con backup/restore/readback `41478387493`; universo físico 1.425 pólizas | **Divergencia persistente:** pantalla `Calidad`/`Inicio` de Paula muestra **439** clientes después de reload (391 GT, 48 CO), mientras fuente física normalizada resuelve **443/443**. Faltan **4 por explicar en la proyección de lectura**; cotejar IDs en entorno privado, valores crudos de `pais`, filtro servidor/SDK, paginación y tenant. Nunca volver a migrar datos para arreglar UI | **PHYSICAL_APPLY_PASS; UI_439_VS_443_HOLD** |
| **P0-3. QA vs negocio** | Las referencias `B2-REN-36489784713`, `B2-REN-36490245512`, `B2-REN-36490640789` son sintéticas B2, no números comerciales; 3 pólizas con cliente físico huérfano y dependencias históricas | Segregar **todas** las fixtures sintéticas (también las que apuntan a clientes válidos) de listados/KPI/E4/piloto; clasificar 14 fixtures de cancelaciones y las **3 pólizas/12 dependencias** de renovaciones, con origen, marker, vínculos, no borrado automático y prueba de ausencia comercial | **QA_SEGREGATION_HOLD** |
| **P0-4. E4 Reportes / E8 Calidad / Inicio** | E4 fuente integrada PR `#172`, datos observados 2026: GT 202 + CO 26 = 228 filas; Pólizas 1.425; E4 excluye 3 huérfanas pero **aún incluye QA con cliente válido**. Calidad 439 visibles, «país por validar 0» entre visibles; integridad financiera sigue «confirmando»; Inicio 439 y 4/5 fuentes | Consolidar 443/439; aislar QA por contrato; cotejar E4 1.422 filas con negocio real, países, filtro año, moneda y totales; resolver 4/5 fuentes y spinner E8 con causa raíz, no inventar PASS ni convertir montos desconocidos a 0 | **HOLD_REAL_DATA_UAT** |
| **P0-4. Tesis / piloto** | Evidencia histórica S5 Cobros, S6 pago sintético, S7 Renovaciones, E4 Reportes, E8 Calidad, E5 Marketing, E6 Plantillas/Notificaciones; no es aceptación actual automática | Probar en misma candidata Cliente360→Póliza→Recibos/Cartera→Cobros/Conciliación→Renovación→Historial, GT/CO y roles. Q683: lectura por recibo limitada, GTQ/COP sin mezcla, montos desconocidos ≠ 0, relaciones canónicas y caso discriminante. E5/E6 sin envío real; Ops/Leads origen Carlos Operativo→receptor Samuel Asesor; **TR-01…TR-07** con readback y **K-06 VERDE**, capacidad/routing RACI, QA/claims habilitable: `READY PARA PILOTO CONTROLADO` sigue **HOLD** | **HOLD_PILOT** |
| **P0-5. Escrituras, restore y QA Fase A** | Guard y readbacks puntuales históricos preservados; backup y restore del lote país comprobados en LAB | CRUD/synthetic QA permitido por módulo en fuente exacta: before/after→readback servidor→recarga→auditoría→restore a **inexistencia** cuando corresponda. Ensayar denegaciones de backend/SDK y compatibilidad Rules en emulador; no desplegar Rules sin autorización. Revalidar 15 capacidades/44 áreas por última aprobación, UID/rol/país/viewport 320/390/desktop, navegación/404/console/PWA, owner/write contract y rendimiento | **HOLD_E2E** |
| **Salida / B4-004…B4-007** | Ninguna promoción LIVE autorizada por esta adenda. `I6` formal **50%**, B4-003 **HOLD**, sin porcentaje global deducible | B4-003 dictamen material; **B4-004 Siniestros/Cronograma → B4-005 E2E → B4-006 aceptación de Paula del digest exacto → B4-007 promoción del mismo artifact**; I6.6–I6.9 según plan. LIVE: rehash completo, tests individuales, roles, writes controlados, rollback; `PRODUCTION_ACCEPTED` solo con evidencia. **Agosto después**, Iteración 6, por fuente con dry-run/diff/autoridad | **NO-GO_LIVE** |

### Seis P0 históricos: fila por fila, sin confundir con P0-1…P0-5 operativos

Los **seis hallazgos P0 del ledger del 12-oct** son un inventario distinto de los **cinco frentes P0-1…P0-5** de este plan. No se pueden reemplazar unos por otros. `CONTROL_PLANE` mantiene agregado histórico **1/6** cerrado, pero el detalle operacional actual sigue sujeto a aceptación sobre build/UID exactos; por eso ningún renglón se eleva aquí a nueva certificación.

| Hallazgo ya existente | Qué se exige comprobar o preservar | Estado de cierre actual |
| --- | --- | --- |
| `B4-003-P0-20261012-PERSONAL-COLLECTION` | Scope de cartera personal y contratos para asesor, CRUD/lectura real | **UAT autenticada pendiente** tras corrección de source |
| `B4-003-P0-20261012-INSTITUTIONAL-GOALS` | Metas institucionales por país/rol, prueba sin falsa persistencia | **Source/QA histórico PASS, UAT exacta pendiente** |
| `B4-003-P0-20261012-FREELANCERS-GOAL-SCOPE` | Participación y elegibilidad de freelancers en metas; no atribuir totales sin clasificación | **Contrato/aceptación pendiente** |
| `B4-003-P0-20261012-INICIO-MOTIVATIONAL-TEXTS` | Última UI/textos aprobados por Paula; no confundir render con aceptación visual | **Aceptación visual exacta pendiente** |
| `B4-003-P0-20261012-QA-CANCELLED-RUN-FIXTURES` | Clasificar 14 fixtures de cancelación, conservar procedencia y dependencias, excluir de negocio | **Adjudicación/readback pendiente** |
| `B4-003-P0-20261012-QA-ORPHAN-RENEWALS` | Las 3 pólizas B2 sintéticas y sus 12 relaciones, sin inventar póliza comercial ni borrar | **Adjudicación/segregación pendiente** |

### Control de alcance para que un bloque no oculte otro

1. **Gates, no conversaciones:** un bloque se cierra solo con ID de hallazgo previo + prueba/fuente SHA + UID efectivo/rol/país + Preview URL/build/digest + resultado de UI/backend + readback/restore si hay escritura; registrar `HISTÓRICO`, `SOURCE_QA_PASS`, `PREVIEW_TECH_PASS`, `AUTH_READ_PASS`, `AUTH_WRITE_READBACK_PASS`, `BLOCKED_CAUSAL` o `LATEST_APPROVED_VERSION_PREVIEW_PASS`. Nunca `PASS` genérico.
2. **Inventario permanente:** si un caso afecta Cotizador/Comparativo, Siniestros, Cancelaciones, Comisiones, Vehículos, Aseguradoras, Portal/Drive, Plantillas, Notificaciones, Marketing, Academia, IA, Automatizaciones, Endosos, Certificados, Importación, finanzas o preferencias en memoria (`setPref`), permanece en el inventario de **44 áreas** y en los **295/86** originales. En particular, revisar contratos de escritura no durable/no autorizado antes de certificar CRUD. No reabrir una capacidad ya aprobada sin delta causal.
3. **Secuencia inmediata de mínimo retrabajo:** (a) CI y Preview con fuente actual para Asesor; (b) cotejo **privado y read-only** de los 4 clientes ausentes + QA; (c) UAT de Paula y luego UID real Carlos y Samuel, positivos/negativos GT/CO/TODOS y asesor; (d) corregir sólo causas transversales observadas, subirlas a **misma candidata**, nuevo digest/Preview si cambia source; (e) recorridos tesis/finanzas, writes sintéticos y restore; (f) cierre de los seis P0, 15 capacidades y siguientes B4. Cada arreglo vuelve al mismo gate, nunca crea otro plan/branch/Preview divergente.
4. **Seguridad/producción:** Paula aceptó el 28-oct el riesgo temporal de Rules existentes para LIVE controlado; **no** es `SECURITY_PASS`, ni autoriza despliegue Rules o cambio IAM. Tampoco exonera negativos de endpoint, SDK, tenant ni rollback. No enviar WhatsApp/correos reales, no importar agosto, no tocar LIVE ni fabricar valores.
5. **Estado que manda al reanudar:** el control plane puede contener recibos antiguos con `PRODUCTION_ACCEPTED` histórico; **no se traslada ese rótulo** a la candidata actual sin la cadena inmutable de Preview→LIVE y la matriz de 15 capacidades. El registro operativo de este lote es **B4-003 HOLD / I6 50% / piloto HOLD / LIVE NO-GO**. El siguiente movimiento verificable es Preview del commit que contiene el fix de Asesor y esta adenda, seguido de cotejo 443/439 y UAT real.

---

## Adenda de hallazgo reproducido con Paula autenticada — 2-nov-2026

**Preview exacta probada (NO certificada):** source `2482af7b61eefb739117412fb154a42c622f07c0`, [Actions 41484802675](https://github.com/paulaosoriof86/orbit360-core/actions/runs/41484802675), Hosting `https://ays-orbit-360-lab--gi-i65-b4-ca-41484802675-9jbsg4tf.web.app/`. El transporte técnico, build/readback de bytes y comparación LIVE finalizaron en `SUCCESS`. La prueba de UI a continuación usó sesión **real autenticada de Paula** sobre este origen, sin sustituirla por un mock.

| Escenario de Pólizas con UID de Paula | País | Conteo visible | Asesor en primeras 100 filas | Dictamen limitado |
| --- | --- | ---: | --- | --- |
| Rol activo Dirección | TODOS | **1.425** | Filtro completo, nombres visibles | `AUTH_READ_OBSERVED` en ese UID/rol |
| Rol activo Dirección | GT | **1.301** | Nombres visibles | `AUTH_READ_OBSERVED` |
| Rol activo Dirección | CO | **124** | Las cinco filas de contraste sí tienen el nombre real de su asesora histórica GT | `AUTH_READ_OBSERVED` |
| Mismo UID Paula, rol activo Operativo | GT | **1.301** | Nombres presentes, seis asesores seleccionables | `AUTH_READ_OBSERVED`, **NO** equivale a Carlos |
| Mismo UID Paula, rol activo Operativo | CO | **124** | **5/100** muestran `Asesor sin coincidencia`; corresponden a la misma asesora histórica GT | `BLOCKED_CAUSAL`, NO PASS |

**Causa raíz transversal demostrada:** el lector mínimo `assignableAdvisorRoster.list('CO')` devuelve asesores **asignables** para CO; no representa la relación histórica de una póliza CO cuyo asesor reside en el catálogo GT. Dirección podía resolver el mismo `asesorId` vía Equipo completo; Operativo no debe abrir ese directorio. La misma lógica falla para cualquier asesor cross-border, sin tratamiento por nombre ni UID individual. No es error del campo país del cliente ni motivo para reimportar.

**Corrección de contrato, pendiente de nueva Preview/UAT:** el `scopedPolicyRead` del servidor, **después** de autorizar UID, tenant, país, rol y cada póliza, añade exclusivamente `asesorNombreVerificado` consultando por ID de asesor vinculado a esas filas; no enumera Equipo ni devuelve credenciales. Pólizas combina ese nombre con el roster asignable para la celda y el filtro. Pruebas de fuente con mock cubren Colombia-only/asesor GT-only, denegación de GT, ausencia de lectura global de Equipo y campo sensible no proyectado; ver el SHA de la próxima candidata. Hasta build/readback y prueba real, mantener `SOURCE_QA_PASS / AUTH_CO_ADVISOR_PENDING`, no `LATEST_APPROVED_VERSION_PREVIEW_PASS`.

**Invariantes aún abiertos:** (1) entrar con los UIDs **independientes** de Carlos Castro y Samuel Daza, comprobar Operativo GT+CO completo y Asesor restrictivo con readback y negativos; (2) explicar por ID y valor **crudo** los cuatro clientes de `443` físicos frente a `439` visibles, en privado y read-only; (3) aislar fixtures QA de KPIs/E4; (4) retestar E4/E8/S5/S6/S7 y cadena Cliente 360→Póliza→Recibo/Cobro→Renovación en misma candidata; (5) cerrar seis P0, writes reversibles, matriz 15 capacidades/44 áreas, B4-004…B4-007 y aceptación del mismo digest LIVE. Se conserva el plan congelado y no nace ningún bloque nuevo.

---

## Adenda de evidencia funcional — 2-nov-2026 | Preview exacta 41532284588

Este registro es **delta de evidencia dentro de B4-003**, no crea plan, gate, rama ni certificación global. La candidata inmutable de producto es source `264a28cd2dd8096e19ba0a0661ab43f8e33b71bf`; transporte del workflow `15e9954d4bd1c89cebb655f35beb45b0690d2477`. [Run 41532284588](https://github.com/paulaosoriof86/orbit360-core/actions/runs/41532284588) = `completed/success`. Hosting Preview aislado: `https://ays-orbit-360-lab--gi-i65-b4-goals-41532284588-rqhp38r5.web.app/`. Sin promoción LIVE.

**Chrome autenticado, UID de Paula solamente:** el banner de cuenta mostró `Paula Osorio`; cambiar el selector de rol **no equivale a ingresar con Carlos ni Samuel**.

| Prueba focal en este artifact | Resultado observado | Estado limitado |
| --- | --- | --- |
| Paula Dirección · Colombia · Pólizas | 124 totales; página 1 con 100 y página 2 con 24; **0 asesores vacíos de 124** | `AUTH_READ_OBSERVED_PAULA` |
| Paula Dirección · Colombia · Cliente 360 | 49 clientes; 27 pólizas activas vinculadas en KPI; 440 visibles GT+CO en lectura previa, frente a 443 físicos (3 `merged` excluidos según auditoría anterior; recuento físico actual de flags pendiente) | `AUTH_READ_OBSERVED_PAULA`, no cierre de todo P0-3 |
| Regresión filtro oculto · Paula | Filtrar Johanna Salgado en CO: 5 coincidencias. Cambiar Dirección→Asesor: filtro Asesor vuelve a vacío; muestra **92/92 pólizas propias**, 10 activas y 0 nombres de asesor vacíos. La recarga conserva rol Asesor y país CO | `UI_FILTER_CONTEXT_RESET_PREVIEW_PASS_PAULA` |
| Restricción de módulo · Paula Asesor | Navegación directa a `#/aseguradoras` muestra `No tienes acceso con el rol activo` | `UI_ROLE_DENIAL_PREVIEW_PASS_PAULA`; **no** acredita negación backend |
| Aseguradoras · Paula Dirección/Operativo | CO 17 aseguradoras, GT 16; botones `+ Aseguradora` e `Importar` disponibles después de hidratar | `AUTH_READ_OBSERVED_PAULA`; persistencia/credenciales pendientes |
| Pólizas GT · Paula Operativo | 1.301 físicas; primeras 100 filas con 0 asesores vacíos; KPI comercial 1.292 sin 9 QA | `AUTH_READ_OBSERVED_PAULA`, no certificación Carlos |

**Límites de prueba:** Console errores/warnings no observados durante el escenario focal; no se ejecutaron escrituras operativas, verificaciones signed callable/SDK negativas ni restauración. Chrome también enumeró otra pestaña de esta Preview, pero esa pestaña no fue controlable; **no se acreditó la sesión independiente de Samuel**, aunque Paula confirmó su ingreso. La prueba de Carlos con cuenta propia del artifact anterior se conserva como histórica pero no se eleva automáticamente a PASS de este build.

**Siguiente gate incompleto (sin reabrir los PASS):** P0-2 con sesiones reales independientes Carlos y Samuel y negativas backend/tenant/país/rol; después QA/provenance E4/E8, flujos piloto, CRUD sintético/restore y seis P0 históricos. **B4-003 HOLD; I6 50%; LIVE NO-GO.** El defecto del filtro contextual de Carlos queda **corregido y observado en Paula**; sólo una diferencia reproducida bajo UID Carlos justificaría reabrirlo.


---

## Adenda de comprobación privada UID/membresía — 2-nov-2026 | sin SECURITY_PASS

**Evidencia ejecutada en modo solo lectura; sin publicar UIDs, correos ni PII.** En Chrome autenticado de Dirección se verificó en Firebase Authentication del proyecto LAB una cuenta individual `QA-SD02` con acceso del 2-nov y su UID exacto concordante con el documento `tenants/alianzas-soluciones/members/{uid}` de Firestore. La pantalla de la Preview exacta identificó a Samuel, pero no expuso el token firmado/UID de esa sesión: **correlación administrativa de identidad sí; prueba criptográfica del token de navegador y negativas del callable/SDK aún NO EJECUTADAS**. El contraste `QA-CC02` se leyó en consola solamente, sin nueva sesión UAT Carlos.

| Comprobación focal | Evidencia saneada | Disposición |
| --- | --- | --- |
| Candidata | Source `264a28cd2dd8096e19ba0a0661ab43f8e33b71bf`; Preview `https://ays-orbit-360-lab--gi-i65-b4-goals-41532284588-rqhp38r5.web.app/`; HEAD documental posterior `5fab0b6` sin drift de producto | `PREVIEW_TECH_PASS` histórico preservado |
| Cuenta y membresía `QA-SD02` | UID de Firebase Auth coincide con documento Firestore; `status=active`, `tenantId=alianzas-soluciones`, roles `AdminTenant/Operativo/Asesor`, países `GT/CO`; `advisorId` vinculado; sin lista adicional de equipo | `BACKEND_ADMIN_READ_ONLY_IDENTITY_MEMBERSHIP_PASS`, no prueba signed callable |
| Scope contractual vigente | `config/access.roleScopes.Operativo=all`, `AdminTenant=all`, `Asesor=own`, pero `QA-SD02.dataScopes.modules.polizas=equipo`. `functions/b4-003-scoped-access-boundary.js` aplica mínimo permiso, dejando Pólizas en `team`; para `clientes` de Operativo existe override explícito a `all` | **`BLOCKED_CAUSAL_SCOPE_ASYMMETRY`**; no cambiar permisos silenciosamente |
| Contrafactual `QA-CC02` | Membresía active, roles Operativo/Asesor, países CO/GT, `dataScopes.modules.polizas=todos` | Configuración distinta explica por qué Carlos puede tener visibilidad mayor; **no** equivale a recertificación autenticada de Carlos en este build |
| Preview `QA-SD02` | Operativo GT: **1/1** pólizas; Operativo CO: **0/0**; AdminTenant CO: **0/0**; Asesor GT: **1/1**; Asesor CO: **0/0**. Cliente 360 Operativo CO: **49 clientes** y **0 pólizas vinculadas**. No deducir 0 registros físicos ni baja de país | `AUTH_UI_READ_OBSERVED` parcial; reconciliación de universos/contrato pendiente |
| Recarga y acceso UI | Sesión etiquetada Samuel conservó Asesor/Colombia y `0/0` tras reload en frío. Ruta directa `#/aseguradoras` bajo Asesor mostró «No tienes acceso con el rol activo», sin errores de consola observados | `UI_ROLE_DENIAL_PREVIEW_PASS` limitado a interfaz; **NO** `BACKEND_NEGATIVE_PASS` |
| Integridad del ensayo | No hubo cambios de datos, membresías, Roles/Rules/IAM, funciones, Hosting LIVE ni cobros/comunicaciones; se restauró la vista de la Preview a Administración/Guatemala | `READ_ONLY` |

**Decisión que falta, sin presumirla:** confirmar si el límite individual `equipo` de `QA-SD02` debe conservarse, aunque el rol Operativo admita `all`; o si la aceptación exige visibilidad de cartera completa de ambos países para esa persona. La primera opción hace que CO=0 pueda ser legítimo en Pólizas pero obliga a explicar Cliente 360=49 y sus relaciones; la segunda sería **un cambio de acceso material**, sujeto a autorización expresa y prueba multi-UID de mínimo privilegio. No usar el conteo de Clientes para ampliar Pólizas por inferencia.

**Falta para cerrar P0-2:** lectura firmada de servidor bajo UID efectivo (callable y SDK directo), positivas/negativas país/tenant/rol/asesor/vehículo, recarga directa, UAT propia de Carlos en el mismo artifact, y pruebas de no fuga. Este delta no crea mini-gate ni cambia el ledger. **I6 5/10 = 50%; P0 históricos 1/6; B4-003 HOLD; tesis HOLD; producción NO-GO.**


## Adenda de decisión de alcance por ROL — 2-nov-2026 | ejecución de fuente, no UAT

**Decisión expresa de Paula (posterior a la adenda UID anterior):** la regla debe ser transversal por **rol**, nunca por la identidad de Samuel o Carlos. `Operativo` debe poder **leer toda la cartera de Pólizas, Vehículos y Clientes** de **cada país efectivo autorizado a su membresía**, incluido GT/CO si ambos están asignados. `AdminTenant` conserva la lectura completa dentro del tenant y países autorizados; `Asesor/Comercial` no adquieren acceso global. Esta decisión sustituye únicamente la pregunta de alcance que quedó abierta en el apartado anterior; no cambia roles, países, propietarios, expedientes, historial de octubre ni compuertas.

**Causa raíz de fuente, comprobable:** en `functions/b4-003-scoped-access-boundary.js` el tenant declara `roleScopes.Operativo=all`, pero `dataScopes.modules.polizas=equipo` reducía la lectura de Pólizas a team. El módulo `clientes` tenía una excepción exclusiva, lo que divergía del módulo `polizas`. El runtime `orbit360-platform/core/access-scope.js` repetía la reducción en la UI, mientras la política efectiva solo reparaba Cliente 360.

**Corrección sistémica propuesta dentro del único gate B4-003:** aplicar la precedencia del rol tenant `all` a la *lectura* de `clientes`, `polizas` y `vehiculos` para `Operativo/AdminTenant`, solo cuando ese alcance está afirmativamente configurado y el módulo no está negado. Conservar control server-side de UID asignado, rol firmado, estado activo, módulo autorizado, países y tenant, además de denegación de país ausente/pendiente. No cambiar el contrato de `canWrite` de la política efectiva ni ejecutar escrituras de datos. El test cubre dos roles y distintos scopes heredados (own/team), sin codificar UIDs de personas reales.

| Prueba de fuente | Esperado | Obtenido en harness local aislado | Dictamen |
| --- | --- | --- | --- |
| Lector server-side sintético de Pólizas | Operativo ve toda cartera GT/CO autorizada; Asesor solo propia | 27 comprobaciones, sin escrituras | PASS técnico de fuente, no Firebase UAT |
| Contrato server-side rol/país/tenant/módulo | Operativo y AdminTenant completos; negativas se mantienen | 16 comprobaciones positivas/negativas | PASS técnico de fuente, no Firebase UAT |
| Scope frontend con membresías sintéticas | Operativo/AdminTenant all, Asesor own, país exacto | Harness local aislado, sin navegador autenticado | PASS técnico de fuente, no UAT |
| Política efectiva lectura/escritura | Lectura portfolio all; `canWrite` no recibe membresía elevada | Harness local aislado, sin persistencia | PASS técnico de fuente, no UAT |
| Preview nueva + UID real Paula/Carlos/Samuel + cold reload + callables | Autorización backend y ausencia de fuga en ambos países | Aún no ejecutada sobre estos nuevos bytes | **NO EJECUTADO/HOLD** |

**Salvaguardas:** las pruebas no alteran Firestore, miembros, countries, owner, Rules, Hosting LIVE ni recursos operativos. No se reetiquetan aprobaciones anteriores de Carlos ni se certifica Samuel. Es obligatorio producir nuevo digest de build, Preview aislada de estos bytes y readback backend real antes de actualizar el ledger; la Preview `gi-i65-b4-264a28cd2dd8-57f234755dc1` solo demuestra los bytes anteriores. **I6=5/10 (50 %), P0 históricos=1/6, B4-003 HOLD, producción NO-GO.**

**Recibo inmutable de la decisión y pruebas de fuente:** `artifacts/orbit360-recovery/release-control/I6_5_B4_003_ROLE_BASED_PORTFOLIO_SCOPE_SOURCE_SUCCESSOR_20261102.json` (blob Git `c8c9fb7fdbcfdc2194640e96883db87a05474109`). El Control Plane añade un *pointer* de candidata de código sin modificar la autoridad de la release publicada ni aprobar producción.

**Corrección causal de expectativa CI (misma iteración):** la primera construcción Hosting del rol-wide source se detuvo sin desplegar en [run 41577450329](https://github.com/paulaosoriof86/orbit360-core/actions/runs/41577450329): la prueba antigua `gravicentra-b4-003-client-country-authority.test.cjs` seguía exigiendo `policyScope=own` para Operativo, contradiciendo la decisión autorizada. Solo se actualiza esa aserción para `policyScope=all` + `clientScope=all`; se conserva `clientRequiresCountryIndex>0` y todas las denegaciones de país/tenant. El harness aislado corrigió y ejecutó **38/38 comprobaciones**, sin escritura; el indexado físico y UAT siguen abiertos. No interpretar la falla previa como fallo de producto ni como evidencia de certificación.


## Adenda Preview exacta de alcance por rol — 2-nov-2026 | evidencia nueva y HOLD

| Escenario | Fuente exacta / LAB | Evidencia | Resultado | Pendiente |
| --- | --- | --- | --- | --- |
| P0-ROL-CARTERA, lectura servidor con scopes heredados | `adff22f`; lector Preview run 41577265648 | 27/27 lector; 16/16 rol/país; 38/38 país-cliente; 132/132 relacionados | **PASS técnico sintético y despliegue de función Preview** | JWT real de Samuel y Carlos, negativas de UID, país y módulo |
| P0-ROL-UI, build con backend actualizado | `a94bc13`; `gi-i65-b4-a94bc1399189-57f234755dc1`; [Preview](https://ays-orbit-360-lab--gi-i65-b4-goals-41577785514-uzbik3js.web.app/) | Run 41577785514 SUCCESS; build JSON y assets exactos; Chrome mostró login en carga directa de Pólizas; nueva regla `roleWidePortfolioScope` servida | **PASS técnico de transporte; NO EJECUTADO UAT** | Sign-in independiente, filtros CO/GT, Cliente360/vehículos, cold reload |
| P0-ROL-NEGATIVAS | Mismo build y Preview | Matriz sintética niega país/tenant/módulo, `Asesor=own`; `canWrite` efectivo no elevado | **PASS sintético; NO EJECUTADO sobre JWT** | Negativas autenticadas backend y Firebase Rules |
| Retención LIVE | Hosting run 41577785514; lector run 41577265648 | Comparación de hashes LIVE LAB + app.aysseguros.com sin cambio; Rules/Auth/IAM/datos no escritos | **PASS técnico de inmutabilidad LIVE** | No equivale a GO-LIVE |

**Recibo exacto:** `artifacts/orbit360-recovery/release-control/I6_5_B4_003_ROLE_PORTFOLIO_PREVIEW_TECHNICAL_READBACK_20261102.json` (blob `afb486049aeca3b277bf0628a6a9860c693809a1`). **Usuario aceptante:** ninguno; la automatización no representa a Paula, Carlos ni Samuel. Una vez autenticados en esta Preview, añadir UAT de UID/país/rol con prueba negativa sin cambiar membresías. **B4-003 HOLD; I6 5/10=50 %; producción NO-GO.**


---

## Adenda de resultados focales Samuel — 3-nov-2026 | HOLD sin cambiar el plan

**Evidencia única:** [matriz de 28 escenarios y comprobaciones](I6_5_B4_003_SAMUEL_AUTH_CHROME_MATRIX_20261103.md), commit documental `47495ab407f0d95f580f197cf6883eee4c5eaf4a`, build productivo de Preview **sin cambios** `gi-i65-b4-a94bc1399189-57f234755dc1` (source `a94bc13991892ed7060dbd50318021d3c7baba16`). Samuel autenticado: **Operativo/CO Pólizas 124/124 y Cliente360 49/49**, ambos con recarga de lista; **FAIL fichas individualizadas** CO en el rol Operativo, mientras Administración logra lectura. Asesor GT muestra una póliza propia con ficha de vehículo y recarga positiva; el selector no certifica denegaciones servidor. E4/CO/2026 muestra 26 filas en rol AdminTenant y mantiene conciliación abierta. **Sin captura anonimizadora publicable ni JWT/SDK negativo, UAT firmada no certificada, sin escrituras ni LIVE.** Corregir el límite lista→GET→deep-link por rol/país bajo contrato fail-closed y revalidar en nuevo digest solo después de CI. **I6 5/10=50%; P0 históricos 1/6; B4-003 HOLD; producción NO-GO.**
