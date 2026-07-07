# Auditoría Cotizador/Comparativo v1330 + fuente A&S v110 — 2026-07-07

## Estado

```txt
Repo: paulaosoriof86/orbit360-core
Rama: ays/backend-tenant-lab-v99-20260703
PR: #5 draft/open
Merge: no
Deploy: no
Main: no tocado
```

## Fuentes revisadas

### En repo / plataforma actual

```txt
orbit360-platform/modules/cotizador.js
orbit360-platform/modules/comparativo.js
```

### Fuente externa adjunta al proyecto

```txt
comparativo_final_v110.html
```

La fuente externa NO se integra todavía. Debe auditarse y descomponerse antes de cualquier empalme.

---

## Resultado ejecutivo

El Cotizador/Comparativo actual de Orbit 360 ya tiene base funcional comercializable, pero todavía es general.

La fuente A&S v110 es mucho más avanzada para el caso real de Alianzas, pero NO puede copiarse cruda porque contiene dependencias, configuración directa, almacenamiento local y datos/configuración sensibles que deben separarse, parametrizarse y sanearse.

La integración correcta será modular:

```txt
extraer lógica útil de v110
sanear secretos/config
convertir tarifas a configuración tenant/aseguradora
conectar con Orbit.store / Orbit.tenant / aseguradoras / documentos
mantener backend protegido intacto
```

---

## Cotizador actual v1330 — validaciones positivas

Archivo:

```txt
orbit360-platform/modules/cotizador.js
```

El módulo actual ya conserva varios patrones correctos:

- Es módulo independiente.
- Usa `Orbit.store` para leer aseguradoras/clientes/asesores.
- Filtra aseguradoras por país y vinculadas.
- Separa país/moneda: GT→GTQ, CO→COP.
- Muestra prima neta, recargo, gastos de emisión, IVA y total.
- Permite modo manual y modo tasas.
- Las tasas son configurables por aseguradora mediante `a.cotTasas`.
- Genera cotizaciones y deriva seleccionadas a Comparativo.

## Riesgos del Cotizador actual

### P1 — tasas genéricas por defecto

Existe una tabla interna genérica:

```txt
TASAS_DEF.auto
```

Riesgo:

- Puede parecer tarifa oficial si no se aclara.
- Para A&S real, las tarifas deben venir de documentos/aseguradoras/configuración validada.

Regla requerida:

```txt
Si una tarifa no está validada, mostrar: Tarifa pendiente de configuración/validación.
```

### P1 — catálogos vehiculares genéricos

Existen catálogos genéricos de marca/línea/modelo.

Uso permitido:

```txt
Fallback editable / ayuda UX.
```

Uso no permitido:

```txt
Fuente oficial o cerrada de modelos/tarifas.
```

### P1 — historial temporal

El cotizador usa preferencias/local temporal para historial (`cot_hist`).

Futuro backend:

```txt
Historial de cotizaciones debe ir a colección tenant con cliente/asesor/fecha/estado/trazabilidad.
```

---

## Comparativo actual v1330 — validaciones positivas

Archivo:

```txt
orbit360-platform/modules/comparativo.js
```

El módulo actual ya conserva patrones útiles:

- Funciona solo o desde `Orbit._cots` generado por Cotizador.
- Permite propuestas manuales.
- Permite carga de PDFs/imágenes para extracción.
- Tiene criterios por ramo: Auto, Gastos Médicos, Vida, Hogar, Daños.
- Compara prima total, forma de pago, prima neta, IVA/recargos y coberturas.
- Genera recomendación consultiva por precio, cobertura o equilibrio.
- Usa logo/color de aseguradora si existe en `Orbit.store('aseguradoras')`.
- Imprime con marca white-label/tenant.

## Riesgos del Comparativo actual

### P1 — extracción de PDF no suficientemente gobernada

La UI indica “revisar extracción”, lo cual es correcto, pero debe reforzarse:

```txt
PDF extraído = propuesta editable, no dato oficial confirmado.
```

### P1 — historial temporal

El comparativo guarda historial en memoria (`Orbit._compHist`).

Futuro backend:

```txt
comparativos
comparativoPropuestas
comparativoHistorial
```

