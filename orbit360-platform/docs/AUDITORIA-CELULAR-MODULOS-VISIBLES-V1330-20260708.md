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
- Conciliacion es sensible y no debe ejecutarse antes de M2/M3/M4.

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

- Microleccion: wa.me abre conversación, pero la confirmacion final de envio ocurre en WhatsApp.

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
4. Crear automatizaciones personalizadas no pide motivo administrativo ni auditoria formal.

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

## Resumen de clasificacion actual

| Modulo | Estado | Bloquea M2/M3/M4 | Accion |
|---|---|---:|---|
| Portal | Requiere copy | No | Patch copy antes de demo/portal cliente |
| Correo | Requiere copy + verificacion local | No | Patch copy y revisar `Orbit.correo.enviar` |
| Notificaciones | Casi cerrado | No | Copy menor |
| Automatizaciones | Requiere gate/copy sensible | No si no hay integracion real | Gate y copy antes de demo comercial/productiva |
| Equipo | Requiere gate | Si, por orden metodologico | Patch local v2 |
| Configuracion | Requiere gate | Si, por orden metodologico | Patch local v2 |
| Conciliacion | Pendiente revisar | Si para M5 | Revisar despues de M2/M3/M4 |

## Impacto Claude

Claude debe conservar copy honesto, sin terminos tecnicos visibles para cliente/admin comercial, y nunca mostrar integraciones como activas si estan pendientes.

## Impacto Academia

Academia debe incluir lecciones para roles Admin/Direccion sobre gates, trazabilidad y diferencia entre accion preparada y accion ejecutada por canal conectado.

## Estado

Actualizado con hallazgos de Portal, Correo, Notificaciones y Automatizaciones.

Pendiente completar:

- Plantillas.
- Marketing.
- Conciliacion / finanzas sensibles.
