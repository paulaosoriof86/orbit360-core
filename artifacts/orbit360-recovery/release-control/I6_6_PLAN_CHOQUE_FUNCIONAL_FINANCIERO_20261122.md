# Gravicentra Insurance — Plan de choque operativo, funcional y financiero — domingo 22/11/2026

**Estado:** SECUENCIA OPERATIVA DE DIRECCIÓN CONGELADA DENTRO DE I6.6. **No crea gate, rama, repo ni metodología paralela.**
**Control rector:** `CONTROL_PLANE.json` / `I6_6_OPERATIONAL_CONTINUATION_20261115.json` / locks normativos V3–V7 / `I6_FINDINGS_LEDGER_20260924.json` y registro de 295 / recibos físicos.
**Criterio de verdad:** no prometer equipo listo el lunes 23/nov sin evidencia de uso LIVE rol×caso×reload. Nueva evidencia no reemplaza PASS histórico; regressions solo causal.
**Preservación:** Firebase actual, Firestore operativo, Drive documental, branch recovery/fase-a-clean-20260831, build inmutable, Preview=LIVE bytes, fuente/digest pinned, idempotencia, rollback.

## Diagnóstico inicial verificable

- I0–I5 aceptados 7/7 (100% formal histórico); I6 cerrados 6/10 (60% formal), active I6.6; I6.7–I6.9 no cerrados.
- Última release física registrada: source `f1eb5bc6397f0b159079be516a521dd7b1e5d9ba`, build `gi-i66-f1eb5bc6397f-57f234755dc1`, artifact `14674736714`, digest `sha256:e55fcc674a6cc493cdedff27672d082222db3dd7134354559788364b6ae23713`, Preview/Hosting/Custom domain 224 archivos, Hosting version `sites/ays-orbit-360-lab/versions/7a0d829d3504c9f8`, LIVE clone GitHub run 44827928263.
- Pruebas firmadas del mismo artefacto: Carlos/Dirección pago sintético con dedupe/readback/reload, Cliente 360 edit, Ops/Leads tarea; 0 cobros o actualizaciones de clientes reales ejecutados en esa release.
- **Desfase comprobado:** `CONTROL_PLANE.currentExecutionDecisionPointer` y `nextAction` siguen anclados al acceptance 17/nov `1b65a...` y describen 223 archivos; `I6_6_RELEASE_TRANSPORT_CONTROL.currentPhysicalHostingRelease` está en la versión 431892 del importador; recibo físico 20/nov acredita f1eb/224. Guard central PASS no demuestra que esos punteros se hayan actualizado.
- **Causa física del drift:** `tools/gravicentra-i6-6-operational-release-candidate.cjs` contiene `ACCEPTANCE_KEY='i66OperationalExactLiveAcceptance20261117'` y `acceptedForPreflight()` exige `control.currentExecutionDecisionPointer===ACCEPTANCE_KEY`, `work.latestProvenLiveSource===p.sourceSha` y el transport live 223 archivos de 17/nov. No hacer replace manual parcial que rompa la guarda: introducir transición monotónica auditada para sucesor 20/nov, con lectura de recibo firmado, QA de transición, readback y rollback, sin reescribir pruebas pasadas.
- Fuentes estáticas Evergreen V7 `projectSources.staticSourceUpdateRequired=false`, readback 9/9 en nov05; no cambiar fuentes por evento operativo. Regla multipaís por aseguradora sigue pendiente de adjudicación normativa, no asumir salida V8.
- Drive autenticación y consentimiento de app: chooser alcanzado, proveedor muestra app no verificada; sin adjunto real upload+download certificado. Make 10196136 (Green API lectura) y 10195867 (webhook lead) están inactivos, sin escritor canónico ni lead nuevo demostrado.
- Chrome conectado visible pero contenido app.aysseguros.com bloqueado para esta sesión por permisos de host; TinyFish carece de perfil autenticado gravicentra confirmado. Sin habilitación, auditoría LIVE manual no se puede ejecutar desde esta sesión; preservar y explicar límite.

## Carril operativo de choque: orden obligatorio y prueba para cada salida

