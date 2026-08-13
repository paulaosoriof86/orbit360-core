# Parche local listo — Cobros lote honestidad v1330

Fecha: 2026-07-07
Rama objetivo: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open

## Estado

Parche preparado localmente y validado con:

```txt
node --check /mnt/data/cobros_hotfix_lote.js
Resultado: OK, sin errores de sintaxis.
```

No se ejecutó `node tools/orbit360-validar-backend-lab-contrato.mjs` en local porque la extracción disponible para este parche no contiene ese script.

## Base verificada

El archivo local usado como base coincide con el SHA remoto de `orbit360-platform/modules/cobros.js` antes del parche:

```txt
ecc8c39b3917c76b2d75d9ce84178bec28fa2d95
```

Por tanto, el parche es aplicable de forma segura sobre esa versión.

## Archivo a modificar

```txt
orbit360-platform/modules/cobros.js
```

## Reemplazos exactos aplicados localmente

### 1. Botón superior

Buscar:

```txt
📤 Notificar por lote
```

Reemplazar por:

```txt
📤 Preparar lote
```

### 2. Nota del modal de lote

Buscar:

```txt
Selecciona los recibos a notificar. Se envía <b>WhatsApp + correo</b> con mensaje generado por IA, queda en el <b>historial de cada cliente</b> y baja de acciones pendientes.
```

Reemplazar por:

```txt
Selecciona los recibos para preparar recordatorios. Se registran en el historial y se preparan correos en la bandeja central. WhatsApp/correo reales requieren canal conectado y confirmación del proveedor.
```

### 3. Botón de acción

Buscar:

```txt
📲 Enviar recordatorios
```

Reemplazar por:

```txt
📲 Preparar recordatorios
```

### 4. Actividad registrada

Buscar:

```txt
titulo: 'Recordatorio de cobro enviado'
```

Reemplazar por:

```txt
titulo: 'Recordatorio de cobro preparado'
```

### 5. Detalle de actividad

Buscar:

```txt
detalle: 'WhatsApp + correo · ' + (p ? p.numero : '') + ' · ' + U.money(c.monto, c.moneda)
```

Reemplazar por:

```txt
detalle: 'Pendiente de canal conectado · ' + (p ? p.numero : '') + ' · ' + U.money(c.monto, c.moneda)
```

### 6. Marca de estado del cobro

Buscar:

```txt
S().update('cobros', c.id, { notificado: Orbit.ui.today() });
```

Reemplazar por:

```txt
S().update('cobros', c.id, { recordatorioPreparado: Orbit.ui.today() });
```

### 7. Toast final

Buscar:

```txt
'✓ ' + sel.length + ' recordatorios enviados (WhatsApp + correo)'
```

Reemplazar por:

```txt
'✓ ' + sel.length + ' recordatorios preparados; envío real requiere canal conectado'
```

## Nota sobre `Orbit.correo.enviar`

El parche local conserva la llamada a `Orbit.correo.enviar(...)` porque en esta rama la capa central de Correo ya diferencia entre correos preparados y entrega real según cuenta/proveedor conectado.

Regla de interpretación:

```txt
Desde Cobros se prepara el recordatorio y queda registrado.
La entrega real depende de Correo central / OAuth / backend / proveedor conectado.
```

Si se desea una postura más estricta para lote masivo, el siguiente paso sería reemplazar la llamada a `Orbit.correo.enviar(...)` por una cola `recordatoriosPendientes` o por backend/Make, pero eso corresponde a una fase backend/integraciones y no a este hotfix visual de honestidad.

## Validaciones requeridas después de aplicar en repo

```txt
node --check orbit360-platform/modules/cobros.js
node tools/orbit360-validar-backend-lab-contrato.mjs
```

## Impacto Academia

Academia debe enseñar:

- Preparar lote no significa enviar lote.
- La bandeja central de Correo puede contener correos preparados.
- Entrega real requiere canal conectado.
- Pago reportado, validado, confirmado y conciliado son estados separados.

## Impacto Claude/prototipo

Claude debe conservar:

- `Preparar lote`, no `Enviar recordatorios`.
- `Recordatorio preparado`, no `Recordatorio enviado`.
- No afirmar WhatsApp/correo real sin proveedor conectado.

## Estado

Parche local listo. Pendiente de aplicación funcional en `cobros.js` remoto.

No se tocaron backend protegido, `index.html`, `main`, deploy, secretos ni datos reales.
