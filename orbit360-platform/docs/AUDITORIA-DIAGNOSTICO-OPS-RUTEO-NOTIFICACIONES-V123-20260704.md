# Auditoría diagnóstico — Ops, ruteo de gestiones y notificaciones v1.123

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Base auditada: `Prototype Development Request - 2026-07-04T152321.882.zip`
Rama destino documentación: `ays/backend-tenant-lab-v99-20260703`
Estado: diagnóstico de código frontend/prototipo + implicación backend. Sin Firestore. Sin deploy. Sin merge. Sin datos reales.

## 1. Resumen ejecutivo

La observación de Paula es correcta. En la candidata v1.123, Ops sí tiene un motor de gestiones, pero la clasificación todavía es insuficiente.

Hallazgo principal:

- muchas solicitudes caen en `Gestiones Admin`;
- solo existe otra lista específica fuerte: `Renovaciones / Modif.`;
- pagos reportados desde Portal no crean `documentos` ni `conciliacionBanco`;
- el soporte del pago queda como `soporteNombre` en el cobro, no como documento persistente;
- no hay `documentoIds[]` ni `conciliacionId` en la gestión de pago reportado;
- la notificación al asesor es inconsistente: algunos flujos dicen notificar, pero usan datos del cliente o solo crean `avisos` internos;
- no existe estado separado `estadoCliente` / `estadoAsesor`;
- la trazabilidad existe como `actividades` y `bitacora`, pero no cubre todos los eventos ni destinatarios.

## 2. Archivos revisados

- `modules/ops.js`
- `modules/portal.js`
- `modules/cobros.js`
- `modules/cliente360.js`
- `modules/renovaciones.js`
- `modules/cancelaciones.js`
- `modules/notificaciones.js`
- `core/ciclo.js`
- `core/config.js`
- `core/notify.js`
- `data/seed.js`

## 3. Estado actual de Ops

`modules/ops.js` renderiza el tablero desde `Orbit.ciclo.opsBoard()` y muestra columnas según `Orbit.cat.get('opsListas')`.

`core/config.js` define solo estas listas iniciales de Ops:

- `Gestiones Admin` — gestión;
- `Cotizaciones` — negocio;
- `Inspecciones` — negocio;
- `Emisiones` — negocio;
- `Renovaciones / Modif.` — gestión.

Esto explica por qué muchas solicitudes operativas terminan mezcladas en una bandeja administrativa.

## 4. Estado actual de tipos de gestión

`core/config.js` define `tiposGestion` con ruteo limitado:

- renovación y modificaciones → `Renovaciones / Modif.`;
- actualizar datos, endoso, cancelación, carta, certificado, reclamo/siniestro → `Gestiones Admin`.

Faltan tipos/listas para:

- pago reportado;
- conciliación;
- documentos/soportes;
- datos del cliente;
- siniestros/reclamos;
- cancelaciones/retención;
- emisión/endosos;
- solicitudes comerciales;
- soporte portal;
- requerimientos de aseguradora;
- urgentes/escaladas.

## 5. Pago reportado desde Portal

Archivo: `modules/portal.js`, función `reportarPago(cobroId)`.

Estado actual:

1. Lee el archivo cargado.
2. Actualiza el cobro con:
   - `reportado`;
   - `soporteNombre`;
   - `notaReporte`.
3. Inserta actividad: `Pago reportado por el cliente`.
4. Crea gestión con:
   - `lista: 'Gestiones Admin'`;
   - `tipo: 'Validar pago reportado'`;
   - `origen: 'Portal del cliente'`.

Problemas:

- no crea documento persistente en `documentos`;
- no guarda `documentoId` ni `documentoIds[]`;
- no crea registro en `conciliacionBanco`;
- no enruta a lista `pagos_reportados` / `conciliacion` / `cobros`;
- usa fecha fija `vence: '2026-06-26'`;
- no notifica explícitamente al asesor;
- no notifica explícitamente a Cobros/Operativo con enlace al soporte;
- el cliente solo recibe toast local, no estado trazable de recepción/revisión.

## 6. Solicitudes generales desde Portal

Archivo: `modules/portal.js`, flujo de solicitud de gestión.

Estado actual:

- si detecta reclamo/siniestro, crea registro en `reclamos`;
- luego crea gestión en `Gestiones Admin`;
- inserta actividad;
- muestra toast al cliente.

Problemas:

- reclamos/siniestros deberían rutear a lista específica de `siniestros` o `reclamos`, no quedar en administrativa;
- cancelaciones deberían ir a cancelaciones/retención;
- documentos deberían ir a documentos/soportes;
- consultas de póliza deberían ir a pólizas/servicio;
- falta notificación formal al asesor y registro en `notificaciones` con audiencia.

## 7. `core/ciclo.js` — crearGestion

La función `crearGestion(g)` crea base con:

- `lista: 'Gestiones Admin'`;
- `tipo`;
- `clienteId`;
- `polizaId`;
- `asesorId`;
- `estado`;
- `prioridad`;
- `vence`;
- `checklist`;
- `origen`;
- `bitacora`;
- `comentarios`.

Problemas de modelo:

