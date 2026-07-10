# Contrato router de inteligencia documental P0.8

Fecha: 2026-07-10  
Estado: `CONTRATO_IMPLEMENTADO / PROVIDERS_REALES_PENDIENTES / BACKEND_ONLY`

## Objetivo

Permitir que cada tenant configure la mejor combinación de parsing, OCR y análisis para cada tarea documental sin exponer credenciales ni acoplar Orbit a un único proveedor.

## Interfaz

```javascript
Orbit.documentIntelligenceRouterP08.run(input, providerRegistry, tenantConfig)
```

### Entrada

```text
tenantId
documentId
fileRef o sourceHash
fileName/extensión
purpose: training | operational
aseguradoraId opcional
dimensiones opcionales
motivo
```

No acepta bytes como contrato de frontend.

### Configuración tenant

```text
iaPorTarea / aiByTask
  pdf_manifest
  pdf_ocr
  pdf_semantic
  excel_manifest
  excel_semantic
  entity_matching
  consultative_reasoning

politicaDatos / dataPolicy
  allowExternalAi
  allowOcr
  region
  maxPages
  maxCostUsd
```

Cualquier clave como `apiKey`, `token`, `secret`, `password` o `credential` se elimina del objeto que circula por el router.

## Providers

El registro se inyecta desde backend:

```javascript
{
  deterministic_pdf_p07b: { inspect(request, context) {} },
  deterministic_excel_p04: { inspect(request, context) {} },
  ocr_provider: { ocr(request, context) {} },
  semantic_provider: { analyze(request, context) {} }
}
```

El router no crea conexiones de red ni conoce secretos.

## Estrategia deterministic-first

### PDF

1. `pdf_manifest` determinístico.
2. OCR solo si no hay texto suficiente.
3. Semántica solo si falta aseguradora, producto, secciones o confianza.

### Excel

1. `excel_manifest` determinístico.
2. Semántica solo para proponer significado de hojas/rangos/reglas.
3. Fórmulas y macros nunca se ejecutan.

## Señales de suficiencia

- páginas con contenido;
- cantidad de caracteres;
- aseguradora candidata con confianza suficiente;
- producto detectado;
- secciones detectadas;
- tablas;
- warnings;
- OCR ya ejecutado.

## Salida

```text
plan
stages[]
manifest
fallback
approved: false
enabled: false
writeAllowed: false
requiresHumanValidation: true
requiresSecondGateForEnablement: true
```

## Seguridad

- no bytes/base64;
- no API keys;
- no localStorage/sessionStorage;
- no `Orbit.store` directo;
- no red directa;
- no ejecución de contenido;
- no macros/fórmulas;
- no links externos;
- payload del provider sanitizado;
- PII según propósito y política;
- aislamiento tenant.

## Estados

```text
plan_blocked
plan_ready
MANIFEST_READY_FOR_REVIEW
MANIFEST_REQUIRES_VALIDATION
PROVIDER_REQUIRED
PROVIDER_FAILED
```

## Relación con IA transversal actual

`core/ia.js` es una capa de prototipo/demo y no cumple la frontera productiva para documentos porque conserva configuración frontend y parsing local. P0.8 no la sobrescribe. La migración futura debe:

1. mantener compatibilidad visual;
2. reemplazar llamadas documentales por el router/backend;
3. eliminar secretos del navegador;
4. conservar configuración por tarea;
5. documentar el cambio para Claude y Academia.

## Criterios de aceptación provider real

- procesa archivo desconocido;
- respeta política tenant;
- usa deterministic-first;
- no invoca OCR innecesariamente;
- no invoca IA cuando la evidencia es suficiente;
- entrega página/hoja/rango/bloque;
- retorna confianza y warnings;
- no persiste ni habilita;
- supera benchmark sanitizado GT/CO y productos distintos.
