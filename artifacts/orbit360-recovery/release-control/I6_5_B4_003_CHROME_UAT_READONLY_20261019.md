# UAT funcional Gravicentra Insurance — I6.5/B4-003

**Fecha:** 19 de octubre de 2026  
**Entorno:** Preview autenticada en Chrome; escritorio y viewport móvil 390×844.  
**Alcance:** navegación, lectura, filtros, recarga y detalle. No hubo escrituras ni cambios de datos, roles, configuración o permisos.

## Identidad de la candidata

La ruta abierta fue la Preview indicada. El marcador /__recovery__/build.json devolvió:

- Producto: Gravicentra Insurance
- Gate: I6.5-B4-003
- Source SHA: 125a3f314cb23aa128951ad714c95f143de64abb
- BuildId: gi-i65-b4-125a3f314cb2-57f234755dc1
- EnvironmentRef: firebase-hosting-preview-i6-5-forensic-b4-003

La URL observada corresponde al run 39324152069. El marcador coincide con la candidata solicitada. Rama y HEAD no se verificaron en GitHub dentro de esta UAT de navegador.

## Resultado ejecutivo

La candidata correcta abrió con sesión Dirección autenticada, que sobrevivió una recarga. Las vistas principales cargaron, pero no hay evidencia para aceptar capabilities completas: Inicio y otras vistas dejan agregados pendientes; Cliente 360 y Pólizas difieren en universos y primas; AUTO39012 incumple el total aprobado; Cobros contradice sus conteos de conciliación; y Conciliaciones no muestra propuestas pese a pagos pendientes expuestos por Cobros.

Los filtros muestran 417 clientes en Guatemala y 17 en Colombia, que suman los 434 de la vista Dirección/Operativo. Por tanto, el diferencial de 9 frente al readback previo de 443 no se explica por país. No se confirmó pérdida de registros. Los filtros de tipo suman 395 personas y 23 empresas; quedan 16 sin clasificación de tipo visible.

En móvil, las tarjetas y filtros se acomodan, pero la barra fija de búsqueda cubre parte del título superior y el menú no se cierra al elegir una ruta; debe cerrarse manualmente.

No se declara LATEST_APPROVED_VERSION_PREVIEW_PASS ni aceptación humana. Los 295 hallazgos previos no se modificaron ni deduplicaron.

## Matriz de pruebas

PASS/FAIL corresponde al control observable, no a aceptación integral de capability. No se declaran PASS integrales sin lineage, backend, dependencias y pruebas de escritura autorizadas.

