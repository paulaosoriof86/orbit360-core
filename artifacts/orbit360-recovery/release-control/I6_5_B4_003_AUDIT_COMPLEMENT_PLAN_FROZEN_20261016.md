# Gravicentra Insurance — complemento consolidado de diagnóstico y trabajo

Fecha de evidencia: 16 de octubre de 2026.
Estado: DOCUMENTARY_BASELINE_FROZEN_SUBORDINATE_TO_CONTROL_PLANE.
Gate rector: I6.5 / B4-003. Este documento NO abre otro gate, no sustituye el plan rector, no modifica autorizaciones, no cierra hallazgos ni incrementa el porcentaje formal.

## 1. Autoridad y alcance

Repositorio: paulaosoriof86/orbit360-core. Rama: recovery/fase-a-clean-20260831.
Producto auditado: 4a022cec65c38eb6513a79d4386e61fad06c65d1. Control Plane preservado: a17ca3527ac927533c7db55b8d344e4cb72a0939.
Plan rector: I6_5_FORENSIC_REMEDIATION_PLAN_LOCK_V2_20260924.json; plan de pendientes: I6_PENDING_CLOSURE_MASTER_PLAN_LOCK_20261004.json; continuidad comercial: I6_5_B4_003_PLAN_INTEGRAL_CICLO_COMERCIAL_TRAZABILIDAD_Y_RECUPERACION_20261011.md. Ledger y carry existentes conservan sus 295 IDs.

Los identificadores C01.01–C14.05 siguientes pertenecen al complemento de auditoría. NO son los contratos comerciales C01–C13 del 11 de octubre, ni nuevas iteraciones. Son 86 unidades de trabajo agrupables por owner. Una tarea documental cerrada no acredita una función corregida.

44 áreas: Login, sesión, roles/scopes, shell/router, PWA/startup, Inicio, Equipo, Configuración, Cliente 360, Pólizas, Vehículos/riesgos, Aseguradoras, directorio seguro, Ops, Leads, Gestión operativa, Gestión administrativa, Renovaciones, Upsells, Cotizador, Comparativo, Siniestros, Cancelaciones, Cronograma, Recibos/cartera, Cobros, Conciliación/inferencia, Comisiones, Finanzas de empresa, Reportes, Insights, Historial, Calidad, Importación, Notificaciones, Documentos/Drive, Portal, Automatizaciones, Correo, Marketing, Plantillas, Academia, IA y las capacidades contractuales embebidas Endosos/Certificados/Anexos/Conocimiento aseguradoras/Quote Authority-CotComp. El inventario formal del paquete agrupa áreas transversales y separa las cinco últimas; no equivale al conteo de rutas ni a 44 módulos aprobados.

## 2. Evidencia y diagnóstico consolidado

Ejecución real: 38971037517. Artefacto: 12077216951. SHA256 del ZIP: 4e2c8143c84dd00638b206e07beb5006e5d74b27e8e9b1c5be5ef89004d21e51. QA source: e6c1b0d6c6f79561f8888b1a9ad577a6836d40a4. Primera evidencia preservada: run 38970051423 / artifact 12076144596.

Se leyeron 18 colecciones con 7,259 documentos dentro del límite declarado, 8 membresías, 7 asesores y metadatos de 77 funciones v2. Se reconciliaron los 295 IDs de ledger y carry sin faltantes ni estados discordantes. El carry declara 166 entradas con atención. Esto no adjudica automáticamente todos sus receipts.

LIVE mantiene la versión 3087fabd2db9b639, publicada el 7 de octubre, y su marcador certificado responde 404. Las reglas publicadas siguen siendo el ruleset legacy amplio. La Preview devuelve el build gi-i65-b4-61e3cd0bbb25-57f234755dc1. Un marcador correcto no sustituye el hash de todos los assets ni la atestación de cada backend.

