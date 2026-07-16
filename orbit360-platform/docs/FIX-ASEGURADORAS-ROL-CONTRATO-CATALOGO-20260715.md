# Fix: Aseguradoras — rol LAB, contrato del directorio y catálogo documental

Fecha: 2026-07-15

## Carriles

- Carril A: frontend exacto de la candidata aprobada.
- Carril B: Auth, Firestore LAB y `Orbit.store` preservados.
- Carril C: 414 clientes y 26 aseguradoras del lote inicial ya escrito.

## Evidencia observada

- La URL validada seguía en `runtime=20260715-8`.
- La barra superior mostraba Dirección, pero `Orbit.session.rol()` estaba vacío.
- Aseguradoras ocultaba Importar, Nueva aseguradora y Editar.
- Clientes 360 quedaba en cero por scope `none` derivado del rol vacío.
- La ficha no recibía los estilos de pestañas y lectura de la candidata.
- El directorio importado usaba nombres de campos diferentes a los consumidos por la candidata.
- La carga inicial de directorio contenía `docs: []`, `ramos: []` y `comisiones: {}`; por tanto no podía mostrar tasas ni reglas persistidas.

## Causa raíz

1. Identidad visual y sesión operativa no estaban sincronizadas: el guard pintaba Dirección, pero no configuraba la vista activa.
2. Los estilos específicos de la ficha no estaban incluidos en la composición actual de CSS.
3. El importador preservó correctamente los campos de origen, pero no existía un adaptador de lectura para alias como `codigo`/`codigoIntermediario`, `telefono`/`telGeneral` y `direccionFiscal`/`dirFiscal`.
4. El lote documental de 11 fuentes solo estaba inventariado y relacionado; no se había extraído ni persistido conocimiento, y sus gates permanecían cerrados.

## Cambios aplicados

### Sesión y CRM

- El usuario LAB canónico sincroniza `Dirección` y `ase-paula-osorio`.
- La identidad, el alcance de datos y el rol visible usan el mismo estado.
- Al autenticar se reconstruye el sidebar y se repinta la ruta activa.

### Frontend de Aseguradoras

- `modules/aseguradoras.js` continúa siendo el renderer canónico.
- Se añadió el stylesheet modular `styles/aseguradoras-candidate.css` con las pestañas, estados de solo lectura y fallback visual del encabezado.
- El adaptador posterior no sustituye el render ni usa `MutationObserver`.

### Contrato del directorio

Se normalizan únicamente para lectura:

- `codigo` → `codigoIntermediario`;
- `telefono` → `telGeneral`;
- `telefonoEmergencias` → `emergencia`;
- `facturacion.direccionFiscal`/`direccion` → `facturacion.dirFiscal`;
- `contacto.telefono`/`extension` → `tel`/`ext`;
- país, canal y vigencia de contactos;
- tipo y estado honesto de plataformas;
- color base cuando la fuente no tiene color.

No se inventan contactos principales, documentos, ramos, comisiones ni tasas.

### Catálogo documental

- La ficha ofrece `Fuentes mapeadas` como consulta metadata-only.
- Muestra archivos, aseguradora, país, moneda, ramo, producto, versión y estado `Lectura pendiente`.
- Los conjuntos de vinculación permanecen con validación humana y segundo gate.
- No se habilita Cotizador ni Comparativo y no se presentan tasas inexistentes.

### Logo

- Dirección puede registrar o retirar una referencia HTTPS del logo con motivo y actividad.
- No se guardan Data URLs ni archivos binarios en el navegador.

## Estado

- Código en rama correcta y PR #5 draft/open.
- Runtime objetivo: `20260715-11`.
- Despliegue Hosting y validación visual aún no confirmados.
- La extracción/persistencia real de las 11 fuentes documentales sigue como bloque siguiente separado; el catálogo visible no equivale a reglas ni tasas persistidas.

## Regla de no regresión

La UI nunca debe derivar permisos desde una etiqueta pintada. Rol visible, `Orbit.session`, scopes y permisos deben provenir del mismo estado canónico. Una carga de directorio no se puede presentar como carga de conocimiento; documentos, reglas y tasas requieren su propio dry-run, diff, validación y gate.
