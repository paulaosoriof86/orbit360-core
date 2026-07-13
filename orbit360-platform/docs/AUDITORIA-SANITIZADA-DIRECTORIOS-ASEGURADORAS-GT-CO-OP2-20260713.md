# Auditoría sanitizada de fuentes reales — Directorios de Aseguradoras GT/CO — OP-2

Fecha: 2026-07-13  
Proyecto: Orbit 360 A&S  
Carril: C — fuente real separada `configuracion_catalogo / directorio_aseguradoras`  
Estado: inventario y reglas de importación definidos; sin escritura de datos reales

## Fuentes revisadas

```txt
Directorio Aseguradoras Guatemala 2026.xlsx
Directorio - Aseguradoras Colombia 2024.xlsx
```

La auditoría no reproduce contactos, usuarios, contraseñas, números de cuenta, URLs sensibles ni datos bancarios completos.

## Inventario estructural

### Guatemala

```txt
Hojas totales: 18
Hojas candidatas operativas: 14
Hojas de apoyo/excluidas: 4
País obligatorio: GT
Moneda base: GTQ
```

Hojas de apoyo detectadas y excluidas antes del mapeo:

```txt
ÍNDICE
DIAGNÓSTICO
T&A
Tech
```

### Colombia

```txt
Hojas totales: 17
Hojas candidatas operativas: 16
Hojas de apoyo/excluidas: 1
País obligatorio: CO
Moneda base: COP
```

Hoja de apoyo detectada:

```txt
Indice
```

## Bloques operativos observados

Las fuentes contienen, según la hoja y el país:

- identidad y datos generales de la entidad;
- código de intermediario;
- contactos por área/cargo;
- plataformas y enlaces operativos;
- usuarios/contraseñas que deben separarse como recurso seguro;
- bancos, medios de pago y cuentas que deben separarse como recurso seguro;
- observaciones o pendientes de actualización.

Estos directorios pueden crear o actualizar únicamente:

```txt
aseguradoras
contactos de aseguradora
plataformas de aseguradora
referencias protegidas de acceso
referencias protegidas de cuentas/medios de pago
calidad y trazabilidad del directorio
```

No pueden crear ni inferir:

```txt
clientes
pólizas
vehículos
cobros
cartera
finmovs
producción
comisiones cobradas
usuarios de Orbit
roles o permisos
```

## Hallazgos de identidad

### Alias/versiones probables

Se detectaron variantes de nombre que no deben crear entidades separadas automáticamente. Entre ellas existen casos equivalentes a:

```txt
nombre base vs nombre con versión de hoja
abreviatura con diferencia de una letra
```

El importador debe:

1. normalizar acentos, signos, sufijos societarios y números de versión;
2. detectar igualdad exacta y similitud probable;
3. bloquear ambas operaciones cuando exista ambigüedad;
4. presentar el diff para decisión humana;
5. nunca fusionar automáticamente.

El guard OP-2 agrega detección de distancia de una letra para nombres con longitud suficiente y comparación contra el directorio existente.

### Entidad no aseguradora directa

Se detectó al menos una hoja que corresponde a aliado/red/agencia y no a una aseguradora directa.

Estado requerido:

```txt
entityType = partner_network
requiereValidacion = true
validationStatus = requiere_validacion
```

No debe habilitarse como aseguradora tarifaria hasta confirmar clasificación y alcance.

## Hallazgos de seguridad

Las fuentes contienen recursos sensibles. Reglas obligatorias:

- contraseñas completas nunca se escriben en `Orbit.store`;
- usuarios completos se convierten en indicio sanitizado cuando corresponda;
- números de cuenta completos nunca se escriben en `Orbit.store`;
- enlaces con tokens, sesiones, códigos o parámetros sensibles se limpian o pasan a referencia protegida;
- el payload sensible vive únicamente en memoria temporal durante el análisis;
- la aplicación real exige proveedor seguro del tenant;
- sin proveedor, el dry-run puede revisarse pero no aplicarse.

Contrato visible esperado:

```txt
usuarioHint
credentialRef = backend_required
numeroHint
accountRef = backend_required
estadoAcceso / estado
fuenteTraza
```

## Trazabilidad mínima

Cada dato propuesto debe conservar:

```txt
archivo
hoja
fila
bloque
país
moneda cuando aplique
fecha de análisis/importación
actor y rol activo al aplicar
hash de fuente cuando esté disponible
```

## Dry-run requerido

El reporte debe separar:

```txt
crear
actualizar
omitir
bloquear
requiere validación
```

Bloqueos mínimos:

- país no seleccionado;
- identidad vacía o incompatible con la hoja;
- duplicado exacto o probable;
- entidad que no es aseguradora directa;
- recurso sensible sin conexión autorizada para escritura;
- operación sin motivo/confirmación reforzada.

La frase de confirmación se mantiene:

```txt
CONFIRMO DIRECTORIO
```

Solo las filas validadas pueden aplicarse. Las bloqueadas generan una gestión de revisión; no desaparecen silenciosamente.

## Relación con Cotizador/Comparativo

El directorio identifica entidades y recursos operativos, pero no habilita tarifas.

```txt
contactos importados != tarifa validada
plataforma registrada != cotizador conectado
cotización ejemplo != regla de cálculo validada
cuenta registrada != medio de pago confirmado
```

La habilitación de una combinación exige país, moneda, ramo, producto/plan, fuente, versión, vigencia, reglas y casos de prueba suficientes.

## Resultado de auditoría

```txt
Estructura compatible con importador especializado: SÍ
País separado y explícito: OBLIGATORIO
Hojas de soporte excluibles: SÍ
Contactos operativos detectables: SÍ
Plataformas detectables: SÍ
Recursos sensibles presentes: SÍ
Alias/duplicados probables: SÍ
Entidades no aseguradora directa: SÍ
Escritura real ejecutada: NO
Datos reales hardcodeados: NO
```

## Siguiente acción de Carril C

Después del gate visual OP-1/OP-2:

1. ejecutar dry-run GT y CO por separado;
2. revisar alias, entidades aliadas y filas bloqueadas;
3. confirmar que `persistedInStore=false` para sensibles;
4. aplicar únicamente operaciones validadas con backend seguro;
5. solicitar después la fuente separada de Pólizas.
