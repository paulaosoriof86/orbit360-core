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

## H-09 — Política estricta no era autoritativa

Necesidad:

Evitar que un módulo invoque accidentalmente el método base del gate y omita la validación estricta de país/moneda.

Causa raíz:

La primera versión exponía la política como wrapper separado, pero dejaba disponibles los métodos base originales.

Archivo/función:

```text
core/knowledge-binding-policy-p08.js
strictEvaluate()
strictEnablementPlan()
```

Fix:

- se conservan referencias internas a los métodos originales;
- al cargar la política, reemplaza `knowledgeBindingGateP08.evaluateBinding` y `buildEnablementPlan` por las versiones estrictas;
- se declara `authoritative: true`;
- el smoke valida tanto el wrapper como el método público base endurecido.

Impacto:

País/moneda obligatorios y monedas configuradas se aplican aunque el consumidor use directamente el gate público.

## Tests afectados

```text
tools/orbit360-test-document-intelligence-router-p08.mjs
tools/orbit360-test-knowledge-binding-policy-p08.mjs
```

Verifican:

- metadata del provider preservada;
- `routeKey` preservado;
- `apiKey` eliminado;
- resultado incompleto con IA/OCR bloqueados sigue en validación;
- política estricta autoritativa;
- moneda faltante bloqueada desde el gate público;
- moneda adicional solo por configuración tenant.
