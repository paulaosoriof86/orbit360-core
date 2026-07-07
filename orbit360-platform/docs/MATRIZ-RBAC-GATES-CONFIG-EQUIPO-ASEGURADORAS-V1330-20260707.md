# Matriz RBAC/Gates — Configuración, Equipo y Aseguradoras v1330

Fecha: 2026-07-07
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open

## Objetivo

Definir cómo deben administrarse Configuración, Equipo y Aseguradoras sin depender de correcciones externas, pero evitando que la UI permita mutaciones sensibles sin control.

La meta es que Orbit 360 sea administrable por tenant/proyecto, con acciones directas y auditables.

## Principios

1. La administración debe existir dentro de la plataforma.
2. No todo usuario puede ejecutar toda acción.
3. Toda acción sensible debe tener gate.
4. Todo gate debe registrar auditoría o actividad.
5. Las acciones preparadas no deben describirse como ejecutadas.
6. La configuración del tenant no debe depender de hardcode A&S.
7. A&S es tenant por configuración; no fork.
8. La UI puede preparar, proponer o registrar, pero backend/proveedor confirma ejecución real.

## Roles base sugeridos

```txt
Orbit interno
Dirección
Admin tenant
Operaciones
Comercial / Asesor
Cobros
Siniestros
Marketing
Consulta / Solo lectura
Cliente portal
```

## Niveles de gate

### Gate 0 — Lectura

Sin confirmación. Respeta módulos visibles y país/tenant.

### Gate 1 — Acción operativa menor

Requiere usuario autenticado/rol permitido. Puede registrar actividad.

Ejemplos:

- agregar nota;
- preparar correo;
- preparar recordatorio;
- abrir expediente;
- crear solicitud operativa.

### Gate 2 — Mutación administrativa

Requiere confirmación y auditoría.

Ejemplos:

- editar usuario;
- editar aseguradora;
- cambiar estado de siniestro;
- validar propuesta;
- guardar recuperación;
- activar/desactivar módulos.

### Gate 3 — Acción crítica tenant/provisioning

Requiere rol Dirección/Admin/Orbit interno, motivo obligatorio y auditoría before/after.

Ejemplos:

- cambiar plan del tenant;
- resetear configuración;
- editar permisos;
- borrar aseguradora;
- activar APIs/credenciales;
- modificar módulos críticos;
- eliminar/desactivar usuarios admin.

## Colección de auditoría sugerida

Si no existe una colección central de auditoría, usar temporalmente `actividades` solo para trazabilidad visible y documentar pendiente de backend.

Formato sugerido:

```txt
audit_events
- id
- tenantId
- modulo
- entidadTipo
- entidadId
- accion
- nivel
- usuarioId
- usuarioNombre
- rol
- fechaHora
- beforeResumen
- afterResumen
- motivo
- resultado
- origen
```

En prototipo, si no hay backend real, puede registrarse con `Orbit.store.insert('actividades', ...)` siempre que el texto diga auditoría local/prototipo y no seguridad productiva.

## Matriz — Configuración interna

### Cambiar plan del cliente

Nivel: Gate 3.

Permitido para:

- Orbit interno;
- Dirección;
- Admin tenant autorizado si el modelo comercial lo permite.

Debe requerir:

- confirmación;
- motivo;
- before/after del plan;
- auditoría tenant.

No debe permitir:

- cambiar plan sin usuario/rol;
- presentar cambio como facturación real;
- activar APIs reales por cambiar plan.

Impacto Claude/prototipo: la UI debe mostrar “cambiar plan configurado” y no “plan facturado” si no hay facturación conectada.

Impacto Academia: explicar que plan habilita módulos/add-ons, pero facturación y contrato real pertenecen a backend/comercial.

### Guardar módulos activos

Nivel: Gate 3.

Permitido para:

- Orbit interno;
- Dirección;
- Admin tenant.

Debe requerir:

- confirmación;
- motivo cuando se apaga un módulo;
- impedir apagar `configuracion`;
- idealmente impedir apagar `equipo` si no existe otra vía de administración;
- auditoría before/after de lista de módulos.

No debe permitir:

- dejar tenant sin módulo de configuración;
- ocultar módulos críticos sin trazabilidad.

Impacto Claude/prototipo: el menú debe responder a módulos activos, pero siempre debe existir ruta segura de recuperación/admin.

Impacto Academia: ruta de Admin debe enseñar qué implica apagar cada módulo.

### Resetear tenant

