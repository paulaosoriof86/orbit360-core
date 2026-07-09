# Contrato permisos — Calidad de datos Clientes por asesor

Fecha: 2026-07-09  
Proyecto: Orbit 360 A&S  
Fuente real inicial: `Contratantes Datos de Contacto 2026-07-08.xlsx`  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Objetivo

Definir cómo los asesores ayudan a completar calidad de datos sin poner en riesgo la integridad de clientes, pólizas, cartera ni auditoría.

## Principio

```txt
El asesor ve solo sus clientes y puede completar datos faltantes.
El asesor no borra, no fusiona, no reasigna, no cambia estado operativo y no modifica datos críticos validados.
```

## Alcance de visibilidad

| Rol | Visibilidad clientes | Edición |
|---|---|---|
| Dirección | Todos | Completa según permisos |
| AdminTenant | Todos | Completa según permisos |
| Operativo autorizado | Todos o asignados | Completa operativa |
| Asesor | Solo clientes asignados | Agregar/completar faltantes permitidos |
| AuditorSoloLectura | Según permiso | Ninguna |
| ClientePortal | Propio expediente | Solo solicitudes/reportes permitidos |

## Campos que el asesor puede completar

Solo si el campo está vacío o marcado como faltante:

```txt
whatsapp
telefonoAlterno
correo
direccion
zonaSectorBarrio
departamentoProvincia
ciudadMunicipio
fechaNacimiento
sexo
ocupacionCargo
contactoPrincipal.nombre
contactoPrincipal.telefono
contactoPrincipal.correo
contactoPrincipal.comentarios
observacionesContacto
```

## Campos que el asesor NO puede borrar ni modificar si ya existen

```txt
id
tenantId
numeroDocumento
tipoDocumento
nit/dpi/cédula validada
asesorPrincipal
aliados
canalOrigen
estadoOperativo
estadoOrigen
sourceFile/sourceSheet/sourceRow
polizas
cobros
finmovs
documentos
auditoria
```

Si necesita corregir alguno, crea gestión.

## Gestión de corrección

Tipos mínimos:

```txt
cliente_no_aparece
poliza_no_aparece
cliente_asignado_a_otro_asesor
asesor_incorrecto
documento_incorrecto
dato_validado_incorrecto
posible_duplicado
```

Modelo sugerido:

```json
{
  "id": "ges...",
  "tenantId": "alianzas-soluciones",
  "tipo": "cliente_no_aparece|cliente_asignado_a_otro_asesor|...",
  "clienteId": "cli...",
  "polizaId": "pol...",
  "asesorSolicitanteId": "usr...",
  "asesorSolicitanteNombre": "",
  "descripcion": "",
  "estado": "pendiente_revision|en_revision|aprobada|aplicada|rechazada",
  "prioridad": "normal|alta",
  "createdAt": "ISO",
  "updatedAt": "ISO"
}
```

## Validaciones de formato

### Teléfono/WhatsApp

```txt
- Requiere país o código país.
- Normalizar formato internacional cuando sea posible.
- No aceptar texto libre con comentarios dentro del número.
- Si no se puede normalizar: guardar propuesta y marcar requiere validación.
```

### Correo

```txt
- Validar formato usuario@dominio.
- Convertir a minúsculas.
- Si tiene varios correos, separar y pedir selección principal.
```

### Geografía

```txt
- País por dropdown.
- Departamento/Provincia por catálogo dependiente de país.
- Ciudad/Municipio por catálogo dependiente de departamento/provincia.
- Permitir Otro/Requiere validación sin contaminar catálogo final.
```

### Ocupación/cargo

```txt
- Campo opcional.
- Útil para marketing/segmentación.
- No bloquear importación si falta.
```

## Auditoría

Cada completado de dato por asesor debe registrar:

```txt
campo
valor anterior vacío/pendiente
valor propuesto/aplicado
usuario
rol
fecha
origen: calidad_datos_asesor
clienteId
validación aplicada
```

No mostrar auditoría interna completa al asesor.

## Calidad de datos por asesor

Debe calcularse tablero:

```txt
clientes asignados
clientes completos
clientes incompletos
clientes sin WhatsApp/teléfono
clientes sin correo
clientes sin ciudad/departamento
clientes con documento faltante
clientes con solicitud de corrección abierta
clientes pendientes de pólizas
```

## ¿Aplica a Claude/prototipo?

Sí.

Claude/prototipo debe crear UX compatible:

```txt
- vista Mis clientes incompletos;
- edición segura de faltantes;
- campos con dropdown/formato;
- botón “Solicitar corrección”;
- sin opción de borrar para asesor;
- sin reasignar asesor desde rol asesor;
- resumen por asesor para Dirección/Admin.
```

## Estado

Contrato creado. Pendiente implementar validador y UX.