# Bitácora backend A&S — Preflight candidato Claude

Fecha: 2026-07-03
Rama: ays/backend-tenant-lab-v99-20260703
PR: #5
Estado: RESUELTO como herramienta técnica; ejecución local pendiente.

## Entrada

Paula pidió continuar con un bloque largo de avances reales después de auditar el nuevo candidato Claude.

## Necesidad

Crear una compuerta técnica previa al empalme para revisar candidatos de prototipo antes de integrarlos sobre la rama backend.

## Mejora aplicada

Se agregó un script de preflight para revisar candidatos descomprimidos y un set de pruebas sintéticas.

Archivos agregados:

- tools/orbit360-preflight-candidato-claude-ays.mjs
- tools/orbit360-test-preflight-candidato-claude-ays.mjs

## Qué revisa la compuerta

- estructura mínima del candidato;
- cantidad de módulos y core;
- sintaxis JavaScript;
- presencia de archivos que no deben pisarse;
- referencias locales rotas en index;
- textos técnicos visibles;
- reglas riesgosas en importadores;
- trazabilidad de lectura de Excel.

## Valor

Evita empalmes por reemplazo completo, reduce riesgo de regresión y permite revisar candidatos Claude antes de cualquier integración con backend.

## Pendiente

1. Ejecutar preflight local sobre el siguiente candidato corregido por Claude.
2. Ajustar reglas según nuevos hallazgos.
3. Después preparar empalme aditivo controlado.

## Restricciones cumplidas

No deploy. No merge. No main. No carga LAB. No datos reales. No empalme automático.