| ID / control | Rol y país; ruta | Resultado y evidencia observada | Tiempo / impacto / severidad | Causa raíz |
|---|---|---|---|---|
| UAT-01 Identidad | Dirección / Todos; marcador Preview | PASS de identidad. Producto, gate, SHA y BuildId coinciden; URL corresponde al run 39324152069. | Lectura inmediata. | Confirmada para el marcador. Rama y HEAD fuera de esta prueba. |
| UAT-02 Sesión / reload | Dirección / Todos; Inicio | PARTIAL. La sesión autenticada persistió y el shell volvió. No se ejecutó login nuevo ni logout. | A ~3.3 s de recarga decía “Restaurando sesión”; shell visible a más tardar ~8.3 s. | Probable restauración/hidratación tardía; inicio en frío no medido porque la pestaña ya estaba abierta. |
| UAT-03 Inicio e indicadores | Dirección / Todos; #/inicio | FAIL. Tras reload, “Preparando información del mes”, “Actualizando datos”, “Confirmando pólizas” y “Validando cartera”; llegó a 3/5 fuentes y siguió así más de 17 s. Más tarde mostró 5/5. Avance personal Q11K/Q80K (14%); recaudo Q0/Q50K. Global: 1,243 pagos confirmados; 679 obligaciones pendientes (12 con monto); 631 vencidas (16 con monto); 16 renovaciones ≤45 días. Solo 1 de 7 perfiles tiene meta verificable. | Resolución tardía/intermitente; tiempo final no medido. P1. | Probable confirmación tardía de fuentes/agregados; causa técnica no confirmada en UI. |
| UAT-04 Universo Cliente 360 | Dirección / Todos, GT y CO; #/cliente360 | FAIL de reconciliación, no de carga. Total 434; GT 417 y CO 17. Persona 395 + Empresa 23 = 418, con 16 sin tipo visible. Cliente 360 indica 218 activas / 1,413 históricas. Filas conservaron “Actualizando datos” y “Calculando” tras varios segundos. | Más de ~6 s para estados secundarios observados. P1. | Confirmado: 434 es el universo mostrado y GT+CO suma 434. No determinada: diferencial 9 frente a readback 443 y 16 sin tipo. Sin evidencia de pérdida. |
| UAT-05 Filtros de país | Dirección y Operativo / GT, CO, Todos; #/cliente360 | PASS de filtro: 434 total, 417 Guatemala y 17 Colombia; la lista y KPIs cambian con selección. | Inmediato. No validó todos los scopes backend. | No se observó filtración entre países en esta vista. |
| UAT-06 Roles disponibles | SuperAdmin/Dirección, Operativo y Asesor / GT+CO; #/equipo | PARTIAL. Cuenta actual muestra SuperAdmin, Operativo, Asesor, países GT/CO. Selector ofrece Dirección, Operativo y Asesor. Operativo no accede a Equipo. No se modificaron permisos. | Inmediato. Admin y AdminTenant no seleccionables en la cuenta probada. | Asignación visible confirmada; roles ajenos no suplantados. |
| UAT-07 Aseguradoras | Dirección y Operativo / Todos; #/aseguradoras | PARTIAL. Ambas vistas abren directorio de 33 registros (29 activos). Asesor recibe denegación de acceso, coherente con restricción. No se revelaron credenciales ni se usaron controles de copia/edición. | Lectura inmediata. CRUD y autorización backend no probados. | No determinada para operaciones CRUD; evidencia solo de vista y gate por rol. |
| UAT-08 Ops | Dirección / Todos; #/ops | PARTIAL. Tablero visible con 3 negocios en flujo y 2 gestiones; declara “Sincronizado con Orbit Leads”. Un elemento de renovación aparece “Sin cliente”. No se abrió ni editó. | Ruta visible tras clic; no cronometraje fiable. P2 por integridad. | No determinada: posible referencia huérfana o dato intencionalmente incompleto. La etiqueta de sincronización no prueba sincronización real. |
| UAT-09 Leads | Dirección / Todos; #/leads | PARTIAL. Pipeline con 5 negocios, prima estimada Q0, pronóstico Q0 y 0 ganados. No se probaron transiciones/sincronización por escritura. | Sin cronometraje fiable. | No se observó defecto de carga; la sincronización no quedó demostrada. |
| UAT-10 Pólizas / golden | Dirección / Todos; #/polizas, búsqueda y desglose AUTO39012 | FAIL. 1 póliza encontrada. Neta Q1,800 coincide con golden invariant; total Q2,117 frente a Q2,678.53 aprobado; calendario Q3,482. La ficha marca “Datos principales validados” y “Genera calendario”. | Desglose inmediato. Diferencia Q561.53 frente al aprobado y Q1,365 frente al calendario. P1. | No determinada. Probable inconsistencia de mapeo/cálculo de ajuste/total; UI no muestra qué fuente o fórmula causó el valor. |
| UAT-11 Cliente 360 ↔ Pólizas | Dirección / Todos; #/cliente360 y #/polizas | FAIL. Cliente 360: 218 activas/1,413 históricas; netas GTQ 627,575/COP 81,897,592. Pólizas: 230/1,425 y GTQ 638,175/COP 175,456,570. Inicio/importación indican 1,425 pólizas. | Reproducible al navegar. P1. | Probable read-model, filtro o agregación diferente; causa no confirmada. |
| UAT-12 Vehículos / riesgos | Dirección / Todos; navegación | NOT_TESTED como módulo independiente. No hay entrada “Vehículos” en navegación. Pólizas muestra ramos/productos de vehículos, pero ficha/CRUD y relación Cliente↔Póliza↔Vehículo no quedaron certificados por ruta propia. | No medido. P1/P2 por capacidad no demostrada. | Módulo no expuesto como ruta visible o no disponible en esta candidata; no determinado. |
| UAT-13 Cobros / cartera | Dirección, Operativo y Asesor / Todos; #/cobros | FAIL. Dirección ve 2,381 registros y 1,238 pagos SIGA por conciliar. Operativo ve 5 filas; cuatro KPI siguen “Actualizando datos”/“confirmando” tras >6 s; Asesor ve 4 filas. Tarjeta dice 1,238 de 1,243 confirmados y “5 ya conciliados”; texto inferior dice “0 ya conciliados”. Tabla solo lectura. | KPIs Operativo pendientes >6 s. P1. | Confirmada contradicción textual; probable desacople de agregados/listado por rol. Causa backend no determinada. |
| UAT-14 Conciliaciones | Dirección / Todos; #/conciliaciones | FAIL de consistencia. Todos los estados muestran 0 (propuesta, revisión, validación, validada, rechazada, bloqueada), mientras Cobros muestra 1,238 pagos SIGA pendientes. No se concilió. | Inmediato. P1. | Probable ausencia de puente entre pagos y bandeja, o estados/filtros diferentes; no determinada. |
| UAT-15 Recibos / cartera | Dirección / Todos; Cobros e Importación inteligente | BLOCKED para lineage separado. No aparece ruta independiente “Recibos”. Tablero de importación: 1,872 recibos esperados (72 por validar), 0 recibos de aseguradora, 1,310 cartera primas (28 por validar), 0 conciliaciones de primas. No se importó nada. | Lectura inmediata. P1. | No determinada; capas diferentes no reconciliadas en esta UAT. |
| UAT-16 Renovaciones | Dirección / Todos; #/renovaciones | PARTIAL. Pipeline: 26 vencidas, 3 ≤15 días, 10 entre 16–45 y 22 situaciones para revisar. Un registro muestra origen “Renovada” junto con “Vencida · confirmar renovación”. Sin contactos ni cambios. | Sin cronometraje fiable. P2. | Posible divergencia entre estado fuente y vencimiento calculado; semántica no confirmada. |
| UAT-17 Cancelaciones | Dirección / Todos; #/cancelaciones | PARTIAL. 490 canceladas históricas y 34% de cartera histórica. Se ve un registro marcado “B4-003 QA”; excluido como prueba funcional real. No se seleccionó ni preparó WhatsApp. | Ruta visible. | Origen del fixture QA no determinado. |
| UAT-18 Cotizador | Dirección / Todos; #/cotizador | BLOCKED para cálculo. Formulario y aseguradoras cargan; cálculo depende de fuente/configuración válida. No se pulsó Cotizar porque no se comprobó que no guardara ni generara efecto. | Cálculo no ejecutado. | Prueba intencionalmente omitida bajo regla read-only. |
| UAT-19 Comparativo | Dirección / Todos; #/comparativo | PARTIAL. Carga sin propuestas. No se cargaron PDF, no se creó propuesta manual ni se registró opción aceptada. | Ruta visible. | No determinada; las acciones crean o registran datos. |
| UAT-20 Calidad de datos | Dirección / Todos; #/calidad | FAIL. 433 expedientes incompletos de 434; solo 1/434 completo (0.2%). Integridad financiera permanece “Confirmando pólizas y recibos”; diferencias prima/recibos sin resultado. No se preparó actualización. | Confirmación pendiente. P1/P2. | Probable lectura/hidratación pendiente; causa técnica no confirmada. |
| UAT-21 Cronograma | Dirección / Todos; #/cronograma | PARTIAL. Calendario y controles Día/Semana/Mes cargan con eventos. No se abrió o modificó una tarea. | Sin cronometraje fiable. | Persistencia/filtros/relaciones no probados. |
| UAT-22 Historial | Dirección / Todos; #/historial | PARTIAL. Pasa de “Consultando historial autorizado…” a 35 interacciones; llamadas, WhatsApp y reuniones muestran 0. | ~5 s hasta estado estable observado. | Probable consulta tardía; filtros y persistencia no probados. |
| UAT-23 Comisiones | Dirección y Asesor / Todos; #/comisiones y navegación | PARTIAL/FAIL de acceso Asesor. Dirección abre la vista, sin registros utilizables visibles. Navegación Asesor no incluye Comisiones pese a regla de mostrar su propia comisión. No se extrajeron importes. | P2. | Probable discrepancia de navegación/policy; backend no probado. |
| UAT-24 Siniestros | Dirección / Todos; #/siniestros | PARTIAL. Ruta abre estado vacío, 0 reclamos. No se creó/importó. | Ruta visible. | Vacío no demuestra CRUD/integración. |
| UAT-25 Responsive | Dirección / Todos; Inicio y Cliente 360, 390×844 | FAIL visual parcial. Tarjetas/filtros se apilan sin desbordamiento horizontal evidente. Barra fija tapa parte del título; menú no se cierra al seleccionar ruta y requiere cierre manual. Viewport restablecido. | Evidencia visual interna de Chrome. P2. | Probable espaciado/z-index y estado del drawer en móvil; causa no confirmada. |
| UAT-26 Consola/red | Rutas visitadas | No se observaron errores ni warnings de consola en lecturas realizadas. El panel de red no está disponible en esta conexión: HTTP 404, fallos de requests y recursos quedan NOT_TESTED. Varias llamadas de control tuvieron timeout CDP; lecturas posteriores funcionaron. | Limitación de navegador, no atribuida al producto. | Timeout de control confirmado; red no probada. |

