# Auditoría forense sanitizada — cotizaciones PDF AseGuate y Universales P0.7

Fecha: 2026-07-10  
Carril: C, con traducción a B y A  
Estado: `TRES_PDF_ANALIZADOS / PII_NO_REPOSITORIO / PRESENTACION_PARCIAL_ASEGUATE / UNIVERSALES_SEPARADO`

## 1. Objetivo

Usar tres cotizaciones reales como corpus de validación del adapter PDF reusable, sin convertir la lectura manual en lógica hardcodeada.

Se revisaron:

1. Cotización AseGuate para automóvil.
2. Cotización AseGuate para microbús hasta nueve pasajeros.
3. Cotización Riesgo Plus de Seguros Universales.

El tercer archivo no pertenece a Aseguradora Guatemalteca y debe conservarse como familia documental separada.

Los documentos contienen PII y datos comerciales. El repositorio conserva únicamente hallazgos sanitizados, estructura y contratos reusables.

## 2. Verificación técnica

### AseGuate automóvil

- PDF de 2 páginas.
- Tamaño aproximado A4.
- Generado por Chromium/Skia.
- Texto seleccionable con fuentes embebidas.

### AseGuate microbús

- PDF de 2 páginas.
- Tamaño aproximado A4.
- Generado por Chromium/Skia.
- Misma familia visual que el documento de automóvil.

### Universales Riesgo Plus

- PDF de 4 páginas tamaño carta.
- Generado por BIRT/OpenPDF.
- Las páginas 2 y 4 están prácticamente vacías y conservan solamente estructura de encabezado/pie.
- El adapter debe detectar páginas vacías sin invalidar las páginas útiles.

## 3. AseGuate — familia común y variantes

Los dos PDFs comparten:

- encabezado y marca;
- bloques de datos personales, servicio y vehículo;
- formas de pago;
- pago de contado;
- fraccionamiento;
- Visa Cuotas;
- beneficios institucionales en página 1;
- observaciones;
- página 2 con Sección I, II y III;
- coberturas adicionales;
- beneficios adicionales de asistencia vial;
- pie y datos de contacto.

Por tanto, forman una misma `familiaPresentacion`, pero dos variantes distintas.

### 3.1 Variante automóvil

La cotización de automóvil presenta:

- deducibles de Sección I con mínimo propio;
- responsabilidad civil y extensión a ocupantes específicas;
- límites de gastos médicos y accidentes personales propios;
- suma de muerte accidental del piloto propia;
- coberturas adicionales con varios elementos no amparados;
- alquiler por robo, pero no necesariamente por pérdida total;
- límites de asistencia vial más restringidos;
- observación específica para vehículo usado en plataforma de transporte.

Hallazgo:

- el logo/denominación de plan visible y una observación interna no parecen usar exactamente el mismo nombre de plan. Debe registrarse `REQUIERE_VALIDACION_PLAN`, no resolverse por inferencia automática.

### 3.2 Variante microbús hasta nueve pasajeros

La cotización de microbús conserva el formato general, pero modifica materialmente:

- prima total y cuotas;
- mínimo de deducible;
- responsabilidad civil;
- extensión a ocupantes;
- límites por persona y agregado;
- muerte accidental del piloto;
- valor pactado;
- daños de chapas y llantas;
- alquiler por pérdida y robo;
- límites y número de eventos de asistencia;
- tolerancias de embriaguez y licencia vencida.

Conclusión:

- el tipo de vehículo no es un dato decorativo;
- determina una variante de producto/presentación y sus coberturas;
- no se debe aplicar la plantilla de automóvil al microbús ni viceversa;
- la plataforma debe detectar secciones comunes y diferencias, pero mantener perfiles separados.

## 4. Estado de Aseguradora Guatemalteca después de estos PDFs

Antes de este bloque:

```text
fuente tarifaria disponible
presentación no disponible
requiere cotización ejemplo
```

Después de este bloque:

```text
fuente tarifaria disponible
presentación disponible parcialmente
variantes confirmadas: automóvil y microbús hasta 9 pasajeros
otras variantes/productos: requieren ejemplos adicionales
reglas y presentación: requieren validación antes de habilitar
```

Estos PDFs no completan automáticamente todas las categorías del tarifario. Cada nuevo tipo de vehículo, plan o producto debe incorporarse como variante o familia nueva mediante el flujo de la plataforma.

## 5. Seguros Universales — familia independiente

La cotización Riesgo Plus presenta una estructura diferente:

### Página 1

- datos de cliente y vehículo;
- prima neta y total;
- descuento por pronto pago;
- credicuotas/neocuotas;
- pagos fraccionados;
- coberturas principales;
- daños propios;
- responsabilidad civil;
- lesiones a ocupantes;
- deducibles;
- coberturas adicionales Plus en cuadrícula de iconos.

### Página 3

- pasos para contratar;
- coberturas adicionales incluidas;
- condiciones importantes enumeradas;
- territorio;
- exclusiones de uso/tipo;
- inspección;
- documentación;
- condiciones de dispositivos;
- condiciones de pago;
- piezas importadas;
- vehículos híbridos/eléctricos;
- vigencia de cotización;
- datos del agente.

No usa Secciones I, II y III como estructura principal. El adapter debe conservar los títulos originales y no forzar la taxonomía de AseGuate.

Las páginas vacías 2 y 4 se registran como advertencia de layout, no como error de extracción.

## 6. Reglas reusables derivadas

### Identificación

- detectar logo, nombre y textos de aseguradora;
- comparar contra el directorio del tenant;
- una coincidencia ambigua queda `REQUIERE_VALIDACION`;
- nunca asociar un PDF por el nombre de archivo únicamente.

### Lectura

El proveedor debe entregar:

- texto;
- tablas;
- imágenes/logos;
- orden de lectura;
- bounding boxes;
- páginas vacías;
- bloques y encabezados;
- confianza y evidencia por página/bloque.

### Presentación

- conservar títulos y orden;
- conservar secciones no canónicas;
- conservar tablas y cuadrículas de beneficios;
- separar datos canónicos de presentación;
- admitir páginas y columnas distintas;
- generar familia y variantes;
- no fusionar variantes.

### Seguridad

En modo entrenamiento:

- omitir nombres, teléfonos, correos, documentos, placas e identificadores;
- conservar importes, coberturas y estructura cuando no sean PII;
- no devolver bytes, base64, tokens ni contenido ejecutable.

En modo operativo:

- los datos del cliente pueden extraerse únicamente bajo permisos y propósito explícito;
- nunca se incorporan a la base de conocimiento reusable.

## 7. Flujo futuro para cualquier tenant

```text
carga PDF
→ contrato documental P0.4
→ provider PDF configurable
→ texto + layout + tablas + imágenes
→ matching de aseguradora con directorio tenant
→ inferencia de país/producto/riesgo
→ perfil de presentación
→ familia y variante
→ diff contra versiones previas
→ validación humana
→ registro versionado
→ segundo gate de habilitación
```

El sistema no depende de que ChatGPT haya leído previamente el documento. Los tres PDFs son corpus de prueba y calibración para un flujo ejecutable desde la plataforma.

## 8. No migrar

- PII de los ejemplos;
- números de cotización o intermediario como constantes;
- nombres de clientes/agentes como conocimiento;
- colores o logos embebidos como base64 en el core;
- importes de un caso particular como regla tarifaria;
- páginas vacías como secciones;
- taxonomía de AseGuate impuesta a Universales;
- una sola plantilla por aseguradora sin variantes.

## 9. Pendientes

- ejecutar el adapter con provider real;
- manifiesto sanitizado página/bloque;
- diff real entre las dos variantes AseGuate;
- asociación al tarifario AseGuate por combinación;
- más ejemplos por categorías faltantes;
- wire Drive;
- gate de habilitación;
- integración runtime y UX Claude.
