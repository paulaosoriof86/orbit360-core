# Pendiente de integración — Cotizador/Comparativo A&S avanzado v110 — 2026-07-07

## Contexto

Paula indicó que el Cotizador/Comparativo incluido en el prototipo actual está general porque depende de tarifas aprobadas/configuradas por cliente/tenant.

Existe una fuente avanzada ya trabajada para Alianzas y Soluciones que debe integrarse posteriormente a Orbit 360:

```txt
Fuente adjunta en conversación/proyecto: comparativo_final_v110.html
Fuente relacionada: comparativa-ia.html
```

## Decisión de alcance

Este pendiente NO altera el plan actual de backend/hotfixes post-empalme v1330.

Debe abordarse cuando corresponda el bloque específico de:

```txt
Cotizador / Comparativo / Tarifas / Aseguradoras / documentos soporte
```

## Regla principal

La integración debe traer el avance del index especializado de Alianzas **solo para Cotizador y Comparativo**, no reemplazar el `index.html` completo ni otros módulos de Orbit 360.

Debe integrarse como módulo/servicio dentro de la plataforma:

```txt
modules/cotizador*.js
modules/comparativo*.js
core/tarifas*.js
core/cotizador*.js
core/comparativo*.js
```

según convenga tras auditoría real de la fuente.

## Reglas que debe preservar

1. Orbit 360 sigue siendo multi-tenant/white-label.
2. A&S se personaliza por configuración, no por fork ni hardcode.
3. Las tarifas aprobadas deben venir de configuración/documentos de aseguradoras/tenant.
4. No se deben quemar tarifas reales en código base.
5. Las aseguradoras, ramos, productos, deducibles, coberturas y reglas deben enlazarse con:

```txt
Orbit.tenant
Orbit.store('aseguradoras')
Orbit.store('tarifas') o colección equivalente
Documentos/tarifas adjuntas en ficha de aseguradora
```

6. Si una tarifa/documento no fue leído o validado, la UI debe mostrar estado honesto:

```txt
Pendiente de configuración
Requiere validación
Tarifa no conectada
Documento pendiente de lectura
```

7. No simular cotización oficial si la tarifa no está conectada/validada.
8. No mezclar monedas ni países: GT→GTQ, CO→COP.
9. Comparativo debe respetar país/moneda/aseguradora habilitada por tenant.
10. Documentos soporte pueden proponer tarifas o reglas, pero no deben escribirlas como oficiales sin confirmación/diff.

## Integración esperada

El comparativo avanzado de A&S debe quedar ligado a:

- Directorio de aseguradoras.
- Tarifa por aseguradora/ramo/producto.
- Documentos/tarifas cargadas en ficha de aseguradora.
- Configuración de país/moneda.
- Configuración tenant A&S.
- Expediente del cliente/póliza cuando aplique.
- Importador inteligente/documental para extraer o proponer reglas.

## Auditoría obligatoria antes de integrar

Antes de empalmar `comparativo_final_v110.html`:

1. Extraer inventario del archivo.
2. Separar HTML, CSS y JS de cotizador/comparativo.
3. Identificar funciones, datos, tarifas, constantes y dependencias.
4. Detectar hardcode A&S, tarifas, aseguradoras, fechas, textos técnicos o credenciales.
5. Determinar qué se conserva tal cual y qué debe parametrizarse por tenant.
6. Mapear a módulos actuales de Orbit 360.
7. Diseñar plan de integración aditivo sin tocar backend protegido.
8. Validar con `node --check` de archivos resultantes.
9. Documentar impacto en Academia.

## Pendiente Academia

Cuando se integre, Academia debe incluir:

- Cómo configurar tarifas aprobadas.
- Cómo cargar documentos de tarifa por aseguradora.
- Cómo validar extracción de tarifas.
- Diferencia entre tarifa propuesta, tarifa validada y cotización oficial.
- Cómo interpretar comparativo para cliente.
- Restricciones por país, moneda, aseguradora y ramo.

## Pendiente Claude

Si Claude vuelve a trabajar Cotizador/Comparativo, debe saber:

- Existe un avance A&S v110 que debe integrarse, no reemplazarse por un cotizador genérico simple.
- Debe conservar el diseño/flujo avanzado útil del comparativo A&S.
- Debe adaptar visualmente a Orbit 360 y conectar con módulos existentes.
- No debe convertir tarifas en hardcode del producto base.

## Pendiente ChatGPT/Codex

Cuando se aborde:

- Auditar fuente real `comparativo_final_v110.html`.
- Proponer plan de extracción por archivos.
- Crear integración modular.
- Conectar con `Orbit.store`, `Orbit.tenant`, aseguradoras y documentos.
- Mantener SaaS/multi-tenant.
- No tocar `main`, no deploy, no merge sin autorización.

## Prioridad

```txt
P1 funcional/comercial — no bloquea hotfixes backend actuales, pero sí es necesario antes de considerar Cotizador/Comparativo final para A&S.
```
