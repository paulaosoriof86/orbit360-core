# Gravicentra Insurance — actualización prevalente del 7 de noviembre de 2026

## Alcance y estado verificable

Esta actualización incorpora las instrucciones más recientes de Paula. Mantiene B4-003/current42 cerrado y todos sus recibos históricos. La corrección causal posterior de Equipo y de la proyección comercial de Cancelaciones no equivale a reapertura indiscriminada ni concede un nuevo PASS de Preview/LIVE. La candidata sigue siendo acumulativa, en la misma rama, proyecto Firebase y Firestore.

El registro JSON enlazado desde CONTROL_PLANE contiene fuentes, hashes, pruebas y estado de ejecución. El texto histórico incluido al final conserva contexto; cualquier referencia allí a mes pendiente de aclarar, regla exclusivamente VIME-18154 o hosting aún no elegido queda sustituida por estas decisiones.

## Decisiones congeladas de conciliación

1. **Período.** Las filas de comisiones pagadas del lote documental Noviembre corresponden a recaudos de OCTUBRE 2026. La fecha de factura y la carpeta no desplazan el período del recaudo. Los apartados expresamente pendientes continúan pendientes. Columna de la carpeta Octubre mantiene su período documental septiembre como referencia histórica; no se copian sus movimientos como nuevos recaudos.
2. **Fechas conocidas.** Se conserva la fecha real comprobada. Vencimiento contractual, recaudo, aplicación de aseguradora, factura, ingreso bancario y ejecución técnica son dimensiones separadas.
3. **Recaudo de octubre sin día real.** Se usa como fecha efectiva estimada el día contractual de pago dentro de octubre, con marca de estimación. Una cuota atrasada mantiene su vencimiento original para calcular mora. No se hace pasar esa estimación por comprobante de la fecha real.
4. **Inferencia hacia atrás.** Las cuotas anteriores continuas que se deduzcan pagadas conservan cada una su fecha contractual original. Descubrirlas en octubre o procesarlas en noviembre no suma artificialmente sus valores al recaudo de octubre ni traslada la antigüedad de cartera. Nueva evidencia enriquece el mismo hecho sin duplicarlo.
5. **Gastos Médicos.** Doce pagos mensuales en todas las aseguradoras que ofrecen el ramo. No se aplica a esos planes el máximo ordinario de diez del fraccionado de otros ramos. La plataforma puede representar Gastos Médicos como producto dentro de Accidentes y Enfermedades: la regla debe resolver ramo, producto y modalidad reales, sin reclasificar accidentes, viajes u otros productos como médicos.
6. **Correcciones respaldadas.** Planillas y estados de cuenta gobiernan los datos probados de forma de pago, cantidad de cuotas, primas, importes y expediente. Se corrige mediante los owners existentes con antes/después, evidencia e identidad estable. No se confunde prima neta con total; no se multiplica una cuota para inventar prima anual; no se eliminan cuotas pagadas para rehacer un calendario.
7. **Excepciones puntuales.** Una póliza no localizada, vendedor ambiguo, moneda contradictoria o secuencia incompleta genera una pregunta inmediata con documento/fila/póliza y el dato faltante. Los demás casos confirmados continúan. No se exige autorización fila por fila para la inferencia de alta confianza ya aprobada.

## Primera conciliación real y continuidad de Finanzas

Se registra un lote durable y visible en Conciliaciones: documentos con huella, filas, vínculos, correcciones, pagos directos e inferidos, excepciones y estado de cada efecto. Se amplían `reconciliationRequests` y `reconciliationEvents` del owner existente; no se crea otro motor ni se sobrescribe el ledger histórico fijado a sus conteos/digests.

Podemos adelantar pagos, recibos y cartera antes del cierre integral de Finanzas cuando el mismo acto durable conserve los importes, monedas, bases, versiones de tarifa, evidencia e identidad determinista de los efectos financieros pendientes. El estado será “conciliación operativa aplicada; efectos financieros pendientes”. La reproducción posterior crea cada comisión/CxC/CxP una sola vez y deja constancia de aplicación. Una factura emitida o planilla de comisión no basta para declarar ingreso bancario.

Esta capacidad aún requiere extensión técnica: el journal actual audita pagos pero no retiene toda la economía necesaria para materializar Finanzas después. La pantalla actual muestra propuestas, no el lote aplicado con todos sus efectos. El lote real no debe declararse conciliado antes de guardar esa información y comprobar recarga. Se aprovecha el trabajo existente y se corrigen únicamente esas conexiones.

## Porcentajes vivos sin alterar históricos

Se lee primero la configuración ya existente en Equipo (`comModo`, `shareCom`, `comValor` y asesor canónico). Un cambio de porcentaje/modelo tiene fecha de vigencia y se aplica hacia adelante. Cada hecho conserva la tarifa y base que le correspondían cuando se devengó. No se recalculan automáticamente liquidaciones cerradas ni eventos anteriores con la tarifa actual; una corrección histórica expresa es otro movimiento trazado.

