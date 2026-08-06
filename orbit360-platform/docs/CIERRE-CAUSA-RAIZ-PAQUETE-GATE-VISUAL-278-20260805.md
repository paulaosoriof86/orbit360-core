# Cierre de causa raíz — paquete del gate visual 2.7.8

Fecha: 2026-08-05  
RC: `RC-AYS-LAB-CANONICA-01`  
Rama: `ays/backend-tenant-lab-v99-20260703`

## Fallo observado

- run `31070060298`: error de sintaxis por delimitadores Markdown dentro de una plantilla JavaScript anidada;
- run `31070172625`: `PIPELINE_MECHANISM_FAILURE_TEMPLATE_TOKEN_COUNT_0` al intentar reparar el generador mediante coincidencia textual;
- etapa repetida: preparación source-only del paquete del gate;
- decisión: `STOP_RETRY`.

## Causa raíz

El mecanismo construía engine, lifecycle, preflight, runner y sellador como cadenas dentro de un generador. Después intentó reparar esas cadenas mediante sustituciones textuales exactas. Este diseño mezclaba tres lenguajes —JavaScript generador, JavaScript generado y Markdown— y convertía una variación de delimitador en un fallo del pipeline.

No fue un defecto del producto, de Auth, de hidratación ni de la matriz visual.

## Capa corregida

Los owners del gate `block2.7-visual-matrix-corrected-post-auth-lab-v20260805` se mantienen como archivos independientes y completos:

- router canónico actualizado;
- engine de contrato;
- lifecycle;
- preflight sin secretos;
- runner runtime;
- sellador de evidencia;
- prueba source-only del paquete.

Se retiran el generador y el reparador textual. No se utiliza otro workflow para generar workflows ni archivos ejecutores.

## Invariantes

- contrato `2.7.8`;
- request exclusivo ausente durante preparación;
- `GO_GATE_CONTRACT` antes de secretos, Firebase, Playwright, navegador o deploy;
- backup previo y máximo un deploy de Hosting LAB;
- precheck antes de la matriz;
- Dirección 1440×1000, Operativo 1024×768 y Asesor 390×844;
- capturas de viewport, timeout 12 segundos y advertencias no bloqueantes;
- rollback ante todo fallo posterior al deploy;
- cero Functions, Rules, Firestore/Auth/operational writes, reimportación, producción, main o merge.

## Estado

Este documento cierra únicamente la causa raíz del paquete source-only. No declara `GO_GATE_CONTRACT`, deploy ni `PASS_VISUAL_POST_AUTH` hasta que las pruebas source-only y sintética queden verificadas y se cree después el request exclusivo.


## Compatibilidad del router canónico

Los gates anteriores se delegan al blob inmutable `03d1c45db555a3e482afb4be6aaf8d29c74a79dc`, conservado como `tools/orbit360-validar-gate-contracts-legacy-v20260717.mjs`. El nuevo gate se resuelve directamente desde el entrypoint canónico; no existe transformación textual del router histórico.
