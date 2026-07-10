# Registro de hardening — router documental P0.8

Fecha: 2026-07-10  
Módulo: Aseguradoras / Inteligencia documental  
Estado: `CORREGIDO / SMOKE_AMPLIADO / CI_VISIBLE_PENDIENTE`

## H-06 — Sanitizador eliminaba claves funcionales

Necesidad:

Conservar propiedades legítimas como `routeKey`, `productKey` o claves de mapeo, eliminando únicamente secretos reales.

Esperado:

- `apiKey`, token, password, secret, credential y authorization se eliminan;
- `routeKey` permanece.

Causa raíz:

El primer sanitizador buscaba la subcadena `key` en cualquier nombre de propiedad.

Archivo/función:

```text
core/document-intelligence-router-p08.js
secretKey()
```

Fix:

- `key` se bloquea solo si es el nombre exacto;
- `apikey`, token, secret, password, credential y authorization se bloquean por patrón específico;
- smoke funcional para `apiKey` y `routeKey`.

Impacto:

Evita pérdida silenciosa de rutas, identificadores y mappings del manifiesto.

## H-07 — Metadata estructural del provider se perdía

Necesidad:

Conservar `documentId`, `file`, parser, hash y demás metadata sanitizada del manifiesto determinístico.

Causa raíz:

`mergeManifest()` copiaba únicamente páginas, secciones, candidatos y dimensiones.

Fix:

La unión parte de `base + addition` sanitizados y después aplica reglas específicas a arrays, confianza, warnings, pipeline y flags.

Impacto:

El wire puede mantener trazabilidad de archivo y parser sin payload binario.

## H-08 — Política restrictiva podía mostrar manifiesto como listo

Necesidad:

Si OCR o análisis semántico están recomendados pero el tenant los prohíbe, el resultado debe conservarse como `REQUIERE_VALIDACION`.

Causa raíz:

La decisión final miraba solo si el fallback se ejecutaría, no si seguía siendo necesario.

Fix:

Se separaron:

```text
ocrRecommended vs needOcr
semanticRecommended vs needSemantic
```

Nuevos motivos:

```text
OCR_BLOQUEADO_POR_POLITICA
ANALISIS_SEMANTICO_BLOQUEADO_POR_POLITICA
```

Impacto:

Mantiene estados honestos y respeta la política de datos sin fingir suficiencia.

## Test afectado

```text
tools/orbit360-test-document-intelligence-router-p08.mjs
```

Verifica:

- metadata del provider preservada;
- `routeKey` preservado;
- `apiKey` eliminado;
- resultado incompleto con IA/OCR bloqueados sigue en validación.
