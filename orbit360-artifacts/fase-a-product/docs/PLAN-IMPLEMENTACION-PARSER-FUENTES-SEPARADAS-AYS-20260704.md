# Plan de implementación parser por fuentes separadas A&S

Fecha: 2026-07-04
Rama: ays/backend-tenant-lab-v99-20260703
PR: #5
Estado: ABIERTO

## Objetivo

Diseñar el backend/importador real por etapas para que Orbit 360 procese fuentes separadas sin mezclar clientes, pólizas, cobros, comisiones, estados de cuenta, documentos ni financiero histórico.

Este plan no carga datos reales y no modifica Firestore. Define contrato técnico para implementación posterior segura.

## Principio rector

Cada archivo debe entrar con tipo de fuente explícito o detectado con alta confianza. Si la confianza es baja, el sistema debe bloquear escritura y pedir validación.

No se permite inferir maestros comerciales desde movimientos financieros ni desde conceptos bancarios.

## Adaptadores de lectura

### Excel

Funciones esperadas:

- leer libro completo;
- preservar nombre de hoja;
- detectar bloques dentro de una hoja;
- detectar encabezados por bloque;
- conservar fila original;
- conservar columna original;
- permitir preview sin escribir.

Metadatos mínimos por fila:

- archivo origen;
- hoja origen;
- bloque origen;
- número de fila;
- hash de fila;
- país inferido o pendiente;
- moneda inferida o pendiente;
- periodo inferido o pendiente.

### CSV

Funciones esperadas:

- detectar separador;
- conservar encabezado original;
- normalizar encoding;
- preservar fila original;
- bloquear si faltan columnas críticas.

### PDF texto / OCR / Word / imagen

Etapa prototipo:

- extracción heurística;
- preview obligatorio;
- no escritura automática si no hay estructura confiable.

Etapa producción:

- extractor backend IA/OCR;
- clasificación por fuente;
- confianza por campo;
- validación humana para baja confianza.

## Tipos de fuente autorizados

1. clientes
2. aseguradoras
3. polizas
4. vehiculos
5. cobros_realizados
6. planilla_aseguradora
7. planilla_comisiones
8. estado_cuenta_bancario
9. financiero_historico
10. siniestros
11. documentos_soporte
12. configuracion_catalogo

## Contrato de procesamiento

Cada tipo de fuente debe implementar:

```txt
readStructure(file)
detectSourceType(structure)
buildManifest(structure)
validateManifest(manifest)
previewRows(file, manifest)
normalizeRows(rows, contract)
validateRows(normalized)
dryRunReport(result)
writeToStore(result)
```

`writeToStore` queda deshabilitado hasta aprobación de LAB real.

## Reglas por fuente

### clientes

Puede crear o actualizar clientes solo si hay identidad mínima confiable.

Campos críticos:

- nombre o razón social;
- identificación si existe;
- país;
- teléfono/correo si existen;
- origen.

Sin identidad confiable: bloquear escritura.

### pólizas

No crear cartera si falta alguno:

- número de póliza;
- cliente vinculado o pendiente confirmado;
- aseguradora;
- estado;
- país;
- moneda;
- prima neta o estructura de prima validada.

Estados con cartera:

- Vigente;
- Por renovar.

Estados históricos:

- Cancelada;
- Vencida;
- Anulada;
- Rechazada.

### cobros_realizados

Debe alimentar cobros/recaudos, no movimientos financieros generales.

No debe duplicar ingreso en financiero histórico.

### planilla_aseguradora

Debe validar:

- aseguradora;
- periodo;
- póliza o recibo;
- prima neta;
- comisión;
- moneda;
- país.

### planilla_comisiones

No puede usar tarifas simuladas.

Debe leer filas reales del archivo y distinguir:

- comisión esperada;
- comisión pagada;
- diferencia;
- retenciones;
- ajustes;
- periodo;
- aseguradora;
- asesor si aplica.

### estado_cuenta_bancario

Sirve para conciliación, no para crear clientes ni pólizas.

Debe mantener movimientos bancarios separados de finmovs operativos hasta conciliación.

### financiero_historico

Solo alimenta `finmovs` históricos.

Prohibido crear:

- clientes;
- pólizas;
- cobros;
- cartera;
- aseguradoras;
- producción.

### documentos_soporte

No crea ni modifica clientes automáticamente.

Puede proponer extracción y parches pendientes de confirmación.

## Estados de salida

Cada fila normalizada debe terminar como:

- LISTO;
- REQUIERE_VALIDACION;
- BLOQUEADO;
- OMITIDO;
- DUPLICADO_PROBABLE.

## Reporte dry-run obligatorio

Cada ejecución debe producir:

- archivo procesado;
- tipo fuente;
- hojas/bloques leídos;
- filas totales;
- filas listas;
- filas bloqueadas;
- filas pendientes;
- campos faltantes;
- reglas aplicadas;
- colecciones destino;
- confirmación de que no se escribió si es dry-run.

## Pendientes de implementación

1. Crear parser Excel real con trazabilidad hoja/bloque/fila.
2. Implementar contratos por fuente.
3. Crear validador de columnas mínimas por fuente.
4. Crear normalizador de moneda/país sin defaults peligrosos.
5. Crear deduplicador por fuente.
6. Crear preview UI conectado a manifest y dry-run.
7. Mantener `Orbit.store` como única capa de datos.

## Impacto comercializable

Este diseño evita que Orbit 360 funcione solo para A&S. Permite migrar nuevos intermediarios con archivos distintos, manteniendo reglas por fuente, país, moneda y tenant.
