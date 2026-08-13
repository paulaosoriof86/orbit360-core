# Auditoría bloque Ops/Leads/Portal/Siniestros/Plantillas/Automatizaciones post-v1330 — 2026-07-07

## Estado

```txt
Repo: paulaosoriof86/orbit360-core
Rama: ays/backend-tenant-lab-v99-20260703
PR: #5 draft/open
Merge: no
Deploy: no
Main: no tocado
```

## Archivos revisados

```txt
orbit360-platform/modules/ops.js
orbit360-platform/modules/leads.js
orbit360-platform/core/ciclo.js
orbit360-platform/modules/plantillas.js
orbit360-platform/modules/automatizaciones.js
orbit360-platform/modules/portal.js
orbit360-platform/modules/siniestros.js
```

## Resultado ejecutivo

No se detectó P0 de backend protegido ni escritura directa a backend protegido.

Sí se detectaron P1/P2 importantes de honestidad operativa, fechas vivas y reglas comerciales reutilizables:

```txt
P1 — Portal incluye pólizas no canceladas, pero puede mostrar Vencida/Anulada/Rechazada/Requiere validación como activas.
P1 — Portal reportar pago crea gestión con fecha fija 2026-06-26.
P1 — Portal admin dice que la notificación se envía por WhatsApp/correo, pero solo registra notificación in-app.
P1 — Portal soporte al asesor usa teléfono del cliente en wa.me, no teléfono del asesor.
P1 — Siniestros suma indemnización pagada sin normalización de moneda.
P1 — Siniestros al marcar Aprobado/Pagado puede asumir monto aprobado = monto reclamado.
P1 — Siniestros nuevo reclamo usa fecha fija 2026-06-24 en bitácora.
P1 — Automatizaciones escaneo manual registra campañas enviadas/notificado al equipo aunque no hay proveedor confirmado.
P2 — Plantillas abre wa.me directamente sin registrar estado preparado/abierto ni validar teléfono.
```

---

## Ops / Leads / Ciclo — validaciones positivas

Archivos:

```txt
orbit360-platform/modules/ops.js
orbit360-platform/modules/leads.js
orbit360-platform/core/ciclo.js
```

Validado:

- Ops y Leads comparten ciclo mediante `Orbit.ciclo`.
- Un negocio es un solo registro proyectado en dos tableros.
- Ops es vista interna del equipo; asesor ve Leads.
- Hay eventos de sincronización `orbit:ciclo`, `orbit:pais` y `orbit:session`.
- Las etapas canónicas están centralizadas.
- Gestiones administrativas viven solo en Ops, no como prospectos.
- Fechas del motor usan helper vivo `today()` / `stamp()` en el flujo principal.

Riesgo controlado:

- Al pasar negocio a `emitido`, `core/ciclo.js` crea cliente automáticamente. Esto es parte del flujo comercial y no viene de documentos, banco o financiero histórico.
- Debe conservarse como flujo comercial explícito, no como inferencia desde fuentes migradas.

Pendiente futuro:

- Cuando se conecte backend real, emisión debería crear cliente + oportunidad cerrada + proceso de emisión/póliza según confirmación, con diff/resumen si proviene de documentos.

## Plantillas — validaciones y pendiente

Archivo:

```txt
orbit360-platform/modules/plantillas.js
```

Validado:

- Plantillas viven en `Orbit.store('plantillas')`.
- Variables se resuelven con datos reales de cliente/póliza/cobro/asesor.
- Redacción de correo se enruta al módulo `correo`.

Pendiente P2:

- El botón WhatsApp abre `wa.me` directo y no registra estado `preparado/abierto` ni actividad de comunicación.
- Debe alinearse con `Orbit.notify` para no afirmar envío real y dejar trazabilidad.

Corrección recomendada:

```txt
Usar Orbit.notify.pedir/cliente o el patrón de Notificaciones:
wa.me abierto / correo preparado / entrega confirmada solo por proveedor.
```

## Automatizaciones — validaciones y pendiente

Archivo:

```txt
orbit360-platform/modules/automatizaciones.js
```

Validado:

- Separa `pago_aplicado` de `pago_reportado`.
- El test de IA dice clave detectada pendiente de activación técnica.
- Comparador IA es honesto: ningún proveedor preseleccionado.

Pendiente P1:

- En `Escanear y notificar`, los mensajes dicen:

```txt
campaña de cobro enviada
campaña enviada
notificado al equipo
recordatorio al asesor
```

sin confirmar proveedor/backend.

Corrección recomendada:

```txt
campaña preparada
evento registrado para Make
pendiente de conexión/proveedor
```

No debe registrarse como enviado real hasta confirmación de Make/WhatsApp/correo.

## Portal — hallazgos P1

Archivo:

```txt
orbit360-platform/modules/portal.js
```

### P1 — pólizas activas por filtro laxo

Hallazgo:

```js
const pols = q.polizasDe(clienteId).filter(p => p.estado !== 'Cancelada');
```

Riesgo:

Puede mostrar como activas pólizas:

```txt
Vencida
Anulada
Rechazada
Requiere validación
```

Corrección recomendada:

```js
const esVigentePortal = p => p.estado === 'Vigente' || p.estado === 'Por renovar';
const pols = q.polizasDe(clienteId).filter(esVigentePortal);
```

