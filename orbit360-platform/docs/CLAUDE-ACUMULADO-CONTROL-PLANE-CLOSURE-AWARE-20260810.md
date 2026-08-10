# CLAUDE ACUMULADO — CONTROL-PLANE CLOSURE-AWARE

Fecha: 2026-08-10

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`.

Patrones reutilizables:

- Un workflow de prewrite/source-read deja de ser owner operativo cuando su escritura ya cerró `WRITE_PASS`; no debe seguir disparándose automáticamente por cambios transversales.
- La evidencia inmutable de autorización consumida se conserva. La existencia física de un request histórico no equivale a autorización activa.
- Los gates post-write deben verificar el cierre y la integridad resultante, no reconstruir fases consumidas.
- Los validadores UI deben comprobar conducta/contrato semántico y no una línea literal o una implementación interna específica.
- Un estado source especializado puede ser válido aunque no use el nombre genérico `GO_GATE_CONTRACT`; workflow y engine deben compartir el vocabulario versionado.
- Una sola ruta acumulativa source-only debe poder demostrar que módulos cerrados siguen reutilizables sin secrets, runtime, browser, deploy ni escrituras.

No trasladar a Claude: requests reales, run IDs internos como lógica de producto, hashes privados, fingerprints, detalles de Firestore/Logging, credenciales, fuentes reales ni backend protegido.
