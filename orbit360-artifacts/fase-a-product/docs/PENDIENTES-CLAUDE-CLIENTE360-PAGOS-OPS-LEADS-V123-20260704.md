# Pendientes Claude — Cliente360/Pagos, Ops, Leads y listas útiles v1.123

Fecha: 2026-07-04
Base: `Prototype Development Request - 2026-07-04T152321.882.zip`
Estado: pendientes frontend/prototipo. No tocar backend protegido.

## Regla general

Claude puede crear listas, vistas, filtros, tabs o KPIs adicionales en Ops, Leads o cualquier módulo si el flujo lo requiere. Las listas actuales del prototipo no son una limitación.

No tocar:

- `data/store.js`
- `data/store-firestore-lab.local.js`
- `core/backend-lab-*`
- `firestore.rules`
- `tools/orbit360-*`

## P0-C360-01 — Pago reportado debe aparecer en Cliente360/Pagos

### Actual

Cuando el cliente reporta un pago desde Portal, no queda visible en la ficha Cliente360 / Recibos y pagos como pendiente de aprobación.

### Esperado

En Cliente360 / Recibos y pagos debe aparecer:

- recibo/cuota reportada;
- badge `Pago reportado`;
- estado `Pendiente de aprobación` o `Pendiente de conciliación`;
- soporte o nombre de soporte;
- fecha del reporte;
- nota del cliente;
- gestión relacionada si existe;
- enlace/acción a Cobros/Ops si aplica.

No marcar como pagado hasta validación.

## P0-C360-02 — Cliente360 debe mostrar trazabilidad del pago reportado

Debe existir detalle o actividad visible con:

- origen: Portal del Cliente;
- usuario/cliente que reportó;
- fecha/hora;
- asesor relacionado;
- estado de revisión;
- comentario;
- soporte.

## P0-OPS-01 — Pago reportado no debe ir a Gestiones Admin

Debe ir a una lista específica:

```txt
Pagos reportados / Conciliación
```

o equivalente configurado.

## P0-OPS-02 — Notificación al asesor

Cuando el cliente reporta pago o solicita gestión, el asesor relacionado debe recibir notificación interna visible. Si WhatsApp/correo no están conectados, debe indicarse honestamente `notificación interna registrada / pendiente de conexión`.

## P1-OPS-03 — Crear listas útiles sin limitarse al prototipo actual

Agregar listas/filtros/tabs si el flujo lo requiere:

- Pagos reportados / Conciliación;
- Documentos / Soportes;
- Datos de cliente;
- Pólizas / Emisión / Endosos;
- Renovaciones;
- Cancelaciones / Retención;
- Siniestros / Reclamos;
- Soporte Portal;
- Requerimientos de aseguradora;
- Urgentes / Escaladas;
- Vencidas / fuera de SLA.

## P1-LEADS-01 — Leads también puede ampliar etapas

Si el flujo comercial lo requiere, Leads puede tener etapas adicionales:

- Diagnóstico;
- Cotizando;
- Comparativo enviado;
- Propuesta enviada;
- Seguimiento;
- Negociación;
- Inspección / requisitos;
- Emisión solicitada;
- Recontactar;
- Referidos / oportunidades relacionadas.

No forzar todo dentro de pocas etapas si se pierde trazabilidad comercial.

## P1-MODULOS-01 — Cualquier módulo puede crear vistas adicionales útiles

Si Cobros, Cliente360, Aseguradoras, Portal, Finanzas, Marketing, Siniestros o Renovaciones necesitan sublistas, filtros o vistas para operar mejor, se deben crear y documentar.

Criterios:

- responsable distinto;
- SLA distinto;
- notificación propia;
- estado distinto para cliente/asesor;
- afecta póliza, cobro, documento, siniestro o renovación;
- se requiere KPI o reporte;
- se pierde trazabilidad si queda genérico.

## P1-ACADEMIA-01 — Actualizar manuales y Academia

Actualizar o registrar pendiente en:

- manual Cliente360;
- manual Cobros;
- manual Ops;
- manual Leads si cambian etapas;
- ruta Cliente nuevo;
- ruta Asesor nuevo;
- ruta Administrativo/Operativo;
- evaluación sobre reporte de pagos, aprobación, conciliación y seguimiento.

## Criterio de aceptación

- pago reportado aparece en Portal, Cliente360/Pagos, Cobros y Ops;
- estado visible: pendiente de aprobación/conciliación;
- soporte visible como adjunto/documento demo;
- asesor notificado;
- cliente recibe retroalimentación;
- no se afirma envío real ni Storage real si no está conectado;
- no se toca backend protegido.
