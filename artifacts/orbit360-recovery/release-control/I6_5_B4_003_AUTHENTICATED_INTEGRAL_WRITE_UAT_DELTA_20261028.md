# Gravicentra Insurance — B4-003 · Delta UAT autenticada con escrituras, 28-oct-2026

**Naturaleza:** evidencia aditiva dentro del **mismo** gate `I6.5/B4-003`, no plan nuevo, no cambio de autoridad ni declaración de aceptación. **Veredicto global: HOLD / UAT INCOMPLETA. LIVE NO EJECUTADO.**

## Identidad de la candidata y alcance

- Preview autenticada: `https://ays-orbit-360-lab--gi-i65-b4-40727347719-zp30idpv.web.app`.
- Marcador leído en navegador en `/__recovery__/build.json`: `sourceSha=7a09bd51e1257f4d8e4de0e59631f3646506ca81`; `buildId=gi-i65-b4-7a09bd51e125-57f234755dc1`; `gate=I6.5-B4-003`. Este es el identificador **servido**, no el HEAD del árbol local ni un hash de paquete comprobado.
- Único UID autenticado: **Carlos Castro**. Se recorrieron roles asignados `Operativo` y `Asesor` por selector de la misma cuenta; **no** equivale a UAT entre UIDs independientes. Países `Todos` y `CO` revisados.
- Código local en `recovery/fase-a-clean-20260831`, HEAD `c85bf90179ae9bbc97021ff4580dcf0291c5de8d`, con cambios **sin commit, sin push y sin despliegue** en bootstrap protegido, autor de creación y pruebas. La Preview no incorpora necesariamente esos cambios.
- No se alteraron clientes, pólizas, cobros, pagos, conciliaciones, renovaciones ni datos empresariales. Solo escrituras sobre negocio sintético autorizado y un intento fallido en aseguradora sintética; ninguna transmisión externa confirmada.

## Recorrido de superficies de Fase A

| Superficie | Evidencia observada | Estado de aceptación funcional |
|---|---|---|
| Inicio | Resumen por rol y moneda; 8 clientes/1425 pólizas para Operativo/Todos, pagos GTQ confirmados 5; cartera vencida 0. Hay obligación COP vencida visible en C360, pendiente reconciliar por mismo ID. | `PARTIAL`, KPIs vs detalle no reconciliados |
| Cronograma | Mes, navegación y formulario abren. Intento de alta de tarea sintética B4-003 en 28-oct: se cerró el formulario pero la tarea no apareció ni tras recargar. | `FAIL` creación/readback en Preview; reparación local pendiente de desplegar |
| Leads | Pipeline 5→6; nuevo caso sintético de ID fijo, asignado a Carlos, pasó `Nuevo→Contactado→Cotizando` con bitácora y recarga. | `PASS ACOTADO` creación/transición; no T01–T09 integral |
| Ops | 3→4 negocios en Cotizaciones; el mismo QA Meta surgió tras transición, su comentario se lee desde Ops. Formulario de Gestión Admin exige cliente y no permitió guardar sin él; se canceló. | `PASS ACOTADO` espejo; `NOT TESTED` gestión administrativa con cliente y adjuntos |
| Fichas de Leads/Ops | Negocio sintético y caso QA anterior se abren. Comentario nuevo registra **Carlos Castro**; la bitácora inicial recién creada muestra `Usuario del equipo`. | `PARTIAL`, defecto de autor inicial reproducido |
| Clientes 360 | Lista 8 en rol operativo y ficha con Pólizas, Cobros, Recibos/Pagos, Renovaciones, Documentos e Historial; fuente COP vencida visible; botón de pago, conciliación e interacción presentes. | `PARTIAL`, sin escrituras sobre cliente real |
| Pólizas | Lista 1425 (230 activas); detalle/desglose y alta con cálculo de recibos/moneda, guardado no ejecutado. | `PARTIAL`, emisión y readback no certificados |
| Cobros y cartera | Operativo/Todos: 5 pagos GTQ confirmados, cartera mostrada 0; Operativo/CO: 0 registros. C360 muestra un recibo COP vencido por 1,040,901.51 con fecha límite 05-mar-2026, en un expediente marcado país GT. | `BLOCKED` conciliación por ID y autoridad de país/moneda; sin pago QA aislado |
| Renovaciones | Kanban con buckets, flujo de propuesta/pedir renovar abre gestión; C360 muestra acciones; no se renovó póliza real. | `PARTIAL`, sin write/readback de renovación |
| Aseguradoras | Ficha sintética aislada: cambio de Observaciones→guardar con motivo devolvió `functions/permission-denied`; cancelado, original intacto. | `FAIL` escritura sintética para Carlos Operativo, revisar entitlement UI/backend |
| Siniestros | Listado 0 y formulario de nuevo reclamo disponible; no se escribió. | `PARTIAL`, no se creó reclamo |
| Historial y actividades | Alerta autenticada `No fue posible consultar el historial autorizado`, sin éxito de lectura. | `FAIL` lectura |
| Cotizador/Comparativo | Pantallas, formularios y flujo de propuestas inspeccionados; sin cotización ni entrega efectiva. | `PARTIAL` |
| Calidad de datos/Importación | Alertas de calendario/premium y fuente de importación visibles, refresh real fuera de esta UAT. | `PARTIAL`, carga real postproducción separada |
| Notificaciones y bandeja | Bandeja de Carlos muestra 21 activas y 4 resueltas; la nueva colaboración sintética dirigida a Ops se guarda, pero no aparece en su propia bandeja **por diseño**: `recipientMatch` excluye `actorUid===uid`. No se ha probado destinatario con otro UID ni proveedor. | `NOT TESTED` entrega/lectura multi-UID; ausencia en bandeja del autor es esperada, no FAIL |

