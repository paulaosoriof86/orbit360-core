# Hallazgo y corrección — render de credenciales Aseguradoras OP2 v1.223

Fecha: 2026-07-13
Módulo: Aseguradoras · Plataformas
Carriles: A (UX/validación visual) y B (seguridad/proveedor seguro)
Estado: corregido en código; pendiente gate visual final Dirección desktop + Operativo tablet

## Necesidad

Dirección y Operativo podían consultar correctamente una credencial mediante el proveedor seguro, pero el resultado no permanecía visible en la tarjeta de la plataforma después del clic.

## Evidencia previa

Los dos escenarios reportaron:

- rol disponible;
- plataforma presente;
- botón presente y habilitado;
- llamada directa al proveedor aprobada;
- política de credenciales visible/copiable correcta;
- sin overflow ni errores globales;
- `revealed=false` y secreto no visible en la tarjeta viva.

## Causa raíz

`Orbit.secureResources.revealCredential()` registra auditoría. Esa auditoría escribe un evento operativo en `Orbit.store`, lo que puede provocar un re-render de la ficha mientras el manejador del botón está esperando el resultado del proveedor.

El manejador conservaba la referencia inicial de `button.closest('[data-op2-platform]')`. Si la ficha se reconstruía durante el `await`, esa referencia quedaba separada del DOM. La credencial podía pintarse sobre un nodo viejo o perderse en el re-render.

El smoke anterior también conservaba su referencia inicial, por lo que no diferenciaba correctamente entre una tarjeta viva y una tarjeta desprendida.

## Corrección funcional

Archivo:

`modules/aseguradoras-op2-operational-resources.js`

Cambios:

1. El estado temporal se identifica por `aseguradoraId|platformIndex`, no solo por índice.
2. El estado temporal se establece antes de reconciliar la ficha.
3. `platformHtml()` consulta ese estado para conservar usuario y contraseña durante un re-render autorizado.
4. Después del proveedor, el módulo vuelve a localizar la tarjeta viva dentro de `#host`.
5. El botón que se reactiva también se vuelve a localizar en el DOM vivo.
6. El secreto se elimina de memoria a los 15 segundos y la contraseña vuelve a mostrarse enmascarada.
7. No se escribe usuario ni contraseña en `Orbit.store`, localStorage, sessionStorage, seed ni logs.

## Corrección del harness

Nuevo smoke:

`tools/orbit360-smoke-op2-plataformas-live-v1223.mjs`

El smoke:

- ejecuta solo Dirección desktop y Operativo tablet;
- vuelve a localizar la tarjeta en cada lectura;
- exige que la tarjeta esté conectada al documento;
- confirma simultáneamente UI, proveedor seguro, política de rol y ausencia de overflow/errores;
- no repite CRM, las doce vistas aprobadas ni Asesor móvil.

## Seguridad

La corrección no amplía permisos. Se conservan:

- credenciales visibles solo para Dirección, Administración, Operativo o permiso extra explícito;
- Asesor restringido;
- `credentialRef` como referencia, sin secretos persistidos;
- auditoría del acceso;
- expiración temporal;
- backend y archivos protegidos sin modificación.

El cambio de clave temporal también evita que dos aseguradoras con una plataforma en la misma posición compartan accidentalmente el mismo estado transitorio.

## Academia

Academia debe explicar que:

- “Ver usuario y contraseña” realiza una consulta temporal y auditada;
- el dato puede permanecer visible por un máximo de 15 segundos;
- cambiar de ficha o re-renderizar no autoriza ampliar el acceso;
- Asesor no puede revelar ni copiar credenciales;
- las credenciales reales dependen de conexión segura y no se guardan junto con el directorio.

No se requiere crear un curso nuevo; debe incorporarse como actualización del curso existente de Directorios/Aseguradoras conservando progreso y certificado.

## Validación requerida

Solo queda permitido ejecutar:

1. validador específico de re-render v1.223;
2. validador del smoke vivo v1.223;
3. Dirección desktop;
4. Operativo tablet;
5. combinación de evidencia previa + Asesor aprobado + 2/2 nuevas = 15/15.

No se debe repetir CRM ni las otras vistas de Aseguradoras.
