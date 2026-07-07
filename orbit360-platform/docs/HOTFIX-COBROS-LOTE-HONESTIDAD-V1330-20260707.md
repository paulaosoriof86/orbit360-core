# Hotfix — Cobros lote honestidad v1330

Fecha: 2026-07-07
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open

## Problema

`orbit360-platform/modules/cobros.js`, función `lote()`, afirmaba envío real de recordatorios por WhatsApp/correo.

Eso contradecía la regla transversal:

```txt
Preparar no es enviar.
Correo/WhatsApp real requiere canal conectado y confirmación del proveedor.
```

## Cambios funcionales aplicados

Archivo modificado:

```txt
orbit360-platform/modules/cobros.js
```

Cambios:

- `Notificar por lote` -> `Preparar lote`.
- Título del drawer -> `Preparación de cobro por lote`.
- Nota del drawer ahora indica que se preparan recordatorios y que el envío real requiere canal conectado.
- `Enviar recordatorios` -> `Preparar recordatorios`.
- Actividad registrada: `Recordatorio de cobro preparado`.
- Detalle de actividad: `Pendiente de canal conectado`.
- Estado en cobro: `recordatorioPreparado`.
- Toast final: `recordatorios preparados; envío real requiere canal conectado`.

## Decisión sobre `Orbit.correo.enviar`

Se conserva la llamada a `Orbit.correo.enviar(...)` porque la capa central de Correo ya diferencia cuenta conectada/proveedor real vs correos preparados en bandeja.

Desde Cobros, la interpretación es:

```txt
Cobros prepara el recordatorio.
Correo central gestiona si queda preparado o si existe canal real conectado.
Cobros no afirma entrega real.
```

## Evidencia remota

El archivo remoto ahora muestra:

- botón superior `Preparar lote`;
- modal `Preparación de cobro por lote`;
- botón `Preparar recordatorios`;
- actividad `Recordatorio de cobro preparado`;
- campo `recordatorioPreparado`;
- toast honesto.

## Validación

Validación posible desde ChatGPT/GitHub:

- archivo actualizado en rama correcta;
- líneas críticas verificadas remotamente;
- backend protegido no tocado;
- `index.html` no tocado;
- no merge;
- no deploy.

Validación pendiente cuando haya entorno local controlado:

```txt
node --check orbit360-platform/modules/cobros.js
node tools/orbit360-validar-backend-lab-contrato.mjs
```

No se debe marcar como deployable hasta ejecutar validación local/smoke.

## Impacto Academia

Academia debe enseñar:

- Preparar lote no confirma envío.
- WhatsApp/correo reales requieren canal conectado.
- La actividad queda como recordatorio preparado.
- Cobros confirmados, pagos reportados, pagos validados y pagos conciliados son estados distintos.

## Impacto Claude/prototipo

Claude debe conservar:

- `Preparar lote`.
- `Preparar recordatorios`.
- `Recordatorio de cobro preparado`.
- No usar `enviado` ni `WhatsApp + correo` como hecho consumado sin proveedor confirmado.

## Estado

Hotfix funcional aplicado desde GitHub.
Pendiente validación local/smoke.

No se tocó backend protegido.
No se tocó `index.html`.
No merge.
No deploy.
No datos reales.
No secretos.
