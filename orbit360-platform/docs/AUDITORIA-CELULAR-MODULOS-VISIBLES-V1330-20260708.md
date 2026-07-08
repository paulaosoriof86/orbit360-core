# AUDITORIA CELULAR MODULOS VISIBLES V1330 — 2026-07-08

## Alcance

Documento para continuar avance desde celular sin PowerShell. Esta auditoria no modifica codigo funcional.

Objetivo: identificar modulos visibles con riesgo de copy tecnico, simulacion de acciones reales o falta de gates administrativos antes de continuar con smokes M2/M3/M4.

## Orden de revision

1. Portal
2. Correo
3. Notificaciones
4. Automatizaciones
5. Plantillas
6. Marketing
7. Conciliacion / finanzas sensibles

## Criterios

Cada modulo se clasifica como:

- Cerrado: no requiere patch antes de M2/M3/M4.
- Requiere copy: solo limpieza de textos visibles.
- Requiere gate: accion administrativa o sensible sin motivo/confirmacion/trazabilidad.
- Bloquea: no debe avanzarse hasta corregir.
- Puede esperar: mejora no critica.

## Pendientes transversales ya identificados

- Equipo y Configuracion siguen pendientes de gates administrativos.
- Portal tiene riesgo de copy tecnico visible si menciona Storage/backend.
- Correo, notificaciones y automatizaciones deben evitar simular envios reales.
- Conciliacion es sensible y no debe ejecutar pagos ni tocar cobros.

## Portal

Modulo: `orbit360-platform/modules/portal.js`.

Estado observado:

- Portal del cliente esta funcionalmente avanzado: polizas, pagos, siniestros, documentos, aprendizaje, notificaciones y asistente.
- Reportar pago deja estado pendiente de revision/conciliacion y crea actividad/gestion.
- Siniestros reportados desde portal se crean con estado `Reportado` y bitacora.

Hallazgos:

1. Copy tecnico visible: aparece `Storage/backend conectado` en carga de documentos.
2. Copy tecnico visible: aparece `Storage pendiente` en detalle de actividad.
3. Copy interno visible: `Orbit Ops` en solicitud del cliente.
4. Copy de asistente: `en linea · te ayudo al instante` puede sugerir IA/canal activo cuando realmente es respuesta local.
5. Copy `Portal → Ops` debe cambiarse a lenguaje cliente/admin no tecnico.

Clasificacion:

- Requiere copy.
- No bloquea M2/M3/M4, pero si debe limpiarse antes de cerrar Portal cliente o demo comercial.

Patch recomendado:

- `La carga real del archivo requiere Storage/backend conectado` -> `El archivo queda registrado para revision; la carga definitiva depende del canal documental conectado`.
- `Storage pendiente` -> `archivo pendiente de carga definitiva`.
- `Orbit Ops` -> `equipo de gestion`.
- `Portal → Ops` -> `Portal del cliente · gestion interna`.
- `en linea · te ayudo al instante` -> `asistente de orientacion · respuestas preliminares`.

Impacto Academia:

- Agregar microleccion cliente/admin: reportar pago no equivale a pago conciliado.
- Agregar microleccion: documento registrado no equivale a archivo almacenado definitivamente.

Impacto Claude:

- Mantener experiencia del portal, pero neutralizar tecnicismos y promesas de disponibilidad inmediata.

## Correo

Modulo: `orbit360-platform/modules/correo.js`.

Estado observado:

- Diferencia entre `Enviados` y `Preparados` segun cuenta conectada.
- Si no hay cuenta conectada, indica que el correo queda preparado y no enviado.
- El boton cambia entre `Registrar para envio` y `Preparar correo`.
- Toast indica `Correo preparado · envio pendiente de cuenta conectada` cuando no hay conexion.

Hallazgos:

1. Copy tecnico visible: `backend/OAuth conectado`.
2. Copy tecnico visible: `OAuth/backend conectado desde Configuracion`.
3. Debe verificarse localmente que `Orbit.correo.enviar` no despache realmente cuando no hay proveedor conectado.

