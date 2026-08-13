# Incidente: frontend desviado y render competitivo en Aseguradoras

Fecha: 2026-07-15

## Carriles

- Carril A: candidata/prototipo y experiencia operativa aprobada.
- Carril B: backend protegido, Auth, Firestore LAB y `Orbit.store` preservados.
- Carril C: carga inicial real sanitizada; escritura confirmada de 414 clientes y 26 aseguradoras, con 26 clientes retenidos fuera de escritura y 8 aseguradoras restringidas para validación.

## Necesidad

Aseguradoras debe usar el frontend exacto de la candidata aprobada, no una recreación posterior. Los datos reales del tenant deben alimentar ese módulo mediante `Orbit.store`, manteniendo su directorio, KPIs, filtros, tarjetas, ficha por pestañas, edición con borrador y navegación aprobada.

Las herramientas documentales, dry-runs y controles técnicos no deben montarse automáticamente sobre el directorio operativo.

## Comportamiento observado

- El módulo Aseguradoras cambiaba de forma después de abrir.
- El directorio podía ser reemplazado por paneles documentales o por una recreación parcial.
- La ficha no coincidía con el diseño aprobado de la candidata.
- El detalle de KPI se dibujaba dentro de la página y alteraba la navegación aprobada.
- Clientes 360 podía quedar mostrando cero aunque la escritura del lote estuviera confirmada.

## Causa raíz

La causa no fue la información cargada. La desviación estaba en el frontend:

1. `modules/aseguradoras.js` de la candidata había sido sustituido por una evolución técnica posterior.
2. `modules/aseguradoras-v1197-ux-bridge.js` volvió a reemplazar `render`, pero mediante una recreación parcial que no era el archivo exacto aprobado.
3. `modules/aseguradoras-v1202-resources-bridge.js` podía añadir cambios visuales y `MutationObserver` cuando detectaba el bridge anterior.
4. El runtime documental podía montar paneles técnicos por eventos.
5. Se añadieron dos archivos aditivos durante el incidente, aumentando la competencia entre renders.

El error metodológico fue tratar de aproximar el diseño aprobado en vez de restaurar la fuente exacta de la candidata y conectar los datos a ella.

## Fuente exacta restaurada

- ZIP recibido: `Prototype Development Request - 2026-07-13T145159.387.zip`.
- Commit del prototipo preservado en el repositorio: `756082365b3d63f2a466d622162b9c2dec7053c7`.
- Archivo canónico: `orbit360-platform/modules/aseguradoras.js`.
- Blob exacto: `93f194aae36dfa3ccd4f154f94d216c12350f9cf`.

La restauración se realizó por referencia de blob Git, sin reconstruir ni reinterpretar el archivo.

## Corrección aplicada

### Aseguradoras

- `modules/aseguradoras.js` quedó restaurado byte por byte desde el blob exacto de la candidata aprobada.
- `modules/aseguradoras-v1197-ux-bridge.js` quedó convertido en un shim sin render, sin `innerHTML`, sin listeners visuales y sin reemplazar la candidata.
- El shim registra únicamente la procedencia del frontend aprobado y declara `visualOverride: false`.
- `modules/aseguradoras-v1202-resources-bridge.js` no se instala porque requiere el bridge visual retirado.
- `modules/aseguradoras-v1202-import-bridge.js` se conserva únicamente para enrutar importaciones y altas seguras; no es propietario del diseño.
- El runtime documental automático permanece diferido fuera del directorio operativo.

### Datos y backend

- No se reimportaron datos.
- No se ejecutó rollback.
- No se modificaron `data/store.js`, `data/store-firestore-lab.local.js`, Auth, reglas ni el lote escrito.
- Las 26 aseguradoras y los 414 clientes permanecen en Firestore LAB.

### Clientes y reactividad

- `core/router.js` mantiene una única suscripción central y debounced a `Orbit.store` por ruta.
- El cero visual de Clientes 360 permanece como hallazgo abierto hasta probar el runtime nuevo; no se declara corregido por inferencia.
- Antes de alterar el backend o reimportar, debe verificarse si el problema restante es inicialización tardía o scope/identidad de sesión.

### Caché y preview

- La puerta oficial elimina Service Workers y Cache Storage.
- Precarga las mismas URLs utilizadas por `index.html`.
- Runtime de validación: `20260715-10`.
- La puerta abre directamente Aseguradoras para comprobar el frontend exacto antes de continuar con CRM.

### Limpieza

Eliminados:

- `core/store-view-refresh-v20260715.js`
- `modules/aseguradoras-directory-priority-v20260715.js`

Retirado como renderer:

- `modules/aseguradoras-v1197-ux-bridge.js`

## Regla de no regresión

1. El archivo exacto de la candidata aprobada es la fuente visual canónica mientras no exista una candidata incremental nueva y auditada.
2. No reconstruir visualmente un módulo que ya existe en la candidata.
3. Una ruta tiene un solo renderer propietario.
4. Bridges posteriores pueden aportar contratos o handlers, pero no sustituir `render`, reescribir `innerHTML`, montar paneles automáticamente ni observar el DOM para cambiar la vista.
5. Los datos reales se adaptan al contrato de `Orbit.store`; no se cambia el diseño aprobado para acomodar el backend.
6. Cualquier cambio visual futuro debe compararse contra la candidata exacta y demostrar que es incremental.
7. Academia y Claude deben conservar esta frontera y no mostrar herramientas técnicas como la vista operativa del módulo.

## Estado

- Datos A&S: escritos y preservados.
- Backend protegido: preservado.
- Frontend exacto de Aseguradoras: restaurado en la rama.
- Override visual posterior: retirado.
- Runtime 10: publicado en código, pendiente confirmar despliegue Hosting y validación visual.
- Clientes 360: lectura visual pendiente de resolver después de confirmar el runtime nuevo.