El porcentaje de la planilla es la autoridad para la comisión concreta de la aseguradora. Su actualización en Aseguradoras conserva aseguradora, país, ramo, producto/plan, moneda y vigencia pertinentes. Una bonificación aislada no se convierte en tarifa general. G&T GTQ y USD siguen siendo facturas y saldos separados por documento y moneda. No se sustituyen configuraciones faltantes por 12% o 50% silenciosos.

## Correcciones y pruebas realizadas

El expediente completo de normalización (20 fuentes, 84 componentes; no 84 pagos) se conserva con acceso privado, enlazado por identidad y SHA-256 en el registro. El repositorio público conserva criterios y referencias; las filas nominativas no se incorporan al source.

**Equipo:** reproducido ACK exitoso con listado aún “sin clasificar”. El cambio mínimo publica la clasificación confirmada en el store compartido y conserva esa proyección hasta que la hidratación canónica coincida. Prueba de 48 comprobaciones, incluidos rechazo, falta de ACK y respuesta atrasada. No se repiten las siete escrituras ya confirmadas el 5 de noviembre. Falta readback de bytes del lector LIVE y transportar el nuevo frontend con su artifact.

**Cancelaciones:** LIVE mostró 462 GT, 28 CO y 490 total, incluyendo un QA como motivo principal. La corrección excluye QA comercial propio/heredado con el helper existente y conserva acceso de auditoría. Cuatro pruebas causales pasan; tres fallaban sobre el source anterior. Reportes recibe el modo auditable para conservar su contador de cuarentena; sus dos pruebas existentes siguen pasando. No se borra ningún registro.

**Renovaciones y Cancelaciones:** 17 pruebas de harness pasan sobre lifecycle, enlaces, propuestas/gestiones, motivos, recuperación y borradores sin envío. En LIVE se comprobó consulta, búsqueda focal y cambios de país, detalle de cancelación y borrador de WhatsApp. El editor de Propuestas de Renovaciones quedó bloqueado por la confirmación de catálogos del tenant. La consola confirma que el callable existe en us-central1: una solicitud inicial respondió 200 y la acción posterior 400 con verificación callable aprobada. El cuerpo del error aún no está observado; no se atribuye a 404, IAM ni al reader de pólizas sin evidencia.

La recuperación de cancelación tiene un riesgo reproducido de persistencia parcial si falla la actividad intermedia. El comparativo Cliente360 tiene guardado sin readback, valores supuestos (prima×1.10, deducible1%, asistencia Premium), etiqueta “mejor” basada solo en precio y texto de adjunto sin generar documento. Son pendientes delimitados; el cotizador/comparador integral sigue después de Finanzas y Marketing.

El test legacy `CLIENT_TYPE_KPI_LEGAL` estaba desactualizado respecto a la exclusión QA aprobada. Se ajustó el test, conservando asserts estrictos y verificación funcional; 125 comprobaciones pasan y dos mutantes dañinos son rechazados. No se modifica Cliente360 para satisfacer una prueba textual antigua.

## Publicación y preservación de datos

Paula aprobó conectar app.aysseguros.com al mismo Firebase Hosting. El dominio ya se añadió y HostDime confirmó el TXT `hosting-site=ays-orbit-360-lab`, TTL14400, con lectura posterior. El A actual sigue 107.161.178.166; el sitio anterior continúa mientras Firebase valida dominio/certificado. No se han cambiado correo, raíz corporativa, nameservers ni datos operativos. El estado del asistente, no una suposición de propagación, gobierna el corte.

Para las mejoras posteriores se publica código/configuración versionada y migraciones aditivas e idempotentes cuando sean necesarias. Los datos LIVE de la empresa no se empaquetan ni se sustituyen por snapshots del desarrollo. Un rollback de software no restaura una base de datos vieja. Se conserva la misma candidata acumulativa y un único index: nuevo source exige nuevo build; Preview y LIVE reciben el mismo artifact/digest.

El builder existente ya añade `orbitBuild=<buildId>` a scripts/estilos, versiona PWA/SW y aplica no-cache. No hace falta un parche manual de index ni del artifact. El workflow del reader se publica inicialmente en modo solo lectura; antes de un deploy exige HEAD y manifest previos exactos, revisión de las dependencias y prueba autenticada posterior.

## Orden de ejecución que continúa

1. Publicar y validar el delta causal de fuente y este freeze, conservando sellos current42.
2. Obtener readback del lector LIVE; corregir su transporte solo con paquete/dependencias exactos. Crear un nuevo artifact acumulativo en el Preview existente, probar Equipo/Cancelaciones/Reportes y promover ese mismo artifact tras la evidencia requerida.
3. Resolver el contrato de catálogos que bloquea Propuestas y la persistencia conjunta de recuperación. Comprobar únicamente los flujos afectados sin descartar sus aprobaciones históricas.
4. Mantener B4-004 como primer gate formal incompleto: Siniestros diferido por Paula, Cronograma retenido con auditoría de mejor versión; después continúan las pruebas transversales y de la versión exacta según el plan rector.
5. Completar fechas estimadas, regla médica configurada por catálogo, journal de efectos pendientes y tarifas con vigencia; normalizar el lote con sus hashes y producir diff de pólizas/cuotas/primas. Las preguntas específicas se plantean al detectarlas.
6. Aplicar casos unívocos por owners canónicos, con deduplicación, antes/después y recarga; proyectar Cliente360, pólizas, clientes, cobros, cartera, comisiones y Conciliaciones. Finanzas se materializa desde los hechos retenidos cuando estén preparados sus owners.
7. Cerrar conexión del dominio al estar listo HTTPS, verificar login/rutas/roles/PWA en el dominio y conservar rollback de tráfico. Mantener el portal Firebase existente durante esa preparación.

