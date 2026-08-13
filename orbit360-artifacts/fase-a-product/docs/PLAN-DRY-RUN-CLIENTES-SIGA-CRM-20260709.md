# Plan dry-run — Clientes Siga CRM

Fecha: 2026-07-09  
Proyecto: Orbit 360 A&S  
Fuente real: `Contratantes Datos de Contacto 2026-07-08.xlsx`  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Objetivo

Preparar la ejecución de dry-run para importar clientes sin escribir producción, sin subir datos reales al repo y sin hardcodear reglas A&S en core.

## Entrada

```txt
Contratantes Datos de Contacto 2026-07-08.xlsx
Hoja: Worksheet
Registros detectados: 440
```

## Salida esperada del dry-run

```txt
resumen general
mapeo columnas origen -> destino
clientes a crear
clientes a actualizar
clientes omitidos
clientes requiere_validacion
calidad de datos por registro
duplicados exactos y probables
asesor normalizado
aliados/canal
campos descartados
preguntas de validación
```

## Reglas confirmadas por Paula

```txt
C.O -> Paula Osorio.
Grupos/SubGrupos -> omitir.
Puesto -> ocupación/cargo opcional para marketing.
Agregar Samuel Daza a asesores activos.
Vendedor vacío -> asignar temporalmente a Paula Osorio + alerta de validación.
```

## Asesores activos iniciales A&S

```txt
Paula Osorio
Fernando Arias
Carlos Castro
Johanna Salgado
Braulio Hernández
Nicole Castro
Samuel Daza
```

## Normalización de asesor

```txt
Alianzas y Soluciones Corredores de Seguros -> Paula Osorio, canal empresa.
Alianzas y Soluciones -> Paula Osorio, canal empresa.
A&S -> Paula Osorio, canal empresa.
C.O -> Paula Osorio, alias migración.
Vacío -> Paula Osorio temporal + ASESOR_ASIGNADO_TEMPORALMENTE.
Compuesto -> asesor principal + aliados.
No reconocido -> requiere validación.
```

## Estado operativo inicial

Como todavía no se han importado pólizas:

```txt
estadoOperativo = pendiente_polizas
```

Después de pólizas:

```txt
activo
activo_en_mora
inactivo
reactivable
```

## Calidad de datos a calcular

Alertas mínimas:

```txt
FALTA_ASESOR_REAL_CONFIRMADO
ASESOR_ASIGNADO_TEMPORALMENTE
FALTA_CONTACTO_TELEFONICO
FALTA_WHATSAPP
FALTA_CORREO
FALTA_DOCUMENTO
FALTA_DEPARTAMENTO
FALTA_CIUDAD
DUPLICADO_EXACTO
DUPLICADO_PROBABLE
PENDIENTE_POLIZAS
CONTACTO_PRINCIPAL_INCOMPLETO
```

## Campos a mapear

```txt
Tipo de persona -> tipoPersona
Nombres/Apellido Paterno/Apellido Materno -> nombreCompleto/nombres/apellidos
Razon Social -> razonSocial
Cédula Jurídica -> numeroDocumento/tipoDocumento por validar
Cod. Región -> codigoPaisTelefono
WhatsApp -> whatsapp
Teléfono -> telefonoAlterno
Correo -> correo
Dirección -> direccion
Distrito -> zonaSectorBarrio
Codigo Postal -> codigoPostal
Canton -> ciudadMunicipio
Provincia -> departamentoProvincia
Vendedor -> asesorPrincipal/asesorRaw/aliados/canalOrigen
Fecha alta -> fechaAltaOrigen
Fecha Nacimiento -> fechaNacimiento
Edad -> edadOrigen solo referencia, no principal
Sexo -> sexo
Estatus Asegurado -> estadoOrigen, no estado operativo
Comentarios Contratante -> observacionesMigracion
Datos de contacto principal -> contactoPrincipal
Puesto -> ocupacionCargo
```

## Campos omitidos

```txt
Grupos
SubGrupos
Folio Cliente si es “Sin folio cliente”; si trae valor real, guardar como sourceExternalId.
```

## Bloqueos

```txt
No escribir producción.
No subir payload real al repo.
No fusionar duplicados probables automáticamente.
No considerar cliente activo/inactivo hasta importar pólizas.
No permitir que asesor borre datos.
No modificar asesor desde rol asesor.
```

## Próximo paso técnico

Crear script/validador de dry-run que lea localmente el XLSX y produzca reportes locales en `_orbit360_reports`, sin subir datos reales al repo.

## Estado

Plan dry-run creado. Pendiente script/ejecución local.