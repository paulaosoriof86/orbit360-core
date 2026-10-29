# GRAVICENTRA INSURANCE — I6.5/B4-003 | Freeze de enfoque y plan de choque, 29-oct-2026

**Naturaleza:** checkpoint factual y de decisiones de Dirección. No es una certificación nueva, cambio de gate, aprobación de LIVE ni modificación de los locks históricos.

**Repositorio / rama:** `paulaosoriof86/orbit360-core` / `recovery/fase-a-clean-20260831`.
**HEAD inspeccionado:** `1e006d104bba599657a4abea45e40a33b7cf9aa6`.
**Gate único activo:** `I6.5/B4-003`.

## 1. Decisiones congeladas, sin reabrir

1. **Excepción propietaria Firestore ya otorgada el 28-oct:** Paula aceptó temporalmente el riesgo de las Rules compartidas actuales para una salida **LIVE controlada**, sin expansión de accesos, con endurecimiento P0 urgente después de producción. Las mismas Rules amplias **no son por sí solas impedimento para esa salida**. No pedir nueva aceptación ni presentar este riesgo como `SECURITY_PASS`. Autoridad: `I6_5_B4_003_PAULA_OWNER_TEMPORARY_FIRESTORE_RISK_ACCEPTANCE_20261028.md` y `CONTROL_PLANE.b4003OwnerTemporaryRulesRiskException20261028`.
2. **B4-003 sigue abierto por certificaciones pendientes distintas de la excepción:** no está autorizado elevar la prueba sintética a UAT autenticada, usar comprobaciones históricas como prueba de la candidata actual, asumir restauración demostrada por disponer de backup, ni promover el frontend sin sincronización y aprobación material.
3. **Secuencia original conservada:** `I6.5/B4-003 → B4-004 → B4-005 → B4-006 → B4-007 → I6.6 → I6.7 → I6.8 → I6.9`. Sin gate alternativo ni nueva rama.
4. **Historial ya certificado no se repite sin modificación causal:** lectura GT/CO/TODOS de Paula bajo Dirección, Operativo y Asesor; ni se cambia su estado para acelerar el release. Las demás pruebas se acreditan solo contra la versión y superficie efectivamente evaluadas.
5. **Límites de esta intervención:** solo lectura y diagnóstico local. No se desplegó LIVE, no se tocó Auth, IAM, Rules, Firestore ni datos. Una corrección local del guard está **en investigación y no publicada**; ningún PASS de producción puede inferirse de ella.

## 2. Hallazgo nuevo comprobado: preflight CI y linaje

- El workflow Guard v5 asociado al HEAD inspeccionado, run `40827323380`, concluyó `FAILURE`. El primer error histórico reproducido fue `B4_003_HISTORIAL_READER_SUCCESSOR_INVALID`: el guard exigía que un sucesor certificado del 28-oct siguiera siendo el HEAD, ignorando descendientes legítimos.
- En copia de trabajo local, el control de historial se transformó experimentalmente en **verificación de commit histórico exacto + padre + asunto + archivos + ascendencia**; la prueba pasó los hitos Historial, políticas por país, cobros, diagnóstico de cliente, aseguradoras y varias pruebas sintéticas. **El archivo del guard NO fue enviado a GitHub**.
- Al llegar al control de baseline apareció un defecto distinto y anterior a la publicación: `I6_CERTIFIED_SOURCE_NOT_ANCESTOR`. El `certifiedCandidate.sourceSha` es `4bf67a3738751fe2432a130fd23254a6f1c7d16e` (18-sep); la raíz Git de la rama actual es `4e6f8579da823650952cbf47840f6415617cfea0` (08-oct). Son historias distintas. Un fetch profundo descartó que fuera solo un clon superficial.
- El **diff de árboles**, desde el SHA certificado hasta el HEAD, arroja 1,047 rutas modificadas; las 115 rutas no exentas coinciden **exactamente** con 114 rutas del manifiesto acumulativo más la excepción preexistente `core/ui.js`. Pero **15 de los 114 hashes del manifiesto no son iguales** a los blobs en HEAD. Su último cambio es identificable en commits posteriores (Historial, Cobros, Cronograma, Cliente 360, provider/auth y otros). Por lo tanto, hay coincidencia de *conjunto de rutas*, **no** certificación de contenido ni permiso para ignorar la falta de ascendencia.
- Se exploró una excepción de linaje **únicamente como experimento local, protegida por variable explícita**. Tampoco dio PASS: el siguiente resultado fue `I6_CANONICAL_COMPOSITION_BLOB_DRIFT`. **No publicar ni habilitar ese experimento como atajo.** La diferencia requiere reconciliación canónica aditiva, con hashes y sucesores exactos, y evaluación de la autoridad de linaje.

