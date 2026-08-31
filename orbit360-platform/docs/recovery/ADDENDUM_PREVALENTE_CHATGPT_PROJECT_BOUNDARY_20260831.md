# ADDENDUM PREVALENTE — FRONTERA DEL PROYECTO CHATGPT

**Fecha:** 2026-08-31  
**Estado:** PREVALENTE / OBLIGATORIO  
**Rama:** `recovery/fase-a-clean-20260831`

## 1. Decisión corregida y definitiva

Para la recuperación productiva Fase A se crea un **Proyecto ChatGPT nuevo y aislado**:

`Orbit 360 — Recovery Producción 2026-08-31`

Configuración obligatoria: **Memoria solo del proyecto**.

El Proyecto ChatGPT histórico `Orbit 360` queda como **ARCHIVO_HISTORICO_READ_ONLY_DE_CONTEXTO**. No se elimina, pero no se usa como contenedor operativo de la recuperación.

## 2. Motivo

El proyecto histórico contiene chats, fuentes e instrucciones creadas durante múltiples mecanismos de integración/release ya supersedidos. Mantener la recuperación dentro de ese mismo contexto aumenta el riesgo de reintroducir decisiones, contratos o narrativas incompatibles.

La frontera nueva evita que el proyecto de recovery consulte conversaciones externas cuando usa Memoria solo del proyecto y permite cargar únicamente autoridades curadas.

## 3. Qué NO se mueve al proyecto nuevo

- No mover conversaciones históricas del Proyecto Orbit 360.
- No mover esta conversación de diagnóstico/decisión, porque contiene estados y recomendaciones posteriormente corregidos.
- No subir planes maestros históricos como fuentes activas.
- No subir paquetes de candidatas antiguas como autoridad; solo consultar GitHub cuando una evidencia histórica sea necesaria para lineage.

## 4. Fuentes iniciales permitidas en el proyecto nuevo

1. `00_DOCUMENTO_MAESTRO_ORBIT360_RECOVERY_PRODUCCION_20260831.docx`.
2. `01_INSTRUCCIONES_PROYECTO_CHATGPT_ORBIT360_RECOVERY_20260831.txt`.
3. `02_ADDENDUM_PREVALENTE_CHATGPT_PROJECT_BOUNDARY_20260831.md`.
4. `03_ADDENDUM_ANTI_DESCARRILAMIENTO_ORBIT360_20260831.md`.
5. `04_MATRIZ_PRUEBAS_MODULO_A_MODULO_FASE_A_20260831.md`.
6. `05_ESTADO_VIVO_RECOVERY_ORBIT360.json`.
7. `06_MANIFIESTO_CAPACIDADES_APROBADAS_FASE_A.json`.

GitHub sigue siendo autoridad técnica de source, commits, artifacts, workflows y estado vivo.

## 5. Precedencia

Ante cualquier contradicción sobre el contenedor ChatGPT:

1. Este Addendum PREVALENTE.
2. `orbit360-recovery-state-v1.json`.
3. Plan Maestro Recovery v1.2.
4. Addendum Anti-Descarrilamiento.
5. Manifiesto de capacidades.
6. Documentos históricos solo como evidencia.

Cualquier texto anterior que diga `USE_EXISTING_ORBIT_360_PROJECT` o `newChatGPTProjectRequired:false` queda **SUPERSEDED**.

## 6. Inicio obligatorio del proyecto nuevo

Crear un chat nuevo dentro del proyecto y usar este mensaje inicial:

`Inicia formalmente la recuperación Orbit 360 Fase A desde las autoridades prevalentes adjuntas y GitHub recovery/fase-a-clean-20260831. Verifica primero state, Plan v1.2, capability manifest, ambos addenda y matriz. Declara último gate PASS, primer gate incompleto y ejecuta únicamente ese gate. No reabras trabajo cerrado, no uses overlays históricos, no toques producción ni datos fuera del gate autorizado.`

## 7. Regla anti-contaminación

Si una nueva afirmación procede únicamente de un chat histórico, debe ser confirmada contra GitHub o una fuente rectora antes de entrar al recovery.

Este addendum no cambia el número de iteraciones ni la arquitectura de release; únicamente fija la frontera de contexto para evitar regresiones de continuidad.