Paula y Samuel completaron 114 observaciones de ruta/rol y 24 observaciones a 390/320 px. No son pruebas de CRUD o diseño completas. Hubo errores de snapshots; al seleccionar Asesor no se confirmó la hidratación dentro de las ventanas observadas. Paula generó PRODUCT_WRITE_COLLECTION_NOT_AUTHORIZED durante navegación. Carlos y Fernando no completaron la activación. El harness bloqueó intencionalmente llamadas de sincronización y el estado de Drive: esos bloqueos NO son por sí mismos defectos del producto.

Samuel tiene alcance Equipo en varios módulos y no tiene teamId, lista global de asesores ni listas por rol. Esta configuración delimita la visibilidad; no demuestra por sí sola la causa del lead específico reasignado. La regla es aplicar el rol activo y su ámbito, no conceder Todos indiscriminadamente.

Las referencias no resueltas requieren adjudicación, no borrado: pólizas 3 a cliente; vehículos 76 a cliente y 76 a póliza; recibos 86 a cliente y 80 a póliza; cartera 86 a cliente y 80 a póliza; gestiones 3 a cliente y 1 a póliza. Las columnas pueden corresponder al mismo registro y no se suman. Falta distinguir datos reales, legacy, alias y fixtures con procedencia.

El paquete preserva 22 familias A16 y añade 12 subcasos. Las 12 pruebas nuevas aisladas demuestran ocho contraejemplos y cuatro controles, no doce correcciones. Se preservan 46 comprobaciones anteriores. Las causas abarcan publicación no gobernada, reglas permisivas, autorización sobre estado posterior, roles/equipo divergentes, persistencia optimista, colección no contratada, caché y preferencias, metas, turno/actor colaborativo, grafo transaccional, Drive, reportes, plantillas, progreso, integraciones simuladas, diseño/rendimiento, auditoría, QA residual, evidencia de release y orden transaccional. Se conservan también las contrapruebas positivas: no reconstruir lo ya válido.

## 3. Plan de 86 tareas

Cada grupo declara owner funcional, dependencia y prueba mínima. Estado inicial: PENDIENTE_CIERRE salvo observación documental expresamente identificada. Source, release, resultado y receipt se registran al ejecutar; un run verde o una captura no cierran una tarea.

### C01 — Gobierno y reconciliación
Owner: Release/QA. Gate: B4-003. Sin dependencia nueva.
- C01.01 Registro del complemento: conservar evidencia y este plan con readback y hashes; no reemplazar CP. Este commit solo cierra su materialización documental.
- C01.02 Reconciliación de los 295 IDs: preservar cada ID, estado, owner y disposición. La igualdad ledger/carry está comprobada; falta adjudicar todos los receipts aplicables a los 166 pendientes.
- C01.03 Cursor y obligaciones pendientes: vincular las nuevas pruebas al ledger existente y a la dependencia causal correcta; no saltar gates ni perder bloqueantes.
- C01.04 Métricas y disparadores: distinguir evidencia, implementación, aceptación y LIVE; usar autorización tipada del ejecutor, nunca un asunto de commit como única autoridad.

### C02 — Publicación y backend efectivo
Owner: Release/infraestructura. Depende de C01. Gate: B4-003, aceptación LIVE en B4-007.
- C02.01 Publicadores: inventariar todas las ramas, workflows e identidades capaces de publicar sobre el mismo sitio; impedir publicación fuera del circuito autorizado.
- C02.02 LIVE efectivo: reconciliar versión, publicador, fecha y todos los bytes; la observación actual demuestra drift, no reparación.
- C02.03 Paquete recuperable: preservar payload frontend y backend exactos o clonación de versión inmutable verificada. El último ZIP scoped contiene evidencia sin bundle; no reconstruir bytes fingiendo que son el mismo artefacto.
- C02.04 Backend desplegado: vincular cada callable/trigger a revisión, source y configuración autorizados; 77 metadatos leídos no atestan sus digests.
- C02.05 Rollback: comprobar destino exacto, disponibilidad y procedimiento reversible antes de publicar.

