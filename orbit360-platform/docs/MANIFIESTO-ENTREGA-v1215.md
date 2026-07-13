# MANIFIESTO DE ENTREGA — v1.215 (cierre crítico post v1.214)

## Identidad
Versión interna: **v1.215**. Base: v1.214 (`Prototype Development Request - 2026-07-12T084423.733.zip`, SHA256 `2ba8c8b03a1b3f5dabbd01f0a311834fe31588f23b539e62cb97fc958289b860`). No se reconstruyó desde cero; se conservan los 12 puntos listados como "Conservar" en `01_AUDITORIA_Y_MATRIZ_CRITICA_V1214.md`.

## Delta físico contra v1.214 (archivos modificados/creados)
- `modules/aseguradoras.js`
- `modules/cotizador.js`
- `modules/comparativo.js`
- `modules/configuracion.js`
- `modules/automatizaciones.js`
- `modules/ia.js`
- `modules/correo.js`
- `modules/cliente360.js`
- `modules/cobros.js`
- `core/correo.js`
- `core/ia.js`
- `data/academia-plus.js`
- `README.md`
- `index.html` (cache-bust de los módulos anteriores)
- `docs/MANIFIESTO-ENTREGA-v1215.md` (nuevo, este archivo)

No tocados (protegidos, byte-identical a v1.214): `data/store.js`, `core/auth.js`, `core/importa.js`.

## Requisito → archivo → función → antes → fix → prueba → resultado

**P0-01 — Tarifas pueden no guardarse**
- Archivo: `modules/aseguradoras.js`, función `diffResumen`, `guardarDraft`, nueva `tarifaValidacionAudit`.
- Antes: `diffResumen` no incluía `cotTasas`/`cotTasasValidadas` → una edición solo tarifaria podía cerrar el modal sin escribir ni auditar.
- Fix: ambos campos entran al diff; al guardar, si cambiaron, se registra auditoría externa (`tarifaValidacionAudit`) con antes/después por ramo, actor, rol y motivo (reutiliza el motivo de guardado de la ficha).
- Prueba: editar solo una tasa de un ramo y guardar → aparece en "cambios detectados", se persiste vía `Orbit.store.update`, y se genera un registro en `auditoriaAseguradoras`.
- Resultado: OK.

**P0-02 — Validación tarifaria débil**
- Archivo: `modules/aseguradoras.js` (`tablaTasasRamo`, `tramosValidos`, `wireBody`), `modules/cotizador.js` (`tieneTasaValidada`).
- Antes: se podía validar con `fuenteDocumentoId OR version` (sin vigencia) y tramos sin validar rangos/tasas.
- Fix: `puedeValidar` ahora exige `fuenteDocumentoId && version && vigencia && tramosValidos(tramos)` (tasas positivas, mínimos no negativos, tramos en orden ascendente sin solaparse). El checkbox de validación queda deshabilitado si no se cumple. El gate automático del Cotizador (`tieneTasaValidada`) exige las mismas tres piezas de metadata además del booleano de validación.
- Prueba: intentar validar una tabla sin vigencia → checkbox deshabilitado con nota explicativa; completar los 3 campos + tramos válidos → validable.
- Resultado: OK.

**P0-03 — Gate de validación de propuestas insuficiente**
- Archivo: `modules/comparativo.js`, función `validarProp` (reescrita).
- Antes: marcaba `validada` directamente, motivo opcional, sin chequear rol, montos, fuente ni consistencia.
- Fix: exige rol activo autorizado (`puedeValidarProp`, excluye Asistente/Marketing), montos finitos y positivos, motivo obligatorio, checkbox de confirmación reforzada, consistencia país/ramo con el comparativo activo, y fuente/documento o clasificación manual/estimación interna explícita. Guarda diff antes/después + actor/rol/fecha/motivo en `p.validacion` y sincroniza con el store si la propuesta tiene id canónico.
- Prueba: validar sin motivo → bloqueado; validar con rol Asistente → bloqueado; completar todo → queda validada con diff registrado.
- Resultado: OK.

**P0-04 — Manual/PDF no son entidades canónicas**
- Archivo: `modules/comparativo.js`, nueva `persistirCotizacion`, usada en `manual()` y `cargarPDF()`.
- Antes: las propuestas manuales/PDF vivían solo en el array local `props` hasta guardar el comparativo completo.
- Fix: cada propuesta manual o extraída de PDF se persiste de inmediato en `Orbit.store` (`cotizaciones`) con id canónico y `documentRef` (referencia/nombre de archivo). El fuente "Estimado propio" se clasifica explícitamente como `estimacion_interna` (nunca aparece como propuesta validada de aseguradora sin pasar el gate de validación).
- Prueba: cargar un PDF o registrar una cotización manual → aparece inmediatamente en la colección `cotizaciones` del store con id propio, recuperable por `cotizacionPorId`.
- Resultado: OK.

