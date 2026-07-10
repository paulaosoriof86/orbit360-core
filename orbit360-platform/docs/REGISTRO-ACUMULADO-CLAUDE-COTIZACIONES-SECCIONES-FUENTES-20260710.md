# REGISTRO ACUMULADO CLAUDE — COTIZACIONES, SECCIONES Y FUENTES

Fecha: 2026-07-10  
Carril: A + B  
Control maestro: `CONTROL-MAESTRO-ACUMULADO-CLAUDE-BACKEND-UX-ACADEMIA-ORBIT360-AYS-20260709.md`  
Estado de envío: `LISTO_PARA_CLAUDE / NO_ENVIADO_AÚN`.

## Módulo/regla

Aseguradoras → fuentes documentales → Cotizador → impresión individual → Comparativo.

## Cambio backend/local

Se creó una capa reusable para conservar la presentación particular de cada aseguradora sin perder la normalización canónica necesaria para calcular y comparar.

Archivos:

- `core/cotizacion-esquema-aseguradora-p0.js`
- `tools/orbit360-test-cotizacion-esquema-aseguradora-p0.mjs`
- `.github/workflows/orbit360-cotizacion-esquema-aseguradora-smoke.yml`
- `docs/DECISION-COTIZACIONES-SECCIONES-FIDELIDAD-FUENTES-ENTRENAMIENTO-20260710.md`

## Patrón reusable

```txt
Fuente oficial
→ extracción completa
→ datos canónicos
+
→ presentación original por secciones
→ validación humana
→ versión habilitada
```

## Reglas que Claude no puede omitir

1. No crear una impresión genérica única para todas las aseguradoras.
2. Admitir Sección I, II, III, beneficios, exclusiones, anexos y cualquier sección adicional.
3. Conservar títulos, orden y etiquetas de la fuente.
4. Conservar campos no canónicos y beneficios particulares.
5. Separar la vista canónica para Comparativo de la presentación fiel para Cotización.
6. Leer la hoja de salida/área de impresión de cotizadores Excel.
7. Mostrar cuándo una fuente sirve para tarifas pero todavía requiere cotización ejemplo.
8. Permitir revisar PDF/Excel original, extracción, diff y versión.
9. No duplicar Aseguradoras ni importar el módulo interno de v110.
10. No simular que una fuente está validada o habilitada.

## UX requerida

- tabs en Aseguradoras: Fuentes, Lectura, Secciones, Versiones, Cotizador, Comparativo;
- indicadores de disponibilidad tarifaria y de presentación;
- visor por secciones ordenadas;
- campos con etiqueta original y valor normalizado;
- preview fiel de impresión;
- advertencia de ejemplo faltante;
- historial de versiones;
- acciones de validar, reemplazar, bloquear y consultar original;
- interfaz dinámica, no formulario rígido.

## Academia requerida

- diferencia entre tarifa y formato de cotización;
- uso de cotizador Excel como fuente dual;
- necesidad de ejemplo oficial cuando solo existen tasas;
- revisión completa de beneficios, exclusiones y anexos;
- validación por aseguradora/producto/país;
- comparación canónica sin pérdida de contenido particular.

## Manual/operación requerida

Inventario por aseguradora:

```txt
país
ramo/producto
cotizador Excel
hoja de salida/área de impresión
cotización PDF ejemplo
póliza ejemplo
condiciones
versión/vigencia
fuente de tarifa
fuente de presentación
estado de calibración
```

## Condición de cierre

- adapters de lectura PDF/Excel integrados;
- primera aseguradora calibrada extremo a extremo;
- impresión individual validada contra la fuente;
- Comparativo consume valores canónicos;
- CI y smoke visual aprobados;
- Academia y paquete Claude actualizados.