# Hotfix portal/siniestros/automatizaciones/plantillas v1330 — 2026-07-07

## Estado

```txt
Repo: paulaosoriof86/orbit360-core
Rama: ays/backend-tenant-lab-v99-20260703
PR: #5 draft/open
Merge: no
Deploy: no
Main: no tocado
```

## Motivo

Codex aplicó localmente el hotfix pero quedó bloqueado antes de `git add` por límite/aprobaciones. Como no hubo commit remoto, ChatGPT aplicó el hotfix manualmente en GitHub, de forma quirúrgica y sin tocar backend protegido.

## Archivos modificados en GitHub

```txt
orbit360-platform/modules/portal.js
orbit360-platform/modules/siniestros.js
orbit360-platform/modules/automatizaciones.js
orbit360-platform/modules/plantillas.js
orbit360-platform/docs/HOTFIX-PORTAL-SINIESTROS-AUTOMATIZACIONES-PLANTILLAS-V1330-20260707.md
```

## Commits aplicados desde ChatGPT

```txt
0e432e76ba36077e826af1ed3bfebef41d2a9bad — portal
56f3ece12ab1d4af33c18290372a745de555ce83 — siniestros
009b54afc5cbff855dc084c0a5df6e2c2fb9e97c — automatizaciones
15f6224754ecafed538a4d36bf7ecca70f43a9b0 — plantillas
```

Este documento queda como cierre del bloque.

## Cambios aplicados

### Portal

Archivo:

```txt
orbit360-platform/modules/portal.js
```

Cambios:

- Se agregó helper `esPolizaActivaPortal()`.
- El portal muestra como activas solo pólizas `Vigente` o `Por renovar`.
- Reportar pago ya no crea gestión con fecha fija; usa `Orbit.ui.today()`.
- Admin notificación ya no afirma envío por WhatsApp/correo; registra en portal y aclara canal pendiente.
- Soporte al asesor usa teléfono/WhatsApp del asesor, no del cliente.
- Si el asesor no tiene teléfono, muestra `Canal pendiente de configuración`.
- Subir documento ya no afirma carga real del binario; registra metadata y deja `archivoPendienteStorage: true`.
- La solicitud desde portal aclara que WhatsApp/correo quedan pendientes de canal conectado.

### Siniestros

Archivo:

```txt
orbit360-platform/modules/siniestros.js
```

Cambios:

- KPI `Indemnización pagada` normaliza moneda con `q.norm(...)` usando moneda del cliente/reclamo.
- El pie del KPI aclara `normalizado / no mezclar monedas`.
- Al marcar `Aprobado` o `Pagado`, si no existe `montoAprobado`, ya no asume `montoAprobado = montoReclamado`.
- En ese caso marca `montoAprobadoPendiente: true` y registra bitácora `Monto aprobado pendiente de confirmar`.
- Nuevo reclamo usa fecha viva `Orbit.ui.today()` en bitácora.

### Automatizaciones

Archivo:

```txt
orbit360-platform/modules/automatizaciones.js
```

Cambios:

- Escaneo manual cambió de campañas/enviadas/notificado a eventos preparados/registrados.
- Toast final aclara que el envío real depende del proveedor conectado.
- Registro de disparos usa etiqueta `últimos eventos registrados`.
- Test de webhook registra evento de prueba; no afirma entrega confirmada por proveedor.

### Plantillas

Archivo:

```txt
orbit360-platform/modules/plantillas.js
```

Cambios:

- WhatsApp valida cliente y teléfono.
- Registra actividad `Mensaje de plantilla preparado`.
- Detalle: `WhatsApp Web abierto`.
- Toast: `Chat abierto en WhatsApp Web; confirma el envío en WhatsApp.`
- No afirma mensaje entregado.

## Validaciones

No se pudieron ejecutar `node --check` desde el conector GitHub. Antes de demo ejecutiva o producción debe correr validación local:

```bash
node --check orbit360-platform/modules/portal.js
node --check orbit360-platform/modules/siniestros.js
node --check orbit360-platform/modules/automatizaciones.js
node --check orbit360-platform/modules/plantillas.js
node tools/orbit360-validar-backend-lab-contrato.mjs
```

Búsqueda obligatoria posterior:

```bash
grep -R "2026-06-26\|2026-06-24\|campaña enviada\|notificado al equipo\|Notificación enviada\|se envía por WhatsApp/correo" orbit360-platform/modules/portal.js orbit360-platform/modules/siniestros.js orbit360-platform/modules/automatizaciones.js orbit360-platform/modules/plantillas.js
```

## Protegidos

No se tocaron intencionalmente archivos backend protegidos:

```txt
orbit360-platform/data/store.js
orbit360-platform/data/store-firestore-lab.local.js
orbit360-platform/core/backend-lab-loader.js
orbit360-platform/core/backend-lab-init.js
orbit360-platform/core/backend-lab-security-guard.js
orbit360-platform/core/auth.js
orbit360-platform/core/importa.js
firestore.rules
tools/orbit360-*
```

## Impacto Claude / prototipo reutilizable

Aplica a Claude/prototipo: Sí.

Patrones a conservar:

```txt
Portal: reportar pago no aplica pago.
Portal: documento subido registra soporte/revisión, no carga real sin Storage/backend.
Siniestros: reclamado ≠ aprobado ≠ pagado.
Automatizaciones: preparado/registrado ≠ enviado por proveedor.
Plantillas: WhatsApp Web abierto ≠ mensaje entregado.
Pólizas activas en portal: solo Vigente / Por renovar.
```

## Impacto Academia

Agregar/reforzar cápsulas:

```txt
Portal del cliente: reportes no aplican pagos.
Portal del cliente: documentos son soporte/revisión.
Siniestros: reclamado, aprobado y pagado son estados/montos distintos.
Automatizaciones: evento preparado vs envío real confirmado.
Plantillas: comunicación preparada vs entrega confirmada.
```

## Estado

```txt
Hotfix aplicado en GitHub por ChatGPT.
Pendiente validación local con node --check.
Pendiente smoke visual posterior.
```
