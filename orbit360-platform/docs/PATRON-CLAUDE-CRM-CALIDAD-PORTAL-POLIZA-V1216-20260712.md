# Patrón reusable para Claude — CRM, Calidad, Portal y Póliza 360 v1.216

Fecha: 2026-07-12  
Proyecto: Orbit 360  
Aplicación: prototipo comercializable y todos los tenants  
Origen: cierre funcional local CRM OP-1 posterior al empalme v1.215

## Propósito

Este documento registra cambios funcionales hechos en la rama operativa que deben reflejarse en la próxima candidata Claude que modifique CRM, Cliente360, Calidad, Portal, Pólizas o Academia. No contiene datos, usuarios, pólizas, credenciales ni configuraciones exclusivas de A&S.

Claude no debe copiar archivos backend ni reconstruir estos flujos desde datos particulares. Debe incorporar el comportamiento reusable en la fuente principal del prototipo.

## 1. Calidad funciona antes de importar Pólizas

La vista de Calidad no puede iniciar filtrando únicamente clientes con Póliza vigente. Durante una migración por fuentes separadas, Clientes puede estar listo antes que Pólizas.

Estado inicial requerido:

```txt
soloVig = false
```

“Solo con Póliza vigente” es un filtro opcional para priorización posterior, no una condición para mostrar los clientes.

Calidad debe:

- utilizar el scope activo `propios/equipo/todos/ninguno`;
- mostrar “Mis expedientes incompletos” en vista Asesor;
- permitir filtro por asesor cuando el scope lo permita;
- funcionar con clientes en estado `pendiente_polizas`;
- identificar como mínimo teléfono/WhatsApp, correo, documento, departamento/provincia, ciudad/municipio, dirección y contacto principal para empresas;
- usar catálogos geográficos y permitir “Otro / requiere validación”;
- completar únicamente campos vacíos;
- exigir motivo o fuente de actualización;
- marcar el dato como `REQUIERE_VALIDACION`;
- registrar antes/después, actor, rol, fecha y motivo;
- crear una gestión cuando se solicite un cambio crítico.

### Prohibido

- ocultar todos los clientes porque aún no existen Pólizas;
- permitir que un Asesor reasigne, borre, fusione o cambie estados operativos;
- modificar Pólizas, cobros o documentos validados desde Calidad;
- afirmar que una campaña fue enviada cuando solo se preparó WhatsApp Web o correo.

## 2. Calidad debe ser visible para Asesor

El rol Asesor debe poder abrir Calidad de datos para sus propios clientes.

La visibilidad del módulo no cambia el alcance ni amplía permisos críticos:

```txt
módulo visible = Calidad
scope = propios
permiso = completar campos vacíos
```

No debe recibir acceso a todos los clientes, auditoría interna, credenciales, cambios de Póliza o acciones administrativas.

## 3. Estados honestos del acceso al Portal

Cliente360 debe mostrar el estado de acceso al Portal sin exponer contraseñas, tokens ni secretos.

Estados mínimos:

```txt
no_preparado
invitacion_preparada
activo_confirmado
suspendido
requiere_revision
```

### Invitación preparada

Preparar o repreparar una invitación debe registrar:

```txt
clienteId
correo snapshot
actor
rol activo
fecha
motivo
canalEstado = pendiente_confirmacion
credentialRef = backend_required
secretoExpuesto = false
```

La UI debe decir de forma explícita:

```txt
Invitación preparada · pendiente de confirmación
```

Preparar no significa:

- correo entregado;
- contraseña creada o enviada;
- cuenta activada;
- acceso confirmado.

### Acceso confirmado

Solo puede registrarse cuando existe evidencia externa de activación o ingreso. Debe exigir:

- evidencia;
- confirmación reforzada;
- actor y rol;
- fecha;
- auditoría antes/después.

### Suspensión

Suspender acceso requiere permiso y motivo. No borra al cliente ni su expediente.

## 4. Visor documental común

Cliente360, Portal y Póliza deben abrir documentos mediante un visor transversal. Los módulos entregan una referencia y metadatos; no resuelven secretos o proveedores directamente.

Contrato visible mínimo:

```txt
documentRef
nombre
tipo
origen
pais
version
vigencia
estado
responsable
externalUrl opcional
contexto de módulo/entidad
```

Sin conexión documental, la UI debe mostrar:

```txt
Referencia registrada · vista previa pendiente de conexión autorizada
```