Nivel: Gate 3 crítico.

Permitido para:

- Orbit interno;
- Dirección.

Debe requerir:

- confirmación fuerte;
- motivo;
- advertencia de alcance;
- auditoría before/after;
- backup previo si hay backend real.

No debe permitir:

- resetear con datos reales sin backup;
- resetear desde usuario no admin;
- resetear sin aviso claro de consecuencias.

Impacto Claude/prototipo: botón debe decir “Restablecer configuración” y no sugerir borrado de datos reales si solo resetea preferencias.

Impacto Academia: incluir lección de recuperación/configuración segura.

### Activar add-ons / integraciones

Nivel: Gate 2 o Gate 3 según integración.

- Add-on visual/preparado: Gate 2.
- API/OAuth/proveedor real: Gate 3 + backend.

Debe distinguir:

```txt
Disponible por plan
Configurado
Conectado
Probado
Activo
Error
```

No debe presentar “activo” si solo está configurado.

Impacto Claude/prototipo: conservar badges de estado honesto.

Impacto Academia: explicar diferencias entre add-on visible, integración configurada e integración real activa.

## Matriz — Equipo / usuarios / permisos

### Crear usuario

Nivel: Gate 2.

Permitido para:

- Dirección;
- Admin tenant;
- Orbit interno.

Debe requerir:

- nombre;
- correo;
- rol principal;
- confirmación;
- actividad/auditoría.

Debe decir:

```txt
Usuario creado en equipo. Invitación/Auth real pendiente de backend/canal conectado.
```

No debe decir:

```txt
Invitación enviada
Credenciales activas
Usuario ya puede ingresar
```

si Auth/correo no está conectado.

Impacto Claude/prototipo: formularios de usuario deben conservar copy honesto de Auth pendiente.

Impacto Academia: enseñar diferencia entre usuario operativo en equipo y usuario autenticado en backend.

### Editar roles

Nivel: Gate 3.

Debe requerir:

- confirmación;
- motivo;
- before/after de roles;
- auditoría.

No debe permitir:

- dejar tenant sin Dirección/Admin;
- que un usuario sin permiso escale su propio rol;
- cambiar roles sin traza.

Impacto Claude/prototipo: UI debe mostrar advertencia al cambiar roles sensibles.

Impacto Academia: incluir evaluación sobre permisos y segregación de funciones.

### Editar módulos visibles por usuario

Nivel: Gate 2/3.

Gate 2 para restricciones operativas normales.
Gate 3 si se quita Configuración/Equipo a un admin.

Debe requerir:

- confirmación;
- auditoría de módulos before/after.

No debe permitir:

- bloquear acceso de recuperación/admin sin alternativa.

Impacto Claude/prototipo: mostrar resumen de módulos que se van a habilitar/deshabilitar antes de guardar.

### Editar permisos por rol

Nivel: Gate 3 crítico.

Debe requerir:

- Dirección/Admin/Orbit interno;
- motivo;
- auditoría;
- confirmación fuerte.

No debe permitir:

- editar permisos sin explicación;
- quitar permisos de admin a todos;
- habilitar acciones críticas para roles operativos sin confirmación.

Impacto Claude/prototipo: permisos deben verse como matriz sensible, no como preferencias simples.

Impacto Academia: capacitación obligatoria para administradores.

### Inactivar usuario

Nivel: Gate 2/3.

Gate 2 para usuario operativo.
Gate 3 si es admin/dirección.

Debe requerir:

- confirmación;
- motivo;
- auditoría;
- reasignación sugerida de cartera/gestiones si aplica.

No debe permitir:

- inactivar último admin.

Impacto Claude/prototipo: al inactivar, ofrecer revisar cartera/gestiones asignadas.

## Matriz — Aseguradoras

### Activar/desactivar vinculación

Nivel: Gate 2.

Debe requerir:

- confirmación si se desactiva;
- auditoría;
- advertencia de impacto en cotizador, emisión, comparativo y cartera.

No debe borrar datos históricos.

Impacto Claude/prototipo: desactivar vinculación no es eliminar aseguradora.

Impacto Academia: enseñar diferencia entre directorio y aseguradora vinculada.

### Crear aseguradora

Nivel: Gate 2.

Debe requerir:

- país;
- moneda esperada por país;
- nombre;
- estado inicial preferible: sin vincular;
- auditoría.

No debe mezclar GT/CO ni comisiones sin fuente.