### C03 — Seguridad compartida
Owner: Backend/Auth/seguridad. Depende de C02 para promoción. Gate: B4-003.
- C03.01 Reglas y vías alternativas: probar lectura/escritura SDK, REST y callables por tenant, país, rol y propietario; ninguna vía amplia permanece como bypass.
- C03.02 Rol y alcance canónicos: unificar aliases, módulos, países, lista por rol y techo de permisos entre UI, bootstrap, reader y writer.
- C03.03 Estado de membresía: pendiente, invitado, inactivo y contradictorio no equivalen a activo; preservar estados legítimos y activación aprobada.
- C03.04 Transición: autorizar registro anterior, operación y destino; reasignar propietario/país exige permiso específico, no un payload ordinario.
- C03.05 Revocación y sesiones: probar cambio de rol, inactivación, reingreso y cachés sin información retenida fuera del alcance.
- C03.06 Secretos y superficies externas: credenciales solo por proveedor autorizado; revisar exposición, permisos de documentos, recursos públicos y almacenamiento local.

### C04 — Equipo, configuración y metas
Owner: Usuarios/Auth/Inicio. Depende de C03. Gate: B4-003.
- C04.01 Crear e invitar: create/login/cambio de rol/relogin/inactivar/reactivar/cleanup; invitación y entrega son estados separados.
- C04.02 Edición y sincronización: preservar la transacción existente de asesor y membership vinculada; comprobar Auth, vínculo y resultado completo.
- C04.03 Roles reales: resolver los accesos de Paula, Samuel, Carlos y Fernando desde membresía física, sin hardcodes ni usuarios genéricos sustitutos.
- C04.04 Freelance: formalizar rol y elegibilidad, permisos propios y reglas de metas; no inferir vínculo laboral por nombre o rol.
- C04.05 Equipo: administrar grupo y listas visibles por rol y módulo; demostrar alcance al cambiar de rol y ausencia de ampliación accidental.
- C04.06 Metas mensuales: guardar por usuario/período/país/moneda, readback y auditoría; ausencia no se convierte en fallback fijo 45/55.

### C05 — Persistencia, concurrencia y eventos
Owner: Store/Backend. Depende de C03. Gate: B4-003.
- C05.01 Confirmación uniforme: exigir respuesta, commit y readback válidos; una respuesta vacía o rechazo tardío nunca es éxito.
- C05.02 Borradores: errores y demoras conservan el formulario; no cerrar ni borrar lo escrito antes de confirmar.
- C05.03 Concurrencia: detectar versión obsoleta; dos ediciones no sobrescriben silenciosamente el cambio anterior.
- C05.04 Idempotencia: distinguir request repetido de duplicación por clave empresarial; reintento y doble envío sin efectos duplicados.
- C05.05 Caché: aislar tenant/UID/rol/país/mes y revocar/invalidate al cambiar configuración y datos pertinentes.
- C05.06 Suscripciones: respetar colección y desmontaje; cambio de clientes no dispara listeners exclusivos de metas.
- C05.07 Historial: actor server-owned, motivo y before/after; proyectar eventos autorizados en UI y tras recarga.

### C06 — Colaboración y documentos
Owner: Ops/Leads/Drive/notificaciones. Depende de C03–C05. Gate: B4-003.
- C06.01 Reasignación: mismo negocio, dos identidades; nuevo asesor ve y anterior deja de ver cuando corresponde; recarga y auditoría.
- C06.02 Turno y bandejas: separar etapa, responsable actual, espera, acción y archivo. Devolución no crea falsa tarea operativa.
- C06.03 Gestiones: aplicar colaboración bidireccional también a Gestión operativa y administrativa, sin convertirlas en prospectos.
- C06.04 Actores: solicitante, respondiente y aprobador identificados desde servidor en tarjeta, detalle, historial y aviso.
- C06.05 Drive: validar raíz/carpeta/caso/rol, documento y visor; vincular negocio con expediente por referencia, sin copiar binarios.
- C06.06 Recuperación documental: fallo upload/finalize/vínculo/descarga conserva intención, permite reintento y no duplica registro/archivo.
- C06.07 Notificaciones: commit antes de outbox; eventId correlacionado; lectura personal distinta de resolución compartida y de entrega externa.

