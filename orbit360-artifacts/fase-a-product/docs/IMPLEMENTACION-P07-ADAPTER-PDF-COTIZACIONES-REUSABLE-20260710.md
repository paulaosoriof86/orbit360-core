# Implementación P0.7 — adapter PDF reusable para cotizaciones

Fecha: 2026-07-10  
Módulo: Aseguradoras → Cotizador → Comparativo  
Estado: `CONTRATO_IMPLEMENTADO / TRES_PDF_REALES_AUDITADOS / PROVIDER_REAL_PENDIENTE`

## Necesidad

La plataforma debe interpretar nuevas cotizaciones PDF desde la propia operación, para cualquier tenant, sin depender de una lectura manual previa ni de reglas creadas específicamente para un archivo.

Los ejemplos reales demostraron:

- una misma aseguradora puede tener variantes por vehículo y plan;
- una segunda aseguradora puede usar una estructura completamente distinta;
- existen secciones, tablas, iconos y páginas vacías;
- los datos personales deben separarse de la base reusable;
- no se puede forzar una plantilla plana.

## Archivo implementado

```text
orbit360-platform/core/pdf-quote-adapter-p07.js
```

El adapter:

- recibe extracción estructurada de un provider externo;
- no abre red directamente;
- no escribe en `Orbit.store`;
- no contiene nombres de aseguradoras;
- no contiene PII ni valores reales;
- no habilita Cotizador ni Comparativo;
- conserva títulos, orden, tablas y layout;
- genera perfiles, familias, variantes y diff.

## Contrato del provider

La solicitud requiere:

```text
includeText: true
includeLayout: true
includeTables: true
includeImages: true
detectLogos: true
detectBlankPages: true
preserveReadingOrder: true
preserveOriginalLabels: true
requiresPageBlockEvidence: true
```

Y bloquea:

```text
returnRawBytes: false
returnBase64: false
returnTokens: false
executeEmbeddedContent: false
```

En propósito `training`, `includeSensitiveValues` queda siempre desactivado.

## Perfiles generados

### Página

- número;
- tamaño y orientación;
- bloques ordenados;
- página vacía;
- estilo/fondo;
- evidencia.

### Bloque

- encabezado;
- campo;
- tabla;
- párrafo;
- nota;
- cuadrícula de iconos;
- imagen;
- otro.

### Sección

- título original;
- clave semántica propuesta;
- orden;
- campos originales;
- estilo;
- página/bloque/bounding box;
- confianza.

### Perfil

- tenant;
- documento;
- aseguradora propuesta;
- país/producto/riesgo/vehículo/plan;
- presentación compatible con `cotizacion-esquema-aseguradora-p0.js`;
- páginas;
- advertencias;
- usos documentales;
- política de render;
- estado y gates.

## Matching de aseguradora

El adapter recibe candidatos del provider/directorio y solo propone una coincidencia de alta confianza cuando:

- el candidato principal alcanza el umbral;
- no existe un segundo candidato demasiado cercano.

En caso contrario:

```text
requires_validation
```

El nombre del archivo no es evidencia suficiente.

## Familias y variantes

La familia se agrupa por:

```text
tenant + aseguradora + país + ramo + producto
```

La variante se diferencia por:

```text
familia/subtipo + segmento + riesgo + vehículo + uso + plan
```

`buildTemplateFamily()` detecta:

- secciones comunes;
- secciones variables;
- firmas de campos;
- necesidad de routing por variante.

Nunca fusiona perfiles automáticamente:

```text
mergeProfiles: false
```

## PII y propósito

### Training

Los campos sensibles se reemplazan por:

```text
[valor_sensible_omitido]
```

Se consideran sensibles, entre otros:

- cliente/nombre;
- correo;
- teléfono;
- documento;
- DPI/cédula;
- NIT;
- placa;
- intermediario/agente;
- dirección;
- fecha de nacimiento.

Los valores técnicos no sensibles pueden conservarse para aprendizaje estructural.

### Operational

El provider puede devolver datos del caso únicamente si:

- el propósito es operativo;
- el rol y scope lo permiten;
- existe motivo;
- los datos se mantienen fuera de la base de conocimiento reusable.

## Validaciones

- tenant;
- documento;
- país;
- producto;
- aseguradora;
- contenido no vacío;
- secciones;
- títulos;
- páginas vacías como warning;
- evidencia;
- segundo gate.

## Smoke

```text
tools/orbit360-test-pdf-quote-adapter-p07.mjs
```

Cubre:

- dos variantes de una misma aseguradora;
- una segunda aseguradora distinta;
- Secciones I/II/III;
- coberturas y beneficios;
- pasos y condiciones;
- páginas vacías;
- PII redacted;
- matching ambiguo;
- familias separadas;
- variantes no fusionadas;
- provider metadata-only;
- diff.

Workflow:

```text
.github/workflows/orbit360-pdf-quote-adapter-p07-smoke.yml
```

## Impacto en módulos

### Aseguradoras

- carga y clasificación PDF;
- preview de páginas;
- matching de aseguradora;
- familia/variante;
- secciones;
- diff y versión;
- validación.

### Cotizador

- puede incorporar PDFs externos en el tablero;
- conserva presentación individual;
- no usa el PDF como tarifa general sin evidencia adicional.

### Comparativo

- recibe los campos normalizados;
- conserva beneficios y condiciones particulares;
- puede abrir la propuesta individual.

### Academia

- carga segura;
- diferencia training/operational;
- resolución de aseguradora;
- revisión de secciones;
- variantes;
- PII;
- versiones y gates.

## Pendientes

- provider PDF real;
- ejecución de los tres PDFs por el adapter;
- manifiestos sanitizados página/bloque;
- diff real AseGuate automóvil vs microbús;
- vinculación con P0.6 tarifario;
- wire Drive;
- writer/gate;
- integración runtime;
- UX Claude;
- CI visible y smoke navegador.
