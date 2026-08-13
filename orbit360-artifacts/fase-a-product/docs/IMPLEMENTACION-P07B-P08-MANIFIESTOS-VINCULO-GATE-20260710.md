# Implementación P0.7b/P0.8 — manifiestos, routing, vínculo y segundo gate

Fecha: 2026-07-10  
Módulo: Aseguradoras → Cotizador → Comparativo  
Estado: `CONTRATOS_IMPLEMENTADOS / MANIFIESTOS_REALES_PROBADOS_FUERA_REPO / RUNTIME_PENDIENTE`

## 1. Necesidad

Cerrar el espacio entre:

```text
archivo nuevo
→ lectura automática
→ manifiesto sanitizado
→ reglas y presentación
→ vínculo por combinación
→ validación
→ habilitación controlada
```

El sistema no puede depender de que ChatGPT lea artesanalmente cada Excel o PDF. Los archivos actuales son corpus de calibración; la operación futura debe ejecutarse desde Orbit para cualquier tenant.

## 2. Implementación

### 2.1 Extractor determinístico PDF

```text
tools/orbit360-extract-pdf-manifest-p07b.py
```

Responsabilidades:

- validar PDF, tamaño y páginas;
- calcular hash;
- extraer texto, fuentes, layout, tablas, imágenes y bounding boxes;
- detectar páginas vacías o escasas;
- proponer secciones;
- inferir país, moneda, producto y vehículo sin hardcodear aseguradoras;
- hacer matching contra un directorio recibido como parámetro;
- separar `training` y `operational`;
- redactar PII en entrenamiento;
- emitir JSON metadata-only;
- no ejecutar contenido ni seguir enlaces;
- no escribir en Orbit.store.

Dependencia backend fijada para CI:

```text
pymupdf==1.26.7
```

No se carga en el navegador ni se expone al cliente.

### 2.2 Router de inteligencia documental

```text
orbit360-platform/core/document-intelligence-router-p08.js
```

Orden de ejecución:

```text
parser determinístico
→ OCR condicional
→ análisis semántico condicional
→ matching/directorio
→ revisión humana
```

Tareas configurables por tenant:

```text
pdf_manifest
pdf_ocr
pdf_semantic
excel_manifest
excel_semantic
entity_matching
consultative_reasoning
```

El router recibe un registro de providers inyectado. No conoce API keys ni realiza llamadas de red.

Políticas configurables:

- permitir o bloquear IA externa;
- permitir o bloquear OCR;
- región;
- límite de páginas;
- presupuesto máximo;
- propósito training/operational;
- provider primario y fallback por tarea.

Reglas:

- si el parser determinístico obtiene texto, aseguradora, producto, secciones y confianza suficiente, no usa IA;
- OCR solo se activa ante texto insuficiente;
- análisis semántico solo se activa ante baja confianza o estructura incompleta;
- toda salida sigue en revisión y segundo gate.

### 2.3 Vínculo tarifa-presentación

```text
orbit360-platform/core/knowledge-binding-gate-p08.js
```

Vincula por:

```text
tenant
+ aseguradora
+ país/moneda
+ ramo/producto
+ familia/subtipo
+ segmento
+ riesgo
+ vehículo/uso
+ plan
```

Estados:

```text
complete_requires_gate
presentation_only
tariff_only
conflict_requires_validation
```

Reglas de selección:

- la regla específica prevalece sobre una genérica;
- dos reglas de igual especificidad con contenido diferente generan conflicto;
- dos presentaciones diferentes para la misma combinación generan conflicto de versión;
- una tarifa sin presentación no habilita una salida comercial;
- una presentación sin tarifa puede alimentar PDF externo y Comparativo, pero no Cotizador automático.

### 2.4 Política estricta país/moneda

```text
orbit360-platform/core/knowledge-binding-policy-p08.js
```

Corrección P0:

- país obligatorio;
- moneda obligatoria;
- GT usa GTQ por defecto;
- CO usa COP por defecto;
- otra moneda solo se permite si el tenant la configura expresamente;
- la falta de país/moneda nunca se interpreta como válida.

Esto protege los estados `REQUIERE_VALIDACION` y evita habilitar USD u otra moneda por inferencia global.

### 2.5 Segundo gate

Targets independientes:

```text
cotizador_automatico
cotizador_pdf_externo
comparativo
```

#### Cotizador automático

Requiere:

- tarifa validada;
- presentación validada;
- evidencia de ambas;
- base monetaria definida;
- una ruta de salida única;
- país/moneda válidos;
- módulo y aseguradora habilitados.

#### Cotizador PDF externo

