# Plan permanente - Academia profunda, rutas por rol y actualizacion de manuales

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Estado: requisito permanente de producto y backend. No reemplaza el plan critico de backend; lo complementa.

## 1. Objetivo

Academia debe convertirse en un sistema real de autocapacitacion, induccion y profesionalizacion por rol. El objetivo no es tener textos descriptivos, sino una ruta guiada que permita que una persona nueva entienda:

- que es la empresa;
- como trabaja la empresa;
- que valores, normas y criterios legales aplican;
- cual es su rol;
- que modulos debe usar;
- que boton oprime;
- que flujo activa;
- que impacto tiene cada accion en otros modulos;
- que notificaciones genera;
- que beneficio operativo y comercial produce;
- como profesionalizarse en seguros, servicio, ventas y herramientas digitales.

## 2. Principio de prioridad

No se debe desviar el backend critico.

Prioridad backend sigue siendo:

1. Auth/usuarios/roles/tenant.
2. `Orbit.store` real y API compatible.
3. Seguridad, reglas, tenant isolation y secretos.
4. Importadores/validadores por fuentes separadas.
5. Documentos/adjuntos y trazabilidad.
6. Integraciones y notificaciones.
7. Modulos operativos criticos: clientes, polizas, cobros, portal, ops/leads, finanzas.
8. Academia backend real: rutas/progreso/evaluaciones/certificados.

Academia se documenta desde ahora y se mejora incrementalmente, pero su backend real debe entrar cuando existan Auth, usuarios, roles, store y documentos persistentes.

## 3. Alcance funcional deseado por rol

### Asesor nuevo

Ruta minima:

1. Bienvenida a la empresa: historia, proposito, valores, legal, confidencialidad, datos personales.
2. Conceptos basicos de seguros: prima, cobertura, deducible, suma asegurada, exclusiones, siniestro, infraseguro.
3. Producto por ramo: Auto, Vida, Gastos Medicos, Hogar, RC, Transporte, Fianzas.
4. Venta consultiva: diagnostico, propuesta de valor, objeciones, cierre, multiventa.
5. Orbit Comercial: Leads, Cotizador, Comparativo, Aseguradoras, Cliente 360.
6. Gestion operativa desde rol asesor: solicitar gestion, seguimiento, notificaciones, trazabilidad.
7. Cumplimiento y datos: que puede prometer, que no, manejo de documentos, no inventar informacion.
8. Evaluacion y certificado.

### Administrativo / operativo

Ruta minima:

1. Bienvenida a la empresa, valores y criterios de servicio.
2. Cliente 360: expediente, documentos, actividades, calidad de datos.
3. Polizas: estados, vigencias, recibos, prima neta/gastos/IVA/total.
4. Cobros: cartera, aging, aplicar pago, reportes de pago, conciliacion.
5. Portal: solicitudes del cliente, pagos reportados, adjuntos, estados.
6. Ops: donde aparecen gestiones de cliente/asesor, como asignarlas, resolverlas y notificar.
7. Renovaciones/cancelaciones/siniestros.
8. Finanzas/comisiones solo segun permisos.
9. Evaluacion practica y certificado.

### Marketing

Ruta minima:

1. Identidad de marca, tono, manual de identidad y Registro SIB cuando aplique.
2. Calendario de contenidos.
3. Segmentacion desde datos reales.
4. Leads generados por campana.
5. Integraciones honestas: Metricool, Canva, Make, correo, redes.
6. Proteccion de datos para campanas.
7. Reportes de resultados.
8. Evaluacion y certificado.

### Direccion / Superadmin / IT

Ruta minima:

1. Configuracion de tenant: marca, logo, paleta, pais, moneda, glosario.
2. Roles, usuarios, permisos y modulos visibles.
3. Importador y fuentes separadas.
4. Integraciones y addons por plan.
5. Automatizaciones.
6. Academia: crear cursos, asignar rutas, revisar avance.
7. Mantenimiento trimestral de plataforma.
8. Auditoria, seguridad, secretos y datos reales.

### Cliente nuevo

Ruta minima desde portal:

1. Bienvenida a la empresa.
2. Que puede hacer en el portal.
3. Como ver polizas, recibos y documentos.
4. Como reportar pago y adjuntar soporte.
5. Como pedir una gestion y que tiempos esperar.
6. Conceptos basicos de seguros por ramo.
7. Como contactar a su asesor.
8. Privacidad y uso de datos.

## 4. Modelo backend requerido

Colecciones sugeridas:

```txt
cursos
lecciones
rutasAprendizaje
rutaCursos
cursoProgresoUsuario
evaluaciones
intentosEvaluacion
certificados
notificacionesAcademia
solicitudesCapacitacion
recursosAcademia
manualesModulo
historialActualizacionContenido
```

### cursos

Contenido/version del curso, no progreso global.

Campos esperados:

- tenantId;
- titulo;
- categoria;
- descripcion;
- rolObjetivo[];
- paises[];
- tags[];
- version;
- estado;
- creadoPor;
- actualizadoPor;
- createdAt;
- updatedAt.

### rutasAprendizaje

Secuencia formal por rol.

Campos esperados:

- tenantId;
- nombre;
- rolObjetivo;
- descripcion;
- duracionDias;
- obligatoria;
- cursosOrdenados[];
- prerequisitos[];
- version;
- vigenciaDesde;
- vigenciaHasta;
- estado.

### cursoProgresoUsuario

Avance individual.

Campos esperados:

- tenantId;
- userId;
- cursoId;
- rutaId;
- progresoPct;
- leccionActual;
- completadoAt;
- estado;
- tiempoInvertidoMin;
- updatedAt.

### intentosEvaluacion

Trazabilidad de aprendizaje.

Campos esperados:

- tenantId;
- userId;
- cursoId;
- evaluacionId;
- intento;
- respuestas;
- score;
- aprobado;
- createdAt.

### certificados

Certificado por persona, curso y version.

Campos esperados:

- tenantId;
- userId;
- cursoId;
- cursoVersion;
- certificadoId;
- folio;
- emitidoAt;
- estado.

## 5. Regla de actualizacion permanente al modificar modulos

Cada vez que Claude o ChatGPT/Codex modifiquen un modulo, se debe revisar:

1. Si cambia flujo, boton, KPI, estado, notificacion, adjunto o sincronizacion.
2. Si cambia manual del modulo.
3. Si cambia curso de Academia relacionado.
4. Si debe agregarse evaluacion o pregunta nueva.
5. Si debe notificarse a usuarios por rol.
6. Si no se alcanza a actualizar, registrar pendiente explicito.

Esto aplica especialmente a:

- Portal;
- Cobros;
- Ops;
- Leads;
- Cliente360;
- Polizas;
- Aseguradoras;
- Cotizador/Comparativo;
- Finanzas;
- Marketing;
- Integraciones;
- Configuracion;
- Academia.

## 6. Hallazgo inicial para revisar pronto

Paula detecto que en Portal, cuando el cliente reporta un pago y adjunta soporte, la gestion/log aparece pero el adjunto no queda visible. Esto se debe revisar en el bloque Portal/Cobros/Documentos/Notificaciones.

Esperado:

- adjunto persistido como documento;
- relacion gestion-documento;
- acceso visible para operativo/cobros;
- notificacion interna con enlace;
- estado visible para el cliente.

## 7. Criterio de auditoria para futuras candidatas Claude

A partir de esta fecha, cada auditoria de candidato debe reportar una seccion fija:

```txt
Impacto en manuales y Academia
- Modulos modificados:
- Manuales que deberian actualizarse:
- Cursos/rutas afectados:
- Evaluaciones afectadas:
- Notificaciones o novedades de aprendizaje requeridas:
- Pendiente para Claude:
- Pendiente backend:
```

## 8. Estado actual

La candidata v1.123 mejora profundamente Academia desde el prototipo. Queda aceptada como base de contenido, pero todavia no reemplaza el modelo backend requerido para rutas por usuario, evaluaciones trazables, certificados por persona, adjuntos persistentes y notificaciones reales.