**P0-05 — Emisión podía vincular el comparativo incorrecto**
- Archivo: `modules/comparativo.js`, función `aceptarOpcion`, `guardarHist` (ahora devuelve el id del registro guardado).
- Antes: usaba `(S().all('comparativos')[0] || {}).id` (primer registro del store, no necesariamente el actual).
- Fix: al aceptar una opción se persiste primero el comparativo actual (`guardarHist({silencioso:true})`), se toma su `id` exacto como `comparisonId`, y se usa el `id` canónico de la propuesta aceptada como `quoteId` en la solicitud de emisión (`workflowType: 'issuance_request'`).
- Prueba: aceptar una opción → la gestión creada en Orbit Ops trae el `comparisonId` del comparativo recién guardado (no uno antiguo) y el `quoteId` de la propuesta elegida.
- Resultado: OK.

**P0-06 — Afirmaciones de envío sin confirmación**
- Archivos: `modules/cobros.js` (recordatorios por lote), `core/correo.js` (registro de actividad al enviar correo).
- Antes: "recordatorios enviados (WhatsApp + correo)"; "Correo enviado: …".
- Fix: "recordatorios **preparados** (WhatsApp + correo) · pendientes de confirmación de entrega"; "Correo **preparado**: … · pendiente de confirmación de entrega".
- Prueba: grep de `enviados`/`Correo enviado:` sobre los módulos de comunicación → sin coincidencias sin evidencia verificable.
- Resultado: OK.

**P0-07 — Configuración técnica sin segmentación por rol**
- Archivos: `modules/configuracion.js` (tabs "APIs" e "Interno/Orbit"), `modules/automatizaciones.js` (webhook, credenciales IA), `modules/ia.js` (detalle de proveedor/modelo en el panel del asistente), `modules/correo.js` (conectar cuenta OAuth).
- Fix: se agregó `canViewTechnical()`/`canManageTechnical()` (rol activo Dirección/Admin) en los 4 módulos. Configuración oculta las pestañas técnicas del menú y las fuerza a "Marca" si el rol no autoriza; Automatizaciones deshabilita webhook/credenciales de IA y muestra nota; el chat de Orbit IA solo muestra proveedor/modelo real a roles autorizados (el resto ve "IA activa" genérico); Correo bloquea el botón de conexión OAuth a roles no autorizados.
- Prueba: cambiar el rol activo a "Asesor" → Configuración no muestra "APIs" ni "Interno (Orbit)"; en Automatizaciones los campos de webhook/IA quedan deshabilitados; en Correo el botón de conectar se reemplaza por una nota de permisos.
- Resultado: OK. No se capturan secretos reales en ningún caso (los campos de credencial ya usaban `credentialRef`/`backend_required`).

**P0-08 — Corrupción visual en Configuración**
- Archivo: `modules/configuracion.js`, función `interna` (tabla de planes).
- Antes: `<button ...>Editar</button></td>itar</button></td>` (texto corrupto duplicado).
- Fix: se eliminó el fragmento sobrante; la celda cierra en `</td>` limpio.
- Prueba: abrir Configuración → Interno (Orbit) con rol autorizado → tabla de planes renderiza sin texto suelto.
- Resultado: OK.

**P0-09 — Copy técnico/corrupto en Aseguradoras**
- Archivo: `modules/aseguradoras.js` (comentario de cabecera, `tabTarifas`, `tabActividad`).
- Antes: "Motor de fuentes/conocimiento…" (comentario y nota de UI) y frase rota "Los registros internos de soporte no se muestran separada (`auditoriaAseguradoras`)…".
- Fix: reescrito a lenguaje operativo ("cada documento se organiza por país/moneda/ramo/producto…") y frase de Actividad corregida ("Existe además un registro de auditoría interno que se conserva aunque la aseguradora se elimine.") sin exponer nombres de colecciones internas.
- Prueba: abrir ficha de aseguradora → pestañas Tarifas y Actividad sin lenguaje de arquitectura interna.
- Resultado: OK.

