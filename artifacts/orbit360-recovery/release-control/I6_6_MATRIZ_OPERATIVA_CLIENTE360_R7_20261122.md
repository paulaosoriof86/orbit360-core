# Cliente 360 e I6.6 · corte operativo del 22 de noviembre de 2026

La release de producción de este corte incorpora el historial de la oportunidad vinculada. Se comprobó el recorrido con una ficha de Guatemala en Chrome. Los renglones siguientes distinguen los recorridos observados de las relaciones que todavía requieren una operación completa. El estado formal y los 295 hallazgos originales se conservan en el Control Plane y en el inventario congelado.

| Operación de origen | Registro canónico o identidad por verificar | Proyección en Cliente 360 y destino | Evidencia y alcance |
|---|---|---|---|
| Editar datos, contactos, asesor y cartera | Cliente por ID, asesor y pólizas relacionados | Ficha, cartera y asignación del equipo | Existe prueba sintética anterior de edición y recarga. Contacto, reasignación y cambio de cartera entre roles quedan abiertos. |
| Notas y adjuntos de colaboración | Negocio y comentarios de ese negocio. El documento necesita una referencia del proveedor | Historial y detalle de Leads u Ops | Se abrió la observación existente. Falta escribir una nota con adjunto, descargarlo y verificar su acceso con otro rol. |
| Gestión desde ficha, Ops o Portal | Gestión del expediente y actividad vinculada por ID de gestión y cliente | Gestiones, Historial y cola Ops | Dos intentos reales con Operativo. El servidor devolvió cero gestiones. El tipo predeterminado intentaba escribir un catálogo administrativo. La corrección tiene prueba en fuente. El recorrido de Portal sigue abierto. |
| Crear, resolver y dar seguimiento a una tarea | Tarea, dueño, país y registro vinculado | Inicio, expediente y colas | Existe lectura de tareas y alcance en el servidor. Faltan cambio de estado, resolución y recarga en ambos módulos para la misma tarea. |
| Oportunidad o solicitud desde ficha y Leads | Negocio ligado al ID exacto del cliente | Resumen, Historial y botón Abrir oportunidad | Se encontraron un negocio y tres eventos de bitácora. En escritorio y móvil se abrió el registro existente. En LIVE Operativo los tres eventos persistieron al recargar. Falta el alta completa de una nueva solicitud controlada. |
| Inspección en Ops | El mismo negocio en etapa de inspección | Ficha, Leads y cola de inspecciones | Se observó la inspección denegada y devuelta al asesor, con actor y fecha. La nueva decisión comercial y la creación de otra inspección están pendientes. |
| Emitir, modificar y renovar póliza | Póliza emitida, edición anterior, sucesora, riesgo, recibos y cartera | Pólizas del cliente, actividad y Renovaciones | Una emisión y cuatro sucesoras documentales verificadas en el servidor. En una sucesora también se abrió su ficha real desde Cliente 360. Falta certificar Renovar en firme con el mismo cierre en Kanban, y la emisión pendiente de Sergio López. |
| Sustituir vehículo | Póliza, riesgo anterior, certificado nuevo, endoso y vigencia | Vehículos, póliza y gestión del endoso | El original de El Roble acredita la sustitución del certificado 1 por el 2 desde el 9 de abril. El servidor registra dos riesgos, el Mazda del certificado 2 figura histórico y hay una gestión APLICADO registrada el 20 de noviembre, con fecha efectiva del 16 de noviembre. Tiene una referencia de aseguradora y una referencia documental; ninguna identifica el endoso 199154. La edición de Firestore inicia el 18 de febrero y la original el 16. Queda abierta la atribución de la gestión posterior a su documento; no se sobrescribió el riesgo activo. |
| Requerimientos y cartera | Recibo esperado, edición de póliza, número de requerimiento y cartera | Recibos y pagos, póliza y Cobros | 48 obligaciones distintas creadas, 46 quedan pendientes. La UI de una póliza mostró once de once después de corregir sus etiquetas y recargar. Dos pagos de otra póliza se muestran como inferidos. |
| Aplicar pago, factura y conciliación | Recibo, cartera, cobro, comprobante, auditoría e idempotencia | Recibos y pagos, Cobros y Conciliaciones | La prueba sintética histórica del pago tiene recibo. Este ciclo registró cero pagos directos y cero conciliaciones bancarias. Falta el requestId del incidente original de Edson y la factura recuperable del pago único. |
| Cancelaciones, siniestros y reclamos | Expediente y póliza afectados; lector y colección para cada tipo | Pestaña de siniestros, Cancelaciones o Siniestros | Existe incidencia de disponibilidad para reclamos. Falta atribuirla a respuesta y rol concretos, y demostrar la transición en servidor y su reflejo en ficha. |
| Importar, cargar y asociar documentos | Archivo del proveedor, referencia persistida, propietario y registro relacionado | Documentos, notas, gestiones, Ops, inspecciones, pólizas y pagos | Se recuperaron originales desde Drive para el cruce financiero. El botón de configuración en LIVE Operativo informó que la configuración segura estaba indisponible. En Preview Dirección, Cargar documento tampoco pudo verificar el repositorio. Pendiente la subida y reapertura en los siete puntos. |
| WhatsApp, formulario, correo y notificaciones | Evento de origen, clave de deduplicación, negocio o gestión, responsable y notificación tras commit | Leads, Ops, bandeja del responsable y ficha | Los escenarios 10196136 y 10195867 seguían inactivos en la inspección. Falta el escritor autenticado y una entrada controlada con recuperación tras recarga. Mensajes comerciales enviados durante estas pruebas: cero. |

