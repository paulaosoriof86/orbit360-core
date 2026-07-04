# Especificación validador — Ops, Portal, Cliente360 y gestiones

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
Estado: especificación técnica. No ejecutable desde esta sesión por bloqueo del conector. Sin Firestore. Sin deploy. Sin merge. Sin datos reales.

## 1. Objetivo

Crear un validador seguro de anti-regresiones para revisar el flujo:

```txt
Portal reporta pago -> Cliente360/Pagos muestra pendiente aprobación -> Cobros/Conciliación revisa -> Ops enruta -> Asesor/cliente reciben notificación -> todo queda trazado
```

## 2. Archivos a escanear

- `orbit360-platform/modules/portal.js`
- `orbit360-platform/modules/cliente360.js`
- `orbit360-platform/modules/cobros.js`
- `orbit360-platform/modules/ops.js`
- `orbit360-platform/core/ciclo.js`
- `orbit360-platform/core/config.js`
- `orbit360-platform/core/notify.js`
- `orbit360-platform/data/seed.js`

## 3. Bloqueantes que debe detectar

### VAL-P0-01 — Pago reportado en Gestiones Admin

Fallar si `reportarPago()` crea gestión con:

```txt
lista: Gestiones Admin
tipo: Validar pago reportado
```

Esperado:

```txt
listaDestino: conciliacion_cobros
lista visible: Pagos reportados / Conciliación
```

### VAL-P0-02 — Pago reportado sin estado de aprobación

Fallar si el reporte de pago no declara o prepara:

- `estadoAprobacionPago`;
- `pendiente_aprobacion`;
- `estadoConciliacion`;
- `pendiente_conciliacion`.

### VAL-P0-03 — Cliente360 no muestra pago reportado pendiente

Fallar o marcar revisión si `modules/cliente360.js` no muestra en Recibos/Pagos:

- `reportado`;
- `soporteNombre`;
- `estadoAprobacionPago`;
- `estadoConciliacion`;
- `pendiente_aprobacion`;
- `pendiente_conciliacion`.

### VAL-P0-04 — Soporte sin documento

Fallar si Portal usa `soporteNombre` pero no crea/prepara:

- `documentoId`;
- `documentoIds[]`;
- `documentos`;
- `adjuntos`.

### VAL-P0-05 — Pago reportado sin conciliación

Fallar si Portal no crea/prepara:

- `conciliacionBanco`;
- `conciliacionId`;
- `pendiente_conciliacion`.

## 4. Revisión P1 que debe detectar

### VAL-P1-01 — Ops con listas insuficientes

Marcar revisión si faltan listas/filtros para:

- Pagos reportados / Conciliación;
- Documentos / Soportes;
- Siniestros / Reclamos;
- Cancelaciones / Retención;
- Pólizas / Emisión / Endosos;
- Soporte Portal;
- Urgentes / Escaladas.

### VAL-P1-02 — Modelo de gestión incompleto

Marcar revisión si `core/ciclo.js` no prepara:

- `tipoGestion`;
- `listaDestino`;
- `moduloDestino`;
- `solicitanteTipo`;
- `responsableRol`;
- `estadoCliente`;
- `estadoAsesor`;
- `documentoIds[]`;
- `conciliacionId`;
- `notificaciones[]`.

### VAL-P1-03 — Notificaciones sin audiencia formal

Marcar revisión si no se detecta estructura de:

- audiencia;
- destinatarioRol;
- asesorId;
- estadoEnvio;
- canal;
- trazabilidad.

## 5. Salida esperada

El validador debe generar reportes en `_orbit360_reports`:

```txt
VALIDACION-OPS-PORTAL-CLIENTE360-GESTIONES-AYS-<timestamp>.json
VALIDACION-OPS-PORTAL-CLIENTE360-GESTIONES-AYS-<timestamp>.txt
```

Con decisión:

- `OK`;
- `REQUIERE_REVISION`;
- `BLOQUEADO`.

## 6. Restricciones

- Solo lectura.
- No Firestore.
- No Storage.
- No `Orbit.store` writes.
- No datos reales.
- No deploy.
- No merge.

## 7. Estado

Especificación documentada. El ejecutable debe crearse después desde Codex/local o cuando el conector permita subir scripts sin bloqueo.
