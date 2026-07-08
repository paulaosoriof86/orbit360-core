# Academia — impacto roles/permisos/acciones sensibles v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S / base comercializable  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Propósito

Traducir la matriz de roles/permisos/acciones sensibles en rutas de Academia para A&S y futuros tenants.

## Rutas impactadas

### Dirección

Debe aprender:

- leer matriz de permisos;
- revisar auditoría;
- aprobar cambios sensibles;
- entender límites de cada rol;
- interpretar riesgos de permisos excesivos.

Caso práctico: Dirección revisa una solicitud para activar integración y valida que no exista proveedor conectado; debe quedar pendiente.

### AdminTenant

Debe aprender:

- crear/inactivar usuarios;
- asignar roles;
- cambiar permisos con motivo;
- resetear configuración con confirmación reforzada;
- no dejar tenant sin administrador activo.

Caso práctico: inactivar un administrador cuando solo queda uno activo debe bloquearse.

### IT / Seguridad

Debe aprender:

- gestionar integraciones sin exponer credenciales;
- diferenciar configuración vs activación;
- preparar Storage futuro;
- revisar auditoría técnica;
- controlar acceso documental.

Caso práctico: una integración tiene referencia preparada, pero no credencial segura; no puede mostrarse como activa.

### Cobros / Finanzas

Debe aprender:

- validar soporte sin aplicar pago;
- aplicar pago autorizado con motivo;
- manejar país/moneda;
- revisar M5;
- auditar rechazo/bloqueo/anulación.

Caso práctico: reporte validado no aplicado no debe mover cartera ni producción.

### Operativo / Asesor

Debe aprender:

- alcance de su cartera;
- documentos visibles por rol/relación;
- gestiones permitidas;
- acciones que requieren escalamiento.

Caso práctico: asesor ve soporte de su cliente, pero no puede aplicar pago ni ver comisiones empresa si no tiene permiso.

### AcademiaAdmin

Debe aprender:

- crear rutas/lecciones;
- archivar en lugar de eliminar cuando hay progreso;
- emitir certificados manuales solo con motivo;
- sincronizar contenido cuando cambian módulos.

### ClientePortal

Debe aprender:

- qué puede hacer desde portal;
- qué no puede cambiar directamente;
- cómo reportar pagos/documentos;
- qué significa revisión.

### AuditorSoloLectura

Debe aprender:

- revisar bitácora;
- no ejecutar acciones;
- identificar hallazgos de permisos.

## Lecciones obligatorias

1. Mapa de roles Orbit 360.
2. Qué es una acción sensible.
3. Qué acciones requieren motivo.
4. Qué acciones requieren confirmación reforzada.
5. No dejar tenant sin administrador activo.
6. Integración configurada vs activa.
7. Pago reportado/validado/aplicado.
8. Documento recibido/diff/aprobación.
9. Auditoría y bitácora.
10. Permisos por cartera, rol y relación.

## Quizzes de decisión

- ¿Quién puede activar una integración real?
- ¿Qué pasa si se intenta inactivar el último administrador?
- ¿Puede ClientePortal ver documentos de otro cliente?
- ¿Puede Asesor aplicar pago?
- ¿Qué debe pedir el sistema antes de anular un cobro?
- ¿Por qué eliminar una lección con progreso debe bloquearse o convertirse en archivo?

## Certificados sugeridos

```txt
Administración segura de tenant
Operación de Cobros con gates
Seguridad documental por rol
Auditoría Orbit 360
AcademiaAdmin y gobierno de contenidos
```

## Instrucción para Claude

Claude debe reflejar esta matriz en Academia y UX:

- contenido por rol;
- rutas adaptadas a permisos;
- botones deshabilitados con explicación;
- modales de motivo;
- confirmación reforzada;
- bitácora visible para roles autorizados.

## Estado

Impacto Academia documentado. Debe agregarse al próximo paquete Claude si aún no fue incorporado.