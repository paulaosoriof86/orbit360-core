# Pendientes acumulados post-v1.251

Fecha: 2026-07-14  
Estado: no bloquean el empalme; se acumulan para el próximo paquete de Claude o para bloques backend específicos.

## A. Paridad prototipo / runtime comercializable

1. Propagar el gate central a mutaciones legacy no auditadas de:
   - Finanzas;
   - Comisiones;
   - Cronograma/tareas;
   - Cotizador cuando seleccione cliente o asesor;
   - Correo cuando vincule entidades por ID;
   - otras acciones administrativas directas.
2. Unificar progresivamente `Orbit.access` y `Orbit.accessScope` detrás de una única API pública, sin perder compatibilidad.
3. Añadir `action` y política de colección explícita al gate para diferenciar lectura, completar datos y administración.
4. Eliminar defaults históricos `ase001` que todavía existan fuera de los flujos cubiertos.
5. Mantener cualquier registro sin asesor fuera de `own/team` y llevarlo a calidad/corrección.

## B. Aseguradoras

1. Validación visual faltante en viewports exactos:
   - Dirección 1366×768;
   - Operativo 768×1024;
   - Asesor 390×844.
2. Completar evidencia consolidada 15/15 sin repetir los 12 escenarios ya aprobados.
3. Confirmar visualmente:
   - cuentas completas/copiar para todos los usuarios del módulo;
   - plataformas para Dirección/Operativo;
   - credenciales restringidas para Asesor;
   - edición bancaria separada.
4. Override de plantilla de impresión por aseguradora individual.
5. Orden de secciones realmente configurable, no solo etiquetas/visibilidad.

## C. Cotizador / Comparativo

1. Criterios nuevos realmente configurables por tenant, no únicamente etiquetas de los tres criterios actuales.
2. Motivo y before/after al cambiar ponderaciones.
3. Override por aseguradora.
4. Confirmar persistencia y recarga del timeline después de replantear.
5. Validación visual integrada con `comparativo_final_v110.html` sin hardcodear A&S.

## D. Equipo / permisos

1. Confirmar persistencia real de motivo exacto y diff integral en el store conectado.
2. Confirmar que ampliar país, módulo, scope, rol o retirar restricción exige motivo y confirmación reforzada.
3. Registrar la sesión/rol activo del actor usando identidad real cuando Auth esté conectado.

## E. Academia

Actualizar cursos existentes, sin duplicar:

- sesión e identidad fail-closed;
- alcance por país aunque el selector diga “Todos”;
- lista visible no autoriza detalle/acción;
- bancos versus credenciales;
- lectura verificada versus escritura habilitada;
- registros sin asesor y gestiones de corrección;
- importación por fuentes separadas.

Pendiente evidencia de rutas, progreso, evaluaciones y certificados con backend real.

## F. Documentación

1. Mantener el manifiesto v1.251 de Claude como evidencia de la candidata, pero el documento de empalme de la rama prevalece para runtime.
2. No sustituir el CHANGELOG vivo de backend con el CHANGELOG del ZIP.
3. Corregir en una futura consolidación referencias históricas que afirmen “datos reales” cuando la prueba fue con seed.
4. Actualizar README vivo en el siguiente bloque documental consolidado, sin borrar el plan operativo actual.

## G. No enviar aún a Claude

Claude perdió capacidad. Estos puntos se acumulan hasta que exista un bloque suficientemente grande o una regresión crítica nueva. No generar otro paquete por cambios menores.
