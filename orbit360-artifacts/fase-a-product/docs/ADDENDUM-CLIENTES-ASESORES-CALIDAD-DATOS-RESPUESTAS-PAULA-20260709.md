# Addendum — Clientes, asesores y calidad de datos con respuestas de Paula

Fecha: 2026-07-09  
Proyecto: Orbit 360 A&S  
Fuente real: `Contratantes Datos de Contacto 2026-07-08.xlsx`  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Contexto

Paula confirmó reglas adicionales para la migración de clientes desde Siga CRM y para el funcionamiento futuro multi-tenant del importador y del módulo Clientes.

Estas reglas aplican a A&S como tenant inicial, pero deben modelarse como patrón reusable para futuros tenants.

## Respuestas de Paula a preguntas pendientes

```txt
1. C.O en vendedor -> asignar a Paula Osorio.
2. Grupos/SubGrupos -> omitir.
3. Puesto -> conservar como ocupación/cargo opcional para segmentación de marketing.
4. Asesores activos -> agregar Samuel Daza. Lista inicial: Paula Osorio, Fernando Arias, Carlos Castro, Johanna Salgado, Braulio Hernández, Nicole Castro, Samuel Daza.
5. Vendedor vacío -> asignar temporalmente a Paula Osorio, pero debe quedar marcado en calidad de datos / requiere validación de asesor.
```

## Regla de visibilidad por asesor

Cada asesor debe ver únicamente sus clientes.

```txt
Asesor -> solo clientes donde asesorPrincipal == usuario asesor o donde el usuario esté en aliados asignados, según permisos del tenant.
Dirección/AdminTenant/Operativo autorizado -> puede ver todos.
AuditorSoloLectura -> puede ver según permiso, sin editar.
ClientePortal -> solo su propio expediente.
```

## Regla de edición para asesores

Los asesores sí pueden ayudar a completar calidad de datos, pero con permisos limitados.

Pueden agregar/completar:

```txt
WhatsApp
teléfono alterno
correo
dirección
zona/sector/barrio
departamento/provincia
ciudad/municipio
fecha nacimiento si el cliente la comparte
sexo si el cliente lo comparte y aplica
ocupación/cargo
contacto principal
observaciones de contacto no sensibles
gestiones relacionadas
```

No pueden:

```txt
borrar datos existentes
cambiar asesor principal
fusionar duplicados
eliminar clientes
cambiar estado operativo final
modificar documentos/NIT/DPI/cédula ya validados
modificar pólizas/cobros/finmovs
ver auditoría interna completa
```

Si un asesor detecta un dato erróneo que no puede editar, debe crear una gestión:

```txt
Tipo: Solicitud de corrección de datos
Relacionada con: cliente y/o póliza
Motivo: cliente no aparece / cliente asignado a otro asesor / póliza no aparece / dato parece incorrecto
Destino: Dirección/AdminTenant/Operativo autorizado
```

## Formato estricto para datos agregados por asesores

Para mantener calidad de datos, los asesores no deben escribir libremente cuando exista catálogo.

### Contacto

```txt
WhatsApp/teléfono: normalizar a formato internacional si hay país.
Correo: validar estructura básica usuario@dominio.
```

### Geografía

Debe usarse cadena de catálogos:

```txt
País -> Departamento/Provincia -> Ciudad/Municipio -> Zona/Sector/Barrio
```

Reglas:

```txt
- Usar dropdown/lista cuando exista catálogo.
- Si el valor no existe, seleccionar “Otro / requiere validación”.
- No crear variantes por tildes, mayúsculas, abreviaturas o escritura libre.
- El sistema debe normalizar mayúsculas/minúsculas y tildes cuando sea posible.
```

### Persona/tipo/documento

Terminología multi-país:

```txt
Campo principal: número de documento.
Guatemala individual: puede ser DPI si está explícito.
Guatemala jurídica: NIT.
Colombia natural: cédula de ciudadanía si está explícito.
Colombia jurídica: NIT.
Interfaz genérica: número de documento + tipo de documento.
```

## Asesor principal, aliados y canal

Reglas A&S confirmadas:

```txt
Alianzas y Soluciones / nombre de empresa -> Paula Osorio como asesorPrincipal; canalOrigen='empresa'.
C.O -> Paula Osorio; aliasMigracion='C.O'.
Vendedor vacío -> Paula Osorio temporal + alerta ASESOR_ASIGNADO_TEMPORALMENTE.
Vendedor compuesto con Paula Osorio + otra persona -> Paula Osorio asesorPrincipal; otros nombres a aliados/canal.
```

Estas reglas son configuración de tenant A&S, no core hardcodeado.

## Calidad de datos por asesor

Cada asesor debe tener una vista propia:

```txt
Mis clientes incompletos
Mis clientes sin WhatsApp/teléfono
Mis clientes sin correo
Mis clientes sin ciudad/departamento
Mis clientes con documento faltante
Mis clientes pendientes de pólizas
Mis solicitudes de corrección abiertas
Clientes que no encuentro / gestiones de ubicación
```

Dirección/AdminTenant debe tener:

```txt
calidad de datos por asesor
clientes sin asesor real confirmado
clientes asignados temporalmente a Paula
duplicados probables
correcciones pendientes
avance de completitud por equipo
```

## Notificaciones/tareas internas

Después de una importación:

```txt
- Cada asesor recibe tarea/listado de clientes con datos faltantes.
- Si el asesor no puede editar un campo, crea gestión de corrección.
- Dirección/AdminTenant ve cola de datos críticos.
- No se envían WhatsApp/correos externos si integración no está conectada; mostrar estado honesto.
```

Estados honestos:

```txt
Tarea creada
Pendiente de revisión
Pendiente de integración
Corrección solicitada
Corrección aprobada
Corrección aplicada
Corrección rechazada
```

## Relación cliente/póliza y estado activo

Regla confirmada:

```txt
Cliente activo = tiene al menos una póliza Vigente o Por renovar.
Cliente activo en mora = tiene póliza vigente/por renovar y cobros vencidos.
Cliente inactivo = no tiene pólizas vigentes/por renovar.
Cliente reactivable = histórico/inactivo útil para recuperación comercial.
```

Durante la migración de clientes, mientras no existan pólizas:

```txt
estadoOperativo = pendiente_polizas
```

Al importar pólizas, el sistema debe recalcular estados de clientes automáticamente, sin depender del estado exportado por Siga CRM.

## Duplicados y normalización

El importador debe detectar:

```txt
duplicados exactos
duplicados probables
nombres incompletos
variantes por apellidos omitidos
razones sociales con sufijos
mismo teléfono/correo/dirección aproximada
```

Regla:

```txt
Puede proponer fusión, pero no fusionar automáticamente duplicados probables sin revisión humana.
```

## Campos omitidos o conservados

Confirmado:

```txt
Grupos/SubGrupos -> omitir.
Puesto -> conservar como ocupación/cargo opcional para marketing/segmentación.
```

## ¿Aplica a Claude/prototipo?

Sí.

Claude/prototipo debe conservar:

```txt
- listado de clientes con asesor visible;
- edición rápida del asesor solo para roles autorizados;
- asesores completan faltantes pero no borran;
- campos con listas desplegables y formatos específicos;
- calidad de datos por asesor;
- solicitudes/gestiones por cliente no encontrado o cliente asignado a otro asesor;
- estado pendiente de pólizas hasta cruce con pólizas;
- clientes reactivables;
- reglas multi-tenant configurables.
```

## Estado

Reglas confirmadas por Paula documentadas. Pendiente dry-run de clientes y diseño de validador/importador.