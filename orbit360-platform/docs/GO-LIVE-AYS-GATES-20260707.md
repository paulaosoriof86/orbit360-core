# Go-live A&S — gates obligatorios — 2026-07-07

Estado: preparación de release candidate. No autoriza merge ni deploy.

## Decisión

Paula necesita acelerar producción. La ruta segura es cerrar gates verificables, no saltarlos.

## Lo que ChatGPT puede hacer directo

- Actualizar repo y documentación.
- Preparar contratos backend.
- Preparar checklist y runbook.
- Actualizar pendientes Claude/Academia.
- Auditar archivos del repo.

## Lo que requiere Codex o entorno local

- Ejecutar runner real.
- Ejecutar smoke visual en navegador.
- Validar Firebase/Firestore/Auth con credenciales.
- Hacer deploy autorizado.
- Validar producción post-deploy.

## Gates mínimos

1. Rama correcta: `ays/backend-tenant-lab-v99-20260703`.
2. PR #5 abierto, draft, sin merge.
3. Archivos protegidos intactos.
4. JS check sin errores.
5. Runner backend LAB PASS.
6. Smoke visual PASS.
7. Sin textos técnicos visibles en UI cliente.
8. Sin datos reales ni secretos en código.
9. Estados honestos: reportado, conciliado, autorizado, confirmado.
10. Rollback documentado.

## Criterio release candidate

Solo puede marcarse release candidate cuando todos los gates estén PASS y Paula autorice explícitamente avanzar.

## Estado actual

- PR #5 sigue draft/open.
- No hay checks CI reportados en GitHub para el head actual.
- Phase A ya tiene contratos documentados.
- Falta ejecución local/Codex de runner y smoke real.