Clasificacion:

- Requiere copy.
- Requiere verificacion local de `Orbit.correo.enviar`.
- No bloquea M2/M3/M4 si queda documentado como pendiente de copy.

Patch recomendado:

- `backend/OAuth conectado` -> `canal seguro autorizado`.
- `OAuth/backend conectado desde Configuracion` -> `conexion segura autorizada desde Configuracion > Integraciones`.
- Mantener `preparado`, `registrado`, `pendiente`.

Impacto Academia:

- Microleccion: correo preparado vs correo enviado por proveedor conectado.

Impacto Claude:

- No usar labels de envio real salvo confirmacion del proveedor.

## Notificaciones WhatsApp

Modulo: `orbit360-platform/modules/notificaciones.js`.

Estado observado:

- El modulo esta bastante alineado con honestidad operativa.
- Usa KPIs `Preparados hoy` y `Total registrados`.
- WhatsApp API aparece como pendiente de conexion.
- `wa.me` abre WhatsApp Web y pide confirmar envio en WhatsApp.
- Registra actividad como `Mensaje de WhatsApp preparado`, no enviado confirmado.

Hallazgos:

1. Titulo/UX dice `Enviar`, aunque funcionalmente prepara o abre canal.
2. Boton `Registrar para API` es aceptable, pero podria aclararse como `Registrar para API pendiente`.
3. KPI `Canal: wa.me / API` es aceptable, pero debe mantenerse con pie `Web abierto / Cloud pendiente`.

Clasificacion:

- Casi cerrado.
- Requiere copy menor.
- No bloquea M2/M3/M4.

Patch recomendado:

- Tab `Enviar` -> `Preparar / abrir canal` o mantener si el boton explica confirmacion externa.
- `Registrar para API` -> `Registrar para API pendiente`.

Impacto Academia:

- Microleccion: wa.me abre conversacion, pero la confirmacion final de envio ocurre en WhatsApp.

Impacto Claude:

- Conservar claridad: preparado/registrado/abierto no equivale a entregado.

## Automatizaciones

Modulo: `orbit360-platform/modules/automatizaciones.js`.

Estado observado:

- Cabecera del modulo declara estados honestos: preparado/registrado no equivale a enviado confirmado.
- Webhook Make se guarda como escenario; el envio real depende del proveedor conectado.
- Escaneo registra eventos preparados/registrados.
- La prueba de webhook registra evento, no afirma despacho.

Hallazgos:

1. Configuracion de IA permite escribir API key en pantalla y guardar en preferencia local. Esto no debe considerarse backend real ni produccion.
2. Copy `API Key` visible es aceptable solo como prototipo interno, pero en producto debe ir a canal seguro.
3. `Webhook de Make` permite pegar URL en UI; debe ser tratado como configuracion sensible por tenant y no como secreto definitivo en frontend.
4. Crear/eliminar automatizaciones custom no pide motivo administrativo ni auditoria formal.

Clasificacion:

- Requiere gate para configuraciones sensibles.
- Requiere copy/seguridad para IA keys/webhook.
- No bloquea M2/M3/M4 si no se ejecuta integracion real; si se va a demo comercial, debe limpiarse antes.

Patch recomendado:

- API key/webhook: cambiar copy a `registrar solicitud de conexion segura` o `usar canal seguro autorizado`.
- Guardar en UI solo como placeholder/estado, no secreto real.
- Crear/eliminar automatizaciones custom debe pedir confirmacion y motivo.
- `Probar disparo` debe mantenerse como `Registrar prueba` si no hay Make real conectado.

Impacto Academia:

- Microleccion Admin: diferencia entre automatizacion activa, evento registrado y envio confirmado.
- Microleccion Admin: secretos/API keys nunca deben exponerse ni guardarse en frontend productivo.

Impacto Claude:

- Claude puede mejorar UX, pero debe conservar lenguaje honesto y no diseñar ingreso de secretos como si fuera produccion.

## Plantillas

Modulo: `orbit360-platform/modules/plantillas.js`.

Estado observado:

- Cabecera del modulo ya documenta que WhatsApp Web abierto no equivale a mensaje entregado y que se registra como comunicacion preparada.
- KPIs usan lenguaje de canal preparado.
- La vista de uso aclara que WhatsApp abre el chat y que el envio debe confirmarse en WhatsApp.
- Al usar WhatsApp, registra actividad como `Mensaje de plantilla preparado` y abre `wa.me`.
- Redactar correo delega a modulo Correo, que ya diferencia preparado/enviado segun conexion.

Hallazgos:

1. Editar/eliminar plantillas no exige motivo administrativo.
2. Duplicar plantillas tampoco registra motivo/auditoria.
3. No hay riesgo critico de simulacion de envio real.

Clasificacion:

- Casi cerrado para honestidad operativa.
- Requiere gate menor para edicion/eliminacion de plantillas si quedan como activo administrativo del tenant.
- No bloquea M2/M3/M4.

Patch recomendado:

- Eliminar plantilla: confirmacion reforzada + motivo.
- Guardar cambios de plantilla: motivo si cambia canal/texto/asunto.
- Duplicar plantilla: registrar actividad administrativa simple.

Impacto Academia:

- Microleccion Marketing/Admin: plantillas aprobadas vs borradores; ediciones deben conservar trazabilidad.

Impacto Claude:

- Mantener `WhatsApp abierto no equivale a entregado` y `confirmar envio en WhatsApp`.

## Marketing

Modulo: `orbit360-platform/modules/marketing.js`.

Estado observado:

- Calendario mensual con contenidos, estado, canal, ficha, IA opcional e integraciones.
- Importar calendario registra evento de sincronizacion y abre importador.
- Generar mes con IA cae a plantilla local si no hay IA disponible.
- El copy generado/sugerido indica revisar y ajustar tono.
- Crear pieza y programar publicacion usan eventos de integracion con copy honesto: la creacion/publicacion real requiere integracion activa.
- Reprogramar atrasados dice que la publicacion real requiere proveedor conectado.

Hallazgos:

1. Estados `Publicado` y `Medido` se pueden seleccionar manualmente; debe distinguir publicacion real confirmada vs estado interno.
2. Eliminar contenido no exige confirmacion reforzada ni motivo.
3. Programar publicacion cambia estado a `Programado` sin gate/motivo.
4. Acciones Canva/Metricool estan bien descritas como preparadas, pero deben quedar auditadas por integracion.

Clasificacion:

- Requiere gate administrativo menor.
- No bloquea M2/M3/M4, especialmente porque M2 justamente es smoke de Marketing.
- Antes de demo comercial, conviene reforzar estados `Publicado`/`Medido` para no parecer confirmacion externa si no hay proveedor conectado.

Patch recomendado:

- Cambiar etiqueta o ayuda de `Publicado`: `Publicado/confirmado` solo si hay proveedor conectado; si no, `Marcado como publicado`.
- Programar: confirmacion ligera cuando no hay Metricool/Make conectado.
- Eliminar: confirmacion + motivo.
- Guardar con estado `Publicado` o `Medido`: advertencia si no hay evento confirmado.

Impacto Academia:

- Microleccion Marketing: diferencia entre idea, programado interno, publicado real y medido.
- Microleccion Admin: integraciones de contenido preparan eventos, no publican sin proveedor conectado.

Impacto Claude:

- Puede mejorar UX del calendario, pero debe conservar estados honestos y no simular Metricool/Make activo.

## Conciliaciones / finanzas sensibles

Modulo: `orbit360-platform/modules/conciliaciones.js`.

Estado observado:

