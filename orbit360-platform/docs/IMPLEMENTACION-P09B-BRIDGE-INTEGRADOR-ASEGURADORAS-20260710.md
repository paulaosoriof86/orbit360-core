# Implementación P0.9b — bridge backend e integrador seguro de Aseguradoras

Fecha: 2026-07-10  
Estado: `BRIDGE_IMPLEMENTADO / INTEGRADOR_PREPARADO / INDEX_NO_MODIFICADO / PROVIDER_REAL_PENDIENTE`

## 1. Necesidad

P0.9 ya definió registry, writer metadata-only y read model. Faltaba una frontera honesta entre la SPA y un backend capaz de ejecutar los inspectores Excel/PDF, además de un empalme seguro en el `index.html` real.

## 2. Bridge backend

Archivo:

```text
orbit360-platform/core/document-provider-bridge-p09b.js
```

Busca únicamente un bridge inyectado por backend:

```text
window.OrbitBackendDocumentBridge
Orbit.backendDocumentBridge
```

El bridge debe exponer estado/capacidades y métodos para las tareas autorizadas.

Si no existe o no confirma `connected: true`, el resultado es:

```text
BACKEND_REQUIRED
```

No registra una integración ficticia.

### Capacidades posibles

```text
pdf_manifest
pdf_ocr
pdf_semantic
excel_manifest
excel_semantic
entity_matching
consultative_reasoning
```

### Seguridad

El bridge:

- no contiene endpoint;
- no contiene API keys;
- no usa `fetch` ni `XMLHttpRequest`;
- no guarda configuración en localStorage;
- fuerza respuestas sin bytes, base64, tokens ni contenido ejecutable;
- delega sanitización final al registry P0.9;
- se desregistra cuando el backend reporta desconexión.

## 3. Integrador seguro

Archivo:

```text
tools/orbit360-integrar-aseguradoras-knowledge-p09-index.mjs
```

Modo predeterminado:

```text
dry-run
```

No modifica el archivo.

Modo explícito:

```text
--apply
```

Antes de aplicar verifica:

- rama obligatoria;
- `index.html` UTF-8;
- presencia de `data/store.js`;
- módulo Aseguradoras;
- ausencia de duplicados;
- ausencia de mojibake;
- orden de scripts.

El integrador reconoce etiquetas versionadas como:

```html
<script src="modules/aseguradoras.js?v1291"></script>
```

Orden de carga:

```text
document-source-contract-p04
cotizacion-esquema-aseguradora-p0
excel-rule-proposal-adapter-p06b
pdf-quote-adapter-p07
document-provider-registry-p09
document-provider-bridge-p09b
aseguradoras-knowledge-runtime-p09
modules/aseguradoras.js
modules/aseguradoras-knowledge-p09
```

En `--apply` crea backup y restaura si falla la postvalidación.

No hace commit, push ni deploy.

## 4. Hardening del writer

### H-10 — capacidades inferidas por extensión

Problema:

La primera versión podía marcar todo Excel como fuente tarifaria solo por el tipo de archivo.

Corrección:

- `contieneTarifas` se deriva de facts/capabilities reales;
- `contieneReglasCalculo` requiere fórmulas o capability explícita;
- hoja de salida y área de impresión se derivan del manifiesto;
- los usos se construyen únicamente desde capacidades detectadas.

Impacto:

Evita afirmar que un Excel desconocido contiene tarifas o reglas antes de inspeccionarlo.

### H-11 — write parcial

Problema:

La API `Orbit.store` no ofrece transacción nativa. Una excepción intermedia podía dejar registros parciales.

Corrección:

- snapshot previo por operación;
- rollback inverso mediante `remove` + `insert` de la versión anterior;
- código `WRITE_FAILED_ROLLED_BACK`;
- auditoría solo después del bloque exitoso.

Impacto:

El manifiesto, propuestas, reglas, presentación, binding y ficha de aseguradora se aplican como bloque lógico o se revierten.

### H-12 — ancla no compatible con query string

Problema:

El index real usa `modules/aseguradoras.js?v1291`.

Corrección:

El integrador usa una expresión que admite query strings y detecta duplicados de versiones diferentes.

## 5. Smokes

```text
tools/orbit360-test-document-provider-bridge-p09b.mjs
tools/orbit360-test-integrar-aseguradoras-knowledge-p09-index.mjs
```

Cubren:

- bridge ausente;
- bridge conectado/desconectado;
- registro de capacidades;
- ejecución a través del registry;
- eliminación de secretos/payload;
- ancla versionada;
- dry-run sin cambios;
- duplicados;
- orden;
- cero commit/deploy.

El smoke general P0.9 también cubre capabilities derivadas del manifiesto y rollback del writer.

## 6. Estado real

Implementado:

- bridge reusable;
- integrador seguro;
- tests;
- workflow actualizado;
- hardening.

No ejecutado:

- `--apply` sobre el index;
- provider backend real;
- persistencia de las fuentes A&S;
- activación de Cotizador/Comparativo.

## 7. Siguiente paso

1. Implementar el bridge backend real que invoque inspectores Python desde referencia autorizada.
2. Ejecutar dry-run del integrador en la rama.
3. Aplicar empalme solo después de validación.
4. Registrar el provider real.
5. Persistir una primera fuente A&S metadata-only.
6. Verificar read model y auditoría.
7. Repetir por lotes para las once fuentes.
