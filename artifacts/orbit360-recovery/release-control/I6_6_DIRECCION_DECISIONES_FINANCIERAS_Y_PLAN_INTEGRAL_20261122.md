# Gravicentra Insurance — Decisiones vinculantes de Dirección y continuidad I6.6
**Fecha local:** domingo 22 de noviembre de 2026  
**Clase:** ADDENDUM_OPERATIVO_DE_DIRECCION / APPEND_ONLY / NO_GATE_TRANSITION  
**Ámbito:** I6.6 actual. Complementa, NO sustituye, el plan congelado \`I6_6_PLAN_CHOQUE_FUNCIONAL_FINANCIERO_20261122.md\`, sus 14 objetivos, el inventario integral de 295 hallazgos, los addenda V3–V7 ni la evidencia anterior.  
**Autoridad mutable de estado:** \`artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json\`. Este documento es autorización/decisión de negocio y alcance de QA, nunca inventario de PASS actual ni orden de despliegue por sí mismo.  
**Regla:** El registro de decisiones evita reconsultar a Dirección lo ya resuelto. No altera el source productivo, la release, los datos ni el estado del gate. Cualquier ejecución requiere pruebas y receipts propios.  
**Fuente de decisiones:** instrucciones explícitas de Dirección en la conversación del 22/11/2026, respecto a las tres pólizas, inferencias, precedencia documental y uso del rol Asesor de Dirección.

## D01 — 91-4143471 / Inferencias de pagos anteriores, tolerancia puntual de Q0.05

1. En original El Roble (póliza nueva 21/09/2026–21/09/2027; endoso 368727) existen 12 requerimientos, comenzando \`5693795\` y \`5693796\`. La fuente actual de pendientes contiene requerimientos \`5693797\`–\`5693806\`, es decir cuotas 3–12, diez pendientes.
2. Dirección aclara que **las cuotas 1 y 2 deben inferirse como pagadas/aplicadas** cuando el estado de cuenta actual y completo de la aseguradora demuestra que solo están pendientes desde la cuota 3, conforme a la inferencia secuencial V7 y en ausencia de reversión o evidencia posterior contradictoria. No volver a pedir esta decisión.
3. La procedencia debe ser \`inferredPaid=true\`, prueba de estado de cuenta, fecha as-of, cuota ancla 3, regla de inferencia, periodo/fecha efectiva marcada INFERIDA y actor/proceso. No fabricar recibo bancario, fecha histórica exacta, factura, método, conciliación directa ni un segundo pago si ya está materializado. Comprobar estado actual de Firestore antes de cualquier write.
4. Q4,012.30 carátula versus Q4,012.25 cronograma (Q0.05): diferencia **NO BLOQUEANTE** para este expediente, lote o publicación. Conservar ambos importes como hechos distintos con procedencia y registrar la variación; usar cada requerimiento de la aseguradora para su obligación y no inventar un ajuste bancario o cobro. No convertir este caso en tolerancia automática universal para otros importes, monedas o conflictos materialmente distintos.
5. Trabajo técnico: identificar edición y recibos únicos canónicos en Firestore, reutilizar registros existentes o crear la edición documentada con protección contra duplicados, producir diff con cuotas 1–2 inferidas y 3–12 pendientes, ejecutar CAS elegible, server readback, reload Cliente 360/Pólizas/Recibos/Cobros/Cronograma e historial. El bloqueo de ID, si subsiste, es local de esa edición y nunca general del lote.

## D02 — 91-8357452 / Renovación emitida suficientemente documentada

1. PDF emitido El Roble: renovación 27/10/2026–27/10/2027, endoso \`359402\`, requerimiento \`5676444\`, cuota única Q3,063.20, vencimiento 27/11/2026.
2. No hay ninguna **decisión empresarial** adicional pendiente sobre vigencia, importe, cuota o documento. El preflight anterior localizó solo edición Firestore 2025–2026; esto señala crosswalk/renovación sucesora faltante, no insuficiencia de decisión.
3. Ejecutar búsqueda por tenant/país + aseguradora + póliza + edición/vigencia/endoso y clientId canónico. Si la edición ya existe, NO duplicar: conectar recibo y actualizar diferencias deterministas. Si no existe, emitir/registrar sucesora documentada con flujo y writer aprobados, preservando póliza anterior, histórico, clientId, riesgo, asesor y recibo/cartera; no crear cobro por obligación. Readback/reload/flujo UI, IDs y auditoría obligatorios.
4. Requerir pregunta a Dirección solo si aparecen dos titulares canónicos incompatibles sin evidencia primaria discriminante. Work debe realizar los cotejos que puede resolver.

## D03 — 91-8322914 / Precedencia por semántica y fecha de fuente

1. PDF original de renovación El Roble: 05/10/2026–05/10/2027, endoso \`353920\`, requerimiento emitido \`5654713\`, total original Q5,502.36.
2. Estado de cuenta posterior de la aseguradora: once requerimientos pendientes \`5773297\`–\`5773307\` de Q512.28 cada uno, total pendiente Q5,635.08, diferencia Q132.72 frente al documento original.
3. Dirección dispone: **póliza/endoso emitido prevalece para hechos originales de emisión/contrato; estado de cuenta posterior prevalece para requerimientos y saldos pendientes al corte del estado**. No comparar prima original y saldo posterior como dos versiones del mismo campo sin procedencia; no inferir pagado ni generar cobros por sola obligación. Registrar reconciliación de versiones, fuente, as-of, fechas de vencimiento, requerimientos, posible modificación de plan y valor vigente de los 11 pendientes sin sobrescribir la prima original.
4. Ajustar recibos/cartera únicamente sobre la edición única demostrada y requerimientos individuales cotejados, con CAS, dedupe, before/after y readback. Si no se puede atribuir el plan posterior a una edición única, HOLD solo las filas ambiguas; no retener registros independientes ni pedir sin necesidad una nueva decisión empresarial. No inventar endoso posterior o número de póliza.

## D04 — Renovaciones comerciales: estado y prueba obligatoria

- Los ensayos sintéticos LIVE previos de sucesora + recibo + cartera fueron PASS focal, con cleanup. **NO equivalen a renovación comercial aplicada** para D01–D03 ni al resto del lote; no afirmar que están hechas hasta readback exacto del expediente.
- Para cada renovación recibida: existencia/reuso → original aseguradora → número anterior precargado → vigencia recalculada conforme contrato → póliza hija → riesgo/asesor → recibos/cartera → Kanban/Historial/Cliente360 → persistencia/reload. En casos reales con writer autorizado, commit y recibo; sin writer verificado, solo HOLD local.
- Corregir la UI que abre ficha administrativa en vez de ficha completa de Póliza al pulsar Renovar en firme, si el defecto se reproduce; no cerrar por callable aislado.

## D05 — Asesor: usar cuenta real de Dirección con rol Asesor disponible

- Autorización explícita de Dirección para usar su propia sesión, **solo** con su rol Asesor ya asignado y permitido, mediante Chrome/Work; no crear identidad falsa ni modificar grants para pasar tests.
- Verificar \`uid\`, membresía, tenant, país, rol efectivamente activo y alcance efectivo en backend tras elegir Asesor y después de reload. Probar UI, creación/edición de sus oportunidades, recibos de pagos reportados y visibilidad de su cartera autorizada, y denegación de directorio completo de Aseguradoras, comisiones de empresa y otras carteras.
- Si \`Ver como Asesor\` únicamente cambia presentación mientras la autorización backend sigue siendo Dirección, este resultado es UI_ASSESOR_PASS_PARTIAL, **NO** prueba negativa de autorización de un Asesor sin privilegios. Completar con una identidad existente real de menor privilegio o fixture autorizado aislado, preservando todas las credenciales y permisos.
- Matriz GT y CO según scopes realmente asignados. No afirmar GT/CO PASS sin prueba de ambos ámbitos. Priorizar matriz de 5/5 roles, manteniendo los 112 checks de cuatro roles previamente acreditados.

## D06 — Ejecución financiera ágil y localización del HOLD

- Lote fuente de 302 filas \`I6_6_SOURCE_BULK_20261120_MULTI_302.json\` (blob \`ab64e111319e3447733a3af05bf378250698ccdb\`): preflight previo 137 sin cambio, 145 sin edición exacta, 20 sin recibo único, cero nuevas writes.
- D01–D03 constituyen **nuevas decisiones que deben incorporarse al próximo preflight**, NO reducen mágicamente los 165 HOLDS hasta actualizar el crosswalk y ejecutar lectura Firestore fresh. Work debe recalcular eligible y proceder por delta. No repetir 137 coincidencias.
- El Roble 113 ediciones +19 recibos; Universales 25; G&T 4 ediciones+1 recibo; Ficohsa 3 ediciones; otras fuentes Cendoso solo después de dedupe/lineage de sus universos.
- Preservar 110 correcciones anteriores recibos/cartera El Roble y 33 pagos anteriores Cendoso; no reapply.
- Dataset pinned → snapshots y Firestore readback → correspondencias por IDs y documento auténtico → diff deterministic \`SIN_CAMBIO|ACTUALIZAR|AGREGAR|REVISAR_AMBIGÜEDAD|ELIMINAR_DESACTIVAR\` → writer protegido existente y CAS solo deterministas que habilita gate → receipt before/after → readback de módulos → mini-freeze. No aprobación redundante por cada fila determinista; permisos protegidos y escrituras peligrosas siguen fail-closed.
- No confundir pending status con evidencia directa de cobro. V7: pago confirmado y pago conciliado tienen semánticas y fechas distintas; inferencias se etiquetan y se ubican temporalmente en el periodo contractual, no en el mes del descubrimiento. Un pago enriquecido nunca genera un segundo cobro.

## D07 — Cliente 360: timeline único entre dominios

No afirmar cobertura universal de Actividad hasta probar eventId/owner/cliente canónico y persistencia desde: Cliente360, notas/adjuntos, Equipo/asesor, Ops, Leads, oportunidad, inspección Carlos Corado, pólizas nuevas (Sergio López), renovaciones y endosos Ashley/Ashlyn Aguilar, vehículos/riesgos, recibos/cartera/pagos Edson, conciliaciones, cancelaciones, siniestros, documentos/importador, Portal, comunicaciones y notificaciones. Mismo registro canónico en las proyecciones, sin gestión duplicada, joins por nombre ni pérdida de actividad tras reload. Verificar sección de Cliente 360 no disponible para Carlos y fuentes opcionales \`estadosCuentaAseguradora\`, \`recibosAseguradora\`, \`reclamos\` con atribución real de causa.

## D08 — QA funcional UI real: evidencia exigible

Cada flujo crítico exige browser autenticado, **pulsar el botón**, completar formulario, elegir valores, confirmar/guardar, capturar request/respuesta, verificar commit de servidor, readback canónico, reload/reopen, correlación por IDs, auditoría, roles/scopes y ausencia de errores. No computar como UI funcional un \`page.evaluate(()=>callable())\`, navegación o fuente inspeccionada. Playwright clicks reales cuentan cuando existen, pero solo para los pasos efectivamente pulsados. Probar negativos, Cancelar, doble submit, opcionales Drive, errores de red y limpieza de fixtures; repetir en Preview y LIVE cuando el cambio sea product source. No usar datos reales para test sintético no autorizado.

## D09 — Secuencia integral inalterada de 14 objetivos y nuevos hallazgos

A01 disponibilidad/dos orígenes/224 files: conservar PASS sin nueva regresión.  
A02 Control Plane–transporte–recibo–artifact: conservar PASS del puntero actual; completar mejora estructural **para promociones futuras** mediante máquina de estados recuperable, CAS y rollback, prueba de fallos, mismo digest, sin alterar deploy actual.  
A03 sesión Chrome/Carlos, login frío, segunda pestaña \`Restaurando tu sesión\`, reload, PWA, startup.  
A04 roles 5/5, Dirección como Asesor con prueba backend genuina, GT/CO, permisos positivos/negativos, usuario crear/invitar/editar/inactivar cuando autorizado.  
A05 Cliente360 editar, asesor, notas, adjuntos, timeline universal, relaciones, actividad 360.  
A06 Ops/Leads, tareas, oportunidad e inspección Carlos Corado, gestiones sincronizadas, seguimiento y actividad.  
A07 póliza nueva Sergio López, tarifas/primaneta+IVA/emisión/fraccionamiento y condiciones aprobadas, asesor, vehículos, recibos/cartera.  
A08 renovar en firme desde UI, sucesora, anterior, vigencias, Kanban, idempotencia y documentos del lote.  
A09 sustituciones/endosos reales Ashley/Ashlyn, fecha efectiva y ref emisión, riesgo viejo/nuevo.  
A10 Cobros, Edson error original/requestId, pago con/sin factura, Drive opcional no bloquea, confirmación vs conciliación, idempotencia; factura en una operación.  
A11 Drive OAuth, subida/descarga real, documentos/notas/gestiones/inspecciones/pólizas/importador; fallo documental no bloquea pago.  
A12 fuentes y deltas por aseguradora, ediciones documentales D01–D03, 302, Cendoso, inferencias, antes/después.  
A13 Make scenarios \`10196136\` y \`10195867\`, Green API, webhook, email/web form/WhatsApp: writer autenticado, lead único, notificación post-commit, retry sin duplicados.  
A14 QA transversal UI, módulos por rol×país×viewport, Inicio, Equipo, Aseguradoras, Ops, Leads, Pólizas, Renovaciones, Vehículos, Recibos, Cobros, Conciliaciones, Comisiones, Siniestros, Cancelaciones, Cronograma, Historial, Calidad, Reportes, Academia, Portal/PWA. Reducir Cobros financiero 13.79 s (12,402 store.get reportados) y Pólizas ~5.50 s; investigar tres fuentes opcionales y sesión múltiple. 0 404/page/console/network relevantes.

El resultado de cada objetivo debe distinguir \`NO_PROBADO / INTEGRATION_ONLY_PASS / UI_SYNTHETIC_PASS / REAL_BUSINESS_LIVE_PASS / HOLD\`. Los primeros dos objetivos del choque permanecen sujetos al ledger formal hasta nueva ejecución física. El denominador congelado sigue 14; no se crea gate nuevo ni se aumenta porcentaje por estas decisiones.

## D10 — Orden de ataque y condición de salida

- **Carril 1** (independiente): mejorar release futura (single owner de promoción, source + artifact + Preview + LIVE + transport + CP + receipt, prueba de drift interrumpido y rollback); no reconstruir código antiguo ni redeploy de la misma build.
- **Carril 2**: ejecutar pruebas reales UI de Asesor con Dirección, Carlos Operativo, Cliente360→Ops/Leads, edición, notas, documentos y oportunidad; corregir el defecto reproducible, luego Preview→LIVE mismo artifact.
- **Carril 3**: documentos D01–D03, resolver crosswalk de edición/recibos; aplicar inmediatamente **solo** rows deterministic tras preflight fresh; seguir restantes excepciones independientes y Cendoso. Registrar que 0 writes siguen siendo 0 hasta receipt real.
- **Carril 4**: emisión Sergio, renovación comercial, endoso/sustitución Ashley/Ashlyn, pago Edson y factura en una operación, con fotos/lectura original y trazas.
- **Carril 5**: Drive OAuth + Make escritor/WhatsApp/form/correo + notificaciones post commit.
- **Carril 6**: rendimiento, 3 colecciones opcionales, 360 sección, sesión múltiple, 5 roles, regresión de 295 findings y mini-freeze por módulo; I6.7–I6.9 solo tras I6.6 formal PASS.
- En cada vuelta: fuente/pérdida de evidencia, número de tareas atómicas terminadas de denominador original, 14 objetivos PASS, I6 formal, hallazgos cerrados, módulos/comercial realmente escritos, nueva candidata/Preview/LIVE únicamente si hubo source causal, SHA/digest, pruebas UI, pendientes locales y siguiente acción. Nunca presentar un run CI verde sin pasos efectivos como cierre funcional.
- Preguntar a Dirección **solo** por contradicción empresarial material no resuelta después de confrontar documentos auténticos y lectura actual; no por decisiones D01–D05 ya congeladas. Sin pregunta pendiente que deba frenar el resto del lote.
- No alterar la normativa evergreen por cambios de estado normales, no actualizar CP/ledger a PASS por este archivo, ni levantar autorización de escrituras protegidas fuera de las ya vigentes.

## Estado previo a este addendum (NO mutable)

La evidencia de 22/11 antes de esta decisión registraba I6 6/10 (60%), choque 2/14, frontend LIVE \`gi-i66-f1eb5bc6397f-57f234755dc1\` 224 archivos, 302 source rows/137 same/165 held/0 fresh writes; cinco flujos sintéticos firmados sin comercial real; 4/5 roles, una pestaña adicional restaurando sesión, tres fuentes opcionales con errores y Cobros 13.79 s. **Este archivo no prueba nueva escritura, renovación real, publish, role PASS o cierre posterior.** Reconcilia con Control Plane y evidencias después de que Work haya actuado.
