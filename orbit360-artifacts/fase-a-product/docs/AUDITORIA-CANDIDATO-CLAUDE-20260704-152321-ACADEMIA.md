# Auditoria candidato Claude - Academia v1.123 - 2026-07-04 15:23

ZIP auditado: Prototype Development Request - 2026-07-04T152321.882.zip
Base comparada: Prototype Development Request - 2026-07-04T142707.503.zip
Rama destino backend: ays/backend-tenant-lab-v99-20260703
PR: #5 draft, sin merge, sin deploy
Estado: auditoria forense de candidato + plan de empalme seguro.

## 1. Resultado ejecutivo

La candidata es incremental y se concentra en Academia. El cambio es real y relevante: agrega una capa nueva de autocapacitacion profunda (`data/academia-plus.js`) y deja Academia mucho mas cercana al alcance deseado para onboarding por rol, cursos de producto, cursos tecnicos, cursos comerciales, liderazgo, cumplimiento, servicio, digital/IA y rutas de induccion.

No detecte cambios en backend protegido ni en `tools/orbit360-*`. No se tocaron Firestore, reglas ni datos reales.

## 2. Inventario comparado contra v1.117 congelada 14:27

Archivos totales en el ZIP: 97.

Cambios detectados:

### Agregado

- `data/academia-plus.js`

### Modificados

- `index.html`
- `modules/academia.js`
- `styles/base.css`
- `styles/infra.css`
- `docs/BITACORA-CAMBIOS.md`

### Sin cambios relevantes

- `data/store.js` no cambia.
- `data/store-firestore-lab.local.js` no existe en el ZIP candidato y no se debe pisar desde prototipo.
- `firestore.rules` no cambia.
- `tools/orbit360-*` no cambia.
- Resto de modulos permanece igual frente a v1.117 congelada.

## 3. Validaciones locales ejecutadas

- Inventario ZIP: OK.
- Comparacion contra 14:27: 1 agregado, 5 modificados, 0 eliminados.
- `node --check` en `core/*.js`, `data/*.js` y `modules/*.js`: OK.
- Revision de inclusion en `index.html`: agrega `data/academia-plus.js?v1311`, sube cache-bust de `base.css`, `infra.css` y `academia.js`.
- Revision de `modules/academia.js`: ajuste de KPI para volver a catalogo al filtrar y helper `fmtSec()` para renderizar negritas/saltos en secciones.
- Revision de `styles/base.css`: hereda fuente/color en `button.kpi-click` y asegura color de `.k-val`.
- Revision de `styles/infra.css`: corrige legibilidad del titulo activo de leccion en Academia.

## 4. Que cambio en Academia

### v1.118 - Academia PLUS por modulo y temas transversales

Agrega cursos por modulo/producto operativo:

- Orbit Clientes / Expediente 360.
- Polizas, Cobros y Cartera.
- Renovaciones, Cancelaciones y Retencion.
- Ops + Leads.
- Finanzas, Comisiones y Conciliacion.
- Importador inteligente y migracion.
- Insights, Reportes e IA.

Agrega cursos sectoriales y transversales:

- Tecnico de Seguros Avanzado.
- Gestion Profesional de Siniestros.
- Venta Consultiva Avanzada.
- Liderazgo de Equipos Comerciales.
- Cumplimiento, PLD/LAFT y Proteccion de Datos.
- Servicio y Experiencia del Cliente.
- Habilidades Digitales e IA.

### v1.119 - Producto por ramo + editor

Agrega cursos por ramo/producto:

- Vida e Invalidez.
- Gastos Medicos y Salud.
- Hogar y Patrimonio.
- Fianzas y Cumplimiento.
- Responsabilidad Civil.
- Transporte y Carga.

Agrega curso para administradores sobre como crear/editar cursos en Academia.

### v1.120 - Rutas de induccion iniciales

Agrega rutas de induccion para:

- Asesor nuevo.
- Administrativo/operativo.
- Cliente nuevo en portal.

El enfoque ya coincide con la necesidad de Paula: no solo ensenar botones, sino explicar flujo, valor agregado, impacto operativo y como la plataforma ayuda en el dia a dia.

### v1.121 - Cobertura de modulos faltantes + Marketing

Agrega:

- Aseguradoras, Cotizador y Comparativo.
- Comunicacion con el Cliente: Correo, WhatsApp y Plantillas.
- Productividad, Agenda y Gestion del Tiempo.
- Negociacion Efectiva para Intermediarios.
- Induccion del Rol Marketing.

### v1.122 - Induccion IT / Superadmin

Agrega ruta para configurar la plataforma: marca, paises, monedas, glosario, usuarios, roles, carga inicial, importador, correos, integraciones, automatizaciones, addons y mantenimiento.

### v1.123 - Correcciones de legibilidad/formato

Corrige:

- Titulo de leccion activo que podia verse blanco/ilegible.
- Secciones con `**` literales; ahora se renderiza negrita y saltos de linea.