Si se quieren mostrar históricas, crear pestaña/estado separado: `Histórico`.

### P1 — reportar pago crea gestión con fecha fija

Hallazgo:

```js
vence: '2026-06-26'
```

Riesgo:

Fecha quemada en flujo operativo. Debe usar fecha viva:

```js
vence: Orbit.ui.today()
```

o regla configurable de SLA.

### P1 — admin notificación afirma envío por WhatsApp/correo

Hallazgo:

La UI dice que la notificación aparece en portal y se envía por WhatsApp/correo, pero el código solo inserta en `notifs`.

Corrección recomendada:

```txt
La notificación aparecerá en el portal. WhatsApp/correo quedan pendientes de integración/conexión.
```

Toast:

```txt
Notificación registrada en portal
```

### P1 — soporte asesor usa teléfono del cliente

Hallazgo:

```js
const wa = (cli.telefono || '').replace(/\D/g, '');
```

El botón “Tu asesor / WhatsApp” debería usar teléfono/WhatsApp del asesor, no el del cliente.

Corrección recomendada:

```js
const wa = String((ase && (ase.telefono || ase.whatsapp)) || '').replace(/\D/g, '');
```

Si no hay teléfono del asesor, mostrar `Canal pendiente de configuración`.

### P1 — documento subido no guarda binario real

El portal registra metadata de documento, pero no carga archivo a Storage/backend real.

Debe decir:

```txt
Documento registrado en expediente; carga real de archivo pendiente de Storage/backend.
```

mientras no exista storage conectado.

## Siniestros — hallazgos P1

Archivo:

```txt
orbit360-platform/modules/siniestros.js
```

### P1 — indemnización pagada suma sin normalizar moneda

Hallazgo:

```js
const pagado = arr.filter(r => r.estado === 'Pagado').reduce((s, r) => s + (r.montoAprobado || 0), 0);
```

Riesgo:

Puede sumar GTQ y COP crudo si se muestra con moneda actual.

Corrección recomendada:

- Separar por país/moneda, o
- usar normalización explícita y etiqueta clara, o
- mostrar KPIs por país.

### P1 — al aprobar/pagar asume monto aprobado igual al reclamado

Hallazgo:

```js
if (['Aprobado', 'Pagado'].includes(nuevoEst) && !r.montoAprobado) patch.montoAprobado = r.montoReclamado;
```

Riesgo:

Puede falsear indemnización aprobada. Aprobado/pagado no siempre equivale a reclamado.

Corrección recomendada:

- Pedir monto aprobado si el usuario marca Aprobado/Pagado.
- Si no se captura, dejar `montoAprobado` en 0/null y mostrar `monto pendiente de confirmar`.

### P1 — nuevo reclamo usa fecha fija en bitácora

Hallazgo:

```js
ts: '2026-06-24 ' + new Date().toTimeString().slice(0, 5)
```

Corrección recomendada:

```js
ts: Orbit.ui.today() + ' ' + new Date().toTimeString().slice(0, 5)
```

## Impacto Claude / prototipo reutilizable

- Patrón reusable detectado: estados honestos en portal/comunicaciones, fechas vivas, pólizas activas vs históricas, siniestros con moneda/monto aprobado confiable.
- Debe compartirse con Claude: Sí.
- Módulos impactados:

```txt
portal
siniestros
plantillas
automatizaciones
ops
leads
academia
cliente360
polizas
correo
notificaciones
```

- Texto/estado UI requerido:

```txt
Portal registrado
Comunicación preparada
Canal pendiente de conexión
Documento registrado / carga real pendiente
Pólizas activas
Histórico de pólizas
Monto aprobado pendiente de confirmar
Evento registrado para automatización
```

- Academia impactada:

```txt
Portal cliente: reportar pago no aplica pago.
Portal cliente: subir documento registra soporte, no valida datos automáticamente.
Siniestros: reclamado vs aprobado vs pagado.
Automatizaciones: evento preparado vs enviado por proveedor.
Ops/Leads: negocio emitido crea cliente solo por flujo comercial explícito.
```

## Hotfix recomendado

Estos puntos sí son pequeños, pero tocan archivos de tamaño medio y conviene validarlos con `node --check` local.

Paquete recomendado:

```txt
fix(ays): honestidad portal siniestros automatizaciones plantillas v1330
```

Cambios:

1. Portal: filtrar pólizas activas solo `Vigente`/`Por renovar`.
2. Portal: cambiar fecha fija `2026-06-26` por `Orbit.ui.today()` o SLA configurable.
3. Portal: adminNotif no debe decir que envía WhatsApp/correo.
4. Portal: WhatsApp del asesor debe usar teléfono del asesor.
5. Portal: subir documento debe decir registrado/carga real pendiente si no hay Storage.
6. Siniestros: no sumar monedas crudas en KPI indemnización pagada.
7. Siniestros: no asumir aprobado = reclamado.
8. Siniestros: quitar fecha fija `2026-06-24`.
9. Automatizaciones: escaneo manual registra campañas preparadas, no enviadas.
10. Plantillas: WhatsApp debe usar patrón preparado/abierto con trazabilidad.

## Estado

```txt
Bloque auditado.
Sin P0 backend protegido.
Con P1 de honestidad operativa/fechas vivas/monedas para hotfix siguiente.
```
