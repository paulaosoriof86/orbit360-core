# Bitácora de Errores — LAB mojibake 2026-06-30

## Incidencia

- Fecha: 2026-06-30.
- Módulo/área: Auth/Firestore LAB temporal.
- Síntoma: al abrir `index-dev-auth.html` para validar Firestore LAB reaparecieron caracteres extraños en el login.
- Esperado: no usar una pantalla temporal con codificación dañada para validación visual; las validaciones visuales deben partir del `index.html` aprobado.
- Causa raíz: `index-dev-auth.html` era una página temporal de Fase 1 y arrastraba mojibake. No representa el estado visual aprobado del prototipo.
- Archivo/función afectada: `orbit360-platform/index-dev-auth.html`.
- Fix aplicado localmente: crear `index-dev-firestore.html` desde `index.html` limpio e insertar solo el puente Firebase SDK/Auth/Firestore + `OrbitBackend` antes de `data/store.js`.
- Impacto en prototipo comercializable: aprendizaje metodológico; no validar front visual con archivos temporales dañados. Aplicar a prototipo base si existen páginas dev con codificación rota.
- Estado: EN PROGRESO hasta validar `index-dev-firestore.html` limpio.

## Regla nueva

Para pruebas LAB visuales: usar `index.html` aprobado o una copia limpia generada desde él. No usar `index-dev-auth.html` como base visual.
