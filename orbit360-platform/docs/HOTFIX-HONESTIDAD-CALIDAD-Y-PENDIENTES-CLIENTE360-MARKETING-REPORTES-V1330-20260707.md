# HOTFIX / AUDITORÍA — Honestidad Calidad + pendientes Cliente360, Marketing y Reportes v1330

Fecha: 2026-07-07
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open

## 1. Alcance del bloque

Este bloque se ejecutó después del empalme v1330 y después de los hotfixes previos de Portal, Siniestros, Automatizaciones, Plantillas, Correo, Cancelaciones, Historial y Pólizas.

Se mantuvieron las restricciones:

- Sin merge.
- Sin deploy.
- Sin main.
- Sin producción.
- Sin datos reales.
- Sin secretos.
- Sin tocar backend protegido.

## 2. Archivo modificado

```txt
orbit360-platform/modules/calidad.js
```

Commit:

```txt
94a7596b56d2e7cee0ecb89b35b78c1153575865
```

## 3. Cambio aplicado — Calidad

### Necesidad

El módulo Calidad todavía usaba lenguaje no apto para UI cliente:

- `Campaña de actualización (demo)`.
- Acción `WA` que podía interpretarse como envío/entrega confirmada.
- Campaña que indicaba clientes “por WhatsApp / por correo” sin aclarar que la comunicación queda preparada o depende de integración real.

### Causa raíz

El módulo venía del prototipo UX y conservaba una semántica de demostración / acción directa. Después de los patrones de honestidad post-v1330, debía alinearse con:

- Comunicación preparada ≠ mensaje entregado.
- WhatsApp Web abierto ≠ API conectada.
- Correo preparado ≠ enviado si no hay cuenta/OAuth backend conectado.
- No mostrar `demo` en UI cliente.

### Fix aplicado

- Encabezado del archivo ajustado para indicar que Calidad prepara contacto por WhatsApp Web o correo, y que la entrega real depende de integración/canal conectado.
- Botón `WA` renombrado a `Preparar WA`.
- Tooltip de WhatsApp aclara que abre WhatsApp Web con mensaje preparado y que la entrega no se confirma desde Orbit.
- Botón de correo renombrado a `Preparar correo`.
- Tooltip de correo aclara que el envío real depende de cuenta conectada.
- Toast de campaña reemplaza `demo` por `Campaña de actualización preparada`.
- Toast diferencia:
  - WhatsApp Web/API pendiente de conexión real;
  - correo preparado;
  - sin canal requiere gestión manual.

### Impacto comercializable

El módulo queda más vendible y compatible con backend real: no simula envíos, no promete conexión activa, no expone lenguaje de prototipo y mantiene trazabilidad honesta para futuras integraciones.

### ¿Aplica a Claude/prototipo?

Sí.

Claude debe conservar este patrón en cualquier rediseño de Calidad:

```txt
Comunicación preparada / WhatsApp Web abierto / correo preparado ≠ entrega confirmada.
```

Academia impactada:

- Ruta Administrativo/Operativo: explicar cómo usar Calidad para completar expedientes.
- Ruta Asesor: explicar que `Preparar WA` abre un mensaje y que debe confirmarse manualmente si no hay API conectada.
- Ruta Superadmin/IT: explicar diferencia entre integración configurada, integración activa y comunicación preparada.

Riesgo si Claude lo ignora:

- UI puede afirmar envíos inexistentes.
- Clientes internos pueden asumir trazabilidad/entrega real sin proveedor conectado.
- Se rompe la regla de estados honestos.

## 4. Validación ejecutada

Validación local sobre copia del archivo nuevo:

```txt
node --check /mnt/data/calidad_new.js
```

Resultado:

```txt
OK — sin errores de sintaxis JS.
```

Validación remota pendiente:

```txt
node --check orbit360-platform/modules/calidad.js
node tools/orbit360-validar-backend-lab-contrato.mjs
```

No se ejecutó validador backend LAB desde GitHub porque requiere entorno local/repo completo.

## 5. Pendiente seguro — Cliente360

No se reemplazó `modules/cliente360.js` completo en este bloque porque es un archivo grande/sensible y el conector GitHub reemplaza archivos completos. Se auditó parcialmente y se confirmó que el pendiente sigue siendo real.

### Hallazgos confirmados

En `cliente360.js`:

- El botón de comparativo aún dice `Enviar comparativo al cliente`.
- El handler de comparativo llama `Orbit.correo.enviar(...)` directamente.
- Aunque la capa central de correo ya registra/prepara, desde UX Cliente360 todavía se debe abrir compositor para mantener el mismo patrón visible que el módulo Correo.
- La ficha del cliente todavía usa etiquetas de Drive (`Expediente en Drive`, `Agregar link de Drive`). Si el tenant no tiene Drive conectado, debe decir `Expediente vinculado` / `Agregar enlace de expediente` o indicar `Drive pendiente de conexión`.

### Fix recomendado

Commit sugerido:

```txt
fix(ays): cliente360 honestidad comparativo expediente v1330
```

Cambios exactos esperados:

1. Cambiar texto:

```txt
Enviar comparativo al cliente
```

por:

```txt
Preparar comparativo para cliente
```

2. En el click de `cmp-enviar`, no llamar `Orbit.correo.enviar` desde Cliente360. Usar:

```js
window.__orbitCompose = {
  para: (S().get('clientes', p.clienteId) || {}).email || '',
  asunto: 'Comparativo de renovación · ' + p.numero,
  cuerpo: 'Adjunto/preparo el comparativo de tu renovación con ' + props.length + ' opción(es).',
  clienteId: p.clienteId,
  vinculo: { tipo: 'poliza', id: polId, label: p.numero }
};
location.hash = '#/correo';
```

3. Cambiar toast a:

```txt
Comparativo preparado en Correo
```

4. Cambiar textos de expediente:

```txt
Expediente en Drive
Agregar link de Drive
```

por textos neutros:

```txt
Expediente vinculado
Agregar enlace de expediente
```

o, si se quiere conservar Drive, agregar estado:

```txt
Drive pendiente de conexión segura
```

5. Revisar `Orbit.correo.enviar(...)` restante en Cliente360, especialmente en Siniestros/Reclamos, y mover a `window.__orbitCompose` cuando sea acción de usuario.

### ¿Aplica a Claude/prototipo?

Sí.

Claude debe mantener:

- botón `Preparar comparativo`, no `Enviar` si no hay proveedor confirmado;
- flujo por compositor Correo;
- Drive/Storage como vínculo/configuración, no promesa de integración activa;
- lección de Academia sobre comparativo preparado vs cotización oficial/enviada.

## 6. Pendiente seguro — Marketing

### Hallazgo confirmado

En `modules/marketing.js`, `generarMes()` usa fallback local si IA no está disponible, pero el copy insertado queda como:

```txt
Borrador generado con IA — revisa el tono antes de programar.
```

Eso no es honesto cuando la IA no está conectada y se usó fallback local.

### Fix recomendado

Commit sugerido:

```txt
fix(ays): marketing honestidad ia publicaciones v1330
```

Cambios esperados:

- Si `Orbit.ia.disponible()` y `Orbit.ia.complete()` devolvió ideas reales: usar texto `Borrador generado con IA — revisar antes de programar.`
- Si se usó fallback local: usar texto `Borrador sugerido por plantilla — revisar antes de programar.`
- En estados `Programado`/`Publicado`, diferenciar:
  - local/preparado;
  - proveedor conectado confirmado.
- No afirmar publicación real en redes si Metricool/Meta/Make no confirmó conexión/resultado.

### ¿Aplica a Claude/prototipo?

Sí.

Academia impactada:

- Marketing debe enseñar diferencia entre idea, borrador sugerido, generado con IA, programado local y publicado por proveedor.

## 7. Pendiente seguro — Reportes

### Hallazgos confirmados

En `modules/reportes.js`:

1. La programación dice:

```txt
Se envía por la integración de correo configurada.
```

Debe decir que queda programado/preparado y que el envío real requiere cuenta/conector activo.

2. El resumen agrupado detecta columnas numéricas y suma valores parseados desde strings monetarios. Esto puede mezclar GTQ/COP si el país está en `TODOS`.

3. El reporte de Siniestros usa `Orbit.q.monedaPais()` para montos reclamados/aprobados. Debe usar moneda del cliente/reclamo/fila.

4. Cancelaciones usa `Orbit.q.monedaPais()` para valor perdido. Debe usar moneda del cliente/póliza/cancelación.

### Fix recomendado

Commit sugerido:

```txt
fix(ays): reportes honestidad programacion moneda v1330
```

Cambios esperados:

- Cambiar texto de programación a:

```txt
Queda programado/preparado en Orbit. El envío real requiere integración de correo activa y confirmada.
```

- Cambiar toast a:

```txt
Reporte programado en Orbit — envío pendiente de integración activa
```

- En agrupaciones, no sumar columnas monetarias cuando `Orbit.pais === 'TODOS'` o cuando no se puede determinar moneda única.
- Mostrar resumen monetario separado por moneda o mostrar `No se suman monedas mixtas`.
- En siniestros/cancelaciones, resolver moneda por fila:

```js
const cli = S().get('clientes', r.clienteId) || {};
const cur = r.moneda || cli.moneda || (cli.pais === 'CO' ? 'COP' : 'GTQ');
```

### ¿Aplica a Claude/prototipo?

Sí.

Claude debe evitar KPIs y reportes que sumen monedas crudas. Academia debe enseñar que Reportes se filtra/separa por país y moneda antes de interpretar totales.

## 8. Estado final del bloque

- PR #5 sigue draft/open.
- No merge.
- No deploy.
- No main.
- Backend protegido intacto.
- Cambio directo aplicado únicamente en `modules/calidad.js`.
- Quedan pendientes Cliente360, Marketing y Reportes por parche seguro local/Codex o revisión manual completa si se actualizan desde GitHub.

## 9. Próximo bloque recomendado

1. Validar remotamente head del PR.
2. Ejecutar `node --check orbit360-platform/modules/calidad.js` en repo local cuando esté disponible.
3. Si hay entorno local o Codex, aplicar los tres hotfixes pendientes:
   - Cliente360 comparativo/expediente/correo.
   - Marketing IA/fallback/publicación.
   - Reportes programación/monedas.
4. Actualizar manuales y Academia con los patrones de comunicación preparada, integración activa y moneda por reporte.
5. Correr validador backend LAB.