## Escrituras controladas efectuadas

1. En negocio existente `b4003qa_business_collab_38102224750`, Carlos/Operativo agregó **Observación operativa** marcada `QA B4-003 / 28-oct-2026`; contador 3→4 y atribución `Carlos Castro`. Se verificó persistencia tras navegación/recarga y visualización del mismo texto en **Leads y Ops**. **PASS acotado.**
2. En formulario de Leads se seleccionó la opción explícita de prueba sintética **Meta TR-01…TR-07** con ID fijo `b4003qa_meta_tr_v27_20261025_01`, pieza `F02-V27-QA`, origen `Leads`, canal `Facebook`, `GT`, sin teléfono/correo. El backend devolvió caso **`QA Meta · Caso sintético sin datos personales`**; contador 5→6. Transiciones autenticadas `Nuevo→Contactado→Cotizando`, cada transición con actor humano `Carlos Castro`; después apareció en Ops/Cotizaciones. El mismo Carlos en vista `Asesor` vio su lead, sin que ello certifique otra identidad. **PASS acotado.**
3. Desde la ficha Meta, Asesor registró colaboración **Reenviado a Operaciones** con texto de cotización sintética; en Ops se leyó el mensaje con autor `Carlos Castro` tras navegación. **PASS acotado del mensaje**; notificación real a otro UID **no comprobada**.
4. La creación de Gestión Admin sin cliente resultó bloqueada por validación `Selecciona el cliente de la gestión`. Se canceló; ningún registro creado. No seleccionar cliente real para forzar QA.
5. Guardado en aseguradora sintética falló con `functions/permission-denied`; se canceló la edición, sin persistencia. **FAIL** en este rol; requiere discriminación entre prohibición legítima y UI engañosa.
6. En Cronograma/Carlos Operativo se ingresó `2026-10-28 QA B4-003 tarea sintética calendario, sin acción externa`. Tras «Guardar» no se observó tarea y se recargó; persistencia no confirmada. El origen local era `S().insert('tareas', id='tk...')` sin esperar confirmación, incompatible con la exigencia de fixture prefijada `b4003qa_`/`__syntheticQa` del callable Preview. Se preparó cambio local a `insertDurable`/`updateDurable`, validación sintética Preview y feedback; **no desplegado**.
7. En Cliente 360 la fila con cartera vencida COP muestra país GT; al abrir su pestaña de Recibos y pagos se observó vencida una obligación COP 1,040,901.51, `fechaLimite=2026-03-05`, con `vence` no informado. Eso comprueba una discrepancia de país/moneda de datos históricos, pero no identifica todavía la causa de su ausencia en Cobros global. No se tocaron importes, fechas, país ni pagos.