### C07 — Grafo contractual y módulos operativos
Owner: CRM/Seguros/Backend. Depende de C03–C06. Gate principal B4-003; B4-004/B4-005 según se indica.
- C07.01 Clientes: create/edit desde listado/ficha, identidad fuerte, varios negocios por cliente, sin merges ambiguos ni pérdida de enriquecimiento.
- C07.02 Pólizas: mismo contrato desde todas las entradas; prima, vigencias, pago, aseguradora, vendedor y riesgo completos.
- C07.03 Padres: validar existencia y coherencia cliente/póliza/vehículo antes de escribir; escritor genérico no elude dominio.
- C07.04 Recibos/cartera: emisión y renovación materializan calendario/obligaciones o declaran sincronización pendiente, sin crear pagos ficticios.
- C07.05 Vehículos/riesgos: identidad completa, relaciones recíprocas y persistencia desde ambas superficies; no crear vehículo para póliza no vehicular.
- C07.06 Renovaciones/upsells: preservar visual aprobada; desenlaces explícitos, vínculo de sucesora, pérdida/aplazamiento y recuperación sin duplicación.
- C07.07 Siniestros/cancelaciones: probar transición, recuperación y vínculos; Cancelaciones en B4-003 y Siniestros en B4-004 conforme al plan rector.
- C07.08 Aseguradoras: ficha/directorio/cuentas/contactos/credenciales por roles; edición durable y eliminación protegida de relaciones.
- C07.09 Certificados: preparación dentro del gate activo; aceptación transversal B4-005 con póliza, vigencia, emisión, descarga y expediente trazables.
- C07.10 Anexos: crear/consultar/vincular/versionar con póliza y documento, permisos, recarga y consistencia contractual; matriz B4-005.
- C07.11 Endosos: contrato completo, vigencia/cambio financiero/riesgo y efecto en obligaciones; mantener historia y unicidad; matriz B4-005.

### C08 — Realidad financiera y comercial
Owner: Motor financiero/Inicio/reportes. Depende de C03–C07. Gate B4-003, cierre transversal B4-005.
- C08.01 Pago en ambas superficies: Cliente360 y Cobros llaman al mismo comando; saldo, recibo, cobro, fecha, evidencia y auditoría cuadran tras recarga.
- C08.02 Unicidad financiera: mismo pago no crea otro cobro por ID distinto; diferenciar abonos legítimos, parcialidades y reversos explícitos.
- C08.03 Matching/inferencia: único match, secuencia, moneda, contradicción y evidencia; procedencia/fecha inferida visibles; evidencia posterior enriquece sin duplicar.
- C08.04 Meta del equipo: suma server-owned de metas vigentes de usuarios elegibles; no suma de roster parcial ni total institucional inventado.
- C08.05 Inicio: cifras contra detalle, avance personal/equipo, velocímetros y mensajes rotatorios; carga rápida sin cifras provisionales falsas.
- C08.06 Reportes/Insights: filtros por fecha tipada, medidas numéricas y moneda; jamás sumar IDs ni excluir obligaciones por no tener cobro.
- C08.07 Primas: fuentes y reglas validadas por aseguradora, producto y vigencia; golden cases, impuestos, gastos, financiación y excepciones autorizadas.