- no tiene `tipoGestion` canónico;
- no tiene `subTipoGestion`;
- no tiene `moduloDestino`;
- no tiene `listaDestino` separada de `lista` visible;
- no tiene `solicitanteTipo` / `solicitanteId`;
- no tiene `responsableRol`;
- no tiene `slaHoras`;
- no tiene `estadoCliente`;
- no tiene `estadoAsesor`;
- no tiene `documentoIds[]` como campo estándar;
- no tiene `conciliacionId` como campo estándar;
- no registra `notificaciones[]`.

## 8. `core/ciclo.js` — solicitarGestion

La función `solicitarGestion(clienteId, polizaId, desdeCliente)` sí mejora el flujo porque permite elegir tipo y adjuntar archivos demo.

Fortalezas:

- usa `tiposGestion()` para sugerir lista;
- permite adjuntos demo con nombre/tamaño;
- crea actividad;
- muestra texto indicando que notificará al asesor.

Problemas:

- los adjuntos quedan dentro de la gestión como array demo, no como `documentos` persistentes;
- la lista depende de `tiposGestion`, que es limitada;
- la notificación usa `notify()` con `para` igual al asesor, pero tel/email tomados del cliente en algunos casos, lo que puede notificar al canal equivocado;
- no hay registro formal de audiencia ni estado de envío;
- no se crea `estadoCliente` ni `estadoAsesor`.

## 9. Notificaciones actuales

Hay tres capas distintas:

1. `core/notify.js` — notifica al cliente y registra `actividades`.
2. `core/ciclo.js` → `notify(o)` — inserta `avisos` y abre toast con wa.me/correo.
3. `modules/portal.js` → `notifs` — notificaciones visibles en portal.

Problema:

No hay una matriz única de notificaciones con audiencia, evento, canal, estado y trazabilidad. Esto puede generar notificaciones parciales o duplicadas, y dificulta saber si el asesor fue realmente avisado.

## 10. Diagnóstico final

### Estado actual

Funciona como prototipo operativo básico, pero no cumple todavía el criterio comercial/operativo de trazabilidad profunda por tipo de solicitud.

### Dónde se pierde el ruteo

- `opsListas` tiene pocas listas.
- `tiposGestion` manda demasiado a `Gestiones Admin`.
- `reportarPago()` fuerza `Gestiones Admin`.
- solicitudes de portal no mapean tipo → lista destino específica.

### Dónde se pierde el adjunto

- Reporte de pago guarda `soporteNombre` en `cobros`, pero no crea `documentos` ni `documentoIds[]`.
- `solicitarGestion()` guarda adjuntos demo dentro de la gestión, sin persistencia documental real.

### Dónde se pierde comunicación/trazabilidad

- no hay `notificaciones[]` en gestión;
- no hay `estadoCliente`/`estadoAsesor`;
- no hay matriz única de audiencia;
- las notificaciones al asesor no siempre usan email/teléfono del asesor;
- no hay confirmación persistente para cliente más allá de actividad/toast.

## 11. Fix para Claude/frontend

Claude debe corregir visual/UX sin tocar backend protegido:

1. Agregar listas/filtros de Ops por tipo:
   - Pagos reportados / Conciliación;
   - Documentos / Soportes;
   - Siniestros / Reclamos;
   - Cancelaciones / Retención;
   - Pólizas / Emisión / Endosos;
   - Soporte Portal;
   - Urgentes / Escaladas.
2. Cambiar `reportarPago()` para no crear gestión en `Gestiones Admin`, sino en `Pagos reportados / Conciliación`.
3. Mostrar estado de recepción/revisión al cliente.
4. Mostrar soporte/adjunto en Cobros/Ops cuando exista.
5. Separar visualmente estados internos, estado cliente y estado asesor.
6. No afirmar envío real por WhatsApp/correo si integración no está conectada; usar estado honesto.

## 12. Fix backend para ChatGPT/Codex

1. Crear contrato canónico de colección `gestiones` ampliado.
2. Crear matriz de ruteo tipo → listaDestino → responsableRol → audiencia.
3. Crear validador/smoke que bloquee `pago_reportado` en `Gestiones Admin`.
4. Definir relación:
   - `gestiones.documentoIds[]`;
   - `gestiones.conciliacionId`;
   - `conciliacionBanco.gestionId`;
   - `notificaciones.gestionId`.
5. Unificar eventos de notificación en una colección/contrato `notificaciones`.
6. Preparar Storage/Documentos LAB cuando Auth/tenant/store real estén listos.

## 13. Impacto en manuales y Academia

Debe actualizarse:

- Manual Ops;
- Manual Portal Cliente;
- Manual Cobros;
- Manual Cliente360;
- ruta Cliente nuevo;
- ruta Asesor nuevo;
- ruta Administrativo/Operativo;
- evaluación sobre reporte de pagos, solicitudes y trazabilidad;
- notificación de actualización de Academia.

## 14. Decisión

El hallazgo es válido. Se debe corregir en dos carriles:

- Claude/frontend: clasificación visual, listas, copy y ruteo del prototipo sin tocar backend protegido.
- ChatGPT/Codex/backend: contratos de `gestiones`, `notificaciones`, `documentos`, `conciliacionBanco` y validadores.

No se debe mover a Firestore ni Storage real hasta cerrar contratos y smoke local.
