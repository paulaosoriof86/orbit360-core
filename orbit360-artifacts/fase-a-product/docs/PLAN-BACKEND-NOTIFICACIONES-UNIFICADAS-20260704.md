# Plan backend — notificaciones unificadas

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
Estado: plan backend. Sin Firestore real. Sin deploy. Sin merge. Sin datos reales.

## 1. Objetivo

Preparar el bloque de backend para unificar notificaciones, avisos, actividades, toasts, alertas topbar, portal y Academia.

## 2. Problema actual

En la candidata v1.123 se detectan varias capas separadas:

- `core/notify.js`;
- `core/ciclo.js` con `avisos`;
- `modules/portal.js` con notificaciones del portal;
- actividades y bitácoras por módulo.

Esto dificulta saber:

- si el asesor fue notificado;
- si el cliente recibió retroalimentación;
- si el canal era real o preparado;
- si la notificación fue leída;
- qué entidad originó el aviso;
- si existe trazabilidad completa.

## 3. Contratos relacionados

- `CONTRATO-COLECCION-NOTIFICACIONES-LAB-AYS-20260704.md`
- `MATRIZ-EVENTOS-AUDIENCIAS-CANALES-NOTIFICACIONES-AYS-20260704.md`
- `CONTRATO-PLANTILLAS-COMUNICACION-TENANT-AYS-20260704.md`

## 4. Entidades sugeridas

- `notificaciones`
- `notificacionEventos`
- `notificacionPlantillas`
- `notificacionPreferencias`
- `notificacionEntregas`
- `plantillasComunicacion`

## 5. Dependencias

- Auth/usuarios/roles/tenant;
- matriz cliente-asesor;
- configuración de canales por tenant;
- estado real de integraciones;
- permisos por rol;
- contratos de gestiones/documentos/conciliacionBanco;
- PWA/topbar.

## 6. Fases recomendadas

### Fase 1 — Contrato y auditoría

- documentar contrato;
- auditar llamadas actuales a `notify`, `avisos`, `notifs`, `actividades`;
- identificar duplicados y huecos.

### Fase 2 — Normalización frontend/prototipo

- mostrar estados honestos;
- centralizar visualmente topbar/notificaciones;
- separar notificación interna vs canal externo;
- preparar plantillas.

### Fase 3 — Backend LAB

- crear entidad `notificaciones` con tenant isolation;
- guardar eventos de prueba ficticios;
- validar audiencia/canal/estado;
- smoke de pago reportado, solicitud portal, datos faltantes e invitación portal.

### Fase 4 — Integraciones reales

- correo;
- WhatsApp/Make;
- preferencias por usuario;
- entregas reales;
- reintentos;
- métricas.

## 7. Flujos mínimos para smoke futuro

1. Cliente reporta pago:
   - cliente recibe confirmación;
   - asesor recibe aviso;
   - Cobros/Operativo recibe tarea;
   - Ops ve gestión;
   - Cliente360 conserva historial.

2. Cliente solicita gestión:
   - cliente recibe confirmación;
   - asesor recibe aviso;
   - Ops recibe gestión clasificada;
   - notificación cambia cuando se resuelve.

3. Calidad solicita datos faltantes:
   - cliente recibe solicitud;
   - asesor recibe aviso;
   - solicitud queda trazada;
   - respuesta actualiza estado.

4. Invitación portal:
   - cliente recibe enlace/preparación;
   - asesor recibe aviso;
   - estado invitado/activado queda trazado.

5. Academia:
   - curso asignado;
   - manual actualizado;
   - evaluación pendiente;
   - certificado emitido.

## 8. Anti-regresiones

No permitir:

- notificación sin audiencia;
- canal externo marcado como enviado si no está conectado;
- evento de cliente sin asesor cuando existe asesor relacionado;
- solicitud de Portal sin retroalimentación al cliente;
- pago reportado sin aviso a Cobros/asesor;
- cambio de estado sin bitácora/notificación;
- plantilla hardcodeada no configurable por tenant.

## 9. Impacto en manuales y Academia

Actualizar:

- manual Notificaciones/Topbar;
- manual Portal;
- manual Ops;
- manual Cobros;
- manual Cliente360;
- manual Calidad de Datos;
- manual Integraciones;
- ruta Cliente nuevo;
- ruta Asesor nuevo;
- ruta Administrativo/Operativo;
- ruta Superadmin/IT;
- evaluaciones sobre comunicación y trazabilidad.

## 10. Siguiente auditoría técnica

Auditar candidata activa v1.123:

- `core/notify.js`;
- `core/ciclo.js`;
- `modules/notificaciones.js`;
- `modules/portal.js`;
- `modules/cliente360.js`;
- `modules/cobros.js`;
- `modules/ops.js`;
- `data/seed.js`.

Resultado esperado:

```txt
NOTIFICACIONES-UNIFICADAS-DIAGNOSTICO
- capas actuales:
- eventos cubiertos:
- eventos faltantes:
- duplicidades:
- canales simulados:
- riesgos:
- pendientes Claude:
- pendientes backend:
- impacto Academia/manuales:
```

## 11. Estado

Plan creado. No implementa notificaciones reales ni modifica backend protegido.
