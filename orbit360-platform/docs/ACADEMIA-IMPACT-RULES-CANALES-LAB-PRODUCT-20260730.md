# ACADEMIA — RULES GLOBALES VS CANALES DE HOSTING

Fecha operativa: 2026-07-30

## Lección transversal

Un canal preview de Firebase Hosting puede tener archivos web distintos, pero no tiene un Firestore independiente. Las Firestore Rules pertenecen al proyecto/base de datos y afectan a todos los canales de Hosting que consumen ese mismo proyecto.

Por eso un despliegue correcto de frontend LAB puede perder acceso a datos si posteriormente el mismo proyecto recibe Rules diseñadas para otra ruta de datos.

## Patrón aprendido

Antes de validar visualmente un módulo debe comprobarse la compatibilidad completa:

`Hosting publicado → Auth → membership → ruta Firestore real → Rules vigentes → Orbit.store/read-model → UI`

Paridad de archivos Hosting no demuestra por sí sola que Firestore sea legible.

## Diferencia de clasificación

- archivos correctos + login correcto + listeners adjuntos + `permission-denied` → `SECURITY_FAILURE`;
- listener no adjunto por lifecycle → `FUNCTIONAL_DEFECT` o `PIPELINE_MECHANISM_FAILURE` según owner;
- datos inexistentes en destino correcto → `DATA_CONTRACT_FAILURE`;
- emulador que no inicia por runtime/JDK → `PIPELINE_MECHANISM_FAILURE`.

## Regla de mínimo privilegio

Una compatibilidad temporal nunca debe abrir una ruta legacy completa. Debe limitar simultáneamente identidad/tenant, colecciones y operaciones; debe conservar deny-all para recursos sensibles y tener retiro planificado.

Para este caso, la candidata probada permite únicamente lectura del usuario técnico LAB A&S sobre ocho colecciones operativas y mantiene bloqueadas escrituras, otras memberships y recursos sensibles.

## Reuso

Clasificación:

- concepto de canales Hosting vs Rules globales: `REPLICABLE_CLAUDE_ACUMULADO`;
- pruebas de mínimo privilegio en emulador: `REPLICABLE_CLAUDE_ACUMULADO`;
- identidad técnica, rutas reales, reglas concretas y proyecto A&S: `BACKEND_PROTEGIDO_NO_CLAUDE`;
- puente de compatibilidad legacy: `TEMPORAL_RETIRO`.