No debe mostrar `Storage`, `backend`, `Firebase`, `Firestore`, rutas internas o credenciales.

## 5. Ficha-página propia de Póliza

Pólizas no debe depender únicamente de un drawer o de regresar al expediente Cliente360. Debe existir una ruta propia:

```txt
#/polizas?p=<policyId>
```

La página debe reunir:

- número, ramo y producto;
- cliente y Aseguradora;
- país y moneda;
- estado y si genera cartera;
- vigencia;
- suma asegurada;
- prima neta, gastos, impuestos y total;
- recibos y estados;
- documentos y documento fuente;
- acciones permitidas por rol;
- creación de gestión operativa.

La ficha debe respetar scope. Un deep-link fuera del alcance debe mostrar acceso restringido, no el registro.

### Permisos

- Dirección/Admin/Operativo autorizado: acciones según matriz y scope.
- Asesor: consulta de sus Pólizas y creación de gestión/corrección; no edición directa de campos validados.

## 6. Copy visible de Portal

Traducir cualquier texto técnico a lenguaje operativo.

Ejemplos:

```txt
Storage/backend conectado → servicio documental conectado
Storage pendiente → resguardo pendiente
API/integración pendiente → canal pendiente de conexión y confirmación
chat en línea → asistente de orientación
```

Nunca afirmar que una conexión está activa si no fue verificada.

## 7. Responsive y validación visual

Los paneles nuevos deben funcionar en:

```txt
Desktop 1366 px
Tablet 768 px
Móvil 390 px
```

Se debe comprobar:

- una columna en tablet/móvil cuando corresponda;
- tablas con scroll interno y no desbordamiento de toda la página;
- botones y overlays accesibles;
- foco y labels básicos;
- cero errores de consola;
- ausencia de copy técnico;
- roles Dirección, Operativo y Asesor;
- scopes propios/equipo/todos/ninguno cuando aplique.

## 8. Academia profunda

Actualizar Academia con rutas separadas para Dirección, Operativo y Asesor. Debe enseñar:

- rol activo y alcance de datos;
- Calidad antes de Pólizas;
- completar vacíos versus solicitar corrección;
- invitación preparada versus acceso confirmado;
- suspensión del Portal;
- visor documental;
- ficha-página de Póliza;
- cambios mediante gestión/endoso;
- seguridad y no exposición de credenciales.

Conservar progreso y certificados. No crear cursos duplicados sobre el mismo flujo.

## 9. Pruebas obligatorias para Claude

1. Clientes existen y Pólizas está vacío: Calidad muestra expedientes incompletos.
2. Asesor abre Calidad y solo ve sus clientes.
3. Operativo ve únicamente su alcance autorizado.
4. Preparar invitación no cambia a acceso confirmado.
5. Confirmar acceso exige evidencia y confirmación reforzada.
6. Suspensión conserva cliente y expediente.
7. Cliente360 abre documentos en el visor común.
8. Póliza abre en ruta propia y conserva el ID al recargar.
9. Deep-link de Póliza fuera de scope queda bloqueado.
10. Asesor no puede editar Póliza validada; puede crear gestión.
11. Portal no muestra `Storage`, `backend`, API keys, tokens o credenciales.
12. Desktop/tablet/móvil sin desbordamiento global ni errores de consola.

## 10. Aplicación local y estado Claude

```txt
¿Aplica a Claude/prototipo? Sí
Carril A: UX, módulos, copy, responsive y Academia
Carril B: contratos de acceso, Orbit.store y auditoría; Claude no reemplaza backend protegido
Carril C: no incluye payload real; funciona antes y después de recibir la fuente Pólizas
Estado local: implementado funcionalmente, pendiente gate visual final
Estado prototipo Claude: obligatorio cuando vuelva a modificar estos módulos
```

## Archivos locales de referencia

```txt
core/access-scope.js
core/crm-op1-role-visibility.js
core/document-viewer.js
modules/crm-v1198-operational-bridge.js
modules/calidad.js
modules/portal-v1198-scope-viewer-bridge.js
modules/crm-op1-closure-bridge.js
data/academia-v1216-crm-portal-poliza.js
styles/crm-op1-v1216.css
```

Claude debe implementar el comportamiento en los módulos principales de su candidata. No debe copiar configuraciones runtime, hashes, datos demo, bindings A&S o decisiones exclusivas del backend LAB.