| Secuencia | Bloque dentro de I6.6 | Acción concreta | Gate mínimo de cierre | Dependencia / fallo aislable |
|---|---|---|---|---|
| 0 | Autoridad/release identity | Registrar el recibo LIVE f1eb/224; reconciliar Control Plane, puntero de runtime/transport y validador hardcodeado sin parchear artifact | Guard PASS después de cambio atómico, latest LIVE 224 por los dos orígenes, rollback físico preservado | No tocar `main`, ni origin forense, ni refs de releases pasadas |
| 1 | Seguridad de uso mañana | Realizar nueva prueba real por rol (Dirección GT, Operativo GT/CO, Admin, Asesor/Comercial), login, sesión, menú, permisos backend, país, recarga, solicitudes 4xx/5xx/console | 0 error relevante; permisos positivos/negativos y reload reales; paths por rol | Requiere sesión autenticada / permiso del navegador; sin ello solo registro `NO_PROBADO`, nunca PASS |
| 2 | Escrituras básicas | Cliente 360 edición/alta; asignar Germán/Priscila desde Equipo real; editar asesor, póliza, datos y relaciones; pruebas de Ops y Leads desde ficha existente | UI→server commit→readback→reload→historial con IDs únicos; Carlos Operativo usa permisos aprobados | No repetir gestiones previas ni crear clientes duplicados |
| 3 | Pólizas y renovaciones | Póliza nueva Sergio, premium nets/IVA/emisión/fraccionamiento, asesor; renovar en firme desde Cliente 360 y Pipeline; sucesora e historial; recalcular año/vigencia; conservar anterior y recibos+cartera | Póliza creada y recarga, sucesora vinculada, número antiguo precargado, 12 meses salvo override, frontend/backend y Kanban coherentes | Sin número/documento/identidad canónica de emisión: HOLD local del caso, no del módulo completo |
| 4 | Vehículos y endosos | Substitución emitida vs solicitar endoso; caso Ashley/Ashlyn sin duplicar anterior; fecha y ref de aseguradora exactas; sin alterar cobertura en solicitud pendiente | Historial de vehículo viejo, nuevo riesgo único, endoso y cambios financieros solo demostrados, persistencia LIVE | Discrepancia referencia/fecha previa se aísla, no reparar mediante nuevo endoso ficticio |
| 5 | Cobros, recibos, cartera | Pago directo con o sin soporte; Drive fallido no bloquea; factura real con fecha aseguradora + pago único; 3ª cuota y anteriores por evidencia; caso Edson rejected precondition exacta | `recibo+cartera+cobro`, conciliado vs confirmado, ID único, before/after, recarga Cliente360/Cobros/Portal, no recobro | No usar retry hasta resolver requestId original de Edson y readback canónico |
| 6 | Documentos y colaboración | Drive OAuth con conexión privada por usuario, subida/bajada real; adjuntar en Cliente 360, notas/gestiones, Ops, inspecciones, importador; no muestra éxito falso | Archivo real en Drive con referencia y acceso/ruta correctos, gestión e historial visibles tras reload | Google consent no verificado: mantener operación de pago posible sin adjunto y advertencia persistente |
| 7 | Integraciones y notificaciones | Make/Green API/WhatsApp web form/email: autenticación writer existente o servicio aprobado, webhook idempotente, consentimiento/origen, convocatoria Ops, Leads | Entrada real → negocio único → CRM/Ops/Leads → notificación tras commit → reload; sin duplicado; activación controlada | No activar escenarios incompletos ni publicar webhook sin firma/permiso |
| 8 | UI y transversales | Inicio KPIs, Aseguradoras permisos/portales/secretos, Recibos, Cobros aging, Cronograma, Historial, Reportes, Calidad, Siniestros, Cancelaciones, Academia, PWA, responsive 390/1024/desktop | Matriz módulo×rol×viewport, navegabilidad, 0 404/errores críticos, KPI por moneda, copies seguros, sin regresión y reload | Bugs corregidos dentro del mismo I6.6 con source nueva + CI+Preview+misma release LIVE solo cuando PASS |
| 9 | Promoción/salida | Para cualquier source change: manifest exacto, build/digest nuevos, pruebas Preview y humanas, clone el mismo artifact y LIVE rehash | Receipt por módulo y rollback, nuevo puntero Control Plane y guard posterior; full I6.6 solo con todos sus criterios | No promover si hay P0 pendiente; nunca aplicar datos para corregir UI ni reusar authorization anterior |

## Carril paralelo de datos: al menos un lote construido/procesado en cada ciclo