### C09 — Integridad y residuos de QA
Owner: Datos/QA. Depende de C01/C07. Gate B4-003.
- C09.01 Grafo: adjudicar cada ID y referencia no resuelta por procedencia real/QA/legacy; no sumar referencias como registros únicos.
- C09.02 Disposición: cleanup/quarantine solo de registros inequívocos y autorizados; conservar datos reales, relaciones e historial.
- C09.03 Readback/reversibilidad: conteos before/after, vínculos y recuperación acreditados; ninguna reparación por reimportación ciega.
- C09.04 Prevención: fixtures identificables con cleanup recuperable incluso ante cancelación/fallo del runner.

### C10 — Capacidades expuestas y alcance posterior
Owner: Módulos/integraciones/QA. Depende de C03–C05. No habilitar automáticamente por estar empaquetado.
- C10.01 Cotizador/comparativo: persistencia de oferta aprobada, fuente tarifaria, comparación e impresión; no sustituir el owner validado.
- C10.02 Cronograma/plantillas: tareas y obligaciones con dueño durable; plantilla vacía no siembra durante render. Cronograma cierra en B4-004.
- C10.03 Academia/historial: progreso por usuario/curso, contenido por rol y provenance; habilitación I6.8 tras LIVE.
- C10.04 Finanzas/comisiones: contratos de empresa, liquidación y visibilidad; Operativo no ve comisiones. Datos I6.7; habilitar Finanzas solo si supera pruebas.
- C10.05 Marketing/automatizaciones: distinguir configuración y programación de ejecución/publicación real; catálogos durables y executor trazable.
- C10.06 Correo/IA: no declarar proveedor conectado/enviado por flag local; separar reglas locales y salida de proveedor; secretos backend. Correo personal es Fase B.
- C10.07 Portal: identidad cliente server-owned, aislamiento y mismo estado/documento canónico; portal externo no equivale a selector interno.
- C10.08 Diferimientos: cada capacidad no habilitada conserva owner, motivo, criterio y autorización; no borrar trabajo ni convertir ocultamiento en seguridad.
- C10.09 Conocimiento aseguradoras: fuente/hash/taxonomía/versión/vigencia/roles, ingestión y proyección validada; matriz B4-005. No inventar tarifa desde documento no verificado.
- C10.10 Quote Authority/CotComp: Gravicentra conserva autoridad tarifaria; intercambio por contrato/versión y permisos, sin duplicar autoridad; matriz B4-005.

### C11 — Diseño, rendimiento y PWA
Owner: Frontend/QA. Depende de contratos funcionales estables. Preparación paralela; gate B4-003 con aceptación B4-005/B4-006.
- C11.01 Diseño transversal: tarjetas, tablas, modales, iconografía y profundidad compartidas; preservar última UI aprobada.
- C11.02 Tipografía/contenido: contraste efectivo, jerarquía, interlineado; textos de operación sin notas técnicas ni doble clic para rotar mensajes.
- C11.03 Responsive/teclado: escritorio/390/320, foco/teclado, contenido, scroll, errores y formularios con datos; ausencia de overflow global no acredita todo.
- C11.04 Rendimiento: medir login, primer render, primera cifra e interacción con caché fría/caliente/cambio de rol; optimizar consultas y carga, no aumentar timeout.
- C11.05 PWA/versiones: service worker no bloquea login; caché anterior no sirve otra release ni retiene datos de otro alcance.

### C12 — Certificación de Preview
Owner: QA/release. Depende de cierre causal y disposición de bloqueantes. B4-005 → B4-006.
- C12.01 Artefacto: reutilizar el build exacto; si cambió producto generar nuevo digest. Cambiar documentación/QA no obliga a reconstruir producto.
- C12.02 Matriz individual: cada módulo demuestra owner, versión, rol, acción, datos, persistencia y relaciones; no PASS por abrir.
- C12.03 Catorce flujos: 168 grupos de criterios con evidencia vigente y excepciones justificadas; casos de dos identidades y fallos controlados.
- C12.04 Evidencia heredada: importar solamente receipts aplicables; no repetir cierres no afectados ni arrastrar un PASS invalidado.
- C12.05 Blockers/UAT: reconciliar ledger/carry, guardar resultado por ID y validación humana de la candidata exacta; no exigir a Paula descubrir defectos técnicos.

