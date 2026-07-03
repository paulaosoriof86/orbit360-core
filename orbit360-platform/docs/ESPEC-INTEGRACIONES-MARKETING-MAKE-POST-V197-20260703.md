# Especificación Integraciones Marketing + Make post v1.97 · Orbit 360

**Fecha:** 2026-07-03  
**Base:** Prototipo Claude v1.97  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Objetivo:** preparar integración real de Marketing sin hardcodear A&S y sin exponer secretos.

---

## 1. Decisión técnica

Orbit 360 no debe integrar cada proveedor directamente desde cada módulo. El módulo Marketing debe emitir eventos normalizados y la capa de integraciones debe decidir qué webhook o conector usar por tenant.

Regla:

- Los módulos no llaman APIs externas directamente.
- Los módulos llaman helper global de integraciones/eventos.
- Configuración define integraciones activas por tenant.
- Make es el puente inicial para conectar Metricool, Canva, Google Sheets, Mailchimp, Outlook/Gmail y WhatsApp/Green API.
- No se guardan secretos en frontend ni en GitHub.

---

## 2. Colección `integraciones`

Colección tenant-aware para configuración viva.

```js
{
  id,
  tenantId,
  proveedor,              // make | metricool | canva | google_sheets | mailchimp | outlook | gmail | green_api | whatsapp_cloud
  nombre,
  estado,                 // activo | inactivo | error | pendiente_configuracion
  modo,                   // webhook | oauth | manual | externo
  eventos,                // array de eventos habilitados
  webhookRef,             // referencia segura, nunca secreto plano en frontend
  scopes,
  paises,
  modulos,
  ultimaPruebaAt,
  ultimoError,
  createdAt,
  updatedAt
}
```

---

## 3. Colección `automatizaciones`

Debe guardar reglas de negocio por evento, no solo catálogo visual.

```js
{
  id,
  tenantId,
  evento,
  nombre,
  activo,
  proveedorPreferido,
  condicion,
  plantilla,
  canales,
  destinatarios,
  variables,
  reintentos,
  ultimoEnvioAt,
  ultimoEstado,
  ultimoError,
  createdAt,
  updatedAt
}
```

Eventos mínimos para Marketing:

- `marketing_contenido_creado`
- `marketing_pieza_solicitada`
- `marketing_programar_publicacion`
- `marketing_publicacion_programada`
- `marketing_metricas_actualizadas`
- `marketing_lead_generado`
- `marketing_sync_sheets`
- `marketing_campana_email`
- `marketing_whatsapp_broadcast`

---

## 4. Helper backend/frontend propuesto

Crear helper global futuro:

```js
Orbit.integraciones.emit(evento, payload, opts)
```

Contrato:

```js
{
  evento,
  tenantId,
  modulo,
  entidad,
  entidadId,
  datos,
  plantilla,
  canal,
  proveedorPreferido,
  metadata,
  createdAt
}
```

Comportamiento:

1. Valida tenant.
2. Lee configuración de `integraciones` y `automatizaciones`.
3. Registra evento en `eventosIntegracion`.
4. En demo, deja evento en store/log y muestra toast.
5. En backend LAB/producción, envía a Make/backend seguro.
6. Registra respuesta o error.

Colección de trazabilidad:

```js
{
  id,
  tenantId,
  evento,
  modulo,
  entidad,
  entidadId,
  proveedor,
  estado,                 // pendiente | enviado | confirmado | error
  requestResumen,
  responseResumen,
  error,
  createdAt,
  updatedAt
}
```

---

## 5. Eventos específicos

### 5.1 `marketing_programar_publicacion`

Uso: botón “Programar (Metricool)” en ficha de contenido.

```js
{
  evento: 'marketing_programar_publicacion',
  tenantId,
  modulo: 'marketing',
  entidad: 'contenidos',
  entidadId: contenido.id,
  proveedorPreferido: 'metricool',
  datos: {
    contenidoId,
    campanaId,
    titulo,
    copy,
    canal,
    fecha,
    hora,
    hashtags,
    cta,
    piezaIds,
    pais,
    publico,
    responsable
  },
  plantilla: 'marketing_programacion'
}
```

Resultado esperado:

- crea evento de integración;
- actualiza `contenidos.programacion.estado = pendiente/envia/confirmada`;
- si Make/Metricool confirma, pasa contenido a `Programado`;
- si falla, deja error visible en ficha.

---

### 5.2 `marketing_generar_pieza`

Uso: botón “Crear pieza (Canva)”.

