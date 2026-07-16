# Incidente: render competitivo en Aseguradoras y actualización tardía de Clientes

Fecha: 2026-07-15

## Carriles

- Carril A: candidata/prototipo y experiencia operativa aprobada.
- Carril B: backend protegido, Auth, Firestore LAB y `Orbit.store` sin modificación.
- Carril C: carga inicial real sanitizada; 414 clientes y 26 aseguradoras verificadas en la ruta canónica del tenant.

## Necesidad

Aseguradoras debe conservar una sola experiencia operativa basada en el prototipo aprobado: directorio, KPIs, filtros, tarjetas y ficha por pestañas. Las herramientas documentales, dry-runs y controles técnicos no deben aparecer como una segunda versión del módulo ni montarse automáticamente sobre el directorio.

Clientes 360 debe actualizarse cuando llegan los snapshots de Firestore sin requerir recarga manual y sin añadir listeners independientes por candidata.

## Comportamiento observado

- El módulo Aseguradoras cambiaba de forma después de abrir.
- El directorio podía aparecer primero y luego ser desplazado por paneles documentales.
- La ficha recibía un banner de calidad después del render inicial.
- Clientes 360 podía quedar mostrando cero aunque Firestore contuviera los registros.
- La puerta LAB renovaba URLs distintas de las usadas realmente por `index.html`, permitiendo caché HTTP inconsistente.

## Causa raíz

Había varios actores visuales sobre la misma ruta:

1. `modules/aseguradoras.js` como módulo base.
2. `modules/aseguradoras-v1197-ux-bridge.js` reemplazando `render`.
3. `modules/aseguradoras-v1202-import-bridge.js` envolviendo `render`.
4. `modules/aseguradoras-v1202-resources-bridge.js` envolviendo `render` y creando `MutationObserver`.
5. Runtime documental que cargaba `aseguradoras-knowledge-panel-p09f.js` y `aseguradoras-batch-admin-form-p09j.js`, ambos con montaje automático por eventos.
6. Dos archivos aditivos creados durante el incidente para reordenar y refrescar la vista.

El resultado era una carrera entre render, setTimeout, MutationObserver, eventos del store y montaje técnico. No fue pérdida de datos sino una frontera visual incorrecta.

## Fuente real utilizada

- Prototipo aprobado recibido en `Prototype Development Request - 2026-07-13T145159.387.zip`.
- Evidencia visual del directorio aprobado.
- Firestore LAB, ruta canónica `tenantId/alianzas-soluciones`.
- Conteos verificados: 414 clientes, 26 aseguradoras y 7 asesores.

## Corrección aplicada

### Aseguradoras

- `aseguradoras-v1197-ux-bridge.js` queda como renderer visual canónico.
- Directorio alineado con el prototipo aprobado:
  - título `Orbit Aseguradoras`;
  - subtítulo `Directorio de aseguradoras vinculadas`;
  - cinco KPIs;
  - filtros de búsqueda, país, ramo y estado;
  - tarjetas con estado, contacto, acceso, documentos y acciones;
  - ficha-página por pestañas.
- El renderer marca `__resourcesV1202` como diferido, impidiendo que el bridge de recursos instale un segundo render o MutationObserver.
- El runtime documental automático queda diferido a un workspace administrativo explícito aún pendiente de diseño. Sus contratos backend permanecen intactos.

### Clientes y reactividad

- Se eliminó el refresco aditivo por archivo independiente.
- `core/router.js` contiene una única suscripción central a `Orbit.store`.
- La actualización es debounced y limitada a las colecciones relevantes de la ruta activa.
- No se modifica `data/store.js` ni `data/store-firestore-lab.local.js`.

### Caché y preview

- `ays-lab-preview.html` elimina Service Workers y Cache Storage.
- Precarga con `cache: reload` las URLs exactas usadas por `index.html`, incluyendo sus query strings reales.
- La puerta oficial abre Clientes 360 para comprobar primero la lectura de datos.

### Limpieza

Eliminados, no solo desactivados:

- `core/store-view-refresh-v20260715.js`
- `modules/aseguradoras-directory-priority-v20260715.js`

## Regla de no regresión

1. Una ruta tiene un solo renderer propietario.
2. Bridges posteriores pueden aportar contratos o handlers, pero no sustituir `innerHTML`, montar paneles automáticamente ni observar el DOM para reescribir la vista.
3. Herramientas técnicas o administrativas viven en rutas/tabs/workspaces explícitos, nunca encima del flujo operativo.
4. La información real se adapta al modelo visual aprobado; no se reemplaza la UX aprobada por paneles derivados del backend.
5. La reactividad se resuelve una vez en el router o arquitectura central, no con archivos aditivos por módulo.
6. Toda candidata Claude debe conservar esta frontera y demostrar que no añade otro `render`, `MutationObserver` o montaje automático sobre `#/aseguradoras`.

## Academia

La Academia debe explicar por separado:

- uso operativo del directorio y ficha de aseguradoras;
- estados de calidad y validación;
- habilitación de Cotizador/Comparativo;
- workspace administrativo de fuentes y dry-runs cuando exista.

No debe enseñar paneles técnicos como si fueran la vista principal del módulo.

## Estado

- Datos: verificados; sin pérdida.
- Backend protegido: preservado.
- Renderer competitivo: corregido.
- Archivos aditivos del incidente: eliminados.
- Pendiente: una sola confirmación visual de Clientes 360 y Aseguradoras desde la puerta oficial; después continuar con la siguiente fuente operativa, sin repetir esta auditoría.