## Roles, países y pantallas

| Contexto probado | Controles y resultado | Alcance abierto |
|---|---|---|
| Dirección, escritorio de 1536 px, Preview | Ficha → Historial → Abrir oportunidad → inspección → Cerrar → recarga. Persistieron tres eventos. | Permisos y escrituras de los otros módulos. |
| Dirección, móvil de 390 px, Preview | Se midieron 390 px tras autenticación. Se repitieron los botones y persistieron los tres eventos. | Pruebas móviles de los demás procesos. |
| Operativo, Guatemala, LIVE | Abrir oportunidad y recargar. Recibos y pagos mostró los once requerimientos de la póliza. Dos intentos de Guardar gestión devolvieron error. | Escritura de gestión tras corrección y restante alcance de Carlos. |
| Cuenta de Dirección en vista Asesor GT y CO, Preview | GT mostró los tres eventos asignados. En CO desaparecieron los eventos; la cabecera del expediente GT siguió visible. Se corrigió el detalle en fuente. | Backend con rol efectivo, negación de campos restringidos y cartera ajena. |
| AdminTenant y SuperAdmin | El corte anterior contiene recorridos focales de cuatro roles y dos pantallas. | Matriz completa de acciones, sus transacciones y recargas por país. |

La medición histórica del módulo Cobros registró 1,647 s hasta el primer contenido y 13,791 s hasta la disponibilidad financiera. Pólizas registró 5,501 s. En este corte no se certificó una mejora de esos tiempos.

## Evidencia del corte

