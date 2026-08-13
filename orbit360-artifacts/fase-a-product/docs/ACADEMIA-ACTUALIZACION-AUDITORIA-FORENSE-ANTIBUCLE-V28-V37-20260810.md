# ACADEMIA — AUDITORÍA FORENSE ANTI-BUCLE V28–V37

Fecha: 2026-08-10
Clasificación: `ACADEMIA_ACTUALIZAR`

## Aprendizaje central

Una secuencia de fallos no debe resumirse como una sola "causa raíz" si mezcla producto, datos, entorno y pipeline. La auditoría debe construir cadenas causales separadas y detener los reintentos cuando la misma etapa/familia se repite.

## Caso Orbit 360

La cadena reciente separa:

- `DATA_CONTRACT_FAILURE`: dos clientes sin procedencia demostrable;
- `ENVIRONMENT_FAILURE`: la cuenta técnica LAB no posee determinadas capacidades Logging/IAM;
- `VALIDATOR_STALE / PIPELINE_MECHANISM_FAILURE`: registry/router/documentación dejaron de evolucionar como una sola fuente de verdad;
- resolución de observabilidad: v37 identifica un owner administrativo mediante lectura IAM directa sin writes.

## Principios por rol

- Dirección: distingue bloqueo de negocio de bloqueo técnico y evita invertir iteraciones en deuda no crítica.
- Operativo: no reimporta ni corrige datos para solucionar un gate o pipeline.
- Técnico/administración: clasifica el primer checkpoint real fallido y corrige una sola capa.
- Academia: enseña por qué un validador obsoleto puede generar falsos defectos funcionales y por qué dos iteraciones sin avance obligan a auditar el mecanismo.

## Regla de salida

Antes de un nuevo runtime debe existir un único contrato rector coherente entre registry, lifecycle, preflight, workflow y documentación. Solo entonces se reabre el riesgo operativo.