## 3. Pruebas focales ejecutadas en HEAD inspeccionado (solo sintéticas)

| Prueba local | Resultado | Alcance y límite |
| --- | --- | --- |
| `gravicentra-b4-003-historial-country-selection.test.cjs` | PASS | GT/CO/TODOS, país de póliza, cierre de drawer ajeno, lectura |
| `gravicentra-b4-003-cronograma-durable-task.test.cjs` | 4/4 PASS | Contrato de tarea durable Preview y manejo de fallos; **sin escritura real probada** |
| `gravicentra-b4-003-c360-cobros-currency-overdue.test.cjs` | 26 checks PASS | Moneda, cartera vencida, alcance active-only; sin red ni escrituras |
| `gravicentra-b4-003-insurer-readiness-facade-bridge.test.cjs` | PASS | Estados loading/denied/failed; sin Firestore directo ni escrituras |

Estos PASS no sustituyen la matriz de UAT real autenticada con más de una identidad, el readback de persistencia ni las pruebas de restauración.

## 4. Camino crítico único, sin repetir decisiones

| Orden | Paso material | Criterio de cierre |
| --- | --- | --- |
| 1 | Reconciliar la descendencia de la candidata contra el baseline y producir **un solo sucesor aditivo** de composición que vincule los 15 blobs posteriores a commits/recibos legítimos. Sin reescribir pruebas anteriores ni desactivar el guard. | Guard de gobernanza completo PASS; árbol, conjunto y SHA exactos; sin falsa aceptación de linaje |
| 2 | Correr CI pertinente sobre el **commit exacto** de la candidata; clasificar workflows antiguos de dispatch que no sean aplicables, sin ocultar fallos genuinos. | Evidencia de build y fuente servida congruentes; control de releases PASS |
| 3 | Completar UAT B4-003 pendiente: dos UIDs reales autorizados, aislamiento rol/país, Cliente 360 → Historial → Cobros, persistencia Cronograma y Aseguradoras, cartera/moneda, aviso de errores. Conservar PASS anteriores por identidad/versión. | Evidencia autenticada de éxito/denegación, recuperación sesión y readback, sin inconsistencias críticas |
| 4 | Verificar backup y **ensayo de restauración** en destino aislado antes de la promoción controlada; realizar comparación exacta de candidata/preview/LIVE y definir rollback. | Restauración demostrada, rollback practicable, evidencia de integridad y autorización de salida |
| 5 | Cerrar `B4-003` con verdad verificable, luego ejecutar `B4-004` a `B4-007` y `I6.6` a `I6.9` conforme al plan original. | Ningún gate saltado ni asumido por urgencia |

## 5. Próxima acción única

**Conciliar de forma acotada el baseline disjunto y los 15 hashes posteriores**, sin modificar Rules ni promover LIVE. No se declara `B4-003 PASS` hasta pasar el guard íntegro, fuente/hosting exactos y la UAT necesaria. Priorizar desbloqueos verificables sobre nuevos diagnósticos repetidos.


---

## 6. ADENDA OPERATIVA TRANSVERSAL 29-OCT-2026 — PLAN DE CHOQUE ACTUALIZADO

**Carácter:** delta aditivo al freeze anterior, sin sustituir aprobaciones, recibos, 15 linajes, 86 tareas, 295 hallazgos ni planes de salida. El HEAD validado antes de esta actualización fue `a9d4f778ecd778c6c43c67f789a0682acfb812fd`. El frontend servido en LAB Preview sigue anclado a `199860dd23cad3db2df581828a45ae9f9e5cc7d8`, build `gi-i65-b4-199860dd23ca-57f234755dc1`, CI Hosting run `40861280332` SUCCESS. El resultado de Control Plane CI sobre `acefd8aa` o descendientes sigue sin acreditar: la ejecución anterior `40861280336` falló en el viejo HEAD.