No se asignan porcentajes globales de avance sin matriz verificable de criterios y evidencia. Un test local, un deploy o un cuadro visible no son por sí solos PASS completo de módulo.

---

## Plan conservado de la primera congelación de hoy

Se conserva a continuación como historial y detalle complementario. Las decisiones prevalentes anteriores sustituyen expresamente sus referencias superadas; no restauran sus preguntas ya resueltas.

# Gravicentra Insurance — decisiones y plan operativo del 7 de noviembre de 2026

Estado: CONGELADO POR INSTRUCCIÓN EXPRESA DE PAULA. Registro aditivo dentro del plan rector existente; no crea iteraciones, ramas ni otra candidata.
Repositorio: paulaosoriof86/orbit360-core.
Rama: recovery/fase-a-clean-20260831.
Base auditada: 74312cc3621ba155ee288a0afb530a488246f0e6.
Fecha operativa: 2026-11-07, America/Guatemala.

## 1. Resultado del diagnóstico y límite de esta actuación

B4-003 conserva su cierre LATEST_APPROVED_VERSION_LIVE_PASS en current42. El mismo artifact de 218 archivos fue certificado en Preview y LIVE. Source de producto: 857f1222f360a42a06e012810a1c01bce155a26f; build gi-i65-b4-857f1222f360-57f234755dc1; artifact 13549460562; digest del archivo 5af8e1e6e98e861c5c1a2e25324841ac9dfb07fffae0524c1cabc1a6282ad338. Recibo: I6_5_B4_003_CURRENT42_FINAL_LIVE_CLOSEOUT_20261107.json, blob 0879188bf245248fa1092fb2014e35e14e802b44.

Este cierre no acredita que todos los módulos, datos del negocio y Functions estén sincronizados. La observación autenticada de hoy en Equipo LIVE muestra siete usuarios como Sin clasificar, frente al recibo firmado del 5 de noviembre que demostró siete clasificaciones canónicas persistidas y correctas en Preview. Es una discrepancia focal comprobada; no invalida indiscriminadamente todas las aceptaciones anteriores.

Esta actuación audita documentos, código, recibos y la UI de Equipo; congela decisiones y plan mediante un anexo enlazado desde CONTROL_PLANE y recovery state. El master plan y el inventario del cierre se conservan byte por byte; el validador admite únicamente este sucesor documental comprobado, preservando las pruebas históricas. No aplica inferencias, importa movimientos, cambia datos de empresa, despliega producto ni modifica DNS. Las correcciones y conciliaciones propuestas no reciben PASS por haber sido descritas.

## 2. Autoridad y método de continuidad

Se leyeron Addendum Prevalente de frontera, recovery state, Plan Maestro v1.3, capability manifest, Addendum Anti-Descarrilamiento y matriz; se contrastaron con CONTROL_PLANE y el cierre posterior current42. Las instantáneas históricas de iteración 2/R20 no se utilizan como cursor actual.

Se conserva un solo producto, una rama canónica, un index productivo, Firestore operativo y Drive documental. Antes de intervenir cada módulo: recuperar aceptación comprobable, source/blob, owner, dependencias, permisos, persistencia, relaciones y última evidencia; comparar con la candidata actual; describir el delta pendiente y probarlo. No repetir auditorías globales ni aprobaciones completas sin cambio causal.

El primer gate formal incompleto sigue siendo B4-004-SINIESTROS-CRONOGRAMA. La auditoría y preparación documental de los frentes posteriores pueden avanzar en paralelo sin otorgar aceptación ni escribir datos antes del gate aplicable. La incidencia causal de Equipo se corrige dentro de esta continuidad y de la misma candidata acumulativa; no abre una metodología separada.

Los seis P0 congelados de B4-003 conservan sus cuatro cierres y dos aplazamientos aceptados por la propietaria. Se mantiene la excepción temporal de Rules ya aceptada; no se transforma en bloqueo nuevo ni en certificación de seguridad.

## 3. Decisiones de alcance congeladas