- La cabecera declara que lee solo de `Orbit.store('conciliaciones')`.
- Declara que no toca cobros.
- Declara que las acciones solo cambian estado de propuesta.
- La aplicacion real de pagos queda para backend ChatGPT/Codex.
- Banner indica que la bandeja no aplica pagos ni modifica cobros.
- KPIs y tabla conservan fuente, archivo/fila, pais/moneda, cliente/poliza/recibo, monto y accion propuesta.
- La funcion `accion` solo actualiza `conciliaciones` y no toca `cobros`.

Hallazgos:

1. Validar/rechazar/bloquear/anular propuesta no exige motivo.
2. No registra bitacora de cambio de estado dentro de la propuesta.
3. `VALIDADA` podria interpretarse como pago aplicado si el usuario no lee el banner; debe reforzarse como `validada para proceso posterior autorizado`.
4. No bloquea estados si falta pais/moneda, aunque muestra advertencia visual de moneda requerida.

Clasificacion:

- Muy buen aislamiento: no toca cobros.
- Requiere gate/motivo para cambios de estado.
- Bloquea M5, pero no bloquea M2/M3/M4.

Patch recomendado:

- Cambios de estado deben pedir motivo.
- Guardar historial/bitacora de revision por usuario, fecha y motivo.
- Reforzar copy: `Validada como propuesta; no aplicada a cobros`.
- Si falta pais/moneda o hay bloqueos, impedir `validar`.

Impacto Academia:

- Microleccion Finanzas: conciliacion valida propuesta, no aplica pago.
- Microleccion Finanzas: pais/moneda obligatorios; no mezclar monedas.
- Evaluacion: banco/aseguradora/comisiones son fuentes separadas.

Impacto Claude:

- Si Claude toca esta bandeja, debe conservar aislamiento: no crear cobros, no aplicar pagos, no escribir cartera.

## Resumen de clasificacion final de esta auditoria

| Modulo | Estado | Bloquea M2/M3/M4 | Accion |
|---|---|---:|---|
| Portal | Requiere copy | No | Patch copy antes de demo/portal cliente |
| Correo | Requiere copy + verificacion local | No | Patch copy y revisar `Orbit.correo.enviar` |
| Notificaciones | Casi cerrado | No | Copy menor |
| Automatizaciones | Requiere gate/copy sensible | No si no hay integracion real | Gate y copy antes de demo comercial/productiva |
| Plantillas | Casi cerrado | No | Gate menor para editar/eliminar |
| Marketing | Requiere gate menor | No | Smoke M2 puede avanzar; reforzar estados antes de demo comercial |
| Conciliaciones | Aislado, requiere gate | No para M2/M3/M4; si para M5 | Motivo/bitacora antes de M5 |
| Equipo | Requiere gate | Si, por orden metodologico | Patch local v2 |
| Configuracion | Requiere gate | Si, por orden metodologico | Patch local v2 |

## Conclusion operativa

La auditoria confirma que varios modulos ya habian sido trabajados con el proposito de honestidad operativa. El bloqueo principal para continuar el plan no son Portal/Correo/Notificaciones/Automatizaciones/Plantillas/Marketing, sino:

1. Equipo gates.
2. Configuracion gates.
3. Luego smoke M2/M3/M4.
4. M5 Conciliacion solo despues, con gates adicionales.

## Impacto Claude

Claude debe conservar copy honesto, sin terminos tecnicos visibles para cliente/admin comercial, y nunca mostrar integraciones como activas si estan pendientes.

## Impacto Academia

Academia debe incluir lecciones para roles Admin/Direccion/Finanzas/Marketing sobre gates, trazabilidad y diferencia entre accion preparada y accion ejecutada por canal conectado.

## Estado

Auditoria celular completada para:

- Portal.
- Correo.
- Notificaciones.
- Automatizaciones.
- Plantillas.
- Marketing.
- Conciliaciones.

Pendiente de siguiente bloque:

- Preparar parche local v2 Equipo/Config.
- Luego smoke M2/M3/M4.