### A. Prioridad y semáforo sin reprocesos

- **P0/A — Gobernanza y release:** acreditar Guard v5 en CI sobre HEAD posterior al ajuste histórico; proteger la composición canónica de 114 archivos, el sucesor `199860dd` y el baseline disjunto, sin falsificar descendencia. No publicar cambios de producto que disparen el workflow histórico con capacidad LIVE sin una secuencia aislada y verificable.
- **P0/B — Renovaciones:** conservar aceptación visual de Paula del 16-oct y las pruebas por rol/país/viewport. Resolver solo el vínculo causal «Renovada» vs vencida sin sucesora acreditada, transacciones de seguimiento y rendimiento posterior a cambio de rol (anterior FAIL ~11–13s frente a límite 8s). No volver a diseñar tablero.
- **P0/C — Ops, Leads y Upsells:** conservar aprobación Ops 12-oct, 4 negocios en flujo Ops y 6 leads visibles; cerrar ciclo Lead→gestión Ops→cliente/póliza con ownership, historial, persistencia y negativa de otro usuario. No duplicar gestiones.
- **P0/D — Cliente 360 y relaciones:** diferenciar 1,413 pólizas con cliente visible + 12 sin cliente visible = 1,425 del listado. Adjudicar vínculo y país GT/CO con fuente; no reimportar ni asumir 12 pérdidas físicas. Mantener importes GTQ/COP separados.
- **P0/E — Cartera, recibos, Cobros y Conciliaciones:** conservar total 2,560 Cobros, GT 2,514 / CO 46; 1,229 SIGA sin confirmar; 5 pagos confirmados GTQ Q2,744. Adjudicar cuatro filas COP marcadas vencidas bajo GT frente a Cartera, y verificar `finmovs` reader/writer y conciliación formal vacía. No inferir pagos ni alterar saldo real.
- **P0/F — Roles, permisos y lector protegido:** diferenciar UIDs Paula/Carlos, membresía real, «Ver como» y permisos backend; comprobar matriz operativa/administrativa sin ampliar IAM. La excepción propietaria temporal de Firestore 28-oct permite considerar LIVE controlado una vez los demás gates pasen; no convierte Rules en PASS.

### B. Trabajo concurrente por dominios (misma candidata, no nuevas ramas ni gates)

| Frente | Capacidades conservadas | UAT exacta que falta | Criterio de cierre |
| --- | --- | --- | --- |
| Acceso e Inicio | Login, roles, sesión, 5/5 hidratación, KPI por país | Paula Dirección/Operativo/Asesor y Carlos UID independiente; logout/login, reload, first paint y error logs | Identidad/país/alcance correctos sin parpadeo ni fuga |
| Cliente 360 / Pólizas / Vehículos | 434 clientes visibles, 1,425 pólizas, 230 activas y catálogo de riesgos | 12 vínculos y los cruces GT/CO; CRUD sintético y readback, estado de vehículo | Persistencia y relaciones correctas, no reimportación |
| Cobros / recibos / Conciliaciones | Partición 2,514+46, 1,229 SIGA, 5 pagos | GT/CO/COP por registro; `finmovs` scoped; PDF/Excel/CSV con archivo comprobable | Montos por moneda, filtros y documentos sin discrepancias |
| Renovaciones | 19 vencidas, 2 ≤15d, 14 16–45d, saludo corregido | Sucesora/vigencia, tareas, Ops, Historial y desempeño en cambio de rol | Flujo recuperado y respuesta rápida conforme a criterio |
| Ops / Leads / Upsells | 4 gestiones de cotización y 6 leads | Handoff lead→Ops→cliente/póliza; dueño, país, notas, notificación y recarga | Un ciclo único, sin duplicar ni perder ownership |
| Aseguradoras / Conocimiento / Fianzas | 33 fichas con 2 QA, 29 activas, 13 contactos, 7 accesos, 1 documentación | Edición de ficha sintética protegida; backend read/write y rol; tarifas solo validadas | CRUD real autorizado; negativa robusta a quien no deba editar |
| Cronograma / Historial | Create→update→reload sintético PASS previamente archivado, 35 actividades de Paula | Verificar no regresión en candidata sucesora; relaciones actividad→cliente/renovación | Historial íntegro; Cronograma PASS previo conservado |
| Cancelaciones / Siniestros | 490 cancelaciones, 0 reclamos | Motivos y moneda extrema USD fuente; `reclamos` reader/writer; caso sintético | Sin falsos motivos, country scope y persistencia |
| Comisiones / Reportes / Calidad | Vistas y catálogos; Reportes 1,425 | Comisión source vs cero real; 74 discrepancias importación y relación; PDF real | Indicadores trazables, exportes readback |
| Equipo / Configuración | 7 usuarios, multirrol, marca/catálogos | Roles por permiso efectivo y editar solo fixture autorizado; logout/invitado | Backend no confía solo en selector visual |
| Shell / PWA / Responsive | 31 rutas y 15 linajes históricos | Navegación/errores/404, carga fría/cálida, móvil 320/390 y desktop | Todas las rutas aprobadas alcanzables sin regresión visual |