- [Recibo firmado de producción y referencia de rollback](I6_6_FRONTEND_E00002_RECEIPT.json)
- [Recorrido LIVE de la release aceptada](I6_6_FRONTEND_E00002_LIVE_UI.json)
- [Historial de la primera compensación](I6_6_FRONTEND_E00001_JOURNAL.json)
- [Corte R7, auditorías comerciales y contadores](I6_6_CURRENT_EXECUTION_PROGRESS_20261122_R7.json)
- [Relectura independiente de las dos renovaciones adicionales](https://github.com/paulaosoriof86/orbit360-core/actions/runs/45089542945/job/137415734790)
- [Relectura de las 302 filas después de los cinco expedientes](https://github.com/paulaosoriof86/orbit360-core/actions/runs/45084256011/job/137412457208)
- [Lectores opcionales y mediciones anteriores](I6_6_OPTIONAL_COLLECTIONS_AND_PERFORMANCE_CAUSAL_EVIDENCE_20261122.json)

El segundo cambio de interfaz se encuentra en [Preview de Gestiones y país](https://ays-orbit-360-lab--gi-i66-rc-45090246304-u59g7x93.web.app). El [paquete inmutable](https://github.com/paulaosoriof86/orbit360-core/actions/runs/45090246304) tiene ID 14780867077 y digest `sha256:661a2aa8e356d55350e1304375444312210ddf96ae36dbd74e002f7a922ded38`. Su publicación en LIVE requiere la escritura UI, la recarga y la comprobación de país de esta candidata.

### Actualización del Preview de Gestiones con Carlos

En el build `gi-i66-64e1540c184d-57f234755dc1` Chrome mostró a Carlos Castro con el rol Operativo. Desde el buscador, en Guatemala, se abrió la ficha de Corado. Al seleccionar Colombia desapareció la ficha y apareció «El expediente está fuera del país seleccionado». Al volver a Guatemala reapareció el expediente correcto. El hallazgo `I66-C360-COUNTRY-HEADER-07` queda verificado para este recorrido de Preview. La release de producción sigue pendiente para ese cambio.

Desde la ficha se pulsó **Gestión**. El formulario mostró Gestión de póliza, Gestiones Admin y estado Pendiente. Se introdujeron la próxima acción y el contexto de la inspección devuelta al asesor y se pulsó **Crear gestión en Ops**. Respondió «No fue posible crear la gestión. No se registró un falso éxito». **Cancelar** cerró el formulario. La [lectura del servidor posterior](https://github.com/paulaosoriof86/orbit360-core/actions/runs/45090672854/job/137423910629) devolvió cero gestiones, cero actividades separadas, una oportunidad y tres eventos de bitácora. La aplicación usa un ID operativo para el formulario, mientras que el contrato vigente de Preview exige un ID sintético y rechaza las relaciones con clientes. La interfaz no expuso un requestId atribuible a este intento. La prueba positiva de `I66-OPS-MGMT-SAVE-02` continúa abierta.

Dos recargas consecutivas devolvieron «Tu sesión sigue activa, pero no fue posible cargar la plataforma». En ambas la consola registró `phase=membership code=MEMBERSHIP_FAILED detail=NONE`. El hallazgo derivado `I66-AUTH-RESTORE-MEMBERSHIP-10` conserva la identidad autenticada y requiere comprobar la respuesta de membresía. La corrección de fuente ofrece reintentar con la sesión vigente mediante el mismo lector autorizado y conserva la causa de Firebase cuando está disponible. Las pruebas aisladas cubren el doble clic, la denegación, la recuperación y la sesión vencida. Quedan pendientes los botones en el nuevo artefacto y la recarga en LIVE.

### Recarga de la sesión en el tercer Preview

En la pestaña autenticada de Carlos Castro (Operativo), dos recargas devolvieron Inicio sin solicitar credenciales. Después se escribió «Corado» en el buscador, se pulsó el resultado de cliente y se abrió su ficha en Guatemala. Se mostraron el historial y tres controles «Abrir oportunidad». Al seleccionar Colombia, la cabecera de Corado y los controles desaparecieron y apareció «El expediente está fuera del país seleccionado». Build `gi-i66-0e7dcdb04cf6-57f234755dc1`. [Artefacto y lectura de Hosting](https://github.com/paulaosoriof86/orbit360-core/actions/runs/45093054745)

El fallo anterior de membresía no se presentó en estas dos recargas. Por tanto, el botón de recuperación «Reintentar con esta sesión» todavía carece de prueba humana en estado de fallo con este build. El botón «Reintentar consulta» sí se pulsó en Inicio. El tablero siguió mostrando «Avance por asesor no disponible» y cuatro de cinco fuentes confirmadas. El módulo agrupa la producción y la lista de asesores en esa tarjeta; la quinta fuente es la consulta de asesores y metas. El estado de la interfaz no permite atribuirle un código HTTP específico. Hallazgo derivado `I66-INICIO-ADVISOR-READ-11` abierto; quedan pendientes la respuesta de la solicitud y la comparación con el mismo rol en producción.

### Adjunto de Ops y comprobación de los lectores opcionales

| Origen, rol y país | Control y observación | Destino, solicitud y verificación |
|---|---|---|
| Oportunidad de Corado en Preview de recuperación, Operativo GT, escritorio | «Abrir ficha de prueba aislada» abrió un negocio de prueba separado. «Adjuntar» seleccionó un archivo de texto de 147 bytes. El panel dejó de estar visible antes del clic en «Registrar ahora». | Cero solicitudes de carga o guardado. Cero documentos enlazados. Se retiró el negocio sintético sin cliente ni póliza y una segunda lectura confirmó su ausencia. Sigue abierto `I66-OPS-DOC-FORM-12`. [Antes](https://github.com/paulaosoriof86/orbit360-core/actions/runs/45097860101/job/137441598446) · [Retirada](https://github.com/paulaosoriof86/orbit360-core/actions/runs/45098835994/job/137444696361) · [Después](https://github.com/paulaosoriof86/orbit360-core/actions/runs/45098130192/job/137445272383) |
| Lectura del servicio en el tenant y con filtros GT y CO | Se consultaron las tres colecciones. | Cero documentos observados en estadosCuentaAseguradora, recibosAseguradora y reclamos. Esta lectura de servicio deja pendiente el resultado por identidad y país. [Resultado](https://github.com/paulaosoriof86/orbit360-core/actions/runs/45098130192/job/137445272383) |
