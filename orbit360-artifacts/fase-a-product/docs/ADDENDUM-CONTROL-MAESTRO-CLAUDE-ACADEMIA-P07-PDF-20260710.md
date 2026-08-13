# Addendum control maestro Claude/Academia — P0.7 cotizaciones PDF

Fecha: 2026-07-10  
Estado: `ACUMULADO / NO_ENVIADO_A_CLAUDE / ADAPTER_BACKEND_IMPLEMENTADO`

## 1. Regla de continuidad

La futura UX no puede asumir:

- una sola aseguradora;
- una sola plantilla por aseguradora;
- Secciones I/II/III obligatorias;
- ausencia de páginas vacías;
- datos ya clasificados;
- PII disponible para entrenamiento.

Debe representar el flujo reusable de carga, extracción, matching, familia, variante, diff, validación y versionado.

## 2. Wizard de carga PDF

Pasos mínimos:

1. Seleccionar o arrastrar archivo.
2. Elegir propósito: entrenamiento o caso operativo.
3. Confirmar país y aseguradora si se conocen.
4. Mostrar preflight.
5. Mostrar avance por etapas.
6. Presentar aseguradora/producto propuestos.
7. Revisar páginas y secciones.
8. Resolver campos ambiguos.
9. Comparar con familia/variante existente.
10. Confirmar registro de versión.

## 3. Visor y evidencia

Debe incluir:

- miniaturas por página;
- indicación de páginas vacías;
- overlay de bounding boxes;
- sección seleccionada sincronizada con el PDF;
- texto/tabla extraídos;
- confianza;
- fuente y página;
- opción de corregir etiqueta, categoría y valor;
- apertura del documento original bajo permisos.

## 4. Matching de aseguradora

Mostrar:

- candidato principal;
- alternativas;
- confianza;
- evidencia de logo/texto;
- país;
- aliases;
- estado de validación.

No crear una aseguradora automáticamente desde el PDF.

## 5. Familias y variantes

La interfaz debe mostrar:

- familia por aseguradora/país/producto;
- variantes por vehículo, riesgo y plan;
- secciones comunes;
- secciones variables;
- diferencias entre versiones;
- documentos usados como evidencia.

No ofrecer “fusionar todo” como acción por defecto.

## 6. AseGuate — implicación visual

Los ejemplos de automóvil y microbús comparten familia visual, pero cambian límites, coberturas, beneficios y condiciones.

La UX debe:

- mostrar que pertenecen a la misma familia;
- mostrar que son variantes diferentes;
- permitir comparar secciones;
- impedir que la variante de automóvil sustituya la de microbús;
- mantener el nombre de plan en validación cuando existan inconsistencias entre logo, encabezado u observación.

## 7. Universales — implicación visual

La estructura Riesgo Plus debe conservar:

- opciones de pago;
- coberturas principales;
- cuadrícula de coberturas adicionales;
- pasos para contratar;
- condiciones importantes;
- vigencia y datos del agente;
- páginas vacías como metadata.

No convertirla artificialmente a Sección I/II/III.

## 8. Seguridad y roles

### Asesor

- cargar una cotización operativa;
- revisar extracción del caso propio;
- corregir datos permitidos;
- no publicar patrones ni versiones globales.

### Operativo

- revisar fuentes y evidencia;
- completar clasificación;
- no habilitar conocimiento global.

### Admin/Dirección

- validar matching;
- aprobar/corregir secciones;
- resolver variantes;
- confirmar versión;
- habilitar mediante segundo gate;
- revisar auditoría.

## 9. Academia profunda

Rutas:

- diferencia entre training y operational;
- PII y privacidad;
- cómo revisar una página/bloque;
- cómo validar una aseguradora;
- cómo reconocer una variante;
- cómo resolver páginas vacías;
- cómo corregir una sección;
- cómo interpretar confianza;
- cómo versionar sin borrar;
- cómo habilitar con segundo gate.

Evaluaciones:

- identificar dos variantes de una misma familia;
- separar una segunda aseguradora;
- detectar una página vacía;
- bloquear un matching ambiguo;
- evitar fuga de PII;
- conservar una sección no canónica;
- resolver un diff.

## 10. Prohibiciones para Claude

- no hardcodear nombres ni formatos de aseguradoras;
- no incorporar PDFs o imágenes reales al bundle;
- no usar PII de ejemplos;
- no crear un solo formulario rígido;
- no ocultar incertidumbre;
- no convertir todas las cotizaciones a una misma taxonomía;
- no eliminar páginas o secciones sin revisión;
- no tocar `Orbit.store` directo;
- no mostrar integraciones como activas sin backend.

## 11. Condición para pedir candidata

Claude se solicitará después de:

1. provider P0.7 funcional o stub backend controlado;
2. manifiestos reales sanitizados;
3. diff real AseGuate automóvil/microbús;
4. gate de habilitación;
5. primer wire en Aseguradoras.

Hasta entonces: `NO_ENVIADO_A_CLAUDE`.