### C13 — Producción del mismo artefacto
Owner: Release/QA. B4-007, después de B4-004/005/006.
- C13.01 Promover: mismos bytes de frontend y backend aprobado; canal/identidad objetivo exactos; ninguna publicación lateral.
- C13.02 Prueba LIVE: módulo/rol/viewport, navegación, writes autorizados, recarga, actores y relaciones con before/after.
- C13.03 Integridad/rollback: rehash completo y ruta de reversión verificable; deploy exitoso no es aceptación.
- C13.04 Seal: solo evidencia completa, CP actualizado y guard posterior permiten cerrar I6.5; +10 puntos formales hasta60%.

### C14 — Continuidad post-salida restante
Owner: Datos/QA/habilitación. Apertura por CP, no por este documento.
- C14.01 I6.6: estados de cuenta actuales primero, planillas con lineage y cobros/otras evidencias después según decisión prevalente; delta, conflictos aislados, readback y conciliación. Al cerrar70%.
- C14.02 I6.7: comisiones empresa/asesor, base configurada, liquidación, vínculos y visibilidad por rol; no reimportar planillas. Al cerrar80%.
- C14.03 I6.8: Historial, Academia, capacitación por rol y habilitación gradual; Finanzas solo si operativa, correo personal diferido. Al cerrar90%.
- C14.04 I6.9: matriz final, sesiones, CRUD, integridad, duplicados, conflictos, mismo payload certificado/HostDime cuando corresponda. Al cerrar100%.
- C14.05 Backlog posterior: SaaS/no-code, correo personal y demás evoluciones explícitas de FaseB se preservan; no abrir otra fase mientrasI6esté abierto.

## 4. Secuencia y métricas sin ambigüedad

B4-003 corrección causal → B4-004 Siniestros/Cronograma → B4-005 matriz transversal incluyendo Endosos/Certificados/Anexos/Knowledge/CotComp → B4-006 UAT final → B4-007 mismo artefacto LIVE → cierre I6.5 → I6.6 → I6.7 → I6.8 → I6.9.

Avance formal vigente50%=5/10 mini-gates. Auditoría aporta0puntos funcionales. B4-003solo no aumenta el formal a60%; debe cerrarseI6.5completo. Siguientes cierres:60/70/80/90/100%. La escala histórica de readiness B1–B4 es distinta y no mide horas/esfuerzo restantes ni certifica LIVEactual.

Por integración: porcentaje = criterios aplicables con evidencia vigente / criterios aplicables. Se muestraN/Dmientras la línea base de evidencias no esté adjudicada. No contar sintaxis, inventario, adminreads o screenshot como commit/reload/LIVE. Criterio no aplicable necesita autorización y motivo.

No existe duración restante exacta demostrada. No se promete una hora/fecha ni se extrapolan tiempos deCIcomo esfuerzo de corrección. Cada tarea conserva estado, pruebas/source/release, minutos reales y cambio desde la sesión anterior. Cada vuelta informa porcentaje anterior, incremento efectivamente acreditado, resultado, IDs cerrados y pendientes. No se convierte actividad en avance.

## 5. Estado final del complemento

Congelamiento documental del diagnóstico, evidencia y alcance: sí, después de readback y guard del commit que contiene este archivo. Congelamiento funcional de producto/CP: no. No se ejecutaron writes operativos, reimportaciones, deployments ni cambios de roles/reglas. La evidencia, artefactos y plan detallado descargable se conservan por hashes; el ledger rector no se reemplaza. Las pruebas pendientes siguen expresas, no son una promesa de auditoría universal sin defectos.

Hash del plan detallado de86tareas entregado con el paquete:189fa66dbad7dca559970649a877be378bcdd8e4d327d29c4ab520e7fadc11ec.