```js
{
  evento: 'marketing_generar_pieza',
  tenantId,
  modulo: 'marketing',
  entidad: 'contenidos',
  entidadId: contenido.id,
  proveedorPreferido: 'canva',
  datos: {
    contenidoId,
    campanaId,
    titulo,
    copy,
    canal,
    tipo,
    formato,
    pais,
    marcaTenant,
    paletaTenant
  },
  plantilla: 'canva_marketing_post'
}
```

Resultado esperado:

- genera o solicita pieza;
- crea registro en `piezas`;
- guarda URL Canva/Drive cuando Make devuelva respuesta;
- no hardcodea logo A&S.

---

### 5.3 `marketing_sync_sheets`

Uso: importar/sincronizar calendario desde Google Sheets.

```js
{
  evento: 'marketing_sync_sheets',
  tenantId,
  modulo: 'marketing',
  proveedorPreferido: 'google_sheets',
  datos: {
    periodo,
    hoja,
    modo,             // importar | sincronizar | exportar
    destino: 'contenidos',
    mapeo,
    deduplicacion
  },
  plantilla: 'marketing_sync_sheets'
}
```

Resultado esperado:

- lee hoja configurada por tenant;
- mapea columnas a `contenidos`;
- deduplica por fecha + canal + título;
- no hardcodea calendario A&S;
- registra errores de columnas faltantes.

---

### 5.4 `marketing_campana_email`

Uso: lanzar campaña desde contenido/campaña.

```js
{
  evento: 'marketing_campana_email',
  tenantId,
  modulo: 'marketing',
  proveedorPreferido: 'mailchimp',
  datos: {
    campanaId,
    asunto,
    segmento,
    pais,
    htmlRef,
    contenidoIds,
    fechaEnvio
  },
  plantilla: 'mailchimp_campana'
}
```

Resultado esperado:

- Make arma campaña Mailchimp;
- devuelve ID de campaña;
- guarda trazabilidad;
- métricas posteriores vuelven por `marketing_metricas_actualizadas`.

---

### 5.5 `marketing_whatsapp_broadcast`

Uso: distribución por WhatsApp de contenido aprobado.

```js
{
  evento: 'marketing_whatsapp_broadcast',
  tenantId,
  modulo: 'marketing',
  proveedorPreferido: 'green_api',
  datos: {
    contenidoId,
    segmento,
    pais,
    mensajeTexto,
    link,
    responsable,
    canal: 'whatsapp'
  },
  plantilla: 'marketing_whatsapp'
}
```

Resultado esperado:

- WhatsApp siempre texto plano;
- Make/Green API ejecutan envío;
- se registra trazabilidad por lote;
- si el cliente responde, debe crear lead/gestión cuando exista integración de inbox.

---

### 5.6 `marketing_metricas_actualizadas`

Uso: Make o importador carga resultados de Metricool/Mailchimp/Sheets.

```js
{
  evento: 'marketing_metricas_actualizadas',
  tenantId,
  modulo: 'marketing',
  proveedorPreferido: 'metricool',
  datos: {
    contenidoId,
    piezaId,
    campanaId,
    canal,
    fecha,
    alcance,
    impresiones,
    interacciones,
    clics,
    leads,
    conversiones,
    raw
  }
}
```

Resultado esperado:

- crea registro en `metricasMarketing`;
- actualiza resumen en `contenidos.stats`;
- alimenta KPIs y recomendaciones Orbit IA.

---

## 6. Cambios que debe pedir a Claude

Para próxima iteración Claude:

1. Los botones Canva/Metricool no deben ser solo toast; deben llamar helper `Orbit.integraciones.emit(...)` si existe, con fallback demo si no existe.
2. Agregar estados de integración visibles en la ficha:
   - pendiente,
   - enviado,
   - confirmado,
   - error.
3. Mostrar enlace de pieza/Canva/Drive si existe.
4. Mostrar estado de programación Metricool si existe.
5. Agregar ficha diaria para agrupar contenidos, piezas, tareas y stats.
6. Mantener `Orbit.store`; no `localStorage` directo.
7. No hardcodear A&S ni calendarios reales.

---

## 7. Cambios que puede hacer ChatGPT/Codex

1. Crear `core/integraciones.js` con helper genérico demo/LAB.
2. Agregar colecciones vacías al seed/demo si corresponde:
   - `integraciones`,
   - `eventosIntegracion`,
   - `campanas`,
   - `piezas`,
   - `metricasMarketing`.
3. Preparar adaptador Make backend seguro, sin secretos en frontend.
4. Preparar documentación de payloads para configurar escenarios Make.
5. Preparar importador de Excel/Sheets para calendario A&S con mapeo genérico.

---

## 8. Estado

**ABIERTO / P1 integraciones marketing.**

Siguiente paso recomendado: preparar `core/integraciones.js` como helper genérico en la rama backend, sin activar envíos reales hasta configurar webhooks seguros.