Impacto Claude/prototipo: wizard debe pedir país/moneda desde el inicio.

Impacto Academia: explicar que aseguradora se habilita por país/tenant.

### Editar cuentas bancarias

Nivel: Gate 3.

Debe requerir:

- confirmación;
- motivo;
- auditoría before/after;
- validación de moneda;
- advertencia de impacto en cobros/conciliación.

No debe permitir:

- cuenta sin moneda;
- cuenta sin banco;
- usar datos reales en demo.

Impacto Claude/prototipo: marcar cuentas como datos sensibles.

Impacto Academia: módulo de conciliación debe enseñar revisión de cuentas por aseguradora.

### Editar portales/accesos

Nivel: Gate 3.

Debe mantener:

```txt
credentialRef/backend_required
```

Debe prohibir:

- guardar contraseña real en frontend;
- mostrar secretos;
- exportar credenciales.

Debe permitir:

- URL;
- usuario visible si es necesario;
- referencia a credencial segura backend.

Impacto Claude/prototipo: campo password debe ser placeholder, no persistencia real.

Impacto Academia: enseñar bóveda/credenciales seguras como integración backend.

### Editar comisiones por ramo

Nivel: Gate 3.

Debe requerir:

- confirmación;
- fuente: planilla, contrato, manual o autorización;
- país/moneda si aplica;
- auditoría before/after;
- periodo de vigencia.

No debe permitir:

- usar tarifas simuladas como productivas;
- aplicar comisiones desde planillas sin filas reales.

Impacto Claude/prototipo: UI debe mostrar fuente y vigencia de tarifa.

Impacto Academia: comisión se calcula sobre prima neta recaudada; tarifas deben venir de fuente validada.

### Borrar aseguradora

Nivel: Gate 3 crítico.

Regla obligatoria:

- Si tiene pólizas, reclamos, cobros, comisiones o documentos vinculados, bloquear borrado.
- Ofrecer “desactivar vinculación” como alternativa.

Solo permitir borrado si:

- no tiene vínculos operativos;
- usuario tiene rol permitido;
- confirma;
- registra motivo y auditoría.

Impacto Claude/prototipo: botón debe decir claramente “Borrar del directorio” y explicar que no aplica con historial vinculado.

Impacto Academia: enseñar que datos históricos no se borran para conservar trazabilidad.

### Importar directorio / planillas de comisión

Nivel: Gate 2 para dry-run, Gate 3 para aplicar.

Debe cumplir:

- dry-run;
- diff;
- fuente/archivo/hoja/fila;
- país/moneda;
- confirmar antes de escribir;
- no mezclar fuentes;
- no simular tarifas si no vienen de filas reales.

Impacto Claude/prototipo: importador debe mostrar revisar/aprobar antes de aplicar.

Impacto Academia: incluir ruta de importación controlada por fuente.

## Pantallas administrativas recomendadas

### Centro de acciones administrativas

Debe mostrar:

- acciones pendientes de aprobación;
- acciones ejecutadas;
- acciones bloqueadas;
- motivo;
- usuario;
- módulo;
- entidad;
- fecha;
- resultado.

### Bitácora de auditoría por tenant

Debe filtrar por:

- módulo;
- usuario;
- entidad;
- acción;
- nivel;
- fecha;
- país;
- resultado.

### Modo recuperación/admin interno

Debe permitir a Orbit interno recuperar configuración de tenant sin tocar datos productivos, con auditoría.

## Prioridad de implementación sin Codex

Como no hay créditos Codex y PowerShell largo no es viable:

1. Mantener estos documentos como contrato de implementación.
2. No cerrar hotfixes funcionales sin verificación en GitHub.
3. Avanzar auditoría y especificaciones de gates.
4. Cuando haya capacidad o entorno local controlado, aplicar primero:
   - Cobros lote;
   - Aseguradoras borrar/desactivar;
   - Equipo roles/permisos;
   - Configuración módulos/plan/reset.

## Criterios de aceptación para cerrar esta fase

No cerrar gates administrativos hasta que exista evidencia de:

- código funcional aplicado;
- `node --check` de archivos modificados;
- validador backend LAB OK si disponible;
- PR open/draft/no merge/no deploy;
- backend protegido intacto;
- documentación de impacto Claude;
- documentación de impacto Academia.

## Estado

Documento de contrato y matriz creado.
No se tocó código funcional.
No se tocó backend protegido.
No se tocó `index.html`.
No merge.
No deploy.
No datos reales.
No secretos.