| Área | Decisión vigente |
|---|---|
| Cartera, recibos, cobros e inferencias | Prioridad de recuperación operativa, con propagación y verificación en todas las superficies afectadas. |
| Renovaciones | PASS y trabajo aprobados preservados; auditoría focal antes de cualquier cambio. |
| Cancelaciones | PASS y trabajo aprobados preservados con su alcance probado. |
| Equipo | Reparar lectura LIVE y actualización inmediata del listado; Paula debe poder administrarlo desde la UI. Preservar las siete clasificaciones guardadas. |
| Siniestros | OWNER_DEFERRED_NON_BLOCKING_PHASE_A. Su aplazamiento no es PASS ni borra trabajo o hallazgos. |
| Cronograma | Permanece en B4-004; recuperar mejor aceptación y resolver solo delta necesario. No hay instrucción de aplazarlo. |
| Cotización, Comparación y Conocimiento asegurador | OWNER_DEFERRED_AFTER_FINANCE_AND_MARKETING; no bloquean Fase A. Orden: Finanzas, Marketing y después estas capacidades. Preservar owners, evidencia e inventario. |
| Comisiones y Finanzas | Deben conservar el resultado de las inferencias y distinguir devengo, factura, cuenta por cobrar, ingreso bancario, obligación al vendedor y pago. |
| Importador integral | Trabajo posterior de interfaz e integración; reutiliza exactamente los owners, reglas, deduplicación y trazabilidad usados por la actualización asistida. |
| Hosting final | HostDime deja de ser requisito exclusivo. Firebase existente es alternativa aceptable para evaluar; recomendación técnica: mismo Firebase Hosting y dominio app.aysseguros.com. La vinculación DNS aún no está ejecutada. |
| Endosos, certificados, anexos y relaciones | Se mantienen en el alcance vigente que corresponda a su aprobación; los aplazamientos anteriores no los eliminan. |
| Pólizas no encontradas | Posibles nuevas pólizas: informar número, aseguradora, documento/fila y contexto preciso; consultar inmediatamente. No inventar correspondencias ni detener todo el lote. |

Estas disposiciones prevalecen para la ejecución actual sobre obligaciones históricas que exigían cotización, comparación o conocimiento asegurador antes de la salida. No se eliminan sus IDs históricos ni se cambia artificialmente su estado a PASS.

## 4. Drive: inventario actualizado y períodos

Carpeta verificada: 2026 / Noviembre.
URL: https://drive.google.com/drive/folders/1dHNEDY60n9xvGlTaLAn4Gjdy-8YXdEKc
Padre 2026: 1vA87CSxXPAuoMnz89zSu2fhjIVu8kpRn.

Inventario observado: veinte archivos, diez facturas y diez planillas, correspondientes a nueve aseguradoras. Es un inventario de documentos presentes; todavía no certifica la conciliación de todas sus filas.

| Aseguradora/lote | Archivos observados |
|---|---|
| Aseguradora General | Factura “ok” y planilla. La factura incorrecta 1Ab6E9TnvHqtyyVSt4T8aQptlDtJPBcGr ya no aparece en el listado. |
| El Roble | Factura y CSV. |
| Mapfre | Factura y planilla HTML. |
| Universales | Factura y planilla PDF. |
| Ficohsa | Factura y planilla XLSX. |
| Banrural | Factura y planilla XLSX. |
| Bantrab | Factura y planilla PDF. |
| Aseguradora Guatemalteca | Nueva factura y nueva planilla XLSX, ambas presentes. |
| G&T GTQ | Factura y nueva planilla en quetzales; se conserva como lote/moneda independiente. |
| G&T USD | Factura y nueva planilla en dólares; se conserva como lote/moneda independiente. |

La factura de G&T en GTQ, emitida el 4 de noviembre, indica comisiones de octubre: total Q52.83. La de USD también fue emitida el 4 de noviembre y corresponde a octubre: USD20.47. Los totales coinciden con sus respectivas planillas. La planilla GTQ registra VIME-18154, cuota 3/12, ingreso 01/10/2026; la USD registra TLG$-7529, cuota 1/1, ingreso 30/10/2026.

La planilla General contiene comisiones de OCTUBRE 2026 y fechas de pago de octubre; su segunda página contiene pagos pendientes de NOVIEMBRE 2026. Cada sección debe clasificarse por su significado. No se interpretará la sección de pendientes como recibos pagados por estar en el mismo PDF.

Paula identifica este conjunto como comisiones facturadas relativas a los recaudos de noviembre. Se conserva su declaración y se solicitó una única aclaración del término “recaudo” frente a los períodos documentales; no se recibió respuesta a esa pregunta. Mientras se aclara, noviembre identifica el lote/carpeta y la facturación cuando su fecha lo prueba; las fechas y períodos de primas se conservan como aparecen en la fuente. No se presume cobro bancario de la comisión.

Los estados de cuenta de aseguradoras pueden recibirse en Drive, en la misma estructura documental, con aseguradora y corte identificables. Los estados bancarios, si se aportan para conciliar ingresos de A&S, se identifican como un tipo de fuente distinto. No se exige renombrar todos los archivos ni reproducirlos por chat.

### Columna

Paula autoriza usar la referencia de Octubre mientras la factura de este mes está pendiente. La carpeta Octubre es https://drive.google.com/drive/folders/1s7JZiVfvgZ_6kmqR3pqLrLnmbntNlMz5.