- No combinar escritura de código y actualizaciones de datos en un mismo reemplazo; `DATA_UPDATE`, `CODE_DEFECT`, `RELEASE_DEPLOY` separados como V5.
- Lote activo 302 pendientes El Roble/Universales/G&T/Ficohsa fuente `artifacts/orbit360-recovery/source-batches/I6_6_SOURCE_BULK_20261120_MULTI_302.json`, blob `ab64e111319e3447733a3af05bf378250698ccdb`; 137 matches, 165 holds, cero writes elegibles en el preflight. No inventar que las 137 sean nuevos cobros.
- Excepciones: Roble 113 ediciones de póliza +19 recibos no identificados; Universales 25 ediciones; G&T 4 ediciones +1 recibo; Ficohsa 3 ediciones. Resolver con PDF emitido y Firestore actual; si dos ediciones, no fusionar por nombre.
- Ya se aplicaron 110 `reciboEsperado/cartera` Roble (run 44592619323) y 33 pagos Cendoso (18 run 44569134138, 15 run 44593852150); preservar readbacks; no reaplicar.
- Cendoso 5 libros adjuntos con 6,616 filas; 3,706 claves provisionales y 2,910 reapariciones. No implica 2,910 cobros duplicados LIVE. Archivo de preparación `Gravicentra_I66_Lote_Grande_Preparacion_Delta_20261120.xlsx` y recibo `I6_6_NEXT_LARGE_DELTA_SOURCE_ONLY_INTAKE_20261120.json`. Claves provisionales nunca sustituyen ID canónico.
- Preflight 607 Cendoso marca 342 pagadas con cobro vinculado, otras evidencias 327 con 146 match y 181 hold. No sumar universos por solapamiento.
- Cinco PDFs El Roble con 49 cuotas verificadas documentariamente, cero pólizas nuevas aplicadas. Primera edición diferencia 5 centavos entre total impreso de carátula y cronograma; HOLD del cálculo hasta cotejar semántica, no inventar centavos.
- **Secuencia por lote**: fuente pinnned + SHA → snapshot Firestore fresh/escopado → diff clasificación `SIN_CAMBIO/ACTUALIZAR/AGREGAR/REVISAR_AMBIGÜEDAD/ELIMINAR_DESACTIVAR` → dedupe/CAS → protected live writer existente solo para delta determinista → receipt por ID before/after → recarga UI y cálculo cartera/cobros → mini-freeze. No segundo permiso por fila determinista si el gate ya lo autoriza; nuevas ambigüedades quedan aisladas.
- Si una iteración no encuentra filas elegibles, debe generar lote `ZERO_WRITES_EXPLAINED` con motivo y siguiente fuente, **sin simular avance financiero**.
- Reutilizar fuente de estado de cuenta, planilla y evidencia explícita; factura/estado banco/planilla pueden activar inferencias secuenciales según V7, con fecha efectiva contractual claramente **inferida**, nunca fecha histórica inventada ni duplicación de cobro.

## Matriz mínima de auditoría funcional proactiva

| Dominio | Acción que debe probarse físicamente | Riesgo adverso a buscar |
|---|---|---|
| Sesión | login, cambio de rol, reload, pestaña fría, PWA | logout falso, idioma/acento, lentitud, 401, hydration |
| Equipo | crear/invitar usuario, activar, cambiar rol/scopes, ingreso nuevo | Auth sin membresía, leak por rol, no recibe correo |
| Cliente 360 | alta, edición, asesor, CRM, notas, gestión, adjunto, historial, actividad | guardado falso, archivo perdido, edición no visible, duplicado |
| Pólizas | emitir caso sintético, saldo, prima neta/total, asesor, vehículo, adjuntos | QA insurer prefijada, totales errados, no persistencia |
| Renovaciones | renovar firme, fecha/vigencia, numeración previa, recibos/cartera, Kanban | gestión vs emisión, año no recalculado, sucesora ausente |
| Vehículos / Endosos | sustitución emitida y solicitud, historial, riesgo, aseguradora | doble vehículo, fecha endoso incorrecta, solicitud tratada como emitido |
| Recibos / Cobros | pago directo sin factura y con factura, error Drive, pago 3, intereses, retenciones | doble submit, pendiente falso, saldo cartera erróneo, archivo no guardado pero éxito falso |
| Aseguradoras | revelar/copiar contraseña, cuentas, edición, portal, Asesor restringido | secretos filtrados, edición duplicada, UI sin backend auth |
| Ops / Leads | crear desde cliente, oportunidad, inspección, comentario, adjunto, reasignación | dos registros, equipo sin permisos, actividad perdida |
| Cronograma | vencimientos y tareas de negocio, pendientes reales | proyección a partir de cobros legacy |
| Historial / Reportes / Calidad | filtros/país, datos, temporalidad, trazabilidad, accesos | KPIs por moneda incorrectos, fuentes stale, 404 |
| Documentos / Drive | upload real, download, borrar propio, proveedor sin consentir | OAuth origin, archivo no guardado, referencias huérfanas |
| Make / canales | WA/chat/form/correo fuente única, dedup, notificaciones | webhook sin auth, spam, leads ficticios, no-op |
| UI/pantallas | 390, 1024, desktop, navegaciones profundas y back | overlay tapa acciones, scroll oculto, timeout no esencial |