## Pruebas no ejecutadas por la restricción read-only

- Login en frío, logout, instalación/activación PWA y service worker.
- Altas, ediciones, eliminaciones, guardados, envíos, PDFs, importaciones, conciliaciones o Cotizar.
- Persistencia de escrituras y sincronización real Ops/Leads, Cliente/Póliza/Vehículo y Recibo/Cobro.
- Admin, AdminTenant y usuarios distintos de la cuenta actual.
- Panel de red, respuestas HTTP, recursos y fallos de request.
- Fuente/backend que explique 443/434, diferencias de pólizas/primas o estado de conciliación.

## Límites causales

Chrome confirma resultados visuales y navegación, no contenido de Firestore ni composición GitHub del release. Solo se marca causa confirmada cuando la contradicción es directamente visible. Las demás causas son probables o no determinadas. No se cambió Control Plane, porcentaje, backlog ni gate.

# HANDOFF CANÓNICO A GRAVICENTRA INSURANCE — I6.5/B4-003

**Candidata:** Preview run 39324152069; marker /__recovery__/build.json: source SHA 125a3f314cb23aa128951ad714c95f143de64abb, BuildId gi-i65-b4-125a3f314cb2-57f234755dc1, gate I6.5-B4-003. Identidad coincide.

## P1 — Bloqueos funcionales observados