La planilla Columna localizada tiene corte 01/09/2026–30/09/2026, veinte filas y comisión total 787.72. La factura emitida el 05/10/2026 describe septiembre y totaliza GTQ882.25 con IVA; coincide al redondear 787.72 × 1.12. Puede aportar hechos históricos, identidades y reglas documentadas; no prueba recaudos o facturación de noviembre. No clonar sus movimientos como si fueran actuales.

### Aclaración recibida sobre G&T

Paula confirmó expresamente mediante pregunta focal que VIME-18154 es un “Plan mensual de doce”. Esta modalidad se registra para esa póliza. No se reduce 3/12 a 3/10, ni se amplía el techo general del fraccionamiento G&T. Al cruzar contra póliza/calendario se conservan fechas y montos comprobados; cualquier dato faltante se solicita exactamente. No volver a preguntar la modalidad ya confirmada.

## 5. Reglas de inferencia vigentes y límites

Autoridad: I6_5_I6_6_PAYMENT_INFERENCE_RECONCILIATION_LOCK_V6_20261001.json, blob b47f91000713de9c8ac317e1f3fd118b2eafc0d5; addendum V7 de pagos/fechas/inferencia. El puntero V4 histórico del Control Plane se actualiza a V6 conservando la referencia anterior.

| Fuente/caso | Aplicación permitida |
|---|---|
| Factura o recibo de aseguradora que demuestra pago/aplicación de cuota N | N directo; anteriores abiertas y contiguas 1 a N−1 por inferencia, con identidad única y sin contradicción. |
| Estado de aseguradora con pendientes desde N | Anteriores 1 a N−1 por inferencia; N y posteriores señaladas siguen pendientes. La ausencia genérica de una póliza no prueba que se haya pagado. |
| Planilla de comisión identificada con cuota N | N recaudada según evidencia, anteriores contiguas por inferencia; la comisión devengada no acredita depósito bancario a A&S. |
| Factura de comisión emitida por A&S | Evidencia de facturación y CxC, con vínculo a planilla; no sustituye el detalle de pagos de primas ni demuestra cobro bancario. |
| Estado bancario con correspondencia única | Confirma/reconcilia el movimiento correspondiente y su fecha; distinguir primas de clientes e ingresos de comisión de A&S. |
| Pago real migrado de SIGA inequívoco | PAID_DIRECT automático, conserva fecha/método y procedencia; conciliación puede quedar pendiente. No requiere aplicar manualmente cada fila. |
| Pago validado directamente por Operativo | Aplicación directa dentro de sus permisos; sin una segunda aprobación operativa ficticia. |
| Pago reportado por Asesor | Evidencia y gestión Ops pendientes de validación; todavía no libera cartera ni se convierte en pago directo. |
| Confirmación manual aislada | Solo la cuota confirmada, salvo opción expresa o evidencia suficiente para la secuencia anterior. |

La inferencia automática de alta confianza ya está autorizada en V6. No se añade una aprobación por fila. Es indispensable correspondencia única por aseguradora, país, póliza/vigencia/endoso, recibo/cuota, moneda y evidencia; no inferir por nombre similar o por coincidencia de monto solamente.

Separar prima neta, prima total, comisión empresa, impuestos/retenciones y comisión vendedor. Una prima neta no reemplaza el total contractual del recibo. Reversiones, parciales, refinanciación, endosos, monedas incompatibles, duplicados o pruebas contradictorias detienen únicamente el caso afectado hasta aclararlo.

El N/M explícito de fuente autoritativa gobierna la revisión del calendario, con corrección controlada y trazabilidad. Se conserva la configuración por aseguradora y modalidad: máximo ordinario diez para fraccionados de General, La Ceiba, G&T, Guatemalteca, Bantrab y Ficohsa; Bantrab doce solo con excepción documentada. El plan mensual de doce confirmado para VIME-18154 se trata como su modalidad particular, no como una excepción global encubierta.

Fechas separadas: pago real del cliente, vencimiento contractual usado como fecha efectiva inferida, período/corte de fuente, aplicación por aseguradora, emisión de factura, cobro de comisión y ejecución técnica de conciliación. Una fecha desconocida no se inventa; una cuota inferida no se presenta como pago real documentado. Procesar en noviembre no concentra cobros de meses previos en noviembre.

Si llega después evidencia directa de una cuota ya inferida, se enriquece el mismo pago canónico y se conserva la auditoría; no se crea otro ingreso. Repetir el lote debe dar cero altas o cargos duplicados.

## 6. Propagación obligatoria y diagnóstico de implementación