**Cobertura extendida preservada:** Cotizador, Comparativo, Endosos, Certificados, Documentos/Drive, Portal, Notificaciones, Marketing, IA, Academia, Finanzas, Correo, Calidad e Importación siguen en el inventario de 44 áreas. Que aparezcan en menú no implica cierre de sus flujos; no se eliminan ni se reabren sin defecto causal.

### C. Readback autenticado efectuado en la misma Preview (Paula / Dirección / Todos)

Nueva inspección navegada 29-oct desde Chrome local, en pestaña aislada y sesión restaurada: Inicio (434 clientes, 1,425 pólizas, 645 vencidos); Pólizas (1,425, 230 activas, 16 próximas); Cliente 360 (1,413 vinculadas y 12 sin cliente visible); Renovaciones (19/2/14); Ops (4 negocios y 2 gestiones); Leads (6); Cobros (Q2,744, 5 pagos, 1,229 SIGA); Historial (35); Conciliaciones (6 categorías formales cero); Aseguradoras (33/29); Cancelaciones (490); Siniestros (0); Comisiones (0); Equipo (7); Cronograma (agenda visible); Reportes (1,425 tras hidratación). Son **readbacks funcionales de lectura y carga**, no PASS de escritura, exportación, autorización backend o LIVE. La pantalla Reportes inicialmente indicó cero durante restauración/hidratación y cargó 1,425 tras navegación; no se concluye pérdida de datos, se revisará su estado de carga.

### D. Fuente correctiva preparada pero aún no desplegada

Causa reproducida del rechazo `functions/permission-denied` en actualización QA de Aseguradoras: el reader de directorio protegido proyecta campos de negocio pero omite `__syntheticQa`; el writer Preview exige esa bandera al actualizar una entidad sintética; la ruta de `batchDurable` no la reconstituye para `aseguradoras` (sí hay trato especial previo para pólizas QA). Corrección preparada **solo** para update de aseguradora con ID sintético y Preview; IDs reales, otras colecciones y LIVE quedan inalterados. Test focal: 5/5 PASS local, sin Firebase ni UAT autenticada. Archivos propuestos:
- `orbit360-platform/data/store-firestore-product-operational-p0.js` → blob propuesto `8bd608bc5a3aa7cd58feca8e309c97ea19059a91`.
- `tools/gravicentra-b4-003-insurer-preview-projection.test.cjs` → blob propuesto `02edb6b02f7a88a705dba5c9b6d0adca838a790d`.

**Publicación condicionada técnicamente:** el producto está protegido por comparación SHA de composición y el workflow I6 Post-Salida incluye `store-firestore-product-operational-p0.js` entre sus paths de push; un push directo puede activar camino de LIVE. Primero acreditar guard de fuente actual sin modificar producto; después integrar la corrección en sucesor **atómico y trazado**, neutralizando ejecución de LIVE y readback de CI/Preview, sin tocar Auth/IAM/Rules/datos. No usar el plan/checkpoint como certificación de código.