**P0-10 — Documento de Cliente360 con estado engañoso**
- Archivo: `modules/cliente360.js`, función `subirDocumento`.
- Antes: se podía "agregar documento" sin archivo ni referencia; el toast/actividad decían "Documento agregado al expediente" aunque nunca se almacena el binario (`metaOnly:true` siempre).
- Fix: se agregó campo "Referencia (si no adjuntás archivo)"; si no hay archivo ni referencia, se bloquea con aviso. El registro guarda `documentRef`; el copy pasó a "Referencia registrada · archivo pendiente de resguardo" en vez de "documento agregado".
- Prueba: intentar agregar sin archivo/referencia → bloqueado; completar referencia → se registra con el copy honesto.
- Resultado: OK.

**P0-11 — Aseguradoras reales hardcodeadas en el parser genérico**
- Archivo: `core/ia.js`, función `parseMulti`.
- Antes: lista fija `extra = ['La Ceiba', 'Seguros Universales', ..., 'MetLife']` de nombres reales de aseguradoras, añadida siempre al catálogo de reconocimiento.
- Fix: el catálogo de reconocimiento sale exclusivamente del directorio configurado (`Orbit.store.all('aseguradoras')`, nombre + `aliases` opcionales). Si el texto no coincide con ninguna aseguradora del directorio, la propuesta se marca `requiere_validacion: true` y el nombre queda como "Aseguradora sin identificar" (o el texto capturado, sin inventar una coincidencia con una marca real).
- Prueba: cargar un PDF con una aseguradora que no está en el directorio del tenant → aparece con `requiere_validacion:true`, nunca asignada automáticamente a una marca real no configurada.
- Resultado: OK.

**P0-12 — Academia, README y manifiesto**
- `data/academia-plus.js`: se actualizó la lección existente "Tarifas y conocimiento no se auto-habilitan" (curso Aseguradoras) para reflejar el nuevo flujo de validación (fuente + versión + vigencia + tramos válidos + motivo + confirmación) y se agregó una pregunta de evaluación correspondiente. No se creó curso duplicado.
- `README.md`: sección "Estado de los módulos" actualizada al alcance real de la plataforma (ya no dice "solo Inicio y Cliente 360"); referencia al manifiesto v1.215 y al CHANGELOG.
- Este archivo: manifiesto único v1.215 con delta exacto, requisito→archivo→función→prueba→resultado y pendientes P1.

## Evidencia funcional (resumen)
- Sintaxis: todos los `.js` del proyecto pasan `node --check` (sin cambios estructurales que rompan parseo; los archivos tocados son JS plano sin sintaxis nueva no soportada).
- Protegidos: `data/store.js`, `core/auth.js`, `core/importa.js` no se tocaron.
- Flujo tarifario: aseguradora sin tarifa validada (fuente+versión+vigencia+tramos) → Cotizador bloquea el cálculo automático y ofrece modo manual (sin cambios respecto a v1.214, ahora con gate más estricto).
- Flujo de aceptación: aceptar una opción del Comparativo crea la solicitud de emisión con `comparisonId`/`quoteId` del comparativo y la cotización recién guardados, no de un registro antiguo.

## Pendientes P1 (documentados, no bloqueantes de este cierre)
- Replantear profundo de la recomendación consultiva (más criterios de selección manual/automática) — pendiente.
- Visor documental transversal: hoy integrado en Aseguradoras/Pólizas/Comparativo/Cotizador/Siniestros/Cliente360; falta ficha-página dedicada de Póliza con el mismo visor.
- Multirol completo (rol default/activo + `dataScope` explícito) en `modules/equipo.js` — hoy existe rol activo de sesión y permisos extra por asesor, falta el scope de datos declarado explícitamente.
- Evidencia responsive reproducible (1366/768/390px) por módulo — pendiente de captura sistemática.
- Limpieza de manifiestos legacy en `docs/legacy/` y `docs/paquete-claude-post-v197/` — no se tocaron en este cierre crítico.
- Cotizador/Comparativo de tarifas oficiales de A&S (código externo del cliente) — integración pendiente de que la usuaria comparta ese material, fuera de alcance de este prototipo.
- Gestión documental con Google Drive real (OAuth) — requiere backend/credenciales; fuera del alcance de un prototipo estático. Lo que sí quedó resuelto: el registro honesto de referencia documental (P0-10) tanto para el equipo interno como para el cliente vía Portal.

## No se afirma nada como "ya implementado" sin la evidencia de arriba; cada punto señala archivo y función exactos modificados en esta entrega.