| Destino | Resultado exigido |
|---|---|
| Recibos/cartera | Estado de cada obligación, saldo, mora, próxima cuota y procedencia coherentes. |
| Cobros | Un pago canónico por hecho, estados reportado/aplicado/conciliado diferenciados, fecha y método cuando existan. |
| Cliente 360 | Pagos, cobros, comisiones y saldo coherentes con sus fuentes; detalle de inferencia y documento. |
| Clientes | Agregados y relaciones correctos, sin crear clientes por aproximación. |
| Pólizas | Calendario, pagos, pendientes y vínculos a cliente/aseguradora/asesor/vigencia/endosos consistentes. Inferir pago no cambia automáticamente cobertura, renovación o cancelación. |
| Comisiones empresa | Devengo/elegibilidad ligado a aplicación o planilla, base y tasa documentadas. |
| Finanzas CxC | Factura y saldo por aseguradora, moneda e identidad documental; pendiente/cobrado separado. |
| Caja/bancos | Ingreso solo con evidencia del cobro real; sin duplicar lo devengado/facturado. |
| Finanzas CxP y vendedores | Comisión del asesor conforme a su configuración y base aprobada, obligación, liquidación y pago diferenciados. |
| Inicio, metas y Reportes | Agregados por país/moneda/período coherentes; inferencias históricas no inflan el mes de procesamiento. |
| Historial/calidad/Ops | Evidencia, autor/origen, auditoría, excepciones y gestiones pendientes visibles. |

Existe implementación de pagos/cobros/recibos/cartera en el dominio servidor con comandos idempotentes. Eso no demuestra integración completa de Finanzas. La auditoría de código identifica cuatro brechas que requieren prueba focal y lineage previo:

1. El dominio de conciliación no materializa por sí solo comisiones, facturas ni movimientos financieros. El planner de planillas es dry-run y prepara colecciones que no son las mismas que leen todas las pantallas actuales.
2. El cálculo de comisiones conserva defaults de 12% empresa/50% vendedor; V6 exige REQUIERE_CONFIGURACION si faltan valores. La clasificación interno/freelance no determina por sí sola un porcentaje.
3. Finanzas identifica factura por aseguradora+período y deriva moneda del país en una ruta alcanzable. G&T demuestra por qué deben preservarse moneda e identidad documental: dos facturas válidas del mismo período.
4. El cálculo de liquidación vendedor resta montos que deben contrastarse con la base real de la obligación y las CxP. Se requiere comprobar el significado de los importes y el asiento durable de liquidación.

Son hallazgos estáticos, no certificaciones nuevas de fallos LIVE de todas las rutas. Se recupera primero la mejor versión aprobada y se corrige el owner vigente con pruebas relevantes; no se rehace Finanzas ni se importa información para corregir código.

Un lote no se declara COMPLETO ni SINCRONIZADO hasta verificar todos sus efectos exigidos. Si un efecto queda pendiente, se muestra ese estado y el saldo correspondiente; nunca un éxito global parcial. Aplicación por comandos idempotentes y estados auditables; la compensación de un error de datos revierte solo las operaciones del lote con precondiciones, sin restaurar una base antigua sobre trabajo posterior.

## 7. Equipo: reparación mínima verificable

Recibo de 5 de noviembre: I6_5_B4_003_TEAM_CLASSIFICATIONS_SIGNED_READBACK_20261105.json, blob 73283916e2560ec2843ba1095371a398f1cf8b4e. Siete clasificaciones persistidas, cuatro internos y tres freelance; recarga correcta en Preview.

Hoy LIVE muestra siete Sin clasificar. Dos causas delimitadas:

- Transporte: el último despliegue documentado del lector LIVE utilizó una proyección sin tipoVinculacion/participaMetas; el lector corregido fue probado en Preview. La paridad anterior de roster y writer no acredita la del lector. Leer primero paquete efectivo LIVE y respuesta firmada antes de actualizar ese único endpoint.
- Actualización inmediata: classifyAdvisorDurable verifica ACK pero no actualiza la fila del store como updateDurable. El módulo verifica Firestore y vuelve a dibujar un listado todavía hidratado con el valor previo.

Criterio de corrección: valor confirmado visible inmediatamente, tras recarga y nueva sesión; coherencia Equipo/Inicio/metas. No repetir las siete clasificaciones. Usar el harness existente con asesor ficticio para demostrar before/after de caché y que rechazo/missing ACK no aparentan éxito. La UI conserva la lectura canónica fuerte antes de confirmar.

El workflow antiguo del lector no tiene dispatch de diagnóstico y se activa al modificar su archivo: no tocarlo como simple documentación ni reejecutar un checkout viejo. Adaptar acotadamente el flujo existente con source/target fijados, comprobación de bytes y rollback. Cualquier frontend nuevo genera candidata sucesora y digest nuevos; no se parchea current42.

## 8. Renovaciones y Cancelaciones: evidencia preservada

Renovaciones: aceptación de Paula del 16 de octubre, PAULA_VISUAL_PASS_PRESERVE; tablero, cuatro columnas, tarjetas, filtros y vigencias. Recibo I6_5_B4_003_PAULA_FREEZE_VISUAL_20261016.md, blob 68c79350c7c02f20cf4427ca82300ba82c776ff8. Matriz funcional autenticada del 15 de octubre, veinticuatro escenarios Dirección/Operativo × TODOS/GT/CO × 1440/390/320, sin errores pertinentes; recibo e8c971abc1e676c98cafa65801b9d8cdbc473e38. Current42 incluye observación LIVE posterior.