### E. Entregables exigibles para la jornada y decisión Go/NoGo

1. Evidencia CI del Control Plane sobre fuente/árbol correctos, o incidencia precisa con motivo, no solo prueba local.
2. Candidata única publicada con SHA, cambios mínimos, tests y recibo aditivo; Preview nueva generada si cambia cualquier archivo de producto y byte-readback exacto.
3. Matriz de 44 áreas y 15 capacidades clasificada `HISTÓRICO PRESERVADO`, `CURRENT_PREVIEW_READ_PASS`, `CURRENT_PREVIEW_WRITE_PASS`, `BLOCKED_CAUSAL` y `LIVE_PASS`, sin retrocesos ficticios.
4. UAT crítica con dos UIDs y GT/CO; validar relaciones y operaciones sintéticas en lugar de reabrir diseños aprobados.
5. Preflight de copia/restauración aislada, artefacto único y rollback; promoción controlada solo después de superar gates, con readback LIVE y escrituras expresamente autorizadas. Agosto sigue fuera de alcance hasta aceptación productiva.

**Gobierno de avance:** reportar por lote **versiones reconciliadas, rutas verificadas, defectos causales abiertos/cerrados, builds/CI/Preview/LIVE acreditados**. No convertir el 50% formal I6 ni el 96% histórico de B3 en «porcentaje de módulos funcionando hoy». No repetir aprobaciones previas; limitar UAT a deltas de source/rol/dato realmente afectados.


---

## 7. CIERRE TÉCNICO PARCIAL 29-OCT-2026 — PUBLICACIÓN, CI, PREVIEW Y RAÍZ TRANSVERSAL

**No sustituye cierre B4-003 ni PRODUCTION_ACCEPTED.** Adenda de evidencia posterior al apartado 6; conservar la secuencia de recuperación, las 15 capacidades aprobadas y recibos históricos inmutables.

### 7.1 Evidencia de publicación material

1. Documento de plan 29-oct, commit `add5c8356428df4ffcb4b527c8329e7e5158d06f`, blob `452dea66ff11e026bf23f1b80c33c37c770c9ded`, Guard v5 run `40886682710` SUCCESS.
2. Corrección **solo Preview QA sintética** de Aseguradoras, commit `8193ab69dabde3c8001258e4e8f33860c15418e4`; escritor `orbit360-platform/data/store-firestore-product-operational-p0.js` blob `8bd608bc5a3aa7cd58feca8e309c97ea19059a91`; prueba focal `tools/gravicentra-b4-003-insurer-preview-projection.test.cjs` 5/5 PASS local y en CI. Recupera el marcador `__syntheticQa` que el directorio protegido no proyecta, solo para el update de aseguradora con identificador sintético en canal Preview; no autoriza editar una aseguradora real ni modifica el endpoint LIVE.
3. Ajuste de control de linaje de recibo histórico sin alterar su contenido, commit `4c06fd22f4eb2e387803a60e982eaee948b7d762`; guard valida blob antiguo en commit pinned y nuevo en sucesor. Activación de CI commit `a63a7af5eb066bc87f94131e7b981741b29e4afc`; Guard v5 run `40888149342` SUCCESS, `SECURITY_RELEASE_HOLD=ACTIVE_FAIL_CLOSED`, 6 P0 aún abiertos.
4. Workflow aislado Hosting-only commit `e08851199fcfef10aa76348e12554b1f0b8e2ed3` y corrección exclusivamente de disparador commit `f4f3879009594ea32a882540015afae87e097a84`. Guard v5 run `40889172710` SUCCESS.
5. Despliegue aislado run `40889172816` **SUCCESS**; fuente inmutable `a63a7af5eb066bc87f94131e7b981741b29e4afc`; Preview `https://ays-orbit-360-lab--gi-i65-b4-a63a7af5-40889172816-ocai3efe.web.app/`. CI verificó 10 baterías sintéticas/regresión, archivo de fuente/build y bytes servidos exactos, comparación sin cambios de `ays-orbit-360-lab.web.app` y `app.aysseguros.com`; no despliegue LIVE, Functions, Rules, Auth, IAM ni escrituras operativas.
6. La inspección interactiva de la nueva URL mostró pantalla de Login; cada subdominio Preview exige sesión propia. **UAT autenticada del cambio de Aseguradoras pendiente**, sin PASS de operación real; Paula fue informada para autenticarse sin compartir credenciales.

