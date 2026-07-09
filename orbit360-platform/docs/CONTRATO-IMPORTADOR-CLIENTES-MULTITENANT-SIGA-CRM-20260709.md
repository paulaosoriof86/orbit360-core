# Contrato importador clientes multi-tenant — Siga CRM / fuentes variables

Fecha: 2026-07-09  
Proyecto: Orbit 360 A&S  
Fuente inicial real: `Contratantes Datos de Contacto 2026-07-08.xlsx`  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Objetivo

Definir cómo debe funcionar el importador inteligente de clientes para A&S y futuros tenants.

La migración real puede hacerse inicialmente con ChatGPT para validar lectura/mapeo, pero el producto debe quedar preparado para que cualquier tenant importe desde la plataforma con mapeo inteligente, dry-run, validaciones, calidad de datos y revisión humana cuando exista duda.

## Alcance

Aplica a fuentes tipo:

```txt
Siga CRM
Excel exportado desde CRM anterior
CSV de clientes
Base manual de clientes
Bases con encabezados variables
```

No aplica a:

```txt
pólizas
cobros
finmovs
siniestros
documentos soporte
```

Estas fuentes tendrán sus propios contratos.

## Flujo obligatorio del importador en plataforma

```txt
1. Cargar archivo.
2. Detectar hojas/tablas.
3. Detectar encabezados y sinónimos.
4. Proponer mapeo a campos Orbit.
5. Mostrar confianza por campo.
6. Pedir confirmación si hay duda.
7. Normalizar valores.
8. Detectar duplicados exactos y probables.
9. Calcular calidad de datos.
10. Mostrar dry-run: crear / actualizar / omitir / requiere validación.
11. Permitir iterar mapeo.
12. Confirmar escritura.
13. Crear reporte de importación.
14. Crear tareas/notificaciones de calidad de datos para asesores.
```

## Sinónimos mínimos de columnas

### Cliente / nombre

```txt
nombre
nombres
primer_nombre
apellido
apellidos
apellido paterno
apellido materno
razon social
razón social
empresa
contratante
cliente
nombre completo
```

### Tipo de persona

```txt
tipo de persona
tipo cliente
persona
persona física
persona fisica
persona natural
persona individual
persona jurídica
persona juridica
empresa
jurídica
juridica
```

Valores canónicos:

```txt
individual
juridica
```

Display recomendado:

```txt
Guatemala: Persona individual / Persona jurídica
Colombia: Persona natural / Persona jurídica
Genérico multi-país: Individual / Jurídica
```

### Documento

```txt
documento
número documento
numero documento
no documento
dpi
cedula
cédula
cc
nit
cédula jurídica
cedula juridica
identificación
identificacion
id fiscal
```

Campo canónico:

```txt
numeroDocumento
```

Reglas:

```txt
- Guatemala persona individual: documento puede ser DPI si viene explícito.
- Guatemala persona jurídica: NIT.
- Colombia persona natural: cédula de ciudadanía si viene explícito.
- Colombia persona jurídica: NIT.
- Si la fuente no permite saber tipo exacto, guardar como numeroDocumento con tipoDocumento='por_validar'.
```

### Contacto

```txt
whatsapp
wa
celular
móvil
movil
teléfono
telefono
tel
correo
email
e-mail
mail
contacto principal
telefono contacto
correo contacto
```

### Ubicación

```txt
pais
país
cod región
codigo pais
código país
departamento
provincia
estado
cantón
canton
municipio
ciudad
distrito
zona
barrio
codigo postal
código postal
```

Canónicos:

```txt
pais
departamentoProvincia
ciudadMunicipio
zonaSectorBarrio
codigoPostal
```

### Asesor / vendedor

```txt
asesor
vendedor
ejecutivo
productor
comercial
agente
responsable
owner
usuario
seller
salesperson
```

Canónicos:

```txt
asesorPrincipal
aliados
canalOrigen
asesorRaw
asesorRequiereValidacion
```

## Reglas de asesor A&S

Estas reglas son configuración del tenant A&S, no core hardcodeado.

```txt
Alianzas y Soluciones Corredores de Seguros -> Paula Osorio como asesorPrincipal; canalOrigen='empresa'.
Alianzas y Soluciones -> Paula Osorio como asesorPrincipal; canalOrigen='empresa'.
A&S -> Paula Osorio como asesorPrincipal; canalOrigen='empresa'.
Paula Osorio + aliado -> asesorPrincipal='Paula Osorio'; aliados=[aliado].
Campo vacío -> asesorRequiereValidacion=true.
Abreviatura dudosa -> asesorRequiereValidacion=true.
```

El importador debe permitir que Paula configure equivalencias:

```json
{
  "Alianzas y Soluciones Corredores de Seguros": "Paula Osorio",
  "Alianzas y Soluciones": "Paula Osorio",
  "A&S": "Paula Osorio"
}
```

Y también reglas de aliados:

```json
{
  "separadores": [",", "/", "+", " y "],
  "asesorPrincipalPreferido": "Paula Osorio",
  "guardarOtrosComo": "aliados"
}
```

## Modelo destino `clientes`

Campos mínimos sugeridos:

```json
{
  "id": "cli...",
  "tenantId": "alianzas-soluciones",
  "origen": "siga_crm",
  "sourceFile": "Contratantes Datos de Contacto 2026-07-08.xlsx",
  "sourceSheet": "Worksheet",
  "sourceRow": 2,
  "tipoPersona": "individual|juridica",
  "nombreCompleto": "",
  "nombres": "",
  "apellidos": "",
  "razonSocial": "",
  "numeroDocumento": "",
  "tipoDocumento": "por_validar|dpi|nit|cc|otro",
  "pais": "GT|CO|REQUIERE_VALIDACION",
  "codigoPaisTelefono": "502",
  "whatsapp": "",
  "telefonoAlterno": "",
  "correo": "",
  "direccion": "",
  "zonaSectorBarrio": "",
  "codigoPostal": "",
  "departamentoProvincia": "",
  "ciudadMunicipio": "",
  "asesorPrincipal": "",
  "asesorRaw": "",
  "aliados": [],
  "canalOrigen": "",
  "fechaAltaOrigen": "",
  "fechaNacimiento": "",
  "sexo": "",
  "estadoOrigen": "",
  "estadoOperativo": "pendiente_polizas",
  "observacionesMigracion": "",
  "contactoPrincipal": {
    "nombre": "",
    "telefono": "",
    "correo": "",
    "comentarios": ""
  },
  "calidadDatos": {
    "score": 0,
    "alertas": [],
    "requiereValidacion": true
  },
  "duplicado": {
    "estado": "sin_revision|probable|confirmado|descartado",
    "candidatos": []
  }
}
```

## Campos opcionales o descartables

```txt
Folio Cliente: conservar solo como sourceExternalId si no es “Sin folio cliente”.
Grupos/SubGrupos: omitir salvo confirmación de Paula.
Puesto: conservar como ocupacionCargo opcional si aporta a marketing/B2B.
Edad: no usar como principal; recalcular desde fecha nacimiento.
Estatus Asegurado: estadoOrigen solamente; estado operativo depende de pólizas.
```

## Calidad de datos

### Alertas mínimas

```txt
FALTA_ASESOR
ASESOR_REQUIERE_VALIDACION
FALTA_CONTACTO_TELEFONICO
FALTA_WHATSAPP
FALTA_CORREO
FALTA_DOCUMENTO
FALTA_PAIS
FALTA_DEPARTAMENTO
FALTA_CIUDAD
DUPLICADO_PROBABLE
ESTADO_OPERATIVO_PENDIENTE_POLIZAS
CONTACTO_PRINCIPAL_INCOMPLETO
```

### Score sugerido

```txt
+20 nombre/razón social válido
+15 asesor válido
+15 teléfono o WhatsApp
+10 correo
+10 documento/NIT/DPI/cédula
+10 país/departamento/ciudad
+10 tipo persona
+5 fecha nacimiento o edad
+5 sexo
```

Clasificación:

```txt
80-100: Completo
60-79: Bueno con faltantes menores
40-59: Requiere completar
0-39: Crítico
```

## Duplicados

### Duplicado exacto

Comparar normalizado:

```txt
nombreCompleto + tipoPersona
razonSocial + tipoPersona
numeroDocumento si existe
correo si existe
telefono/whatsapp si existe
```

### Duplicado probable

Usar coincidencias por:

```txt
nombre parcial + apellido principal
razon social sin sufijos S.A./LTDA/SAS
mismo teléfono
mismo correo
misma dirección aproximada
```

Regla:

```txt
El importador puede proponer fusión, pero no fusionar automáticamente duplicados probables sin confirmación.
```

## Estado operativo cliente

Durante importación de clientes solamente:

```txt
estadoOperativo = pendiente_polizas
```

Después de importar pólizas:

```txt
activo = tiene póliza Vigente o Por renovar.
activo_en_mora = tiene póliza vigente/por renovar y cobros vencidos.
inactivo = no tiene póliza vigente/por renovar.
reactivable = histórico/inactivo con oportunidad comercial.
```

## UX requerida en módulo Clientes

```txt
- Listado con asesor visible.
- Edición rápida inline de asesorPrincipal.
- Columna calidad de datos.
- Columna estado operativo.
- Filtros rápidos: falta asesor, falta contacto, duplicado probable, pendiente pólizas, reactivable.
- Acción masiva: asignar asesor.
- Acción: exportar clientes con datos faltantes por asesor.
- Acción: crear tarea/notificación al asesor para completar datos.
- Vista por asesor: su cartera incompleta.
```

## Notificaciones y tareas

Cuando termine una importación:

```txt
- AdminTenant recibe resumen de calidad de datos.
- Cada asesor ve listado de sus clientes incompletos.
- Si falta asesor, queda en bandeja de validación de Dirección/Admin.
- Si hay duplicados probables, se crea cola de deduplicación.
```

No simular envío real por WhatsApp/correo si no hay integración conectada.

## Auditoría

Cada importación debe registrar:

```txt
archivo
hoja
fila
campo origen
campo destino
valor normalizado
confianza
acción propuesta
acción final
usuario
fecha
motivo si se corrige manualmente
```

## ¿Aplica a Claude/prototipo?

Sí.

Claude/prototipo debe conservar:

```txt
- importador con mapeo inteligente y confirmable;
- pantalla de calidad de datos;
- edición rápida de asesor en listado;
- filtros por datos faltantes;
- duplicados probables;
- estado pendiente de pólizas;
- tarea/notificación para asesores;
- lenguaje multi-país y multi-tenant;
- no hardcodear reglas A&S en core, solo configuración tenant.
```

## Estado

Contrato creado. Pendiente transformar en validador/dry-run cuando se ejecute la migración de clientes.