Cancelaciones: aceptación expresa de Paula del 12 de octubre, SCOPED_HUMAN_VISUAL_PASS; motivo y preparación WhatsApp. Prueba de persistencia sintética y borrador sin envío, con limpieza. Recibo I6_5_B4_003_PAULA_SCOPED_VISUAL_PASS_OPS_CANCELACIONES_20261012.json, blob 1bd7a04cd61c9f654b654e42776713326686c0b0. No extender esa prueba a roles/acciones que no constan.

Owners actuales en HEAD y source current42: Renovaciones e3eecb72e7642d4c572338d89f119ae98135f6c1; Cancelaciones c9f6934beea57136daca0a3292451ad0792181c1; bridge Renovaciones 43b3a6b07eba40baa50b61b238174540cd9bf430. No restaurar owners viejos porque un lock histórico conserve sus hashes.

Consolidar estas aceptaciones en el anexo actual y su resumen, conservando intacto el inventario sellado. No hace falta un ciclo completo nuevo solo porque el inventario original de quince capacidades no las enumere por separado.

## 9. Avance: medida honesta y útil

Se conservan quince certificados históricos Preview/LIVE y el cierre actual de B4-003. Esto no equivale a que el 100% de funciones nuevas, datos mensuales o módulos financieros esté terminado. B4-001, B4-002 y B4-003 cerrados representan tres de siete gates nominales (42.9% de gates, no porcentaje de producto). I6 conserva su avance formal congelado de 50%, sin crédito ficticio por documentación.

| Familia | Estado demostrado / trabajo siguiente |
|---|---|
| Login, roles/scopes, shell/router, startup/PWA | Certificados preservados; retest solo por cambio causal y matriz final aplicable. |
| Inicio, Cliente360, Vehículos, relaciones | Certificados preservados; verificar efectos nuevos del lote y de Equipo donde correspondan. |
| Aseguradoras y directorio operativo | Certificados y cierre current42 preservados. |
| Ops, Leads y Pólizas | Certificados preservados; probar deltas o relaciones nuevas. |
| Recibos/cartera y Cobros | Capacidad base aceptada; conciliación del nuevo lote todavía no ejecutada. |
| Renovaciones y Cancelaciones | PASS acotados recuperados y vinculados; no reapertura rutinaria. |
| Equipo | Datos previamente probados; discrepancia LIVE reproducida hoy, corrección focal pendiente. |
| Cronograma | Primer gate pendiente: auditar aceptación, owner y delta antes de declarar porcentaje. |
| Siniestros | Diferido expresamente; trabajo conservado. |
| Comisiones y Finanzas | Implementación existente; cierre integral de inferencias y liquidaciones pendiente de prueba. |
| Importador | Componentes existentes; integración integral posterior reutilizando motor canónico. |
| Historial, Academia, Reportes, Calidad y demás gestiones | Preservar el inventario completo y evaluar alcance/última aceptación en su gate; esta actuación no afirma nueva auditoría funcional de todas sus rutas. |
| Marketing | Prioridad posterior a Finanzas. |
| Cotización, Comparación, Conocimiento asegurador | Diferidos hasta después de Finanzas y Marketing; no bloquean Fase A. |

Para publicar un porcentaje por módulo se requiere un denominador estable de criterios aceptados, aplicables y pendientes. Se informará probado/total y alcance; no se convertirá cantidad de archivos o tiempo invertido en un porcentaje inventado.

## 10. Publicación y conservación de datos

Recomendación técnica para mayor agilidad: continuar en el Firebase Hosting ya utilizado y conectar app.aysseguros.com como dominio personalizado del mismo sitio. La URL web.app puede servir durante la preparación DNS/SSL. No se crea Firebase nuevo ni se cambia Firestore o Drive. La plataforma antigua del subdominio es reemplazable y no constituye un bloqueo de producto.

Firebase permite promover una versión exacta entre canales del mismo sitio y conservar rollback de Hosting. Los dominios propios se conectan mediante los registros que indique su asistente. La propagación y el certificado pueden tardar hasta 24 horas; no prometer disponibilidad del dominio hoy sin evidencia de Connected/HTTPS.

HostDime sigue siendo una alternativa viable: publicar el mismo paquete estático aceptado, con configuración del servidor para headers/cache/PWA, respaldo de archivos antiguos y readback. Requiere comprobar una segunda superficie de transporte; por ello se recomienda Firebase para esta salida. No se atribuyen costes, cuotas ni restricciones del plan sin comprobarlos.

El despliegue de software no incluye una copia vieja de datos, seeds ni un reset. Firestore conserva la información que la empresa vaya actualizando. Cada mejora sigue: delta en la candidata acumulativa → pruebas → build inmutable → Preview → aceptación aplicable → mismo artifact LIVE → readback y pruebas focales. Functions y contratos de datos deben tener paridad certificada con el frontend; Hosting por sí solo no la garantiza.

Cambios de esquema: aditivos y compatibles cuando sea posible, migraciones versionadas/idempotentes con diff, precondiciones de versión, respaldo y auditoría. No sobrescribir campos cambiados por usuarios desde el corte del lote. Rollback de software conserva datos; una corrección de datos usa compensación selectiva documentada. Preparar y verificar ese mecanismo antes del primer lote real, sin prometer reversibilidad total aún no probada.

