# ADENDUM OBLIGATORIO - Academia profunda interactiva y continuidad por modulo

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Tenant principal: `alianzas-soluciones`
Repositorio: `paulaosoriof86/orbit360-core`
Rama backend activa: `ays/backend-tenant-lab-v99-20260703`
PR vigente: #5 draft, sin merge, sin deploy

---

## 0. Estado de base activa

La base frontend/prototipo activa para continuidad, auditorias y empalmes es siempre la candidata mas reciente auditada y aceptada.

Al crear este adendum, la candidata activa de Claude es:

```txt
Prototype Development Request - 2026-07-04T152321.882.zip
```

Esta candidata contiene los avances de Academia v1.118-v1.123 y no debe ser reemplazada por una version anterior. Cualquier nuevo candidato debe compararse contra esta base activa o contra la siguiente base que haya sido auditada y aceptada formalmente.

Regla obligatoria:

```txt
Antes de auditar, modificar, empalmar o continuar backend/frontend, confirmar la ultima candidata activa y no trabajar sobre una version anterior.
```

---

## 1. Proposito del adendum

Este adendum fija el alcance permanente de Academia como sistema de induccion, autocapacitacion, profesionalizacion y adopcion guiada de Orbit 360.

Academia no debe quedar como una biblioteca de textos basicos. Debe convertirse progresivamente en una experiencia profunda, interactiva, por rol, conectada con los modulos reales, con evaluaciones utiles, rutas claras, trazabilidad, certificados, notificaciones y actualizaciones cuando cambie la plataforma.

El objetivo es que cualquier persona nueva pueda entrar a la plataforma y entender:

- que es la empresa;
- como trabaja la empresa;
- cual es su rol;
- que debe aprender primero;
- que modulos debe usar;
- que botones debe oprimir;
- que flujo activa cada accion;
- a quien notifica;
- que impacto tiene en clientes, asesores, operativos, cobros, polizas, renovaciones y reportes;
- que valor agregado le genera la plataforma en su trabajo diario;
- que beneficios genera para el cliente;
- como profesionalizarse en seguros, servicio, ventas, operacion, tecnologia e IA.

---

## 2. Prioridad: no desviarse del backend critico

Academia es importante y debe mantenerse en el plan, pero no debe desplazar los bloques criticos de backend.

La prioridad tecnica sigue siendo:

1. Auth real, usuarios, roles, permisos y tenant.
2. `Orbit.store` real con API exacta y tenant isolation.
3. Seguridad, secretos, reglas y auditoria.
4. Importadores/validadores por fuentes separadas.
5. Documentos, adjuntos y trazabilidad.
6. Integraciones y notificaciones.
7. Modulos operativos criticos: Cliente360, Polizas, Cobros, Portal, Ops/Leads, Finanzas, Aseguradoras, Cotizador/Comparativo.
8. Academia backend real: rutas, progreso, evaluaciones, certificados, recursos, notificaciones y actualizaciones de contenido.

Regla practica:

```txt
Se documenta y se mejora Academia desde ahora; se implementa backend real de Academia cuando Auth, usuarios, roles, store y documentos persistentes esten listos.
```

---

## 3. Alcance funcional minimo de Academia profunda

### 3.1 Rutas por rol

Academia debe ofrecer rutas de aprendizaje por rol, no solo cursos sueltos.

Rutas minimas:

- Asesor nuevo.
- Administrativo/operativo.
- Marketing.
- Direccion / Superadmin / IT.
- Cliente nuevo en portal.
- Asesor con experiencia que necesita adopcion de Orbit.
- Asesor sin experiencia previa en seguros.
- Usuario de aseguradora o aliado, si el tenant lo habilita.

Cada ruta debe tener:

- objetivo;
- publico objetivo;
- orden recomendado;
- modulos obligatorios;
- modulos opcionales;
- prerequisitos;
- duracion sugerida;
- evaluaciones;
- certificado;
- avance por usuario;
- version;
- fecha de ultima actualizacion.

### 3.2 Profundidad esperada por leccion

Cada leccion debe explicar:

1. Para que sirve.
2. Por que importa comercial/operativamente.
3. Quien la usa.
4. Que datos lee.
5. Que datos escribe.
6. Que botones o acciones realiza el usuario.
7. Que cambia en otros modulos.
8. Que notificaciones se generan.
9. Que errores debe evitar.
10. Que ejemplo practico debe poder resolver.
11. Que evidencia demuestra que aprendio.

### 3.3 Interactividad minima

Academia debe evolucionar hacia una experiencia interactiva con:

- checklist por leccion;
- pasos guiados;
- ejemplos por rol;
- mini casos practicos;
- simulaciones de flujo;
- preguntas de comprension;
- evaluacion aplicada;
- retroalimentacion por respuesta;
- recursos descargables o vinculados;
- alertas de actualizacion;
- progreso individual.

### 3.4 Evaluaciones utiles

Los quizzes no deben medir memoria superficial. Deben medir capacidad de operar y decidir.

Tipos de pregunta recomendados:

- que hacer ante un caso;
- que modulo usar;
- que boton/accion corresponde;
- que dato falta;
- que notificacion deberia generarse;
- que riesgo operativo existe;
- que no se debe prometer al cliente;
- que fuente de datos es valida;
- que accion requiere validacion.

---

## 4. Rutas minimas por rol

### 4.1 Asesor nuevo

Debe cubrir:

1. Bienvenida a la empresa, cultura, valores, confidencialidad y datos personales.
2. Conceptos basicos de seguros: prima, cobertura, deducible, suma asegurada, exclusiones, vigencia, siniestro, infraseguro.
3. Productos por ramo: autos, vida, gastos medicos, hogar, responsabilidad civil, transporte/carga, fianzas.
4. Venta consultiva: diagnostico, propuesta de valor, objeciones, cierre, seguimiento y multiventa.
5. Orbit comercial: Leads, Cotizador, Comparativo, Aseguradoras, Cliente360.
6. Como pedir gestiones operativas y dar seguimiento.
7. Como leer notificaciones y estados.
8. Cumplimiento: que puede prometer y que no.
9. Evaluacion aplicada y certificado.

### 4.2 Administrativo / operativo

Debe cubrir:

1. Bienvenida, cultura y estandar de servicio.
2. Cliente360 y expediente.
3. Polizas: estados, vigencias, recibos, prima neta/gastos/IVA/total.
4. Cobros: cartera, aging, pagos, conciliacion, soporte adjunto.
5. Portal: solicitudes del cliente, pagos reportados, adjuntos y estado de respuesta.
6. Ops: donde aparecen gestiones de cliente y asesor, como asignarlas, resolverlas y notificar.
7. Renovaciones, cancelaciones y siniestros.
8. Finanzas y comisiones segun permisos.
9. Evaluacion practica y certificado.

### 4.3 Cliente nuevo

Debe cubrir:

1. Bienvenida a A&S / tenant correspondiente.
2. Que puede hacer en el portal.
3. Como ver polizas, recibos y documentos.
4. Como reportar pagos y adjuntar soporte.
5. Como pedir una gestion.
6. Que tiempos de respuesta esperar.
7. Como contactar a su asesor.
8. Conceptos basicos de seguros por ramo.
9. Privacidad y uso de datos.

### 4.4 Marketing

Debe cubrir:

1. Manual de identidad, tono y reglas legales de comunicacion.
2. Calendario de contenidos.
3. Segmentacion desde datos reales.
4. Leads generados por campana.
5. Integraciones: Metricool, Canva, Make, correo, redes.
6. Proteccion de datos.
7. Reportes y medicion.

### 4.5 Direccion / Superadmin / IT

Debe cubrir:

1. Configuracion de tenant: marca, logo, paleta, paises, moneda, glosario.
2. Usuarios, roles, permisos y modulos visibles.
3. Importador y fuentes separadas.
4. Integraciones y addons.
5. Automatizaciones.
6. Academia: crear cursos, asignar rutas, medir avance.
7. Seguridad, secretos y datos reales.
8. Mantenimiento trimestral.

---

## 5. Modelo backend esperado cuando llegue la fase Academia

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

Separacion obligatoria:

- `cursos` = contenido y version.
- `rutasAprendizaje` = secuencia por rol.
- `cursoProgresoUsuario` = avance individual.
- `intentosEvaluacion` = respuestas, intentos, calificacion y aprobacion.
- `certificados` = certificado por persona, curso y version.
- `manualesModulo` = manual vivo por modulo.
- `historialActualizacionContenido` = trazabilidad de cambios.

---

## 6. Regla obligatoria: cada cambio de modulo exige revisar Academia y manuales

Cada vez que Claude, ChatGPT/Codex o cualquier empalme modifique un modulo, se debe revisar obligatoriamente:

1. Que flujo cambio.
2. Que boton, KPI, estado, filtro, tabla, notificacion o adjunto cambio.
3. Que datos lee/escribe el modulo.
4. Que manual debe actualizarse.
5. Que curso/leccion/ruta debe actualizarse.
6. Que evaluacion debe ajustarse.
7. Que notificacion de actualizacion debe generarse para los usuarios.
8. Que pendiente queda si no se alcanza a actualizar.

Formato fijo en toda auditoria futura:

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

---

## 7. Regla de auditoria de avance de Academia

En cada auditoria de candidato Claude se debe incluir una seccion especifica:

```txt
Avance de Academia profunda
- Que cursos/rutas nuevas agrega:
- Que roles cubre:
- Que modulos cubre:
- Que profundidad real tiene:
- Que interactividad tiene:
- Que evaluaciones tiene:
- Que sigue siendo superficial:
- Que falta para backend real:
- Que debe mejorar Claude:
```

No basta decir que Academia mejora. Se debe revisar con detalle si realmente ensena a usar la plataforma, si guia por rol y si explica impacto operativo/comercial.

---

## 8. Hallazgo ya registrado: Portal / pago reportado / adjunto

Hallazgo reportado por Paula:

Cuando el cliente reporta un pago en Portal y adjunta soporte, aparece la gestion/log, pero no se ve el adjunto.

Criterio esperado:

- adjunto persistido como documento;
- relacion gestion-documento;
- acceso visible para operativo/cobros;
- notificacion interna con enlace;
- estado visible para cliente;
- posibilidad de conciliacion desde Cobros.

Este hallazgo debe mantenerse en pendientes hasta que se audite y corrija el bloque Portal/Cobros/Documentos/Notificaciones.

---

## 9. Instruccion para Claude

Claude debe profundizar progresivamente Academia y no tratarla como texto estatico. Cada paquete que modifique modulos debe revisar si corresponde actualizar:

- manual maestro;
- manual del modulo;
- curso de Academia;
- ruta por rol;
- evaluaciones;
- notificaciones de actualizacion;
- bitacora y pendientes.

Tambien debe conservar el estilo de plataforma: componentes, tarjetas, rutas, progreso, interaccion, preguntas y flujo guiado. No entregar solo texto plano.

---

## 10. Instruccion para ChatGPT/Codex

ChatGPT/Codex debe conservar este alcance dentro del plan backend y documentar todo hallazgo en repo, pero sin desplazar los bloques criticos.

Cuando llegue la fase Academia backend, debe implementar entidades reales para:

- rutas por rol;
- asignacion automatica por usuario/rol/tenant;
- progreso por usuario;
- evaluaciones con intentos;
- certificados;
- notificaciones;
- recursos/adjuntos;
- versionado de cursos;
- historial de actualizacion.

---

## 11. Texto recomendado para instrucciones del proyecto

Agregar este bloque a las instrucciones del proyecto para que el adendum sea lectura obligatoria:

```txt
Para Orbit 360 A&S, ademas del documento maestro de continuidad, leer obligatoriamente el archivo ADENDUM-ACADEMIA-PROFUNDA-INTERACTIVA-ORBIT360-AYS-20260704.md antes de auditar candidatos, empalmar prototipos, modificar modulos, generar pendientes para Claude o continuar backend. Academia debe tratarse como sistema profundo e interactivo de induccion y autocapacitacion por rol. En cada auditoria de candidato se debe revisar el avance de Academia; y cada vez que cambie un modulo se debe validar si deben actualizarse manuales, lecciones, rutas, evaluaciones y notificaciones relacionadas. No desplazar el backend critico, pero documentar y preservar siempre este alcance.
```
