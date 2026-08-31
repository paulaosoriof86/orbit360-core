# ADDENDUM PREVALENTE — FRONTERA DEL PROYECTO CHATGPT

**Fecha:** 2026-08-31  
**Estado:** PREVALENTE / OBLIGATORIO  
**Marca:** `Gravicentra Insurance`  
**Rama:** `recovery/fase-a-clean-20260831`

## 1. Decisión definitiva

Para la recuperación productiva Fase A se crea un Proyecto ChatGPT NUEVO y aislado llamado exactamente:

`Gravicentra Insurance`

Configuración obligatoria: **Memoria solo del proyecto**.

El Proyecto histórico `Orbit 360` queda como `ARCHIVO_HISTORICO_READ_ONLY_DE_CONTEXTO`. No se elimina, pero NO se usa como contenedor operativo del recovery.

## 2. Fundamento

El proyecto histórico contiene chats, fuentes e instrucciones creados durante mecanismos de integración/release posteriormente supersedidos. Mantener la recuperación dentro de ese mismo contexto eleva el riesgo de reintroducir decisiones incompatibles.

Con Memoria solo del proyecto, el nuevo proyecto queda aislado de conversaciones externas. Dentro del proyecto nuevo, los chats sí pueden referenciar otros chats del mismo proyecto; por eso el proyecto debe iniciar limpio y solo recibir conversaciones creadas bajo las autoridades de recovery.

## 3. Qué NO se mueve a Gravicentra Insurance

- No mover conversaciones históricas del Proyecto Orbit 360.
- No mover la conversación en la que se diagnosticó y decidió esta recuperación, porque contiene recomendaciones supersedidas.
- No subir planes maestros históricos como fuentes activas.
- No subir candidatas o paquetes antiguos como autoridad.
- Cuando una evidencia histórica sea necesaria para lineage, consultarla en GitHub/archivo y promover únicamente el hecho comprobado al manifest/state.

## 4. Fuentes iniciales permitidas

El paquete limpio del Proyecto `Gravicentra Insurance` debe contener únicamente autoridades vigentes y material curado:

1. Documento Maestro actualizado de Gravicentra Insurance Recovery.
2. Instrucciones del Proyecto `Gravicentra Insurance`.
3. Este Addendum Prevalente.
4. Addendum Anti-Descarrilamiento actualizado.
5. Matriz de pruebas módulo por módulo Fase A.
6. Estado vivo de recovery.
7. Manifiesto de capacidades aprobadas Fase A.

GitHub sigue siendo autoridad técnica de source, commits, artifacts, workflows y estado vivo.

## 5. Precedencia

Ante cualquier contradicción:

1. Este Addendum PREVALENTE.
2. `orbit360-recovery-state-v1.json`.
3. `GRAVICENTRA-INSURANCE-FASE-A-RECOVERY-MASTER-PLAN-v1.3-20260831.md`.
4. `orbit360-approved-capability-manifest-v1.json`.
5. `ORBIT360-RECOVERY-ANTI-DERAILMENT-ADDENDUM-20260831.md`.
6. `ORBIT360-FASE-A-MODULE-VALIDATION-MATRIX-v1.md`.
7. Documentos históricos solo como evidencia.

Quedan `SUPERSEDED`:
- `USE_EXISTING_ORBIT_360_PROJECT`;
- `newChatGPTProjectRequired:false`;
- el nombre provisional `Orbit 360 — Recovery Producción 2026-08-31`;
- Plan Maestro v1.1 y v1.2 cuando contradigan v1.3.

## 6. Inicio obligatorio del proyecto nuevo

Crear un chat NUEVO dentro de `Gravicentra Insurance` y usar este mensaje inicial:

`Inicia formalmente la recuperación Gravicentra Insurance Fase A desde las autoridades prevalentes adjuntas y GitHub recovery/fase-a-clean-20260831. Verifica primero Addendum Prevalente, state, Plan v1.3, capability manifest, Addendum Anti-Descarrilamiento y matriz. Declara último gate PASS, primer gate incompleto y ejecuta únicamente ese gate. No reabras trabajo cerrado, no uses overlays históricos, no toques producción ni datos fuera del gate autorizado.`

## 7. Regla anti-contaminación

Toda afirmación procedente solo de un chat/documento histórico debe confirmarse contra GitHub o fuente rectora antes de entrar al recovery.

## 8. Regla de branding

Marca visible y nombre del Proyecto ChatGPT: `Gravicentra Insurance`.

Identificadores técnicos heredados `Orbit 360` y `orbit360-*` pueden mantenerse internamente por compatibilidad y genealogía. No representan dos productos ni autorizan bifurcar branding, documentación o arquitectura.

Este addendum no cambia el número de iteraciones ni la arquitectura de release; fija la frontera de contexto y branding que debe prevalecer.