con tenant, cliente, asesor, póliza/lead/opportunity, documentos fuente y versión.

### P1 — integración incompleta con aseguradoras/tarifas/documentos

Hoy el comparativo puede usar aseguradoras por nombre/logos, pero falta integración formal con:

```txt
ficha de aseguradora
documentos de tarifa
plantillas/coberturas aprobadas
tarifas validadas
cotizaciones guardadas
expediente cliente/póliza
```

---

## Fuente A&S v110 — hallazgos de alto nivel

Archivo externo:

```txt
comparativo_final_v110.html
```

Hallazgos útiles:

- Tiene flujo avanzado de Cotizador/Comparativo A&S.
- Incluye funciones específicas para cotizador, comparativo, PDF, importación Excel, administración de aseguradoras/tarifas y asesoría.
- Tiene lógica más profunda para propuestas, coberturas, impresión y extracción.
- Incluye manejo de PDFs y Excel.
- Incluye referencias a aseguradoras, tarifas, prima, deducibles, coberturas, FASECOLDA y administración de conocimiento.

Riesgo crítico:

- La fuente contiene configuración técnica y credenciales/API keys/secretos o referencias sensibles en el propio archivo o fuentes relacionadas.
- No debe copiarse cruda al repo.
- No debe enviarse completa a Claude sin saneamiento.
- No deben repetirse ni documentarse los valores secretos.

Regla:

```txt
Extraer lógica, no copiar secretos/configuración/datos reales.
```

---

## Plan de integración futura

### Fase 1 — Auditoría forense de v110

1. Separar HTML/CSS/JS.
2. Inventariar funciones.
3. Identificar dependencias externas.
4. Detectar y remover secretos/configs directas.
5. Detectar hardcode A&S real.
6. Clasificar lógica reusable vs exclusiva tenant.
7. Mapear colecciones necesarias.

### Fase 2 — Diseño modular Orbit

Crear o refactorizar hacia:

```txt
modules/cotizador.js
modules/comparativo.js
core/cotizador-engine.js
core/comparativo-engine.js
core/tarifas-engine.js
data/seed.js solo demo ficticio
```

Colecciones futuras sugeridas:

```txt
tarifas
cotizaciones
cotizacionPropuestas
comparativos
comparativoPropuestas
documentosTarifa
tarifasPendientesValidacion
```

### Fase 3 — Conexión con Aseguradoras

La ficha de aseguradora debe alimentar:

```txt
ramos/productos activos
tarifas/documentos
coberturas
deducibles
plantillas de propuesta
logos
contactos técnicos
```

### Fase 4 — Estados honestos

Estados requeridos:

```txt
Tarifa configurada
Tarifa pendiente de validación
Documento pendiente de lectura
Extracción pendiente de revisión
Propuesta manual
Cotización informativa
Cotización oficial recibida
Comparativo enviado
Seleccionada para emisión
```

### Fase 5 — Academia

Agregar ruta:

```txt
Cotizador y Comparativo avanzado
```

Debe enseñar:

- Configurar tarifas.
- Cargar documentos de aseguradora.
- Validar extracción.
- Diferenciar propuesta manual, PDF extraído, tarifa validada y cotización oficial.
- Explicar recomendación consultiva.
- Enviar comparativo al cliente.
- Convertir selección en emisión/ops/póliza.

---

## Instrucción para Claude

Claude puede recibir:

```txt
flujos UX
campos por ramo
criterios de comparación
estados honestos
diseño de tarjetas/tablas/impresión
estructura de Academia
```

Claude NO debe recibir:

```txt
archivo v110 crudo con secretos
API keys
tokens
configuración Firebase real
credenciales
clientes/pólizas/tarifas reales no saneadas
```

Si Claude trabaja este módulo, debe partir del documento saneado y del inventario de funciones, no del HTML completo sin limpiar.

---

## Decisión

Cotizador/Comparativo A&S v110 es P1 funcional/comercial, pero no desplaza los hotfixes backend actuales.

No integrar todavía.

Siguiente paso cuando toque este bloque:

```txt
Auditoría forense completa de comparativo_final_v110.html
sanitización
extracción modular
plan de empalme seguro
```
