# Errata / pendiente — Cobros lote honestidad operativa v1330

Fecha: 2026-07-07
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open

## Motivo

Durante la auditoría post-hotfix del bloque lógico `Inicio -> Cliente360 -> Correo -> Portal -> Cobros`, se detectó una excepción al cierre `CIERRE-HONESTIDAD-OPERATIVA-V1330-20260707.md`.

Ese cierre queda vigente para los módulos ya validados, pero debe leerse con esta errata:

```txt
Cobros está alineado en estados individuales de reporte/validación/confirmación/conciliación.
Cobros NO está completamente alineado en la acción por lote `lote()`.
```

## Archivo afectado

```txt
orbit360-platform/modules/cobros.js
```

## Función afectada

```txt
lote()
```

## Hallazgo

La acción de notificación masiva de cobros todavía afirma ejecución real de canales y registra envío confirmado:

- Texto visible indica que se envía `WhatsApp + correo`.
- Botón visible: `Enviar recordatorios`.
- Actividad registrada: `Recordatorio de cobro enviado`.
- Toast final afirma recordatorios enviados.
- El flujo usa la capa de correo desde Cobros en vez de limitarse a preparación/historial honesto.

Esto contradice el patrón transversal ya aplicado:

```txt
Preparar no es enviar.
Abrir WhatsApp Web no confirma entrega.
Correo real requiere cuenta/OAuth/backend conectado.
WhatsApp/API real requiere proveedor conectado.
```

## Riesgo

Tipo: P1 operativo / honestidad comercializable.

Impacto:

- Puede inducir al usuario a creer que los recordatorios salieron realmente por WhatsApp/correo.
- Puede dejar historial de cliente con una entrega no confirmada.
- Puede reintroducir inconsistencia con Correo central, Notificaciones, Cliente360 y Portal.

## Hotfix requerido

Parche mínimo en `cobros.js`, dentro de `lote()`:

- `Notificar por lote` -> `Preparar lote`.
- Nota de lote debe decir que se preparan recordatorios y que el envío real requiere canal conectado.
- `Enviar recordatorios` -> `Preparar recordatorios`.
- Actividad: `Recordatorio de cobro enviado` -> `Recordatorio de cobro preparado`.
- Detalle: quitar `WhatsApp + correo` como hecho consumado.
- Toast: `recordatorios enviados` -> `recordatorios preparados; envío real requiere canal conectado`.
- No marcar entrega real ni bajar pendientes por una entrega no confirmada.

## Validaciones requeridas

```txt
node --check orbit360-platform/modules/cobros.js
node tools/orbit360-validar-backend-lab-contrato.mjs
```

## Impacto Academia

Agregar al módulo de Cobros/Cartera:

- `Preparar lote` genera seguimiento operativo.
- No confirma entrega por WhatsApp/correo.
- La entrega real requiere canal conectado y confirmación del proveedor.
- Pago reportado, pago validado, pago confirmado y pago conciliado son estados distintos.

## Impacto Claude/prototipo

Claude no debe reintroducir:

- `enviado` para recordatorios de cobro por lote si no hay proveedor confirmado.
- `WhatsApp + correo` como hecho consumado.
- Actividades con entrega confirmada cuando solo se preparó el recordatorio.

## Estado

Pendiente de hotfix funcional.

No se tocó código en esta errata para evitar reemplazar `cobros.js` completo desde conector sin reconstrucción segura.

## Archivos protegidos

No se tocaron backend protegido, `index.html`, `main`, deploy, secretos ni datos reales.