## Regla de priorización para el equipo el lunes 23/11/2026

- `OPERABLE_LIVE_VERIFIED`: sesión y flujo real PASSED por rol/país/caso con reload y sin incidencias; se habilita.
- `OPERABLE_WITH_DOCUMENTED_LIMITATION`: solo si hay alternativa manual contractual/segura verificada y Dirección acepta la limitación. **No tratar un pago no verificable como aplicado**.
- `HOLD_CRITICAL`: emisión, sustitución, conciliación o datos ambiguos sin prueba; no permitir escritura incorrecta ni prometer éxito. Proporcionar procedimiento de contingencia auditable, no edición directa de Firestore.
- Cierre de domingo: informar cantidad de findings reabiertos por regresión, resultados ejecutados reales, nuevos writes por fuente, preview/live digest, guard, fallas y restricción exacta. No prometer fecha garantizada de PASS si faltan permisos, datos o identidad de escritura.

## Acciones humanas mínimas que solo Dirección puede desbloquear

1. Para auditoría funcional real sobre la sesión existente, habilitar el dominio `app.aysseguros.com` a Chrome conectado o autenticar un perfil de QA del navegador, sin compartir contraseña; también se puede ejecutar Work con Computer Use si solo esa función resuelve acceso autenticado.
2. Cuando exista un **nuevo** run con delta elegible y espera protegida, aprobar SOLO ese run desde el enlace real de `gravicentra-live-data-writes` y verificar su before/after; nunca volver a aprobar/reaplicar los runs históricos 44592619323/44593852150.
3. Aportar únicamente las pólizas emitidas/endosos y datos inequívocamente no disponibles en Drive o fuente rectora; los documentos ya recuperados se reutilizan. Un conflicto de centavos se aísla por edición.
4. La autorización privada OAuth Drive necesita aceptación en Google por el propietario, luego upload/download real; no simular aceptación ni enviar credenciales por chat.

## Condiciones para decir COMPLETO el domingo

- P0 funcionales en LIVE cero, todas las rutas críticas por rol demostradas y reabiertas por reload.
- Sin diferencias CP ↔ transport ↔ receipt ↔ served build, sin backend source drift y con guard posterior PASS; ninguna corrección de governance rompe pruebas históricas.
- Deltas deterministas procesados con recibos y conflictos individualizados, no simplemente preflight.
- Drive y Make comprobados por flujo real donde formen parte del contrato mañana; o feature-HOLD seguro y explicitado como pendiente, sin declarar plataforma 100%.
- I6.6 solo formal PASS si evidencia completa; los minigates I6.7–I6.9 continúan según plan, no se cerrarán por optimismo.

## Referencias principales

- `I6_6_DIRECT_PAYMENT_OPTIONAL_DOCUMENT_LIVE_READBACK_20261120.json` — 224 archivos, mismo artifact, post-LIVE sintético, pendientes Drive/factura real.
- `I6_6_FINANCIAL_OPS_LEADS_CONTINUITY_READBACK_20261119.json` — 9 incidentes Carlos, datos aplicados y source batches.
- `I6_6_INVENTARIO_INTEGRAL_295_20261122.md` — ID literal, estado y prueba por hallazgo.
- `I6_6_NEXT_LARGE_DELTA_SOURCE_ONLY_INTAKE_20261120.json` — huellas 12 fuentes y lote Cendoso 3,706 claves.
- `CONTROL_PLANE.json` — única autoridad mutable; `I6_FINDINGS_LEDGER_20260924.json` — inventario original sin sustituir.
