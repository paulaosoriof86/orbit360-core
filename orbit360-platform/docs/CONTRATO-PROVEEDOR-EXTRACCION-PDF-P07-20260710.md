# Contrato proveedor inteligente de extracción PDF P0.7

Fecha: 2026-07-10  
Estado: `CONTRATO_DEFINIDO / IMPLEMENTACION_PROVIDER_PENDIENTE / FRONTEND_SIN_SECRETOS`

## 1. Propósito

Definir un provider reusable para que Orbit 360 lea cotizaciones PDF nuevas desde la plataforma, para cualquier tenant, aseguradora, país y producto.

El provider no se diseña para reproducir tres archivos específicos. Los archivos reales funcionan como corpus de calibración y prueba.

## 2. Interfaz

El backend deberá exponer un contrato equivalente a:

```javascript
OrbitPdfQuoteExtractionProviderP07.extractQuote(request)
```

Entrada mínima:

```text
tenantId
aseguradoraId opcional
documentId
fileRef/sourceHash
purpose: training | operational
país/producto/riesgo candidatos opcionales
configuración de routing IA del tenant
```

Salida mínima:

```text
documentId
pageCount
pages[]
  number
  width/height/orientation
  blank
  blocks[]
    kind
    title/text
    fields/tables
    bbox/order
    confidence
insurerCandidates[]
dimensiones candidatas
sections[]
confidence
warnings
```

No devuelve bytes, base64, tokens ni secretos.

## 3. Pipeline obligatorio

### Etapa 1 — Preflight

- validar tipo MIME, extensión y tamaño;
- detectar cifrado, corrupción y páginas;
- calcular hash;
- registrar metadata;
- bloquear contenido ejecutable o adjuntos sospechosos.

### Etapa 2 — Parsing determinístico

- extraer capa de texto;
- palabras y bounding boxes;
- fuentes/tamaños;
- tablas candidatas;
- imágenes y logos;
- dimensiones de página;
- orden de lectura;
- páginas vacías.

Esta etapa tiene prioridad cuando el PDF contiene texto seleccionable.

### Etapa 3 — OCR de respaldo

Solo se activa cuando:

- no existe capa de texto;
- la cobertura de texto es insuficiente;
- existen páginas escaneadas o imágenes relevantes.

No se debe ejecutar OCR indiscriminadamente sobre todos los documentos.

### Etapa 4 — Comprensión visual y semántica

El modelo configurado debe:

- reconocer encabezados y secciones;
- distinguir tablas, iconos, notas y condiciones;
- preservar orden y jerarquía;
- proponer aseguradora;
- proponer país, producto, vehículo/riesgo y plan;
- mapear campos canónicos sin eliminar etiquetas originales;
- detectar variantes;
- asignar confianza;
- citar página/bloque/bbox.

### Etapa 5 — Matching con directorio

- comparar nombre/logo/textos contra `Orbit.modules.aseguradoras`;
- considerar aliases y razón social;
- separar coincidencias por país;
- no aceptar por nombre de archivo;
- marcar ambigüedad;
- no crear aseguradora nueva automáticamente.

### Etapa 6 — Separación de PII

#### Training

- redacción obligatoria de nombres, teléfonos, correos, documentos, placas, direcciones e identificadores;
- conservación de estructura y valores técnicos no sensibles;
- prohibido persistir payload del cliente en conocimiento.

#### Operational

- PII solo bajo rol/scope autorizado;
- propósito explícito;
- auditoría;
- almacenamiento únicamente en la entidad operativa correspondiente;
- nunca copiarla a patrones reusables.

### Etapa 7 — Perfil y diff

- ejecutar `pdf-quote-adapter-p07.js`;
- comparar contra familia/variantes existentes;
- detectar secciones nuevas, removidas o modificadas;
- conservar documento y versión fuente;
- mostrar diff corregible.

### Etapa 8 — Validación y aprendizaje

- cada corrección requiere actor, motivo y evidencia;
- una corrección aprobada puede actualizar patrones versionados;
- una corrección rechazada no debe entrenar el patrón;
- la validación no habilita automáticamente Cotizador/Comparativo;
- se exige segundo gate.

## 4. Routing de inteligencia artificial

La arquitectura debe ser provider-agnostic y configurable por tenant/módulo/tarea.

Tareas independientes:

```text
OCR/preprocesamiento
comprensión de layout
extracción estructurada
matching de entidad/producto
razonamiento consultivo
validación/fallback
```

Una sola IA no debe imponerse a todas las tareas. El tenant puede definir proveedor primario, fallback, límites de costo y política de datos.

La selección definitiva se basará en benchmark sanitizado con:

- PDFs de texto;
- PDFs escaneados;
- tablas;
- múltiples columnas;
- iconos y beneficios;
- páginas vacías;
- aseguradoras y productos diferentes;
- GT y CO.

## 5. Seguridad

- credenciales de IA solo en backend;
- logs sin PII ni contenido completo;
- URLs temporales de mínimo privilegio;
- aislamiento por tenant;
- límites de tamaño/páginas;
- timeouts;
- protección contra prompt injection documental;
- no ejecutar JavaScript, macros, adjuntos ni enlaces;
- no seguir URLs externas incrustadas;
- auditoría de lectura, extracción, corrección y validación.

## 6. Estados

```text
preflight_pendiente
parsing_deterministico
ocr_requerido
analisis_semantico
matching_aseguradora
perfil_propuesto
requiere_validacion
conflicto
validado_pendiente_habilitacion
habilitado
reemplazado_por_version
bloqueado
```

## 7. Criterios de aceptación

El provider se considera apto cuando:

1. procesa documentos no conocidos previamente;
2. separa correctamente aseguradoras;
3. conserva secciones y orden;
4. detecta variantes por producto/riesgo;
5. no mezcla páginas vacías como contenido;
6. redacciona PII en training;
7. entrega evidencia página/bloque/bbox;
8. genera diff reproducible;
9. no escribe ni habilita por sí mismo;
10. supera benchmark sanitizado y revisión humana.

## 8. Integración futura

```text
Drive/Upload
→ provider backend P0.7
→ adapter PDF P0.7
→ esquema presentación P0
→ inventario Aseguradoras
→ diff/validación
→ gate habilitación
→ Cotizador/Comparativo
```