### 7.2 Hallazgo sistémico — composición de módulos históricos vs contrato de escritura actual

**Dato primario:** inspección estática de 28 archivos base bajo `orbit360-platform/modules/` en fuente `a63a7af5`, contrastados con el `SURFACE` efectivo del escritor `store-firestore-product-operational-p0.js`. No se ejecutaron writes reales para esta tabla, por lo que son **rutas técnicas de riesgo, no fallos UAT acreditados individualmente**.

- **11 combinaciones módulo/colección con operaciones insert/update/remove fuera del allowlist**: Academia→`cursos`; Correo→`correos`; Finanzas→`facturas`, `presupuesto`, `acreedores`, `conciliacionBanco`; Marketing→`contenidos`; Plantillas→`plantillas`; Portal→`notifs` y `documentos`; Reportes→`reportes_prog`. Agrupan 7 módulos. Pueden tener bridges o rutas alternativas: se exige revisión de llamada activa, backend y última aceptación antes de atribuir regresión general.
- **7 claves `setPref` en 4 módulos**: Automatizaciones (`aut_cfg`, `aut_log`); Configuración (`planes`, `paises`, `integ_`); Cotizador (`cot_hist`); Notificaciones (`wa_log`). El `setPref` de la fachada activa utiliza exclusivamente `prefOverlay` en memoria. No equivalen a persistencia durable después de recarga; probar impacto real de cada flujo y no elevar a PASS por mostrar toast.
- **Plantillas: fallo REAL de navegación actual** en Preview `199860dd`: route `#/plantillas` deja contenedor principal vacío y consola `PRODUCT_WRITE_COLLECTION_NOT_AUTHORIZED` (dos errores); la función `boot()` intenta insertar las seis plantillas base al renderizar cuando `S().all('plantillas')` está vacío. El archivo `modules/plantillas.js` tiene el mismo blob `66f570d725e82beebfffad6df4e86aa8ab4ebd08` del commit histórico `15f6224754ec` de 07-jul; el problema es la **composición con el nuevo escritor**, no prueba de que se perdiera el desarrollo/aceptación histórica. No incorporar `plantillas` al allowlist sin backend, rol/tenant y persistencia aprobados; no simular guardados en memoria/localStorage.
- **Portal:** en navegación de Preview antigua el gate legal global permaneció visible tras abandonar `#/portal` y recorrer otras rutas hasta recargar. Verificar teardown del modal por cambio de ruta; no aceptar términos en nombre de Paula. Está observado, pendiente de caracterización causal y prueba en nueva candidata.

### 7.3 Semáforo tras este lote

- **PUBLICACIÓN DE FUENTE Y CONTROL:** PASS (commits, blobs, dos Guard v5 CI).
- **BUILD + PREVIEW AISLADA EXACTA:** PASS (run `40889172816`, sin LIVE).
- **31 RUTAS / 28 ARCHIVOS BASE:** inventario y lectura extensa completados para localizar regresiones; **NO** 31/31 funcional PASS.
- **UAT escritura Aseguradoras / Plantillas / Portal / Cliente 360 / Cobros / otros:** parcial o pendiente de identidad, contratos y readback; historial de Cronograma sintético conservado.
- **B4-003, seis P0, aceptación productiva, respaldo/restauración aislada, matriz multi-UID/viewport, agosto:** HOLD / NO ACREDITADOS. No hacer deploy LIVE ni reimportar datos.
- **Acción inmediata:** Paula autentica la nueva Preview; verificar fixture de Aseguradoras con edición/restore/readback, registrar error exacto; cerrar por causa transversal los flujos de escritura activos fuera de fachada y continuar UAT multi-módulo por rol/país sin reabrir diseños.
