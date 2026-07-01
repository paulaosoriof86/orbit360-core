# Pendientes Claude resumen - post auditoria 2026-07-01 13:17

## P0 para Claude
1. Consolidar versiones: CHANGELOG, BITACORA-CAMBIOS, BITACORA-ERRORES, MEJORAS-DETECTADAS y PENDIENTES-Y-MEJORAS deben contar la misma historia post v1.63.
2. Eliminar referencia heredada a CXOrbia en modules/automatizaciones.js.
3. Excluir docs/legacy/Orbit360-demo-standalone-NO-USAR.html de paquetes cliente/backend.
4. Validar visualmente Portal a Ops: reportar pago, solicitar gestion, subir documento, responsable y actividad.
5. Documentar fecha demo como demo-only y asegurar que produccion use fecha real.

## P1 para Claude
- Configuracion autoadministrable completa.
- Estado honesto de importadores: parser demo vs backend/IA real.
- Portal cliente profundo.
- Cotizador/comparativo con tarifas configurables por tenant, sin hardcodear A&S.
- Academia y manuales por rol.
- Reportes ejecutivos y operativos exportables.
- Smoke visual de 30 modulos con 0 errores consola.

## No pedirle a Claude
- Firestore, Auth, reglas, Storage, Make, WhatsApp real, correo real, IA real y scripts LAB. Eso queda para ChatGPT/Codex/backend.