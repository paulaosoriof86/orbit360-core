# Auditoría fuente real — Clientes Siga CRM

Fecha: 2026-07-09  
Proyecto: Orbit 360 A&S  
Fuente recibida: `Contratantes Datos de Contacto 2026-07-08.xlsx`  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Principio de privacidad

Este documento no contiene nombres, teléfonos, correos ni datos identificables de clientes. Solo contiene estructura, conteos, reglas de mapeo y hallazgos de calidad.

## Resultado de lectura inicial

```txt
Hojas: 1
Hoja: Worksheet
Rango usado: A1:AD441
Registros de clientes/contratantes: 440
Columnas: 30
```

## Columnas detectadas

```txt
Tipo de persona
Folio Cliente
Nombres
Apellido Paterno
Apellido Materno
Razon Social
Grupos
SubGrupos
Puesto
Cédula Jurídica
Cod. Región
WhatsApp
Teléfono
Correo
Dirección
Distrito
Codigo Postal
Canton
Provincia
Vendedor
Fecha alta
Fecha Nacimiento
Edad
Sexo
Estatus Asegurado
Comentarios Contratante
Datos de contacto principal - Nombre
Datos de contacto principal - Teléfono
Datos de contacto principal - Correo
Datos de contacto principal - Comentarios
```

## Distribución general

```txt
Tipo Física/persona individual-natural: 417
Tipo Jurídica/persona jurídica: 23
Total: 440
```

Estado exportado por Siga CRM:

```txt
Nuevo: 433
Activo: 5
Inactivo: 1
Prospectos: 1
```

Advertencia: `Estatus Asegurado` de Siga CRM no debe ser el estado operativo final en Orbit 360. El estado real de cliente activo/inactivo debe derivarse después de cruzar pólizas.

## Calidad de datos detectada

| Campo | Completos | Faltantes | Observación |
|---|---:|---:|---|
| Tipo de persona | 440 | 0 | Útil y obligatorio. Normalizar a `individual` / `juridica`. |
| Nombres | 417 | 23 | Falta cuando es persona jurídica. Correcto. |
| Razón Social | 23 | 417 | Falta cuando es persona individual. Correcto. |
| Vendedor | 410 | 30 | Campo crítico. Debe ser editable rápido desde listado. |
| WhatsApp | 267 | 173 | Debe ir a calidad de datos si falta. |
| Teléfono | 137 | 303 | Puede complementar WhatsApp si existe. |
| Correo | 27 | 413 | Brecha fuerte de calidad de datos. |
| Dirección | 175 | 265 | Útil para expediente y segmentación. |
| Cantón/municipio/ciudad | 251 | 189 | Requiere normalización geográfica. |
| Provincia/departamento | 269 | 171 | Requiere catálogo por país. |
| Fecha nacimiento | 296 | 144 | Útil para marketing/segmentación si viene confiable. |
| Edad | 289 | 151 | Preferir calcular desde fecha nacimiento si existe. |
| Sexo | 369 | 71 | Útil para marketing/segmentación; debe quedar opcional. |
| Documento/NIT | 15 | 425 | No se puede usar como deduplicador principal en esta fuente. |

## Vendedores detectados

```txt
Paula Osorio: 365
Sin vendedor: 30
Fernando Arias: 23
Carlos Castro: 8
Johanna Salgado: 7
Alianzas y Soluciones Corredores de Seguros: 4
Braulio Hernández: 1
C.O: 1
Nicole Castro: 1
```

## Regla especial A&S para vendedor/asesor

Reglas indicadas por Paula:

```txt
- Si el vendedor viene como Alianzas y Soluciones o nombre de la empresa, asignar asesor principal Paula Osorio.
- Si el vendedor viene compuesto con Paula Osorio + aliado, Paula Osorio queda como asesor principal y el otro nombre queda como aliado/referidor/canal.
- Si el vendedor viene vacío, enviar a calidad de datos para revisión.
- Si el vendedor viene abreviado o dudoso, enviar a calidad de datos para validación.
```

Aplicación preliminar en esta fuente:

```txt
Alianzas y Soluciones Corredores de Seguros -> Paula Osorio, con origen/canal empresa.
C.O -> requiere validación.
Sin vendedor -> calidad de datos.
```

## Duplicados

Revisión inicial con llave normalizada por nombre/razón social:

```txt
Grupos duplicados exactos normalizados: 8
Registros involucrados: 16
```

Importante:

```txt
Esto no cubre duplicados difusos por nombre incompleto, apellidos omitidos o variantes. Para eso el importador debe tener fuzzy matching con revisión humana antes de fusionar.
```

## Campos que SÍ deben mapearse a Orbit 360