## 5. Nivel de profundidad alcanzado

La candidata mejora mucho respecto al estado anterior. Ya no es un catalogo basico: ahora hay rutas, cursos por modulo, cursos por ramo, cursos de rol y evaluaciones.

Aun asi, el alcance todavia es de prototipo/contenido. Para llegar al objetivo de onboarding real autoguiado faltan piezas de producto y backend:

1. Modelo de rutas reales por rol, no solo cursos con `destinatarios`.
2. Asignacion de rutas por usuario/rol/tenant.
3. Prerrequisitos, orden obligatorio, fechas objetivo y avance individual.
4. Evaluaciones con intentos, calificacion, aprobacion minima y trazabilidad.
5. Certificados por persona, no solo por curso global del store.
6. Notificaciones de cursos pendientes, cambios de modulo y nuevas lecciones.
7. Vinculo automatico entre cambios de modulo/manual y actualizacion de Academia.
8. Adjuntos/documentos de curso persistidos en backend/Drive/Storage.
9. Topbar/acceso rapido a Academia y centro de novedades de capacitacion.

## 6. Hallazgos/pedidos de Paula que quedan documentados

### ACADEMIA-P1-01 - Ruta por rol debe ser entidad real

Hoy la ruta se deriva del campo `destinatarios`. Eso sirve para prototipo, pero no alcanza para produccion. Se necesita entidad `rutasAprendizaje` con:

- tenantId;
- rol o grupo;
- cursos ordenados;
- prerequisitos;
- obligatoriedad;
- dias sugeridos;
- fecha limite;
- responsable;
- estado;
- version;
- vigencia.

### ACADEMIA-P1-02 - Progreso por usuario

Hoy el progreso del curso vive en el curso. En backend debe separarse:

- `cursos` = contenido/version;
- `rutasAprendizaje` = secuencia por rol;
- `cursoProgresoUsuario` = avance por usuario;
- `evaluacionesUsuario` = respuestas/intentos/calificacion;
- `certificados` = certificado emitido por persona/curso/version.

### ACADEMIA-P1-03 - Editor no conserva roles especificos al editar

El editor actual de curso muestra solo `equipo`, `clientes`, `ambos`. Los cursos nuevos usan tambien `Asesor`, `Marketing` y `Direccion`. Si se edita y guarda uno de esos cursos desde UI, puede perder asignacion especifica. Debe ampliarse el selector a multi-rol real.

### ACADEMIA-P1-04 - Topbar y notificaciones de Academia

Debe existir acceso rapido a Academia desde topbar y/o icono con contador. Debe notificar:

- cursos nuevos asignados;
- ruta pendiente;
- evaluacion vencida;
- cambios de modulo que actualizan manual/curso;
- solicitud de capacitacion;
- certificado obtenido;
- actualizaciones de aseguradora/producto.

### ACADEMIA-P1-05 - Actualizacion obligatoria de manuales/cursos al cambiar modulos

Cada paquete Claude o mejora backend que modifique un modulo debe pasar por checklist:

- se actualizo bitacora;
- se actualizo manual del modulo;
- se actualizo curso/ruta relacionada si aplica;
- se registro pendiente si no se alcanzo a actualizar.

### PORTAL-P1-01 - Pago reportado por cliente con adjunto no visible en gestion/log

Hallazgo reportado por Paula: en Portal, cuando el cliente reporta pago y adjunta soporte, aparece la gestion solicitada/log, pero no aparece el adjunto. Debe auditarse en el bloque Portal/Cobros/Documentos y resolverse antes de backend real porque afecta trazabilidad de recaudo.

Criterio esperado:

- el adjunto debe persistir como documento;
- la gestion debe referenciar documentId/archivo;
- Cobros debe poder verlo al conciliar;
- el cliente debe ver estado del reporte;
- el operativo debe recibir notificacion con enlace al soporte.

## 7. Estado frente al plan backend

La respuesta es: si, el proceso correcto es modulo por modulo, pero sin desviarnos del backend critico.

Orden recomendado de trabajo:

1. Mantener cerrado lo critico de backend: `Orbit.store`, Auth LAB/real, tenant, seguridad, reglas, importadores/validadores y fuentes separadas.
2. En paralelo, cuando se audite cada modulo, documentar inconsistencias funcionales, sincronias, notificaciones, adjuntos y manual/curso relacionado.
3. No intentar cerrar Academia backend antes de tener store/auth/tenant estables, pero si dejar desde ahora el modelo de datos y los criterios de producto.
4. Cuando llegue el bloque Academia backend, implementar rutas/progreso/evaluaciones/certificados/adjuntos/notificaciones como entidades reales.

## 8. Decision de auditoria

Candidata aceptable como nueva base frontend de Academia, con reservas:

- No hay P0 bloqueante para Claude.
- Hay P1 de producto/backend para Academia real.
- Debe empalmarse aditivamente, sin reemplazar backend protegido.
- Se debe conservar este alcance como requisito permanente del documento maestro y del plan backend.
