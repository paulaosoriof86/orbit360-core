# Especificación Marketing Operativo post v1.97 · Orbit 360

**Fecha:** 2026-07-03  
**Base:** Prototipo Claude v1.97  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Archivo auditado:** `orbit360-platform/modules/marketing.js`

---

## 1. Diagnóstico actual

El módulo Marketing en v1.97 ya no está en cero. Tiene:

- calendario mensual,
- KPIs de contenidos del mes, alcance, interacciones y leads,
- importador de calendario,
- generación mensual con IA centralizada vía `Orbit.ia.complete`,
- reprogramación de atrasados,
- ficha de contenido por día,
- campos de fecha, hora, canal, tipo, enfoque, estado, responsable, aprobación, título, copy, CTA y hashtags,
- botones de intención para Canva y Metricool,
- stats básicos por contenido.

Esto confirma que Claude sí avanzó el módulo, pero todavía no es un centro operativo completo de marketing.

---

## 2. Brechas funcionales pendientes

### MKT-P1-001 · Ficha diaria como centro operativo

Actualmente la ficha es por contenido. Falta vista por día que agrupe:

- contenidos del día,
- piezas asociadas,
- canales,
- responsables,
- estados,
- aprobaciones,
- programación,
- tareas pendientes,
- estadísticas del día,
- leads generados,
- próximos pasos.

### MKT-P1-002 · Piezas por contenido

Falta estructura para múltiples piezas por contenido:

- post feed,
- historia,
- carrusel,
- reel,
- video,
- pieza WhatsApp,
- email,
- enlace Drive/Canva.

### MKT-P1-003 · Campañas y objetivos

Falta pasar de contenido aislado a campaña:

- campaña,
- objetivo: captación, educación, retención, renovación, referidos, reputación,
- producto/ramo,
- público/segmento,
- país,
- fecha inicio/fin,
- presupuesto si aplica.

### MKT-P1-004 · Métricas por canal/pieza

Actualmente hay stats básicos dentro de `contenidos`. Falta normalizar:

- alcance,
- impresiones,
- interacciones,
- clics,
- CTR,
- leads,
- conversiones,
- costo si aplica,
- canal,
- pieza,
- fecha de medición.

### MKT-P1-005 · Integraciones reales

Los botones Canva/Metricool son intención UI. Falta integración real por backend/Make:

- Canva: generar o abrir plantilla/pieza.
- Metricool: programar publicación y recibir stats.
- Make: webhook por evento.
- Google Sheets: importar/sincronizar calendario.
- Mailchimp: campañas email.
- WhatsApp/Green API vía Make: distribución directa.

---

## 3. Esquema backend propuesto

No hardcodear A&S. Todo por tenant.

### Colección `campanas`

Campos mínimos:

```js
{
  id,
  tenantId,
  nombre,
  objetivo,
  pais,
  segmento,
  ramo,
  estado,
  fechaInicio,
  fechaFin,
  presupuesto,
  responsable,
  tags,
  createdAt,
  updatedAt
}
```

### Colección `contenidos`

Ampliar sin romper compatibilidad:

```js
{
  id,
  tenantId,
  campanaId,
  fecha,
  hora,
  canal,
  tipo,
  enfoque,
  objetivo,
  publico,
  pais,
  estado,
  responsable,
  aprobacion,
  aprobador,
  titulo,
  copy,
  cta,
  hashtags,
  piezaIds,
  programacion,
  stats,
  createdAt,
  updatedAt
}
```

### Colección `piezas`

```js
{
  id,
  tenantId,
  contenidoId,
  campanaId,
  tipo,
  canal,
  formato,
  titulo,
  copy,
  urlCanva,
  urlDrive,
  assetUrl,
  estado,
  responsable,
  createdAt,
  updatedAt
}
```

### Colección `metricasMarketing`

```js
{
  id,
  tenantId,
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
  fuente,
  raw,
  createdAt
}
```

### Colección `automatizaciones`

Ya existe como concepto en Orbit. Para marketing debe soportar eventos:

- `marketing_contenido_creado`,
- `marketing_pieza_solicitada`,
- `marketing_programar_publicacion`,
- `marketing_publicacion_programada`,
- `marketing_metricas_actualizadas`,
- `marketing_lead_generado`.

---

## 4. Eventos Make propuestos

La plataforma debe enviar texto/variables, Make arma integraciones reales.

### `marketing_programar_publicacion`

```js
{
  evento: 'marketing_programar_publicacion',
  tenantId,
  contenido: {
    id,
    titulo,
    copy,
    canal,
    fecha,
    hora,
    hashtags,
    cta,
    piezaIds
  },
  integracion: 'metricool',
  plantilla: 'marketing_programacion'
}
```

### `marketing_generar_pieza`

```js
{
  evento: 'marketing_generar_pieza',
  tenantId,
  contenidoId,
  canal,
  tipo,
  titulo,
  copy,
  formato,
  integracion: 'canva'
}
```

### `marketing_sync_sheets`

```js
{
  evento: 'marketing_sync_sheets',
  tenantId,
  periodo,
  fuente: 'google_sheets',
  destino: 'contenidos'
}
```

---

## 5. Qué debe hacer Claude en próxima iteración

Cuando Paula pida paquete para Claude, incluir como pendiente:

1. Convertir ficha simple de contenido en ficha diaria operativa.
2. Agregar `campana`, `objetivo`, `publico`, `pais`, `ramo`, `piezaIds`, `programacion` y métricas ampliadas.
3. Mostrar tablero lateral de contenidos del día.
4. Permitir múltiples piezas por contenido.
5. Diferenciar estados:
   - Idea,
   - En redacción,
   - Pendiente aprobación,
   - Aprobado,
   - Programado,
   - Publicado,
   - Medido,
   - Reutilizar,
   - Cancelado.
6. Integrar botones UI con eventos Make, no solo toast.
7. Mantener `Orbit.store`; no tocar `localStorage`.
8. No hardcodear A&S.
9. Mantener UX Orbit 360, sin notas técnicas visibles.

---

## 6. Qué puede hacer ChatGPT/Codex sin esperar a Claude

1. Preparar esquema backend y documentación de eventos.
2. Preparar adaptador Make genérico por tenant.
3. Agregar colecciones base a backend Firestore LAB cuando toque.
4. Preparar importador de calendario Google Sheets/Excel a `contenidos` con mapeo robusto.
5. Documentar migración del Excel de calendario A&S sin hardcodear.

---

## 7. Estado

**ABIERTO / P1 Marketing operativo.**

Siguiente acción sugerida: preparar especificación de integraciones Make/Metricool/Sheets/Mailchimp para Configuración y Backend.