| Fuente Siga CRM | Destino Orbit 360 | Regla |
|---|---|---|
| Tipo de persona | `tipoPersona` | Normalizar `Física` -> `individual`; `Jurídica` -> `juridica`. Display por país. |
| Nombres + apellidos | `nombreCompleto`, `nombres`, `apellidos` | Para persona individual/natural. |
| Razón Social | `razonSocial`, `nombreComercial` si aplica | Para persona jurídica. |
| Cédula Jurídica | `numeroDocumento` / `nit` según país/tipo | No asumir siempre cédula; normalizar a documento fiscal. |
| Cod. Región | `codigoPaisTelefono` | Ej. 502. No reemplaza país si no hay país explícito. |
| WhatsApp | `whatsapp` | Normalizar a E.164 cuando se pueda. |
| Teléfono | `telefonoAlterno` | Usar como alterno si WhatsApp existe. |
| Correo | `correo` | Validar formato. |
| Dirección | `direccion` | Conservar si aporta. |
| Distrito | `zonaSectorBarrio` | Campo opcional de dirección. |
| Código Postal | `codigoPostal` | Opcional. |
| Cantón | `ciudadMunicipio` | Normalizar por catálogo país/departamento. |
| Provincia | `departamentoProvincia` | Normalizar por catálogo. |
| Vendedor | `asesorPrincipal`, `aliados`, `canalOrigen` | Reglas especiales A&S + validación. |
| Fecha alta | `fechaAltaOrigen` | Conservar como trazabilidad de origen. |
| Fecha Nacimiento | `fechaNacimiento` | Útil para segmentación. |
| Edad | `edadCalculadaOrigen` | No usar como fuente principal si existe fecha nacimiento. |
| Sexo | `sexo` | Opcional para marketing/segmentación. |
| Estatus Asegurado | `estadoOrigen` | No estado final Orbit hasta cruzar pólizas. |
| Comentarios Contratante | `observacionesMigracion` | Revisar privacidad; no convertir en dato estructurado sin criterio. |
| Datos de contacto principal | `contactoPrincipal` | Útil especialmente en jurídicas o clientes con intermediario. |

## Campos que NO deben migrarse como dato operativo principal

```txt
Folio Cliente: casi todo “Sin folio cliente”; conservar solo como trazabilidad si aporta.
Grupos/SubGrupos: no importar salvo que Paula confirme valor comercial.
Puesto: opcional como ocupación/cargo si aplica; no usar como campo obligatorio.
Estatus Asegurado: conservar como estadoOrigen, no estado operativo final.
Edad: recalcular desde fechaNacimiento cuando exista.
```

## Calidad de datos requerida en plataforma

Cada cliente importado debe calcular `calidadDatos` con alertas como:

```txt
Falta asesor
Falta WhatsApp/teléfono
Falta correo
Falta documento/NIT
Falta ciudad/municipio
Falta departamento/provincia
Fecha nacimiento ausente
Duplicado probable
Asesor requiere validación
Estado cliente pendiente de pólizas
```

## UX requerida para Clientes

```txt
- Listado de clientes con columnas visibles: cliente, tipo, país, departamento/ciudad, asesor principal, WhatsApp/teléfono, correo, calidad de datos, estado operativo.
- Edición rápida de asesor desde el listado, sin abrir ficha.
- Filtro por “Falta asesor”.
- Filtro por “Falta contacto”.
- Filtro por “Duplicado probable”.
- Filtro por “Requiere validación”.
- Vista por asesor con clientes incompletos.
- Exportar/listado para que asesores completen información.
- Notificación interna o tarea para asesor cuando su cartera tenga clientes con datos faltantes.
```

## Estado activo/inactivo

En esta fuente no se puede determinar estado real final.

Regla futura:

```txt
Cliente activo = tiene al menos una póliza Vigente o Por renovar.
Cliente en mora = puede seguir activo si tiene póliza vigente y cobros pendientes.
Cliente inactivo = no tiene pólizas vigentes/por renovar y queda disponible para reactivación.
```

Debe calcularse al cruzar con pólizas.

## Reglas multi-tenant reutilizables

Este caso no debe quedar hardcodeado solo para A&S.

Patrón general:

```txt
- Importador acepta sinónimos de columnas.
- Usuario confirma mapeo cuando hay duda.
- Sistema crea dry-run antes de escribir.
- Campos no útiles se omiten o quedan en trazabilidad, no en ficha principal.
- Datos faltantes alimentan calidad de datos.
- Duplicados probables requieren revisión antes de fusionar.
- Reglas propias del tenant viven en configuración de migración del tenant.
```

## Pendientes/preguntas a Paula

```txt
1. Confirmar si “C.O” corresponde a Carlos, Carlos Osorio, otro asesor o debe quedar en validación.
2. Confirmar si `Grupos` y `SubGrupos` tienen algún uso comercial real; si no, se omiten.
3. Confirmar si `Puesto` debe conservarse como ocupación/cargo opcional para marketing/B2B.
4. Confirmar catálogo inicial de asesores válidos para A&S.
5. Confirmar si clientes con vendedor vacío se asignan temporalmente a Paula o quedan en validación.
```

## Decisión

Esta fuente sí sirve como primera fuente real de `clientes`, pero debe entrar por importador con dry-run, calidad de datos, deduplicación y validación de asesor. No se debe escribir todavía como dato productivo sin revisión.