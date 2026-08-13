# Prompt corto para pegar en Claude

Usa este prompt si necesitas una versión breve. Si Claude acepta más contexto, usar `01_PROMPT-CLAUDE-INTEGRAL-V1330.md`.

```txt
ORBIT 360 A&S — CANDIDATA CLAUDE INTEGRAL POST v1330

Trabaja solo en frontend/prototipo/UX/documentación/Academia. No toques backend protegido, no index.html si puedes evitarlo, no datos reales, no secretos, no Storage real, no integración real simulada.

Lee y aplica:
- DOCUMENTO-MAESTRO-CONSOLIDADO-ORBIT360-AYS-20260704.md
- ADENDUM-ACADEMIA-PROFUNDA-INTERACTIVA-ORBIT360-AYS-20260704.md
- ADDENDUM-MAESTRO-PATRONES-REUTILIZABLES-CLAUDE-BACKEND-ORBIT360-20260707.md
- paquete-claude-v1330-integral-post-m5-documentos-portal completo.

Objetivo: generar nueva candidata del prototipo v1330 incorporando:
1. Portal Cliente: pago reportado con soporte visible y estado honesto. Soporte recibido no es pago aplicado.
2. Cobros: revisar soporte, validar/rechazar/bloquear/aplicar con motivo y trazabilidad. Validar reporte no aplica pago. Rechazar no borra trazabilidad.
3. Cliente360: pestaña/bloque Documentos con expediente aprobado, soportes de pago en revisión, documentos en revisión y parches/diffs pendientes.
4. Documentos/Adjuntos/Storage futuro: metadata-only, sin base64, sin URLs públicas, sin secretos, sin Storage real simulado. Documento recibido no actualiza cliente/póliza sin diff.
5. M5 Conciliaciones: validada no aplicada, motivo para acciones, país/moneda bloqueantes.
6. Equipo/Config: gates administrativos con motivo, confirmación reforzada, no dejar tenant sin admin, integraciones pendientes de conexión.
7. Academia: rutas profundas por rol, lecciones, casos prácticos, quizzes de decisión, certificados/progreso y manuales actualizados.

No mostrar en UI cliente: backend, Firebase, Firestore, LAB, mock, demo, smoke, localStorage, credenciales, API key.

No tocar:
- orbit360-platform/data/store.js
- orbit360-platform/data/store-firestore-lab.local.js
- orbit360-platform/core/backend-lab-loader.js
- orbit360-platform/core/backend-lab-init.js
- orbit360-platform/core/backend-lab-security-guard.js
- orbit360-platform/core/auth.js
- orbit360-platform/core/importa.js
- firestore.rules
- tools/orbit360-*
- orbit360-platform/index.html

Entrega candidata completa con changelog, archivos modificados, checklist, riesgos, pendientes, smoke visual y confirmación de backend protegido intacto.
```
