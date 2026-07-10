# Reporte sanitizado — manifiestos reales PDF P0.7b

Fecha: 2026-07-10  
Estado: `TRES_ARCHIVOS_PROCESADOS_FUERA_REPO / RESULTADO_SANITIZADO / SIN_ESCRITURA`

## Alcance

Se ejecutó el extractor determinístico P0.7b contra los tres PDFs reales recibidos. Para el matching se utilizó un directorio temporal con las entidades correspondientes. Los manifiestos completos no se subieron al repositorio.

## Resultado

### Documento 1

- aseguradora propuesta correctamente: Aseguradora Guatemalteca;
- país: GT;
- moneda: GTQ;
- producto: Seguro de vehículo;
- tipo de vehículo detectado: Automóvil;
- páginas con contenido: 2;
- PII redactada en modo training;
- estructura de pagos, coberturas y beneficios detectada;
- plan exacto: requiere validación.

### Documento 2

- aseguradora propuesta correctamente: Aseguradora Guatemalteca;
- país: GT;
- moneda: GTQ;
- producto: Seguro de vehículo;
- tipo de vehículo detectado: Microbús hasta nueve pasajeros;
- páginas con contenido: 2;
- PII redactada;
- secciones comunes y diferencias respecto a automóvil preservadas;
- plan exacto: requiere validación.

### Documento 3

- aseguradora propuesta correctamente: Seguros Universales;
- no se mezcló con Aseguradora Guatemalteca;
- producto: Seguro de vehículo;
- tipo de vehículo detectado como variante del caso;
- páginas 2 y 4 detectadas como sparse/vacías;
- páginas 1 y 3 conservadas;
- opciones de pago, coberturas, pasos y condiciones detectados;
- PII redactada.

## Verificaciones de seguridad

- no se conservaron nombres de clientes;
- no se conservaron teléfonos o correos;
- no se conservaron datos del agente como conocimiento;
- no se exportaron bytes ni base64;
- no se siguieron enlaces;
- no se ejecutó contenido;
- no hubo escritura;
- importes y coberturas técnicas permanecen únicamente en los manifiestos temporales controlados.

## Interpretación operativa

### AseGuate

Los dos perfiles pueden formar una familia de presentación con variantes separadas. Todavía no pueden habilitar Cotizador automático porque faltan:

- propuestas P0.6b numéricas por hoja/rango;
- validación de plan;
- validación administrativa de reglas y presentación;
- vínculo final y segundo gate.

### Universales

El perfil es una fuente válida de presentación para:

- Cotizador mediante propuesta PDF externa;
- Comparativo.

No habilita Cotizador automático porque no existe una regla tarifaria validada vinculada.

## Pendientes

- conservar manifests en almacenamiento backend controlado;
- producir diff automático AseGuate auto/microbús;
- resolver plan y categorías;
- asociar a reglas P0.6;
- procesar más ejemplos por categoría;
- writer metadata-only;
- auditoría y gate.
