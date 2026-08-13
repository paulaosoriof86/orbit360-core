# Requerimiento — Finanzas PROFUNDO (dashboard analítico + metas inteligentes)

> Pedido repetido por la usuaria y NO atendido con la profundidad solicitada en versiones anteriores. Este documento fija el nivel de detalle exigido para que no se pierda entre sesiones. Aplica a `modules/finanzas.js`, `modules/insights.js`, `modules/inicio.js` y a cualquier módulo que consuma metas.

## Principio transversal de TODO dashboard analítico
- **De lo general a lo particular** según el objetivo del dashboard.
- Debe incluir **gráficas Y tablas con datos reales** (no solo barras decorativas): tabla numérica de respaldo bajo cada gráfico.
- **Comparativos inter-anual e inter-mensual** en cada eje relevante.
- Debe analizar la **producción general** y también **por vendedor** y **por aseguradora** (y por ramo cuando aplique) — lo general junto a lo particular.
- Debe ser **realmente útil para la toma de decisiones** (no cosmético).
- **Análisis crítico con IA real** (Orbit.ia): hallazgos + recomendaciones accionables derivados de los datos vivos, no texto genérico.

## 1. Dashboard de Finanzas (profundo)
Objetivo: salud financiera + producción + recaudo, de lo general a lo particular.
Debe incluir, con datos vivos del store:
- **KPIs de cabecera**: producción neta, recaudo, utilidad, margen, var. interanual, ajuste no devengado.
- **Ingresos vs Egresos**: gráfico intermensual (ventana ≥6 meses) **+ tabla** con montos por mes, variación % mes a mes y acumulado.
- **Comparativo interanual**: año actual vs anterior (acumulado y por mes) con % de crecimiento — gráfico **+ tabla**.
- **Producción por VENDEDOR**: tabla con prima neta, recaudado, comisión generada, % del total, y comparativo vs mes/año anterior.
- **Producción por ASEGURADORA**: tabla equivalente (prima, participación %, comisión a cobrar, siniestralidad si hay datos).
- **Recaudo vs producción**: % de recaudo, cartera vencida, aging.
- **Análisis crítico IA**: 3–5 hallazgos (ej. "la aseguradora X concentra 40% pero su recaudo es 60%", "el asesor Y cae 15% intermensual") + recomendaciones.
- Todo clicable (drill del KPI/fila al detalle).

## 2. Metas (profundo) — cumplimiento real vs ideal
- **Semáforos + porcentajes** de cumplimiento real vs ideal (ideal = meta establecida; real = producción/recaudo del mes).
- **Tres niveles**: general (empresa), por asesor, por aseguradora — de lo general a lo particular.
- Cada nivel: meta, real, % cumplido, semáforo (🟢≥100 / 🟡≥70 / 🔴<70), y tendencia vs mes anterior.
- Vista mensual (el mes seleccionado) con posibilidad de ver acumulado del año.
- Tipos de meta: **prima neta (ventas)** y **recaudo** (mínimo), opcional producción nueva/renovada.

## 3. Motor de CÁLCULO y SUGERENCIA de metas (inteligente, mes a mes)
- Sección propia (en Finanzas → Metas, o Equipo) para **calcular/sugerir** metas coherentes con:
  - la **producción actual** y el **promedio** histórico (últimos N meses),
  - las **finanzas y el presupuesto** (no sugerir metas que el presupuesto no soporta),
  - estacionalidad si hay señal.
- Debe **sugerir**: meta de ventas (criterio = **prima neta**) y meta de **recaudo** (p.ej. % histórico de recaudo sobre prima).
- Permitir **sugerir Y establecer** (aceptar la sugerencia o ajustarla) por **asesor**, por **aseguradora** y **general**.
- La sugerencia se recalcula **mes a mes**.

## 4. Metas establecidas = fuente de medición transversal
- Una vez establecidas (colección `metas` por mes/tipo/ámbito), TODAS las mediciones mensuales se hacen contra ellas.
- Deben alimentar/reflejarse en: **Inicio** (avance del mes), **Insights** (vista Metas), Finanzas (cumplimiento) y cualquier módulo con metas. Coherencia total: la meta que fijo en Finanzas es la que ve Inicio e Insights.

## Estado de implementación
- v1.80: (en progreso) — se documenta aquí el alcance completo y se implementa por partes verificando en vivo.
- Criterio de "hecho": verificado por código real (render + datos vivos) y reflejado en Inicio/Insights.