## 11. Plan de trabajo de hoy por resultados

| Orden | Trabajo | Salida verificable |
|---|---|---|
| 0 | Congelar decisiones, inventario, fuentes y cursor en los controles actuales | Un anexo único referenciado por Control Plane y state; master plan, inventario, B4-003 y certificados históricos intactos. |
| 1 | Resolver Equipo | Lectura LIVE exacta + caché tras ACK; clasificación inmediata/recarga/sesión, siete registros preservados. |
| 2 | B4-004 | Disposición no bloqueante Siniestros; lineage profundo focal y únicamente delta de Cronograma. |
| 3 | B4-005 | Matriz del alcance Fase A vigente, roles/países/viewports y relaciones; incluye contratos necesarios para comisiones, endosos/certificados/anexos; aplica aplazamientos autorizados. |
| 4 | B4-006 y B4-007 | Aceptación final aplicable y promoción del mismo artifact con backend correspondiente, readback, pruebas LIVE e integridad. No repetir PASS no afectados. |
| 5 | I6.6 | Lotes por aseguradora/moneda/corte: fuentes fijadas, extracción, match, diff, deduplicación, excepciones precisas, aplicación canónica, recarga e integridad. |
| 6 | I6.7 / Finanzas | Materializar comisión empresa/asesor y CxC/CxP según evidencia/configuración; reconciliar las proyecciones de todos los módulos. |
| 7 | I6.8 e I6.9 | Historial/Academia/habilitación y aceptación terminal postsalida del alcance vigente con pruebas exigidas. |
| 8 | Prioridades posteriores | Finanzas pendiente integral, Marketing, luego Cotización/Comparación/Conocimiento; importador integral según el plan de capacidades, sin motor paralelo. |

En paralelo de solo lectura: inventario y extracción documental; clasificación del tipo de documento/sección; conciliación preliminar sin escrituras; fuentes y versiones aprobadas; preparación de conexión del dominio. La ejecución que cambia producto/datos sigue el gate activo y sus dependencias.

No se fija una promesa de horas sin medir el delta de Cronograma, el lector LIVE y las brechas financieras. Se prioriza eliminar esas tres incertidumbres con una prueba focal cada una; una imposibilidad o ambigüedad se comunica inmediatamente con el dato exacto. No se hacen rondas exploratorias repetidas ni se mantiene a Paula esperando para confirmar una carencia ya identificada.

## 12. Método único de conciliación y aceptación del lote

1. Fijar archivo/versión/hash y tipo de documento, aseguradora, país, moneda, corte y fecha de emisión; excluir documentos retirados.
2. Extraer el detalle con referencia a página/hoja/fila; separar secciones pagadas, pendientes, ajustes y reversiones.
3. Resolver cliente, póliza, vigencia/endoso y cuota contra el registro canónico. Si falta póliza, devolver de inmediato identificación exacta para que Paula la comparta. No afirmar que una póliza es nueva hasta contrastarla.
4. Preparar un diff completo: pagos directos, anteriores inferidos, calendario, comisiones, facturas/CxC, CxP y proyecciones. Indicar no-ops ya aplicados.
5. Aislar excepciones. Continuar las correspondencias inequívocas cuando el gate y los owners estén preparados. No someter alta confianza a aprobación individual adicional.
6. Ejecutar exclusivamente owners canónicos con request/lote idempotente y comprobaciones de concurrencia; registrar before/after y evidencia.
7. Leer de vuelta saldos y efectos en cada módulo, recargar y contrastar totales por moneda; reejecutar en prueba para demostrar no duplicación.
8. Cerrar como completo solo con efectos esperados y excepciones identificadas; conservar reversión selectiva y trazabilidad.

Para el importador integral futuro se reutilizan estas ocho etapas y la misma autoridad V6/V7; la UI añade revisión/documentos/excepciones, sin una segunda lógica de negocio.

## 13. Fuentes principales

- Control rector y todos los recibos mencionados: artifacts/orbit360-recovery/release-control/ en la rama canónica.
- Reglas V7: artifacts/orbit360-recovery/project-sources-v2/v7/11_ADDENDUM_PAGOS_COBROS_CONCILIACION_FECHAS_INFERENCIA_EVERGREEN_V7_2026-09-26.md.
- Motor: functions/payment-inference-engine.js y functions/cobros-reconciliation-domain.js.
- Adaptador/planner: orbit360-platform/core/planillas-comisiones-source-adapter-p0.js y planillas-comisiones-commission-dryrun-planner-p0.js.
- Owners financieros auditados: orbit360-platform/core/comisiones-eng.js y orbit360-platform/modules/finanzas.js.
- Equipo: modules/equipo.js, data/store-firestore-product-operational-p0.js, data/store-firestore-product-readonly-p0.js y functions/b4-003-scoped-bootstrap-reader.js.
- Firebase: https://firebase.google.com/docs/hosting/manage-hosting-resources ; https://firebase.google.com/docs/hosting/custom-domain ; https://firebase.google.com/docs/hosting/test-preview-deploy .