1. AUTO39012: prima neta Q1,800 correcta; total Q2,117 vs Q2,678.53 aprobado; calendario Q3,482. Causa técnica no confirmada.
2. Cliente 360 y Pólizas no reconcilian: 218/1,413 y GTQ 627,575/COP 81,897,592 frente a 230/1,425 y GTQ 638,175/COP 175,456,570. Probable read-model/scope/agregación distinta; no confirmada.
3. Cobros contradice sus propios conteos: tarjeta 1,238 de 1,243 y “5 ya conciliados”; texto dice “0 ya conciliados”. Operativo conserva KPI de actualización aunque muestra 5 filas conciliadas.
4. Conciliaciones muestra 0 en todos los estados mientras Cobros expone 1,238 pagos SIGA por conciliar. No se aplicó ningún pago.
5. Inicio tras reload quedó en 3/5 fuentes y KPIs pendientes por >17 s; más tarde mostró 5/5. No se inspeccionó red.
6. Recibos: no hay ruta independiente visible; importación presenta 1,872 esperados/72 por validar, 0 recibos aseguradora, 1,310 cartera primas/28 por validar. No se validó lineage entre capas.

## P2 — Alcance, datos y visualización

7. 434 vs readback 443: 417 GT + 17 CO = 434; los tipos suman 395 personas + 23 empresas = 418, dejando 16 sin tipo visible. Diferencial de 9 sigue sin explicación; no hay evidencia de pérdida.
8. Solo 1/7 perfiles tiene meta individual verificable en Inicio.
9. Asesor no ve Comisiones en navegación pese a la regla de visibilidad de su propia comisión.
10. No hay ruta independiente visible de Vehículos; ficha, CRUD y joins no probados.
11. En móvil, barra fija tapa parte del título y el drawer queda abierto tras elegir ruta. Tarjetas y filtros sí se apilan.
12. Ops muestra elemento “Sin cliente”; Renovaciones muestra origen “Renovada” junto a “Vencida · confirmar renovación”. Posibles incoherencias, causas no confirmadas.

## Evidencia de alcance / protección

- Cuenta actual: SuperAdmin, Operativo y Asesor; GT y CO.
- Dirección y Operativo acceden a 33 aseguradoras (29 activas); Asesor recibe denegación.
- Cliente 360 en Asesor: 392 (GT 375, CO 17); Cobros muestra 4 filas en Asesor, 5 en Operativo y 2,381 en Dirección. “Solo propios” no queda certificado: el owner no se muestra en esa vista.
- Ops y Leads abren; la etiqueta de sincronización no se probó con escrituras.
- Historial cargó 35 interacciones tras ~5 s. Calidad y algunos KPI conservan confirmaciones pendientes.
- No hubo writes, imports, mensajes, cambios de permisos, builds, deploys ni cambios de plan/porcentaje. No se divulgaron credenciales ni datos identificables de clientes.
- Consola: sin errores/warnings observados; Network/HTTP no accesible.
- Los 295 hallazgos acumulados permanecen intactos; esta UAT no los actualiza ni cierra.

**Conclusión:** la identidad de la candidata se verificó y varias rutas reales cargan, pero los hallazgos P1 impiden acreditar aceptación funcional del gate con esta evidencia.