Requiere:

- PDF normalizado y validado;
- presentación/evidencia;
- no necesita tarifa automática.

#### Comparativo

Requiere:

- propuesta normalizada y validada;
- secciones y evidencia;
- puede provenir de PDF externo sin tarifa.

El gate exige:

- rol activo autorizado;
- motivo;
- confirmación reforzada;
- fingerprint del vínculo;
- writer externo.

Si cambia una regla, presentación o versión después de aprobar, responde:

```text
BINDING_CAMBIO_REEJECUTAR_GATE
```

## 3. Roles

Puede preparar habilitación:

```text
SuperAdmin
Dirección
Admin
AdminTenant
```

Asesor y Operativo no pueden habilitar conocimiento global.

La consulta y corrección futura deben respetar scopes y rol activo.

## 4. Smokes

```text
tools/orbit360-test-extract-pdf-manifest-p07b.py
tools/orbit360-test-document-intelligence-router-p08.mjs
tools/orbit360-test-knowledge-binding-gate-p08.mjs
tools/orbit360-test-knowledge-binding-policy-p08.mjs
```

Cobertura:

- PDFs sintéticos;
- aseguradoras ficticias;
- PII training/operational;
- páginas sparse;
- vehículo distinto;
- parser determinístico suficiente;
- OCR/semántica como fallback;
- política sin IA externa;
- eliminación de secretos;
- regla específica sobre genérica;
- presentación sin tarifa;
- módulos tenant apagados;
- rol activo;
- segundo gate;
- stale binding;
- país/moneda;
- moneda adicional configurada.

Workflows:

```text
.github/workflows/orbit360-pdf-manifest-p07b-smoke.yml
.github/workflows/orbit360-document-intelligence-router-p08-smoke.yml
.github/workflows/orbit360-knowledge-binding-gate-p08-smoke.yml
```

## 5. Hallazgos y correcciones

### H-01 — PII separada por bloques

Necesidad: algunos PDFs colocan la etiqueta `Cliente:` en un bloque y el valor en el siguiente.

Causa: redactar cada bloque de forma aislada podía conservar el valor siguiente.

Fix: estado `redact_next` entre bloques y protección adicional en tablas.

Impacto: evita incorporar PII al manifiesto training.

Estado: cerrado en extractor P0.7b.

### H-02 — Página con texto corto vs. página vacía

Necesidad: no perder páginas legítimas con poco contenido.

Causa: un umbral alto podía marcar páginas breves como vacías.

Fix: umbral reducido y combinación de caracteres, número de bloques y ausencia de tablas.

Impacto: conserva páginas útiles y detecta páginas de encabezado/pie sin contenido real.

Estado: cerrado con smoke.

### H-03 — País/moneda ausentes aceptados

Necesidad: cumplir `REQUIERE_VALIDACION`.

Causa: la primera versión del gate toleraba moneda vacía y USD sin configuración.

Fix: política estricta P0.8c.

Impacto: bloquea habilitación incorrecta y conserva separación GT/CO.

Estado: cerrado con smoke.

### H-04 — Regex de CI con comillas frágiles

Necesidad: workflow portable en bash.

Causa: una expresión para detectar claves mezclaba comillas simples y dobles.

Fix: el workflow valida ausencia de network/writes y el smoke comprueba sanitización de secretos funcionalmente.

Impacto: evita que falle CI por sintaxis del propio guard.

Estado: cerrado.

### H-05 — Extracción legacy de frontend

Hallazgo: `core/ia.js` conserva funciones demo/locales, carga pdf.js desde CDN y configura claves en localStorage.

Decisión:

- no reutilizar ese camino como provider productivo;
- no modificarlo en este bloque para evitar regresión transversal;
- P0.8 define la nueva frontera backend/provider;
- la futura integración deberá migrar módulos al router y retirar secretos del frontend.

Estado: pendiente de empalme seguro; documentado como P0.

## 6. Fronteras

No se modificaron:

- `data/store.js`;
- store Firestore LAB;
- Auth;
- reglas;
- index;
- módulos Cotizador/Comparativo;
- datos reales.

No se habilitó ningún producto.

## 7. Próximo avance

1. Wire backend que invoque el extractor/routeador desde referencia autorizada.
2. Persistencia metadata-only mediante writer externo.
3. Propuestas P0.6b numéricas por hoja/rango para Excel.
4. Manifiestos PDF reales versionados fuera del repo.
5. Diff real AseGuate automóvil/microbús.
6. Bindings por combinación.
7. Primera validación administrativa.
8. Integración provisional en Aseguradoras.
9. Después, Cotizador.
