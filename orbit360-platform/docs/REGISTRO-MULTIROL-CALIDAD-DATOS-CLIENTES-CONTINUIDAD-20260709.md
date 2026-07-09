# Registro — multirol, calidad de datos clientes y continuidad blindada

Fecha: 2026-07-09  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Contexto

Paula recordó reglas críticas ya definidas en sesiones anteriores:

```txt
- Un usuario puede tener varios roles.
- Debe poder cambiar vista/rol activo.
- Dirección/Admin debe poder activar o restringir módulos adicionales por usuario.
- Asesores ven solo sus clientes.
- Operativos autorizados pueden ver todos.
- Asesores pueden completar calidad de datos sin borrar ni cambiar datos críticos.
- Portal, clientes, pólizas, metas y solicitudes deben respetar scope por rol.
- Todo debe documentarse para Claude/prototipo, backend y Academia.
- La conversación está larga, por lo que se requiere addendum maestro y frase corta para instrucciones del proyecto.
```

## Archivos creados

```txt
orbit360-platform/docs/CONTRATO-RBAC-MULTIROL-VISIBILIDAD-MODULOS-CLIENTES-20260709.md
orbit360-platform/docs/ADDENDUM-MAESTRO-CONTINUIDAD-CLIENTES-MULTIROL-IMPORTADORES-20260709.md
orbit360-platform/docs/FRASE-CORTA-INSTRUCCIONES-PROYECTO-LEER-ADDENDUM-20260709.md
orbit360-platform/docs/REGISTRO-MULTIROL-CALIDAD-DATOS-CLIENTES-CONTINUIDAD-20260709.md
```

## Reglas documentadas

```txt
Paula Osorio: Dirección/SuperAdmin/AdminTenant/Asesor/Operativo; scope todos; cambia rol activo.
Carlos Castro: Operativo/Asesor; default sugerido Operativo; scope todos si Paula habilita.
Samuel Daza: Asesor/Operativo; default configurable; scope según habilitación.
Fernando Arias: Asesor principalmente; módulos extra configurables.
Johanna/Braulio/Nicole: Asesor; propios; módulos extra opcionales.
```

## Regla de visibilidad

```txt
modulosBasePorRol + modulosExtraPermitidos - modulosRestringidos = modulosVisiblesFinales
```

El alcance de datos se calcula aparte:

```txt
propios / equipo / todos / ninguno
```

## Regla asesor

```txt
Asesor puede ver clientes, pólizas, cobros, portal, solicitudes y calidad de datos de sus propios clientes.
Asesor no puede borrar, fusionar, reasignar, ver secretos ni modificar datos críticos.
```

## Continuidad

Se creó addendum maestro descargable/reusable y frase corta para instrucciones del proyecto, para evitar pérdida de metodología en próximas conversaciones.

## Estado

Documentado. Pendiente crear/ejecutar dry-run de clientes y luego prompt de continuidad al cerrar bloque de clientes.