# Mapa de integración — Aseguradoras Orbit 360 con Cotizador/Comparativo v110

Fecha: 2026-07-09  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open.

## Propósito

Definir el empalme seguro entre el módulo Aseguradoras existente de Orbit 360 y las lógicas reutilizables de Cotizador/Comparativo presentes en `comparativo_final_v110.html`.

## Fuente de verdad

Única fuente:

```txt
Orbit.modules.aseguradoras
Orbit.store
configuración tenant
```

V110 aporta lógica funcional, no entidades maestras ni almacenamiento.

## Contrato mínimo que Aseguradoras debe exponer

### Identidad

```txt
id
nombre
país
monedasPermitidas
monedaDefault
ramos
productos habilitados
estado de vinculación
```

### Documentos

```txt
documentoId
aseguradoraId
nombre
tipo
archivoRef
hash
versión
país
moneda
ramo
producto
fecha de carga
estado de lectura
estado de validación
trazabilidad
```

Tipos principales:

```txt
tarifario
cotización ejemplo
póliza ejemplo
condiciones
circular
formulario
```

### Conocimiento de extracción

```txt
aseguradoraId
producto
ramo
instruccionesExtraccion
formatoConocido
aliases
coberturasConocidas
deduciblesConocidos
formasPagoConocidas
restriccionesConocidas
versión
fuenteDocumentoId
estadoValidación
```

### Configuración activa para Cotizador

```txt
configuracionId
aseguradoraId
producto
ramo
país
moneda
tipoCalculo
reglasTarifa
primaMínima
recargos
gastos
impuestos
formasPago
vigenciaDesde
vigenciaHasta
fuenteDocumentoId
versión
estado
```

### Configuración activa para Comparativo

```txt
configuracionId
aseguradoraId
producto
ramo
camposEsperados
secciones
coberturas
deducibles
condiciones
exclusiones
formasPago
instruccionesExtraccion
formatoConocido
fuenteDocumentoId
versión
estado
```

## Adaptación del Cotizador v110

Debe conservar:

- lectura XLS/XLSX/CSV;
- detección de encabezados;
- sinónimos;
- preview;
- propuesta de mapeo;
- tipos de cálculo;
- reglas por rangos;
- lookup de planes;
- prima mínima;
- recargos;
- impuestos;
- formas de pago.

Debe eliminar o reemplazar:

```txt
aseguradoras propias del HTML
Firebase/Firestore directo
almacenamiento propio
configuración hardcodeada
estadísticas del HTML
navegación del HTML
```

Destino final:

```txt
lectura documental
→ propuesta
→ validación
→ configuración activa en Orbit.store
→ consumo por modules/cotizador.js
```

## Adaptación del Comparativo v110

Debe conservar:

- carga de PDF;
- extracción por aseguradora/producto;
- instrucciones específicas;
- formato conocido;
- coberturas conocidas;
- secciones;
- deducibles;
- primas;
- opciones de pago;
- restricciones;
- generación del comparativo.

Debe eliminar o reemplazar:

```txt
módulo aseguradoras del HTML
estadísticas del HTML
Firebase/Firestore/Storage directos
usuarios hardcodeados
configuración interna duplicada
```

Destino final:

```txt
Aseguradoras Orbit
→ conocimiento validado
→ PDF de cotización/póliza
→ extracción
→ revisión
→ Comparativo Orbit
```

## Reglas de no duplicación

No se permiten dos colecciones maestras de aseguradoras.

No se permite:

```txt
aseguradoraOrbitId + aseguradoraV110Id independientes
catálogo paralelo de productos
catálogo paralelo de planes
credenciales duplicadas
estadísticas duplicadas
configuración tarifaria sin fuente
```

Toda referencia debe resolver por `aseguradoraId` de Orbit.

## Reglas de edición

- Directorio/contactos/accesos/cuentas: editables según rol y auditoría.
- Planes/tarifas: no editables manualmente.
- Conocimiento extraído: corregible como propuesta con diff y trazabilidad.
- Configuración activa: solo se genera desde propuesta validada.
- Nueva versión documental: no pisa la versión anterior; crea propuesta nueva.

## Permisos

### SuperAdmin/Admin/Dirección/Operativo

Pueden:

- cargar documentos;
- revisar extracción;
- consultar accesos y cuentas;
- validar propuestas según permisos;
- activar versiones.

### Asesor

Puede:

- usar Cotizador/Comparativo;
- consultar productos/planes activos;
- no ver credenciales ni cuentas;
- no validar tarifas.

## Estados

```txt
pendiente_lectura
leyendo
lectura_completada
lectura_con_alertas
requiere_validacion
propuesta_pendiente_validacion
validado_no_activo
validado_habilitado
reemplazado_por_version
bloqueado
```

## Smokes requeridos

1. Tarifario Excel cargado desde Aseguradoras genera propuesta para Cotizador.
2. PDF de cotización genera propuesta para Comparativo.
3. Ninguna propuesta se activa sin confirmación humana.
4. Nueva versión no borra la anterior.
5. Cotizador solo consume configuraciones `validado_habilitado`.
6. Comparativo solo consume conocimiento validado.
7. No existe dependencia del módulo de aseguradoras de v110.
8. No existe Firebase directo.
9. Todo usa `Orbit.store` o adapter backend.

## Claude/prototipo

Claude debe recibir este mapa completo cuando se solicite la integración visual. No debe reinterpretar Aseguradoras desde v110.

## Academia

Debe incluir rutas específicas para:

- cargar tarifarios;
- revisar extracción;
- aprobar versiones;
- usar Cotizador;
- usar Comparativo;
- entender fuente de verdad y trazabilidad.

## Estado

Contrato de integración documentado. Siguiente acción técnica: auditar `modules/cotizador.js`, `modules/comparativo.js` y las funciones específicas de v110 para preparar empalme aditivo.