## Hallazgos y consecuencia para LIVE

- **P1 / exactitud financiera:** obligación vencida COP que consta en C360 no aparece en el universo de Cobros/aging bajo CO en este rol; su cliente está clasificado GT. No dar por resuelta la divergencia sin cotejo por IDs, país, fuente, saldo, pago y estado; tampoco corregir datos históricos por inferencia. Distinguir bloqueo de calidad de datos pre-refresh de un defecto del motor.
- **P1/P2 / Historial:** error terminal de lectura `actividades` autenticado. El 0 no significa que no haya registros.
- **P2 / autor:** bitácora inicial nueva muestra `Usuario del equipo` mientras las transiciones y la colaboración muestran `Carlos Castro`. Causa local encontrada: el cliente emitía `user: Orbit.session.rol()` para creación, y el backend permitía la bitácora de cliente. Se preparó corrección cliente + canonicalización del actor autenticado servidor y prueba focal; **sin desplegar**, por tanto no se considera reparado en Preview.
- **P1/P2 / Cronograma:** alta de tarea no persistió en Preview y la interfaz no informó un error duradero. Causa técnica local: ruta sin espera y sin ID/marca sintética autorizada. Fix local preparado con readback server-owned; no se declara PASS hasta escritura autenticada y recarga del mismo artifact.
- **P1 / completitud de UAT:** faltan entrega de notificaciones con dos UIDs, upload/preview/reload de PDF e imagen en fixture, CRUD y readback Cliente/Pólizas/Cobros/Renovaciones, Ops Gestión Admin vinculada, validación de importes por fuente, matriz móvil y rehash exacto del artifact.
- **Identidad de release:** la Preview comprobada es `7a09bd51…`, distinta de HEAD local `c85bf901…` y de los cambios sin commit. No promover por semejanza visual; construir y validar una única candidata exacta con funciones LIVE necesarias.
- **Riesgo de seguridad conocido:** la autorización empresarial de diferir corrección amplia de reglas Firestore no convierte las pruebas de alcance/autenticación multi-UID en `PASS`. Documentar excepción y exposición; no ampliar escrituras ni acceso.

## Pruebas locales, sin confundir con E2E

- `node --test tools/gravicentra-b4-003-*.test.cjs`: 32 aprobadas, 5 no ejecutadas correctamente por dependencias no instaladas y restricciones de subprocesos (`EPERM`/`MODULE_NOT_FOUND`). Resultado del comando **FAIL**, no 37/37 PASS.
- Reejecución focal `business-creation-actor`, `ops-leads-human-actor`, `meta-tr-v27-preview-contract`, `protected-hydration`: **4/4 PASS**, fuente local/VM; **no** prueba autenticada de deploy.
- Reejecución directa `node tools/gravicentra-b4-003-cronograma-durable-task.test.cjs`: **3/3 PASS** (fixture Preview, comportamiento LIVE y fallo de guardado); pruebas VM, no verificación de Hosting.

## Próxima acción del mismo B4-003, sin crear un plan paralelo

1. Resolver P1 de lectura Historial y reconciliar C360↔Cobros por IDs; distinguir falla real de permiso contractual para aseguradoras sintéticas.
2. Construir candidato exacto y reejecutar las pruebas de escritura de negocio QA y de identidad multi-UID, incluyendo adjuntos y notificaciones; asegurar no correspondencia con datos reales.
3. Completar T01–T18 del plan integral existente, clasificar los `NOT TESTED`/`FAIL` con evidencias; solo entonces T19: promover **mismos bytes**, comprobar roles, módulos, writes controlados, relaciones y rollback en LIVE.
4. Mantener el refresh de datos y Finanzas/Comisiones como trabajo post-LIVE conforme a decisión de Paula, sin afirmar que están operativos por el despliegue.

**No se modifica ningún gate congelado; este documento solo registra el delta factual de UAT.**
